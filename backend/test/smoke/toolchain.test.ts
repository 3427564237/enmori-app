import assert from "node:assert/strict";
import test from "node:test";

test("uses the approved Node.js runtime", () => {
  assert.equal(process.versions.node, "24.19.0");
});
