import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNote } from "../../src/check-ins/domain/note.js";

test("trims only outer Unicode whitespace and preserves internal content", () => {
  const result = normalizeNote("\u0085\u00a0 first  line\u0085second line \u3000");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value, "first  line\u0085second line");
});

test("rejects empty and whitespace-only Notes", () => {
  assert.equal(normalizeNote("").ok, false);
  assert.equal(normalizeNote(" \n\t\u0085\u3000").ok, false);
});

test("counts Unicode grapheme clusters at the 500 boundary", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.equal(normalizeNote(family.repeat(500)).ok, true);
  assert.equal(normalizeNote(family.repeat(501)).ok, false);
});
