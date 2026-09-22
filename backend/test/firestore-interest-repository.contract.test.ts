import assert from "node:assert/strict";
import test from "node:test";

import { FirestoreInterestRepository } from "../src/interests/infrastructure/firestore-interest-repository.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import {
  FailingFirestoreGateway,
  InMemoryFirestoreGateway,
} from "./support/in-memory-firestore-gateway.js";

const uid = "interest-member-001";
const otherUid = "interest-member-002";
const accountId = "account-interest-001";
const otherAccountId = "account-interest-002";

function bindingId(firebaseUid: string): string {
  const value = createAuthBindingDocumentId(firebaseUid);
  if (value === undefined) throw new Error("invalid test Firebase UID");
  return value;
}

function account(username: string) {
  return {
    username,
    optionalProcessingConsent: "accepted",
    checkInVisibility: "public",
    onboardingCompletedAt: "2026-09-14T00:00:00.000Z",
  } as const;
}

function tag(displayName: string, lifecycleState: "active" | "inactive" = "active") {
  return { displayName, lifecycleState, revision: 1 } as const;
}

function gateway(extra: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {}) {
  return new InMemoryFirestoreGateway({
    [`auth_bindings/${bindingId(uid)}`]: { accountId },
    [`accounts/${accountId}`]: account("member_001"),
    [`auth_bindings/${bindingId(otherUid)}`]: { accountId: otherAccountId },
    [`accounts/${otherAccountId}`]: account("member_002"),
    "interest_tags/tag-b": tag("Books"),
    "interest_tags/tag-a": tag("Art"),
    "interest_tags/tag-old": tag("Legacy", "inactive"),
    ...extra,
  });
}

test("catalogue lists only Active tags in stable ID order", async () => {
  const repository = new FirestoreInterestRepository(gateway());
  assert.deepEqual(await repository.listActive(uid), {
    kind: "found",
    value: [
      { interestTagId: "tag-a", displayName: "Art" },
      { interestTagId: "tag-b", displayName: "Books" },
    ],
  });
});

test("missing own selection reads empty at revision zero", async () => {
  const repository = new FirestoreInterestRepository(gateway());
  assert.deepEqual(await repository.getOwn(uid), {
    kind: "found",
    value: { interestTags: [], revision: 0 },
  });
});

test("save persists only account-linked IDs and restores them on a later read", async () => {
  const store = gateway();
  const repository = new FirestoreInterestRepository(store);
  const saved = await repository.replaceOwn({
    firebaseUid: uid,
    interestTagIds: ["tag-b", "tag-a"],
    expectedRevision: 0,
  });
  assert.equal(saved.kind, "saved");
  assert.deepEqual(store.read(`account_interests/${accountId}`), {
    interestTagIds: ["tag-b", "tag-a"],
    revision: 1,
  });
  assert.deepEqual(await repository.getOwn(uid), saved.kind === "saved"
    ? { kind: "found", value: saved.value }
    : undefined);
  assert.equal(store.read(`account_interests/${otherAccountId}`), undefined);
});

test("stale revision and invalid selections do not mutate the record", async () => {
  const store = gateway({
    [`account_interests/${accountId}`]: {
      interestTagIds: ["tag-a"],
      revision: 4,
    },
  });
  const repository = new FirestoreInterestRepository(store);
  const cases = [
    repository.replaceOwn({ firebaseUid: uid, interestTagIds: ["tag-b"], expectedRevision: 3 }),
    repository.replaceOwn({ firebaseUid: uid, interestTagIds: ["missing"], expectedRevision: 4 }),
    repository.replaceOwn({ firebaseUid: uid, interestTagIds: ["tag-b", "tag-b"], expectedRevision: 4 }),
    repository.replaceOwn({
      firebaseUid: uid,
      interestTagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
      expectedRevision: 4,
    }),
  ];
  const results = await Promise.all(cases);
  assert.deepEqual(results.map((result) => result.kind), [
    "revision_precondition_failed",
    "selection_invalid",
    "selection_invalid",
    "selection_invalid",
  ]);
  assert.deepEqual(store.read(`account_interests/${accountId}`), {
    interestTagIds: ["tag-a"],
    revision: 4,
  });
});

test("existing Inactive references may be retained or removed but not newly added", async () => {
  const store = gateway({
    [`account_interests/${accountId}`]: {
      interestTagIds: ["tag-a", "tag-old"],
      revision: 2,
    },
  });
  const repository = new FirestoreInterestRepository(store);

  const retained = await repository.replaceOwn({
    firebaseUid: uid,
    interestTagIds: ["tag-old"],
    expectedRevision: 2,
  });
  assert.equal(retained.kind, "saved");
  const removed = await repository.replaceOwn({
    firebaseUid: uid,
    interestTagIds: [],
    expectedRevision: 3,
  });
  assert.equal(removed.kind, "saved");
  const readded = await repository.replaceOwn({
    firebaseUid: uid,
    interestTagIds: ["tag-old"],
    expectedRevision: 4,
  });
  assert.equal(readded.kind, "selection_invalid");
});

test("a Tag becoming Inactive cannot bypass transactional assignment checks", async () => {
  const store = gateway();
  const repository = new FirestoreInterestRepository(store);
  await store.runTransaction(async (transaction) => {
    transaction.set("interest_tags/tag-b", tag("Books", "inactive"));
  });
  assert.equal(
    (await repository.replaceOwn({
      firebaseUid: uid,
      interestTagIds: ["tag-b"],
      expectedRevision: 0,
    })).kind,
    "selection_invalid",
  );
});

test("identity mapping enforces onboarding and account isolation", async () => {
  const store = gateway({
    [`account_interests/${accountId}`]: { interestTagIds: ["tag-a"], revision: 1 },
    [`account_interests/${otherAccountId}`]: { interestTagIds: ["tag-b"], revision: 7 },
  });
  const repository = new FirestoreInterestRepository(store);
  const missing = await repository.getOwn("not-onboarded");
  const other = await repository.getOwn(otherUid);
  assert.equal(missing.kind, "onboarding_required");
  assert.equal(other.kind, "found");
  if (other.kind !== "found") throw new Error("other account fixture missing");
  assert.equal(other.value.revision, 7);
  assert.deepEqual(other.value.interestTags.map((value) => value.interestTagId), ["tag-b"]);
});

test("persistence failures stay dependency unavailable", async () => {
  const repository = new FirestoreInterestRepository(new FailingFirestoreGateway());
  assert.equal((await repository.listActive(uid)).kind, "dependency_unavailable");
  assert.equal((await repository.getOwn(uid)).kind, "dependency_unavailable");
  assert.equal(
    (await repository.replaceOwn({
      firebaseUid: uid,
      interestTagIds: [],
      expectedRevision: 0,
    })).kind,
    "dependency_unavailable",
  );
});
