import assert from "node:assert/strict";
import test from "node:test";
import { AuthorizedAsyncConversationGenerationTransport } from "../../src/ai-conversation/application/async-conversation-generation-transport.js";
import type { AsyncConversationModelInput } from "../../src/ai-conversation/ports/async-conversation.js";
import type { ConversationInput } from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import { deferred, valid } from "../ai-runtime/support.js";

const projection: ConversationInput = { currentMessage: "Synthetic input", checkIns: [], persona: undefined };
function fixture() {
  const abort = new AbortController();
  let remaining = 1000;
  const budget = { signal: abort.signal, deadline: 1000, remainingMs: () => remaining };
  const calls: ConversationInput[] = [];
  const completion = deferred<Uint8Array>();
  const transport = new AuthorizedAsyncConversationGenerationTransport({ generate(input, supplied) {
    assert.equal(supplied, budget); calls.push(input); return completion.promise;
  } });
  return { abort, budget, transport, calls, completion, expire: () => { remaining = 0; } };
}
test("dispatch wrapper awaits fresh authorization once then immediately submits only exact model projection", async () => {
  const f = fixture(), authorization = deferred<boolean>(), phases: string[] = [];
  const handle: AsyncConversationModelInput = { authorize: () => { phases.push("authorize"); return authorization.promise; },
    projection: () => { phases.push("projection"); return projection; } };
  const generation = f.transport.generate(handle, f.budget);
  assert.deepEqual(phases, ["authorize"]); assert.equal(f.calls.length, 0);
  authorization.resolve(true); await Promise.resolve();
  assert.deepEqual(phases, ["authorize", "projection"]); assert.deepEqual(f.calls, [projection]);
  assert.equal("authorize" in f.calls[0]!, false);
  f.completion.resolve(valid()); assert.deepEqual(await generation, valid());
  await assert.rejects(f.transport.generate(handle, f.budget)); assert.equal(f.calls.length, 1);
});
test("denied, aborted, expired or revoked projection authorizations cause zero actual model calls", async () => {
  for (const condition of ["denied", "abort", "expire", "revoked", "failure"] as const) {
    const f = fixture(), authorized = deferred<boolean>();
    const handle = { authorize: () => authorized.promise, projection: () => condition === "revoked" ? undefined : projection };
    const generation = f.transport.generate(handle, f.budget);
    if (condition === "abort") f.abort.abort();
    if (condition === "expire") f.expire();
    if (condition === "failure") authorized.reject(new Error("synthetic unavailable"));
    else authorized.resolve(condition !== "denied");
    await assert.rejects(generation); assert.equal(f.calls.length, 0);
  }
});
test("once actual generation starts abort does not settle wrapper before underlying stop confirmation", async () => {
  const f = fixture(); let settled = false;
  const generation = f.transport.generate({ authorize: async () => true, projection: () => projection }, f.budget);
  void generation.then(() => { settled = true; }); await Promise.resolve(); assert.equal(f.calls.length, 1);
  f.abort.abort(); await Promise.resolve(); await Promise.resolve(); assert.equal(settled, false);
  f.completion.resolve(valid()); await generation; assert.equal(settled, true);
});
