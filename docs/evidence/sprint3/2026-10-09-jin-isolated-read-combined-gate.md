# JIN actual combined gate — isolated My Friends, history and Persona Backend

Recorded 9 October 2026, Asia/Singapore. Gate executor/reviewer: JIN ZIHAN (`chuxi12483468`). Independent reviewer of this evidence: LI HOURUI. Assignment: [LI's concrete #69 handoff](https://github.com/3427564237/enmori-app/pull/69), under #44.

**Disposition: JIN's scoped execution passes; LI's independent gate-evidence review remains Pending.** No blocking integration finding was identified in the reviewed union/test delta. The results below are JIN's actual new-tree executions, not reused #55 or component totals. This record does not accept a complete module or the 42-route / 38-state target.

## Exact tree and scope

| Role | Immutable commit |
| --- | --- |
| Tested #69 published candidate | `00cb606961bfeb1cbe09bcd6afdc040c08b57ce1` |
| Main/base | `f46a903cb5b339365ac2024004b32b7b96b99e7c` |
| Accepted My Friends #61 | `5bdbcf8d61e0d84ba13e2146167db48704a1e7ae` |
| Accepted history read #64 | `2d2a81d85a10e0ced88199a25b373289030dbf26` |
| Accepted Persona Backend #65 | `885dbcc87fe8574265014eb4305c49fc0950daa3` |
| LI's final executable source before evidence publication | `cef93e782cff5a952ce6176b02055d9ad8de535b` |

All three component commits are ancestors of the exact candidate. JIN checked the actual integration conflict resolutions and two integration-owned test changes, retaining the completed component reviews. The API/schema/error/route union preserves approved choices; no new contract or runtime promotion is selected. The [LI candidate record](https://github.com/3427564237/enmori-app/blob/00cb606961bfeb1cbe09bcd6afdc040c08b57ce1/docs/evidence/sprint3/2026-10-09-li-isolated-read-integration-candidate.md) retains LI's own runs and earlier diagnostic failures separately.

Persona P08 is separate. JIN [approved #67's document consistency at 15ab509](https://github.com/3427564237/enmori-app/pull/67#pullrequestreview-5467525337) on 9 October 16:13:44 SGT under [LI's confirmed selection at 141ebcf](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md). That satisfies #68's named implementation release gate; it is not new-code approval or a Persona Android result. This #69 tree contains no new Persona P08 or history pages.

## JIN checks actually executed

| Check | Actual result at `00cb606` |
| --- | --- |
| Exact input ancestry and independent normative union comparison | Pass: three ancestors; 26 exact source method/path operations; 26 unique matching inventory entries and success-status sets; 33 schemas; 26 error codes; source security schemes preserved |
| Non-document payload identity against `cef93e7` | Pass: 410 tracked files, SHA-256 `ae5c57135a665382a71a3e5c078e4790f86d839d5d514e2642cabb3ce322fc2e` |
| Approved dependencies/configuration against #64 | `package.json`, `pnpm-lock.yaml`, `firebase.json`, `firestore.indexes.json`: empty diff |
| Client/harness source against initial combined `0f89282` | `lib`, `test`, `pubspec.yaml`, `pubspec.lock`, `.fvmrc`, `integration_test`, `tool`: empty diff; JIN nevertheless ran the new-tree checks below |
| Pinned `pnpm backend:verify` | Strict build Pass; **366/366 Pass**, zero failed/skipped/cancelled/todo, exit 0 |
| Actual guarded Auth/Firestore Emulator suite | **71/71 Pass**, zero failed/skipped/cancelled/todo, exit 0 |
| Full Flutter `test --no-pub --reporter expanded` | **225/225 Pass**, exit 0 |
| `dart analyze --fatal-infos lib test` | Pass, no issues, exit 0 |
| Frozen Flutter package resolution | `pub get --offline --enforce-lockfile`: Pass; tracked lockfile unchanged |
| Android My Friends real Backend flow and independent persistence | **1/1 Pass** plus direct two-owner pair/pointer readback; second unchanged invocation exits 0 including cleanup. First cleanup failure retained below |
| Diff whitespace and tracked executable files | Pass before and after product execution; only this new evidence document is added |
| Final teardown | Pass: both Firebase services stopped, Auth 9099 / Firestore 8080 clear, both run profiles removed, owned API 36 AVD stopped |
| LI independent review of this JIN artifact | Pending |

The normative comparison parses each input's `api/openapi.json`, requires identical definitions for overlapping operations, compares the entire target operation set to the source union, rejects duplicate inventory entries, and checks operation success statuses. It compares all non-error schemas exactly and the ErrorEnvelope structure with only the approved error-code union. No component's whole API file substitutes for the union. The 410-file manifest is the sorted Git `ls-tree -r` output excluding `docs/` and Markdown, joined with LF and a final LF; its entries match between the two source heads before hashing.

The conflict review retains both history and Persona dependencies in `buildApp`, keeps the environment guard before Fastify construction, preserves Persona's scoped framework-error handling, and retains Friend/history query error mappings. Ordinary and controlled-demo composition omit these slices. The history tamper test now changes one decoded ciphertext byte deterministically instead of occasionally replacing a token character with itself; runtime codec behavior is unchanged. The added shared-app test awaits its requests and closes apps before scoped synthetic cleanup.

## Actual persistence, isolation and read-bound evidence

These are assertions within the 71-case suite, not extra executions added to its total:

- The new single guarded app serves Friend, history and Persona together. Two fresh Auth identities, current binding/completed Account fixtures and explicitly initialized private state prove owner-filtered reads, Persona create → independent API reread → direct saved-state inspection, foreign-owner denial, safe malformed-Persona handling followed by unaffected Friend/history reads, and ordinary-composition omission.
- The existing complete synthetic `createdAt` audit returns counts only: **5/5 canonical strings**, zero other string formats, zero non-strings, all in 2026; **three pages of size two**. This is the isolated fixture dataset, not real/demo data or production index evidence. The authenticated history pagination and retained authority/error cases pass separately in the suite.
- Actual My Friends injected retry observes **106 logical reads on each of two transaction attempts**. Acceptance creates both pointers atomically; privacy, eligibility, current bindings and rejection/race cases retain their existing assertions.
- Persona instrumentation observes **208 transaction calls / 216 SDK attempts / eight retried calls / maximum nine logical gets / zero collection scans**. Existing eight/nine-get path assertions pass. These counts belong to the instrumented Persona suite, excluding the extra shared-app case; they are per-attempt logical reads, not billing or overall request bounds. Replay/capacity/concurrency/interruption/deletion/corruption/overflow and fixture-only initialization checks pass.
- Applicable Auth/Profile/Settings/Check-in/Interest/Event/Friend Backend/privacy regressions and direct ordinary/controlled-demo/invalid-environment exclusion checks pass in the combined suites. Provider/model/cloud/runtime activation is not inferred from these tests.

## Environment, commands and preparation history

Windows/PowerShell, isolated detached checkout of the exact candidate. Installed Node **24.19.0**, pnpm **11.19.0**, Flutter **3.47.2** / Dart **3.13.2**, Java **21.0.12.1**, Android API **36** dedicated AVD `enmori-validation-api36`. Existing Firebase CLI **15.29.0**, Admin **14.3.0**, Fastify **5.12.1**, TypeScript **7.0.2**, Firestore Emulator **1.22.0**, approved Temporal **0.5.1**; no version or lockfile changes.

Pinned launchers:

```text
NODE=C:/Users/Aa124/AppData/Local/Temp/enmori-my-friends-tools/node.exe
PNPM=C:/Users/Aa124/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs
DART=C:/Users/Aa124/fvm/versions/3.47.2/bin/cache/dart-sdk/bin/dart.exe
FLUTTER_SNAPSHOT=C:/Users/Aa124/fvm/versions/3.47.2/bin/cache/flutter_tools.snapshot
```

The command notation below names those executables, not shell-specific variable expansion:

```text
NODE PNPM install --frozen-lockfile --ignore-scripts --offline
NODE PNPM install --frozen-lockfile --ignore-scripts
DART FLUTTER_SNAPSHOT pub get --offline --enforce-lockfile
NODE PNPM backend:verify
DART FLUTTER_SNAPSHOT test --no-pub --reporter expanded
DART analyze --fatal-infos lib test
NODE build/pr69-source-union.mjs
NODE build/pr69-run-isolated-emulators.mjs
NODE tool/run_my_friends_emulators.mjs --android emulator-5554
```

The Emulator wrapper invokes the committed Firebase CLI with `emulators:exec --project demo-enmori-rmvp01a-r10 --only auth,firestore --config firebase.json --non-interactive "node backend/scripts/run-emulator-tests.mjs"`. It checks both ports, creates a fresh temporary profile and uses the candidate's `buildControlledEmulatorTestEnvironment`; the committed child runner filters again before actual SDK/composition use. Only loopback Auth `127.0.0.1:9099` and Firestore `127.0.0.1:8080` with synthetic fixtures are used. No ambient credential profile or cloud fallback is supplied. The suite stopped both emulators and removed its temporary profile before the Android run.

The local read-only union probe has SHA-256 `809ab7f42bf54e5f07e93a1cd0dd5e304ac1723205325341cf9a7ac78b209615`; the controlled launch wrapper has SHA-256 `cfb9f93d61b342d79190bb3694fd146b826728108c6ea07e4a2202ddda558bc6`. Both are ignored under `build/`; neither modifies product source. Logs remain in that directory as `pr69-backend-verify.log`, `pr69-emulator-tests.log`, `pr69-flutter-tests.log`, `pr69-dart-analyze.log`, `pr69-source-union.log`, `pr69-android-attempt1.log` and `pr69-android-attempt2.log`.

Preparation failures are retained: local Git clone and adb initially could not start their subprocesses inside the Windows sandbox; host-permitted retries succeeded before product execution. Offline pnpm resolution could not find the already approved Temporal package. Frozen online resolution reused 690 packages and fetched the two missing locked packages with lifecycle scripts disabled. Package/lock contents still match accepted #64. These setup failures are not passed product cases. No product test failure has been observed in the completed suites above.

The first Android invocation passed its 1/1 scenario and the independent pair/pointer readback, and Firebase reported child exit 0 and stopped its services. The outer runner then exited **1** with Windows `EPERM` while deleting its unique temporary profile. Inspection found zero remaining files and two empty Kotlin directories; no credential contents were read or published. No surviving Java/Kotlin process explicitly tied to that path was identified, so a specific lock owner is not claimed. After process settlement, native non-recursive deletion of the verified empty directories/profile succeeded. This is a retained cleanup failure, not a successful full invocation. The second unchanged invocation passed 1/1, repeated the persistence readback and exited **0**, including its original cleanup. No product, test or runner source was modified. The twice-executed scenario is reported as one distinct Android case, not two cases.

## Android execution boundary

The existing `integration_test/my_friends_real_backend_test.dart` and `tool/my_friends_android_fixture.mjs` execute two synthetic accounts against actual local Firebase Auth and a temporary HTTPS Backend, using application repositories and router. Assertions cover request/accept/list, 20/20/2 page replacement, Private/unset-name omission, owner switching, reload/reopen and test-only injected HTTP-offline recovery. Host rereads verify the accepted pair, consumed pending request and both persisted owner pointers. Both runs emitted the scenario marker `MY_FRIENDS_ANDROID_TWO_ACCOUNT_ACCEPT_PAGING_PRIVACY_UNSET_RELOAD_ERROR` and the host marker `MY_FRIENDS_ANDROID_TWO_ACCOUNTS_ATOMIC_POINTER_READBACK` with Pass.

The final passing APK has **80,026,864 bytes**, SHA-256 **`c928cf6139c644998a98191d96b8ac23d9a9645d9c298d6c0589f5a9196ca54b`**. First-attempt APK: 80,026,852 bytes / `267d4ffd6fe9ad4ee9fa31d2e5b9de01bfe1cdd5a48dcaadd1596e25198927ab`. They embed different ephemeral fixture configurations; neither is uploaded or a release artifact.

Android used a candidate-specific ASCII junction, not the older My Friends checkout. Existing tool/cache paths were explicitly passed via `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ENMORI_TEST_OPENSSL`, `ANDROID_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, `JAVA_HOME` and `FIREBASE_EMULATORS_PATH`. Windows test-library discovery stays in the fresh isolated profile. The bridge is `10.0.2.2` with temporary certificate trust, not a TLS bypass. The full three-component coexistence is demonstrated by the real Emulator shared-app case; this Android fixture intentionally composes the existing My Friends/Profile path. It does not supply Android Persona/history pages, an all-feature Android app, new Home/Event device reruns, screenshots, accessibility or physical-device/iOS evidence; those are **Not Run in this gate**. Applicable retained behavior is covered by the full Backend/Flutter suites, with no expanded UI acceptance claim.

## Remaining decisions and delivery boundary

JIN's execution and source conclusion are delivered on **9 October 2026**, before the stated 17:30 SGT first-result estimate. The new tree now has the scoped results above; LI's independent review of this evidence remains required. No fixed review/acceptance completion time is assigned to LI. No remote merge, Issue/Project state change or runtime/index deployment is performed.

Original 42-route / 38-state target, five-owner/reviewer chain and 11 October boundary remain. This tree supplies the bounded My Friends/read/Persona Backend combination, not missing history/Footprint/Calendar pages, Persona M23–M25 P08 pages, M26 AI presentations/M27 safety, remaining Friend search/public Profile/Recommendation/Activity/real-account consumers, or real Event access/use/mapping. #68 now has its separate implementation authority and document gate; its new client checks remain Not Run here. Other unfinished original mappings require LI's explicit scope disposition; they are not silently cancelled or deferred. UAT, Release and full Sprint acceptance remain separate.

## Reproducible reviewer-only helpers

Save these blocks under the named ignored `build/` paths after building the pinned candidate. They are execution/inspection helpers; no product source is patched.

`build/pr69-source-union.mjs`:

```javascript
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROUTE_INVENTORY } from '../backend/dist/src/transport/route-inventory.js';
const repo = process.cwd().replaceAll('\\', '/');
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${repo}`, ...args], { encoding: 'utf8', windowsHide: true });
const head = '00cb606961bfeb1cbe09bcd6afdc040c08b57ce1';
const inputs = ['5bdbcf8d61e0d84ba13e2146167db48704a1e7ae', '2d2a81d85a10e0ced88199a25b373289030dbf26', '885dbcc87fe8574265014eb4305c49fc0950daa3'];
assert.equal(git('rev-parse', 'HEAD').trim(), head);
const document = sha => JSON.parse(git('show', `${sha}:api/openapi.json`));
const target = document(head), sources = inputs.map(document);
for (const input of inputs) git('merge-base', '--is-ancestor', input, head);
const verbs = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);
const operations = source => new Map(Object.entries(source.paths).flatMap(([path, value]) => Object.entries(value).filter(([method]) => verbs.has(method)).map(([method, operation]) => [`${method.toUpperCase()} ${path}`, operation])));
const expected = new Map();
for (const source of sources) for (const [key, operation] of operations(source)) {
  if (expected.has(key)) assert.deepEqual(operation, expected.get(key), `Source operation conflict: ${key}`);
  expected.set(key, operation);
}
assert.deepEqual(operations(target), expected);
const inventory = ROUTE_INVENTORY.map(row => `${row.method} ${row.path}`);
assert.equal(new Set(inventory).size, inventory.length);
assert.deepEqual([...inventory].sort(), [...expected.keys()].sort());
for (const row of ROUTE_INVENTORY) {
  const operation = expected.get(`${row.method} ${row.path}`);
  assert.deepEqual(row.successStatuses, Object.keys(operation.responses).filter(status => /^2\d\d$/.test(status)).map(Number));
}
const schemaNames = new Set(sources.flatMap(source => Object.keys(source.components.schemas)));
assert.deepEqual(Object.keys(target.components.schemas).sort(), [...schemaNames].sort());
const errorCodes = new Set();
for (const source of sources) {
  assert.deepEqual(target.components.securitySchemes, source.components.securitySchemes);
  for (const [name, schema] of Object.entries(source.components.schemas)) {
    if (name !== 'ErrorEnvelope') assert.deepEqual(target.components.schemas[name], schema, name);
    else {
      const original = structuredClone(schema), actual = structuredClone(target.components.schemas[name]);
      for (const code of original.properties.error.properties.code.enum) errorCodes.add(code);
      original.properties.error.properties.code.enum = [];
      actual.properties.error.properties.code.enum = [];
      assert.deepEqual(actual, original);
    }
  }
}
assert.deepEqual([...target.components.schemas.ErrorEnvelope.properties.error.properties.code.enum].sort(), [...errorCodes].sort());
const manifest = sha => git('ls-tree', '-r', sha).trimEnd().split('\n').filter(line => {
  const path = line.split('\t')[1];
  return !path.startsWith('docs/') && !path.toLowerCase().endsWith('.md');
}).join('\n') + '\n';
const payload = manifest(head);
assert.equal(payload, manifest('cef93e782cff5a952ce6176b02055d9ad8de535b'));
console.log(JSON.stringify({ head, sourceAncestors: inputs.length, operations: expected.size, uniqueInventory: inventory.length, schemas: schemaNames.size, errorCodes: errorCodes.size, nonDocumentFiles: payload.trimEnd().split('\n').length, payloadSha256: createHash('sha256').update(payload).digest('hex'), result: 'Pass' }));
```

`build/pr69-run-isolated-emulators.mjs`:

```javascript
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { buildControlledEmulatorTestEnvironment } from '../backend/dist/src/shared/infrastructure/firebase/controlled-emulator-environment.js';
assert.equal(process.version, 'v24.19.0');
for (const port of [8080, 9099]) await new Promise((done, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(port, '127.0.0.1', () => server.close(done));
});
const directory = mkdtempSync(join(tmpdir(), 'enmori-pr69-jin-'));
try {
  const env = buildControlledEmulatorTestEnvironment({ ...process.env,
    GCLOUD_PROJECT: 'demo-enmori-rmvp01a-r10', GOOGLE_CLOUD_PROJECT: 'demo-enmori-rmvp01a-r10',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }, directory);
  env.CI = 'true'; env.FIREBASE_CLI_DISABLE_USAGE = 'true';
  env.FIREBASE_EMULATORS_PATH = process.env.FIREBASE_EMULATORS_PATH;
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
      'emulators:exec', '--project', 'demo-enmori-rmvp01a-r10', '--only', 'auth,firestore',
      '--config', 'firebase.json', '--non-interactive', 'node backend/scripts/run-emulator-tests.mjs'],
      { env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('exit', done);
  });
  process.exitCode = code ?? 1;
} finally {
  const child = relative(realpathSync(tmpdir()), realpathSync(directory));
  assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
  rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.info('JIN isolated launcher temporary profile removed.');
}
```
