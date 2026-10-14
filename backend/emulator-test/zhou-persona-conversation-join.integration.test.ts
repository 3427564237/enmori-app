import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createIsolatedConversationComposition } from "../src/bootstrap/isolated-conversation-composition.js";
import { buildApp } from "../src/bootstrap/build-app.js";
import { OwnPersonas } from "../src/personas/application/own-personas.js";
import { FirestorePersonaRepository } from "../src/personas/infrastructure/firestore-persona-repository.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err, ok } from "../src/shared/domain/result.js";
import type { ConversationInput, PersonaProjection } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import { boundedConversationSemanticCandidate } from "../src/ai-conversation/application/bounded-conversation-semantic-policy.js";

// Actual Auth/Persona HTTP/Firestore/Application and bounded semantic-policy
// joins. Model/token decisions are synthetic; this fixture has EMPTY Notes.
// No controlled-host/device/semantic-policy acceptance is inferred from it.
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
const warm = { displayName: "Synthetic warm", tone: "warm", responseLength: "balanced", formatStyle: "plain" } as const;
const neutral = { displayName: "Synthetic neutral", tone: "neutral", responseLength: "detailed", formatStyle: "bulleted" } as const;
const changed = { ...warm, tone: "encouraging", responseLength: "concise" } as const;
interface PersonaReply { persona: { personaId: string; revision: number }; stateRevision: number }
interface Ticket { operationId: string; operationKey: string; conversationId: string }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function bounded<T>(promise: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Synthetic join checkpoint unavailable")), 15_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function fixture(model: (input: ConversationInput) => Promise<Uint8Array>) {
  const firebase = initializeApp({ projectId: environment.projectId }, `zhou-persona-join-${randomUUID()}`);
  const db = getFirestore(firebase), auth = getAuth(firebase), uid = `zhou-persona-${randomUUID()}`, owner = randomUUID();
  const account = `accounts/${owner}`, binding = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
  const password = `Synthetic_${randomUUID()}`, email = `${uid}@example.invalid`;
  const conversations = new Set<string>(), operations = new Set<string>();
  const pending = new Set<Promise<unknown>>();
  const retired: Promise<void>[] = [], retiredResolve: (() => void)[] = [];
  let joined: Awaited<ReturnType<typeof createIsolatedConversationComposition>> | undefined;
  let api: Awaited<ReturnType<typeof buildApp>> | undefined;
  let token = "", authOwned = false;
  const cleanup = async () => {
    const failures: unknown[] = [];
    const attempt = async (work: () => Promise<unknown>): Promise<boolean> => {
      try { await work(); return true; } catch (error) { failures.push(error); return false; }
    };
    try {
      await attempt(async () => { await joined?.stopAdmissionAndMaintenance(); });
      await attempt(async () => { await Promise.allSettled([...pending]); });
      await attempt(async () => { await api?.close(); });
      const quiet = await attempt(async () => {
        for (const cid of conversations) await joined?.io.settled(owner, cid);
        if (joined) {
          assert.equal(joined.runtime.state.nonTerminal, 0);
          assert.equal(joined.runtime.state.quarantined, false);
        }
      });
      // Unconfirmed work remains an operator cleanup obligation; never reset
      // content still addressable by a nonterminal or quarantined invocation.
      if (quiet) {
        if (joined) await attempt(async () => {
          const runtime = await db.doc("ai_runtime_fence/current").get();
          assert.equal(runtime.data()?.processEpoch, joined!.epoch.processEpoch);
          assert.equal(runtime.data()?.generation, joined!.epoch.generation);
          await runtime.ref.delete(); // Only after exact owned epoch checks.
        });
        await attempt(async () => { await db.recursiveDelete(db.doc(account)); });
        await attempt(async () => { await db.doc(binding).delete(); });
        for (const id of operations) await attempt(async () => { await db.doc(`ai_operation_fences/${id}`).delete(); });
        await attempt(async () => { assert.equal((await db.doc(account).get()).exists, false); });
        await attempt(async () => { assert.equal((await db.doc(binding).get()).exists, false); });
      }
      if (authOwned) await attempt(async () => { await auth.deleteUser(uid); await assert.rejects(auth.getUser(uid)); });
    } finally {
      token = "";
      await attempt(async () => { await db.terminate(); });
      await attempt(async () => { await deleteApp(firebase); });
    }
    if (failures.length) throw new AggregateError(failures, "Owned Persona/AI fixture cleanup failed");
  };
  try {
    assert.equal((await db.doc("ai_runtime_fence/current").get()).exists, false);
    await auth.createUser({ uid, email, password }); authOwned = true;
    const signed = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(signed.status, 200); token = (await signed.json() as { idToken: string }).idToken;
    await db.doc(binding).create({ accountId: owner });
    await db.doc(account).create({ username: `z_${owner.replaceAll("-", "").slice(0, 16)}`,
      optionalProcessingConsent: "accepted", checkInVisibility: "private", onboardingCompletedAt: new Date().toISOString(), purposeRevocationGeneration: 0 });
    await db.doc(`${account}/persona_state/current`).create({ livePersonaIds: [], stateRevision: 0 });
    assert.equal((await db.collection("check_ins").where("ownerAccountId", "==", owner).get()).empty, true);
    joined = await createIsolatedConversationComposition({ firestore: db, environment: process.env,
      transport: { generate: model },
      gates: { beforeGeneration: async () => ok(undefined), candidate: boundedConversationSemanticCandidate },
      notePrerequisites: { firestore: db, sourceReferences: ["zhou-persona-conversation-join.integration.test.ts#owned-empty-inventory"],
        completeCanonicalUtcInventory: true, immutableOwnerNoteAndTime: true, permanentDeletion: true, noRestoreOrIdReuse: true },
      report: (_phase, result) => assert.equal(result.complete, true),
      reportRetirement: confirmed => { assert.equal(confirmed, true); retiredResolve.shift()?.(); },
      schedule: { every: (interval, _tick) => { assert.equal(interval, 3_600_000); return () => {}; } },
    });
    const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
    const personas = new OwnPersonas(new FirestorePersonaRepository(new FirebaseAdminFirestoreGateway(db), { now: () => ok(new Date()) }));
    api = await buildApp({ identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding: unavailable, getOnboarding: unavailable,
      createCheckIn: unavailable, getCheckIn: unavailable, getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
      isolatedSlices: { environment: process.env, conversations: joined.operations, personas } });
    const request = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object, headers: Record<string, string> = {}) => {
      const p = Promise.resolve(api!.inject({ method, url, headers: { authorization: `Bearer ${token}`, ...headers },
        ...(payload === undefined ? {} : { payload }) }));
      pending.add(p); void p.then(() => pending.delete(p), () => pending.delete(p)); return p;
    };
    const create = async (fields: typeof warm | typeof neutral, revision: number) => {
      const reply = await request("POST", "/v1/me/personas", { ...fields, expectedStateRevision: revision }, { "idempotency-key": randomUUID() });
      assert.equal(reply.statusCode, 201); return reply.json<PersonaReply>();
    };
    const activate = async (p: PersonaReply, revision: number) => {
      const reply = await request("PUT", "/v1/me/persona-selection", { personaId: p.persona.personaId,
        expectedRevision: p.persona.revision, expectedStateRevision: revision });
      assert.equal(reply.statusCode, 200); return reply.json<{ personas: { stateRevision: number } }>().personas.stateRevision;
    };
    const prepare = async (cid?: string) => {
      const reply = await request("POST", "/v1/me/ai/operations", { kind: "send", purpose: "checkin_conversation",
        ...(cid === undefined ? {} : { conversationId: cid }) });
      assert.equal(reply.statusCode, 201); const value = reply.json<Ticket>();
      conversations.add(value.conversationId); operations.add(value.operationId);
      const retirement = deferred<void>(); retired.push(retirement.promise); retiredResolve.push(() => retirement.resolve()); return value;
    };
    return { db, account, joined, cleanup, request, create, activate, prepare,
      execute: (ticket: Ticket) => request("POST", `/v1/me/ai/operations/${ticket.operationId}/execute`, { text: "今天读书了。" },
        { "ai-operation-key": ticket.operationKey }),
      settled: async (ticket: Ticket) => { await bounded(retired.shift()!); await joined!.io.settled(owner, ticket.conversationId); },
    };
  } catch (error) { await cleanup(); throw error; }
}
const rawReply = (bulleted = false) => Buffer.from(JSON.stringify({ schemaVersion: "ai_assistant_message_v1",
  message: `${bulleted ? "- " : ""}你提到：今天读书了。` }));

