import type { FirestoreGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { FirstFlowStore, FirstFlowResult, ProactiveActor } from "../ports/first-flow.js";
import { FirestoreFirstFlowStore, type FirstFlowStoreOptions } from "./firestore-first-flow-store.js";

/** Resolve each operation from verified identity. The concrete store rechecks
 * the same binding in its own effect transaction, fencing intervening changes. */
export function createAccountScopedFirstFlowStore(gateway: FirestoreGateway,
  environment: Readonly<Record<string,string|undefined>>,
  options: Omit<FirstFlowStoreOptions,"ownerAccountId">): FirstFlowStore {
  async function run<T>(actor:ProactiveActor, work:(store:FirstFlowStore)=>Promise<FirstFlowResult<T>>):Promise<FirstFlowResult<T>> {
    try {
      if(!actor.current())return {kind:"terminated"};
      const verified=await actor.verifyCurrentAuth();
      if(!actor.current())return {kind:"terminated"};
      if(verified.kind!=="verified")return {kind:verified.kind==="dependency_unavailable"?"unavailable":"denied"};
      if(verified.principal.firebaseUid!==actor.principal.firebaseUid)return {kind:"denied"};
      const key=createAuthBindingDocumentId(actor.principal.firebaseUid);
      if(!key)return {kind:"denied"};
      const owner=await gateway.runTransaction(async tx=>{const row=await tx.get(`auth_bindings/${key}`);return row?parseAuthBinding(row):undefined;},{maxAttempts:1});
      if(!actor.current())return {kind:"terminated"};
      if(!owner)return {kind:"denied"};
      return await work(new FirestoreFirstFlowStore(gateway,environment,{...options,ownerAccountId:owner}));
    }catch{return {kind:"unavailable"};}
  }
  return {
    source: (actor, conversationId, sourceMessageId) => run(actor, store => store.source(actor, conversationId, sourceMessageId)),
    settings: (actor) => run(actor, store => store.settings(actor)),
    replaceSettings: (actor, expectedRevision, input) => run(actor, store => store.replaceSettings(actor, expectedRevision, input)),
    createIntent: (actor, input) => run(actor, store => store.createIntent(actor, input)),
    intent: (actor, intentId) => run(actor, store => store.intent(actor, intentId)),
    activeIntents: (actor) => run(actor, store => store.activeIntents(actor)),
    cancelIntent: (actor, intentId, expectedRevision) => run(actor, store => store.cancelIntent(actor, intentId, expectedRevision)),
    registration: (actor) => run(actor, store => store.registration(actor)),
    replaceRegistration: (actor, input) => run(actor, store => store.replaceRegistration(actor, input)),
    deleteRegistration: (actor, installationRef, expectedRevision) => run(actor, store => store.deleteRegistration(actor, installationRef, expectedRevision)),
    readState: (actor, conversationId) => run(actor, store => store.readState(actor, conversationId)),
    markRead: (actor, conversationId, expectedRevision, readThroughSequence) => run(actor, store => store.markRead(actor, conversationId, expectedRevision, readThroughSequence)),
    reserve: (actor, intentId, expectedRevision) => run(actor, store => store.reserve(actor, intentId, expectedRevision)),
    validateReservation: (actor, reservation) => run(actor, store => store.validateReservation(actor, reservation)),
    failGeneration: (actor, reservation) => run(actor, store => store.failGeneration(actor, reservation)),
    publish: (actor, input) => run(actor, store => store.publish(actor, input)),
    claimDispatch: (actor, intentId, expectedRevision) => run(actor, store => store.claimDispatch(actor, intentId, expectedRevision)),
    recordDispatch: (actor, claim, outcome) => run(actor, store => store.recordDispatch(actor, claim, outcome)),
    recover: (actor) => run(actor, store => store.recover(actor)),
  };
}
