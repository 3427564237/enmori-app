import { eventPresentation,eventSummaryPresentation } from "../../event-detail/domain/event-content.js";
import { appFailure,type AppFailure } from "../../shared/application/app-failure.js";
import {ok,err,type Result} from "../../shared/domain/result.js";
import type {AuthPrincipal} from "../../shared/ports/identity-verifier.js";
import {decodeBrowseId} from "../domain/browse-values.js";
import {sourceEventId} from '../domain/source-event-id.js';
import type {BrowseAccountGate,BrowseSource,BrowseBatch,BrowseDetail,BrowsePosition} from "../ports/event-browse.js";
export class EventBrowse {
  constructor(private readonly account:BrowseAccountGate,private readonly source:BrowseSource,private readonly now:()=>Date=()=>new Date(),private readonly includeStableEventId=false,private readonly position?:BrowsePosition){}
  async read(principal:AuthPrincipal,id:string|undefined,signal:AbortSignal,cursor?:string):Promise<Result<BrowseBatch|BrowseDetail,AppFailure>>{
    try{
      const owner=await this.account.verify(principal);if(!owner.ok)return owner;
      if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));
      if(id!==undefined&&decodeBrowseId(id)===undefined)return err(appFailure("EVENT_UNAVAILABLE"));
      const now=this.now();
      const decoded=cursor===undefined?undefined:this.position?.decode(principal.firebaseUid,cursor,now);
      if(cursor!==undefined&&(id!==undefined||!decoded))return err(appFailure('REQUEST_INVALID'));
      const asOf=decoded?.asOf??now.toISOString();
      if(id!==undefined){const detail=await this.source.detail(id,asOf,signal);if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));if(!detail)return err(appFailure("EVENT_UNAVAILABLE"));
        const {browseId,title,startAt,externalSourceUrl,endAt,locationLabel,categoryLabel,shortDescription,coverImageUrl}=detail;
        return ok({...eventPresentation(detail),browseId,...(this.includeStableEventId?{eventId:sourceEventId(browseId)}:{}),title,startAt,externalSourceUrl,...(endAt===undefined?{}:{endAt}),...(locationLabel===undefined?{}:{locationLabel}),...(categoryLabel===undefined?{}:{categoryLabel}),...(shortDescription===undefined?{}:{shortDescription}),...(coverImageUrl===undefined?{}:{coverImageUrl})});}
      if(cursor!==undefined&&!this.source.batch)return err(appFailure('SERVICE_UNAVAILABLE'));
      const batch=this.position&&this.source.batch?await this.source.batch(asOf,decoded?.page??0,signal):{items:await this.source.firstBatch(asOf,signal)};
      if(signal.aborted)return err(appFailure("SERVICE_UNAVAILABLE"));
      return ok({asOf,scope:this.source.status?"singapore_events_v2":"ticketmaster_sg_first_batch_v1",...(this.source.status?{sourceStatus:("sourceStatus" in batch?batch.sourceStatus:undefined)??this.source.status()}:{}),...(batch.nextPage===undefined?{}:{nextCursor:this.position!.encode(principal.firebaseUid,asOf,batch.nextPage)}),items:batch.items.map(row=>{const {browseId,title,startAt,endAt,locationLabel,categoryLabel}=row;return ({...eventSummaryPresentation(row),browseId,
        ...(this.includeStableEventId?{eventId:sourceEventId(browseId),...(locationLabel===undefined?{}:{locationLabel}),...(categoryLabel===undefined?{}:{categoryLabel})}:{}),
        title,startAt,...(endAt===undefined?{}:{endAt})});})});
    }catch{return err(appFailure("SERVICE_UNAVAILABLE"));}
  }
}
