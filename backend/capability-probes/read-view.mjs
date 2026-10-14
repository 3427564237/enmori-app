import assert, { AssertionError } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { FieldPath, Timestamp } from "firebase-admin/firestore";

// Disposable Slice A fixtures only. Each probe deletes only its own identities;
// the guarded runner owns the final residual check, not a whole-database reset.
const NANOSECONDS = 1_000_000_000n;
const CAPABILITY_REJECTION_CODES = new Set([3, 9, 12]);

function numericCode(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  return Number.isInteger(code) && code >= 0 && code <= 16 ? code : null;
}

function isTimestamp(value) {
  return value !== undefined && Number.isSafeInteger(value.seconds)
    && Number.isInteger(value.nanoseconds)
    && value.nanoseconds >= 0 && value.nanoseconds < 1_000_000_000;
}

function instant(value) {
  assert.ok(isTimestamp(value), "probe_timestamp_shape");
  return BigInt(value.seconds) * NANOSECONDS + BigInt(value.nanoseconds);
}

function difference(later, earlier) {
  // Decimal relative durations avoid both absolute timestamps and Number loss.
  return (instant(later) - instant(earlier)).toString();
}

function sameTime(left, right) {
  return isTimestamp(left) && isTimestamp(right)
    && left.seconds === right.seconds && left.nanoseconds === right.nanoseconds;
}

function fixtureCollection(firestore) {
  // Namespace and document identities stay in process memory, never report().
  return firestore.collection(`capability_probe_${randomUUID().replaceAll("-", "")}`);
}

function assertSnapshot(snapshot, expectedRef, revision) {
  assert.ok(snapshot.exists, "read_view_expected_document_missing");
  assert.ok(snapshot.ref.isEqual(expectedRef), "read_view_document_identity_changed");
  assert.ok(snapshot.get("revision") === revision, "read_view_revision_mismatch");
}

function snapshotMatches(snapshot, expectedRef, revision) {
  return snapshot.exists && snapshot.ref.isEqual(expectedRef)
    && snapshot.get("revision") === revision;
}

async function cleanupFixtures(firestore, collection, refs, report, caseName) {
  try {
    const removal = firestore.batch();
    for (const ref of refs) removal.delete(ref);
    await removal.commit();
    const residual = await collection.limit(1).get();
    await report(`${caseName}_cleanup`, {
      status: residual.empty ? "observed_empty" : "failed",
      attemptedDocumentDeletes: refs.length,
      observedResidualRows: residual.size,
    });
    assert.ok(residual.empty, "probe_owned_fixture_residual");
  } catch (error) {
    if (error instanceof AssertionError) throw error;
    await report(`${caseName}_cleanup`, {
      status: "failed", reason: "owned_fixture_cleanup_unconfirmed",
      errorCode: numericCode(error),
    });
    // No vendor error/cause or private reference escapes the cleanup boundary.
    throw new Error("capability_owned_fixture_cleanup_unconfirmed");
  }
}

