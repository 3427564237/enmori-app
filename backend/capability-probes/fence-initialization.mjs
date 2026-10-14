import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// A finite synthetic control-only experiment, not a message-store adapter.
// No model, Auth principal, message, Note or content write is issued. Callback
// gates precede SDK commit, so they never stand for wire-level ACK loss/cancel.
const conflictCodes = new Set([6, 10]);
const code = (error) => Number.isInteger(error?.code) ? error.code : null;
function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

export async function probeFenceInitialization(firestore, report) {
  const owned = new Map();
  const pending = new Set();
  const ref = (path) => {
    const value = firestore.doc(path);
    owned.set(path, value);
    return value;
  };
  const runtime = ref("ai_runtime_fence/current");
  const ownerAccountId = randomUUID();
  const conversationId = randomUUID();
  const userMessageId = randomUUID();
  const tracked = (action) => {
    const promise = action();
    pending.add(promise);
    // An SDK rejection must have a handler before any callback gate is awaited.
    promise.then(() => pending.delete(promise), () => pending.delete(promise));
    return promise;
  };
  const guardRecord = (epoch, state, revision = 1) => ({
    ownerAccountId, conversationId, userMessageId, kind: "send",
    targetKind: "reserved_new", processEpoch: epoch, revision, state,
  });
  const readRuntime = async () => {
    const snap = await tracked(() => runtime.get());
    assert.equal(snap.exists, true);
    return snap.data();
  };
  const close = (operation, originalEpoch) => tracked(() => firestore.runTransaction(async transaction => {
    const current = await transaction.get(runtime);
    const previous = await transaction.get(operation);
    assert.equal(current.exists, true);
    if (previous.exists) {
      assert.equal(previous.get("processEpoch"), originalEpoch);
      if (previous.get("state") === "closed") return "already-closed";
      assert.equal(previous.get("state"), "open");
      transaction.update(operation, { state: "closed", revision: previous.get("revision") + 1 });
      return "closed-existing";
    }
    transaction.create(operation, guardRecord(originalEpoch, "closed"));
    return "closed-placeholder";
  }, { maxAttempts: 1 }));
  const initialize = (operation, originalEpoch, ready, proceed, attempts) => tracked(() => firestore.runTransaction(async transaction => {
    attempts.count += 1;
    try {
      const current = await transaction.get(runtime);
      const previous = await transaction.get(operation);
      ready?.release();
      if (proceed) await proceed.promise;
      if (!current.exists || current.get("processEpoch") !== originalEpoch) return "epoch-refused";
      if (previous.exists) {
        assert.equal(previous.get("processEpoch"), originalEpoch);
        assert.equal(previous.get("state"), "closed");
        return "closed-refused";
      }
      transaction.create(operation, guardRecord(originalEpoch, "open"));
      return "opened";
    } finally { ready?.release(); }
  }, { maxAttempts: 1 }));
  const observeRejectedOrValue = (result) => {
    if (result.status === "fulfilled") return { outcome: result.value, dependencyCode: null };
    assert.equal(conflictCodes.has(code(result.reason)), true, "Unexpected SDK rejection category");
    return { outcome: "conflict-rejected", dependencyCode: code(result.reason) };
  };
  const awaitReady = async (ready, operations) => {
    let timer;
    try {
      await Promise.race([
        Promise.all(ready.map(item => item.promise)),
        Promise.allSettled(operations).then(() => { throw new Error("callbacks_settled_before_ready"); }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("callback_gate_timeout")), 10_000); }),
      ]);
    } finally { clearTimeout(timer); }
  };
  let processEpoch = randomUUID();
  try {
    await tracked(() => runtime.create({ processEpoch, generation: 1, cleanupGeneration: 0 }));
    report("initialization-fixture", { outcome: "pass", maxOwnedDocuments: 4,
      transactionMaxAttempts: 1, contentWrites: 0, callbackGateBoundMs: 10_000,
      cloudCalls: 0, liveModelCalls: 0 });

    // Cancel precedes completion of a prepare/initialization opportunity: an
    // absent guard becomes a retained closed placeholder, never permission.
    const delayed = ref(`ai_operation_fences/${randomUUID()}`);
    assert.equal(await close(delayed, processEpoch), "closed-placeholder");
    const lateAttempts = { count: 0 };
    assert.equal(await initialize(delayed, processEpoch, undefined, undefined, lateAttempts), "closed-refused");
    const delayedObserved = await tracked(() => delayed.get());
    assert.equal(delayedObserved.get("state"), "closed");
    assert.equal(delayedObserved.get("revision"), 1);
    report("closed-placeholder-before-initialize", { outcome: "pass", initializerAttempts: lateAttempts.count,
      closedPreserved: true, placeholderRetainedThroughSettlement: true,
      provesContentNoEffect: false });

    // Two real transaction callbacks read the same absent operation, then are
    // released together. Either legal commit order may occur; maxAttempts:1
    // gives no implicit replay. A fresh bounded control close settles the open
    // winner if needed, rather than describing a rejected close as confirmed.
    const raced = ref(`ai_operation_fences/${randomUUID()}`);
    const initialReady = gate();
    const closeReady = gate();
    const go = gate();
    const initAttempts = { count: 0 };
    let closeAttempts = 0;
    const initial = initialize(raced, processEpoch, initialReady, go, initAttempts);
    const closing = tracked(() => firestore.runTransaction(async transaction => {
      closeAttempts += 1;
      try {
        const current = await transaction.get(runtime);
        const previous = await transaction.get(raced);
        assert.equal(current.get("processEpoch"), processEpoch);
        assert.equal(previous.exists, false);
        closeReady.release();
        await go.promise;
        transaction.create(raced, guardRecord(processEpoch, "closed"));
        return "closed-placeholder";
      } finally { closeReady.release(); }
    }, { maxAttempts: 1 }));
    try { await awaitReady([initialReady, closeReady], [initial, closing]); }
    finally { go.release(); }
    const results = await Promise.allSettled([initial, closing]);
    const dispositions = results.map(observeRejectedOrValue);
    assert.equal(initAttempts.count, 1);
    assert.equal(closeAttempts, 1);
    const finalClose = await close(raced, processEpoch);
    const settled = await tracked(() => raced.get());
    assert.equal(settled.get("state"), "closed");
    const freshAttempts = { count: 0 };
    assert.equal(await initialize(raced, processEpoch, undefined, undefined, freshAttempts), "closed-refused");
    report("concurrent-initialize-and-placeholder-close", { outcome: "pass",
      initializerAttempts: initAttempts.count, closerAttempts: closeAttempts,
      initializerDisposition: dispositions[0].outcome, initializerCode: dispositions[0].dependencyCode,
      closerDisposition: dispositions[1].outcome, closerCode: dispositions[1].dependencyCode,
      finalClose, finalClosedObserved: true, freshInitializerRefused: true,
      callbacksHeldBeforeCommit: true, wireDispatchObserved: false, arbitrarySchedulesProved: false });

    // Startup epoch rotation races one old initialization. A content-free
    // checkpoint after the confirmed rotation rejects that original epoch even
    // if its guard committed first. No old model execution is reconstructed.
    const restarting = ref(`ai_operation_fences/${randomUUID()}`);
    const oldEpoch = processEpoch;
    const newEpoch = randomUUID();
    const originalReady = gate();
    const rotationReady = gate();
    const restartGo = gate();
    const restartAttempts = { count: 0 };
    let rotationAttempts = 0;
    const original = initialize(restarting, oldEpoch, originalReady, restartGo, restartAttempts);
    const rotation = tracked(() => firestore.runTransaction(async transaction => {
      rotationAttempts += 1;
      try {
        const current = await transaction.get(runtime);
        assert.equal(current.get("processEpoch"), oldEpoch);
        rotationReady.release();
        await restartGo.promise;
        transaction.update(runtime, { processEpoch: newEpoch, generation: current.get("generation") + 1 });
        return "rotated";
      } finally { rotationReady.release(); }
    }, { maxAttempts: 1 }));
    try { await awaitReady([originalReady, rotationReady], [original, rotation]); }
    finally { restartGo.release(); }
    const restartResults = await Promise.allSettled([original, rotation]);
    const restartDispositions = restartResults.map(observeRejectedOrValue);
    assert.equal(restartAttempts.count, 1);
    assert.equal(rotationAttempts, 1);
    // A failed racing rotation is not restart proof. One distinct, explicit,
    // post-settlement attempt confirms rotation before checkpoint observation.
    if (restartResults[1].status !== "fulfilled") {
      await tracked(() => firestore.runTransaction(async transaction => {
        const current = await transaction.get(runtime);
        assert.equal(current.get("processEpoch"), oldEpoch);
        transaction.update(runtime, { processEpoch: newEpoch, generation: current.get("generation") + 1 });
      }, { maxAttempts: 1 }));
    }
    processEpoch = newEpoch;
    const confirmed = await readRuntime();
    assert.equal(confirmed.processEpoch, newEpoch);
    assert.equal(confirmed.generation, 2);
    assert.equal(confirmed.cleanupGeneration, 0);
    const checkpoint = await tracked(() => firestore.runTransaction(async transaction => {
      const current = await transaction.get(runtime);
      const guard = await transaction.get(restarting);
      return { originalEpochAllowed: current.get("processEpoch") === oldEpoch,
        oldGuardPresent: guard.exists };
    }, { maxAttempts: 1 }));
    assert.equal(checkpoint.originalEpochAllowed, false);
    const oldLateAttempts = { count: 0 };
    assert.equal(await initialize(restarting, oldEpoch, undefined, undefined, oldLateAttempts), "epoch-refused");
    await close(restarting, oldEpoch);
    report("concurrent-initialize-and-startup-epoch", { outcome: "pass",
      initializerAttempts: restartAttempts.count, rotationAttempts,
      initializerDisposition: restartDispositions[0].outcome, initializerCode: restartDispositions[0].dependencyCode,
      rotationDisposition: restartDispositions[1].outcome, rotationCode: restartDispositions[1].dependencyCode,
      extraExplicitRotation: restartResults[1].status !== "fulfilled",
      confirmedGeneration: confirmed.generation, originalEpochAllowed: checkpoint.originalEpochAllowed,
      oldGuardPresent: checkpoint.oldGuardPresent, freshOldInitializerRefused: true,
      contentWriteAtomicityProved: false, receiptOrModelRecoveryImplemented: false,
      ackLossInjected: false, arbitrarySchedulesProved: false });
  } finally {
    // All gates above are released in their local finally before reaching here.
    // Never delete an unresolved control just because the fixture is finished.
    const outstanding = [...pending];
    await Promise.allSettled(outstanding);
    assert.equal(pending.size, 0);
    const removal = firestore.batch();
    for (const value of owned.values()) removal.delete(value);
    await tracked(() => removal.commit());
    const remaining = await tracked(() => firestore.getAll(...owned.values()));
    assert.equal(remaining.every(item => !item.exists), true);
    report("initialization-owned-cleanup", { outcome: "pass", ownedReferences: owned.size,
      allOwnedReferencesAbsent: true, pendingOperations: pending.size,
      cleanupProvesProductSla: false });
  }
}
