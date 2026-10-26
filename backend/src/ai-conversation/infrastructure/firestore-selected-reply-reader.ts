import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocumentSnapshot } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, isSafeDocumentId, parseCheckInProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireFeatureEnvironment } from "../../shared/infrastructure/firebase/feature-environment.js";
import { parseReadAuthority, parseReadPersona, parseReadPersonaState, canonicalNoteInstant, parseReadInstant } from "./real-context-records.js";
import { checkInSourceVersion } from "./source-use-v2.js";
import type { ConversationOrdinaryContext, RequestOriginalConversationIdentity } from "../ports/application-conversation-operations.js";
import type { AcceptedContextRead, ReadPersonaSet } from "../ports/real-context-reader.js";
import type { SelectReplyContext, SelectedReplySnapshot, SelectedReplyGrant, SelectedReplyObservation, SelectedReplyReadPort, SelectedReplyReadResult, SelectedReplyFailure } from "../ports/selected-reply.js";
import type { ConversationResult } from "../ports/conversation-operations.js";
import type { StoreResult } from "../ports/real-conversation-store.js";
import type { HistoryPairIdentity } from "../ports/real-context-reader.js";
import { currentReplyDay, validTodayReplySelection } from "../application/today-reply-selection.js";
export type SelectedHistorySnapshot=(tx:Tx,principal:AcceptedContextRead["principal"],ownerId:string,conversationId:string,current:()=>boolean)=>Promise<StoreResult<readonly HistoryPairIdentity[]>>;
class Failure extends Error {constructor(readonly kind:SelectedReplyFailure){super(kind);}}
function fail(kind:SelectedReplyFailure):never{throw new Failure(kind);}
const uint=(x:unknown):x is number=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
/** Exact mutable-source adapter; only explicit IDs or a bounded own-day query,
 * never a collection scan or the old immutable Note
 * prerequisites, body cache, URL, weather or location model projection. */
