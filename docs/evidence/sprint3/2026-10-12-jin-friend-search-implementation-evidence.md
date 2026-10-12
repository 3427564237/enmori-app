# JIN isolated Search My Friends implementation and evidence

12 October 2026, Asia/Singapore. Owner JIN ZIHAN; new-code reviewer SHI ZHENGQI; bounded PM acceptance LI HOURUI. Delivery for [#77](https://github.com/3427564237/enmori-app/issues/77), parent #44. Owner execution evidence is submitted for review, not an independent approval or acceptance.

## Authority and exact source

- LI explicitly released FS01–FS05 substring search and all five acceptance groups in [S-PM-1012-LI-FRIEND-SEARCH-INTERNAL-AI-A at `06082d3`](https://github.com/3427564237/enmori-app/blob/06082d3afe7706440aaba82b57fc4a23acf4f67c/docs/decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md). The immutable candidate is [#75 `3788df5`](https://github.com/3427564237/enmori-app/blob/3788df59069653993476e2391510c8a4c1c2a1c0/docs/planning/2026-10-11-jin-friend-mapping-and-search-delta.md). Its former proposal/Pending language is historical after this specific approval; no unchanged proposal review is requested.
- Product base: accepted #72 `0839c46b865bb6092020ad0ae77e17922ea40eb0`, branch `codex/issue-68-persona-local`. Implementation/test/tool source: **`b43e0a9b08aa4fe70847458df4c24c3ae62dd36a`**, branch `codex/issue-77-friend-search`. The subsequent evidence commit changes this Markdown only. The PR pins its final published head.
- Twenty implementation/contract/test/tool files change from the accepted base. Shared Home/router, shared Auth implementation, Android configuration, dependencies and lockfiles do not change. Removing the one new operation from the parsed OpenAPI leaves the baseline document semantically identical: **27 operations, 33 schemas**; the existing 26-operation/schema/security/error contract is preserved. Inventory/OpenAPI agreement tests pass.
- Existing #61 component, #73 final gate, #74 report and #75 proposal reviews retain their exact source and attribution. This is new #77 component evidence; it does not relabel those older gates or supply a new LI combined-candidate acceptance.

## Delivered behavior and owner results

| Approved group | Actual behavior and source | Actual result |
| --- | --- | --- |
| 1 — Domain/Application | [Search normalization/cursor](../../../backend/src/friends/domain/friend-search.ts), [31 new Backend cases](../../../backend/test/friend-search.test.ts): well-formed Unicode; Cc/Cf/Zl/Zp rejected before ECMAScript trim/NFC/lowercase/NFC; 1–50 normalized query scalars; substring only; original stored display value returned. Accent and case examples, invalid inputs and unchanged Q18 Username behavior covered. Lowercasing expansion of an already-valid stored name is not incorrectly constrained by the query limit. | Pass; included in **397/397** strict Backend tests (366 retained + 31 new), not additional counts. |
| 2 — Port/transport/OpenAPI | [Approved operation](../../../api/openapi.json) and [transport](../../../backend/src/transport/register-isolated-slices.ts): single q/optional cursor, reject duplicate/unknown fields and malformed URI UTF-8; requester authority precedes input validation. Canonical unpadded base64url UTF-8 JSON with exact ordered fields/version/query and canonical UUID-v4; owner-local current continuation; safe errors and minimized response. Ordinary app injection returns 404. Controlled runtime remains unchanged and does not supply isolated slices; existing guarded composition regressions pass. | Pass; current cursor, noncanonical/invalid/foreign/stale and dependency/denial cases included. Fastify logging remains disabled; no query/cursor/content logging added. |
| 3 — Real Emulator | [Existing transactional adapter](../../../backend/src/friends/infrastructure/firestore-friend-repository.ts) reuses owner pointers and all current pair/block/eligibility/Profile/reservation checks before matching. [Actual Emulator cases](../../../backend/emulator-test/blocker-slices.integration.test.ts) cover 0/20/21, match beyond first page, empty continuation, concurrent rename/privacy/both block directions/eligibility, abort and SDK retry. No global scan, index/name copy, stored query or search write. | **73/73 Pass** (71 retained + two new scenario groups). Search injected ABORTED produced **two SDK attempts, 106 logical gets each**, one 21-row bounded scan per attempt, no lookahead expansion. These are per-attempt logical reads, not a billing/global request bound. |
| 4 — Flutter | [Repository](../../../lib/features/friends/data/backend_friend_repository.dart), [controller](../../../lib/features/friends/presentation/my_friends_controller.dart), [page](../../../lib/features/friends/presentation/my_friends_page.dart), [new tests](../../../test/features/friend_search_test.dart): real HTTP client mapping, explicit Search/Clear, Next replacement, current-query Reload, changed/resubmitted query and fresh same-UID session invalidation; blank-input focus; exact empty copy; non-actionable rows. The client preserves the server continuation without inventing a second NFC implementation. | **313/313 Pass** (308 retained + five new tests); fatal-info analysis of lib/test/integration_test clean; formatting/diff checks Pass. Auth/non-AI and existing Persona/My Friends regressions retained. |
| 5 — Android and persistence | [Committed Android scenario](../../../integration_test/my_friends_real_backend_test.dart), [fixture](../../../tool/my_friends_android_fixture.mjs), [guarded launcher](../../../tool/run_my_friends_emulators.mjs). Actual Auth Emulator → HTTPS Backend → Firestore, dedicated API36 AVD, source `b43e0a9`. | Search **1/1 Pass**, entire invocation **exit 0**, independent host equality checks over **341 seeded records** Pass. Separate unchanged-source My Friends regression **1/1 Pass**, pair/two-pointer readback Pass, entire invocation **exit 0**. |

The search Android scenario starts with 42 established synthetic friends. `TARGET_42` gives two empty scanned pages with continuation, then the authorized matching row; Reload returns to the first search page; Clear restores the unsearched first page, followed by an independent reload. The host rereads every seeded Account/Profile, binding, eligibility, reservation, initialized index, pair and pointer and compares it to initialization. No read-only search mutation is accepted. The UI checks actual semantic labels, minimum 48dp Search/Clear/Reload/Next heights and blank-input focus. It does not establish human TalkBack traversal, audible speech, physical keyboard use, global visual/accessibility conformance or a real-account flow.

The separate My Friends Android fixture retains request/send/recipient accept, owner switch, 20/20/2 pagination, private/unset-name filtering, reload/error recovery and host atomic pair/pointer readback. It is not an extra distinct search case or an invented all-feature Android flow. Persona Android, history UI, model/provider and any later changed combined-tree gate are **Not Run** for this increment. Existing accepted Persona/device evidence remains attributed to its original source.

## Environment, commands and teardown

Windows/PowerShell; Node **24.19.0**, pnpm **11.19.0**, TypeScript **7.0.2**, Flutter **3.47.2**, Dart **3.13.2**, Java **21.0.12.1**, existing Android build-tools **36.0.0**. Locked dependencies were reused. Installed pinned Dart/Flutter executables were invoked directly, consistent with the previously recorded local FVM launcher issue. Strict TypeScript `skipLibCheck: false` is unchanged.

Implementation checkout and an existing clean ASCII Android checkout both use `b43e0a9`. The local Android wrapper asserts the full source SHA, exact `enmori-validation-api36` AVD and completed boot before launching. Actual device: `emulator-5554`, `sdk_gphone64_x86_64`, Android **16/API36**, font scale **1.0** before/after. APK metadata: **com.enmori.app**, version **1.0.0/code 1**, minimum SDK24, target/compile SDK36. This ordinary package ID was used only on the dedicated synthetic AVD; no personal device or real app data was operated. No ordinary product enablement follows from this test wiring.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test "backend/dist/test/**/*.test.js"
flutter test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed <changed Dart files>
# Full suite via the same guarded local launcher documented in #73:
node build/jin-final-emulators.mjs
# Committed focused Backend runner (includes the new two Emulator groups):
node tool/run_my_friends_emulators.mjs --backend
# Actual device invocations, serialized on the asserted dedicated AVD:
node tool/run_my_friends_emulators.mjs --android-search emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
git diff --check 0839c46b865bb6092020ad0ae77e17922ea40eb0 b43e0a9b08aa4fe70847458df4c24c3ae62dd36a
```

The full-suite command actually ran the local `build/jin-final-emulators.mjs` already described in [the #73 reproduction](https://github.com/3427564237/enmori-app/blob/c3e1f84bd305093ffe7f4d6d83b6df3d0289baa5/docs/evidence/sprint3/2026-10-10-jin-final-isolated-candidate-gate.md#environment-and-reproducibility); it is not a tracked file. It allocates a fresh temporary profile through `buildControlledEmulatorTestEnvironment`, checks free loopback ports, and invokes Firebase CLI `emulators:exec --project demo-enmori-rmvp01a-r10 --only auth,firestore --config firebase.json --non-interactive "node backend/scripts/run-emulator-tests.mjs"`. The committed child runner validates another fresh filtered profile and runs the complete isolated suite. The focused committed `--backend` command above is available for independent search/race reproduction; it is not claimed as the source of the 73-total run.

Both Android invocations use separate fresh filtered profiles and the existing `demo-enmori-rmvp01a-r10`, Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`; HTTPS binds loopback on an allocated port with the existing short-lived fixture certificate. Android reaches the host through 10.0.2.2. No cloud fallback, real account, provider/model or index deployment. Required local paths are supplied through the launcher's existing `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ENMORI_TEST_OPENSSL`, `ANDROID_HOME`, `JAVA_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME` and `FIREBASE_EMULATORS_PATH` inputs.

Each host fixture settles HTTPS/Fastify, deletes its test credentials/certificate files and two synthetic Auth users, and closes Firebase; the outer launcher stops Auth/Firestore and removes the temporary profile. Readback after both invocations found **zero profiles created for these runs and zero listeners on 8080/9099/9150**; AVD identity was checked before shutdown, and `adb devices` was empty afterward. Font scale remained 1.0. One verified fixture-created Gradle daemon was stopped between runs to avoid inheriting a removed TEMP directory; no general claim of all build-daemon lock ownership/cleanup is made. Historical unrelated temporary files were not deleted.

## Retained failures and evidence identity

- Initial sandbox compilation could not resolve existing linked transitive dependencies; the fixed pinned toolchain in the authorized environment compiled strictly. No dependency changes or relaxed checking were used.
- First affected Flutter run: two existing cases failed because initial non-authenticated session notification reset the new state. The controller now tracks actual authenticated session identity while retaining UID changes; the same-UID replacement and stale replies are explicitly tested. The next run exposed one new test's semantics-handle teardown issue; its handle is now disposed inside the test. Final complete suite: 313/313.
- First fatal-info analysis reported six style issues; corrected without contract changes. Final analysis: no issues.
- The initial AVD startup preceded an interruption between work sessions; it was absent on continuation and was restarted/identity-checked. Neither Android invocation above is replaced by an earlier candidate result; both actual scenario/host/outer invocations pass at `b43e0a9`.
- First post-run profile-count shell check used an invalid PowerShell date-filter expression. That output was not accepted; the corrected read-only check established the zero-profile/zero-listener result. Both product launchers had already exited 0.
- Known KGP/SDK metadata warnings were emitted by existing pinned tools. No plugin/dependency upgrade was selected.

Private raw logs, temporary scripts and APKs remain local under ignored `build/jin-search/`; no secrets, credentials or APKs are uploaded. The following SHA-256 values identify owner-retained evidence, not independently downloaded/recomputed reviewer evidence:

| Local artifact | SHA-256 |
| --- | --- |
| `backend-full.log` | `f85bd365ff47b30bbcb95f4100edc4002bbd8961d5aea46f7741801beea164e3` |
| `emulator-full.log` | `bc21e74dd7539c0650ae359a8280a98ddc7443b8c117c5800d46b7e593cde428` |
| `flutter-final.log` | `517fc13ce90c12de3b7805dbb898a0719089e61ac850bfc9d1b56188bd0a045b` |
| `analyze-final.log` | `9a9d35ce9d6fac973a72f078461e18cde1f1c7f2ae7fa7a5916ae87adef4b99a` |
| `android-search.log` | `5f56b2bbb6906a11266df6b766246f8b3635534c991c4f7e1022a82ef99d463e` |
| `android-friends.log` | `4c4685f4c91ac54e1848ed83f7bc59c072305e34576508e8529e2495b5fac412` |
| `source-check.json` | `12f4c42549fdda77c74278a33f4cd14ced1d1260252fb167418cb8299e5fb8e7` |
| `cleanup.json` | `034aecce4c117c070e28b10212488291bb4402a69e9209e93c6f3ac756724268` |
| `search-b43e0a9.apk` | `1746da919100de2a1e0439dab4ed0f29f44224f5d1debc8701b1f76c911a12d1` |
| `friends-b43e0a9.apk` | `c99d05a3b42fdb060b9be84c08836b1b97828dfc9867bf11225b209337322ab7` |

## Handoff and remaining scope

Implementation and required owner evidence are delivered for SHI's **new-code** review, then LI's bounded acceptance; both remain Pending at submission. The exact implementation source is pinned above; the published evidence head and formal review request are on the Draft PR. Existing #77 Issue checkboxes/Project state are not changed by this document.

The earlier 12 October 14:00 SGT estimate elapsed; the resumed 14:16 checkpoint revised publication target to **12 October 15:00 SGT**. Actual GitHub publication time/head is authoritative. SHI review and LI acceptance ETA are not promised on their behalf. This is explicitly a post-11-October follow-up, not retrospective on-time delivery or a replacement Sprint deadline.

All nine Friend mappings and producer handoffs remain in accepted [#75's original report](https://github.com/3427564237/enmori-app/blob/3788df59069653993476e2391510c8a4c1c2a1c0/docs/planning/2026-10-11-jin-friend-mapping-and-search-delta.md#all-nine-original-mappings). This advances isolated M13/NS19 search only; it does not complete the whole mapping/module. Real identity/eligibility, both block directions/lifecycle/index completeness and real Profile/presentation authority still need LI's concrete handoff before ordinary/real-account use. Recommendation needs its separately authorized LI/SHI Interest/Event inputs and presentation contract; Activity needs LI/SHI/DU visibility/purpose/minimized current-source handoff. Public Profile, Special Care and remaining prototype route/state acceptance remain outstanding; no silent cancellation or rollover.

#78 remains ZHOU's separately approved local-only fake-Port AI implementation; JIN exact-source review follows its authorized source/evidence handoff. No AI implementation or upload is supplied here. Keep original 42-route/38-state/11 October obligations and owner/reviewer paths. No merge, Issue closure/manual Project promotion, runtime/real-data/provider/model enablement, whole Friend/Sprint/UAT/Release/Done claim or new overall percentage.
