import assert from "node:assert/strict";
import test from "node:test";

import { requireControlledRuntimeConfiguration } from "../src/bootstrap/controlled-runtime-configuration.js";

const CONTROLLED_CONFIGURATION = {
  ENMORI_ENVIRONMENT: "controlled-demo",
  ENMORI_FIREBASE_PROJECT_ID: "enmori-controlled-01",
  ENMORI_BACKEND_HOST: "127.0.0.1",
  ENMORI_BACKEND_PORT: "3210",
} as const;

test("accepts an explicit controlled loopback runtime configuration", () => {
  assert.deepEqual(
    requireControlledRuntimeConfiguration(CONTROLLED_CONFIGURATION),
    {
      firebaseProjectId: "enmori-controlled-01",
      host: "127.0.0.1",
      port: 3210,
    },
  );
});

for (const environment of [
  {},
  { ...CONTROLLED_CONFIGURATION, ENMORI_ENVIRONMENT: "test" },
  { ...CONTROLLED_CONFIGURATION, ENMORI_FIREBASE_PROJECT_ID: "demo-enmori" },
  { ...CONTROLLED_CONFIGURATION, ENMORI_BACKEND_HOST: "0.0.0.0" },
  { ...CONTROLLED_CONFIGURATION, ENMORI_BACKEND_PORT: "0" },
  { ...CONTROLLED_CONFIGURATION, ENMORI_BACKEND_PORT: "65536" },
  {
    ...CONTROLLED_CONFIGURATION,
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  },
]) {
  test("rejects unsafe or incomplete controlled runtime configuration", () => {
    assert.throws(() => requireControlledRuntimeConfiguration(environment));
  });
}
