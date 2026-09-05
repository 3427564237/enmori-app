import assert from "node:assert/strict";
import test from "node:test";

import { isSafeDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";

test("Firestore document IDs reject reserved and over-limit values", () => {
  assert.equal(isSafeDocumentId("__name__"), false);
  assert.equal(isSafeDocumentId("a".repeat(1_501)), false);
  assert.equal(isSafeDocumentId("controlled-document-001"), true);
});

test("Firestore document IDs reject malformed Unicode", () => {
  assert.equal(isSafeDocumentId("\ud800"), false);
});
