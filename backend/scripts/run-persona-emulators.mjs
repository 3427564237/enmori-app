import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildControlledEmulatorTestEnvironment } from "../dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js";

// The existing R10 CLI/worker isolation pattern, restricted to Persona only.
// No service import/export, credential discovery, port relocation or model call.
const root = fileURLToPath(new URL("../../", import.meta.url));
const script = fileURLToPath(import.meta.url);
const ports = [8080, 9099, 4400, 4500, 9150];
const project = "demo-enmori-rmvp01a-r10";
const json = relative => JSON.parse(readFileSync(join(root, relative), "utf8"));
const available = port => new Promise(done => {
  const server = createServer();
  server.once("error", () => done(false));
  server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(() => done(true)));
});
function removeProfile(profile) {
  const target = resolve(profile);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("enmori-persona-")) throw Error("cleanup_boundary_refused");
  rmSync(target, { recursive: true, force: true });
}

if (process.argv[2] === "--worker") {
  const profile = mkdtempSync(join(tmpdir(), "enmori-persona-test-"));
  try {
    const env = buildControlledEmulatorTestEnvironment(process.env, profile);
    const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1",
      join(root, "backend/dist/emulator-test/personas.integration.test.js")], { cwd: root, env, stdio: "inherit", windowsHide: true });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally { removeProfile(profile); }
} else {
  let profile;
  try {
    const manifest = json("package.json");
    if (process.version !== `v${manifest.engines.node}` || json("node_modules/firebase-tools/package.json").version !== manifest.devDependencies["firebase-tools"] ||
        json("node_modules/firebase-admin/package.json").version !== manifest.dependencies["firebase-admin"]) throw Error("locked_toolchain_mismatch");
    const versions = json("node_modules/firebase-tools/lib/emulator/downloadableEmulatorInfo.json");
    const cache = process.env.FIREBASE_EMULATORS_PATH ?? join(homedir(), ".cache", "firebase", "emulators");
    const jar = join(cache, versions.firestore.downloadPathRelativeToCacheDir);
    if (!existsSync(jar) || createHash("sha256").update(readFileSync(jar)).digest("hex") !== versions.firestore.expectedChecksumSHA256) {
      throw Error("existing_emulator_cache_required_or_mismatched");
    }
    const config = json("firebase.json");
    if (config.emulators.auth.host !== "127.0.0.1" || config.emulators.auth.port !== 9099 ||
        config.emulators.firestore.host !== "127.0.0.1" || config.emulators.firestore.port !== 8080 || config.emulators.ui.enabled !== false) {
      throw Error("approved_config_mismatch");
    }
    profile = mkdtempSync(join(tmpdir(), "enmori-persona-cli-"));
    const env = buildControlledEmulatorTestEnvironment({ ...process.env, GCLOUD_PROJECT: project, GOOGLE_CLOUD_PROJECT: project,
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }, profile);
    env.CI = "true"; env.FIREBASE_CLI_DISABLE_USAGE = "true"; env.FIREBASE_EMULATORS_PATH = cache;
    // Recheck immediately before launch. An existing listener is never killed.
    if (!(await Promise.all(ports.map(available))).every(Boolean)) throw Error("existing_port_occupied");
    console.log(`Persona Emulator preflight: Node ${process.version}; pinned CLI/Admin; cached Firestore ${versions.firestore.version} SHA-256 verified; required ports free.`);
    const args = [join(root, "node_modules/firebase-tools/lib/bin/firebase.js"), "emulators:exec", "--project", project,
      "--only", "auth,firestore", "--config", join(root, "firebase.json"), "--non-interactive", `"${process.execPath}" "${script}" --worker`];
    const child = spawn(process.execPath, args, { env, cwd: profile, stdio: "inherit", windowsHide: true });
    const status = await new Promise((done, reject) => { child.once("error", reject); child.once("close", value => done(value ?? 1)); });
    // Preserve synthetic-only SDK/CLI failure diagnostics when a caller supplies
    // an explicit local artifact folder; this folder is never read as a profile.
    if (process.env.ENMORI_PERSONA_TEST_LOG_DIRECTORY) {
      for (const name of ["firebase-debug.log", "firestore-debug.log"]) {
        const path = join(profile, name);
        if (existsSync(path)) copyFileSync(path, join(process.env.ENMORI_PERSONA_TEST_LOG_DIRECTORY, name));
      }
    }
    const free = (await Promise.all(ports.map(available))).every(Boolean);
    console.log(`Persona Emulator shutdown: CLI exit ${status}; required ports free ${free}.`);
    process.exitCode = status === 0 && free ? 0 : 1;
  } catch (error) {
    const categories = new Set(["locked_toolchain_mismatch", "existing_emulator_cache_required_or_mismatched", "approved_config_mismatch", "existing_port_occupied"]);
    console.error(`Persona Emulator launcher failed: ${categories.has(error?.message) ? error.message : "launcher_failure"}`);
    process.exitCode = 1;
  } finally { if (profile) removeProfile(profile); }
}
