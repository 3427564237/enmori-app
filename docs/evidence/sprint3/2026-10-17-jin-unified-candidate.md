# JIN unified candidate — 17 October 2026

Execution task [#84](https://github.com/3427564237/enmori-app/issues/84), parent [#44](https://github.com/3427564237/enmori-app/issues/44). This packet composes already reviewed contributions under [the confirmed distributed ownership](../../decisions/2026-10-16-li-application-completion-priority.md) and [parallel kickoff](../../decisions/2026-10-16-li-low-blocking-kickoff.md). It is a new candidate and owner gate, not SHI composition approval, LI evidence acceptance, a demonstration restart, or whole-application completion.

## Frozen executable source and input authority

- Candidate branch: `codex/jin-unified-candidate-20261017`.
- Executed source: **`b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`**.
- Executed tree: **`df800e43374ec89b71799b6722d5364163eb68cc`**.
- Starting local branch/head retained: `codex/jin-note-provenance-20261016`, `a6b994340d338934ca280c1de39714bb30411088`. This already incorporated approved main/Skills `d59cb128bfe0b5889baae0b08c973e140505590f`; it was not the remote #128 review head or a newly tested product fix.
- Remote #128 review head remains `6523a98f8a401045914212ab118e490eccfff336`; corrected Backend source was `27705999ebf3840f8d9b768a7714382d60632617`. [SHI R1 APPROVE](https://github.com/3427564237/enmori-app/pull/128#pullrequestreview-5537419714) supersedes the old pending-R1 text for that source. No repeat R1 patch/review is requested.

Live GitHub issue/PR metadata and review submissions were read before source changes using the already authenticated CLI. The connector returned 404 and the sandbox CLI network attempt failed; the authorized read-only CLI succeeded. No issue status, Project, main or existing PR branch was changed.

| Complete input retained | Exact approved head | Existing independent scope | New merge commit |
| --- | --- | --- | --- |
| #130 LI runtime/presentation/operator | `9cf30134a522009f410485c6352df757ed0ab23d` | [DU APPROVE 5547948011](https://github.com/3427564237/enmori-app/pull/130#pullrequestreview-5547948011) | `24ec4cee7b46457633dc2d09470553f98cf74692` |
| #132 SHI Event interaction guards | `7da25cade87f808606320aff0f5c343cef4e1b5f` | [ZHOU APPROVE 5549221128](https://github.com/3427564237/enmori-app/pull/132#pullrequestreview-5549221128) | `64a10881bbe8d14bf01ef364306ad668ff4eea86` |
| #133 ZHOU repeat-use client regressions | `e9d9fe9aa2481e6301e121829cd9fc6a339b58d9` | [LI APPROVE 5552512965](https://github.com/3427564237/enmori-app/pull/133#pullrequestreview-5552512965) | `3ea70a19b621c181e8023c44c9d7dac20dc41158` |
| #134 LI Profile/Settings session isolation | `0ceb12124185fe8c9f436d3d35d9f1c0cee64a7e` | [DU APPROVE 5552893689](https://github.com/3427564237/enmori-app/pull/134#pullrequestreview-5552893689) | `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e` |

All four are ordinary two-parent merges with no conflict or manual product edit. Every input head and the starting local head remain ancestors. Relative to the starting local tree, all 42 changed paths exactly match an approved input's blob: 28 from #130, 4 from #132, 5 from #133 and 5 from #134. The 32 incoming Skills/tooling paths were already present and remain unchanged. API, Android, dependency manifests/locks, `.agents`, `.codex` and FVM configuration are unchanged. Internal source-accounting checks support traceability only and do not replace the named different-person reviews.

Source-only units remain identifiable: #132 `6ac1018929c200e2e684b25bef7ded4ddbf3a798` (three product/test files), #133 `449f67459a02a8621f1212f82251da62bf1cc2b6` (two new tests), #134 `11e06b4b961e495fd76c9dc3e8a61a76fead5480` (two product files plus one existing test). Whole heads are merged here to preserve their evidence and decisions as well as code. #130's final source-bearing snapshot was `160c95fbdb862f1c9d68f6eb2312bc3bd8b7df2e`; no equivalent fix was reimplemented.

## Current-source execution

Final results and log fingerprints are recorded in the [machine receipt](2026-10-17-jin-unified-candidate.json). All counts below belong to the frozen candidate, not earlier 934/168/659 results. Test counts overlap and are not added into a completion score.

| Check | Actual result | Boundary |
| --- | --- | --- |
| Strict Backend compile | Pass, exit 0 | Locked Node 24.19.0 / TypeScript 7.0.2 |
| Full Backend | 938/938 Pass, exit 0 | Synthetic/fake-Port cases, including the retained public-store cancellation regressions |
| Full operator JavaScript tests | 52/52 Pass, exit 0 on authorized invocation | First sandbox invocation 49 Pass/3 Fail remains retained |
| Full Windows Flutter | **675 Pass / 1 Fail, exit 1** | One unchanged symlink-negative fixture cannot create its link (OS error 1314); no skip/weakening |
| Fatal-info Dart analysis | Pass, exit 0 | `lib test integration_test` |
| Changed Dart format | Pass, 15 files / 0 changes | Non-writing format against the initial local head |
| Python helper tests, existing Ubuntu | 25/25 Pass, exit 0 | Exact four helper/test files copied from this source; synthetic local fixtures only |
| Guarded actual Auth/Firestore/HTTP/Dart | **168/168 Pass, outer exit 0** | Real isolated SDK/persistence/network, explicit model/compiler/provider doubles; worker/outer profiles removed and five ports verified free |
| Dedicated Android APK | Build Pass, exit 0 | Exact-source archive; package/signature/hash below; build is not installation or phone acceptance |

Commands use the existing pinned executables, not PATH-selected upgrades:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test "backend/dist/test/**/*.test.js"
node --test "tool/*.test.mjs"
node tool/run_ai_store_emulators.mjs
dart <pinned Flutter tools snapshot> test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed <15 changed Dart files>
python3 -B -m unittest test_li_sponsor_demo test_li_controlled_phone_handoff -v
```

The SDK launcher remained the existing guarded implementation: locked local cache/SDK, synthetic `demo-enmori-rmvp01a-r10`, Auth/Firestore on loopback 9099/8080, serialized fixtures and same-project gateway assertions. Model/compiler/provider doubles remain explicit. The actual log shows `JIN_NEXT_EMULATOR_WORKER_PROFILE_REMOVED`, `JIN_NEXT_EMULATOR_OUTER_PROFILE_REMOVED` and `JIN_NEXT_EMULATOR_REQUIRED_PORTS_FREE`; no running demonstration instance was used or reset. SDK invocation ran 13:33:05–13:38:06 SGT. All 1,286 frozen versioned working inputs remained byte-identical before and after the gate.

## Failures, environment preparation and artifact preservation

- The active checkout initially had no `build`, `node_modules` or local Flutter package map. The old JIN logs/APKs/failure records were located in the adjacent `enmori-app-jin-persona-client-review/build` and left untouched. New logs and receipts use `build/jin-unified-20261017`; no `flutter clean`, original artifact deletion or log overwrite was used.
- Locked offline pnpm restore first failed at the sandbox symlink boundary (EPERM). The authorized same-lock retry succeeded with 692 packages reused, zero downloaded, lifecycle scripts disabled and no tracked dependency change.
- First offline Flutter restore could not open the installed SDK cache lockfile. The authorized same-source retry succeeded; `pubspec.lock` is unchanged. This also avoids the historical ancestor package-resolution error before SDK execution.
- JavaScript operator first invocation recorded 49/3. A separate non-content shell probe reproduced Git `sh.exe` failure `NtCreateDirectoryObject(...): 0xC0000022`. The unchanged authorized suite passed 52/52; the original log is retained.
- Windows Flutter's full 675/1 invocation remains a failure. `test/harness/controlled_phone_service_configuration_test.dart` cannot create the negative symlink fixture before the consumer runs. A capable-environment current-source full gate is still required; #127, #132 or #134 results cannot supply it.
- The first Windows Python helper run recorded 5 passes/2 errors from sandbox temporary-file permissions; its log remains. Both generated temporary paths were subsequently checked absent. Existing Ubuntu executed the exact copied files, passed all 25 helper cases and removed its owned temporary directory. This does not assert Android/ADB/private-handoff success.
- The first APK archive reflected global Git CRLF conversion; verification caught it before building. That archive and failed binding receipt were retained. A second archive with invocation-local `core.autocrlf=false` matched all 1,286 frozen Git blobs exactly. Build preparation and any failed build invocations retain separate logs; see final APK receipt.
- The first actual APK build using an isolated Gradle home with cache/wrapper junctions failed in settings Kotlin DSL. The same source and offline init script passed a configuration diagnostic using the existing original Gradle home; the normal pinned Flutter build then passed with that original cache. The low-level junction/cache cause is not asserted. An initial receipt-wrapper PowerShell boolean typo is also retained separately from the actual build exit 1. Successful Pub restore was offline; the successful Gradle invocation is not claimed offline. Existing KGP migration and SDK XML-reader warnings were retained without dependency changes.

## Installable artifact identity

The new locally retained artifact is `build/jin-unified-20261017/jin-unified-b3c8a222-arm64-debug.apk`, **94,273,899 bytes**, SHA-256 **`776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`**. Built from the exact source/tree above with pinned Flutter 3.47.2 / Dart 3.13.2, Java 21 and invocation-only `ENMORI_PERSONA_ANDROID_TEST=true`:

```text
dart <pinned Flutter tools snapshot> --suppress-analytics build apk --debug --target-platform android-arm64 --target lib/controlled_demo.dart --no-pub
aapt dump badging <new artifact>
apksigner verify --verbose --print-certs <new artifact>
```

Build, package inspection and signature verification each exited 0. Package is `com.enmori.app.personatest`, versionCode `1`, versionName `1.0.0`, minSdk 24, targetSdk 36, launch activity `com.enmori.app.MainActivity`. One Android Debug signer verifies with APK signature scheme v2; certificate SHA-256 is `a6ff83fa12ff92d4b33e5efde167aee3b0f3f4590bd843def55d9584f7724dd3`. The Flutter engine is arm64; inherited datastore helper libraries also exist under other ABIs, so this is not described as an arm64-only ZIP.

The artifact was not installed, launched or relabelled as the earlier v4/v5 phone build. Local logs/APK are not assumed downloadable by reviewers; the committed exact source and command/identity receipt support reproduction. Existing device package/version/signature and a valid private handoff must be checked before any later authorized install/transition; this packet performs no device replacement or restoration of expired services.

## Actual available bindings and remaining scope

| Flow | Candidate capability | Still not established |
| --- | --- | --- |
| Account/Profile/Settings/interests | Observed-session-fenced HTTP clients and Firestore adapters; controlled seeded owner; approved account isolation fix included | Ordinary registration/onboarding, real-account deployment and independent phone result on this candidate; interest catalogue remains fixture seeded |
| Check-in/Footprint/date | Existing HTTP create/read, selected-date history/paging and saved-item return | No new Calendar/month/map behavior; no repeated implementation of #94/#97; current phone cross-verification not run |
| Friend | Existing HTTP repositories and Firestore request/list adapters; controlled owner initialized | Current controlled fixture has no second operable friend account; real relationship/full two-account journey is not proved |
| AI/Persona | Actual wire/repository composition, source-aware store and guarded runtime adapters; repeat-use/session regressions included | Two consecutive real 9B same-input successes, current canonical device cycle and new real failure diagnosis are not proved by fixtures |
| Activity | Existing list/detail/native opener and source-state guards; provider adapter supported but default disabled | Current provider/device/browser/return/disable-client-clear/owned-copy journey; participation/recommendation/count contracts remain unavailable |
| Music | Fixture interest label/presentation only | No connected music route/player or completed feature claim |

The newer #130 run proved one real 9B reply, explicit Reload and independent canonical/Note-source readback on its original source. It did not prove two consecutive same-input rounds. The older success-then-rejection kept no bad candidate, so parser/semantic/model cause remains unknown. Temperature/seed mitigation is not a proven cure. Replacement-runtime Event row selection, browser/owned-copy/removal and conversation deletion remain incomplete or unconfirmed as recorded in [the retained rehearsal receipt](2026-10-16-li-sponsor-demo-rehearsal.md). Absent temporary directories/listeners do not prove orderly cleanup. Original 4/12 R1 reproduction, 167/1 SDK environment failure, 937/1 and later runtime/selector failures, both historical CONSUMED failures and #99 reliability history remain preserved.

The expired demonstration service/private handoff is not restored, no provider key is requested, and no live model/provider/phone/clipboard operation is performed by this gate. Runtime/device prerequisites block only those cases. Applicable iOS evidence is not replaced by Windows or Android build evidence.

## Required next gates

SHI reviews this new combined source and its changed composition effects, without repeating unchanged #128/#130/#132/#133/#134 component reviews. LI independently reviews the JIN-authored gate and makes bounded PM acceptance. Formal conclusions are **Pending**, not supplied by internal agents or owner tests. The capable-environment Flutter full gate and version-bound Android cross-verification remain separately required where not completed in the final receipt.

Use the exact candidate/APK identity in the final receipt for subsequent authorized device work. LI owns Friend/unified and Event cross-verification; SHI owns AI/Persona, Check-in/Footprint and Account cross-verification. Any shared stateful runtime journeys must be serialized under the existing authorized handoff; no second Backend or credentials are assumed. Preserve Draft/Open and report each Fail/Blocked/Not Run. No main merge, task closure, Project transition, whole-module/S3/UAT/Release/Done or new delivery deadline is claimed.
