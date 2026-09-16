import assert from "node:assert/strict";
import test from "node:test";
import {
  S2_DEMO_DOCUMENT_PATHS,
  S2_DEMO_MANIFEST_DIGEST,
  S2_DEMO_MANIFEST_VERSION,
  loadApprovedS2DemoManifest,
} from "../../src/event-recommendations/infrastructure/s2-demo-initializer.js";

test("named Demo manifest is fixed, bounded and contract-valid", async () => {
  const manifest = await loadApprovedS2DemoManifest();
  assert.equal(manifest.manifestVersion, S2_DEMO_MANIFEST_VERSION);
  assert.equal(manifest.digest, S2_DEMO_MANIFEST_DIGEST);
  assert.deepEqual(manifest.documents.map(({ path }) => path), S2_DEMO_DOCUMENT_PATHS);
  assert.equal(new Set(manifest.documents.map(({ path }) => path)).size,
    S2_DEMO_DOCUMENT_PATHS.length);
  for (const { data } of manifest.documents) {
    assert.equal(Object.keys(data).some((key) =>
      /credential|secret|password|token|endpoint|url|account|delete|reset/i.test(key)), false);
  }
});
