import { appFailure,type AppFailure } from "../../shared/application/app-failure.js";
import {ok,err,type Result} from "../../shared/domain/result.js";
import type {AuthPrincipal} from "../../shared/ports/identity-verifier.js";
import {decodeBrowseId} from "../domain/browse-values.js";
import type {BrowseAccountGate,BrowseSource,BrowseBatch,BrowseDetail} from "../ports/event-browse.js";
export class EventBrowse {
  constructor(private readonly account:BrowseAccountGate,private readonly source:BrowseSource,private readonly now:()=>Date=()=>new Date()){}
  async read(principal:AuthPrincipal,id:string|undefined,signal:AbortSignal):Promise<Result<BrowseBatch|BrowseDetail,AppFailure>>{
    try{
      const owner=await this.account.verify(principal);if(!owner.ok)return owner;
      if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));
      if(id!==undefined&&decodeBrowseId(id)===undefined)return err(appFailure("EVENT_UNAVAILABLE"));
      const asOf=this.now().toISOString();
      if(id!==undefined){const detail=await this.source.detail(id,asOf,signal);if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));return detail?ok(detail):err(appFailure("EVENT_UNAVAILABLE"));}
      const details=await this.source.firstBatch(asOf,signal);if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));
      return ok({asOf,scope:"ticketmaster_sg_first_batch_v1",items:details.map(({browseId,title,startAt,endAt})=>({browseId,title,startAt,...(endAt===undefined?{}:{endAt})}))});
    }catch{return err(appFailure("SERVICE_UNAVAILABLE"));}
  }
}
