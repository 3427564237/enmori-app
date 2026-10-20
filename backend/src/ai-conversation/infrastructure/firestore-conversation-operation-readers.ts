import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { AsyncOperation } from "../ports/async-conversation.js";
import type { StoreResult, RuntimeEpoch } from "../ports/real-conversation-store.js";
import type { ConversationResult } from "../ports/conversation-operations.js";
import type { ConversationCleanup } from "../ports/conversation-cleanup.js";
import type { FirestoreConversationStore } from "./firestore-conversation-store.js";

interface OrdinaryContext {readonly principal:AuthPrincipal;readonly ownerId:string;readonly signal:AbortSignal;current():boolean;}
/** Concrete structural supplier for #107 ConversationOperationReaders. No
 * default synthetic database, inferred owner, cached content or absent-delete success. */
export class FirestoreConversationOperationReaders {
  constructor(private readonly store:FirestoreConversationStore,private readonly cleanup:ConversationCleanup,private readonly epoch:RuntimeEpoch){}
  private current(c:OrdinaryContext){return !c.signal.aborted&&c.current();}
  private result<T>(r:StoreResult<T>,c:OrdinaryContext):ConversationResult<T>{
    if(!this.current(c))return {kind:"failure",code:"AI_UNAVAILABLE"};
    if(r.kind==="confirmed")return {kind:"success",value:r.value};
    return {kind:"failure",code:r.kind==="conversation_unavailable"?"CONVERSATION_UNAVAILABLE":r.kind==="conflict"?"AI_OPERATION_CONFLICT":
      r.kind==="denied"?"AUTH_FORBIDDEN":r.kind==="unresolved"?"AI_OUTCOME_UNRESOLVED":"AI_UNAVAILABLE"};
  }
  async verifyTarget(c:OrdinaryContext,id:string,user?:string){return this.result(await this.store.verifyOwnedTarget(c.principal,c.ownerId,id,user,()=>this.current(c)),c);}
  async retryUser(c:OrdinaryContext,operation:AsyncOperation,text:()=>string|undefined){
    return this.result(await this.store.readRetryUser(c.principal,c.ownerId,operation.conversationId,operation.userMessageId,text,()=>this.current(c)),c);
  }
  async listMessages(c:OrdinaryContext,id:string,before:number|undefined){return this.result(await this.store.listOwnedMessages(c.principal,c.ownerId,id,before,()=>this.current(c)),c);}
  async listConversations(c:OrdinaryContext,after:string|undefined){return this.result(await this.store.listOwnedConversations(c.principal,c.ownerId,after,()=>this.current(c)),c);}
  async readOutcome(c:OrdinaryContext,id:string,operationId:string,original?:AsyncOperation){return this.result(await this.store.readOwnedOutcome(c.principal,c.ownerId,id,operationId,original,()=>this.current(c)),c);}
  async deleteConversation(c:OrdinaryContext,id:string):Promise<ConversationResult<void>>{
    if(!this.current(c))return {kind:"failure",code:"AI_UNAVAILABLE"};
    const result=await this.cleanup.deleteOwned(c.principal,c.ownerId,id,this.epoch);
    if(!this.current(c))return {kind:"failure",code:"AI_OUTCOME_UNRESOLVED"};
    return result.kind==="deleted"?{kind:"success",value:undefined}:{kind:"failure",code:result.kind==="denied"?"AUTH_FORBIDDEN":
      result.kind==="unresolved"?"AI_OUTCOME_UNRESOLVED":"AI_UNAVAILABLE"};
  }
}