export class FirestoreSelectedReplyReader implements SelectedReplyReadPort {
  constructor(private readonly gateway:FirestoreGateway,environment:Readonly<Record<string,string|undefined>>,
    private readonly original:Pick<RequestOriginalConversationIdentity,"verifyRead"|"currentRead">|undefined,
    private readonly utcMilliseconds:()=>number=Date.now,private readonly historySnapshot?:SelectedHistorySnapshot){requireFeatureEnvironment(environment);}
  private check(current:()=>boolean){try{if(current())return;}catch{}fail("terminated");}
  private async guardedRead<T>(current:()=>boolean,operation:()=>Promise<T>):Promise<T>{this.check(current);const result=await operation();this.check(current);return result;}
  private valid(input:SelectReplyContext):void{
    if(!input||input.processing!=="local")fail("selection_conflict");
    if("today" in input){
      if(Object.keys(input).some(k=>k!=="processing"&&k!=="today")||!input.today||
        Object.keys(input.today).length!==1||!Object.hasOwn(input.today,"timeZone")||typeof input.today.timeZone!=="string")fail("selection_conflict");
      return;
    }
    if(Object.keys(input).some(k=>k!=="processing"&&k!=="sources")||!Array.isArray(input.sources)||input.sources.length>5||
      input.sources.some(s=>!s||Object.keys(s).length!==2||s.kind!=="check_in"||typeof s.checkInId!=="string"||!isSafeDocumentId(s.checkInId))||
      new Set(input.sources.map(s=>s.checkInId)).size!==input.sources.length)fail("selection_conflict");
  }
  private async authority(tx:Tx,principal:AcceptedContextRead["principal"],owner:string,current:()=>boolean){
    const id=createAuthBindingDocumentId(principal.firebaseUid);if(id===undefined)fail("denied");
    const binding=await this.guardedRead(current,()=>tx.get(`auth_bindings/${id}`));if(!binding)fail("denied");const actual=parseAuthBinding(binding);if(!actual)fail("unavailable");if(actual!==owner)fail("denied");
    const authority=parseReadAuthority(await this.guardedRead(current,()=>tx.get(`accounts/${owner}`)),owner);if(!authority)fail("unavailable");if(authority.consent!=="accepted")fail("denied");return authority;
  }
  private async source(tx:Tx,owner:string,id:string,asOf:number,current:()=>boolean){
    if(!tx.getSnapshot)fail("unavailable");const observed=this.utcMilliseconds();
    const snapshot=await this.guardedRead(current,()=>tx.getSnapshot!(`check_ins/${id}`));if(!snapshot||snapshot.data.ownerAccountId!==owner)fail("source_unavailable");
    const version=checkInSourceVersion(snapshot),p=parseCheckInProjection(snapshot.data,id),updated=parseReadInstant(snapshot.updateTime);
    if(!version||!p||!updated||!canonicalNoteInstant(p.createdAt)||!uint(observed)||this.utcMilliseconds()<observed||this.utcMilliseconds()-observed>5000)fail("unavailable");
    const occurred=Date.parse(p.createdAt);if(occurred<asOf-7*86400000||occurred>asOf)fail("source_unavailable");
    const end=this.utcMilliseconds();
    if([snapshot.createTime,updated].some(time=>time.seconds*1000+Math.ceil(time.nanoseconds/1e6)>end))fail("unavailable");
    return {kind:"check_in" as const,checkInId:id,version,sourceOccurredAt:p.createdAt,observedAt:new Date(observed).toISOString(),
      noteText:p.note,...(p.mood?{moodLabel:p.mood}:{}),...(p.activity?{activityLabel:p.activity}:{}),observedVersion:updated};
  }
  async prepare(context:ConversationOrdinaryContext,input:SelectReplyContext,conversationId?:string):Promise<ConversationResult<SelectedReplySnapshot>>{
    try{this.valid(input);const started=this.utcMilliseconds();if(!uint(started))fail("unavailable");
      const value=await this.gateway.runTransaction(async tx=>{
        const authority=await this.authority(tx,context.principal,context.ownerId,context.current),sources=[];
        let today:SelectedReplySnapshot["today"],refs:readonly {checkInId:string;createdAt?:string}[];
        if("today" in input){
          const day=currentReplyDay(input.today.timeZone,started);
          if(!day||day.empty)fail("selection_conflict");
          if(!tx.listOwnCheckInDayPage)fail("unavailable");
          const asOf=new Date(started).toISOString(),rows=await this.guardedRead(context.current,()=>tx.listOwnCheckInDayPage!({
            ownerAccountId:context.ownerId,startUtc:day.startUtc,endUtc:day.endUtc,asOf,limit:6}));
          if(!Array.isArray(rows)||rows.length>6||new Set(rows.map(r=>r.id)).size!==rows.length)fail("unavailable");
          for(const [i,row] of rows.entries()){
            const createdAt=canonicalNoteInstant(row.data.createdAt);
            if(!isSafeDocumentId(row.id)||Object.keys(row.data).some(k=>k!=="ownerAccountId"&&k!=="createdAt")||row.data.ownerAccountId!==context.ownerId||
              !createdAt||createdAt<day.startUtc||createdAt>asOf||
              (day.endUtc!==null&&createdAt>=day.endUtc))fail("unavailable");
            const prior=rows[i-1];
            if(prior&&(String(prior.data.createdAt)<createdAt||prior.data.createdAt===createdAt&&prior.id<=row.id))fail("unavailable");
          }
          refs=rows.slice(0,5).map(r=>({checkInId:r.id,createdAt:r.data.createdAt as string}));
          today={date:day.date,timeZone:day.timeZone,limit:5,hasMore:rows.length>5};
        }else refs=input.sources;
        for(const ref of refs){const {noteText:_,moodLabel:__,activityLabel:___,observedVersion:____,...identity}=await this.source(tx,context.ownerId,ref.checkInId,started,context.current);
          if(ref.createdAt!==undefined&&ref.createdAt!==identity.sourceOccurredAt)fail("unavailable");sources.push(identity);}
        let historyPairs:readonly HistoryPairIdentity[]=[];
        if(conversationId!==undefined){
          if(!this.historySnapshot)fail("unavailable");const read=await this.guardedRead(context.current,()=>this.historySnapshot!(tx,context.principal,context.ownerId,conversationId,context.current));
          if(read.kind!=="confirmed")fail(read.kind==="denied"?"denied":read.kind==="terminated"?"terminated":"unavailable");historyPairs=read.value;
        }
        const ended=this.utcMilliseconds();if(ended<started||ended-started>5000)fail("unavailable");this.check(context.current);
        if(today&&!validTodayReplySelection(today,ended))fail("selection_conflict");
        if(!today)sources.sort((a,b)=>b.sourceOccurredAt.localeCompare(a.sourceOccurredAt)||a.checkInId.localeCompare(b.checkInId));
        return {purposeRevocationGeneration:authority.purposeRevocationGeneration,sources,historyPairs,...(today?{today}:{})};
      },{maxAttempts:1});this.check(context.current);return {kind:"success",value};
    }catch(e){return {kind:"failure",code:e instanceof Failure?e.kind==="selection_conflict"?"AI_CONTEXT_SELECTION_CONFLICT":e.kind==="source_unavailable"?"AI_SOURCE_UNAVAILABLE":e.kind==="denied"?"AI_CONTEXT_NOT_PERMITTED":"AI_UNAVAILABLE":"AI_UNAVAILABLE"};}
  }
  async read(context:AcceptedContextRead,grant:SelectedReplyGrant):Promise<SelectedReplyReadResult>{
    const current=()=>!context.signal.aborted&&this.original?.currentRead?.(context)===true;
    try{
      if(!this.original)fail("unavailable");this.check(current);const verified=await this.original.verifyRead(context);this.check(current);
      if(verified.kind!=="read")fail(verified.kind);if(verified.value.firebaseUid!==context.principal.firebaseUid)fail("denied");
      if(!grant||!uint(grant.purposeRevocationGeneration)||!Array.isArray(grant.sources)||grant.sources.length>5)fail("selection_conflict");
      const ids=new Set(grant.sources.map(s=>s.selectionKey));if(ids.size!==grant.sources.length||grant.includedKeys.some(k=>!ids.has(k))||grant.excludedKeys.some(k=>!ids.has(k)))fail("selection_conflict");
      if(new Set(grant.includedKeys).size!==grant.includedKeys.length||new Set(grant.excludedKeys).size!==grant.excludedKeys.length||
        [...ids].some(key=>!grant.includedKeys.includes(key)&&!grant.excludedKeys.includes(key)))fail("selection_conflict");
      if(!Array.isArray(grant.historyPairs)||grant.historyPairs.length>2||new Set(grant.historyPairs.map(p=>p.historyKey)).size!==grant.historyPairs.length||
        (grant.excludedHistoryKeys??[]).some(key=>!grant.historyPairs.some(p=>p.historyKey===key))||new Set(grant.excludedHistoryKeys??[]).size!==(grant.excludedHistoryKeys??[]).length)fail("selection_conflict");
      this.valid({processing:"local",sources:grant.sources.map(s=>({kind:"check_in",checkInId:s.checkInId}))});
      const started=this.utcMilliseconds(),asOf=context.asOf.seconds*1000+Math.floor(context.asOf.nanoseconds/1e6);
      if(!uint(started)||started<asOf)fail("unavailable");
      if(grant.today!==undefined&&!validTodayReplySelection(grant.today,asOf))fail("selection_conflict");
      const day=grant.today&&currentReplyDay(grant.today.timeZone,asOf);
      if(grant.today?.hasMore&&grant.sources.length!==5)fail("selection_conflict");
      const value=await this.gateway.runTransaction(async tx=>{
        const authority=await this.authority(tx,context.principal,context.ownerId,current);
        if(authority.purposeRevocationGeneration!==grant.purposeRevocationGeneration)fail(authority.purposeRevocationGeneration>grant.purposeRevocationGeneration?"changed":"unavailable");
        const state=parseReadPersonaState(await this.guardedRead(current,()=>tx.get(`accounts/${context.ownerId}/persona_state/current`)));if(!state)fail("unavailable");
        const items:ReadPersonaSet["items"][number][]=[];
        for(const id of state.livePersonaIds){const item=parseReadPersona(await this.guardedRead(current,()=>tx.get(`accounts/${context.ownerId}/personas/${id}`)),id,true);if(!item)fail("unavailable");items.push(item);}
        const sources:SelectedReplyObservation["sources"][number][]=[];
        for(const ref of grant.sources){
          if(!grant.includedKeys.includes(ref.selectionKey)||grant.excludedKeys.includes(ref.selectionKey))continue;
          const source=await this.source(tx,context.ownerId,ref.checkInId,asOf,current);if(source.version!==ref.version)fail("changed");sources.push(source);
          if(day&&(source.sourceOccurredAt<day.startUtc||(day.endUtc!==null&&source.sourceOccurredAt>=day.endUtc)))fail("selection_conflict");
        }
        const ended=this.utcMilliseconds();if(ended<started||ended-started>5000)fail("unavailable");
        return {authority,personas:{...state,items},sources};
      },{maxAttempts:1});this.check(current);return {kind:"read",value};
    }catch(e){return {kind:e instanceof Failure?e.kind:"unavailable"};}
  }
}
