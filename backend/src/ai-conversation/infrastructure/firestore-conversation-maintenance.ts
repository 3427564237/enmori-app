import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { RuntimeEpoch } from "../ports/real-conversation-store.js";
import type { ConversationCleanup, ConversationQuiescence } from "../ports/conversation-cleanup.js";
import { parseCanonicalAiMessageLocation, type CanonicalAiMessageCollection } from "../domain/canonical-ai-message-location.js";
import { resolveRealRetention } from "../domain/real-retention-resolver.js";
import { parseReadAuthority, parseReadInstant, compareInstant } from "./real-context-records.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { ConversationMaintenance, MaintenanceResult } from "../ports/conversation-maintenance.js";

const RUNTIME="ai_runtime_fence/current", PROGRESS="ai_cleanup_progress/source_sweep";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const uint=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const exact=(r:Row,required:readonly string[],optional:readonly string[]=[]):boolean=>required.every(k=>Object.hasOwn(r,k))&&Object.keys(r).every(k=>required.includes(k)||optional.includes(k));
function groupCursor(value:unknown,phase:CanonicalAiMessageCollection):value is string{
  if(typeof value!=="string"||!value.isWellFormed())return false;
  const parts=value.split("/");
  // The scan must continue past malformed ancestors without treating them as
  // authorized cleanup targets. A cursor is only an observed complete DB name.
  return parts.length>=2&&parts.length%2===0&&parts.at(-2)===phase&&parts.every(p=>p.length>0);
}
class MaintenanceFailure extends Error {constructor(){super("unavailable");}}
function unavailable():never{throw new MaintenanceFailure();}
interface PageGuard {readonly epoch:RuntimeEpoch;readonly cleanupGeneration:number;}
interface Progress {
  readonly schemaVersion:1;readonly revision:number;readonly phase:CanonicalAiMessageCollection;
  readonly lastDocumentName?:string;readonly startedAt:FullPrecisionInstant;readonly resumeUntil:FullPrecisionInstant;readonly hadFailure:boolean;
}

