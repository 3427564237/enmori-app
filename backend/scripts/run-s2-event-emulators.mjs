import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

// Same approved R10 non-real project/loopback configuration. Strip credentials
// before launching the CLI as well as before launching the actual test process.
const profile = mkdtempSync(join(tmpdir(), "enmori-s2-cli-profile-"));
try {
  const env = buildControlledEmulatorTestEnvironment({
    ...process.env,
    GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
    GOOGLE_CLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  }, profile);
  env.CI = "true";
  env.FIREBASE_CLI_DISABLE_USAGE = "true";
  // Optional local pre-existing Emulator cache; never a credential/profile.
  if (process.env.FIREBASE_EMULATORS_PATH !== undefined) {
    env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
  }
  const result = spawnSync(process.execPath, [
    resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec", "--project", "demo-enmori-rmvp01a-r10",
    "--only", "auth,firestore", "--config", "firebase.json", "--non-interactive",
    `"${process.execPath}" backend/scripts/run-emulator-tests.mjs`,
  ], { env, stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  const target = resolve(profile);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("enmori-s2-cli-profile-")) {
    throw new Error("Refusing cleanup outside the generated isolated CLI profile");
  }
  rmSync(target, { recursive: true, force: true });
}
