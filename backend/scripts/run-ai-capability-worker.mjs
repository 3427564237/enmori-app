import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

// As in run-emulator-tests.mjs: Firebase CLI adds FIREBASE_CONFIG to its command
// child. Rebuild the approved allowlist before the SDK/probes consume any env.
const profile = mkdtempSync(join(tmpdir(), "enmori-ai-capability-worker-"));
const emit = (data) => console.log("AI_CAPABILITY_REPORT " + JSON.stringify(data));
try {
  const env = buildControlledEmulatorTestEnvironment(process.env, profile);
  const script = fileURLToPath(new URL("../capability-probes/run.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script], { env, cwd: profile, stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
} catch {
  emit({ probe: "worker-launch", outcome: "fail", category: "worker_environment_or_launch_failure" });
  process.exitCode = 1;
} finally {
  const target = resolve(profile);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("enmori-ai-capability-worker-")) {
    emit({ probe: "worker-profile-cleanup", outcome: "fail", category: "cleanup_boundary_refused" });
    process.exitCode = 1;
  } else {
    try {
      rmSync(target, { recursive: true, force: true });
      const removed = !existsSync(target);
      emit({ probe: "worker-profile-cleanup", outcome: removed ? "pass" : "fail" });
      if (!removed) process.exitCode = 1;
    } catch {
      emit({ probe: "worker-profile-cleanup", outcome: "fail", category: "cleanup_failed" });
      process.exitCode = 1;
    }
  }
}
