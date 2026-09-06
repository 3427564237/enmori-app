import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

const controlledProfileDirectory = mkdtempSync(
  join(tmpdir(), "enmori-r10-profile-"),
);

try {
  const result = spawnSync(
    process.execPath,
    ["--test", "backend/dist/emulator-test/**/*.test.js"],
    {
      env: buildControlledEmulatorTestEnvironment(
        process.env,
        controlledProfileDirectory,
      ),
      stdio: "inherit",
    },
  );

  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(controlledProfileDirectory, { force: true, recursive: true });
}
