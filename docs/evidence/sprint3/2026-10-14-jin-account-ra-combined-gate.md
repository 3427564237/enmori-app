# JIN #84: History, Account producer and R-A combined-source gate

Recorded 14 October 2026, Asia/Singapore. This is JIN owner execution evidence for a new isolated candidate under the existing #84 assignment. It preserves accepted component checkpoints and does not repeat their approvals. SHI reviews the new composition; LI independently reviews this gate and decides bounded acceptance. Local assisting agents and their checks are not those independent reviewer approvals.

## Exact candidate and accepted inputs

| Identity | Immutable value |
| --- | --- |
| Executable candidate | `c58a4e56968e52296f13fa322c45b34bd1b3e30b` |
| Candidate tree | `4393ec335c4c0724cee8f6193912e4902decbd15` |
| Accepted History/shared input #97 | `c5bc9457d09a758c97a9afc46880065a63ef461f` |
| Accepted Account producer input #95 | `72c027933d4b3ac1a95e25dc733619a6c63522b6` |
| Accepted R-A/helper input #96 | `67056c778a03595c386a69ec7ea33046fdd4205d` |
| First two-parent merge: #97 + #95 | `4812ea42e483e84d9e94ce5c8b06b55c4b829739` |
| First merge tree | `835c5c07dc65372f094e75755491e17959f0c287` |

The candidate is a second two-parent merge of that first merge and #96, not a three-parent synthetic commit or a merge-tree-only preflight. All three accepted inputs are ancestors. All 949 recursive file blobs belong to their accepted-input union; no manual product edits were introduced. The archive used for execution binds all 949 files to the candidate: 58 byte-exact and 891 equivalent after Git CRLF normalization. Execution-only gate fixtures are separately identified below and are not misrepresented as accepted product code.

The normative API remains byte-identical to #97: 27 operations/27 inventory entries, 30 matching success-status entries, 33 schemas and 26 error codes, including Friend search and its existing error mapping. `api/openapi.json` blob is `34c528751449ae5a2ad53fd98315bed7232a13c6`; `build-app.ts` is `86e3c4801f007ba421118f84f9a61e81b719b2ac`. Controlled runtime, gateway, environment guard, dependency manifests/locks, Firebase config and ordinary entry/build wiring retain #97 bytes. The index declaration equals #95, blob `f4d8d519a990f6a4d2c1ff47423a19bbe8df8099`; it was not deployed and no cloud index behavior is claimed.

Authority remains the existing #84 assignment and [LI's accepted #97 handoff](https://github.com/3427564237/enmori-app/blob/c74b80c033a9f82d3af4e083d47dd1e703210e0a/docs/decisions/2026-10-14-li-history-shared-candidate-acceptance.md), [Account component acceptance](https://github.com/3427564237/enmori-app/blob/c74b80c033a9f82d3af4e083d47dd1e703210e0a/docs/decisions/2026-10-13-li-account-producer-component-acceptance.md), and [R-A component acceptance](https://github.com/3427564237/enmori-app/blob/237f27d5acf893729b488823ed68cc527bc6fccd/docs/decisions/2026-10-13-li-ra-reader-component-acceptance.md). GitHub readback at 11:52 SGT confirmed those three PR heads unchanged, Approved and Draft/Open. The new candidate inherits 104 changed files from the accepted inputs relative to #97; this is not a documentation-only PR. JIN adds only four gate fixtures and two evidence files over that product merge. [The accompanying manifest](2026-10-14-jin-account-ra-combined-gate-manifest.json) records exact invocation, source and artifact identities.

## Actual current-source results

| Check | Actual result and boundary |
| --- | --- |
| Strict Backend build | Pass, exit 0; 11:28:37–11:28:45 SGT. |
| Full Backend regression | 649/649 Pass, exit 0; zero failed/cancelled/skipped/todo. |
| First full Flutter invocation, default concurrency | **Fail: 504 passed / 1 failed, exit 1**; 11:30:00–11:31:33 SGT. Retained unchanged. |
| Focused unchanged Persona file | 4/4 Pass, exit 0; diagnosis only, not replacement for the failed full invocation. |
| One unchanged full Flutter comparison, `--concurrency=1` | 505/505 Pass, exit 0; 11:36:38–11:39:34 SGT, after Emulator teardown. |
| Fatal-info Dart analysis | Pass, `lib test integration_test`, exit 0. |
| Non-writing Dart format | Five changed Dart files, zero changes, exit 0. |
| Actual guarded Auth/Firestore Emulator suite | 76/76 Pass, exit 0; zero failed/cancelled/skipped/todo; 11:33:30–11:36:14 SGT. |
| Source/archive/API/index bindings | Pass for the exact values and scope above. |
| Code/API/test/tool whitespace, #97..candidate | Pass, exit 0. |
| Full #97..candidate whitespace | **Fail, exit 2**, five inherited evidence-file findings listed below. |
| Android and host persistence | Seven separate invocations below, each outer exit 0; synthetic and real Backend fixtures are explicitly separated. |

