import assert from "node:assert/strict";
import test from "node:test";
import { deriveInitialChoice } from "../../src/onboarding/domain/initial-choice.js";
import { canonicalizeUsername } from "../../src/onboarding/domain/username.js";

test("canonicalizes Username in the frozen Q18-B order", () => {
  const result = canonicalizeUsername("  ALEX_7  ");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value, "alex_7");
});

test("accepts the 3 and 30 character Username boundaries", () => {
  assert.equal(canonicalizeUsername("a_1").ok, true);
  assert.equal(canonicalizeUsername("a".repeat(30)).ok, true);
});

test("rejects prohibited Username syntax and Unicode handling", () => {
  for (const input of [
    "ab",
    "a".repeat(31),
    "_abc",
    "abc_",
    "ab__cd",
    "ab\tcd",
    "ab\ncd",
    "\u00a0abc\u00a0",
    "álix",
    "alex!",
  ]) {
    assert.equal(canonicalizeUsername(input).ok, false, input);
  }
});

test("rejects the fixed reserved Username namespace", () => {
  for (const input of [
    "admin",
    "administrator",
    "support",
    "system",
    "moderator",
    "root",
    "enmori",
    "enmori_member",
  ]) {
    assert.equal(canonicalizeUsername(input).ok, false, input);
  }
});

test("derives the exact Initial Choice pair", () => {
  assert.deepEqual(deriveInitialChoice("accept"), {
    ok: true,
    value: {
      initialChoice: "accept",
      optionalProcessingConsent: "accepted",
      checkInVisibility: "private",
    },
  });
  assert.deepEqual(deriveInitialChoice("reject"), {
    ok: true,
    value: {
      initialChoice: "reject",
      optionalProcessingConsent: "rejected",
      checkInVisibility: "private",
    },
  });
  assert.equal(deriveInitialChoice("friends").ok, false);
});
