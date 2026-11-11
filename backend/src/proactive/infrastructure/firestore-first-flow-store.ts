import { OPENAI_CLOUD_PROCESSING, hasCloudAiConsent, type CloudAiProcessing } from '../../account/domain/cloud-ai-consent.js';
import { createHash, randomUUID } from "node:crypto";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireFeatureEnvironment } from "../../shared/infrastructure/firebase/feature-environment.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { FirstFlowConversationTransaction } from "../ports/conversation-transaction.js";
import type { ProactiveActor, FirstFlowFailure, FirstFlowResult, FirstFlowSettings, FirstFlowSettingsInput, FirstFlowIntent,
  FirstFlowIntentCommand, FirstFlowRegistration, FirstFlowRegistrationCommand, FirstFlowReadState, FirstFlowSource,
  FirstFlowReservation, FirstFlowPublish, FirstFlowClaim, FirstFlowDispatch, FirstFlowStore } from "../ports/first-flow.js";

export interface FirstFlowStoreOptions {
  readonly ownerAccountId: string;
  readonly cloudProcessing?: CloudAiProcessing;
  readonly conversationTransaction: (tx: Tx, principal: AuthPrincipal, ownerAccountId: string, current: () => boolean) => FirstFlowConversationTransaction;
  readonly utcMilliseconds?: () => number;
  /** Only the named installation and absolute approved test-end +15min lease.
   * Omission disables registration/dispatch, including in ordinary composition. */
  readonly installationRef?: string;
  readonly registrationLeaseExpiresAt?: string;
  /** Explicit service-mode lease, renewed only by an authorized registration. */
  readonly registrationLeaseDurationMs?: number;
  /** Ordinary accounts: current installation and token ownership are mandatory. */
  readonly accountScopedRegistration?: boolean;
}
interface State extends FirstFlowSettings {
  readonly activeIntentIds: readonly string[];
  /** One charge at canonical publish; send failure never restores it. */
  readonly rollingAttemptTimes: readonly string[];
  readonly inFlightOccurrenceId?: string;
}
interface RegistrationRow {
  readonly revision: number;
  readonly enabled: boolean;
  readonly installationRef?: string;
  readonly registrationKind?: "fcm_token";
  readonly registrationValue?: string;
  readonly registeredAt?: string;
  readonly expiresAt?: string;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const uint=(x:unknown):x is number=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
const exact=(row:Row,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(row,k))&&Object.keys(row).every(k=>required.includes(k)||optional.includes(k));
const object=(x:unknown):x is Row=>!!x&&typeof x==="object"&&!Array.isArray(x);
const iso=(x:unknown):x is string=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const uniqueIds=(x:unknown,max:number):x is readonly string[]=>Array.isArray(x)&&x.length<=max&&x.every(v=>typeof v==="string"&&UUID.test(v))&&new Set(x).size===x.length;
/** Private opaque purpose epoch, never a caller token or an outward locator. */
function scopeGeneration(value:unknown):number|undefined{
  if(typeof value!=="string")return undefined;const m=/^v1\.(0|[1-9][0-9]*)\.([0-9a-f-]+)$/u.exec(value);
  if(!m||!UUID.test(m[2]!))return undefined;const n=Number(m[1]);return uint(n)?n:undefined;
}
class Refusal extends Error {constructor(readonly kind:FirstFlowFailure){super(kind);}}
function refuse(kind:FirstFlowFailure):never{throw new Refusal(kind);}
function bump(n:number):number{if(!uint(n)||n>=Number.MAX_SAFE_INTEGER)refuse("unavailable");return n+1;}
function ok<T>(r:FirstFlowResult<T>):T{if(r.kind!=="ok")refuse(r.kind);return r.value;}
function current(actor:ProactiveActor):void{try{if(actor.current()===true)return;}catch{}refuse("terminated");}
const defaultState=():State=>({revision:0,grantGeneration:0,mode:"off",categories:[],timeZone:"",quiet:{kind:"window",startMinute:1320,endMinute:480},maximumInRolling24h:1,cooldownMinutes:480,pushEnabled:false,preview:"generic",activeIntentIds:[],rollingAttemptTimes:[]});
function timeZone(value:unknown):value is string{
  if(typeof value!=="string"||!(value==="UTC"||/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/u.test(value)))return false;
  try{new Intl.DateTimeFormat("en-GB",{timeZone:value}).format(0);return true;}catch{return false;}
}
function settingsInput(row:Row):FirstFlowSettingsInput|undefined{
  if(!exact(row,["mode","categories","timeZone","quiet","maximumInRolling24h","cooldownMinutes","pushEnabled","preview"],["pausedUntil"])||
    !["on","off","paused"].includes(String(row.mode))||!Array.isArray(row.categories)||row.categories.length>1||row.categories.some(c=>c!=="explicit_follow_up")||
    !timeZone(row.timeZone)||!object(row.quiet)||row.maximumInRolling24h!==1||row.cooldownMinutes!==480||typeof row.pushEnabled!=="boolean"||
    !["generic","hidden"].includes(String(row.preview))||(row.pausedUntil!==undefined&&(row.mode!=="paused"||!iso(row.pausedUntil))))return undefined;
  const q=row.quiet;
  if(!(q.kind==="disabled"&&exact(q,["kind"]))&&!(q.kind==="window"&&exact(q,["kind","startMinute","endMinute"])&&
    uint(q.startMinute)&&q.startMinute<1440&&uint(q.endMinute)&&q.endMinute<1440&&q.startMinute!==q.endMinute))return undefined;
  return row as unknown as FirstFlowSettingsInput;
}
function parseState(row:Row|undefined):State{
  if(!row)return defaultState();
  const {revision,grantGeneration,activeIntentIds,rollingAttemptTimes,inFlightOccurrenceId,...input}=row;
  if(!uint(revision)||revision===0||!uint(grantGeneration)||!uniqueIds(activeIntentIds,3)||!Array.isArray(rollingAttemptTimes)||rollingAttemptTimes.length>1||
    !rollingAttemptTimes.every(iso)||(inFlightOccurrenceId!==undefined&&(typeof inFlightOccurrenceId!=="string"||!activeIntentIds.includes(inFlightOccurrenceId)))||!settingsInput(input))refuse("unavailable");
  return row as unknown as State;
}
function parseIntent(row:Row|undefined):FirstFlowIntent|undefined{
  if(!row)return undefined;
  if(!exact(row,["intentId","revision","state","conversationId","sourceMessageId","category","dueAt","expiresAt","timeZone","processing","settingsRevision",
    "grantGeneration","authorizationScope","topicLifecycleVersion","requiredSources","requiredCategories","createdAt","dispatchState"],
    ["messageId","messageSequence","publishedAt","attemptedAt","providerAcceptedAt","registrationRevision",...(row.processing==="cloud"?["provider","disclosureVersion","cloudAiConsentGeneration"]:[])])||
    ![row.intentId,row.conversationId,row.sourceMessageId].every(v=>typeof v==="string"&&UUID.test(v))||scopeGeneration(row.authorizationScope)===undefined||
    !uint(row.revision)||row.revision<1||!["queued","reserved","prepared","published","cancelled","failed","expired"].includes(String(row.state))||
    row.category!=="explicit_follow_up"||!(row.processing==="local"||row.processing==="cloud"&&row.provider==="openai"&&row.disclosureVersion==="openai_cloud_v1"&&uint(row.cloudAiConsentGeneration))||!iso(row.dueAt)||!iso(row.expiresAt)||row.dueAt>=row.expiresAt||!iso(row.createdAt)||!timeZone(row.timeZone)||
    !uint(row.settingsRevision)||!uint(row.grantGeneration)||!uint(row.topicLifecycleVersion)||row.topicLifecycleVersion<1||
    !Array.isArray(row.requiredSources)||row.requiredSources.length!==1||!object(row.requiredSources[0])||
    !exact(row.requiredSources[0],["kind","id","version"])||row.requiredSources[0].kind!=="conversation_message"||row.requiredSources[0].id!==row.sourceMessageId||
    typeof row.requiredSources[0].version!=="string"||!row.requiredSources[0].version||
    !Array.isArray(row.requiredCategories)||row.requiredCategories.length!==1||row.requiredCategories[0]!=="conversation_history"||
    !["not_started","dispatching","accepted","unknown","skipped"].includes(String(row.dispatchState)))refuse("unavailable");
  if(row.state==="published"){
    if(typeof row.messageId!=="string"||!UUID.test(row.messageId)||!uint(row.messageSequence)||row.messageSequence===0||!iso(row.publishedAt))refuse("unavailable");
  }else if(row.messageId!==undefined||row.messageSequence!==undefined||row.publishedAt!==undefined||row.dispatchState!=="not_started")refuse("unavailable");
  if(["dispatching","accepted","unknown"].includes(String(row.dispatchState))&&(!iso(row.attemptedAt)||!uint(row.registrationRevision)||row.registrationRevision===0))refuse("unavailable");
  if(row.providerAcceptedAt!==undefined&&(!iso(row.providerAcceptedAt)||row.dispatchState!=="accepted"))refuse("unavailable");
  return row as unknown as FirstFlowIntent;
}
function parseRegistration(row:Row|undefined):RegistrationRow{
  if(!row)return {revision:0,enabled:false};
  if(!uint(row.revision)||row.revision===0||typeof row.enabled!=="boolean")refuse("unavailable");
  if(!row.enabled){if(!exact(row,["revision","enabled"]))refuse("unavailable");return row as unknown as RegistrationRow;}
  if(!exact(row,["revision","enabled","installationRef","registrationKind","registrationValue","registeredAt","expiresAt"])||
    typeof row.installationRef!=="string"||!UUID.test(row.installationRef)||row.registrationKind!=="fcm_token"||typeof row.registrationValue!=="string"||
    !row.registrationValue.isWellFormed()||!row.registrationValue.trim()||Buffer.byteLength(row.registrationValue,"utf8")>4096||!iso(row.registeredAt)||!iso(row.expiresAt)||row.registeredAt>=row.expiresAt)refuse("unavailable");
  return row as unknown as RegistrationRow;
}
const publicSettings=(s:State):FirstFlowSettings=>{const {activeIntentIds:_,rollingAttemptTimes:__,inFlightOccurrenceId:___,...view}=s;return view;};

/** Controlled first-flow implementation. All mutations are single-attempt and
 * all source/message/outbox/budget effects share one transaction. This class
 * never generates, contacts FCM, retrieves OAuth or retries an unknown ACK. */
export class FirestoreFirstFlowStore implements FirstFlowStore {
  private readonly clock:()=>number;
  private lastNow=Number.NEGATIVE_INFINITY;
  constructor(private readonly gateway:FirestoreGateway,environment:Readonly<Record<string,string|undefined>>,private readonly options:FirstFlowStoreOptions){
    requireFeatureEnvironment(environment);
    if(options.cloudProcessing && (options.cloudProcessing.provider!=="openai" || options.cloudProcessing.disclosureVersion!=="openai_cloud_v1")) throw Error("Invalid proactive cloud processor");
    if(!UUID.test(options.ownerAccountId))throw new Error("Fixed first-flow owner required");
    if(options.installationRef!==undefined&&!UUID.test(options.installationRef))throw new Error("Invalid fixed installation");
    if(options.registrationLeaseExpiresAt!==undefined&&!iso(options.registrationLeaseExpiresAt))throw new Error("Invalid absolute registration lease");
    if(options.registrationLeaseDurationMs!==undefined&&(options.registrationLeaseExpiresAt!==undefined||!Number.isSafeInteger(options.registrationLeaseDurationMs)||options.registrationLeaseDurationMs<60000||options.registrationLeaseDurationMs>30*86400000))throw new Error("Invalid service registration lease");
    if(options.accountScopedRegistration&&(options.installationRef!==undefined||options.registrationLeaseDurationMs===undefined))throw new Error("Invalid ordinary registration configuration");
    this.clock=options.utcMilliseconds??Date.now;
  }
  private base(){return `accounts/${this.options.ownerAccountId}`;}
  private statePath(){return `${this.base()}/proactive_state/current`;}
  private intentPath(id:string){if(!UUID.test(id))refuse("invalid");return `${this.base()}/proactive_occurrences/${id}`;}
  private now():number{const at=this.clock();if(!Number.isSafeInteger(at)||at<0||at<this.lastNow)refuse("unavailable");this.lastNow=at;return at;}
  private async read<T>(actor:ProactiveActor,work:()=>Promise<T>):Promise<T>{current(actor);const value=await work();current(actor);return value;}
  private async fresh(actor:ProactiveActor):Promise<void>{
    current(actor);let auth:Awaited<ReturnType<ProactiveActor["verifyCurrentAuth"]>>;
    try{auth=await actor.verifyCurrentAuth();}catch{refuse("unavailable");}current(actor);
    if(auth.kind!=="verified")refuse(auth.kind==="dependency_unavailable"?"unavailable":"denied");if(auth.principal.firebaseUid!==actor.principal.firebaseUid)refuse("denied");
  }
  private async run<T>(actor:ProactiveActor,work:(tx:Tx,conversation:FirstFlowConversationTransaction,account:Row)=>Promise<T>,requirePurpose=true):Promise<FirstFlowResult<T>>{
    try{
      await this.fresh(actor);current(actor);
      const value=await this.gateway.runTransaction(async tx=>{
        current(actor);const started=this.now(),bindingId=createAuthBindingDocumentId(actor.principal.firebaseUid);if(bindingId===undefined)refuse("denied");
        const binding=await this.read(actor,()=>tx.get(`auth_bindings/${bindingId}`));if(!binding)refuse("denied");
        const owner=parseAuthBinding(binding);if(!owner)refuse("unavailable");if(owner!==this.options.ownerAccountId)refuse("denied");
        const account=await this.read(actor,()=>tx.get(`accounts/${owner}`));
        if(!account||!parseAccountProjection(account)||!uint(account.purposeRevocationGeneration))refuse("unavailable");if(requirePurpose&&account.optionalProcessingConsent!=="accepted")refuse("denied");
        const result=await work(tx,this.options.conversationTransaction(tx,actor.principal,owner,()=>actor.current()),account);current(actor);
        if(this.now()-started>5000)refuse("unavailable");return result;
      },{maxAttempts:1});
      current(actor);return {kind:"ok",value};
    }catch(e){return {kind:e instanceof Refusal?e.kind:"unknown"};}
  }
  private cloudGrant(account:Row):number {
    if(!this.options.cloudProcessing||!hasCloudAiConsent(account.cloudAiConsent,account.optionalProcessingConsent,OPENAI_CLOUD_PROCESSING))refuse("denied");
    if(!uint(account.cloudAiConsentGeneration))refuse("unavailable");
    return account.cloudAiConsentGeneration;
  }
  private state(tx:Tx,a:ProactiveActor):Promise<State>{return this.read(a,async()=>parseState(await tx.get(this.statePath())));}
  private intentRow(tx:Tx,a:ProactiveActor,id:string):Promise<FirstFlowIntent>{return this.read(a,async()=>{const row=parseIntent(await tx.get(this.intentPath(id)));if(!row)refuse("not_found");if(row.intentId!==id)refuse("unavailable");return row;});}
  private stageState(tx:Tx,state:State):void{tx.set(this.statePath(),state as unknown as Row);}
  private stageIntent(tx:Tx,row:FirstFlowIntent):void{tx.set(this.intentPath(row.intentId),row as unknown as Row);}
  private remove(state:State,id:string):State{const {inFlightOccurrenceId,...rest}=state;return {...rest,activeIntentIds:state.activeIntentIds.filter(v=>v!==id),...(inFlightOccurrenceId&&inFlightOccurrenceId!==id?{inFlightOccurrenceId}: {})};}
  private ensureActive(s:State,i:FirstFlowIntent):void{if(!s.activeIntentIds.includes(i.intentId))refuse("conflict");}
  private enabled(s:State,i?:FirstFlowIntent):void{
    const now=this.now();if(s.mode==="off"||!s.categories.includes("explicit_follow_up"))refuse("denied");
    if(s.mode==="paused"&&(s.pausedUntil===undefined||now<Date.parse(s.pausedUntil)))refuse("denied");
    if(i&&(s.grantGeneration!==i.grantGeneration||s.timeZone!==i.timeZone))refuse("denied");
  }
  private timing(s:State,i:FirstFlowIntent,checkFrequency:boolean):void{
    this.enabled(s,i);const now=this.now();if(now<Date.parse(i.dueAt))refuse("not_due");if(now>=Date.parse(i.expiresAt))refuse("expired");
    if(s.quiet.kind==="window"){
      let parts:Intl.DateTimeFormatPart[];try{parts=new Intl.DateTimeFormat("en-GB",{timeZone:s.timeZone,hourCycle:"h23",hour:"2-digit",minute:"2-digit"}).formatToParts(now);}catch{refuse("unavailable");}
      const minute=Number(parts.find(p=>p.type==="hour")?.value)*60+Number(parts.find(p=>p.type==="minute")?.value),{startMinute:start,endMinute:end}=s.quiet;
      if(!Number.isInteger(minute))refuse("unavailable");if(start<end?minute>=start&&minute<end:minute>=start||minute<end)refuse("quiet");
    }
    if(checkFrequency){
      if(s.inFlightOccurrenceId&&s.inFlightOccurrenceId!==i.intentId)refuse("frequency");
      for(const time of s.rollingAttemptTimes){const delta=now-Date.parse(time);if(delta<0)refuse("unavailable");if(delta<24*3600000||delta<480*60000)refuse("frequency");}
    }
  }
  private async validateSource(c:FirstFlowConversationTransaction,i:FirstFlowIntent,original?:FirstFlowSource,cloudEffect=true):Promise<FirstFlowSource>{
    const source=original??ok(await c.source(i.conversationId,i.sourceMessageId));
    if(source.purposeRevocationGeneration!==scopeGeneration(i.authorizationScope))refuse("denied");
    ok(await c.validate({intent:i,source},cloudEffect));return source;
  }
  source(a:ProactiveActor,conversationId:string,sourceMessageId:string):Promise<FirstFlowResult<FirstFlowSource>>{return this.run(a,async(_tx,c)=>ok(await c.source(conversationId,sourceMessageId)));}
  settings(a:ProactiveActor):Promise<FirstFlowResult<FirstFlowSettings>>{return this.run(a,async tx=>publicSettings(await this.state(tx,a)),false);}
  replaceSettings(a:ProactiveActor,expectedRevision:number,input:FirstFlowSettingsInput):Promise<FirstFlowResult<FirstFlowSettings>>{
    return this.run(a,async(tx,_c,account)=>{
      const normalized=settingsInput(input as unknown as Row);if(!uint(expectedRevision)||!normalized)refuse("invalid");
      if(normalized.pausedUntil!==undefined&&Date.parse(normalized.pausedUntil)<=this.now())refuse("invalid");
      const old=await this.state(tx,a);if(old.revision!==expectedRevision)refuse("revision_conflict");
      const eligibility=(s:FirstFlowSettingsInput)=>JSON.stringify([s.mode,s.pausedUntil??null,s.categories,s.timeZone,s.quiet,s.maximumInRolling24h,s.cooldownMinutes,s.pushEnabled]);
      const onlyDisablePush=old.pushEnabled&&!normalized.pushEnabled&&old.preview===normalized.preview&&
        eligibility({...old,pushEnabled:false})===eligibility(normalized);
      if(this.options.cloudProcessing&&((normalized.mode==="on"&&!onlyDisablePush)||(normalized.pushEnabled&&!old.pushEnabled)))this.cloudGrant(account);
      const intents:FirstFlowIntent[]=[];for(const id of old.activeIntentIds)intents.push(await this.intentRow(tx,a,id));
      const changed=eligibility(old)!==eligibility(normalized);
      let state:State={...normalized,revision:bump(old.revision),grantGeneration:changed?bump(old.grantGeneration):old.grantGeneration,activeIntentIds:old.activeIntentIds,rollingAttemptTimes:old.rollingAttemptTimes,
        ...(old.inFlightOccurrenceId?{inFlightOccurrenceId:old.inFlightOccurrenceId}:{})};
      // Every changed grant fences captured work. Re-enable never resurrects it.
      for(const intent of changed?intents:[]){
        if(["queued","reserved","prepared"].includes(intent.state)){
          this.stageIntent(tx,{...intent,revision:bump(intent.revision),state:"cancelled"});state=this.remove(state,intent.intentId);
        }else if(intent.state==="published"&&intent.dispatchState==="not_started"){
          this.stageIntent(tx,{...intent,revision:bump(intent.revision),dispatchState:"skipped"});state=this.remove(state,intent.intentId);
        }
      }
      current(a);this.stageState(tx,state);return publicSettings(state);
    },input.mode!=="off");
  }
  createIntent(a:ProactiveActor,input:FirstFlowIntentCommand):Promise<FirstFlowResult<FirstFlowIntent>>{
    return this.run(a,async(tx,c,account)=>{
      if(!exact(input as unknown as Row,["intentId","conversationId","sourceMessageId","category","dueAt","timeZone","processing","expectedSettingsRevision",...(input.processing==="cloud"?["provider","disclosureVersion"]:[])])||
        ![input.intentId,input.conversationId,input.sourceMessageId].every(id=>UUID.test(id))||input.category!=="explicit_follow_up"||!(input.processing==="local"||input.processing==="cloud"&&input.provider==="openai"&&input.disclosureVersion==="openai_cloud_v1")||
        !iso(input.dueAt)||!timeZone(input.timeZone)||!uint(input.expectedSettingsRevision))refuse("invalid");
      if((input.processing==="cloud")!==!!this.options.cloudProcessing)refuse("denied");
      const generation=input.processing==="cloud"?this.cloudGrant(account):undefined;
      const previous=parseIntent(await this.read(a,()=>tx.get(this.intentPath(input.intentId))));
      if(previous){if(previous.conversationId!==input.conversationId||previous.sourceMessageId!==input.sourceMessageId||previous.dueAt!==input.dueAt||previous.timeZone!==input.timeZone||
        previous.settingsRevision!==input.expectedSettingsRevision||previous.processing!==input.processing||previous.processing==="cloud"&&(input.processing!=="cloud"||previous.provider!==input.provider||previous.disclosureVersion!==input.disclosureVersion))refuse("conflict");await this.validateSource(c,previous);return previous;}
      const state=await this.state(tx,a);if(state.revision!==input.expectedSettingsRevision)refuse("revision_conflict");this.enabled(state);
      if(state.timeZone!==input.timeZone)refuse("denied");if(state.activeIntentIds.length>=3)refuse("frequency");
      const source=ok(await c.source(input.conversationId,input.sourceMessageId)),now=this.now(),due=Date.parse(input.dueAt),cutoff=source.topicCutoff.seconds*1000+Math.floor(source.topicCutoff.nanoseconds/1e6);
      if(!(now<due&&due<cutoff))refuse("invalid");const expires=Math.min(cutoff,due+2*3600000);if(expires<=due)refuse("invalid");
      const intent:FirstFlowIntent={intentId:input.intentId,revision:1,state:"queued",conversationId:input.conversationId,sourceMessageId:input.sourceMessageId,
        category:"explicit_follow_up",dueAt:input.dueAt,expiresAt:new Date(expires).toISOString(),timeZone:input.timeZone,...(input.processing==="cloud"?{processing:"cloud" as const,...OPENAI_CLOUD_PROCESSING,cloudAiConsentGeneration:generation!}:{processing:"local" as const}),settingsRevision:state.revision,
        grantGeneration:state.grantGeneration,authorizationScope:`v1.${source.purposeRevocationGeneration}.${randomUUID()}`,topicLifecycleVersion:source.topicLifecycleVersion,
        requiredSources:[{kind:"conversation_message",id:source.sourceMessageId,version:source.sourceVersion}],requiredCategories:["conversation_history"],createdAt:new Date(now).toISOString(),dispatchState:"not_started"};
      current(a);tx.create(this.intentPath(intent.intentId),intent as unknown as Row);this.stageState(tx,{...state,activeIntentIds:[...state.activeIntentIds,intent.intentId]});return intent;
    });
  }
  intent(a:ProactiveActor,id:string):Promise<FirstFlowResult<FirstFlowIntent>>{return this.run(a,async(tx,c)=>{const i=await this.intentRow(tx,a,id);await this.validateSource(c,i,undefined,false);return i;});}
  activeIntents(a:ProactiveActor):Promise<FirstFlowResult<readonly FirstFlowIntent[]>>{return this.run(a,async(tx,c)=>{const s=await this.state(tx,a),rows:FirstFlowIntent[]=[];for(const id of s.activeIntentIds){const i=await this.intentRow(tx,a,id);await this.validateSource(c,i,undefined,false);rows.push(i);}return rows;});}
  cancelIntent(a:ProactiveActor,id:string,expectedRevision:number):Promise<FirstFlowResult<FirstFlowIntent>>{
    return this.run(a,async tx=>{
      const s=await this.state(tx,a),i=await this.intentRow(tx,a,id);if(!uint(expectedRevision))refuse("invalid");if(i.revision!==expectedRevision)refuse("revision_conflict");
      if(i.state==="published"&&i.dispatchState!=="not_started")return i;
      if(!["queued","reserved","prepared","published"].includes(i.state))return i;
      const next:FirstFlowIntent={...i,revision:bump(i.revision),...(i.state==="published"?{dispatchState:"skipped" as const}:{state:"cancelled" as const})};
      current(a);this.stageIntent(tx,next);this.stageState(tx,this.remove(s,id));return next;
    },false);
  }
  private registrationView(row:RegistrationRow):FirstFlowRegistration{
    if(!row.enabled)return {revision:row.revision,enabled:false,availability:"unregistered"};
    const expired=this.now()>=Date.parse(row.expiresAt!);return {revision:row.revision,enabled:!expired,installationRef:row.installationRef!,expiresAt:row.expiresAt!,availability:expired?"expired":"registered"};
  }
  private ownershipPaths(row:RegistrationRow):readonly string[]{
    return [`proactive_installations/${row.installationRef}`,`proactive_token_owners/${createHash("sha256").update(row.registrationValue!).digest("hex")}`];
  }
  private ownsRegistration(row:Row|undefined,registration:RegistrationRow):boolean {
    return !!row&&row.ownerAccountId===this.options.ownerAccountId&&row.installationRef===registration.installationRef&&row.registrationRevision===registration.revision;
  }
  private async ownership(tx:Tx,a:ProactiveActor,row:RegistrationRow):Promise<boolean>{
    if(!this.options.accountScopedRegistration)return true;
    if(!row.enabled)return false;
    for(const path of this.ownershipPaths(row))if(!this.ownsRegistration(await this.read(a,()=>tx.get(path)),row))return false;
    return true;
  }
  registration(a:ProactiveActor):Promise<FirstFlowResult<FirstFlowRegistration>>{return this.run(a,async tx=>{
    const row=parseRegistration(await this.read(a,()=>tx.get(`${this.base()}/proactive_registration/current`)));
    if(row.enabled&&!await this.ownership(tx,a,row))return {revision:row.revision,enabled:false,availability:"unregistered"};
    return this.registrationView(row);
  },false);}
  replaceRegistration(a:ProactiveActor,input:FirstFlowRegistrationCommand):Promise<FirstFlowResult<FirstFlowRegistration>>{
    return this.run(a,async(tx,_c,account)=>{
      if(this.options.cloudProcessing)this.cloudGrant(account);
      if(!exact(input as unknown as Row,["expectedRevision","installationRef","registrationKind","registrationValue","enabled"])||!uint(input.expectedRevision)||input.enabled!==true||
        input.registrationKind!=="fcm_token"||typeof input.registrationValue!=="string"||!input.registrationValue.trim()||!input.registrationValue.isWellFormed()||Buffer.byteLength(input.registrationValue,"utf8")>4096)refuse("invalid");
      const now=this.now(),lease=this.options.registrationLeaseDurationMs!==undefined
        ? new Date(now+this.options.registrationLeaseDurationMs).toISOString():this.options.registrationLeaseExpiresAt;
      if(!UUID.test(input.installationRef)||(!this.options.accountScopedRegistration&&(!this.options.installationRef||input.installationRef!==this.options.installationRef))||!lease||now>=Date.parse(lease))refuse("denied");
      const old=parseRegistration(await this.read(a,()=>tx.get(`${this.base()}/proactive_registration/current`)));if(old.revision!==input.expectedRevision)refuse("revision_conflict");
      const state=await this.state(tx,a);this.enabled(state);if(!state.pushEnabled)refuse("denied");
      const row:RegistrationRow={revision:bump(old.revision),enabled:true,installationRef:input.installationRef,registrationKind:"fcm_token",registrationValue:input.registrationValue,
        registeredAt:new Date(now).toISOString(),expiresAt:lease};
      const previousOwned:string[]=[];
      if(this.options.accountScopedRegistration&&old.enabled){
        for(const path of this.ownershipPaths(old))if(this.ownsRegistration(await this.read(a,()=>tx.get(path)),old))previousOwned.push(path);
      }
      current(a);
      if(this.options.accountScopedRegistration){
        if(!tx.delete)refuse("unavailable");
        const nextPaths=this.ownershipPaths(row);
        for(const path of previousOwned)if(!nextPaths.includes(path))tx.delete(path);
        for(const path of nextPaths)tx.set(path,{ownerAccountId:this.options.ownerAccountId,installationRef:row.installationRef!,registrationRevision:row.revision});
      }
      tx.set(`${this.base()}/proactive_registration/current`,row as unknown as Row);return this.registrationView(row);
    });
  }
  deleteRegistration(a:ProactiveActor,installationRef:string,expectedRevision:number):Promise<FirstFlowResult<FirstFlowRegistration>>{
    return this.run(a,async tx=>{if(!UUID.test(installationRef)||!uint(expectedRevision))refuse("invalid");const old=parseRegistration(await this.read(a,()=>tx.get(`${this.base()}/proactive_registration/current`)));
      if(old.revision!==expectedRevision)refuse("revision_conflict");if(old.enabled&&old.installationRef!==installationRef)refuse("denied");if(!old.enabled)return this.registrationView(old);
      const owned:string[]=[];
      if(this.options.accountScopedRegistration){for(const path of this.ownershipPaths(old))if(this.ownsRegistration(await this.read(a,()=>tx.get(path)),old))owned.push(path);if(!tx.delete)refuse("unavailable");}
      const row={revision:bump(old.revision),enabled:false};current(a);
      for(const path of owned)tx.delete!(path);
      tx.set(`${this.base()}/proactive_registration/current`,row);return this.registrationView(row);},false);
  }
  private readStateRow(row:Row|undefined):FirstFlowReadState{
    if(!row)return {revision:0,readThroughSequence:0};if(!exact(row,["revision","readThroughSequence","updatedAt"])||!uint(row.revision)||row.revision<1||!uint(row.readThroughSequence)||!iso(row.updatedAt))refuse("unavailable");return {revision:row.revision,readThroughSequence:row.readThroughSequence};
  }
  readState(a:ProactiveActor,id:string):Promise<FirstFlowResult<FirstFlowReadState>>{return this.run(a,async(tx,c)=>{if(!UUID.test(id))refuse("invalid");ok(await c.readableSequence(id,0));return this.readStateRow(await this.read(a,()=>tx.get(`${this.base()}/conversations/${id}/read_state/current`)));});}
  markRead(a:ProactiveActor,id:string,expectedRevision:number,sequence:number):Promise<FirstFlowResult<FirstFlowReadState>>{
    return this.run(a,async(tx,c)=>{if(!UUID.test(id)||!uint(expectedRevision)||!uint(sequence))refuse("invalid");ok(await c.readableSequence(id,sequence));
      const path=`${this.base()}/conversations/${id}/read_state/current`,old=this.readStateRow(await this.read(a,()=>tx.get(path)));if(old.revision!==expectedRevision)refuse("revision_conflict");
      if(sequence<=old.readThroughSequence)return old;const next={revision:bump(old.revision),readThroughSequence:sequence};current(a);tx.set(path,{...next,updatedAt:new Date(this.now()).toISOString()});return next;});
  }
  reserve(a:ProactiveActor,id:string,expectedRevision:number):Promise<FirstFlowResult<FirstFlowReservation>>{
    return this.run(a,async(tx,c)=>{const s=await this.state(tx,a),i=await this.intentRow(tx,a,id);if(!uint(expectedRevision))refuse("invalid");if(i.revision!==expectedRevision)refuse("revision_conflict");
      if(i.state!=="queued")refuse("conflict");this.ensureActive(s,i);this.timing(s,i,true);const source=await this.validateSource(c,i);
      this.timing(s,i,true);const next={...i,revision:bump(i.revision),state:"reserved" as const};current(a);this.stageIntent(tx,next);this.stageState(tx,{...s,inFlightOccurrenceId:id});return {intent:next,source};});
  }
  validateReservation(a:ProactiveActor,r:FirstFlowReservation):Promise<FirstFlowResult<void>>{
    return this.run(a,async(tx,c)=>{const s=await this.state(tx,a),i=await this.intentRow(tx,a,r.intent.intentId);
      if(i.state!=="reserved"||i.revision!==r.intent.revision||i.authorizationScope!==r.intent.authorizationScope||s.inFlightOccurrenceId!==i.intentId)refuse("revision_conflict");
      this.ensureActive(s,i);this.timing(s,i,true);await this.validateSource(c,i,r.source);
    });
  }
  failGeneration(a:ProactiveActor,r:FirstFlowReservation):Promise<FirstFlowResult<FirstFlowIntent>>{
    return this.run(a,async tx=>{const s=await this.state(tx,a),i=await this.intentRow(tx,a,r.intent.intentId);if(i.authorizationScope!==r.intent.authorizationScope||i.revision!==r.intent.revision||i.state!=="reserved")refuse("revision_conflict");
      const next={...i,revision:bump(i.revision),state:"failed" as const};current(a);this.stageIntent(tx,next);this.stageState(tx,this.remove(s,i.intentId));return next;});
  }
  async publish(a:ProactiveActor,input:FirstFlowPublish):Promise<FirstFlowResult<FirstFlowIntent>>{
    const committed=await this.run(a,async(tx,c)=>{
      const s=await this.state(tx,a),i=await this.intentRow(tx,a,input.reservation.intent.intentId);
      if(i.revision!==input.reservation.intent.revision||i.authorizationScope!==input.reservation.intent.authorizationScope||i.state!=="reserved")refuse("revision_conflict");
      this.ensureActive(s,i);if(s.inFlightOccurrenceId!==i.intentId)refuse("conflict");this.timing(s,i,true);
      await this.validateSource(c,i,input.reservation.source);
      // The bridge stages canonical message + receipt + parent only after its
      // own final fresh source reads. No reads may follow append in this Tx.
      const publishedAt=new Date(this.now()).toISOString(),appended=ok(await c.append({...input,reservation:{intent:i,source:input.reservation.source}}));
      this.timing(s,i,true);const next:FirstFlowIntent={...i,revision:bump(i.revision),state:"published",messageId:input.messageId,messageSequence:appended.sequence,publishedAt,
        dispatchState:s.pushEnabled?"not_started":"skipped"};
      const {inFlightOccurrenceId:_,...rest}=s;let state:State={...rest,rollingAttemptTimes:[publishedAt]};if(!s.pushEnabled)state=this.remove(state,i.intentId);
      current(a);this.stageIntent(tx,next);this.stageState(tx,state);return next;
    });
    if(committed.kind!=="ok")return committed;
    // The production gateway writes serverTimestamp, which is not known in
    // the callback. Only a fresh ordinary read can confirm the actual commit
    // timestamp. Its failure is never converted to an admission-time receipt.
    const readback=await this.intent(a,committed.value.intentId);
    if(readback.kind!=="ok"||readback.value.state!=="published"||readback.value.messageId!==input.messageId)return {kind:"unknown"};
    return readback;
  }
  claimDispatch(a:ProactiveActor,id:string,expectedRevision:number):Promise<FirstFlowResult<FirstFlowDispatch>>{
    return this.run(a,async(tx,c)=>{
      const s=await this.state(tx,a),i=await this.intentRow(tx,a,id);if(!uint(expectedRevision))refuse("invalid");if(i.revision!==expectedRevision)refuse("revision_conflict");
      if(i.state!=="published"||i.dispatchState!=="not_started")refuse("conflict");this.ensureActive(s,i);this.timing(s,i,false);if(!s.pushEnabled)refuse("denied");
      await this.validateSource(c,i);ok(await c.readableSequence(i.conversationId,i.messageSequence!));
      const row=parseRegistration(await this.read(a,()=>tx.get(`${this.base()}/proactive_registration/current`))),now=this.now(),lease=this.options.registrationLeaseExpiresAt;
      const duration=this.options.registrationLeaseDurationMs;
      const validLease=duration!==undefined
        ? Number.isFinite(Date.parse(row.registeredAt!))&&Date.parse(row.registeredAt!)<=now&&Date.parse(row.expiresAt!)-Date.parse(row.registeredAt!)<=duration
        : !!lease&&now<Date.parse(lease)&&Date.parse(row.expiresAt!)<=Date.parse(lease);
      if(!row.enabled||!row.registrationValue||!validLease||(!this.options.accountScopedRegistration&&(!this.options.installationRef||row.installationRef!==this.options.installationRef))||
        now>=Date.parse(row.expiresAt!))refuse("denied");
      if(!await this.ownership(tx,a,row))refuse("denied");
      this.timing(s,i,false);const next:FirstFlowIntent={...i,revision:bump(i.revision),dispatchState:"dispatching",attemptedAt:new Date(now).toISOString(),registrationRevision:row.revision};
      const claim:FirstFlowClaim={intentId:id,conversationId:i.conversationId,messageId:i.messageId!,revision:next.revision,authorizationScope:i.authorizationScope,expiresAt:i.expiresAt,registrationRevision:row.revision};
      current(a);this.stageIntent(tx,next);return {claim,registrationValue:row.registrationValue,deliveryRef:id,preview:s.preview};
    });
  }
  recordDispatch(a:ProactiveActor,claim:FirstFlowClaim,outcome:"accepted"|"rejected"|"unknown"):Promise<FirstFlowResult<FirstFlowIntent>>{
    return this.run(a,async tx=>{const s=await this.state(tx,a),i=await this.intentRow(tx,a,claim.intentId);
      if(i.authorizationScope!==claim.authorizationScope||i.revision!==claim.revision||i.state!=="published"||i.dispatchState!=="dispatching"||i.messageId!==claim.messageId||
        i.conversationId!==claim.conversationId||i.registrationRevision!==claim.registrationRevision)refuse("revision_conflict");
      if(!["accepted","rejected","unknown"].includes(outcome))refuse("invalid");
      const next:FirstFlowIntent={...i,revision:bump(i.revision),dispatchState:outcome==="rejected"?"skipped":outcome,...(outcome==="accepted"?{providerAcceptedAt:new Date(this.now()).toISOString()}:{})};
      current(a);this.stageIntent(tx,next);this.stageState(tx,this.remove(s,i.intentId));return next;});
  }
  recover(a:ProactiveActor):Promise<FirstFlowResult<readonly FirstFlowIntent[]>>{
    return this.run(a,async tx=>{let s=await this.state(tx,a);if(s.revision===0)return [];const rows:FirstFlowIntent[]=[];for(const id of s.activeIntentIds)rows.push(await this.intentRow(tx,a,id));
      const now=this.now(),result:FirstFlowIntent[]=[];
      for(const i of rows){let next=i;
        if(i.state==="published"&&i.dispatchState==="dispatching")next={...i,revision:bump(i.revision),dispatchState:"unknown"};
        else if(["reserved","prepared"].includes(i.state))next={...i,revision:bump(i.revision),state:"failed"};
        else if(now>=Date.parse(i.expiresAt)&&i.state==="queued")next={...i,revision:bump(i.revision),state:"expired"};
        else if(now>=Date.parse(i.expiresAt)&&i.state==="published"&&i.dispatchState==="not_started")next={...i,revision:bump(i.revision),dispatchState:"skipped"};
        if(next!==i)this.stageIntent(tx,next);
        if(next.state!=="queued"&&!(next.state==="published"&&next.dispatchState==="not_started"))s=this.remove(s,i.intentId);result.push(next);
      }
      current(a);this.stageState(tx,s);return result;
    });
  }
}