The first Flutter failure is `test/features/personas/persona_client_session_test.dart:58`, “real client/session: timeout -> recovery 412 -> original late 201 (headers)”, with a null-check exception. That unchanged test uses a 40 ms initial-load timeout and then dereferences `pendingCreate`. A timeout under concurrent load is a plausible explanation, not an established root cause. No product or test source was changed. The focused and serial runs are distinct invocations and are not added as distinct test cases. The default-concurrency failure remains a limitation for independent gate review; this record does not claim every invocation passed.

The five full-diff whitespace findings are retained under `docs/evidence/sprint3/2026-10-13-zhou-review-publication/`: `independent/fence-runner-negative-review.mjs:43` (blank EOF line), `mobile/ra-history-tombstone-red.log:54`, and line 1 of `ra-reader/android-build-final.txt`, `ra-reader/android-harness-build-final.txt`, `ra-reader/flutter-analyze-final.txt` (trailing whitespace). Existing historical receipts were not rewritten to turn this into Pass.

## Account producer binding and Emulator isolation

The 76 cases include #95's three committed Account producer cases; these are not three extra cases. Execution-only instrumentation observed eight `FirebaseAdminFirestoreGateway.runTransaction` calls for that test file. Before each original call it checked the actual held Firestore SDK settings against the validated child environment: demo project `demo-enmori-rmvp01a-r10`, `127.0.0.1:8080`, and `ssl=false`. The original call delegates through `Reflect.apply` with its original `this`, arguments and return value; no fixture construction, transaction logic, retry policy or SDK settings are changed, and no diagnostic network I/O is added. A persistent failure latch makes a caught assertion fail the process, so a repository cannot disguise it as an expected dependency error.

These observations prove the exercised gateway used the controlled SDK endpoint, not that a pure environment flag alone authorized it. Call counts are audit diagnostics, not tests or read-budget totals. The audit intentionally inspects the pinned SDK's internal settings and is not a portable SDK API guarantee.

Pinned stack: Node 24.19.0, pnpm 11.19.0, TypeScript 7.0.2, Firebase Admin 14.3.0, Firestore 8.7.1, Firebase CLI 15.29.0, Firestore Emulator 1.22.0, Java 21.0.12.1; Flutter 3.47.2 / Dart 3.13.2. The launcher checked the locked SDK/CLI versions and cached emulator JAR checksum. It required free loopback ports before startup and used separate empty private profiles for the CLI and test worker with the existing sanitized-environment guard. It did not use ordinary/cloud credentials or a cloud fallback.

The final run removed both owned profiles, shut down the CLI/SDK process chain and observed ports 8080/9099/4400/4500/9150 free. It did not erase unrelated profiles or processes. The first attempt, 11:31:04–11:32:41 SGT, failed before test bodies loaded: Node rejected a Windows absolute `--import` path with `ERR_UNSUPPORTED_ESM_URL_SCHEME`; eight test files failed loading, outer exit 1. Its log and exact helper snapshots are retained. Only the worker was corrected to use `pathToFileURL`; product source stayed unchanged. The second complete invocation supplies the 76/76 result and successful teardown.

## Actual Android and persistence evidence

All invocations used the task-owned `enmori-validation-api36` / `emulator-5554` AVD, exact product source `c58a4e5`, and source-bound fixtures. No physical phone was used. The new R-A test is JIN-authored gate code with a separate exact hash; the other six fixtures are unchanged accepted inputs.

