import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type Firestore, type ReadOnlyTransactionOptions, type Transaction } from "firebase-admin/firestore";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminAsyncConversationAuthority } from "../src/ai-conversation/infrastructure/firebase-admin-async-conversation-authority.js";
import { FirebaseAdminRealContextReader, type SourceBoundNotePrerequisites } from "../src/ai-conversation/infrastructure/firebase-admin-real-context-reader.js";
import { PreparedRealContextReader } from "../src/ai-conversation/application/real-context-reader.js";
import type { AcceptedContextRead, ContextDependencies, FixedStartReadView } from "../src/ai-conversation/ports/real-context-reader.js";
import type { AsyncConversationIdentity, AsyncOperation } from "../src/ai-conversation/ports/async-conversation.js";

// Existing guarded launcher only. No reset, cloud access, index/dependency change,
// persisted prompt, source restoration/reuse, or operational DU guarantee is added.
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
const app = initializeApp({ projectId: environment.projectId }, `ai-context-reader-${process.pid}`);
const firestore = getFirestore(app), auth = getAuth(app), verifier = new FirebaseIdentityVerifier(auth);
after(async () => { await firestore.terminate(); await deleteApp(app); });

class ObservedSdk {
  readonly db: Firestore;
  readonly reads: string[] = [];
  readonly options: (ReadOnlyTransactionOptions | undefined)[] = [];
  readonly pending = new Set<Promise<unknown>>();
  constructor() {
    this.db = new Proxy(firestore, { get: (target, property) => {
      if (property === "runTransaction") return <T>(work: (tx: Transaction) => Promise<T>, options?: ReadOnlyTransactionOptions) => {
        this.options.push(options);
        const completion = target.runTransaction(tx => work(new Proxy(tx, { get: (transaction, member) => {
          if (member === "get") return (reference: { readonly path?: string }) => {
            this.reads.push(typeof (reference as { readonly where?: unknown }).where === "function" ? "note-query" : reference.path ?? "unknown-read");
            return Reflect.apply(transaction.get, transaction, [reference]);
          };
          const value = Reflect.get(transaction, member, transaction) as unknown;
          return typeof value === "function" ? value.bind(transaction) : value;
        } })), options);
        this.pending.add(completion);
        void completion.then(() => this.pending.delete(completion), () => this.pending.delete(completion));
        return completion;
      };
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    } });
  }
  async settled(): Promise<void> { await Promise.allSettled([...this.pending]); }
}
const personaId = "a".repeat(64), otherPersonaId = "b".repeat(64);
const operation: AsyncOperation = { operationId: "synthetic-op", conversationId: "synthetic-conversation",
  userMessageId: "synthetic-user-message", kind: "send", targetKind: "reserved_new" };
const validPersona = (instant: string, tone = "warm", revision = 1) => ({ displayName: "Synthetic private display",
  tone, responseLength: "balanced", formatStyle: "plain", createdAt: instant, updatedAt: instant, revision });

