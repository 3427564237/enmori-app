import { randomUUID } from "node:crypto";
import type { AsyncConversationStore, AsyncConversationAuthority, AsyncConversationIdentity, AsyncOperation,
  AsyncEffectContext, AsyncSavedUser, AsyncFenceObservation, AsyncUserWriteObservation, AsyncAssistantWriteObservation,
  AsyncClaimSettlement, AsyncCloseObservation, AsyncReadbackObservation } from "../ports/async-conversation.js";
import type { AcceptedAssistant } from "../ports/conversation-lifecycle.js";
import type { RealConversationStore, RuntimeEpoch, OperationTarget, OpenOperation, OriginalWriteAuthority, StoreResult } from "../ports/real-conversation-store.js";

/** Concrete adapter between ZHOU #103's async Port and JIN's N02 transactions. */
export class AsyncFirestoreConversationStore implements AsyncConversationStore {
  private readonly opened=new WeakMap<AsyncEffectContext,OpenOperation>();
  constructor(private readonly store:RealConversationStore, private readonly epoch:RuntimeEpoch,
    private readonly authority:AsyncConversationAuthority){}
  private target(identity:AsyncConversationIdentity,operation:AsyncOperation):OperationTarget{
    return {...operation,ownerAccountId:identity.ownerId};
  }
  private bound(context:AsyncEffectContext){return {operationId:context.operation.operationId,conversationId:context.operation.conversationId};}
  private writeAuthority(context:AsyncEffectContext):OriginalWriteAuthority|undefined{
    const dependencies=context.dependencies(); if(!dependencies||!context.originalCurrent())return undefined;
    return {principal:context.identity.principal,dependencies,current:()=>context.originalCurrent()&&this.authority.current(context.identity),
      verifyCurrentAuth:async()=>{
        const result=await this.authority.freshAuth(context.identity);
        return result==="authorized"?{kind:"verified",principal:context.identity.principal}:{kind:result};
      }};
  }
  private failed(result:Exclude<StoreResult<unknown>,{kind:"confirmed"}>):{kind:"unknown"}|{kind:"rejected";failure:"stale_authority"|"dependency_unavailable"}{
    return result.kind==="unresolved"?{kind:"unknown"}:{kind:"rejected",failure:result.kind==="unavailable"?"dependency_unavailable":"stale_authority"};
  }
  async open(context:AsyncEffectContext):Promise<AsyncFenceObservation>{
    try{
      if(this.opened.has(context))return {kind:"rejected",failure:"stale_authority"};
      const authority=this.writeAuthority(context);if(!authority)return {kind:"rejected",failure:"stale_authority"};
      const result=await this.store.initializeOperation(this.target(context.identity,context.operation),this.epoch,authority);
      if(result.kind!=="confirmed")return this.failed(result);
      this.opened.set(context,result.value);return {kind:"open",...this.bound(context)};
    }catch{return {kind:"unknown"};}
  }
  async submitUser(context:AsyncEffectContext,text:()=>string|undefined,retry:AsyncSavedUser|undefined):Promise<AsyncUserWriteObservation>{
    try{
      const op=this.opened.get(context),authority=this.writeAuthority(context);
      if(!op||!authority||(op.kind==="retry")!==(retry!==undefined))return {kind:"rejected",failure:"stale_authority"};
      const result=op.kind==="send"?await this.store.saveUser(op,text,authority):await this.store.claimRetry(op,text,retry!,authority);
      if(result.kind!=="confirmed")return this.failed(result);
      // SDK commit was acknowledged. If immutable metadata cannot be obtained,
      // preserve uncertainty; never recast it as a rejected/no-effect write.
      const observed=await this.store.readPendingUser(op,authority);
      if(observed.kind!=="confirmed")return {kind:"unknown"};
      return {kind:"committed",...this.bound(context),user:observed.value};
    }catch{return {kind:"unknown"};}
  }
  async submitAssistant(context:AsyncEffectContext,user:AsyncSavedUser,borrow:()=>AcceptedAssistant|undefined):Promise<AsyncAssistantWriteObservation>{
    try{
      const op=this.opened.get(context),authority=this.writeAuthority(context);
      if(!op||!authority||user.messageId!==op.userMessageId)return {kind:"rejected",failure:"stale_authority"};
      const assistantMessageId=randomUUID();
      const result=await this.store.saveAssistant(op,()=>{
        const value=borrow(),deps=context.dependencies();if(!value||!deps||!context.originalCurrent())return undefined;
        // The accepted minimized provenance must match the captured dependency;
        // a projection cannot silently omit or substitute a required source.
        if(value.provenance.length!==deps.sources.length||value.provenance.some((s,i)=>s.sourceType!==deps.sources[i]!.sourceType||s.sourceId!==deps.sources[i]!.sourceId))return undefined;
        return {messageId:assistantMessageId,text:value.message,presentation:value.presentation};
      },authority,user);
      return result.kind==="confirmed"?{kind:"committed",...this.bound(context),user,assistantMessageId}:this.failed(result);
    }catch{return {kind:"unknown"};}
  }
  async confirmAssistant(context:AsyncEffectContext,user:AsyncSavedUser,assistantMessageId:string):Promise<AsyncClaimSettlement>{
    try{
      const op=this.opened.get(context),authority=this.writeAuthority(context);
      if(!op||!authority||user.messageId!==op.userMessageId)return {kind:"rejected",failure:"stale_authority"};
      const result=await this.store.settleAcknowledgedAssistant(op,authority);
      if(result.kind!=="confirmed")return this.failed(result);
      const pair=await this.store.readAcknowledgedPair(op,authority);
      if(pair.kind!=="confirmed"||pair.value.assistant.messageId!==assistantMessageId||pair.value.user.messageId!==user.messageId||
        pair.value.user.sequence!==user.sequence||pair.value.user.persistedAt.seconds!==user.persistedAt.seconds||pair.value.user.persistedAt.nanoseconds!==user.persistedAt.nanoseconds)return {kind:"unknown"};
      return {kind:"settled",...this.bound(context),user,assistantMessageId};
    }catch{return {kind:"unknown"};}
  }
  async close(identity:AsyncConversationIdentity,operation:AsyncOperation):Promise<AsyncCloseObservation>{
    try{
      const result=await this.store.closeOperation(this.target(identity,operation),this.epoch);
      return result.kind==="confirmed"?{kind:"closed",operationId:operation.operationId,conversationId:operation.conversationId}:{kind:"unresolved"};
    }catch{return {kind:"unresolved"};}
  }
  async reconcile(identity:AsyncConversationIdentity,operation:AsyncOperation):Promise<AsyncReadbackObservation>{
    try{
      if(!this.authority.current(identity)||await this.authority.freshAuth(identity)!=="authorized"||!this.authority.current(identity))return {kind:"unresolved"};
      const result=await this.store.readOutcome(identity.principal,this.target(identity,operation));
      if(result.kind!=="confirmed"||result.value.state==="unresolved")return {kind:"unresolved"};
      const user=result.value.user;
      return {kind:"resolved",operationId:operation.operationId,conversationId:operation.conversationId,
        user:{messageId:user.messageId,sequence:user.sequence,persistedAt:user.persistedAt},
        assistantMessageId:result.value.state==="assistant_saved"?result.value.assistant.messageId:undefined};
    }catch{return {kind:"unresolved"};}
  }
}
