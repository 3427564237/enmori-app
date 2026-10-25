import assert from "node:assert/strict";
import test from "node:test";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { LocalChatTransport } from "../../src/ai-runtime/infrastructure/local-chat-transport.js";
import { LocalFirstFlowTransport } from "../../src/ai-runtime/infrastructure/local-first-flow-transport.js";
import { LocalModelLane } from "../../src/ai-runtime/infrastructure/local-model-lane.js";
import { FirstFlowApplication } from "../../src/proactive/application/first-flow-application.js";
import { FirestoreFirstFlowStore } from "../../src/proactive/infrastructure/firestore-first-flow-store.js";
import { SinglePostFcmSender } from "../../src/proactive/infrastructure/single-post-fcm-sender.js";
import type { FirstFlowResult, FirstFlowSettingsInput, ProactiveActor } from "../../src/proactive/ports/first-flow.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentSnapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), topic = id(2), user = id(3), originalAssistant = id(4), installation = id(5);
const intentId = id(10), messageId = id(20), principal = { firebaseUid: "synthetic-composition-owner" };
const base = `accounts/${owner}`, conversation = `${base}/conversations/${topic}`;
const start = Date.UTC(2026, 9, 25, 10);
const profile = "synthetic-composition-profile";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  APPDATA: profile, HOME: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
const settings: FirstFlowSettingsInput = { mode: "on", categories: ["explicit_follow_up"], timeZone: "UTC",
  quiet: { kind: "window", startMinute: 1320, endMinute: 480 }, maximumInRolling24h: 1,
  cooldownMinutes: 480, pushEnabled: true, preview: "generic" };
