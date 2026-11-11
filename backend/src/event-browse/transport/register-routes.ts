import type { EventCategoryProjection } from '../../admin/ports/admin-repository.js';
import {legacyBrowse} from './legacy-browse.js';
import type {FastifyInstance} from "fastify";
import type {IdentityVerifier} from "../../shared/ports/identity-verifier.js";
import {buildAuthenticate,requirePrincipal} from "../../transport/authenticate.js";
import {sendFailure,sendFailureCode} from "../../transport/error-response.js";
import type {EventBrowse} from "../application/event-browse.js";
import {browseBatchSchema,browseDetailSchema} from "./schemas.js";
/** JIN registers this fragment at controlled composition; ordinary root untouched. */
export async function registerEventBrowseRoutes(app:FastifyInstance,identity:IdentityVerifier,browse:EventBrowse,categories?:EventCategoryProjection):Promise<void>{
  const auth=buildAuthenticate(identity);
  for(const path of ["/v1/event-browse","/v1/event-browse/:browseId"]){
    app.get<{Params:{browseId?:string};Querystring:{cursor?:string}}>(path,{exposeHeadRoute:false,schema:{response:{200:path.endsWith(":browseId")?browseDetailSchema:browseBatchSchema}},onRequest:async(req,reply)=>{reply.header("Cache-Control","no-store");await auth(req,reply);},
      errorHandler:(error,req,reply)=>sendFailureCode(req,reply,error.statusCode===400||error.statusCode===415?"REQUEST_INVALID":"SERVICE_UNAVAILABLE")},async(req,reply)=>{
      // The client may have closed while the onRequest authentication awaited Firebase.
      if (reply.raw.destroyed) return reply.hijack();
      const query=req.query;
      if(Object.keys(query).some(k=>k!=='cursor')||(query.cursor!==undefined&&(req.params.browseId!==undefined||typeof query.cursor!=='string'||query.cursor.length===0||query.cursor.length>512))||req.body!==undefined||Number(req.headers["content-length"]??0)!==0||req.headers["transfer-encoding"]!==undefined)return sendFailureCode(req,reply,"REQUEST_INVALID");
      const abort=new AbortController();const gone=()=>{if(!reply.raw.writableEnded)abort.abort();};req.raw.once("aborted",gone);reply.raw.once("close",gone);
      try{const r=await browse.read(requirePrincipal(req),req.params.browseId,abort.signal,query.cursor);if(abort.signal.aborted){reply.hijack();reply.raw.destroy();return reply;}if(!r.ok)return sendFailure(req,reply,r.failure);
        if(req.headers['x-enmori-contract-version']==='3') {
          if (!categories) return reply.send(r.value);
          try {
            const rows = 'items' in r.value ? r.value.items : [r.value];
            const found = await categories.readMany(rows.flatMap(row=>row.eventId?[row.eventId]:[]));
            if(abort.signal.aborted){reply.hijack();reply.raw.destroy();return reply;}
            const projected = rows.map(row=>({...row,...(row.eventId && found.has(row.eventId)?{managedCategory:found.get(row.eventId)!}:{})}));
            return reply.send('items' in r.value?{...r.value,items:projected}:projected[0]);
          } catch {return sendFailureCode(req,reply,'SERVICE_UNAVAILABLE');}
        }
        const legacy=legacyBrowse(r.value);return legacy?reply.send(legacy):sendFailureCode(req,reply,'SERVICE_UNAVAILABLE');}
      finally{req.raw.off("aborted",gone);reply.raw.off("close",gone);}
    });
  }
}
