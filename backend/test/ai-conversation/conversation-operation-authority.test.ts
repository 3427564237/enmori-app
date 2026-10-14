import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FirebaseAdminConversationOperationAuthority } from "../../src/ai-conversation/infrastructure/firebase-admin-conversation-operation-authority.js";
import { buildControlledEmulatorTestEnvironment } from "../../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import type { ConversationCaller } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";
import { deferred } from "../ai-runtime/support.js";

const environment = buildControlledEmulatorTestEnvironment({ GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }, "synthetic-authority-profile");
const ownerId = "0c97d3c8-44ad-4bb4-b2bf-941792db9b54", uid = "synthetic-owner";
const account = { username: "synthetic_owner", optionalProcessingConsent: "accepted", checkInVisibility: "private",
  onboardingCompletedAt: "2026-10-14T00:00:00.000Z" };
function fixture() {
  const abort = new AbortController();
  const records = new Map<string, Record<string, unknown>>([
    [`auth_bindings/${createAuthBindingDocumentId(uid)!}`, { accountId: ownerId }], [`accounts/${ownerId}`, { ...account }],
  ]);
  const reads: string[] = [];
  let now = 0, live = true;
  let verified: () => Promise<IdentityVerificationResult> = async () => ({ kind: "verified", principal: { firebaseUid: uid } });
  let beforeRead: (() => Promise<void>) | undefined;
  const fake = { projectId: "demo-enmori-rmvp01a-r10", _settings: { servicePath: "127.0.0.1", port: 8080, ssl: false },
    doc: (path: string) => ({ path }),
    runTransaction: async <T>(work: (tx: Transaction) => Promise<T>, options: unknown) => {
      assert.deepEqual(options, { readOnly: true });
      return work({ get: async (ref: { path: string }) => {
        reads.push(ref.path); await beforeRead?.();
        return { exists: records.has(ref.path), data: () => records.get(ref.path) };
      } } as unknown as Transaction);
    },
  } as unknown as Firestore;
  const authority = new FirebaseAdminConversationOperationAuthority(fake, environment, () => now);
  const caller: ConversationCaller = { principal: { firebaseUid: uid }, tokenInstance: "synthetic-digest", verifyCurrentAuth: () => verified() };
  const control = { signal: abort.signal, deadline: 15_000, current: () => live };
  return { authority, caller, control, abort, records, reads, fake,
    setAuth: (value: typeof verified) => { verified = value; }, setRead: (value: typeof beforeRead) => { beforeRead = value; },
    expire: () => { now = 15_000; }, abandon: () => { live = false; } };
}
test("ordinary authority resolves only minimal trusted binding and completed owner, without content reads", async () => {
  const f = fixture();
  assert.deepEqual(await f.authority.resolve(f.caller, true, f.control), { kind: "success", value: { ownerId } });
  assert.deepEqual(f.reads, [`auth_bindings/${createAuthBindingDocumentId(uid)!}`, `accounts/${ownerId}`]);
});
test("current rejected purpose blocks execution preparation while ordinary owner reads remain available", async () => {
  const f = fixture(); f.records.set(`accounts/${ownerId}`, { ...account, optionalProcessingConsent: "rejected" });
  assert.deepEqual(await f.authority.resolve(f.caller, true, f.control), { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" });
  assert.deepEqual(await f.authority.resolve(f.caller, false, f.control), { kind: "success", value: { ownerId } });
});
test("fresh invalid, forbidden, unavailable and changed-principal checks fail before Firestore I/O", async () => {
  for (const [result, code] of [
    [{ kind: "invalid" }, "AUTH_REQUIRED"], [{ kind: "forbidden" }, "AUTH_FORBIDDEN"],
    [{ kind: "dependency_unavailable" }, "AI_UNAVAILABLE"],
    [{ kind: "verified", principal: { firebaseUid: "different-synthetic-owner" } }, "AUTH_FORBIDDEN"],
  ] as const) {
    const f = fixture(); f.setAuth(async () => result);
    assert.deepEqual(await f.authority.resolve(f.caller, true, f.control), { kind: "failure", code });
    assert.equal(f.reads.length, 0);
  }
});
test("unbound identity has onboarding failure, corrupt or missing bound account stays unavailable", async () => {
  const unbound = fixture(); unbound.records.clear();
  assert.deepEqual(await unbound.authority.resolve(unbound.caller, true, unbound.control), { kind: "failure", code: "ONBOARDING_REQUIRED" });
  for (const missing of [true, false]) {
    const f = fixture();
    if (missing) f.records.delete(`accounts/${ownerId}`); else f.records.set(`accounts/${ownerId}`, { ...account, username: "Invalid Name" });
    assert.deepEqual(await f.authority.resolve(f.caller, false, f.control), { kind: "failure", code: "AI_UNAVAILABLE" });
  }
});
test("actual SDK settings mismatch is refused despite matching environment assertion", () => {
  const f = fixture();
  const wrong = { ...f.fake, _settings: { servicePath: "cloud.invalid", port: 443, ssl: true } } as unknown as Firestore;
  assert.throws(() => new FirebaseAdminConversationOperationAuthority(wrong, environment, () => 0));
});
test("abort during pending fresh Auth issues no later binding/content read", async () => {
  const f = fixture(), auth = deferred<IdentityVerificationResult>(); f.setAuth(() => auth.promise);
  const result = f.authority.resolve(f.caller, true, f.control);
  f.abort.abort(); auth.resolve({ kind: "verified", principal: { firebaseUid: uid } });
  assert.deepEqual(await result, { kind: "terminated" }); assert.equal(f.reads.length, 0);
});
test("abandonment or original deadline during SDK binding read issues no subsequent account read", async () => {
  for (const kind of ["abort", "expiry", "abandon"] as const) {
    const f = fixture(), pause = deferred<void>(), entered = deferred<void>();
    f.setRead(() => { entered.resolve(); return pause.promise; });
    const result = f.authority.resolve(f.caller, true, f.control); await entered.promise;
    if (kind === "abort") f.abort.abort(); else if (kind === "expiry") f.expire(); else f.abandon();
    pause.resolve(); assert.deepEqual(await result, { kind: "terminated" }); assert.equal(f.reads.length, 1);
  }
});
test("SDK failures map to safe unavailable without exposing vendor errors", async () => {
  const f = fixture(); f.setRead(async () => { throw new Error("synthetic vendor-private detail"); });
  assert.deepEqual(await f.authority.resolve(f.caller, true, f.control), { kind: "failure", code: "AI_UNAVAILABLE" });
});