| Invocation | Result | SGT interval | Evidence boundary |
| --- | --- | --- | --- |
| Shared Home/History/saved-return | 7/7, outer 0 | 11:48:04–11:49:53 | Synthetic wire; seven cases overlap committed widget coverage |
| Shared Home/AI/Settings/session | 7/7, outer 0 | 11:50:22–11:52:03 | Synthetic wire; seven cases overlap committed widget coverage |
| New R-A shared route | 1/1, outer 0 | 11:41:55–11:46:20 | Synthetic wire; real accepted Home/router/client; Leave/re-entry/check/session protection |
| History owner-date/saved-return | 1/1, outer 0 | 11:52:34–11:56:58 | Actual Auth Emulator -> HTTPS Backend -> Firestore; independent host reread and own-fixture cleanup |
| DisplayName Search/My Friends | 1/1, outer 0 | 11:57:20–11:59:12 | Actual Auth/HTTPS Backend/Firestore; full seeded-record host comparison |
| My Friends/Profile/request | 1/1, outer 0 | 11:59:37–12:01:32 | Actual Auth/HTTPS Backend/Firestore; atomic pair and both pointer reread |
| Persona PC13 | 1/1, outer 0 | 12:01:56–12:06:02 | Actual Auth/HTTPS Backend/Firestore; owner revision4/empty Personas, peer revision0 independent reread |

The R-A case verifies that Leave returns Home without dispatch/deletion, same-session re-entry and explicit readback retain the original unresolved target, and same-UID session replacement clears its state. It does not assert real AI persistence, producer access, a model response, or physical Back. These three synthetic groups do not add cases to the 505-unit/widget total. The four real fixtures are separate resettable applications on the same source, not one all-feature or real-AI journey. The isolated Account producer's actual transaction evidence is the three included Emulator cases; it is not falsely attributed to ordinary Android Account wiring.

Before any installation the dedicated AVD had no ENMORI package, forward or reverse mapping. Initial timezone was GMT, automatic-zone1 and font1.0. History's real device-IANA case temporarily used Asia/Singapore with automatic-zone0; final successful readback restored all original settings. Per-run cleanup checked ADB exit0 and empty ENMORI package/reverse inventories. Final verification checked remaining profiles and all five Emulator ports, then observed the owned AVD device and launcher disappear after asynchronous shutdown. Shared adb/Gradle daemons and other devices were not stopped. Fixture cleanup is not proof of a real-AI retention/source-cleanup SLA.

The first AVD readiness read saw the device offline during boot; no test ran before a later boot1 and successful initial-state checks. In the R-A invocation, Flutter internally attempted to uninstall an absent `com.enmori.app` and reported `DELETE_FAILED_INTERNAL_ERROR`; the test itself completed 1/1/exit0, and the outer wrapper subsequently removed the actual owned `.personatest` package and verified absence with exit0. The warning remains in the log; it is not renamed a clean internal uninstall. Per-invocation warnings are recorded in the manifest. No pre-existing ordinary app was removed.

APK hashes identify the local output produced by each successful build/test invocation. No installed APK was independently downloaded/hashed. Raw APKs/logs, temporary credentials and private profiles are not published. The host wrapper was checked before its first execution and remained unchanged for all seven runs.

## Reproduction and evidence identity

Run from a clean checkout of the executable candidate with the already provisioned pinned toolchain, locked dependencies and verified cached emulator. Keep logs/credentials/APKs local. The accompanying exact `.mjs` originals are stored under `docs/evidence/sprint3/fixtures/2026-10-14-jin-next-gate/`; copy them byte-for-byte into repository `build/` before the Emulator command. The Dart gate fixture is stored at `integration_test/jin_ra_shared_gate_test.dart`. The copied fixtures augment execution only; they do not change the candidate product payload.

```text
pnpm backend:build
pnpm backend:test
flutter pub get --offline --enforce-lockfile
flutter test --no-pub --reporter expanded
flutter test --no-pub --reporter expanded test/features/personas/persona_client_session_test.dart
flutter test --no-pub --reporter expanded --concurrency=1
dart analyze --fatal-infos lib test integration_test
node build/jin-guarded-emulators.mjs
```

The recorded Flutter commands invoked the pinned Dart binary and `flutter_tools.snapshot`; `flutter` above means that same pinned toolchain. Non-writing format checks cover `ai_conversation_providers.dart`, `presentation/ai_conversation_page.dart`, `presentation/ai_conversation_state.dart`, and the corresponding page/recovery tests, using `dart format --output=none --set-exit-if-changed`.

After reserving the dedicated API 36 AVD and applying the existing test-package environment, the applicable commands are:

```text
flutter test --no-pub --reporter expanded integration_test/history_shared_router_flow_test.dart -d emulator-5554
flutter test --no-pub --reporter expanded integration_test/ai_shared_router_flow_test.dart -d emulator-5554
flutter test --no-pub --reporter expanded integration_test/jin_ra_shared_gate_test.dart -d emulator-5554
node tool/jin_history_shared_gate.mjs emulator-5554
node tool/run_my_friends_emulators.mjs --android-search emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
node tool/run_persona_android_emulators.mjs emulator-5554
```

