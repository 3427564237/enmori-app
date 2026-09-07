import assert from "node:assert/strict";
import test from "node:test";

import {
  buildControlledEmulatorTestEnvironment,
  requireControlledEmulatorEnvironment,
} from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";

const CONTROLLED_PROFILE_DIRECTORY = "C:\\controlled-empty-profile";
const CONTROLLED_ENVIRONMENT = {
  APPDATA: CONTROLLED_PROFILE_DIRECTORY,
  ENMORI_ENVIRONMENT: "test",
  ENMORI_CONTROLLED_PROFILE_DIRECTORY: CONTROLLED_PROFILE_DIRECTORY,
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  HOME: CONTROLLED_PROFILE_DIRECTORY,
  USERPROFILE: CONTROLLED_PROFILE_DIRECTORY,
  XDG_CONFIG_HOME: CONTROLLED_PROFILE_DIRECTORY,
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

test("controlled Emulator runner passes only explicit non-secret environment values", () => {
  const childEnvironment = buildControlledEmulatorTestEnvironment(
    {
      ...CONTROLLED_ENVIRONMENT,
      APPDATA: "C:\\ambient-profile\\AppData\\Roaming",
      AWS_SECRET_ACCESS_KEY: "ambient-cloud-secret",
      CLOUDSDK_CONFIG: "C:\\ambient-profile\\gcloud",
      FIREBASE_CONFIG: '{"projectId":"live-project"}',
      FIREBASE_TOKEN: "ambient-firebase-token",
      GOOGLE_APPLICATION_CREDENTIALS: "C:\\ambient-service-account.json",
      HOME: "/home/ambient-user",
      PATH: "controlled-runtime-path",
      SystemRoot: "C:\\Windows",
      TEMP: "C:\\controlled-temp",
      USERPROFILE: "C:\\ambient-profile",
    },
    CONTROLLED_PROFILE_DIRECTORY,
  );

  assert.deepEqual(childEnvironment, {
    APPDATA: CONTROLLED_PROFILE_DIRECTORY,
    ENMORI_ENVIRONMENT: "test",
    ENMORI_CONTROLLED_PROFILE_DIRECTORY: CONTROLLED_PROFILE_DIRECTORY,
    HOME: CONTROLLED_PROFILE_DIRECTORY,
    METADATA_SERVER_DETECTION: "none",
    USERPROFILE: CONTROLLED_PROFILE_DIRECTORY,
    XDG_CONFIG_HOME: CONTROLLED_PROFILE_DIRECTORY,
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
    PATH: "controlled-runtime-path",
    SystemRoot: "C:\\Windows",
    TEMP: "C:\\controlled-temp",
  });
});

for (const name of [
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "CLOUDSDK_AUTH_ACCESS_TOKEN",
  "CLOUDSDK_CONFIG",
  "FIREBASE_CONFIG",
  "FIREBASE_TOKEN",
  "GOOGLE_APPLICATION_CREDENTIALS",
]) {
  test(`controlled Emulator guard rejects ambient ${name}`, () => {
    assert.throws(
      () =>
        requireControlledEmulatorEnvironment({
          ...CONTROLLED_ENVIRONMENT,
          [name]: "ambient-credential-material",
        }),
      /forbids ambient credential material/,
    );
  });
}

for (const name of ["APPDATA", "HOME", "USERPROFILE", "XDG_CONFIG_HOME"]) {
  test(`controlled Emulator guard rejects ambient ${name} profile roots`, () => {
    assert.throws(
      () =>
        requireControlledEmulatorEnvironment({
          ...CONTROLLED_ENVIRONMENT,
          [name]: "C:\\ambient-profile",
        }),
      /requires an isolated credential profile/,
    );
  });
}
