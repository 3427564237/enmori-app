import assert from "node:assert/strict";
import test from "node:test";
import { FirestoreConversationStore } from "../../src/ai-conversation/infrastructure/firestore-conversation-store.js";
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentSnapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { OriginalWriteAuthority, OpenOperation } from "../../src/ai-conversation/ports/real-conversation-store.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";

const profile = "synthetic-empty-profile";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  APPDATA: profile, HOME: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), conversation = id(2), user = id(3), assistant = id(4), operation = id(5);
const principal = { firebaseUid: "synthetic-pair-owner" };
const root = `accounts/${owner}/conversations/${conversation}`;
const accountPath = `accounts/${owner}`;
const op: OpenOperation = { ownerAccountId: owner, conversationId: conversation, userMessageId: user,
  operationId: operation, kind: "send", targetKind: "reserved_new", epoch: { processEpoch: id(6), generation: 1 }, revision: 1 };
const cutoff = { seconds: 99 + 90 * 24 * 60 * 60, nanoseconds: 0 };
const sources = ["synthetic-first", "synthetic-second"].map(sourceId => ({ sourceType: "check_in" as const, sourceId }));
type Method = "listOwnedMessages" | "readAcknowledgedPair" | "settleAcknowledgedAssistant" | "readOwnedOutcome";
const methods: readonly Method[] = ["listOwnedMessages", "readAcknowledgedPair", "settleAcknowledgedAssistant", "readOwnedOutcome"];

// This handwritten gateway records dispatch separately from settlement. A
// terminal result alone cannot satisfy the no-new-read/no-effect assertions.
function fixture(method: Method, cancelAt?: number) {
  let live = true, writes = 0;
  const reads: { label: string; afterTerminal: boolean }[] = [];
  const rows: StoredDocumentSnapshot[] = [
    { id: user, createTime: { seconds: 99, nanoseconds: 0 }, data: { role: "user", sequence: 1, text: "Synthetic U",
      acceptedAssistantMessageId: assistant, ...(method === "settleAcknowledgedAssistant" ? { pendingOperationId: operation } : {}) } },
    { id: assistant, createTime: { seconds: 100, nanoseconds: 0 }, data: { role: "assistant", sequence: 2, text: "Synthetic A",
      availability: "available", replyToUserMessageId: user, presentationMode: "default", appendBefore: cutoff } },
  ];
  const records: Record<string, StoredDocument> = {
    [`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)!}`]: { accountId: owner },
    [accountPath]: { username: "synthetic_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
      onboardingCompletedAt: "2026-10-16T00:00:00.000Z", purposeRevocationGeneration: 1 },
    [root]: { state: "live", lifecycleVersion: 1, nextSequence: 3, latestMessageId: assistant },
    [`${root}/message_sources/${assistant}`]: { sources, purposeRevocationGeneration: 1 },
    [`${root}/effects/${operation}`]: { kind: "send", userMessageId: user, assistantMessageId: assistant },
    "ai_runtime_fence/current": { ...op.epoch, cleanupGeneration: 0 },
    [`ai_operation_fences/${operation}`]: { ownerAccountId: owner, conversationId: conversation, userMessageId: user,
      kind: "send", targetKind: "reserved_new", processEpoch: op.epoch.processEpoch, revision: 1,
      state: method === "readOwnedOutcome" ? "closed" : "open" },
  };
  async function read<T>(label: string, value: T): Promise<T> {
    const index = reads.length;
    reads.push({ label, afterTerminal: !live });
    await Promise.resolve();
    if (index === cancelAt) live = false;
    return structuredClone(value);
  }
  const write = () => { writes++; };
  const tx: FirestoreTransactionGateway = {
    get: path => read(`get:${path}`, records[path]), list: path => read(`list:${path}`, []),
    listSnapshots: path => read(`inventory:${path}`, rows),
    listMessagePage: path => read(`page:${path}`, [...rows].reverse()),
    getSnapshot: path => read(`source:${path}`, { id: path.split("/").at(-1)!, createTime: { seconds: 98, nanoseconds: 0 },
      updateTime: { seconds: 100, nanoseconds: 0 }, data: { ownerAccountId: owner, note: "Synthetic source",
        createdAt: "2026-10-16T00:00:00.000Z", checkInVisibility: "private" } }),
    create: write, set: write, delete: write,
  };
  const gateway: FirestoreGateway = { runTransaction: async work => work(tx) };
  const store = new FirestoreConversationStore(gateway, environment, () => 100_000, { gateway,
    sourceReferences: ["this explicit immutable fixture"], completeCanonicalUtcInventory: true,
    immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true });
  const authority: OriginalWriteAuthority = { principal, current: () => live,
    verifyCurrentAuth: async () => ({ kind: "verified", principal }),
    dependencies: { ownerId: owner, purpose: "checkin_conversation", purposeRevocationGeneration: 1, usedPersonaId: undefined,
      sources: sources.map(s => ({ ...s, observedVersion: { seconds: 100, nanoseconds: 0 } })) } };
  const run = () => {
    switch (method) {
      case "listOwnedMessages": return store.listOwnedMessages(principal, owner, conversation, undefined, () => live);
      case "readAcknowledgedPair": return store.readAcknowledgedPair(op, authority);
      case "settleAcknowledgedAssistant": return store.settleAcknowledgedAssistant(op, authority);
      case "readOwnedOutcome": return store.readOwnedOutcome(principal, owner, conversation, operation, op, () => live);
    }
  };
  return { run, reads, writes: () => writes };
}

for (const method of methods) {
  test(`${method}: live public path retains the sourced canonical pair`, async () => {
    const f = fixture(method), result = await f.run();
    assert.equal(result.kind, "confirmed");
    assert.equal(f.reads.filter(r => r.label.startsWith("source:")).length,
      method === "readAcknowledgedPair" || method === "settleAcknowledgedAssistant" ? 4 : 2);
    assert.equal(f.writes(), method === "settleAcknowledgedAssistant" ? 1 : 0);
    if (method !== "settleAcknowledgedAssistant") assert.match(JSON.stringify(result), /Synthetic A/);
  });
  for (const boundary of ["pair Account", "pair first Note"] as const) {
    test(`${method}: cancellation during ${boundary} prevents further source dispatch and effects`, async () => {
      const baseline = fixture(method); assert.equal((await baseline.run()).kind, "confirmed");
      const accountIndex = baseline.reads.findLastIndex(r => r.label === `get:${accountPath}`);
      const index = boundary === "pair Account" ? accountIndex
        : baseline.reads.findIndex((r, i) => i > accountIndex && r.label.startsWith("source:"));
      assert(index >= 0);
      const f = fixture(method, index), result = await f.run();
      assert.deepEqual(result, { kind: "terminated" });
      assert.deepEqual(f.reads.filter(r => r.afterTerminal), [], "a new read dispatched after terminal");
      assert.equal(f.reads.length, index + 1); assert.equal(f.writes(), 0);
    });
  }
  test(`${method}: every preceding awaited read also stops its next dispatch`, async () => {
    const baseline = fixture(method); assert.equal((await baseline.run()).kind, "confirmed");
    for (let index = 0; index < baseline.reads.length; index++) {
      const f = fixture(method, index), result = await f.run();
      assert.deepEqual(result, { kind: "terminated" }, baseline.reads[index]!.label);
      assert.deepEqual(f.reads.filter(r => r.afterTerminal), [], baseline.reads[index]!.label);
      assert.equal(f.reads.length, index + 1); assert.equal(f.writes(), 0);
    }
  });
}
