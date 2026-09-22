import assert from "node:assert/strict";
import test from "node:test";

import {
  S2_DEMO_PROJECT_ID,
  requireS2DemoInitializerConfiguration,
} from "../../src/event-recommendations/infrastructure/s2-demo-initializer.js";

const APPROVED_CONFIGURATION = {
  ENMORI_ENVIRONMENT: "controlled-demo",
  ENMORI_FIREBASE_PROJECT_ID: S2_DEMO_PROJECT_ID,
} as const;

test("accepts only the approved controlled Demo target", () => {
  assert.deepEqual(
    requireS2DemoInitializerConfiguration(APPROVED_CONFIGURATION),
    {
      environmentClass: "controlled-demo",
      projectId: S2_DEMO_PROJECT_ID,
    },
  );
});

for (const environment of [
  {},
  { ...APPROVED_CONFIGURATION, ENMORI_ENVIRONMENT: "test" },
  { ...APPROVED_CONFIGURATION, ENMORI_FIREBASE_PROJECT_ID: "enmori-controlled-01" },
  { ...APPROVED_CONFIGURATION, FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" },
  { ...APPROVED_CONFIGURATION, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
  { ...APPROVED_CONFIGURATION, GCLOUD_PROJECT: "another-project" },
  { ...APPROVED_CONFIGURATION, GOOGLE_CLOUD_PROJECT: "another-project" },
  { ...APPROVED_CONFIGURATION, FIREBASE_CONFIG: JSON.stringify({ projectId: S2_DEMO_PROJECT_ID }) },
]) {
  test("fails closed for an unapproved Demo initializer environment", () => {
    assert.throws(() => requireS2DemoInitializerConfiguration(environment));
  });
}

test("accepts matching ambient project identifiers", () => {
  assert.deepEqual(requireS2DemoInitializerConfiguration({
    ...APPROVED_CONFIGURATION,
    GCLOUD_PROJECT: S2_DEMO_PROJECT_ID,
    GOOGLE_CLOUD_PROJECT: S2_DEMO_PROJECT_ID,
  }).projectId, S2_DEMO_PROJECT_ID);
});