const resultValue = <T>(r: FirstFlowResult<T>): T => {
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") throw Error("Expected confirmed composition result");
  return r.value;
};
const done = () => Response.json({ model: "qwen3.5:9b", done: true,
  message: { content: JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Synthetic follow-up response" }) } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

/** Transaction-only replacement: no Firebase client, emulator or credentials.
 * Preserve read-before-write and immutable create metadata for the real Store
 * and conversation bridge. Faults lose the ACK after an atomic fake commit. */
class CompositionGateway implements FirestoreGateway {
  rows = new Map<string, StoredDocumentSnapshot>();
  now = start;
  loseAckOn: ((writes: ReadonlyMap<string, StoredDocument>) => boolean) | undefined;
  private timestamp() { return { seconds: Math.floor(this.now / 1000), nanoseconds: this.now % 1000 * 1e6 }; }
  put(path: string, data: StoredDocument, created = this.now) {
    const previous = this.rows.get(path);
    this.rows.set(path, { id: path.split("/").at(-1)!, data: structuredClone(data),
      createTime: previous?.createTime ?? { seconds: Math.floor(created / 1000), nanoseconds: created % 1000 * 1e6 },
      updateTime: this.timestamp() });
  }
  async runTransaction<T>(work: (tx: FirestoreTransactionGateway) => Promise<T>, options?: { readonly maxAttempts: 1 }): Promise<T> {
    assert.deepEqual(options, { maxAttempts: 1 });
    const rows = new Map([...this.rows].map(([path, row]) => [path, structuredClone(row)]));
    const writes = new Map<string, StoredDocument>();
    let staged = false;
    const read = async <V>(value: V): Promise<V> => {
      assert.equal(staged, false, "all transaction reads precede staged writes");
      await Promise.resolve();
      return structuredClone(value);
    };
    const list = (path: string) => [...rows.entries()].filter(([key]) =>
      key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/")).map(([, row]) => row);
    const set = (path: string, data: StoredDocument) => {
      staged = true;
      writes.set(path, structuredClone(data));
      rows.set(path, { id: path.split("/").at(-1)!, data: structuredClone(data),
        createTime: rows.get(path)?.createTime ?? this.timestamp(), updateTime: this.timestamp() });
    };
    const tx: FirestoreTransactionGateway = {
      get: path => read(rows.get(path)?.data), getSnapshot: path => read(rows.get(path)),
      list: path => read(list(path).map(row => ({ id: row.id, data: row.data }))),
      listSnapshots: path => read(list(path)),
      listMessagePage: (path, before) => read(list(path).filter(row => before === undefined || (row.data.sequence as number) < before)
        .sort((a, b) => (b.data.sequence as number) - (a.data.sequence as number)).slice(0, 20)),
      create: (path, data) => { assert.equal(rows.has(path), false); set(path, data); }, set,
      delete: path => { staged = true; rows.delete(path); },
    };
    const value = await work(tx);
    this.rows = rows;
    if (this.loseAckOn?.(writes)) { this.loseAckOn = undefined; throw Error("synthetic lost commit ACK"); }
    return value;
  }
}

function fixture(options: { model?: () => Promise<Response>; credential?: () => Promise<void>;
  providerStatus?: number; leaseDurationMs?: number; modelTimeoutMs?: number } = {}) {
  const gateway = new CompositionGateway();
  gateway.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`, { accountId: owner });
  gateway.put(base, { username: "composition_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
    onboardingCompletedAt: new Date(start).toISOString(), purposeRevocationGeneration: 0 });
  gateway.put(`${base}/persona_state/current`, { stateRevision: 0, livePersonaIds: [] });
  gateway.put(`${conversation}/messages/${user}`, { role: "user", sequence: 1,
    text: "Synthetic saved request for a later follow-up", acceptedAssistantMessageId: originalAssistant }, start - 200000);
  gateway.put(`${conversation}/messages/${originalAssistant}`, { role: "assistant", sequence: 2, text: "Synthetic original response",
    replyToUserMessageId: user, availability: "available", presentationMode: "default",
    appendBefore: { seconds: start / 1000 - 200 + 90 * 86400, nanoseconds: 0 } }, start - 100000);
  gateway.put(`${conversation}/message_sources/${originalAssistant}`, { sources: [] });
  gateway.put(conversation, { state: "live", lifecycleVersion: 1, nextSequence: 3, latestMessageId: originalAssistant });
  const conversations = new FirestoreConversationStore(gateway, environment, () => gateway.now);
  const store = new FirestoreFirstFlowStore(gateway, environment, { ownerAccountId: owner, utcMilliseconds: () => gateway.now,
    conversationTransaction: (tx, p, account, current) => conversations.firstFlowTransaction(tx, p, account, current),
    installationRef: installation, registrationLeaseExpiresAt: new Date(start + (options.leaseDurationMs ?? 45 * 60000)).toISOString() });
  const actor: ProactiveActor = { principal, current: () => true,
    verifyCurrentAuth: async () => ({ kind: "verified", principal }) };
  const modelRequests: unknown[] = [], providerRequests: { url: string; body: string }[] = [];
  let credentials = 0;
  const lane = new LocalModelLane("qwen3.5:9b", async (url, init) => {
    assert.equal(url, "http://127.0.0.1:11434/api/chat");
    const payload = JSON.parse(init!.body as string);
    const content = payload.messages[1].content as string;
    modelRequests.push(content.startsWith("{") ? JSON.parse(content) : content);
    return options.model ? options.model() : done();
  });
  const sender = new SinglePostFcmSender({ projectId: "synthetic-enmori-project",
    credential: { getAccessToken: async () => {
      credentials++;
      await options.credential?.();
      return { access_token: "synthetic-oauth", expires_in: 3600 };
    } }, fetch: async (url, init) => {
      providerRequests.push({ url: String(url), body: init!.body as string });
      return options.providerStatus === undefined ? Response.json({ name: "projects/synthetic-enmori-project/messages/one" })
        : new Response(null, { status: options.providerStatus });
    } });
  const app = new FirstFlowApplication({ store, model: new LocalFirstFlowTransport(lane), sender,
    nowMs: () => gateway.now, newMessageId: () => messageId,
    ...(options.modelTimeoutMs === undefined ? {} : { modelTimeoutMs: options.modelTimeoutMs }) });
  const queued = async () => {
    assert.equal(resultValue(await app.settings(actor)).mode, "off");
    resultValue(await app.replaceSettings(actor, 0, settings));
    resultValue(await app.replaceRegistration(actor, { expectedRevision: 0, installationRef: installation,
      registrationKind: "fcm_token", registrationValue: "synthetic-registration-canary", enabled: true }));
    resultValue(await app.createIntent(actor, { intentId, conversationId: topic, sourceMessageId: user,
      category: "explicit_follow_up", dueAt: new Date(start + 60000).toISOString(), timeZone: "UTC",
      processing: "local", expectedSettingsRevision: 1 }));
    gateway.now = start + 60000;
  };
  const run = () => app.runIntent(actor, intentId, new AbortController().signal);
  const counts = () => ({ model: modelRequests.length, provider: providerRequests.length, credentials });
  return { gateway, conversations, store, app, actor, lane, queued, run, counts, modelRequests, providerRequests };
}

test("F0 composition: real Store, conversation bridge, Runtime and sender produce one canonical proactive message", async () => {
  const f = fixture();
  await f.queued();
  const original = structuredClone(f.gateway.rows.get(`${conversation}/messages/${originalAssistant}`));
  const result = resultValue(await f.run());
  assert.equal(result.state, "published"); assert.equal(result.dispatchState, "accepted");
  assert.deepEqual(f.counts(), { model: 1, provider: 1, credentials: 1 });
  assert.deepEqual(f.modelRequests, [{ inputKind: "proactive_followup",
    quotedRequest: { occurredAt: new Date(start - 200000).toISOString(), text: "Synthetic saved request for a later follow-up" },
    dueAt: new Date(start + 60000).toISOString(), timeZone: "UTC" }]);
  const canonical = f.gateway.rows.get(`${conversation}/messages/${messageId}`)!;
  assert.equal(canonical.data.role, "assistant"); assert.equal(canonical.data.origin, "proactive");
  assert.equal(canonical.data.text, "Synthetic follow-up response"); assert(!Object.hasOwn(canonical.data, "replyToUserMessageId"));
  assert.deepEqual(f.gateway.rows.get(`${conversation}/messages/${originalAssistant}`), original);
  const read = await f.conversations.listOwnedMessages(principal, owner, topic, undefined, () => true);
  assert.equal(read.kind, "confirmed");
  if (read.kind !== "confirmed") return;
  assert.deepEqual(read.value.messages.map(message => message.sequence), [1, 2, 3]);
  const source = read.value.messages[2]!.sources![0]!;
  assert.equal((await f.conversations.resolveOwnedSource(principal, owner, topic, messageId, source.cardRef, () => true)).kind, "confirmed");
  assert.deepEqual(resultValue(await f.app.markRead(f.actor, topic, 0, 3)), { revision: 1, readThroughSequence: 3 });
  const provider = f.providerRequests[0]!;
  assert.equal(provider.url, "https://fcm.googleapis.com/v1/projects/synthetic-enmori-project/messages:send");
  assert(!provider.body.includes("Synthetic saved")); assert(!provider.body.includes("Synthetic follow-up"));
  const payload = JSON.parse(provider.body);
  assert.equal(payload.message.android.ttl, "0s");
  assert.equal(payload.message.android.notification.channel_id, "enmori_requested_followups");
  assert.deepEqual(Object.keys(payload.message.data), ["deliveryRef"]);
  resultValue(await f.run());
  assert.deepEqual(f.counts(), { model: 1, provider: 1, credentials: 1 });
  f.gateway.now = (start / 1000 - 100 + 90 * 86400) * 1000;
  assert.equal((await f.conversations.listOwnedMessages(principal, owner, topic, undefined, () => true)).kind, "conversation_unavailable");
});

test("lost real-Store publication ACK permits readback and dispatch of that message without another generation", async () => {
  const f = fixture(); await f.queued();
  f.gateway.loseAckOn = writes => [...writes.values()].some(row => row.state === "published" && row.dispatchState === "not_started");
  assert.equal((await f.run()).kind, "unknown");
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
  assert(f.gateway.rows.has(`${conversation}/messages/${messageId}`));
  resultValue(await f.app.recover(f.actor)); resultValue(await f.run());
  assert.deepEqual(f.counts(), { model: 1, provider: 1, credentials: 1 });
  assert.equal([...f.gateway.rows].filter(([path]) => path.startsWith(`${conversation}/messages/`)).length, 3);
  assert.equal((f.gateway.rows.get(`${base}/proactive_state/current`)!.data.rollingAttemptTimes as unknown[]).length, 1);
});

test("lost real-Store claim ACK consumes capability without a provider call, and recovery never reclaims it", async () => {
  const f = fixture(); await f.queued();
  f.gateway.loseAckOn = writes => [...writes.values()].some(row => row.dispatchState === "dispatching");
  assert.equal((await f.run()).kind, "unknown");
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 1 });
  resultValue(await f.app.recover(f.actor));
  const intent = resultValue(await f.app.intent(f.actor, intentId)); assert.equal(intent.dispatchState, "unknown");
  resultValue(await f.run());
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 1 });
});

test("current Store authority after OAuth stops source deletion, purpose revoke/regrant and expired installation", async () => {
  for (const revoke of ["source", "purpose", "installation"] as const) {
    let f!: ReturnType<typeof fixture>;
    f = fixture({ ...(revoke === "installation" ? { leaseDurationMs: 90000 } : {}), credential: async () => {
      if (revoke === "source") f.gateway.rows.delete(`${conversation}/messages/${user}`);
      if (revoke === "purpose") f.gateway.put(base, { ...f.gateway.rows.get(base)!.data, purposeRevocationGeneration: 1 });
      // Within the app's 45s operation budget, but past the registration lease.
      if (revoke === "installation") f.gateway.now = start + 90000;
    } });
    await f.queued(); assert.notEqual((await f.run()).kind, "ok");
    assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 1 });
    assert(f.gateway.rows.has(`${conversation}/messages/${messageId}`), "publication committed before the late revocation");
  }
});

test("Off with real Store and shared Runtime keeps chat blocked until physical completion and never publishes late output", async () => {
  const response = deferred<Response>(), entered = deferred<void>(); let calls = 0;
  const f = fixture({ model: async () => { calls++; if (calls === 1) { entered.resolve(); return response.promise; } return done(); } });
  await f.queued(); const pending = f.run(); await entered.promise;
  const chat = new LocalChatTransport(f.lane);
  const budget = { signal: new AbortController().signal, deadline: start + 120000, remainingMs: () => 45000 };
  const input = { strategy: "open_conversation_v1" as const, currentMessage: "Synthetic chat", history: [], checkIns: [], persona: undefined };
  await assert.rejects(chat.generate(input, budget));
  resultValue(await f.app.replaceSettings(f.actor, 1, { ...settings, mode: "off" }));
  assert.deepEqual(f.lane.state, { pending: true, outcomeUnknown: false });
  assert.deepEqual(f.app.executionState, { running: true, modelPending: true });
  assert.equal((await f.app.recover(f.actor)).kind, "unavailable");
  response.resolve(done()); assert.notEqual((await pending).kind, "ok");
  assert.deepEqual(f.lane.state, { pending: false, outcomeUnknown: false });
  assert(!f.gateway.rows.has(`${conversation}/messages/${messageId}`));
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
  await chat.generate(input, budget); assert.equal(calls, 2);
});

test("ambiguous fake provider response is persisted as unknown and cannot trigger a second send", async () => {
  const f = fixture({ providerStatus: 503 }); await f.queued();
  assert.equal(resultValue(await f.run()).dispatchState, "unknown");
  resultValue(await f.app.recover(f.actor)); resultValue(await f.run());
  assert.deepEqual(f.counts(), { model: 1, provider: 1, credentials: 1 });
});

test("timed-out generation retires its reservation only after matching physical completion, leaving a later intent usable", async () => {
  const response = deferred<Response>(), entered = deferred<void>(); let calls = 0;
  const f = fixture({ modelTimeoutMs: 10, model: async () => {
    calls++; if (calls === 1) { entered.resolve(); return response.promise; } return done();
  } });
  await f.queued();
  resultValue(await f.app.createIntent(f.actor, { intentId: id(11), conversationId: topic, sourceMessageId: user,
    category: "explicit_follow_up", dueAt: new Date(start + 120000).toISOString(), timeZone: "UTC",
    processing: "local", expectedSettingsRevision: 1 }));
  const pending = f.run(); await entered.promise;
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(f.lane.state, { pending: true, outcomeUnknown: false });
  assert.deepEqual(f.app.executionState, { running: true, modelPending: true });
  assert.equal(resultValue(await f.app.intent(f.actor, intentId)).state, "reserved");
  assert.equal(f.gateway.rows.get(`${base}/proactive_state/current`)!.data.inFlightOccurrenceId, intentId);
  assert.equal((await f.app.runIntent(f.actor, id(11), new AbortController().signal)).kind, "unavailable");
  response.resolve(done()); assert.notEqual((await pending).kind, "ok");
  assert.deepEqual(f.lane.state, { pending: false, outcomeUnknown: false });
  assert.equal(resultValue(await f.app.intent(f.actor, intentId)).state, "failed");
  assert.equal(f.gateway.rows.get(`${base}/proactive_state/current`)!.data.inFlightOccurrenceId, undefined);
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
  assert(!f.gateway.rows.has(`${conversation}/messages/${messageId}`));
  f.gateway.now = start + 120000;
  assert.equal(resultValue(await f.app.runIntent(f.actor, id(11), new AbortController().signal)).state, "published");
  assert.deepEqual(f.counts(), { model: 2, provider: 1, credentials: 1 });
});

test("external delivery abort closes only the failed reservation after physical settlement", async () => {
  const response = deferred<Response>(), entered = deferred<void>();
  const f = fixture({ model: async () => { entered.resolve(); return response.promise; } }); await f.queued();
  const signal = new AbortController(); const pending = f.app.runIntent(f.actor, intentId, signal.signal); await entered.promise;
  signal.abort();
  assert.equal(resultValue(await f.app.intent(f.actor, intentId)).state, "reserved");
  response.resolve(done()); assert.notEqual((await pending).kind, "ok");
  assert.equal(resultValue(await f.app.intent(f.actor, intentId)).state, "failed");
  assert.equal(f.gateway.rows.get(`${base}/proactive_state/current`)!.data.inFlightOccurrenceId, undefined);
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
  assert(!f.gateway.rows.has(`${conversation}/messages/${messageId}`));
});

test("post-settlement cleanup requires fresh original-owner verification, and cannot use a revoked identity", async () => {
  const response = deferred<Response>(), entered = deferred<void>();
  const f = fixture({ model: async () => { entered.resolve(); return response.promise; } }); await f.queued();
  const signal = new AbortController(); const pending = f.app.runIntent(f.actor, intentId, signal.signal); await entered.promise;
  let checks = 0;
  f.actor.verifyCurrentAuth = async () => { checks++; return { kind: "forbidden" }; };
  signal.abort(); response.resolve(done()); assert.notEqual((await pending).kind, "ok");
  assert(checks > 0, "cleanup rechecks current identity rather than bypassing authorization");
  const row = [...f.gateway.rows.values()].find(row => row.data.intentId === intentId)!;
  assert.equal(row.data.state, "reserved"); assert.equal(f.gateway.rows.get(`${base}/proactive_state/current`)!.data.inFlightOccurrenceId, intentId);
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
});

test("a lost cleanup ACK remains unknown, with no regeneration or provider attempt", async () => {
  const response = deferred<Response>(), entered = deferred<void>();
  const f = fixture({ model: async () => { entered.resolve(); return response.promise; } }); await f.queued();
  const signal = new AbortController(); const pending = f.app.runIntent(f.actor, intentId, signal.signal); await entered.promise;
  f.gateway.loseAckOn = writes => [...writes.values()].some(row => row.state === "failed");
  signal.abort(); response.resolve(done()); assert.equal((await pending).kind, "unknown");
  assert.equal(resultValue(await f.app.intent(f.actor, intentId)).state, "failed");
  assert.equal(f.gateway.rows.get(`${base}/proactive_state/current`)!.data.inFlightOccurrenceId, undefined);
  assert.deepEqual(f.counts(), { model: 1, provider: 0, credentials: 0 });
  assert(!f.gateway.rows.has(`${conversation}/messages/${messageId}`));
});
