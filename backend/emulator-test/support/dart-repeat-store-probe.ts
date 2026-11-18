import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

// Test-only child protocol. Credentials stay in stdin; child output is never
// forwarded. The checkpoint lets the SDK host inspect storage before deletion.
export async function dartRepeatStoreProbe(baseUri: string, token: string, beforeDelete: () => Promise<void>): Promise<void> {
  const executable = process.platform === "win32" ? "dart.exe" : "dart";
  const version = spawnSync(executable, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 10_000, maxBuffer: 4096 });
  assert(version.status === 0 && !version.error && /^Dart SDK version: 3\.13\.2(?:\s|$)/.test(`${version.stdout}${version.stderr}`.trim()),
    "Existing pinned Dart 3.13.2 must be supplied on the controlled runtime PATH");
  const child = spawn(executable, ["--packages=.dart_tool/package_config.json", "test/support/ai_repeat_store_probe.dart", `--base-uri=${baseUri}`],
    { cwd: process.cwd(), env: process.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let pending = "", outputBytes = 0, stderrBytes = 0, invalid = false, timedOut = false;
  let checkpointSeen = false, checkpointPassed = false, finalSeen = false, output: unknown;
  let checkpoint: Promise<void> = Promise.resolve();
  const rejectProtocol = () => { invalid = true; child.kill(); };
  child.stdin.on("error", () => { /* Sanitized completion checks report failure. */ });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (value: string) => {
    outputBytes += Buffer.byteLength(value);
    if (outputBytes > 32_768) { rejectProtocol(); return; }
    pending += value;
    let newline: number;
    while ((newline = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, newline).trim(); pending = pending.slice(newline + 1);
      if (!line) { rejectProtocol(); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { rejectProtocol(); return; }
      if (isDeepStrictEqual(parsed, { checkpoint: "beforeDelete" })) {
        if (checkpointSeen || finalSeen) { rejectProtocol(); return; }
        checkpointSeen = true;
        checkpoint = (async () => {
          try { await beforeDelete(); checkpointPassed = true; }
          catch { /* Never emit documents or content embedded in SDK assertions. */ }
          if (!child.stdin.destroyed) child.stdin.write(checkpointPassed ? "verified\n" : "cleanup\n");
        })();
      } else {
        if (finalSeen) { rejectProtocol(); return; }
        finalSeen = true; output = parsed;
      }
    }
  });
  child.stderr.on("data", (value: Buffer) => { stderrBytes += value.length; if (stderrBytes > 32_768) rejectProtocol(); });
  // Covers two 90s attempts, reads/checkpoint and failure cancel/delete budgets.
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, 300_000);
  try {
    const completion = new Promise<number | null>((resolve, reject) => {
      child.once("error", () => reject(new Error("Controlled Dart repeat-store child could not start")));
      child.once("close", code => resolve(code));
    });
    child.stdin.write(`${token}\n`);
    const code = await completion;
    await checkpoint;
    assert(!timedOut && !invalid && pending.trim() === "", "Controlled Dart repeat-store protocol or timeout failure");
    assert.equal(stderrBytes, 0, "Controlled Dart repeat-store child emitted suppressed stderr");
    const safeSteps = typeof output === "object" && output !== null && "steps" in output && Array.isArray(output.steps)
      ? output.steps.filter((step): step is string => typeof step === "string" && /^[A-Za-z]+:(?:pass|blocked)$/.test(step)).join(",") : "invalid-protocol";
    assert.equal(code, 0, `Controlled Dart repeat-store child reported failure (${safeSteps})`);
    assert(checkpointSeen && checkpointPassed && finalSeen, "SDK before-delete checkpoint must pass exactly once");
    assert(isDeepStrictEqual(output, { result: "pass", steps: [
      "prepareA:pass", "executeA:pass", "readMessagesA:pass", "prepareB:pass", "executeB:pass", "readMessagesB:pass", "deleteConversation:pass",
    ] }), "Controlled Dart repeat-store journey must pass every wire step");
  } finally { clearTimeout(timer); child.stdin.destroy(); }
}