Set the existing pinned tool paths (`JAVA_HOME`, `ANDROID_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, `FIREBASE_EMULATORS_PATH`, and the applicable `ENMORI_TEST_*` wrapper paths); reserve only the named task-owned AVD and save its initial settings/maps/packages. Real History requires the selected region-style IANA zone, then restoration. Synthetic Android invocations use the existing debug-only `ENMORI_PERSONA_ANDROID_TEST=true` package suffix; real fixture wrappers retain their own package/environment checks. Local `run-android.ps1` records the owner host's paths and receipts; those paths are not credentials or portable configuration defaults. The exact execution file is retained, rather than edited after execution to appear portable.

| Evidence fingerprint | SHA-256 |
| --- | --- |
| Backend full log | `a5d5f7936bb0fa068007b6f33fd0478d113869cc662c1109395b31ee10e98ad7` |
| Flutter first full failed log | `ebabdc92b73eb61784df7dcf3d10dfdce3bb585dfa703d5e7859d8bcb2a36ebd` |
| Flutter focused log | `295ccc82010cf99f738439eed05721c47b58b4c61c79643db2b285aa54d86277` |
| Flutter serial full log | `1a4ae2acbd3c1fad5e9f24ab3d1d38e3225f7954fc4c5cf7c140e45d4546ea72` |
| Final Emulator log | `d1d60e9f7bc324f421d7f4620b544e552d9d252c28ec8d22307f59029c1354a5` |
| First failed Emulator log | `a4afb61012658815c1f7e38b78c7e19ece18b38350f9f4a95028257ed9422f5a` |
| `jin-actual-gateway-binding.mjs` | `94db443e00872689865a6740de33abbfcc729dcd66143afbebf30456844760c1` |
| `jin-emulator-worker.mjs` | `78c95a18b5c60beda6bc996e9fad64ddee4ccc9f780a5ee6bf3603b8abb2264c` |
| `jin-guarded-emulators.mjs` | `7f5f55b49916cac392309661901177ac99362ebaed75380ef41c3cced94f5b7e` |
| JIN R-A shared fixture | `6f264b5dd368901aa24993509e61934af0b76df069b524ae03863497c20117c9` |
| Dedicated Android wrapper, reviewed before first execution | `35e9a039a517a086e49153eb30ed7653e4cca6af2e3ec881a303729e30c4068b` |

The table fingerprints the original executed filesystem bytes. Fixture publication normalizes CRLF to LF; the manifest separately supplies each execution SHA-256, normalized Git SHA-256 and Git blob ID. Private log/APK hashes are owner-local identifiers, not reviewer downloads or independently recomputed reviewer hashes. Execution receipts and source checks are retained under the gate workspace; the accompanying manifest binds the copied fixtures and sanitized receipts to their actual published paths without publishing temporary credentials, private profiles, raw content or APKs.

## Remaining boundaries and handoff

The new source includes the accepted Account producer, R-A client behavior and prepared helpers; `PreparedRealContextReader`, retention/path policies and cleanup-related declarations remain unwired to real product readers/stores/cleanup. There is no complete real-AI persistence, ACK-loss recovery, source-cleanup or model-host proof. Accepted #92/#96 capability-only observations remain inherited evidence; no new capability-probe execution is claimed. Real Note canonical-time/writer/permanent-deletion/no-restore/no-reuse obligations remain local to their dependent reader/cleanup wiring. API24/25, production Auth, physical hardware Back, human accessibility, UAT and Release were not established by this gate. Controlled Account producer tests do not release ordinary/real-account wiring, and an index declaration is not an index deployment. The source does not silently lift producer/retention/cleanup prerequisites.

SHI's new-composition/isolation review and LI's independent review of this JIN evidence remain **Pending**. The default-concurrency Flutter failure is not root-cause-closed by the serial Pass; it remains explicitly presented for the independent reviewers to assess. Delivery does not decide its acceptance disposition. This is not self-approval, a replacement for those roles, or a claim that a previous gate certifies a new tree. Preserve the original 42-route/38-state targets, original deadlines and outstanding mappings. No merge, Issue closure, Project transition, ordinary/cloud/live-model enablement, deployment, whole-module/Sprint/UAT/Release completion or on-time promise is made.