async function readViewCase(firestore, report, anchorKind) {
  const collection = fixtureCollection(firestore);
  const first = collection.doc();
  const second = collection.doc();
  const inserted = collection.doc();
  const caseName = `read_view_${anchorKind}`;
  try {
    const seed = firestore.batch();
    seed.create(first, { revision: 0 });
    seed.create(second, { revision: 0 });
    await seed.commit();
    const baseline = await firestore.getAll(first, second);
    assertSnapshot(baseline[0], first, 0);
    assertSnapshot(baseline[1], second, 0);

    if (!baseline.every((entry) => isTimestamp(entry.readTime)
      && isTimestamp(entry.createTime) && isTimestamp(entry.updateTime))) {
      await report(caseName, { status: "insufficient", reason: "baseline_metadata_missing" });
      return;
    }

    const readTime = anchorKind === "server_read_time"
      ? baseline[0].readTime : Timestamp.now();
    // The UTC case is not silently replaced with a server timestamp if the local
    // clock cannot identify a point containing the acknowledged seed documents.
    const includesAcknowledgedSeed = baseline.every((entry) =>
      instant(readTime) >= instant(entry.updateTime));
    let attempts = 0;
    let mutationAcknowledged = false;
    let transactionReadTimesMatch = false;
    let historicalDocumentsMatch = false;
    let historicalQueryMatches = false;
    let historicalQueryRows = 0;

    if (!includesAcknowledgedSeed) {
      await report(caseName, {
        status: "insufficient", reason: "anchor_precedes_acknowledged_seed",
        anchorMinusSeedNanoseconds: difference(readTime, baseline[0].updateTime),
        usedLatestFallback: false,
      });
      return;
    }

    try {
      await firestore.runTransaction(async (transaction) => {
        attempts += 1;
        const before = await transaction.get(first);

        // Await a distinct write's acknowledgement between historical reads.
        // A read-only transaction must not depend on that writer's latest view.
        if (!mutationAcknowledged) {
          const mutation = firestore.batch();
          mutation.update(first, { revision: 1 });
          mutation.update(second, { revision: 1 });
          mutation.create(inserted, { revision: 1 });
          await mutation.commit();
          mutationAcknowledged = true;
        }

        const after = await transaction.get(second);
        const rows = await transaction.get(collection.orderBy(FieldPath.documentId()));
        const repeated = await transaction.get(first);
        historicalDocumentsMatch = snapshotMatches(before, first, 0)
          && snapshotMatches(after, second, 0) && snapshotMatches(repeated, first, 0);
        historicalQueryRows = rows.size;
        historicalQueryMatches = rows.size === 2
          && rows.docs.every((row) => row.get("revision") === 0)
          && rows.docs.some((row) => row.ref.isEqual(first))
          && rows.docs.some((row) => row.ref.isEqual(second));
        transactionReadTimesMatch = [before, after, repeated, rows, ...rows.docs]
          .every((entry) => sameTime(entry.readTime, readTime));
      }, { readOnly: true, readTime });

      const latest = await firestore.getAll(first, second, inserted);
      assertSnapshot(latest[0], first, 1);
      assertSnapshot(latest[1], second, 1);
      assertSnapshot(latest[2], inserted, 1);
      const supported = historicalDocumentsMatch && historicalQueryMatches
        && transactionReadTimesMatch && attempts === 1;
      await report(caseName, {
        status: supported ? "supported" : "insufficient",
        reason: supported ? "historical_view_observed" : "fixed_view_guarantee_not_observed",
        attempts, mutationAcknowledged,
        historicalDocumentsMatch, historicalQueryMatches,
        historicalQueryRows, latestDocuments: 3, transactionReadTimesMatch,
        latestMutationConfirmed: true, usedLatestFallback: false,
        provesCloudSupport: false, provesProductAuthority: false,
      });
    } catch (error) {
      if (error instanceof AssertionError) {
        await report(caseName, {
          status: "failed", reason: "unexpected_snapshot_or_callback_result",
          attempts, mutationAcknowledged, usedLatestFallback: false,
        });
        throw error;
      }
      const code = numericCode(error);
      if (code === null) {
        await report(caseName, {
          status: "failed", reason: "unexpected_probe_runtime_error",
          attempts, mutationAcknowledged, usedLatestFallback: false,
        });
        throw error;
      }
      await report(caseName, {
        status: CAPABILITY_REJECTION_CODES.has(code) ? "rejected" : "insufficient",
        reason: "sdk_or_emulator_did_not_complete_fixed_view",
        errorCode: code, attempts, mutationAcknowledged, usedLatestFallback: false,
      });
    }
  } finally {
    await cleanupFixtures(firestore, collection, [first, second, inserted], report, caseName);
  }
}

/** Observe one fixed historical view, never fall back to a latest transaction. */
export async function probeReadView(firestore, report) {
  await readViewCase(firestore, report, "server_read_time");
  await readViewCase(firestore, report, "backend_utc");
}

