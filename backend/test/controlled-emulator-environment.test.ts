import assert from "node:assert/strict";
import test from "node:test";

import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";

const CONTROLLED_ENVIRONMENT = {
  ENMORI_ENVIRONMENT: "test",
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
} as const;

test("controlled Emulator environment accepts only test-mode demo resources", () => {
  assert.deepEqual(
    requireControlledEmulatorEnvironment(CONTROLLED_ENVIRONMENT),
    {
      projectId: "demo-enmori-rmvp01a-r10",
      authHost: "127.0.0.1:9099",
      firestoreHost: "127.0.0.1:8080",
    },
  );
});

for (const mode of ["development", "controlled-demo", "production", undefined]) {
  test(`Emulator configuration fails closed in ${mode ?? "unset"} mode`, () => {
    assert.throws(
      () =>
        requireControlledEmulatorEnvironment({
          ...CONTROLLED_ENVIRONMENT,
          ENMORI_ENVIRONMENT: mode,
        }),
      /forbidden outside test mode/,
    );
  });
}

test("controlled Emulator environment rejects real projects", () => {
  assert.throws(
    () =>
      requireControlledEmulatorEnvironment({
        ...CONTROLLED_ENVIRONMENT,
        GCLOUD_PROJECT: "enmori-live-project",
      }),
    /requires a demo project/,
  );
});

test("controlled Emulator environment rejects remote or incomplete endpoints", () => {
  assert.throws(
    () =>
      requireControlledEmulatorEnvironment({
        ...CONTROLLED_ENVIRONMENT,
        FIRESTORE_EMULATOR_HOST: "firebase.example.test:8080",
      }),
    /loopback Emulator endpoint/,
  );
  assert.throws(
    () =>
      requireControlledEmulatorEnvironment({
        ...CONTROLLED_ENVIRONMENT,
        FIREBASE_AUTH_EMULATOR_HOST: undefined,
      }),
    /loopback Emulator endpoint/,
  );
});

test("controlled Emulator environment rejects mismatched project identifiers", () => {
  assert.throws(
    () =>
      requireControlledEmulatorEnvironment({
        ...CONTROLLED_ENVIRONMENT,
        GOOGLE_CLOUD_PROJECT: "demo-other-project",
      }),
    /project identifiers must match/,
  );
});
