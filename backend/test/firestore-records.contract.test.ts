import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthBindingDocumentId,
  isSafeDocumentId,
  isUtcIsoInstant,
  parseAccountProjection,
  parseCheckInProjection,
} from "../src/shared/infrastructure/firebase/firestore-records.js";

test("Firestore document IDs reject reserved and over-limit values", () => {
  assert.equal(isSafeDocumentId("__name__"), false);
  assert.equal(isSafeDocumentId("a".repeat(1_501)), false);
  assert.equal(isSafeDocumentId("controlled-document-001"), true);
});

test("Firestore document IDs reject malformed Unicode", () => {
  assert.equal(isSafeDocumentId("\ud800"), false);
});

test("Auth Binding IDs use exact unpadded base64url UTF-8 mapping", () => {
  assert.equal(
    createAuthBindingDocumentId("firebase/user"),
    "uid_ZmlyZWJhc2UvdXNlcg",
  );
  assert.equal(
    createAuthBindingDocumentId("用户-ä"),
    "uid_55So5oi3LcOk",
  );
});

test("Auth Binding IDs safely distinguish exact Firebase UID inputs", () => {
  const firebaseUids = [
    "/",
    ".",
    "..",
    "__name__",
    "用户",
    "é",
    "e\u0301",
    "a".repeat(128),
  ];
  const documentIds = firebaseUids.map(createAuthBindingDocumentId);

  assert.equal(documentIds.every((value) => value !== undefined), true);
  assert.equal(new Set(documentIds).size, firebaseUids.length);
  for (const documentId of documentIds) {
    assert.notEqual(documentId, undefined);
    if (documentId === undefined) throw new Error("valid fixture rejected");
    assert.equal(documentId.startsWith("uid_"), true);
    assert.equal(documentId.includes("="), false);
    assert.equal(isSafeDocumentId(documentId), true);
  }
});

test("Auth Binding IDs fail closed for invalid Firebase UID inputs", () => {
  assert.equal(createAuthBindingDocumentId(""), undefined);
  assert.equal(createAuthBindingDocumentId("\ud800"), undefined);
  assert.equal(createAuthBindingDocumentId("a".repeat(129)), undefined);
});

test("UTC instants accept both approved Z forms and valid fractions", () => {
  assert.equal(isUtcIsoInstant("2026-09-03T03:20:00Z"), true);
  assert.equal(isUtcIsoInstant("2026-09-03T03:20:00.000Z"), true);
  assert.equal(isUtcIsoInstant("2026-09-03T03:20:00.123456Z"), true);
});

test("UTC instants reject offsets, invalid dates and non-exact forms", () => {
  assert.equal(isUtcIsoInstant("2026-09-03T13:20:00+10:00"), false);
  assert.equal(isUtcIsoInstant("2026-02-29T03:20:00Z"), false);
  assert.equal(isUtcIsoInstant("2026-09-03T24:00:00Z"), false);
  assert.equal(isUtcIsoInstant("2026-09-03t03:20:00z"), false);
});

test("stored projections accept the approved no-fraction UTC form", () => {
  assert.deepEqual(
    parseAccountProjection({
      username: "member_001",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "public",
      onboardingCompletedAt: "2026-09-03T03:15:00Z",
    }),
    {
      username: "member_001",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "public",
      onboardingCompletedAt: "2026-09-03T03:15:00Z",
    },
  );
  assert.deepEqual(
    parseCheckInProjection({
      checkInId: "controlled-check-in-001",
      note: "Controlled note",
      createdAt: "2026-09-03T03:20:00Z",
    }),
    {
      checkInId: "controlled-check-in-001",
      note: "Controlled note",
      createdAt: "2026-09-03T03:20:00Z",
    },
  );
});
