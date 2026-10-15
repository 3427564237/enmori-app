import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore, type Transaction } from "firebase-admin/firestore";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseAdminConversationOperationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-conversation-operation-authority.js";
import type { ConversationCaller } from "../src/ai-conversation/ports/conversation-operations.js";

// Isolated existing locked launcher only. Synthetic own Auth/binding/account;
// never a Note producer declaration, whole service journey or new composition.
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
const app = initializeApp({ projectId: environment.projectId }, `zhou-ordinary-authority-${process.pid}`);
const db = getFirestore(app), auth = getAuth(app), verifier = new FirebaseIdentityVerifier(auth);
after(async () => { await db.terminate(); await deleteApp(app); });

class Fixture {
  readonly ownerId = randomUUID();
  readonly uid = `ordinary_${randomUUID().replaceAll("-", "")}`;
  readonly account = `accounts/${this.ownerId}`;
  readonly binding = `auth_bindings/${createAuthBindingDocumentId(this.uid)!}`;
  readonly abort = new AbortController();
  readonly control = { signal: this.abort.signal, deadline: performance.now() + 15_000, current: () => !this.abort.signal.aborted };
  token = "";
  created = false;
  caller(): ConversationCaller {
    return { principal: { firebaseUid: this.uid }, tokenInstance: "synthetic-runtime-digest",
      verifyCurrentAuth: () => verifier.verifyIdToken(this.token) };
  }
  authority(firestore = db): FirebaseAdminConversationOperationAuthority {
    return new FirebaseAdminConversationOperationAuthority(firestore, process.env, () => performance.now());
  }
  async init(bound = true): Promise<void> {
    const email = `${this.uid}@example.invalid`, password = `${randomUUID()}Aa1!`;
    await auth.createUser({ uid: this.uid, email, password }); this.created = true;
    const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    assert.equal(response.ok, true, "synthetic sign-in succeeds");
    const value = await response.json() as { idToken?: unknown }; assert.equal(typeof value.idToken, "string");
    this.token = value.idToken as string;
    if (bound) {
      const batch = db.batch(); batch.create(db.doc(this.binding), { accountId: this.ownerId });
      batch.create(db.doc(this.account), { username: `ord_${this.ownerId.replaceAll("-", "").slice(-20)}`,
        optionalProcessingConsent: "accepted", checkInVisibility: "private", onboardingCompletedAt: new Date().toISOString() });
      await batch.commit();
    }
  }
  async close(): Promise<void> {
    this.abort.abort(); this.token = "";
    const batch = db.batch(); batch.delete(db.doc(this.account)); batch.delete(db.doc(this.binding)); await batch.commit();
    if (this.created) await auth.deleteUser(this.uid);
    assert.equal((await db.doc(this.account).get()).exists, false, "own synthetic account removed");
    assert.equal((await db.doc(this.binding).get()).exists, false, "own synthetic binding removed");
  }
}
test("actual fresh Auth and SDK owner resolution separates current purpose from ordinary owner actions", async () => {
  const f = new Fixture(); try {
    await f.init(); const authority = f.authority();
    assert.deepEqual(await authority.resolve(f.caller(), true, f.control), { kind: "success", value: { ownerId: f.ownerId } });
    await db.doc(f.account).update({ optionalProcessingConsent: "rejected" });
    assert.deepEqual(await authority.resolve(f.caller(), true, f.control), { kind: "failure", code: "AI_CONTEXT_NOT_PERMITTED" });
    assert.deepEqual(await authority.resolve(f.caller(), false, f.control), { kind: "success", value: { ownerId: f.ownerId } });
  } finally { await f.close(); }
});
test("actual unbound and corrupted completed-account inventory fail closed", async () => {
  const unbound = new Fixture(); try {
    await unbound.init(false);
    assert.deepEqual(await unbound.authority().resolve(unbound.caller(), true, unbound.control), { kind: "failure", code: "ONBOARDING_REQUIRED" });
  } finally { await unbound.close(); }
  const corrupt = new Fixture(); try {
    await corrupt.init(); await db.doc(corrupt.account).update({ username: "Invalid Name" });
    assert.deepEqual(await corrupt.authority().resolve(corrupt.caller(), false, corrupt.control), { kind: "failure", code: "AI_UNAVAILABLE" });
  } finally { await corrupt.close(); }
});
test("actual disabled-user fresh Auth is refused without granting completed-owner authority", async () => {
  const f = new Fixture(); try {
    await f.init(); await auth.updateUser(f.uid, { disabled: true });
    assert.deepEqual(await f.authority().resolve(f.caller(), false, f.control), { kind: "failure", code: "AUTH_FORBIDDEN" });
  } finally { await f.close(); }
});
test("abort while actual binding I/O settles prevents subsequent account read or authority success", async () => {
  const f = new Fixture(); let release!: () => void, entered!: () => void;
  const pause = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  let reads = 0;
  const observed = new Proxy(db, { get(target, property) {
    if (property === "runTransaction") return <T>(work: (tx: Transaction) => Promise<T>, options: object) =>
      target.runTransaction(tx => work(new Proxy(tx, { get(transaction, member) {
        if (member === "get") return async (ref: Parameters<Transaction["get"]>[0]) => {
          const snapshot = await Reflect.apply(transaction.get, transaction, [ref]); reads++; entered(); await pause; return snapshot;
        };
        const value: unknown = Reflect.get(transaction, member, transaction);
        return typeof value === "function" ? value.bind(transaction) : value;
      } })), options);
    const value: unknown = Reflect.get(target, property, target); return typeof value === "function" ? value.bind(target) : value;
  } }) as Firestore;
  try {
    await f.init(); const result = f.authority(observed).resolve(f.caller(), true, f.control);
    await started; f.abort.abort(); release();
    assert.deepEqual(await result, { kind: "terminated" }); assert.equal(reads, 1);
  } finally { release(); await f.close(); }
});