/** Metadata observations only: no claim of controllable 1ns physical commits. */
export async function probeMetadata(firestore, report) {
  const collection = fixtureCollection(firestore);
  const ref = collection.doc();
  try {
    const createdWrite = await ref.create({ revision: 0 });
    const created = await ref.get();
    assertSnapshot(created, ref, 0);
    const updatedWrite = await ref.update({ revision: 1 });
    const updated = await ref.get();
    assertSnapshot(updated, ref, 1);
    const repeated = await ref.get();
    assertSnapshot(repeated, ref, 1);

    const timestamps = [created.createTime, created.updateTime, created.readTime,
      updated.createTime, updated.updateTime, updated.readTime,
      repeated.createTime, repeated.updateTime, repeated.readTime,
      createdWrite.writeTime, updatedWrite.writeTime];
    if (!timestamps.every(isTimestamp)) {
      await report("metadata_identity_precision", {
        status: "insufficient", reason: "required_metadata_missing",
      });
      return;
    }
    const createTimeUnchangedAfterUpdate = sameTime(created.createTime, updated.createTime)
      && sameTime(created.createTime, repeated.createTime);
    const updateTimeDidNotRegress = instant(updated.updateTime) >= instant(created.updateTime);
    const readDidNotChangeUpdateTime = sameTime(updated.updateTime, repeated.updateTime);
    const readTimesConsistent = instant(created.readTime) >= instant(created.updateTime)
      && instant(updated.readTime) >= instant(updated.updateTime)
      && instant(repeated.readTime) >= instant(updated.readTime);
    const supported = createTimeUnchangedAfterUpdate && updateTimeDidNotRegress
      && readDidNotChangeUpdateTime && readTimesConsistent;

    await report("metadata_identity_precision", {
      status: supported ? "supported" : "insufficient",
      reason: supported ? "metadata_identity_observed" : "metadata_guarantee_not_observed",
      sameDocumentIdentity: true, createTimeUnchangedAfterUpdate,
      updateTimeDidNotRegress, readDidNotChangeUpdateTime, readTimesConsistent,
      updateTimeAdvanced: instant(updated.updateTime) > instant(created.updateTime),
      updateMinusCreateNanoseconds: difference(updated.updateTime, created.createTime),
      firstReadMinusCreateNanoseconds: difference(created.readTime, created.createTime),
      secondReadMinusUpdateNanoseconds: difference(updated.readTime, updated.updateTime),
      repeatedReadDeltaNanoseconds: difference(repeated.readTime, updated.readTime),
      createMetadataSubMicrosecondRemainder: created.createTime.nanoseconds % 1_000,
      updateMetadataSubMicrosecondRemainder: updated.updateTime.nanoseconds % 1_000,
      readMetadataSubMicrosecondRemainder: updated.readTime.nanoseconds % 1_000,
      createMetadataSubMillisecondRemainder: created.createTime.nanoseconds % 1_000_000,
      updateMetadataSubMillisecondRemainder: updated.updateTime.nanoseconds % 1_000_000,
      writeResultMatchesCreateMetadata: sameTime(createdWrite.writeTime, created.createTime),
      writeResultMatchesUpdateMetadata: sameTime(updatedWrite.writeTime, updated.updateTime),
      serverTimestampTransformUsed: false,
      provesPhysicalCommitInstant: false, provesControllableOneNanosecondCommit: false,
    });
  } catch (error) {
    if (error instanceof AssertionError) {
      await report("metadata_identity_precision", {
        status: "failed", reason: "unexpected_metadata_or_identity_result",
      });
      throw error;
    }
    const code = numericCode(error);
    if (code === null) {
      await report("metadata_identity_precision", {
        status: "failed", reason: "unexpected_probe_runtime_error",
      });
      throw error;
    }
    await report("metadata_identity_precision", {
      status: "insufficient", reason: "sdk_or_emulator_did_not_complete_metadata_probe",
      errorCode: code,
    });
  } finally {
    await cleanupFixtures(firestore, collection, [ref], report, "metadata_identity_precision");
  }
}