test("actual Persona HTTP edit/active switch leaves the accepted AI snapshot fixed and subsequent requests capture the new selection", async () => {
  const started = deferred<void>(), release = deferred<void>();
  const seen: (PersonaProjection | undefined)[] = [];
  const f = await fixture(async input => {
    assert.equal(input.checkIns.length, 0); seen.push(input.persona);
    if (seen.length === 1) { started.resolve(); await release.promise; }
    return rawReply(input.persona?.formatStyle === "bulleted");
  });
  try {
    const a = await f.create(warm, 0), b = await f.create(neutral, a.stateRevision);
    const activeRevision = await f.activate(a, b.stateRevision), ticket = await f.prepare();
    const executing = f.execute(ticket); await bounded(started.promise);
    const edited = await f.request("PUT", `/v1/me/personas/${a.persona.personaId}`, { ...changed,
      expectedRevision: a.persona.revision, expectedStateRevision: activeRevision });
    assert.equal(edited.statusCode, 200);
    const switchedRevision = await f.activate(b, edited.json<PersonaReply>().stateRevision);
    release.resolve(); const first = await bounded(executing); assert.equal(first.statusCode, 200); await f.settled(ticket);
    assert.deepEqual(seen[0], { schemaVersion: "persona_presentation_v1", tone: "warm", responseLength: "balanced", formatStyle: "plain" });
    const next = await f.prepare(ticket.conversationId); assert.equal((await f.execute(next)).statusCode, 200); await f.settled(next);
    assert.deepEqual(seen[1], { schemaVersion: "persona_presentation_v1", tone: "neutral", responseLength: "detailed", formatStyle: "bulleted" });
    const deleted = await f.request("DELETE", `/v1/me/personas/${a.persona.personaId}`, { expectedRevision: 2, expectedStateRevision: switchedRevision });
    assert.equal(deleted.statusCode, 204);
    const history = await f.request("GET", `/v1/me/conversations/${ticket.conversationId}/messages`);
    assert.equal(history.statusCode, 200); assert.equal(history.json().messages.length, 4);
    const messages = await f.db.collection(`${f.account}/conversations/${ticket.conversationId}/messages`).get();
    for (const row of messages.docs.filter(row => row.data().role === "assistant")) {
      const data = row.data(); assert.equal(data.presentationMode, "persona");
      assert.equal(data.presentationProjectionVersion, "persona_presentation_v1");
      for (const forbidden of ["personaId", "displayName", "tone", "responseLength", "formatStyle", "persona"]) assert.equal(Object.hasOwn(data, forbidden), false);
    }
  } finally { release.resolve(); await f.cleanup(); }
});

