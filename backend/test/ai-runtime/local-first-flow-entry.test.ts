import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import type { UserRecord } from "firebase-admin/auth";
import { parseLocalFirstFlowConfiguration } from "../../src/bootstrap/retained-core-runtime.js";
import { createFirstFlowComposition } from "../../src/bootstrap/first-flow-composition.js";
import { LocalModelLane } from "../../src/ai-runtime/infrastructure/local-model-lane.js";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { FirstFlowResult, ProactiveActor } from "../../src/proactive/ports/first-flow.js";
import { MetadataFirestoreGateway } from "../support/metadata-firestore-gateway.js";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), topic = id(2), user = id(3), assistant = id(4), intent = id(5);
const principal = { firebaseUid: "synthetic-entry-owner" };
const identity = { ownerAccountId: owner, firebaseUid: principal.firebaseUid };
const start = Date.UTC(2026, 9, 25, 10);

test('explicit service worker and fixed renewable registration lease survive real-entry parsing', () => {
  const input = {...identity, worker: {mode: 'service', intervalMs: 60000},
    push: {installationRef: id(9), leaseDurationMs: 30 * 86400000}};
  const parsed = parseLocalFirstFlowConfiguration(input, start)!;
  assert.deepEqual(parsed, input);
  assert(Object.isFrozen(parsed.worker) && Object.isFrozen(parsed.push));
  for (const value of [
    {...input, worker: {mode: 'service', endsAtMs: start + 60000}},
    {...input, worker: {mode: 'unknown'}},
    {...input, worker: undefined},
    {...input, push: {...input.push, installationRef: 'wrong'}},
    {...input, push: {...input.push, leaseDurationMs: 30 * 86400000 + 1}},
    {...input, push: {...input.push, leaseExpiresAt: new Date(start + 60000).toISOString()}},
  ]) assert.throws(() => parseLocalFirstFlowConfiguration(value, start));
});

test("private configuration defaults off and copies only the approved local projection", () => {
  assert.equal(parseLocalFirstFlowConfiguration(undefined, start), undefined);
  assert.deepEqual(parseLocalFirstFlowConfiguration(identity, start), identity);
  const input = { ...identity, worker: { endsAtMs: start + 30 * 60000, intervalMs: 60000 } };
  const parsed = parseLocalFirstFlowConfiguration(input, start)!;
  input.firebaseUid = "changed"; input.worker.endsAtMs = 0;
  assert.equal(parsed.firebaseUid, principal.firebaseUid);
  assert.equal(parsed.worker!.endsAtMs, start + 30 * 60000);
  assert(Object.isFrozen(parsed) && Object.isFrozen(parsed.worker));
  assert.equal(parsed.push, undefined);
});

test("invalid identity, inherited/configuration extras and any push fail without a credential fallback", () => {
  for (const value of [null, false, [], {}, { ...identity, ownerAccountId: "other" },
    { ...identity, firebaseUid: "" }, { ...identity, firebaseUid: "bad\nuid" },
    { ...identity, firebaseUid: "x".repeat(129) }, Object.create(identity),
    { ...identity, push: {} }, { ...identity, model: "other" }, { ...identity, enabled: true },
    { ...identity, worker: undefined }]) {
    assert.throws(() => parseLocalFirstFlowConfiguration(value, start), /^Error: Invalid local first-flow configuration$/);
  }
});

test("worker uses an absolute nonrenewable window and rejects invalid timers", () => {
  for (const worker of [null, {}, { endsAtMs: start }, { endsAtMs: start - 1 },
    { endsAtMs: start + 30 * 60000 + 1 }, { endsAtMs: "later" },
    { endsAtMs: start + 60000, intervalMs: 999 }, { endsAtMs: start + 60000, intervalMs: 2_147_483_648 },
    { endsAtMs: start + 60000, intervalMs: NaN }, { endsAtMs: start + 60000, intervalMs: undefined },
    { endsAtMs: start + 60000, repeat: true }]) {
    assert.throws(() => parseLocalFirstFlowConfiguration({ ...identity, worker }, start));
  }
  assert.deepEqual(parseLocalFirstFlowConfiguration({ ...identity, worker: { endsAtMs: start + 60000 } }, start)?.worker,
    { endsAtMs: start + 60000 });
});

