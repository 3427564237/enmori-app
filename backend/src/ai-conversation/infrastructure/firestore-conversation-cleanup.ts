import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as Row } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireFeatureEnvironment } from "../../shared/infrastructure/firebase/feature-environment.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { ConversationCleanup, ConversationCleanupResult, ConversationQuiescence } from "../ports/conversation-cleanup.js";
import type { RuntimeEpoch } from "../ports/real-conversation-store.js";
import { resolveRealRetention } from "../domain/real-retention-resolver.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RUNTIME="ai_runtime_fence/current", PROGRESS="ai_cleanup_progress/source_sweep";
const positive=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>0;
const nonnegative=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const exact=(row:Row,names:readonly string[]):boolean=>Object.keys(row).length===names.length&&names.every(k=>Object.hasOwn(row,k));
class CleanupFailure extends Error { constructor(readonly kind:"denied"|"unavailable"|"unresolved"){super(kind);} }
function stop(kind:"denied"|"unavailable"|"unresolved"):never{throw new CleanupFailure(kind);}
const path=(owner:string,id:string):string=>`accounts/${owner}/conversations/${id}`;

/** Selected C-A whole delete/expiry. No ordinary composition or background service. */
export class FirestoreConversationCleanup implements ConversationCleanup {
  private lastNow=Number.NEGATIVE_INFINITY;
  constructor(private readonly gateway:FirestoreGateway, environment:Readonly<Record<string,string|undefined>>,
    private readonly quiescence:ConversationQuiescence, private readonly utcMilliseconds:()=>number=Date.now){
    requireFeatureEnvironment(environment);
  }
  private async transaction<T>(work:(tx:Tx)=>Promise<T>):Promise<T>{
    return this.gateway.runTransaction(work,{maxAttempts:1});
  }
  private async runtime(tx:Tx,epoch:RuntimeEpoch):Promise<Row>{
    const row=await tx.get(RUNTIME);
    if(!row||!exact(row,["processEpoch","generation","cleanupGeneration"])||
      typeof row.processEpoch!=="string"||!UUID.test(row.processEpoch)||!positive(row.generation)||!nonnegative(row.cleanupGeneration))stop("unavailable");
    if(row.processEpoch!==epoch.processEpoch||row.generation!==epoch.generation)stop("unresolved");
    return row;
  }
  private async owner(tx:Tx,principal:AuthPrincipal,expected:string):Promise<void>{
    const id=createAuthBindingDocumentId(principal.firebaseUid); if(!id)stop("denied");
    const binding=await tx.get(`auth_bindings/${id}`); if(!binding)stop("denied");
    const owner=parseAuthBinding(binding); if(owner===undefined)stop("unavailable"); if(owner!==expected)stop("denied");
    const account=await tx.get(`accounts/${owner}`); if(!account||!parseAccountProjection(account))stop("unavailable");
  }
  private parent(row:Row):void{
    if(!exact(row,["state","lifecycleVersion","nextSequence","latestMessageId"])||
      !["live","deleting"].includes(String(row.state))||!positive(row.lifecycleVersion)||!positive(row.nextSequence)||
      typeof row.latestMessageId!=="string"||!UUID.test(row.latestMessageId))stop("unavailable");
  }
  private async mark(owner:string,id:string,epoch:RuntimeEpoch,principal:AuthPrincipal|undefined,expiry:boolean):Promise<"marked"|"live">{
    if(!UUID.test(owner)||!UUID.test(id))stop("unavailable");
    return this.transaction(async tx=>{
      await this.runtime(tx,epoch); if(principal)await this.owner(tx,principal,owner);
      const row=await tx.get(path(owner,id));
      if(!row)return "marked"; // Absence is NOT completion; all children/guards still have to be discovered.
      this.parent(row);
      if(expiry&&row.state==="live"){
        if(!tx.listSnapshots)stop("unavailable");
        const rows=await tx.listSnapshots(`${path(owner,id)}/messages`), ms=this.utcMilliseconds();
        if(!Number.isSafeInteger(ms)||ms<this.lastNow)stop("unavailable"); this.lastNow=ms;
        const seconds=Math.floor(ms/1000);
        const retention=resolveRealRetention({ownerAccountId:owner,conversationId:id,
          inventory:{parent:{...row,ownerAccountId:owner,conversationId:id},messages:rows.map(m=>({
            ownerAccountId:owner,conversationId:id,messageId:m.id,role:m.data.role,sequence:m.data.sequence,
            ...(m.data.origin === undefined ? {} : {origin:m.data.origin}),
            createTime:m.createTime,...(m.data.appendBefore===undefined?{}:{appendBefore:m.data.appendBefore})}))},
          now:{precision:"millisecond",instant:{seconds,nanoseconds:(ms-seconds*1000)*1_000_000}}});
        if(retention.state==="unavailable")stop("unavailable");
        if(retention.state==="live")return "live";
      }
      if(row.state==="live"){
        if(row.lifecycleVersion===Number.MAX_SAFE_INTEGER)stop("unavailable");
        tx.set(path(owner,id),{...row,state:"deleting",lifecycleVersion:(row.lifecycleVersion as number)+1});
      }
      return "marked";
    });
  }
  private async deleting(tx:Tx,owner:string,id:string,epoch:RuntimeEpoch):Promise<void>{
    await this.runtime(tx,epoch);
    const row=await tx.get(path(owner,id)); if(row){this.parent(row);if(row.state!=="deleting")stop("unresolved");}
  }
  private async fences(tx:Tx,owner:string,id:string,after:string|undefined,limit:number){
    if(!tx.listWherePage)stop("unavailable");
    return tx.listWherePage("ai_operation_fences",{ownerAccountId:owner,conversationId:id},after,limit);
  }
  private validFence(row:Row,owner:string,id:string):void{
    if(!exact(row,["ownerAccountId","conversationId","userMessageId","kind","targetKind","processEpoch","revision","state"])||
      row.ownerAccountId!==owner||row.conversationId!==id||typeof row.userMessageId!=="string"||!UUID.test(row.userMessageId)||
      !["send","retry"].includes(String(row.kind))||!["reserved_new","existing"].includes(String(row.targetKind))||
      typeof row.processEpoch!=="string"||!UUID.test(row.processEpoch)||!positive(row.revision)||!["open","closed"].includes(String(row.state)))stop("unavailable");
  }
  private async drain(owner:string,id:string,epoch:RuntimeEpoch):Promise<ConversationCleanupResult>{
    let after:string|undefined;
    do{
      const page=await this.transaction(async tx=>{
        await this.deleting(tx,owner,id,epoch);const rows=await this.fences(tx,owner,id,after,25);
        for(const row of rows){if(!UUID.test(row.id))stop("unavailable");this.validFence(row.data,owner,id);
          if(row.data.state==="open"&&row.data.revision===Number.MAX_SAFE_INTEGER)stop("unavailable");}
        for(const row of rows)if(row.data.state==="open")tx.set(`ai_operation_fences/${row.id}`,{...row.data,state:"closed",revision:(row.data.revision as number)+1});
        return rows;
      });
      after=page.length===25?page.at(-1)!.id:undefined;
    }while(after!==undefined);
    // All initialization/content I/O is settled and all original admission remains
    // closed by withTargetClosed. Parent stays deleting through every child batch.
    for(const collection of ["messages","message_sources","effects"]){
      let count:number;
      do{count=await this.transaction(async tx=>{
        await this.deleting(tx,owner,id,epoch);if(!tx.listPage||!tx.delete)stop("unavailable");
        const rows=await tx.listPage(`${path(owner,id)}/${collection}`,undefined,25);
        for(const row of rows)tx.delete(`${path(owner,id)}/${collection}/${row.id}`);
        return rows.length;
      });}while(count!==0);
    }
    let count:number;
    do{count=await this.transaction(async tx=>{
      await this.deleting(tx,owner,id,epoch);if(!tx.delete)stop("unavailable");
      const rows=await this.fences(tx,owner,id,undefined,25);
      for(const row of rows){this.validFence(row.data,owner,id);if(row.data.state!=="closed")stop("unresolved");}
      for(const row of rows)tx.delete(`ai_operation_fences/${row.id}`);
      return rows.length;
    });}while(count!==0);
    return this.transaction(async tx=>{
      const runtime=await this.runtime(tx,epoch);if(!tx.listPage||!tx.delete||runtime.cleanupGeneration===Number.MAX_SAFE_INTEGER)stop("unavailable");
      const row=await tx.get(path(owner,id));if(row){this.parent(row);if(row.state!=="deleting")stop("unresolved");}
      for(const collection of ["messages","message_sources","effects"])
        if((await tx.listPage(`${path(owner,id)}/${collection}`,undefined,1)).length)stop("unresolved");
      if((await this.fences(tx,owner,id,undefined,1)).length)stop("unresolved");
      // A stale sweep page cannot recreate its checkpoint after this barrier.
      tx.set(RUNTIME,{...runtime,cleanupGeneration:(runtime.cleanupGeneration as number)+1});
      tx.delete(PROGRESS);tx.delete(path(owner,id));return {kind:"deleted" as const};
    });
  }
  private async run(owner:string,id:string,epoch:RuntimeEpoch,principal:AuthPrincipal|undefined,expiry:boolean):Promise<ConversationCleanupResult>{
    try{
      if(await this.mark(owner,id,epoch,principal,expiry)==="live")return {kind:"live"};
      const result=await this.quiescence.withTargetClosed(owner,id,()=>this.drain(owner,id,epoch));
      return result.kind==="settled"?result.value:{kind:"unresolved"};
    }catch(error){return {kind:error instanceof CleanupFailure?error.kind:"unresolved"};}
  }
  deleteOwned(principal:AuthPrincipal,owner:string,id:string,epoch:RuntimeEpoch){return this.run(owner,id,epoch,principal,false);}
  expireKnown(owner:string,id:string,epoch:RuntimeEpoch){return this.run(owner,id,epoch,undefined,true);}
}
