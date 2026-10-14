import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const runner = "<REPO_ROOT>/backend/capability-probes/fence-initialization-run.mjs";
const profile = "<DRAFTS_ROOT>/2026-10-13-independent-ai-local/not-opened-negative-profile";
const base = {
  ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  APPDATA: profile, HOME: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10", GOOGLE_CLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  METADATA_SERVER_DETECTION: "none",
};
const cases = [
  ["non-test mode", { ENMORI_ENVIRONMENT: "production" }],
  ["conflicting projects", { GOOGLE_CLOUD_PROJECT: "demo-other" }],
  ["cloud project", { GCLOUD_PROJECT: "ordinary-project", GOOGLE_CLOUD_PROJECT: "ordinary-project" }],
  ["remote Firestore endpoint", { FIRESTORE_EMULATOR_HOST: "192.0.2.1:8080" }],
  ["wrong fixed loopback port", { FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9098" }],
  ["ambient credential material", { GOOGLE_APPLICATION_CREDENTIALS: "synthetic-disallowed-marker" }],
  ["profile mismatch", { HOME: "synthetic-uncontrolled-profile" }],
];
for (const [name, change] of cases) {
  test(`fence runner rejects ${name} before SDK initialization`, () => {
    const result = spawnSync(process.execPath, [runner], {
      env: { ...base, ...change }, encoding: "utf8", timeout: 10000, windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    const lines = result.stdout.trim().split(/\r?\n/);
    assert.equal(lines.length, 2);
    const reports = lines.map(line => {
      assert.equal(line.startsWith("AI_FENCE_REPORT "), true);
      return JSON.parse(line.slice("AI_FENCE_REPORT ".length));
    });
    assert.deepEqual(reports[0], { probe: "suite-failure", outcome: "fail", phase: "guard", category: "controlled_environment_rejected", dependencyCode: null });
    assert.equal(reports[1].probe, "suite");
    assert.equal(reports[1].outcome, "fail");
    assert.equal(reports[1].productAdapterImplemented, false);
    assert.equal(result.stderr, "");
  });
}

