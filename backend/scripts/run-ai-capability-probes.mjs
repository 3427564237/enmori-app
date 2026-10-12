import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

// LI's 0f65bc84 capability-only assignment; no product or environment enablement.
const root = fileURLToPath(new URL("../../", import.meta.url));
const ports = [8080, 9099, 4400, 4500];
const prefix = "AI_CAPABILITY_REPORT ";
const emit = (data) => console.log(prefix + JSON.stringify(data));
let profile;
let phase = "preflight";

async function portAvailable(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolvePort(true));
    });
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

try {
  const manifest = readJson("package.json");
  if (process.version !== `v${manifest.engines.node}`) {
    throw new Error("locked_node_mismatch");
  }
  const versions = readJson("node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json");
  const cache = process.env.FIREBASE_EMULATORS_PATH ?? join(homedir(), ".cache", "firebase", "emulators");
  const jar = join(cache, versions.firestore.downloadPathRelativeToCacheDir);
  if (!existsSync(jar)) throw new Error("existing_emulator_cache_required");
  const jarDigest = createHash("sha256").update(readFileSync(jar)).digest("hex");
  if (jarDigest !== versions.firestore.expectedChecksumSHA256) {
    throw new Error("existing_emulator_cache_checksum_mismatch");
  }
  if (!(await Promise.all(ports.map(portAvailable))).every(Boolean)) {
    throw new Error("existing_port_occupied");
  }
  emit({ probe: "launcher-preflight", outcome: "pass", node: process.version,
    firebaseTools: readJson("node_modules/firebase-tools/package.json").version,
    firestoreEmulator: versions.firestore.version, existingJarChecksumVerified: true,
    requiredPortsInitiallyFree: true });

  profile = mkdtempSync(join(tmpdir(), "enmori-ai-capability-profile-"));
  const env = buildControlledEmulatorTestEnvironment({
    ...process.env,
    GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
    GOOGLE_CLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  }, profile);
  env.CI = "true";
  env.FIREBASE_CLI_DISABLE_USAGE = "true";
  env.FIREBASE_EMULATORS_PATH = cache;
  phase = "emulators";
  const command = `"${process.execPath}" "${join(root, "backend/capability-probes/run.mjs")}"`;
  const args = [join(root, "node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec", "--project", "demo-enmori-rmvp01a-r10",
    "--only", "auth,firestore", "--config", join(root, "firebase.json"),
    "--non-interactive", command];
  let reports = 0;
  let carry = "";
  let childReportsComplete = false;
  // CLI/vendor raw logs stay in the disposable private profile and are never forwarded.
  const child = spawn(process.execPath, args, { env, cwd: profile, stdio: ["ignore", "pipe", "pipe"] });
  child.stderr.resume();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    carry += chunk;
    let newline;
    while ((newline = carry.indexOf("\n")) !== -1) {
      const line = carry.slice(0, newline).trim();
      carry = carry.slice(newline + 1);
      if (!line.startsWith(prefix)) continue;
      try {
        const data = JSON.parse(line.slice(prefix.length));
        if (typeof data.probe !== "string") continue;
        reports += 1;
        if (data.probe === "suite" && data.outcome === "pass") childReportsComplete = true;
        emit(data);
      } catch { /* Malformed output cannot become a success receipt. */ }
    }
    // Bound ignored vendor output; do not retain unbounded raw data in memory.
    if (carry.length > 65_536) carry = "";
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolveExit(code ?? 1));
  });
  phase = "shutdown";
  const portsFreeAfter = (await Promise.all(ports.map(portAvailable))).every(Boolean);
  emit({ probe: "launcher-shutdown", outcome: portsFreeAfter ? "pass" : "fail",
    cliExitCode: exitCode, reports, childReportsComplete, requiredPortsFreeAfter: portsFreeAfter });
  process.exitCode = exitCode === 0 && childReportsComplete && portsFreeAfter ? 0 : 1;
} catch (error) {
  const approvedReasons = new Set(["locked_node_mismatch", "existing_emulator_cache_required",
    "existing_emulator_cache_checksum_mismatch", "existing_port_occupied"]);
  emit({ probe: "launcher", outcome: "fail", phase,
    category: approvedReasons.has(error?.message) ? error.message : "launcher_failure" });
  process.exitCode = 1;
} finally {
  if (profile !== undefined) {
    const target = resolve(profile);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("enmori-ai-capability-profile-")) {
      emit({ probe: "profile-cleanup", outcome: "fail", category: "cleanup_boundary_refused" });
      process.exitCode = 1;
    } else {
      try {
        rmSync(target, { recursive: true, force: true });
        const removed = !existsSync(target);
        emit({ probe: "profile-cleanup", outcome: removed ? "pass" : "fail" });
        if (!removed) process.exitCode = 1;
      } catch {
        emit({ probe: "profile-cleanup", outcome: "fail", category: "cleanup_failed" });
        process.exitCode = 1;
      }
    }
  }
}