const profile = "synthetic-local-entry-profile";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  APPDATA: profile, HOME: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
function value<T>(result: FirstFlowResult<T>): T {
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") throw Error("Expected confirmed fake result");
  return result.value;
}
function fixture() {
  const gateway = new MetadataFirestoreGateway(start);
  const base = `accounts/${owner}`, conversation = `${base}/conversations/${topic}`;
  gateway.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`, { accountId: owner });
  gateway.put(base, { username: "entry_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
    onboardingCompletedAt: new Date(start).toISOString(), purposeRevocationGeneration: 0 });
  gateway.put(`${base}/persona_state/current`, { stateRevision: 0, livePersonaIds: [] });
  gateway.put(`${conversation}/messages/${user}`, { role: "user", sequence: 1,
    text: "Synthetic saved request: ask about my rest later", acceptedAssistantMessageId: assistant }, start - 200000);
  gateway.put(`${conversation}/messages/${assistant}`, { role: "assistant", sequence: 2, text: "Synthetic prior reply",
    replyToUserMessageId: user, availability: "available", presentationMode: "default",
    appendBefore: { seconds: start / 1000 - 200 + 90 * 86400, nanoseconds: 0 } }, start - 100000);
  gateway.put(`${conversation}/message_sources/${assistant}`, { sources: [] });
  gateway.put(conversation, { state: "live", lifecycleVersion: 1, nextSequence: 3, latestMessageId: assistant });
  let calls = 0, authCalls = 0;
  const lane = new LocalModelLane("qwen3.5:9b", async () => {
    calls++;
    return Response.json({ model: "qwen3.5:9b", done: true,
      message: { content: JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message: "Synthetic follow-up question" }) } });
  });
  const store = new FirestoreConversationStore(gateway, environment, () => gateway.now);
  const composition = createFirstFlowComposition({ environment,
    configuration: parseLocalFirstFlowConfiguration({ ...identity, worker: { endsAtMs: start + 300000 } }, start)!,
    conversation: { gateway, store }, lane, nowMs: () => gateway.now, healthy: () => true,
    auth: { getUser: async uid => { authCalls++; assert.equal(uid, principal.firebaseUid); return { uid, disabled: false } as UserRecord; } },
  });
  const actor: ProactiveActor = { principal, current: () => true, verifyCurrentAuth: async () => ({ kind: "verified", principal }) };
  async function queued() {
    value(await composition.application.replaceSettings(actor, 0, { mode: "on", categories: ["explicit_follow_up"],
      timeZone: "UTC", quiet: { kind: "window", startMinute: 1320, endMinute: 480 }, maximumInRolling24h: 1,
      cooldownMinutes: 480, pushEnabled: false, preview: "generic" }));
    value(await composition.application.createIntent(actor, { intentId: intent, conversationId: topic, sourceMessageId: user,
      category: "explicit_follow_up", dueAt: new Date(start + 60000).toISOString(), timeZone: "UTC", processing: "local", expectedSettingsRevision: 1 }));
    gateway.now = start + 60000;
  }
  async function cycle() { composition.start(); await setImmediate(); await composition.stop(); }
  return { composition, gateway, base, conversation, actor, queued, cycle, counts: () => ({ model: calls, auth: authCalls }) };
}

test("configured worker starts the real due cycle but user settings remain off with zero model/writes", async () => {
  const f = fixture();
  await f.cycle();
  assert(f.counts().auth > 0);
  assert.equal(f.counts().model, 0);
  assert.equal(f.gateway.writes, 0);
  assert(!f.gateway.rows.has(`${f.base}/proactive_state/current`));
});

test("actual factory worker publishes one due authorized reply locally with no registration or push", async () => {
  const f = fixture(); await f.queued(); await f.cycle();
  assert.equal(f.counts().model, 1);
  const row = value(await f.composition.application.intent(f.actor, intent));
  assert.equal(row.state, "published"); assert.equal(row.dispatchState, "skipped");
  const message = f.gateway.rows.get(`${f.conversation}/messages/${row.messageId}`)!;
  assert.equal(message.data.origin, "proactive"); assert.equal(message.data.role, "assistant");
  assert(!f.gateway.rows.has(`${f.base}/proactive_registration/current`));
  assert.equal(f.gateway.rows.get(`${f.base}/proactive_state/current`)!.data.pushEnabled, false);
});

test("factory worker rechecks consent, fixed-owner binding and source existence before model dispatch", async () => {
  for (const change of ["consent", "binding", "source"] as const) {
    const f = fixture(); await f.queued();
    if (change === "consent") f.gateway.put(f.base, { ...f.gateway.rows.get(f.base)!.data, optionalProcessingConsent: "rejected", purposeRevocationGeneration: 1 });
    if (change === "binding") f.gateway.put(`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`, { accountId: id(9) });
    if (change === "source") f.gateway.rows.delete(`${f.conversation}/messages/${user}`);
    await f.cycle();
    assert.equal(f.counts().model, 0, change);
    assert.equal(f.gateway.rows.get(`${f.base}/proactive_occurrences/${intent}`)!.data.state, "queued");
  }
});
