# JIN — History/shared-source gate for #84, 13 October 2026 SGT

JIN completed the applicable current-source executions below. This packet is submitted for **SHI's new composition/fixture review and LI's independent gate review and bounded acceptance**, which remain Pending. It does not mark #84 Done or replace accepted component reviews.

## Exact candidate and delivery

- Product candidate: [#94 `bfee3639ede6e2f406ea5253db523110545c7671`](https://github.com/3427564237/enmori-app/commit/bfee3639ede6e2f406ea5253db523110545c7671), tree `4adc2ea32a09f8393cf2110f7c05eef6a197d42c`. Executable checkpoint `8b7698d7f6cbfa8c282b74ca52b0d66e06eda4a2`; bfee's final commit adds evidence only.
- Base contribution: accepted [#87 `9a4931dd9c04db75ca466d7c17f978329a252256`](https://github.com/3427564237/enmori-app/commit/9a4931dd9c04db75ca466d7c17f978329a252256). [DU final-delta APPROVE 5502870029](https://github.com/3427564237/enmori-app/pull/94#pullrequestreview-5502870029) and [LI's scoped #94 acceptance](https://github.com/3427564237/enmori-app/blob/d5aef551e40e63d368796563cee11b4cb4f0f167/docs/decisions/2026-10-13-li-history-shared-component-acceptance.md) are retained.
- This containing Git commit adds only three gate-fixture files and two evidence files over bfee. Product code, existing tests/tools, API, schema, dependencies and configuration are unchanged by JIN. The fixture overlay actually executed is bound by normalized Git blobs and SHA-256 in the [manifest](2026-10-13-jin-history-shared-source-gate-manifest.json); the containing commit gives its immutable publication identity.
- New fixtures: [real shared History Android case](../../../integration_test/jin_history_shared_real_backend_test.dart), [guarded wrapper](../../../tool/jin_history_shared_gate.mjs) and [certificate helper](../../../tool/ExportPkcs12Pem.java). The first two adapt accepted #89's isolated real History fixture to the actual #94 Home/router composition. The Java helper is byte-identical after Git normalization to accepted #89 `6ef6978c4dcdba79b66c781ba99d851aa4e26955`.
- **#95 and #96 are not integrated here.** [JIN's separate #96 APPROVE](https://github.com/3427564237/enmori-app/pull/96#pullrequestreview-5505428435) does not add its source to this candidate or replace its LI acceptance. Accepted History was not held waiting for AI readers/cleanup or old PR merges.

Ten owner source bindings and six exact DU contribution blobs were checked. The current archive has 56 exact working-byte matches and 794 CRLF-equivalent matches against its 850 Git files. Backend/API/Auth/AI, original tools, locks, default bootstrap, Firebase/index and Gradle configuration are unchanged from #87; the native History bridge is the accepted DU blob. Normative API remains **27 operations / 33 schemas**. Ordinary isolated-feature enablement remains disabled. All 435 compiled Backend files used by the Android checkout match the freshly built current archive byte for byte; this is identity evidence, not another test count.

## Actual JIN execution

All rows bind to bfee plus the identified gate fixture where applicable. Earlier owner/LI/#87/#91 totals are not relabelled onto this source.

| Check | Actual result |
| --- | --- |
| Strict Backend build/full regression | **543/543 Pass**, exit 0; failed/cancelled/skipped/todo all 0. |
| Guarded actual Auth/Firestore Emulator full suite | **73/73 Pass**, outer exit 0; failed/cancelled/skipped/todo all 0. |
| Flutter full unit/widget suite | **489/489 Pass**, exit 0. |
| Fatal-info analysis | `lib test integration_test`: no issues. New real-History fixture also separately analyzed: no issues. |
| Non-writing Dart format | Current nine changed Dart files: zero changes. New gate fixture: one file, zero changes. |
| New Node wrapper syntax | `node --check tool/jin_history_shared_gate.mjs`: Pass after the receipt-cleanup fix. |
| Exact #87-to-bfee contribution whitespace | Pass, exit 0. New packet whitespace checked before publication. |
| Full inherited whitespace | **Fail/exit 2**: retained EOF blank line in `docs/decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md:56`. Nonblocking documented exception, not an all-checks-pass claim. |
| API36 shared History synthetic page flow | **7/7 Pass**, outer exit 0. |
| API36 shared AI synthetic page flow | **7/7 Pass**, outer exit 0; no real AI storage/model. |
| API36 shared History → actual Auth/HTTPS Backend/Firestore | **1/1 Pass**, outer exit 0; six list reads, one saved-item read; independent host reread finds all 22 own rows unchanged. |
| API36 isolated Search | **1/1 Pass**, outer exit 0; host reread finds all 341 seeded authority/Profile/pair/pointer records unchanged. |
| API36 My Friends/Profile | **1/1 Pass**, outer exit 0; independently persisted friendship and both owner/peer list pointers agree after acceptance. |
| API36 Persona PC13 | **1/1 Pass**, outer exit 0; independent owner revision4/peer revision0, both Persona collections empty after the active-delete path. |

The two synthetic device groups reuse logical cases in the 489 suite and are **not added** to it. The four real fixtures are separate executions on one source; no combined all-feature Android journey is fabricated. Auth/Firestore runs use the trusted Backend/Admin path and do not establish client Firestore security-rule acceptance. Persona semantics/injected keyboard cases are not new human TalkBack or physical-keyboard verification.

Only the task-owned `enmori-validation-api36` AVD was used. No user's physical phone or pre-existing ordinary app was targeted. Shared History/AI, real History and Persona APKs use `com.enmori.app.personatest`; the unchanged approved Search/My Friends wrappers build `com.enmori.app` inside this initially empty dedicated AVD. All six retained local output APK identities were independently read using locked `aapt2 dump badging`; target SDK36. This is API36 execution, not API24/25 proof. Installed APK hashes were not independently extracted.

## New real-History proof and teardown

The new fixture uses the actual `IsolatedHistoryHomeApp`, shared router, feature controller/Repository, native IANA zone and actual Auth Emulator token → local HTTPS Backend → Firestore path. It supplies a controlled authenticated-session observer; it is not proof of the production Auth lifecycle. One synthetic owner and 22 approved Check-in fixtures are created in an empty fixed-demo-project environment, with private temporary TLS/configuration material and no cloud fallback.

At `Asia/Singapore`, selected date `2026-10-13`, the device performs Home → Footprint/History, page20/Next2/Reload, previous-day empty, return to today, saved Check-in read, **programmatic `router.pop()`** followed by fresh History reload, and History AppBar Back to Home. The saved return is not hardware/system Back evidence. The host independently compares all 22 IDs, Notes, creation times and visibility values; no mutation occurs. Raw values are not published.

The final wrapper invocation verifies its exact own onboarding receipt existed before deletion and is absent afterward; Auth0 and all returned collections empty; test package and owned reverses absent; private profile removed after SDK/server/CLI shutdown. It attempts every owned cleanup step and reports failed-step numbers without content. It deletes only the receipt derived from this run's UID/operation/key, never the entire idempotency collection. This known-fixture cleanup is not a universal orphan-descendant or AI source-cleanup SLA guarantee.

Search/My Friends use their unchanged fixture teardown: server/SDK closure, attempted synthetic Auth deletion, private certificate/config removal and fresh-profile/volatile Emulator disposal. Those wrappers do not supply a new Auth0/empty-store assertion; none is claimed. Persona retains its own partition teardown and state assertions. Final independent readback confirms no current fixture profiles or loopback listeners on 8080/9099/4400/4500/9150. Pre-shutdown checks confirmed no ENMORI test packages, owned forward/reverse maps, and restored `GMT`, automatic-zone1 and font1.0. The owned AVD launcher returned exit0 and adb subsequently listed no devices. Shared Gradle/adb daemons were not killed or claimed owned. Two task-created archive dependency junctions were removed; their shared cache remains.

## Failures retained

- Earlier #94 `8189ac5` executions/interrupted AVD starts remain historical, not current results. The earlier 17:20 SGT estimate was missed after interruption. The later 23:50 estimate was conditional; no old 11/12 October deadline is rewritten or asserted achieved.
- Real History first invocation: native regional-IANA guard rejected `GMT` before SDK fixture initialization, **outer exit1**. Only the owned AVD was temporarily set to `Asia/Singapore` and later restored.
- Real History next invocation: device1/1 and host22 passed, but omitted own onboarding receipt made cleanup fail, **outer exit1**. Only the JIN wrapper's exact receipt cleanup was corrected; product code/device assertions did not change. The subsequent complete invocation passed with **outer exit0**. Repeats do not add cases.
- Search emitted a Flutter teardown `DELETE_FAILED_INTERNAL_ERROR` while attempting the `.personatest` identifier although its output APK identity was `com.enmori.app`; it is not represented as a successful uninstall. My Friends' first install then rejected the prior owned Search debug signature; Flutter removed that owned AVD package and reinstalled. Both complete scenarios/wrappers ultimately exited0. Final package absence is separately checked.
- The initial whole-gate cleanup command exited1 on its immediate adb-device-absence assertion after the owned launcher process exited. All earlier settings/package/map/port/profile assertions had passed. Subsequent readback at 23:15 SGT found adb empty; the separate final verifier exited0 at **23:16:19 SGT**. The initial exit1 remains, not rewritten as a successful single cleanup command. Counts of any removed packages/forwards were not separately captured.
- A final sandboxed Dart format attempt failed in CLI `resolvedExecutable` initialization before formatting; its unchanged non-writing invocation outside that restricted process passed (one file, zero changes). Existing Kotlin/SDK XML warnings and the inherited EOF whitespace exception remain. No dependency migration was used to hide them.

The [manifest](2026-10-13-jin-history-shared-source-gate-manifest.json) retains log/APK hashes, failure fingerprints, exact fixture blobs, exit records and limitations. File `lastWriteSgt` values are filesystem evidence timestamps, not invented execution start/end times. Raw logs/APKs and all temporary credential material remain local. Fingerprints are identifiers of JIN-held artifacts, not another reviewer's downloaded/recomputed evidence.

## Reproduction

Use existing Node24.19.0, pnpm11.19.0, TypeScript7.0.2, Flutter3.47.2/Dart3.13.2, Java21.0.12.1, Admin14.3.0/Firestore8.7.1, Firebase CLI15.29.0 and the existing cached Emulator. Check out this packet and verify its three fixture blobs against the manifest. No dependency/version or global configuration change is required.

```text
pnpm backend:verify
node build/jin-guarded-emulators.mjs
flutter pub get --offline --enforce-lockfile
flutter test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed integration_test/history_shared_router_flow_test.dart lib/app/isolated_history_home_app.dart lib/app/router/app_router.dart lib/features/check_in/check_in_providers.dart lib/features/check_in/history_device_port.dart lib/features/check_in/presentation/check_in_history_controller.dart lib/features/check_in/presentation/check_in_history_page.dart test/app/check_in_history_shared_router_test.dart test/features/check_in_history_controller_test.dart
dart format --output=none --set-exit-if-changed integration_test/jin_history_shared_real_backend_test.dart
node --check tool/jin_history_shared_gate.mjs
```

The exact guarded full-suite launcher used is reproduced below; save it as `build/jin-guarded-emulators.mjs` under the candidate checkout after the Backend build. Use the existing verified Firebase cache through `FIREBASE_EMULATORS_PATH`, fixed loopback project and a fresh empty profile. Never run an ordinary cloud/Firebase fallback.

For Android, select only the empty named API36 AVD and preserve initial package/maps/zone/font readings. Configure existing pinned tool paths in `ANDROID_HOME`, `JAVA_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, `FIREBASE_EMULATORS_PATH`. Synthetic shared cases additionally set the existing `ENMORI_PERSONA_ANDROID_TEST=true`; run the following as **separate** invocations:

```text
flutter test --no-pub --reporter expanded integration_test/history_shared_router_flow_test.dart -d emulator-5554
flutter test --no-pub --reporter expanded integration_test/ai_shared_router_flow_test.dart -d emulator-5554
node tool/jin_history_shared_gate.mjs emulator-5554
node tool/run_my_friends_emulators.mjs --android-search emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
node tool/run_persona_android_emulators.mjs emulator-5554
```

The History wrapper needs `ENMORI_TEST_FLUTTER` and `ENMORI_TEST_ADB`; Search/My Friends/Persona use `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ENMORI_TEST_OPENSSL`; Persona also needs `ENMORI_TEST_TEMP_PARENT` outside the checkout. The component wrappers deliberately supply their own child allowlists and package flags. For real History, temporarily use a valid regional IANA zone on this owned AVD; restore its initial settings afterward. Verify each full wrapper exit and host readback; finally verify/clear only task-owned packages/maps, await asynchronous AVD disappearance, and check owned profiles/ports. Preserve failed invocations.

## Remaining independent gates and exclusions

SHI reviews the new fixture/composition and affected Event/privacy/isolation boundaries; LI independently reviews this JIN-authored evidence and makes bounded combined acceptance. Do not self-approve this packet or repeat DU's unchanged component review. #96 review duty was completed independently; its new source and #95 producer remain explicitly outside this candidate.

API24/25, human accessibility, physical-device shared History in this JIN gate, real shared AI persistence/store/cleanup/model, ordinary/real-account/provider/index enablement and whole 42-route/38-state acceptance remain unproved/outside scope as applicable. Owner physical-device evidence retains its owner attribution. Keep Draft/Open; no merge, Issue closure, Project transition, new deadline, whole-module/Sprint/UAT/Release/Done or on-time promise.

### Exact local full-Emulator launcher

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
