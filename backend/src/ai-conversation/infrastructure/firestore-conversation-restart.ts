import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { requireControlledEmulatorEnvironment } from "../../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { RealConversationStore, OperationTarget, RuntimeEpoch } from "../ports/real-conversation-store.js";
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
/** After startEpoch is confirmed, before new admission. Previous operations are
 * settled through their canonical effect/pair, never replayed or re-accepted. */
export async function retirePreviousConversationEpoch(gateway:FirestoreGateway,store:RealConversationStore,epoch:RuntimeEpoch,
  environment:Readonly<Record<string,string|undefined>>):Promise<{complete:boolean;inspected:number;retired:number;failures:number}>{
  requireControlledEmulatorEnvironment(environment);
  const result={complete:false,inspected:0,retired:0,failures:0};let after:string|undefined;
  try{for(;;){
    const page=await gateway.runTransaction(async tx=>{
      const runtime=await tx.get("ai_runtime_fence/current");
      if(!runtime||runtime.processEpoch!==epoch.processEpoch||runtime.generation!==epoch.generation||!tx.listPage)throw new Error("unavailable");
      return tx.listPage("ai_operation_fences",after,25);
    },{maxAttempts:1});
    for(const row of page){result.inspected++;const d=row.data;
      if(!uuid(row.id)||![d.ownerAccountId,d.conversationId,d.userMessageId,d.processEpoch].every(uuid)||
        !["send","retry"].includes(String(d.kind))||!["reserved_new","existing"].includes(String(d.targetKind))){result.failures++;continue;}
      if(d.processEpoch===epoch.processEpoch)continue;
      const target:OperationTarget={operationId:row.id,ownerAccountId:d.ownerAccountId as string,conversationId:d.conversationId as string,
        userMessageId:d.userMessageId as string,kind:d.kind as "send"|"retry",targetKind:d.targetKind as "reserved_new"|"existing"};
      const retired=await store.retireOperation(target,epoch,()=>false);
      if(retired.kind==="confirmed")result.retired++;else result.failures++;
    }
    if(page.length<25){result.complete=result.failures===0;return result;}after=page.at(-1)!.id;
  }}catch{result.failures++;return result;}
}
