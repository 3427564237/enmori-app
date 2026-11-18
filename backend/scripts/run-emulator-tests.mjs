import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

const controlledProfileDirectory = mkdtempSync(
  join(tmpdir(), "enmori-r10-profile-"),
);

try {
  const env = buildControlledEmulatorTestEnvironment(process.env, controlledProfileDirectory);
  // The Firebase CLI may supply just one alias. Dart probes verify both against
  // the guarded demo project before accepting a synthetic identity on stdin.
  const project = env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT;
  env.GCLOUD_PROJECT = project;
  env.GOOGLE_CLOUD_PROJECT = project;
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-concurrency=1", "backend/dist/emulator-test/**/*.test.js"],
    {
      env,
      stdio: "inherit",
    },
  );

  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(controlledProfileDirectory, { force: true, recursive: true });
}