/** One explicitly isolated service entry; no ordinary runtime enablement. */
export class FirestoreConversationMaintenance implements ConversationMaintenance {
  private running=false;
  private lastNow=Number.NEGATIVE_INFINITY;
  constructor(private readonly gateway:FirestoreGateway, environment:Readonly<Record<string,string|undefined>>,
    private readonly cleanup:ConversationCleanup,private readonly quiescence:ConversationQuiescence,
    private readonly utcMilliseconds:()=>number=Date.now){requireControlledEmulatorEnvironment(environment);}
  private tx<T>(work:(tx:Tx)=>Promise<T>):Promise<T>{return this.gateway.runTransaction(work,{maxAttempts:1});}
  private now():FullPrecisionInstant{
    const ms=this.utcMilliseconds();if(!Number.isSafeInteger(ms)||ms<this.lastNow)unavailable();this.lastNow=ms;
    const seconds=Math.floor(ms/1000);return {seconds,nanoseconds:(ms-seconds*1000)*1000000};
  }
  private async runtime(tx:Tx,epoch:RuntimeEpoch,cleanupGeneration?:number):Promise<number>{
    const r=await tx.get(RUNTIME);
    if(!r||!exact(r,["processEpoch","generation","cleanupGeneration"])||r.processEpoch!==epoch.processEpoch||r.generation!==epoch.generation||
      !UUID.test(epoch.processEpoch)||!uint(epoch.generation)||epoch.generation===0||!uint(r.cleanupGeneration)||
      (cleanupGeneration!==undefined&&r.cleanupGeneration!==cleanupGeneration))unavailable();
    return r.cleanupGeneration;
  }
  private parseProgress(r:Row|undefined):Progress|undefined{
    if(!r||!exact(r,["schemaVersion","revision","phase","startedAt","resumeUntil","hadFailure"],["lastDocumentName"])||r.schemaVersion!==1||
      !uint(r.revision)||r.revision===0||!["messages","message_sources"].includes(String(r.phase))||typeof r.hadFailure!=="boolean")return undefined;
    const startedAt=parseReadInstant(r.startedAt),resumeUntil=parseReadInstant(r.resumeUntil),phase=r.phase as CanonicalAiMessageCollection;
    if(!startedAt||!resumeUntil||resumeUntil.seconds!==startedAt.seconds+86400||resumeUntil.nanoseconds!==startedAt.nanoseconds||
      (r.lastDocumentName!==undefined&&!groupCursor(r.lastDocumentName,phase)))return undefined;
    return {schemaVersion:1,revision:r.revision,phase,startedAt,resumeUntil,hadFailure:r.hadFailure,
      ...(r.lastDocumentName===undefined?{}:{lastDocumentName:r.lastDocumentName as string})};
  }
  private sameProgress(actual:Progress,expected:Progress):boolean{
    return actual.revision===expected.revision&&actual.phase===expected.phase&&actual.lastDocumentName===expected.lastDocumentName&&
      actual.hadFailure===expected.hadFailure&&compareInstant(actual.startedAt,expected.startedAt)===0&&
      compareInstant(actual.resumeUntil,expected.resumeUntil)===0;
  }
  private async begin(epoch:RuntimeEpoch){
    return this.tx(async tx=>{
      const cleanupGeneration=await this.runtime(tx,epoch),row=await tx.get(PROGRESS),previous=this.parseProgress(row),now=this.now();
      if(previous&&compareInstant(now,previous.resumeUntil)<0&&compareInstant(now,previous.startedAt)>=0)
        return {guard:{epoch,cleanupGeneration},progress:previous,reset:false};
      const progress:Progress={schemaVersion:1,revision:1,phase:"messages",startedAt:now,
        resumeUntil:{seconds:now.seconds+86400,nanoseconds:now.nanoseconds},hadFailure:false};
      tx.set(PROGRESS,{...progress});return {guard:{epoch,cleanupGeneration},progress,reset:row!==undefined};
    });
  }
  private async page(guard:PageGuard,progress:Progress):Promise<readonly string[]>{
    return this.tx(async tx=>{
      await this.runtime(tx,guard.epoch,guard.cleanupGeneration);
      const current=this.parseProgress(await tx.get(PROGRESS));
      if(!current||!this.sameProgress(current,progress)||compareInstant(this.now(),current.resumeUntil)>=0||!tx.listGroupPage)unavailable();
      return (await tx.listGroupPage(progress.phase,progress.lastDocumentName,25)).map(row=>row.path);
    });
  }
  private async advance(guard:PageGuard,previous:Progress,next:Progress|undefined):Promise<void>{
    await this.tx(async tx=>{
      await this.runtime(tx,guard.epoch,guard.cleanupGeneration);
      const actual=this.parseProgress(await tx.get(PROGRESS));
      if(!actual||!this.sameProgress(actual,previous)||compareInstant(this.now(),actual.resumeUntil)>=0||!tx.delete)unavailable();
      if(next)tx.set(PROGRESS,{...next});else tx.delete(PROGRESS);
    });
  }
  private async inspect(path:string,phase:CanonicalAiMessageCollection,guard:PageGuard):Promise<"kept"|"changed"|"whole"|"orphan">{
    const at=parseCanonicalAiMessageLocation(path,phase);if(!at)unavailable();
    return this.tx(async tx=>{
      await this.runtime(tx,guard.epoch,guard.cleanupGeneration);
      const parentPath=`accounts/${at.ownerAccountId}/conversations/${at.conversationId}`,parent=await tx.get(parentPath);
      if(!parent)return "whole";
      if(!tx.listSnapshots||!tx.delete)unavailable();
      const rows=await tx.listSnapshots(`${parentPath}/messages`);
      const retention=resolveRealRetention({ownerAccountId:at.ownerAccountId,conversationId:at.conversationId,
        inventory:{parent:{...parent,ownerAccountId:at.ownerAccountId,conversationId:at.conversationId},messages:rows.map(m=>({
          ownerAccountId:at.ownerAccountId,conversationId:at.conversationId,messageId:m.id,role:m.data.role,sequence:m.data.sequence,
          createTime:m.createTime,...(m.data.appendBefore===undefined?{}:{appendBefore:m.data.appendBefore})}))},now:{precision:"millisecond",instant:this.now()}});
      if(retention.state==="unavailable")unavailable();if(retention.state!=="live")return "whole";
      const sourcePath=`${parentPath}/message_sources/${at.messageId}`,messagePath=`${parentPath}/messages/${at.messageId}`;
      const source=await tx.get(sourcePath),a=rows.find(m=>m.id===at.messageId);
      if(!a)return source?"orphan":"kept";
      if(a.data.role==="user"){if(phase==="message_sources"&&source)unavailable();return "kept";}
      if(a.data.role!=="assistant"||!exact(a.data,["role","sequence","availability","replyToUserMessageId","presentationMode","appendBefore"],["text","presentationProjectionVersion"])||
        !["available","unavailable"].includes(String(a.data.availability))||typeof a.data.replyToUserMessageId!=="string"||!UUID.test(a.data.replyToUserMessageId)||
        !((a.data.presentationMode==="default"&&a.data.presentationProjectionVersion===undefined)||
          (a.data.presentationMode==="persona"&&a.data.presentationProjectionVersion==="persona_presentation_v1")))unavailable();
      const u=rows.find(m=>m.id===a.data.replyToUserMessageId);
      if(!u||u.data.role!=="user"||u.data.acceptedAssistantMessageId!==a.id||!uint(u.data.sequence)||!uint(a.data.sequence)||u.data.sequence>=a.data.sequence)unavailable();
      if(a.data.availability==="unavailable"){
        const {text:_discarded,...metadata}=a.data;
        if(Object.hasOwn(a.data,"text"))tx.set(messagePath,metadata);
        if(source)tx.delete(sourcePath);
        return source||Object.hasOwn(a.data,"text")?"changed":"kept";
      }
      if(typeof a.data.text!=="string"||!a.data.text.isWellFormed()||!a.data.text.trim()||!source||!exact(source,["sources"],["purposeRevocationGeneration"])||!Array.isArray(source.sources)||source.sources.length>5)unavailable();
      const seen=new Set<string>();
      for(const item of source.sources){
        if(typeof item!=="object"||item===null||Array.isArray(item)||!exact(item,["sourceType","sourceId"])||item.sourceType!=="check_in"||
          typeof item.sourceId!=="string"||!item.sourceId||!item.sourceId.isWellFormed()||item.sourceId.includes("/")||seen.has(item.sourceId))unavailable();
        seen.add(item.sourceId);
      }
      if(source.sources.length===0){if(Object.hasOwn(source,"purposeRevocationGeneration"))unavailable();return "kept";}
      if(!uint(source.purposeRevocationGeneration))unavailable();
      const authority=parseReadAuthority(await tx.get(`accounts/${at.ownerAccountId}`),at.ownerAccountId);
      if(!authority||authority.purposeRevocationGeneration<source.purposeRevocationGeneration)unavailable();
      if(authority.purposeRevocationGeneration===source.purposeRevocationGeneration){
        // DU's operational no-restore/nonreuse proof is absent. A present or
        // missing Note alone cannot certify permanent current source identity.
        unavailable();
      }
      // A complete legal monotonic generation advancement independently proves
      // revocation, including revoke/regrant offline. Remove ALL source pairs.
      const {text:_discarded,...metadata}=a.data;
      tx.set(messagePath,{...metadata,availability:"unavailable"});tx.delete(sourcePath);return "changed";
    });
  }
  private async orphan(path:string,phase:CanonicalAiMessageCollection,guard:PageGuard):Promise<boolean>{
    const at=parseCanonicalAiMessageLocation(path,phase);if(!at||!this.quiescence.withTargetIdle)return false;
    const settled=await this.quiescence.withTargetIdle(at.ownerAccountId,at.conversationId,()=>this.tx(async tx=>{
      await this.runtime(tx,guard.epoch,guard.cleanupGeneration);if(!tx.delete)unavailable();
      const base=`accounts/${at.ownerAccountId}/conversations/${at.conversationId}`;
      const parent=await tx.get(base),message=await tx.get(`${base}/messages/${at.messageId}`),source=await tx.get(`${base}/message_sources/${at.messageId}`);
      if(!parent||parent.state!=="live"||message)unavailable();
      if(source)tx.delete(`${base}/message_sources/${at.messageId}`);return true;
    }));return settled.kind==="settled"&&settled.value;
  }
  async sourceSweep(epoch:RuntimeEpoch):Promise<MaintenanceResult>{
    const result={complete:false,inspected:0,changed:0,failures:0,expiredOrInvalidCheckpoint:false};
    if(this.running){result.failures++;return result;}this.running=true;
    try{
      const started=await this.begin(epoch);let progress=started.progress,guard=started.guard;
      result.expiredOrInvalidCheckpoint=started.reset;if(started.reset)result.failures++;
      if(progress.hadFailure)result.failures++; // Retain a resumed earlier failed batch across a whole-delete restart.
      sweep:for(;;){
        const page=await this.page(guard,progress);let failed=false;
        for(const path of page){result.inspected++;
          try{
            const outcome=await this.inspect(path,progress.phase,guard);
            if(outcome==="changed")result.changed++;
            else if(outcome==="orphan"){
              if(await this.orphan(path,progress.phase,guard))result.changed++;else{failed=true;result.failures++;}
            }else if(outcome==="whole"){
              const at=parseCanonicalAiMessageLocation(path,progress.phase)!;
              const removed=await this.cleanup.expireKnown(at.ownerAccountId,at.conversationId,epoch);
              if(removed.kind==="deleted")result.changed++;else if(removed.kind!=="live"){failed=true;result.failures++;}
              // Whole deletion changes cleanupGeneration and clears progress.
              // A NEW generation-bound checkpoint restarts at head within this
              // run; do not restore an old cursor or defer each orphan an hour.
              if(removed.kind==="deleted"){
                const restarted=await this.begin(epoch);guard=restarted.guard;progress=restarted.progress;
                if(restarted.reset){result.expiredOrInvalidCheckpoint=true;result.failures++;}
                continue sweep;
              }
            }
          }catch{failed=true;result.failures++;}
        }
        if(progress.revision===Number.MAX_SAFE_INTEGER)unavailable();
        const hadFailure=progress.hadFailure||failed;
        if(page.length<25&&progress.phase==="message_sources"){
          await this.advance(guard,progress,undefined);result.complete=!hadFailure&&result.failures===0;return result;
        }
        const next:Progress=page.length<25?{schemaVersion:1,revision:progress.revision+1,phase:"message_sources",
          startedAt:progress.startedAt,resumeUntil:progress.resumeUntil,hadFailure}:
          {...progress,revision:progress.revision+1,lastDocumentName:page.at(-1)!,hadFailure};
        await this.advance(guard,progress,next);progress=next;
      }
    }catch{result.failures++;return result;}finally{this.running=false;}
  }
  async expirySweep(epoch:RuntimeEpoch):Promise<MaintenanceResult>{
    const result={complete:false,inspected:0,changed:0,failures:0,expiredOrInvalidCheckpoint:false};
    if(this.running){result.failures++;return result;}this.running=true;
    try{let after:string|undefined;
      for(;;){
        const page=await this.tx(async tx=>{await this.runtime(tx,epoch);if(!tx.listGroupPage)unavailable();return (await tx.listGroupPage("conversations",after,25)).map(r=>r.path);});
        for(const path of page){result.inspected++;const parts=path.split("/");
          if(parts.length!==4||parts[0]!=="accounts"||parts[2]!=="conversations"||!UUID.test(parts[1]!)||!UUID.test(parts[3]!)){result.failures++;continue;}
          const outcome=await this.cleanup.expireKnown(parts[1]!,parts[3]!,epoch);
          if(outcome.kind==="deleted")result.changed++;else if(outcome.kind!=="live")result.failures++;
        }
        if(page.length<25){result.complete=result.failures===0;return result;}after=page.at(-1);
      }
    }catch{result.failures++;return result;}finally{this.running=false;}
  }
}
