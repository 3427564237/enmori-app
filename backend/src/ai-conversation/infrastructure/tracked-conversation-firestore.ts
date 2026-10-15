import type { Firestore } from "firebase-admin/firestore";
import { ConversationIoTracker } from "./conversation-io-coordinator.js";

/** Infrastructure-only transaction observation for the concrete request-local
 * Auth/context readers. In particular, a fixed-view close() releases its view,
 * but its underlying read-only SDK transaction must ALSO actually settle. */
export function trackConversationFirestore(firestore: Firestore, io: ConversationIoTracker,
  owner: string, conversation: string, operation: string): Firestore {
  return new Proxy(firestore, { get(target, property) {
    if (property === "runTransaction") return (...args: Parameters<Firestore["runTransaction"]>) =>
      io.run(owner,conversation,operation,()=>Reflect.apply(target.runTransaction,target,args));
    const value: unknown = Reflect.get(target,property,target);
    return typeof value === "function" ? value.bind(target) : value;
  } });
}
