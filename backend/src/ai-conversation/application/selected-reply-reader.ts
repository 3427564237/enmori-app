import type { AcceptedContextRead, ContextDependencies, NoteModelContext } from "../ports/real-context-reader.js";
import type { SelectedReplyGrant, SelectedReplyReadPort, SelectedReplyFailure } from "../ports/selected-reply.js";
import { copyPersonaProjection } from "./persona-expression.js";
/** One disposable local-reply selection. Current mutable observations are not
 * labelled a historical fixed readTime. Nothing survives terminal disposal. */
export class SelectedReplyReader {
  private phase:"idle"|"reading"|"ready"|SelectedReplyFailure="idle";
  private model:NoteModelContext|undefined;
  private deps:ContextDependencies|undefined;
  private completion:Promise<string>|undefined;
  private grant:SelectedReplyGrant|undefined;
  private context:AcceptedContextRead|undefined;
  private readonly abort=()=>this.dispose();
  constructor(context:AcceptedContextRead,grant:SelectedReplyGrant,private readonly port:SelectedReplyReadPort|undefined,
    private readonly monotonicNow:()=>number,private readonly original:()=>boolean,private readonly failure:(kind:SelectedReplyFailure)=>void){
    this.context=context;this.grant=grant;context.signal.addEventListener("abort",this.abort,{once:true});
  }
  private live():boolean{
    const c=this.context;try{if(c&&!c.signal.aborted&&this.original()&&this.monotonicNow()>=c.acceptedAt&&this.monotonicNow()<c.deadline&&!["changed","source_unavailable","selection_conflict","denied","unavailable","terminated"].includes(this.phase))return true;}catch{}
    this.stop("terminated");return false;
  }
  private stop(kind:SelectedReplyFailure):string{
    if(this.context){this.context.signal.removeEventListener("abort",this.abort);this.context=undefined;this.grant=undefined;this.model=undefined;this.deps=undefined;this.phase=kind;this.failure(kind);}return this.phase;
  }
  dispose():void{this.stop("terminated");}
  modelContext():NoteModelContext|undefined{return this.live()?this.model:undefined;}
  dependencies():ContextDependencies|undefined{return this.live()?this.deps:undefined;}
  prepare():Promise<string>{return this.completion??=this.load(false);}
  revalidate():Promise<string>{return this.phase==="ready"?this.load(true):Promise.resolve(this.phase);}
  private async load(revalidate:boolean):Promise<string>{
    if(!this.live())return this.phase;if(!this.port)return this.stop("unavailable");const context=this.context!,grant=this.grant!;
    if(!revalidate)this.phase="reading";
    try{
      const result=await this.port.read(context,grant);if(!this.live())return this.phase;if(result.kind!=="read")return this.stop(result.kind);
      const v=result.value;
      if(v.authority.ownerId!==context.ownerId||v.authority.consent!=="accepted"||v.authority.purposeRevocationGeneration!==grant.purposeRevocationGeneration)return this.stop("changed");
      const expected=grant.sources.filter(s=>grant.includedKeys.includes(s.selectionKey)&&!grant.excludedKeys.includes(s.selectionKey));
      if(v.sources.length!==expected.length||v.sources.some(s=>!expected.some(e=>e.checkInId===s.checkInId&&e.version===s.version))||new Set(v.sources.map(s=>s.checkInId)).size!==v.sources.length)return this.stop("selection_conflict");
      if(revalidate){
        if(this.deps?.usedPersonaId&&!v.personas.livePersonaIds.includes(this.deps.usedPersonaId))return this.stop("changed");
        return this.phase;
      }
      const active=v.personas.activePersonaId,selected=active===undefined?undefined:v.personas.items.find(p=>p.personaId===active);
      if(active!==undefined&&!selected)return this.stop("unavailable");const persona=selected&&copyPersonaProjection(selected.projection);if(selected&&!persona)return this.stop("unavailable");
      this.model=Object.freeze({persona:persona??undefined,checkIns:Object.freeze(v.sources.map(s=>Object.freeze({occurredAt:s.sourceOccurredAt,noteText:s.noteText,
        ...(s.moodLabel?{moodLabel:s.moodLabel}:{}),...(s.activityLabel?{activityLabel:s.activityLabel}:{})})))});
      this.deps=Object.freeze({ownerId:context.ownerId,purpose:"checkin_conversation",purposeRevocationGeneration:grant.purposeRevocationGeneration,usedPersonaId:active,
        sources:Object.freeze(v.sources.map(s=>Object.freeze({sourceType:"check_in" as const,sourceId:s.checkInId,observedVersion:s.observedVersion}))),
        selectedReply:Object.freeze({processing:"local",asOf:context.asOf,permittedCheckInIds:Object.freeze(expected.map(s=>s.checkInId)),
          excludedCheckInIds:Object.freeze(grant.sources.filter(s=>grant.excludedKeys.includes(s.selectionKey)).map(s=>s.checkInId)),
          sources:Object.freeze(v.sources.map(s=>Object.freeze({kind:"check_in" as const,id:s.checkInId,version:s.version})))})});
      this.phase="ready";return "ready";
    }catch{return this.stop("unavailable");}
  }
}
