import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { requireControlledEmulatorEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

const report = (probe, details) => console.log("AI_CAPABILITY_REPORT " + JSON.stringify({ probe, ...details }));
const stableCode = (error) => Number.isInteger(error?.code) ? error.code : null;
let app;
let firestore;
let auth;
let phase = "guard";
let failed = false;
// This is a disposable tool bound, independent of every product deadline.
// A timeout cannot certify fixture cleanup or the absence of an outstanding write.
const watchdog = setTimeout(() => {
  report("tool-watchdog", { outcome: "fail", category: "tool_timeout", cleanupConfirmed: false });
  process.exit(1);
}, 240_000);
watchdog.unref();

async function emptyState(checkpoint) {
  const collections = await firestore.listCollections();
  const users = await auth.listUsers(1);
  const empty = collections.length === 0 && users.users.length === 0 && users.pageToken === undefined;
  report(checkpoint, { outcome: empty ? "pass" : "fail", firestoreTopLevelCollections: collections.length,
    authUsers: users.users.length, furtherAuthPage: users.pageToken !== undefined });
  assert.equal(empty, true, "Disposable instance must be empty");
}

try {
  const environment = requireControlledEmulatorEnvironment(process.env);
  assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
  assert.equal(environment.authHost, "127.0.0.1:9099");
  assert.equal(environment.firestoreHost, "127.0.0.1:8080");
  report("environment-guard", { outcome: "pass", synthetic: true, loopbackOnly: true,
    isolatedCredentialProfile: true, ambientCredentialsRemoved: true, liveModelCalls: 0 });
  phase = "initialize";
  const { probeReadView, probeMetadata } = await import("./read-view.mjs");
  const { probeCommitOrder, probeRetry } = await import("./commit-order.mjs");
  app = initializeApp({ projectId: environment.projectId }, `ai-capability-${process.pid}`);
  firestore = getFirestore(app);
  auth = getAuth(app);
  phase = "initial-state";
  await emptyState("initial-empty-state");
  for (const [name, probe] of [["fixed-read-view", probeReadView], ["metadata", probeMetadata],
    ["commit-order", probeCommitOrder], ["transaction-retry", probeRetry]]) {
    phase = name;
    try {
      await probe(firestore, report);
    } catch (error) {
      failed = true;
      report(name, { outcome: "fail", category: error?.code === "ERR_ASSERTION" ? "assertion_failed" : "probe_failure",
        dependencyCode: stableCode(error) });
    }
  }
} catch (error) {
  failed = true;
  report("suite-failure", { outcome: "fail", phase,
    category: phase === "guard" ? "controlled_environment_rejected" : "runner_failure",
    dependencyCode: stableCode(error) });
} finally {
  if (firestore !== undefined && auth !== undefined) {
    try { await emptyState("final-empty-state"); }
    catch { failed = true; }
  }
  if (app !== undefined) {
    try { await deleteApp(app); report("sdk-shutdown", { outcome: "pass" }); }
    catch { failed = true; report("sdk-shutdown", { outcome: "fail" }); }
  }
  report("suite", { outcome: failed ? "fail" : "pass", scope: "four-synthetic-capability-experiments",
    capabilityGuarantee: false, productAdapterImplemented: false });
  process.exitCode = failed ? 1 : 0;
  clearTimeout(watchdog);
}
