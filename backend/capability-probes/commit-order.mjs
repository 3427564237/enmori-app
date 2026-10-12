import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

// Standalone synthetic fixtures only. The guarded launcher owns the demo
// Emulator instance; neither probe resets a database or touches product paths.
function fixture(firestore) {
  const collection = firestore.collection(`_slice_a_${randomUUID()}`);
  const pending = [];
  return {
    collection,
    doc: () => collection.doc(randomUUID()),
    track(promise) {
      pending.push(promise);
      // Attach a handler immediately; all operations are still checked below.
      promise.catch(() => {});
      return promise;
    },
    async cleanup(report, name) {
      await Promise.allSettled(pending);
      const before = await collection.get();
      if (!before.empty) {
        const batch = firestore.batch();
        for (const doc of before.docs) batch.delete(doc.ref);
        await batch.commit();
      }
      const after = await collection.get();
      await report(`${name}-cleanup`, {
        pendingSettled: pending.length,
        deletedDocuments: before.size,
        remainingDocuments: after.size,
      });
      assert.equal(after.size, 0, "Synthetic fixture cleanup must be complete");
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function milliseconds(start) {
  return Math.round((performance.now() - start) * 1000) / 1000;
}

async function mustExist(ref, expectedValue) {
  const snapshot = await ref.get();
  assert.equal(snapshot.exists, true, "Expected synthetic effect must persist");
  assert.equal(snapshot.get("value"), expectedValue);
  return snapshot;
}

/**
 * Observe causal orders that are actually visible to this public SDK.
 * A returned commit Promise is NOT evidence that an RPC reached the server.
 * A local marker is deliberately not supplied to an invented SDK cancel API.
 * No wall clock/server clock comparison or simulated ACK loss is used.
 */
export async function probeCommitOrder(firestore, report) {
  const data = fixture(firestore);
  const started = performance.now();
  try {
    // Deliberately omit an application admission check: the SDK itself has no
    // connection to this local marker and still accepts the subsequent write.
    const beforeCall = data.doc();
    let sequence = 0;
    const markerBeforeCall = ++sequence;
    const callAfterMarker = ++sequence;
    const beforeAck = await data.track(beforeCall.create({ value: 1 }));
    const ackAfterMarker = ++sequence;
    const beforeSnapshot = await mustExist(beforeCall, 1);
    assert.equal(beforeSnapshot.updateTime.isEqual(beforeAck.writeTime), true);
    await report("commit-order-marker-before-call", {
      markerSequence: markerBeforeCall,
      sdkCallSequence: callAfterMarker,
      ackSequence: ackAfterMarker,
      persistedEffects: 1,
      localMarkerCancelsSdk: false,
    });

    const afterCall = data.doc();
    sequence = 0;
    const commitPromise = data.track(afterCall.create({ value: 1 }));
    const returnedPromiseSequence = ++sequence;
    const markerAfterCall = ++sequence;
    const afterAck = await commitPromise;
    const observedAckSequence = ++sequence;
    const afterSnapshot = await mustExist(afterCall, 1);
    assert.equal(afterSnapshot.updateTime.isEqual(afterAck.writeTime), true);
    await report("commit-order-marker-after-call-return", {
      sdkPromiseReturnedSequence: returnedPromiseSequence,
      markerSequence: markerAfterCall,
      ackObservedSequence: observedAckSequence,
      persistedEffects: 1,
      wireDispatchObserved: false,
      serverCommitVsLocalMarkerOrderProved: false,
      ackLossInjected: false,
    });

    // This lane proves only callback/commit ordering. The transaction has read
    // its fixture, but its callback is held BEFORE it returns to SDK commit.
    const heldEffect = data.doc();
    const ready = deferred();
    const release = deferred();
    let callbackAttempts = 0;
    sequence = 0;
    let callbackReadySequence;
    let callbackReleasedSequence;
    const held = data.track(
      firestore.runTransaction(async (transaction) => {
        callbackAttempts += 1;
        try {
          const snapshot = await transaction.get(heldEffect);
          assert.equal(snapshot.exists, false);
          callbackReadySequence = ++sequence;
          ready.resolve();
          await release.promise;
          callbackReleasedSequence = ++sequence;
          transaction.create(heldEffect, { value: 1 });
        } catch (error) {
          ready.resolve();
          throw error;
        }
      }, { maxAttempts: 1 }),
    );
    let heldMarkerSequence;
    try {
      // If SDK initialization rejects before entering the callback, do not
      // leave the local fixture waiting forever for an unreachable signal.
      await Promise.race([ready.promise, held]);
      heldMarkerSequence = ++sequence;
    } finally {
      release.resolve();
    }
    await held;
    const heldAckSequence = ++sequence;
    await mustExist(heldEffect, 1);
    assert.equal(callbackAttempts, 1);
    assert.ok(callbackReadySequence < heldMarkerSequence);
    assert.ok(heldMarkerSequence < callbackReleasedSequence);
    assert.ok(callbackReleasedSequence < heldAckSequence);
    await report("commit-order-callback-held", {
      callbackReadySequence,
      markerSequence: heldMarkerSequence,
      callbackReleasedSequence,
      ackSequence: heldAckSequence,
      callbackAttempts,
      persistedEffects: 1,
      commitInvokedAfterMarker: true,
      commitRpcAlreadyIssuedAtMarker: false,
    });

    // A separate persisted fixture barrier is checked inside the writer's real
    // transaction. These are two explicit causal orders, not a claim that a
    // local cancel/deadline can atomically linearize against every server write.
    for (const barrierFirst of [false, true]) {
      const barrier = data.doc();
      const effect = data.doc();
      await barrier.create({ closed: false });
      sequence = 0;
      let markerSequence;
      let barrierAckSequence;
      let writerAckSequence;
      let writerAttempts = 0;
      const write = () => data.track(firestore.runTransaction(
        async (transaction) => {
          writerAttempts += 1;
          const snapshot = await transaction.get(barrier);
          assert.equal(snapshot.exists, true);
          if (snapshot.get("closed") === true) return false;
          assert.equal(snapshot.get("closed"), false);
          transaction.create(effect, { value: 1 });
          return true;
        },
        { maxAttempts: 1 },
      ));
      let admitted;
      if (barrierFirst) {
        markerSequence = ++sequence;
        await data.track(barrier.update({ closed: true }));
        barrierAckSequence = ++sequence;
        admitted = await write();
        writerAckSequence = ++sequence;
      } else {
        admitted = await write();
        writerAckSequence = ++sequence;
        markerSequence = ++sequence;
        await data.track(barrier.update({ closed: true }));
        barrierAckSequence = ++sequence;
      }
      const effectSnapshot = await effect.get();
      const barrierSnapshot = await barrier.get();
      assert.equal(barrierSnapshot.get("closed"), true);
      assert.equal(admitted, !barrierFirst);
      assert.equal(effectSnapshot.exists, !barrierFirst);
      assert.equal(writerAttempts, 1);
      await report(barrierFirst ? "barrier-before-writer" : "writer-before-barrier", {
        markerSequence,
        barrierAckSequence,
        writerCompletionSequence: writerAckSequence,
        writerAttempts,
        persistedEffects: Number(effectSnapshot.exists),
        barrierConfirmedClosed: true,
      });
    }
    await report("commit-order-scope", {
      elapsedMs: milliseconds(started),
      ackLossInjected: false,
      atomicLocalCancellationProved: false,
      arbitraryConcurrentBarrierOrderingProved: false,
      f01ClosureProved: false,
    });
  } finally {
    await data.cleanup(report, "commit-order");
  }
}

/**
 * Both transactions acquire different initial documents, then request the
 * opposite document. The resulting server lock conflict is real: no fabricated
 * ABORTED error is thrown and no callback awaits an external same-document write.
 * Only first attempts rendezvous; retry callbacks can proceed independently.
 */
async function conflictRound(firestore, data, maxAttempts) {
  const left = data.doc();
  const right = data.doc();
  const initial = firestore.batch();
  initial.create(left, { value: 0 });
  initial.create(right, { value: 0 });
  await initial.commit();
  const gate = deferred();
  let arrivals = 0;
  let gateTimedOut = false;
  const attempts = [0, 0];
  const started = performance.now();
  // A JavaScript fixture failure must release its peer, never hang that peer.
  const gateTimer = setTimeout(() => {
    gateTimedOut = true;
    gate.resolve();
  }, 5000);
  try {
    const transactions = [0, 1].map((index) => data.track(
      firestore.runTransaction(async (transaction) => {
        attempts[index] += 1;
        try {
          const firstRef = index === 0 ? left : right;
          const secondRef = index === 0 ? right : left;
          const first = await transaction.get(firstRef);
          if (attempts[index] === 1) {
            arrivals += 1;
            if (arrivals === 2) {
              clearTimeout(gateTimer);
              gate.resolve();
            }
            await gate.promise;
            assert.equal(gateTimedOut, false, "Synthetic conflict rendezvous timed out");
          }
          const second = await transaction.get(secondRef);
          assert.equal(first.exists, true);
          assert.equal(second.exists, true);
          assert.equal(first.get("value"), second.get("value"));
          transaction.update(firstRef, { value: first.get("value") + 1 });
          transaction.update(secondRef, { value: second.get("value") + 1 });
        } catch (error) {
          // Release a peer even if this transaction's first get fails.
          gate.resolve();
          throw error;
        }
      }, { maxAttempts }),
    ));
    const settled = await Promise.allSettled(transactions);
    assert.equal(gateTimedOut, false, "Synthetic conflict rendezvous timed out");
    assert.equal(arrivals, 2, "Both first attempts must enter the conflict fixture");
    const errorCodes = settled
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.code);
    // 10 is gRPC ABORTED; 409 is the equivalent status accepted by SDK 8.7.1.
    // Network/auth/programming failures must fail the probe, not be called a
    // capability limitation or counted as the intended conflict.
    const unexpected = settled.find((result) => result.status === "rejected" &&
      result.reason?.code !== 10 && result.reason?.code !== 409);
    // Let the runner retain only a stable numeric code; do not print the raw
    // error or replace a real dependency failure with a false capability result.
    if (unexpected !== undefined) throw unexpected.reason;
    assert.ok(attempts.every((count) => count >= 1 && count <= maxAttempts));
    const successfulCommits = settled.filter((result) => result.status === "fulfilled").length;
    const snapshots = await firestore.getAll(left, right);
    assert.equal(snapshots[0].get("value"), successfulCommits);
    assert.equal(snapshots[1].get("value"), successfulCommits);
    return {
      maxAttempts,
      callbackAttempts: attempts,
      successfulCommits,
      durableCounterValues: snapshots.map((snapshot) => snapshot.get("value")),
      observedRejectedCodes: errorCodes,
      retryCallbacksObserved: attempts.reduce((sum, count) => sum + count - 1, 0),
      actualConflictObserved: errorCodes.length > 0 || attempts.some((count) => count > 1),
      elapsedMs: milliseconds(started),
    };
  } finally {
    clearTimeout(gateTimer);
    gate.resolve();
  }
}

export async function probeRetry(firestore, report) {
  const data = fixture(firestore);
  try {
    for (const maxAttempts of [1, 3]) {
      const metrics = await conflictRound(firestore, data, maxAttempts);
      await report(`transaction-retry-max-${maxAttempts}`, metrics);
      if (!metrics.actualConflictObserved ||
          (maxAttempts > 1 && metrics.retryCallbacksObserved === 0)) {
        // Successful serialization can be a valid server outcome; it does not
        // demonstrate retries. Report this separately instead of claiming PASS.
        await report("transaction-retry-not-observed", {
          maxAttempts,
          actualConflictObserved: metrics.actualConflictObserved,
          retryCallbacksObserved: metrics.retryCallbacksObserved,
          capabilityProved: false,
        });
      }
    }
    await report("transaction-retry-scope", {
      maxAttemptsOptionsAccepted: [1, 3],
      callbackCountSeparateFromDurableCommitCount: true,
      ackLossInjected: false,
      ackLossResolutionProved: false,
      maxAttemptsOneCancelsPendingRpcProved: false,
      f01ClosureProved: false,
    });
  } finally {
    await data.cleanup(report, "transaction-retry");
  }
}