class Fixture {
  readonly observed = new ObservedSdk();
  readonly ownerId = `context_${randomUUID().replaceAll("-", "")}`;
  readonly uid = `context_${randomUUID().replaceAll("-", "")}`;
  readonly paths: string[] = [];
  readonly views: FixedStartReadView[] = [];
  readonly createdAt = new Date(Date.now() - 5_000).toISOString();
  readonly identity: AsyncConversationIdentity;
  token = "";
  active = true;
  userCreated = false;
  constructor() { this.identity = { principal: { firebaseUid: this.uid }, ownerId: this.ownerId,
    session: {}, tokenInstance: {}, originalRequest: {} }; }
  path(name: "account" | "state" | "persona" | "other" | "binding"): string {
    return name === "account" ? `accounts/${this.ownerId}` : name === "binding" ? `auth_bindings/${createAuthBindingDocumentId(this.uid)!}` :
      name === "state" ? `accounts/${this.ownerId}/persona_state/current` :
        `accounts/${this.ownerId}/personas/${name === "persona" ? personaId : otherPersonaId}`;
  }
  noteId(index: number): string { return `${this.ownerId}_${String(index).padStart(2, "0")}`; }
  current = (identity: AsyncConversationIdentity) => this.active && identity === this.identity;
  sameOriginal(context: AcceptedContextRead): boolean { return this.active && context.principal.firebaseUid === this.uid &&
    context.ownerId === this.ownerId && context.session === this.identity.session && context.originalRequest === this.identity.originalRequest; }
  async init(notes = 30): Promise<void> {
    const email = `${this.uid}@example.invalid`, password = `${randomUUID()}Aa1!`;
    await auth.createUser({ uid: this.uid, email, password }); this.userCreated = true;
    const signIn = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    assert.equal(signIn.ok, true, "synthetic sign-in succeeds");
    const result = await signIn.json() as { readonly idToken?: unknown };
    assert.equal(typeof result.idToken, "string"); this.token = result.idToken as string;
    const batch = firestore.batch();
    const create = (path: string, data: Record<string, unknown>) => { this.paths.push(path); batch.create(firestore.doc(path), data); };
    create(this.path("binding"), { accountId: this.ownerId });
    create(this.path("account"), { username: `ctx_${this.ownerId.slice(-20)}`, optionalProcessingConsent: "accepted", checkInVisibility: "private",
      onboardingCompletedAt: this.createdAt, purposeRevocationGeneration: 2, settingsRevision: 1 });
    create(this.path("state"), { livePersonaIds: [personaId, otherPersonaId], activePersonaId: personaId, stateRevision: 1 });
    create(this.path("persona"), validPersona(this.createdAt)); create(this.path("other"), validPersona(this.createdAt, "neutral"));
    for (let n = 0; n < notes; n++) create(`check_ins/${this.noteId(n)}`, { ownerAccountId: this.ownerId,
      note: `Synthetic immutable Note ${n} 🧩`, createdAt: this.createdAt, checkInVisibility: "private" });
    await batch.commit();
  }
  prerequisites(): SourceBoundNotePrerequisites {
    // These complete synthetic rows are created once, with canonical times and
    // immutable owner/Note/time; all test writers are declared here, permit only
    // visibility or permanent delete, and never restore/reassign/reuse IDs.
    return { firestore: this.observed.db, sourceReferences: ["backend/emulator-test/ai-context-reader.integration.test.ts complete own fixture inventory"],
      completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true };
  }
  reader(withPrerequisites = true): FirebaseAdminRealContextReader {
    return new FirebaseAdminRealContextReader(this.observed.db, { controlledEnvironment: process.env, monotonicNow: () => 0,
      originalAuthority: { verify: async context => {
        if (!this.sameOriginal(context)) return { kind: "denied" };
        const value = await verifier.verifyIdToken(this.token);
        if (!this.sameOriginal(context)) return { kind: "denied" };
        return value.kind === "verified" ? { kind: "read", value: value.principal } :
          { kind: value.kind === "dependency_unavailable" ? "unavailable" : "denied" };
      } }, ...(withPrerequisites ? { notePrerequisites: this.prerequisites() } : {}) });
  }
  authority(): FirebaseAdminAsyncConversationAuthority {
    return new FirebaseAdminAsyncConversationAuthority(this.observed.db, { current: this.current,
      verify: async identity => this.current(identity) ? verifier.verifyIdToken(this.token) : { kind: "invalid" } }, process.env);
  }
  async context(): Promise<AcceptedContextRead> {
    // Confirm Backend UTC anchor includes the acknowledged seed; never substitute
    // server/latest anchor if local-clock inclusion cannot be established.
    const stored = await firestore.doc(this.path("account")).get(), anchor = Timestamp.now();
    assert.ok(stored.updateTime && (anchor.seconds > stored.updateTime.seconds ||
      (anchor.seconds === stored.updateTime.seconds && anchor.nanoseconds >= stored.updateTime.nanoseconds)), "Backend UTC anchor includes seed");
    return { principal: this.identity.principal, ownerId: this.ownerId, session: this.identity.session,
      originalRequest: this.identity.originalRequest, acceptedAt: 0, deadline: 60_000,
      asOf: { seconds: anchor.seconds, nanoseconds: anchor.nanoseconds }, signal: new AbortController().signal };
  }
  async open(reader: FirebaseAdminRealContextReader, context: AcceptedContextRead): Promise<FixedStartReadView> {
    const result = await reader.openStart(context); assert.equal(result.kind, "read", "fixed SDK view opens");
    if (result.kind !== "read") throw new Error("fixed SDK view unavailable"); this.views.push(result.value); return result.value;
  }
  query(context: AcceptedContextRead) { return { ownerId: this.ownerId,
    fromInclusive: { seconds: context.asOf.seconds - 7 * 24 * 60 * 60, nanoseconds: context.asOf.nanoseconds },
    toInclusive: context.asOf, after: undefined, limit: 25 as const }; }
  dependencies(generation = 2): ContextDependencies { return { ownerId: this.ownerId, purpose: "checkin_conversation",
    purposeRevocationGeneration: generation, usedPersonaId: personaId, sources: [] }; }
  async close(): Promise<void> {
    this.active = false; this.token = ""; for (const view of this.views) view.close(); await this.observed.settled();
    try {
      const removal = firestore.batch(); for (const path of this.paths) removal.delete(firestore.doc(path)); await removal.commit();
      const residual = this.paths.length > 0 ? await firestore.getAll(...this.paths.map(path => firestore.doc(path))) : [];
      assert.ok(residual.every(snapshot => !snapshot.exists), "own fixture references are absent after cleanup");
      assert.equal((await firestore.collection("check_ins").where("ownerAccountId", "==", this.ownerId).get()).empty, true);
      assert.equal((await firestore.collection(`accounts/${this.ownerId}/personas`).get()).empty, true);
    } finally {
      if (this.userCreated) { await auth.deleteUser(this.uid); this.userCreated = false; }
    }
  }
}
async function owned(work: (fixture: Fixture) => Promise<void>, count = 30): Promise<void> {
  const fixture = new Fixture(); try { await fixture.init(count); await work(fixture); } finally { await fixture.close(); }
}

