import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAiRuntime } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import { CloudAdmissionOwner } from "../../src/ai-runtime/application/cloud-admission-owner.js";
import type { CloudGenerationObservation, CloudGenerationTransport, CloudRecoveryAuthority } from "../../src/ai-runtime/ports/cloud-generation-transport.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../../src/ai-conversation/application/async-conversation-generation-transport.js";
import type { AsyncConversationModelInput } from "../../src/ai-conversation/ports/async-conversation.js";
import { valid, flush } from "../ai-runtime/support.js";
import { fixture, id, operation, until } from "./async-conversation-fakes.js";

test("cloud unknown preserves the real Application fake-store target fence while an independent target completes", async () => {
  let owner!: CloudAdmissionOwner<AsyncConversationModelInput>;
  const lease = {};
  const authority: CloudRecoveryAuthority = {
    recover: async () => ({ kind: "confirmed", lease, reservations: [], previousRemote: "none_confirmed" }),
    current: token => token === lease,
    reserve: async (_token, _input, live) => live() ? "confirmed" : "rejected",
  };
  const f = fixture(undefined, (clock, model) => {
    const authorized = new AuthorizedAsyncConversationGenerationTransport(model);
    // Fake cloud envelope only. The existing authorized projection and fake
    // store/application remain the real code under test; no provider is called.
    const cloud: CloudGenerationTransport<AsyncConversationModelInput> = {
      dispatch: (input, budget): Promise<CloudGenerationObservation> => authorized.generate(input, budget).then(
        raw => ({ kind: "response", physical: "stopped", raw }),
        () => ({ kind: "unknown", physical: "unknown" })),
    };
    owner = new CloudAdmissionOwner(clock, cloud, authority,
      { windowMs: 1_000, maxRequests: 10, maxTokens: 100, tokensPerRequest: 10 });
    return new BoundedAiRuntime(clock, { kind: "cloud", owner });
  });
  assert.equal(await owner.recover(), true);
  const op = operation(), first = f.create(op), firstAdmission = await f.app.dispatch(first);
  assert.equal(firstAdmission.accepted, true); if (!firstAdmission.accepted) return;
  await until(() => f.calls.length === 1);
  assert.equal(f.store.pending.get(op.userMessageId), op.operationId);
  await f.app.cancel(first, f.who);
  assert.equal((await firstAdmission.request.outcome).ok, false);
  assert.equal(owner.state.remoteUnknown, 1);
  assert.equal(f.store.pending.get(op.userMessageId), op.operationId);

  // The same original operation cannot be silently dispatched a second time.
  const duplicate = f.create(op), duplicateAdmission = await f.app.dispatch(duplicate);
  assert.equal(duplicateAdmission.accepted, true); if (!duplicateAdmission.accepted) return;
  assert.equal((await duplicateAdmission.request.outcome).ok, false);
  assert.equal(f.calls.length, 1);

  // A different Retry operation for the same user message still needs the
  // original pending/readback fence to be closed; cloud timeout is not proof.
  const saved = f.store.rows.get(op.userMessageId)!.user;
  const retry = f.create({ ...op, operationId: id(2), kind: "retry", targetKind: "existing" }, "Synthetic current input", saved);
  const retryAdmission = await f.app.dispatch(retry);
  assert.equal(retryAdmission.accepted, true); if (!retryAdmission.accepted) return;
  assert.equal((await retryAdmission.request.outcome).ok, false);
  assert.equal(f.calls.length, 1); assert.equal(f.store.pending.get(op.userMessageId), op.operationId);

  const nextOp = operation(10), independent = f.create(nextOp, "A new synthetic topic");
  const nextAdmission = await f.app.dispatch(independent);
  assert.equal(nextAdmission.accepted, true); if (!nextAdmission.accepted) return;
  await until(() => f.calls.length === 2);
  assert.equal(f.store.pending.get(nextOp.userMessageId), nextOp.operationId);
  f.calls[0]!.completion.resolve(valid("late A must be discarded")); await flush();
  assert.equal(f.delivered.length, 0);
  assert.equal(f.store.rows.get(op.userMessageId)!.assistantMessageId, undefined);
  assert.equal(f.store.pending.get(nextOp.userMessageId), nextOp.operationId);
  assert.equal(f.runtime.state.nonTerminal, 1);
  f.calls[1]!.completion.resolve(valid("independent B"));
  assert.equal((await nextAdmission.request.outcome).ok, true);
  assert.equal(f.delivered.length, 1); assert.equal(f.delivered[0]!.operation.operationId, nextOp.operationId);
  assert.equal(f.store.pending.get(op.userMessageId), op.operationId);
  assert.equal(f.store.pending.has(nextOp.userMessageId), false);
  assert.equal(owner.state.remoteUnknown, 0);
});
