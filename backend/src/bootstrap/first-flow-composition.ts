import { randomUUID } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import type { Credential } from "firebase-admin/app";
import { LocalFirstFlowTransport } from "../ai-runtime/infrastructure/local-first-flow-transport.js";
import type { LocalModelLane } from "../ai-runtime/infrastructure/local-model-lane.js";
import type { FirestoreConversationStore } from "../ai-conversation/infrastructure/firestore-conversation-store.js";
import type { FirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import { requireFeatureEnvironment } from "../shared/infrastructure/firebase/feature-environment.js";
import { FirstFlowApplication } from "../proactive/application/first-flow-application.js";
import { FirstFlowDueWorker } from "../proactive/application/due-worker.js";
import { FirestoreFirstFlowStore } from "../proactive/infrastructure/firestore-first-flow-store.js";
import { SinglePostFcmSender } from "../proactive/infrastructure/single-post-fcm-sender.js";
import type { FirstFlowSender, ProactiveActor } from "../proactive/ports/first-flow.js";

/** Explicit operator-owned candidate configuration. No ordinary environment
 * variable, application startup or HTTP input constructs this permission. */
export interface FirstFlowConfiguration {
  readonly ownerAccountId: string;
  readonly firebaseUid: string;
  readonly worker?: { readonly endsAtMs: number; readonly intervalMs?: number };
  readonly push?: { readonly installationRef: string; readonly leaseExpiresAt: string };
}

interface FirstFlowCompositionOptions {
  readonly configuration: FirstFlowConfiguration;
  readonly environment: Readonly<Record<string, string | undefined>>;
  /** Exactly the retained-message gateway and store used by chat. */
  readonly conversation: { readonly gateway: FirestoreGateway; readonly store: FirestoreConversationStore };
  readonly lane: LocalModelLane;
  readonly auth: Pick<Auth, "getUser">;
  readonly credential?: Credential;
  readonly healthy: () => boolean;
  readonly nowMs?: () => number;
}

export function createFirstFlowComposition(options: FirstFlowCompositionOptions) {
  requireFeatureEnvironment(options.environment);
  const config = options.configuration, now = options.nowMs ?? Date.now;
  if (!config.firebaseUid || config.firebaseUid.length > 128 || !config.firebaseUid.isWellFormed() ||
      /[\u0000-\u001f\u007f]/u.test(config.firebaseUid)) throw Error("Fixed first-flow identity required");
  if (config.push && (!config.worker || !options.credential || options.environment.ENMORI_REMOTE_GROUP !== "true" ||
      !Number.isFinite(Date.parse(config.push.leaseExpiresAt)) ||
      new Date(config.push.leaseExpiresAt).toISOString() !== config.push.leaseExpiresAt ||
      Date.parse(config.push.leaseExpiresAt) <= now() ||
      Date.parse(config.push.leaseExpiresAt) > config.worker.endsAtMs + 15 * 60000)) {
    throw Error("Explicit bounded push configuration required");
  }
  let accepting = true;
  const current = () => accepting && options.healthy();
  const store = new FirestoreFirstFlowStore(options.conversation.gateway, options.environment, {
    ownerAccountId: config.ownerAccountId,
    conversationTransaction: (tx, principal, owner, live) => options.conversation.store.firstFlowTransaction(tx, principal, owner, live),
    utcMilliseconds: now,
    ...(config.push ? { installationRef: config.push.installationRef, registrationLeaseExpiresAt: config.push.leaseExpiresAt } : {}),
  });
  const sender: FirstFlowSender = config.push && options.credential
    ? new SinglePostFcmSender({ projectId: "enmori-rmvp-controlled", credential: options.credential })
    : { sendOnce: async () => ({ kind: "not_attempted" }) };
  const application = new FirstFlowApplication({ store, model: new LocalFirstFlowTransport(options.lane), sender,
    newMessageId: randomUUID, nowMs: now });
  const actor: ProactiveActor = {
    principal: { firebaseUid: config.firebaseUid }, current,
    // A durable explicit follow-up is not an old bearer-token session. The
    // current Auth account and current purpose/binding in each store transaction
    // must both remain eligible. Lookup failures never become valid identity.
    verifyCurrentAuth: async () => {
      if (!current()) return { kind: "invalid" };
      try {
        const user = await options.auth.getUser(config.firebaseUid);
        if (!current()) return { kind: "invalid" };
        if (user.disabled || user.uid !== config.firebaseUid) return { kind: "forbidden" };
        return { kind: "verified", principal: { firebaseUid: config.firebaseUid } };
      } catch (error: unknown) {
        return typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found"
          ? { kind: "invalid" } : { kind: "dependency_unavailable" };
      }
    },
  };
  const worker = config.worker ? new FirstFlowDueWorker({ application, actor, endsAtMs: config.worker.endsAtMs,
    ...(config.worker.intervalMs === undefined ? {} : { intervalMs: config.worker.intervalMs }), nowMs: now }) : undefined;
  return { application, store, accepting: current,
    start: () => { if (current()) worker?.start(); },
    stop: async () => { accepting = false; await worker?.stop(); },
  };
}