test("AI context Emulator: minimal preaccept denial and omitted source prerequisites submit no Note query", async () => {
  await owned(async f => {
    const authority = f.authority(); assert.equal(await authority.preaccept(f.identity, operation), "authorized");
    assert.deepEqual(f.observed.reads, [f.path("binding"), f.path("account")]);
    const c = await f.context(), v = await f.open(f.reader(false), c);
    assert.equal((await v.readAuthority()).kind, "read"); assert.equal((await v.readPersonas()).kind, "read");
    assert.equal((await v.readNotePage(f.query(c))).kind, "unavailable");
    assert.equal(f.observed.reads.includes("note-query"), false); v.close(); await f.observed.settled();
    await firestore.doc(f.path("account")).update({ optionalProcessingConsent: "rejected", purposeRevocationGeneration: 3, settingsRevision: 2 });
    f.observed.reads.length = 0; assert.equal(await authority.preaccept(f.identity, operation), "denied");
    assert.deepEqual(f.observed.reads, [f.path("binding"), f.path("account")]);
    const deniedView = await f.open(f.reader(), await f.context());
    assert.equal((await deniedView.readAuthority()).kind, "denied");
    assert.equal((await deniedView.readPersonas()).kind, "denied");
    assert.equal(f.observed.reads.includes("note-query"), false); deniedView.close();
  });
});
test("AI context Emulator: fixed asOf survives acknowledged cross-document mutations and page25 keyset", async () => {
  await owned(async f => {
    assert.equal(await f.authority().preaccept(f.identity, operation), "authorized");
    const r = f.reader(), c = await f.context(), v = await f.open(r, c);
    const authority = await v.readAuthority(); assert.equal(authority.kind, "read");
    const mutation = firestore.batch();
    mutation.update(firestore.doc(f.path("account")), { optionalProcessingConsent: "rejected", purposeRevocationGeneration: 3, settingsRevision: 2 });
    mutation.update(firestore.doc(f.path("persona")), { tone: "encouraging", revision: 2 });
    mutation.update(firestore.doc(f.path("state")), { activePersonaId: otherPersonaId, stateRevision: 2 });
    mutation.delete(firestore.doc(`check_ins/${f.noteId(28)}`)); await mutation.commit();
    const personas = await v.readPersonas(); assert.equal(personas.kind, "read");
    if (personas.kind === "read") { assert.equal(personas.value.value.activePersonaId, personaId);
      assert.equal(personas.value.value.items[0]!.projection.tone, "warm"); }
    const first = await v.readNotePage(f.query(c)); assert.equal(first.kind, "read");
    if (first.kind !== "read") throw new Error("fixed first page unavailable");
    assert.equal(first.value.value.rows.length, 25); assert.equal(first.value.value.next!.sourceId, f.noteId(24));
    const second = await v.readNotePage({ ...f.query(c), after: first.value.value.next }); assert.equal(second.kind, "read");
    if (second.kind === "read") assert.deepEqual(second.value.value.rows.map(row => row.sourceId), Array.from({ length: 5 }, (_, n) => f.noteId(n + 25)));
    const repeated = await v.readAuthority(); assert.equal(repeated.kind, "read");
    if (repeated.kind === "read") assert.equal(repeated.value.value.purposeRevocationGeneration, 2);
    assert.equal(f.observed.options.filter(o => o?.readTime).length, 1);
    const options = f.observed.options.find(o => o?.readTime)!;
    assert.equal(options.readOnly, true); assert.equal(options.readTime!.seconds, c.asOf.seconds);
    assert.equal(options.readTime!.nanoseconds, c.asOf.nanoseconds); v.close(); await f.observed.settled();
    assert.equal((await r.readCurrent(c, f.dependencies())).kind, "denied");
    await firestore.doc(f.path("account")).update({ optionalProcessingConsent: "accepted", settingsRevision: 3 });
    assert.equal((await r.readCurrent(c, f.dependencies())).kind, "denied", "regrant cannot reset the original generation");
  });
});
test("AI context Emulator: Prepared reader projects only complete legal first-five Notes and original Persona", async () => {
  await owned(async f => {
    const c = await f.context(), prepared = new PreparedRealContextReader(c, f.reader(), () => 0, () => f.active);
    try {
      assert.equal(await prepared.prepare(), "ready"); assert.equal(prepared.modelContext()!.checkIns.length, 5);
      assert.deepEqual(prepared.modelContext()!.checkIns.map(row => row.noteText), Array.from({ length: 5 }, (_, n) => `Synthetic immutable Note ${n} 🧩`));
      assert.deepEqual(Object.keys(prepared.modelContext()!.persona!).sort(), ["formatStyle", "responseLength", "schemaVersion", "tone"]);
      assert.deepEqual(prepared.dependencies()!.sources.map(source => source.sourceId), Array.from({ length: 5 }, (_, n) => f.noteId(n)));
      assert.equal(await prepared.revalidate(), "ready");
    } finally { prepared.dispose(); await f.observed.settled(); }
  });
});
test("AI context Emulator: current permits edit/switch/visibility, detects permanent used-source/Persona deletion", async () => {
  await owned(async f => {
    const c = await f.context(), r = f.reader();
    const baseline = await firestore.doc(`check_ins/${f.noteId(0)}`).get(); assert.ok(baseline.updateTime);
    const deps: ContextDependencies = { ...f.dependencies(), sources: [{ sourceType: "check_in", sourceId: f.noteId(0),
      observedVersion: { seconds: baseline.updateTime.seconds, nanoseconds: baseline.updateTime.nanoseconds } }] };
    await firestore.doc(`check_ins/${f.noteId(0)}`).update({ checkInVisibility: "public" });
    await firestore.doc(f.path("persona")).update({ tone: "encouraging", revision: 2 });
    await firestore.doc(f.path("state")).update({ activePersonaId: otherPersonaId, stateRevision: 2 });
    const valid = await r.readCurrent(c, deps); assert.equal(valid.kind, "read");
    if (valid.kind === "read") { assert.equal(valid.value.usedPersona, "exists"); assert.equal(valid.value.sources[0]!.state, "valid"); }
    await firestore.doc(`check_ins/${f.noteId(0)}`).delete();
    const deleted = await r.readCurrent(c, deps); assert.equal(deleted.kind, "read");
    if (deleted.kind === "read") assert.equal(deleted.value.sources[0]!.state, "deleted");
    const remove = firestore.batch(); remove.delete(firestore.doc(f.path("persona")));
    remove.update(firestore.doc(f.path("state")), { livePersonaIds: [otherPersonaId], stateRevision: 3 }); await remove.commit();
    const persona = await r.readCurrent(c, deps); assert.equal(persona.kind, "read");
    if (persona.kind === "read") assert.equal(persona.value.usedPersona, "deleted");
    f.active = false; assert.equal((await r.readCurrent(c, deps)).kind, "denied");
  });
});
test("AI context Emulator: unavailable future readTime has no latest fallback or content query", async () => {
  await owned(async f => {
    const c = await f.context(), future = { ...c, asOf: { seconds: c.asOf.seconds + 24 * 60 * 60, nanoseconds: c.asOf.nanoseconds } };
    const v = await f.open(f.reader(), future);
    assert.equal((await v.readAuthority()).kind, "unavailable");
    assert.equal(f.observed.reads.includes("note-query"), false); v.close();
    assert.equal(f.observed.options.filter(o => o?.readTime).length, 1);
  }, 0);
});
test("AI context Emulator: original token is reverified after user disable, before any DB content read", async () => {
  await owned(async f => {
    const c = await f.context(), a = f.authority(), r = f.reader();
    assert.equal(await a.freshAuth(f.identity), "authorized");
    await auth.updateUser(f.uid, { disabled: true }); f.observed.reads.length = 0;
    assert.equal(await a.preaccept(f.identity, operation), "denied");
    assert.equal((await r.openStart(c)).kind, "denied");
    assert.equal((await r.readCurrent(c, f.dependencies())).kind, "denied");
    assert.deepEqual(f.observed.reads, []);
  }, 0);
});
