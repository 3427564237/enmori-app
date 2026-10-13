import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { parseCanonicalAiMessageLocation } from "../dist/src/ai-conversation/domain/canonical-ai-message-location.js";

// Remaining A capability fixture only. No product adapter, sweep or owner grant.
// Path/identity values stay inside this process; output contains counts only.
const PAGE_SIZE = 25;
const MAX_PAGES = 5;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function canonicalAncestor(ref, group) {
  if (group === "conversations") {
    // The appended ID checks parent shape only; it creates no message.
    return parseCanonicalAiMessageLocation(`${ref.path}/messages/00000000-0000-4000-8000-000000000000`, "messages") !== undefined;
  }
  return parseCanonicalAiMessageLocation(ref.path, group) !== undefined;
}

export async function probeGroupPagination(firestore, report) {
  const nonce = randomUUID();
  const owned = new Map();
  const fixtures = new Map(["conversations", "messages", "message_sources"].map((g) => [g, []]));
  const pending = new Set();
  const tracked = async (operation) => {
    const promise = operation();
    pending.add(promise);
    try { return await promise; }
    finally { pending.delete(promise); }
  };
  const add = (path, data, group) => {
    const ref = firestore.doc(path);
    assert.equal(owned.has(path), false);
    owned.set(path, { ref, data });
    if (group !== undefined) fixtures.get(group).push(ref);
    return ref;
  };
  const owners = [randomUUID(), randomUUID()];
  const sharedLeafIds = Array.from({ length: 14 }, () => randomUUID());
  const messageParents = [];
  for (const owner of owners) {
    add(`accounts/${owner}`, { fixture: true });
    for (let c = 0; c < 14; c++) {
      const path = `accounts/${owner}/conversations/${randomUUID()}`;
      add(path, { fixture: true }, "conversations");
      if (c < 2) messageParents.push(path);
    }
  }
  add(`probe_noncanonical/${nonce}/conversations/${randomUUID()}`, { fixture: true }, "conversations");
  const missingParent = firestore.doc(`accounts/${owners[0]}/conversations/${randomUUID()}`);
  for (const group of ["messages", "message_sources"]) {
    for (const parent of messageParents) {
      for (let i = 0; i < 14; i++) {
        add(`${parent}/${group}/${sharedLeafIds[i]}`, { sequence: i + 1 }, group);
      }
    }
    // Canonical descendants remain discoverable without a stored parent.
    add(`${missingParent.path}/${group}/${randomUUID()}`, { sequence: 1 }, group);
    for (const path of [
      `probe_noncanonical/${nonce}/${group}/${sharedLeafIds[0]}`,
      `accounts/${owners[0]}/unexpected/${nonce}/${group}/${sharedLeafIds[0]}`,
      `${messageParents[0]}/nested/${nonce}/${group}/${sharedLeafIds[0]}`,
    ]) add(path, { sequence: 1 }, group);
  }
  assert.equal(owned.size, 151);
  try {
    const batch = firestore.batch();
    for (const { ref, data } of owned.values()) batch.create(ref, data);
    await tracked(() => batch.commit());
    assert.equal((await tracked(() => missingParent.get())).exists, false);
    report("fixture", { outcome: "pass", ownedDocuments: owned.size, canonicalParents: 28,
      owners: 2, parentsSharingLeafIds: 4, canonicalChildrenWithAbsentParent: 2,
      noncanonicalRows: 7, maxPagesPerGroup: MAX_PAGES, pageSize: PAGE_SIZE });

    // Run before cursor deletion: a specific field policy coexists in the file
    // with the wildcard. Emulator success does not prove cloud index enforcement.
    const collection = firestore.collection(`${messageParents[0]}/messages`);
    const first = await tracked(() => collection.orderBy("sequence", "desc").limit(20).get());
    assert.deepEqual(first.docs.map((doc) => doc.get("sequence")), Array.from({ length: 14 }, (_, i) => 14 - i));
    const before = await tracked(() => collection.where("sequence", "<", 8).orderBy("sequence", "desc").limit(20).get());
    assert.deepEqual(before.docs.map((doc) => doc.get("sequence")), [7, 6, 5, 4, 3, 2, 1]);
    report("sequence-collection-desc", { outcome: "pass", firstPageRows: first.size,
      beforePageRows: before.size, limit: 20, exactDescendingOrder: true,
      explicitOverrideDeclared: true, cloudIndexEnforcementProved: false });

    for (const [group, refs] of fixtures) {
      const expected = refs.map((ref) => ref.path).sort(compare);
      const expectedCanonical = group === "conversations" ? 28 : 57;
      const expectedRejected = group === "conversations" ? 1 : 3;
      const seen = [];
      const pageSizes = [];
      let cursor;
      let canonical = 0;
      let rejected = 0;
      let exhausted = false;
      let deletedCursorObservedAbsent = false;
      for (let page = 0; page < MAX_PAGES; page++) {
        let query = firestore.collectionGroup(group).orderBy(FieldPath.documentId(), "asc").limit(PAGE_SIZE);
        if (cursor !== undefined) query = query.startAfter(cursor);
        const snapshot = await tracked(() => query.get());
        pageSizes.push(snapshot.size);
        if (snapshot.empty) { exhausted = true; break; }
        const paths = snapshot.docs.map((doc) => doc.ref.path);
        assert.deepEqual(paths, expected.slice(seen.length, seen.length + paths.length));
        for (const doc of snapshot.docs) {
          if (canonicalAncestor(doc.ref, group)) canonical++;
          else rejected++;
        }
        seen.push(...paths);
        cursor = snapshot.docs.at(-1).ref;
        if (page === 0) {
          assert.equal(snapshot.size, PAGE_SIZE);
          await tracked(() => cursor.delete());
          deletedCursorObservedAbsent = !(await tracked(() => cursor.get())).exists;
          assert.equal(deletedCursorObservedAbsent, true);
        }
      }
      assert.equal(exhausted, true, "Bounded fixture must reach an empty tail");
      assert.deepEqual(seen, expected);
      assert.equal(new Set(seen).size, expected.length);
      assert.equal(canonical, expectedCanonical);
      assert.equal(rejected, expectedRejected);
      // Rejected ancestors are not erased by validation or treated as ownerless.
      const invalidRefs = refs.filter((ref) => !canonicalAncestor(ref, group));
      const invalid = await tracked(() => firestore.getAll(...invalidRefs));
      assert.equal(invalid.every((doc) => doc.exists), true);
      report(`group-${group}`, { outcome: "pass", rows: seen.length, pageSizes,
        pageSize: PAGE_SIZE, explicitNameAscending: true, fullReferenceCursor: true,
        deletedCursorObservedAbsent, exactOrderAndCoverage: true, duplicatePaths: 0,
        repeatedLeafIds: refs.length - new Set(refs.map((ref) => ref.id)).size,
        canonicalAncestors: canonical, rejectedAncestors: rejected,
        rejectedRowsRetainedUntilOwnedTeardown: true, exhaustedWithinBound: true });
    }
  } finally {
    // Settle every owned RPC before deleting only the exact references allocated
    // by this run. Never reset the Emulator or delete a whole shared collection.
    await Promise.allSettled([...pending]);
    let removed = false;
    try {
      const batch = firestore.batch();
      for (const { ref } of owned.values()) batch.delete(ref);
      await batch.commit();
      const remaining = await firestore.getAll(...[...owned.values()].map(({ ref }) => ref));
      removed = remaining.every((doc) => !doc.exists);
      assert.equal(removed, true);
    } finally {
      report("owned-fixture-cleanup", { outcome: removed ? "pass" : "fail",
        ownedReferences: owned.size, pendingRpcCount: pending.size,
        allOwnedReferencesAbsent: removed, databaseResetUsed: false });
    }
  }
}
