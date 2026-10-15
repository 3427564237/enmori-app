import assert from "node:assert/strict";
import test from "node:test";
import { inspectNoteSources, inspectProvenance, parseProvenance, validDependencies, type TransactionalNotePrerequisites } from "../../src/ai-conversation/infrastructure/transactional-note-sources.js";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocumentSnapshot } from "../../src/shared/infrastructure/firebase/firestore-gateway.js";
import type { ContextDependencies } from "../../src/ai-conversation/ports/real-context-reader.js";
const gateway: FirestoreGateway = { runTransaction: async () => { throw new Error("not dispatched by pure fixture"); } };
const proof: TransactionalNotePrerequisites = { gateway, sourceReferences: ["explicit immutable synthetic fixture"],
  completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true };
const pair = { sourceType: "check_in" as const, sourceId: "synthetic-note" };
const deps: ContextDependencies = { ownerId: "owner", purpose: "checkin_conversation", purposeRevocationGeneration: 1,
  usedPersonaId: undefined, sources: [{ ...pair, observedVersion: { seconds: 100, nanoseconds: 123000 } }] };
const row: StoredDocumentSnapshot = { id: pair.sourceId, data: { ownerAccountId: "owner", note: "Synthetic note", createdAt: "2026-10-16T00:00:00.000Z", checkInVisibility: "private" },
  createTime: { seconds: 99, nanoseconds: 0 }, updateTime: { seconds: 100, nanoseconds: 123000 } };
function fixture(value: StoredDocumentSnapshot | undefined = row, generation: unknown = 1, consent = "accepted") {
  let reads = 0;
  const tx: Tx = { get: async () => ({ username: "synthetic_owner", onboardingCompletedAt: "2026-10-16T00:00:00.000Z",
    checkInVisibility: "private", optionalProcessingConsent: consent, purposeRevocationGeneration: generation }),
    getSnapshot: async () => { reads++; return value; }, list: async () => [], create: () => assert.fail(), set: () => assert.fail() };
  return { tx, reads: () => reads };
}
test("provenance is exactly empty or bounded unique pairs plus a legal generation; no versions/content survive", () => {
  assert.deepEqual(parseProvenance({ sources: [] }), { sources: [] });
  assert.deepEqual(parseProvenance({ sources: [pair], purposeRevocationGeneration: 1 }), { sources: [pair], purposeRevocationGeneration: 1 });
  for (const value of [undefined, {}, { sources: [], purposeRevocationGeneration: 0 }, { sources: [pair] },
    { sources: [pair, pair], purposeRevocationGeneration: 1 }, { sources: [null], purposeRevocationGeneration: 1 },
    { sources: [{ ...pair, observedVersion: row.updateTime }], purposeRevocationGeneration: 1 },
    { sources: [{ ...pair, sourceId: "../escape" }], purposeRevocationGeneration: 1 },
    { sources: [pair], purposeRevocationGeneration: -1 }, { sources: [pair], purposeRevocationGeneration: 1, text: "forbidden" }]) assert.equal(parseProvenance(value), undefined);
  assert(validDependencies(deps));
  for (const sources of [[null], [deps.sources[0], deps.sources[0]], [{ ...pair, observedVersion: { seconds: 1, nanoseconds: 1e9 } }]])
    assert.equal(validDependencies({ ...deps, sources } as ContextDependencies), false);
});
test("missing or mismatched producer facts refuse nonempty before source reads; empty remains independent", async () => {
  for (const p of [undefined, { ...proof, gateway: { ...gateway } }, { ...proof, sourceReferences: [] }]) {
    const f = fixture(); assert.equal(await inspectNoteSources(f.tx, gateway, p, "owner", [pair], deps), "unavailable"); assert.equal(f.reads(), 0);
  }
  const f = fixture(); assert.equal(await inspectNoteSources(f.tx, gateway, undefined, "owner", []), "valid"); assert.equal(f.reads(), 0);
});
test("current transaction accepts source identity and later visibility metadata; rejects rollback, owner/time/data corruption", async () => {
  for (const valid of [row, { ...row, data: { ...row.data, checkInVisibility: "public" }, updateTime: { seconds: 101, nanoseconds: 0 } }])
    assert.equal(await inspectNoteSources(fixture(valid).tx, gateway, proof, "owner", [pair], deps), "valid");
  for (const invalid of [{ ...row, updateTime: undefined }, { ...row, updateTime: { seconds: 100, nanoseconds: 122999 } },
    { ...row, data: { ...row.data, ownerAccountId: "other" } }, { ...row, data: { ...row.data, createdAt: "2026-10-16T00:00:00Z" } },
    { ...row, data: { ...row.data, note: " invalid " } }])
    assert.equal(await inspectNoteSources(fixture(invalid as StoredDocumentSnapshot).tx, gateway, proof, "owner", [pair], deps), "unavailable");
});
test("one proven permanently missing required source invalidates all provenance without depending on companion reads", async () => {
  const f = fixture(); f.tx.getSnapshot = async () => undefined;
  assert.equal(await inspectNoteSources(f.tx, gateway, proof, "owner", [pair], deps), "invalid");
  let calls = 0; f.tx.getSnapshot = async () => ++calls === 1 ? undefined : { ...row, data: {} };
  assert.equal(await inspectNoteSources(f.tx, gateway, proof, "owner", [pair, { ...pair, sourceId: "other" }]), "invalid");
  assert.equal(calls, 1);
});
test("offline revoke/regrant invalidates stored sourced reply independently; rollback/missing/equal rejected is not erasure proof", async () => {
  const provenance = { sources: [pair], purposeRevocationGeneration: 1 };
  assert.equal(await inspectProvenance(fixture(row, 2).tx, gateway, undefined, "owner", provenance), "invalid");
  for (const f of [fixture(row, 0), fixture(row, -1), fixture(row, "bad"), fixture(row, 1, "rejected")])
    assert.equal(await inspectProvenance(f.tx, gateway, proof, "owner", provenance), "unavailable");
  assert.equal(await inspectProvenance(fixture().tx, gateway, proof, "owner", provenance), "valid");
  assert.equal(await inspectProvenance(fixture(row, 1, "rejected").tx, gateway, undefined, "owner", { sources: [] }), "valid");
});
test("terminal original after a source await prevents reading a second source", async () => {
  const f = fixture(); let live = true, reads = 0;
  f.tx.getSnapshot = async () => { reads++; live = false; return row; };
  await assert.rejects(inspectNoteSources(f.tx, gateway, proof, "owner", [pair, { ...pair, sourceId: "second" }], undefined,
    () => { if (!live) throw new Error("original terminated"); }), /original terminated/);
  assert.equal(reads, 1);
});