test("actual permanent deletion of the used Persona rejects a late AI reply without A or retention advance and preserves the original U", async () => {
  const started = deferred<void>(), release = deferred<void>();
  const f = await fixture(async input => { assert.equal(input.persona?.tone, "warm"); started.resolve(); await release.promise; return rawReply(); });
  try {
    const a = await f.create(warm, 0), revision = await f.activate(a, a.stateRevision), ticket = await f.prepare();
    const executing = f.execute(ticket); await bounded(started.promise);
    const base = `${f.account}/conversations/${ticket.conversationId}`, before = (await f.db.doc(base).get()).data()!;
    const removed = await f.request("DELETE", `/v1/me/personas/${a.persona.personaId}`, { expectedRevision: 1, expectedStateRevision: revision });
    assert.equal(removed.statusCode, 204); release.resolve(); const reply = await bounded(executing);
    assert.equal(reply.statusCode, 409); assert.equal(reply.json().error.code, "AI_AUTHORITY_CHANGED"); await f.settled(ticket);
    const messages = await f.db.collection(`${base}/messages`).get(); assert.equal(messages.size, 1);
    assert.equal(messages.docs[0]!.data().role, "user"); assert.equal(messages.docs[0]!.data().text, "今天读书了。");
    assert.deepEqual((await f.db.doc(base).get()).data()!.lastPersistedMessageAt, before.lastPersistedMessageAt);
    const read = await f.request("GET", `/v1/me/conversations/${ticket.conversationId}/operations/${ticket.operationId}`);
    assert.equal(read.statusCode, 200); assert.equal(read.json().state, "user_saved"); assert.equal(Object.hasOwn(read.json(), "assistantMessage"), false);
  } finally { release.resolve(); await f.cleanup(); }
});

test("actual joined candidate rejection creates no assistant/provenance and advances no anchor beyond the already committed user", async () => {
  const f = await fixture(async () => Buffer.from(JSON.stringify({ schemaVersion: "ai_assistant_message_v1",
    message: "I read Firestore and retrieved your private account." })));
  try {
    const ticket = await f.prepare(), reply = await f.execute(ticket);
    assert.equal(reply.statusCode, 502); assert.equal(reply.json().error.code, "AI_REPLY_REJECTED"); await f.settled(ticket);
    const base = `${f.account}/conversations/${ticket.conversationId}`, messages = await f.db.collection(`${base}/messages`).get();
    assert.equal(messages.size, 1); const u = messages.docs[0]!; assert.equal(u.data().role, "user");
    assert.deepEqual((await f.db.doc(base).get()).data()!.lastPersistedMessageAt, { seconds: u.createTime!.seconds, nanoseconds: u.createTime!.nanoseconds });
    assert.equal((await f.db.collection(`${base}/message_sources`).get()).empty, true);
    const read = await f.request("GET", `/v1/me/conversations/${ticket.conversationId}/operations/${ticket.operationId}`);
    assert.equal(read.statusCode, 200); assert.equal(read.json().state, "user_saved");
  } finally { await f.cleanup(); }
});
