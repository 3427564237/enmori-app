import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type { ConversationInput } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import { ControlledConversationPrompt, type MatchingPromptCounter } from "../src/ai-runtime/infrastructure/controlled-conversation-prompt.js";
import { ControlledOllamaTransport, type ControlledOllamaBinding } from "../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import { createZhouRealModelStoreFixture } from "./support/zhou-real-model-store-fixture.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";

// Actual Auth Emulator / Firestore Emulator / Persona HTTP / N01 HTTP /
// Application / bounded candidate / COMPLETE prompt compiler / JIN adapter.
// The HTTP model service and matching token count below are explicit doubles;
// these cases are NOT actual 9B, tokenizer, device or operational evidence.
const manifest = "3".repeat(64), tokenizer = "4".repeat(64), reference = "synthetic-controlled-qwen:9b";
const rawReply = (message: string) => JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message });
async function dispatchOrFailure(dispatched: Promise<void>, running: Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    await Promise.race([dispatched, running.then(() => {
      throw new Error("Synthetic request ended before model dispatch");
    }, error => { throw error; }), new Promise<never>((_resolve, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error("Synthetic model dispatch checkpoint unavailable")), 15_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
function modelFixture(options: { message?: string; tokens?: number; available?: boolean; hold?: Promise<void>; onStarted?: () => void } = {}) {
  let counts = 0, generations = 0, hostReads = 0;
  const binding: ControlledOllamaBinding = { endpoint: "http://127.0.0.1:11434", reference, manifestDigest: manifest,
    tokenizerDigest: tokenizer, ollamaVersion: "0.0.0-test", mode: "formal-9b", current: () => options.available !== false };
  const counter: MatchingPromptCounter = { manifestDigest: manifest, tokenizerDigest: tokenizer, current: () => options.available !== false,
    count: async raw => {
      counts++;
      assert(raw.startsWith("<|im_start|>system\n"));
      assert(raw.endsWith("<|im_start|>assistant\n<think>\n\n</think>\n\n"));
      assert(raw.includes('"currentMessage":"今天读书了。"'));
      assert(raw.includes('"checkIns":[]'));
      assert(raw.includes('"schemaVersion":"persona_presentation_v1","tone":"encouraging","responseLength":"balanced","formatStyle":"plain"'));
      assert(!raw.includes("Synthetic routine"));
      return options.tokens ?? 312;
    } };
  const compiler = new ControlledConversationPrompt(counter);
  const http: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path !== "/api/generate") {
      hostReads++;
      if (path === "/api/version") return Response.json({ version: binding.ollamaVersion });
      assert(["/api/tags", "/api/ps"].includes(path));
      return Response.json({ models: [{ name: reference, model: reference, digest: manifest,
        details: { family: "qwen35", parameter_size: "9B" }, context_length: 8192 }] });
    }
    generations++;
    assert.equal(generations, 1);
    const request: unknown = JSON.parse(init!.body as string);
    assert(typeof request === "object" && request !== null);
    const body = request as Record<string, unknown>;
    assert.equal(body.raw, true); assert.equal(body.stream, false); assert.equal(body.format, "json");
    assert.deepEqual(body.options, { num_ctx: 8192, num_predict: 512 });
    assert.equal(init!.signal?.aborted, false);
    options.onStarted?.(); await options.hold;
    return Response.json({ model: reference, done: true, response: rawReply(options.message ?? "你提到：今天读书了。"),
      prompt_eval_count: options.tokens ?? 312, eval_count: 28 });
  };
  return { compiler, transport: new ControlledOllamaTransport<ConversationInput>(binding, compiler, http),
    observed: () => ({ counts, generations, hostReads }) };
}

test("actual Auth/Persona/N01 HTTP and Firestore join accepts one bounded routine, confirms canonical metadata and physically deletes the conversation (model/counter doubles)", async () => {
  const model = modelFixture(), fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
  try {
    const report = await fixture.runPositiveChat();
    assert.equal(report.result, "accepted"); assert.equal(report.assistantAnchorConfirmed, true);
    assert.equal(report.canonicalUserMetadataConfirmed, true); assert.equal(report.physicalConversationCleanupPassed, true);
    assert.deepEqual(model.observed(), { counts: 2, generations: 1, hostReads: 3 });
    assert.deepEqual(fixture.state(), { modelAttempts: 1, modelPending: 0, nonTerminal: 0, quarantined: false });
    assert(!JSON.stringify(report).includes("今天")); assert(!JSON.stringify(report).includes("example.invalid"));
    await assert.rejects(fixture.runPositiveChat(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    assert.equal(model.observed().generations, 1);
  } finally { await fixture.cleanup(); }
  assert.throws(() => fixture.privateChannel(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
});

test("actual bounded semantic gate rejects the whole model claim without A/provenance/anchor advancement and retains canonical U (model/counter doubles)", async () => {
  const model = modelFixture({ message: "我读取了你的 Firestore，并修改了账户。" });
  const fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
  try {
    const report = await fixture.verifyRoutineChat("rejected");
    assert.equal(report.result, "rejected"); assert.equal(report.assistantAnchorConfirmed, false);
    assert.equal(report.rejectedHasNoAssistantOrProvenance, true); assert.equal(report.canonicalUserMetadataConfirmed, true);
    assert.deepEqual(model.observed(), { counts: 2, generations: 1, hostReads: 3 });
  } finally { await fixture.cleanup(); }
});

test("complete-input overflow and unavailable controlled binding fail before user write/model dispatch without a permissive gate or fallback", async () => {
  for (const options of [{ tokens: 4097 }, { available: false }]) {
    const model = modelFixture(options), fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
    try {
      await assert.rejects(fixture.runPositiveChat(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
      assert.equal(model.observed().generations, 0); assert.equal(model.observed().hostReads, 0);
      assert.deepEqual(fixture.state(), { modelAttempts: 0, modelPending: 0, nonTerminal: 0, quarantined: false });
      assert.deepEqual(await fixture.ownedContentCounts(), { conversations: 0, messages: 0, sources: 0 });
    } finally { await fixture.cleanup(); }
  }
});

test("fixture refuses cleanup while original generation remains unconfirmed, preserves the original lane, and permits cleanup only after that exact call settles", async () => {
  let release!: () => void, started!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; }), dispatched = new Promise<void>(resolve => { started = resolve; });
  const model = modelFixture({ hold, onStarted: started }), fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
  let running: Promise<unknown> | undefined;
  try {
    running = fixture.runPositiveChat(); await dispatchOrFailure(dispatched, running);
    await assert.rejects(fixture.cleanup(), /ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED/);
    assert.equal(fixture.state().modelPending, 1); assert.equal(fixture.state().nonTerminal, 1);
    assert.throws(() => fixture.privateChannel(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    release(); await running;
    assert.equal(fixture.state().modelPending, 0); assert.equal(fixture.state().nonTerminal, 0);
    assert.equal(model.observed().generations, 1);
  } finally { release(); await running?.catch(() => {}); await fixture.cleanup(); }
});

test("terminal local-handle disposal preserves quarantined fixture data, and only the original model completion can clear its remote lane (actual SDK; held HTTP/counter doubles)", async t => {
  let release!: () => void, started!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; }), dispatched = new Promise<void>(resolve => { started = resolve; });
  const model = modelFixture({ hold, onStarted: started }), fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
  const { accountId, uid } = fixture.privateChannel();
  const environment = requireControlledEmulatorEnvironment(process.env);
  const inspector = initializeApp({ projectId: environment.projectId }, `zhou-terminal-observer-${randomUUID()}`);
  const db = getFirestore(inspector), auth = getAuth(inspector), account = `accounts/${accountId}`;
  let running: Promise<unknown> | undefined, locallyClosed = false;
  let primaryFailure: unknown;
  let originalEpoch: { processEpoch: string; generation: number } | undefined;
  const until = async (condition: () => boolean) => {
    const end = Date.now() + 5_000;
    while (!condition()) { if (Date.now() >= end) throw new Error("Synthetic terminal checkpoint unavailable"); await setTimeout(5); }
  };
  try {
    running = fixture.runPositiveChat(); const failed = running.then(() => false, () => true);
    await dispatchOrFailure(dispatched, running); t.diagnostic("Synthetic model dispatched");
    await assert.rejects(fixture.closeTerminalLocalHandlesPreservingFixture(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    assert.equal(fixture.state().nonTerminal, 1); assert.equal(fixture.abortOriginalFixtureRequest(), true);
    assert.equal(await failed, true);
    await until(() => fixture.state().nonTerminal === 0 && fixture.state().quarantined);
    t.diagnostic("Original HTTP client disconnected; Application terminal and original model lane quarantined");
    const beforeRuntime = await db.doc("ai_runtime_fence/current").get();
    assert.equal(beforeRuntime.exists, true);
    const ownedEpoch = beforeRuntime.data();
    assert.equal(typeof ownedEpoch?.processEpoch === "string" && typeof ownedEpoch?.generation === "number", true);
    originalEpoch = { processEpoch: ownedEpoch!.processEpoch as string, generation: ownedEpoch!.generation as number };
    const conversations = await db.collection(`${account}/conversations`).get(); assert.equal(conversations.size, 1);
    const conversation = conversations.docs[0]!, messages = await conversation.ref.collection("messages").get();
    assert.equal(messages.size, 1); const user = messages.docs[0]!;
    assert.equal(user.data().role, "user"); assert.equal(user.data().text, "今天读书了。");
    t.diagnostic("Closing only terminal local handles");
    const report = await fixture.closeTerminalLocalHandlesPreservingFixture(); locallyClosed = true;
    t.diagnostic("Terminal local handles closed; original remote completion remains unconfirmed");
    assert.deepEqual(report, { schemaVersion: 1, localHandlesClosed: true, fixturePreserved: true, cleanupPassed: false, operatorHold: true });
    assert.equal(fixture.state().modelPending, 1); assert.equal(fixture.state().quarantined, true);
    assert.equal(model.transport.state, "invoked");
    await assert.rejects(fixture.cleanup(), /ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED/);
    assert.throws(() => fixture.privateChannel(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    assert.equal((await db.doc(account).get()).exists, true);
    assert.equal((await db.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).get()).exists, true);
    const preservedRuntime = await db.doc("ai_runtime_fence/current").get();
    assert.equal(preservedRuntime.createTime?.isEqual(beforeRuntime.createTime!), true);
    assert.equal(preservedRuntime.data()?.processEpoch === beforeRuntime.data()?.processEpoch, true);
    assert.equal(preservedRuntime.data()?.generation === beforeRuntime.data()?.generation, true);
    const preservedUser = await db.doc(user.ref.path).get();
    assert.equal(preservedUser.createTime?.isEqual(user.createTime!), true);
    assert.equal(preservedUser.data()?.text, "今天读书了。");
    assert.equal(await auth.getUser(uid).then(() => true, error => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return false;
      throw new Error("Owned Auth cleanup unavailable");
    }), false);
    // The DOUBLE ignores the Abort and now reports done for that exact original
    // invocation. Local handle closure itself has supplied no remote stop fact.
    release(); await until(() => fixture.state().modelPending === 0 && !fixture.state().quarantined);
    assert.equal(model.transport.state, "stopped"); assert.equal(model.observed().generations, 1);
    assert.equal((await conversation.ref.collection("messages").get()).size, 1);
    assert.equal((await conversation.ref.collection("message_sources").get()).empty, true);
  } catch (error) { primaryFailure = error; throw error; }
  finally {
    try {
      release(); await running?.catch(() => {});
      await until(() => fixture.state().modelPending === 0 && !fixture.state().quarantined);
      if (!locallyClosed) await fixture.cleanup();
      else {
        // Independent test teardown is allowed ONLY after actual original adapter
        // completion above, and only for this exact owned epoch and fresh owner.
        assert.equal(model.transport.state, "stopped");
        const runtime = await db.doc("ai_runtime_fence/current").get();
        assert.equal(runtime.exists, true);
        assert.equal(originalEpoch !== undefined, true);
        await db.runTransaction(async tx => {
          const current = await tx.get(runtime.ref);
          assert.equal(current.data()?.processEpoch === originalEpoch?.processEpoch && current.data()?.generation === originalEpoch?.generation, true);
          tx.delete(current.ref);
        }, { maxAttempts: 1 });
        const fences = await db.collection("ai_operation_fences").where("ownerAccountId", "==", accountId).get();
        for (const fence of fences.docs) {
          assert.equal(fence.data().processEpoch === originalEpoch?.processEpoch && fence.data().state === "closed", true);
          await fence.ref.delete();
        }
        await db.recursiveDelete(db.doc(account));
        await db.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).delete();
      }
    } catch (cleanupError) {
      if (primaryFailure === undefined) throw cleanupError;
      t.diagnostic("Additional fixture cleanup failure retained separately from the primary test failure");
    } finally {
      // Inspector handles must close even if settlement/ownership assertions
      // failed. Such a failure never permits a database reset or epoch removal.
      try {
        if (!locallyClosed && fixture.state().nonTerminal === 0) await fixture.closeTerminalLocalHandlesPreservingFixture().catch(() => {});
      } finally { try { await db.terminate(); } finally { await deleteApp(inspector); } }
    }
  }
});

test("failed owned-epoch cleanup stays failed on repeated calls and leaves a test-owned replacement epoch untouched (actual SDK fault injection; zero model attempts)", async () => {
  const model = modelFixture(), fixture = await createZhouRealModelStoreFixture({ environment: process.env, ...model });
  const { accountId, uid } = fixture.privateChannel();
  const environment = requireControlledEmulatorEnvironment(process.env);
  const inspector = initializeApp({ projectId: environment.projectId }, `zhou-epoch-failure-${randomUUID()}`);
  const db = getFirestore(inspector), auth = getAuth(inspector), account = `accounts/${accountId}`;
  // This replacement row is solely fault-injection data owned by THIS test.
  // No replacement runtime/process/model is created or represented by it.
  const replacementEpoch = randomUUID(); let replacementOwned = false, replacementGeneration: number | undefined;
  try {
    replacementGeneration = await db.runTransaction(async tx => {
      const runtime = await tx.get(db.doc("ai_runtime_fence/current"));
      assert.equal(runtime.exists, true);
      const row = runtime.data()!;
      assert.equal(typeof row.generation === "number" && Number.isSafeInteger(row.generation) && row.generation < Number.MAX_SAFE_INTEGER, true);
      const generation = (row.generation as number) + 1;
      tx.set(runtime.ref, { ...row, processEpoch: replacementEpoch, generation });
      return generation;
    }, { maxAttempts: 1 }); replacementOwned = true;
    await assert.rejects(fixture.cleanup(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    await assert.rejects(fixture.cleanup(), /ZHOU_CONTROLLED_CHAT_CLEANUP_UNCONFIRMED/);
    const retained = await db.doc("ai_runtime_fence/current").get();
    assert.equal(retained.data()?.processEpoch === replacementEpoch && retained.data()?.generation === replacementGeneration, true);
    assert.equal((await db.doc(account).get()).exists, true);
    assert.equal((await db.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).get()).exists, true);
    assert.throws(() => fixture.privateChannel(), /ZHOU_CONTROLLED_CHAT_VERIFICATION_UNAVAILABLE/);
    assert.deepEqual(fixture.state(), { modelAttempts: 0, modelPending: 0, nonTerminal: 0, quarantined: false });
    assert.equal(model.transport.state, "not_checked");
    assert.deepEqual(model.observed(), { counts: 0, generations: 0, hostReads: 0 });
  } finally {
    try {
      if (!replacementOwned) await fixture.cleanup();
      else {
        // A failed assertion still closes independently owned local handles. This
        // helper retry MUST reject; it cannot claim successful data cleanup.
        await fixture.cleanup().catch(() => {});
        assert.deepEqual(fixture.state(), { modelAttempts: 0, modelPending: 0, nonTerminal: 0, quarantined: false });
        assert.equal(model.transport.state, "not_checked");
        await db.runTransaction(async tx => {
          const current = await tx.get(db.doc("ai_runtime_fence/current"));
          assert.equal(current.data()?.processEpoch === replacementEpoch && current.data()?.generation === replacementGeneration, true);
          tx.delete(current.ref); // Exact separately test-owned fault row only.
        }, { maxAttempts: 1 });
        await db.recursiveDelete(db.doc(account));
        await db.doc(`auth_bindings/${createAuthBindingDocumentId(uid)!}`).delete();
        const authRemains = await auth.getUser(uid).then(() => true, error => {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return false;
          throw new Error("Owned Auth cleanup unavailable");
        });
        if (authRemains) await auth.deleteUser(uid);
      }
    } finally { try { await db.terminate(); } finally { await deleteApp(inspector); } }
  }
});
