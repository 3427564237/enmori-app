# JIN #84 — shared AI source execution supplement

12 October 2026, Asia/Singapore. This is JIN's independent execution on the
existing #87 source, permitted as precheck while DU reviews LI's shared code.
It does not classify an unreviewed contribution as accepted. The approved
[first #84 gate](2026-10-12-jin-issue84-combined-gate.md) remains a separate
checkpoint; its branch and the #87 base have not been advanced.

## Source and scope

| Identity | Exact source |
| --- | --- |
| Executed published #87 head | `9a4931dd9c04db75ca466d7c17f978329a252256` |
| Published source tree | `26c2d21c7353af5bf1a2a2376bae13f3e85881a4` |
| Accepted #86 ancestor | `bae777d1de637cbbe6c4e312bdb9c50a54ff90d4` |
| Accepted #88 client ancestor | `398f81c901fc64f230442dc1405d0ba6b75763b7` |
| LI actual input-composition merge | `b6c0707ad4b7562bcde5eb78118827ea5c1c39da` |
| LI shared implementation | `31a3baadafe0fb828231b3e18b9ac3e4cf927eba` |
| Device-wrapper addition | `0105f580e74ec70a15318d67a5db3ad044401ee1` |

The two-parent merge is the exact three-way accepted-input/shared-entry union
(833 files), without manual conflict resolutions. The current source has 839
versioned files. The isolated verification archive matches their Git blobs:
56 exact working-byte matches and 783 CRLF/LF-equivalent matches. The later
#87 evidence commits do not change the executable payload. The Android checkout
was separately detached at the full published head before execution.

Backend/API, tools, Android configuration, shared Auth, ordinary main/providers,
package manifests/locks and Firebase/index configuration equal #86. Accepted
#88 AI feature/repository/controller/page and synthetic components are unchanged.
The OpenAPI bytes are unchanged: 27 method/path operations, 33 schemas, with
the existing security and error definitions. No actual Conversation API/store
or producer adapter is introduced by this composition.

The real LI Home/router binds the accepted AI builder only in the explicitly
synthetic harness. Ordinary isolatedSlicesEnabled remains false and nullable
History/AI builders remain absent. The harness forcibly supplies a null real
Backend URL, synthetic Auth/transport, and the visible no-real-storage/model
banner. History remains independently absent; this is not a History UI result.

## JIN actual results

| Check | Actual current-source result |
| --- | --- |
| Strict Backend build/full regression | Pass 543/543; exit 0; zero failed/cancelled/skipped/todo |
| Actual guarded Auth/Firestore Emulator | Pass 73/73; full outer exit 0; fresh profile removed |
| Full Flutter unit/widget | Pass 478/478; exit 0 |
| Fatal-info lib/test/integration_test analysis | Pass; exit 0; no issues |
| Non-writing changed Dart format | Pass; 26 files, zero changes |
| Shared AI actual API36 execution | Pass 7/7; full outer exit 0; explicitly synthetic transport |
| Search actual API36 + host persistence | Pass 1/1; 341 seeded records unchanged; full outer exit 0; teardown warning retained below |
| My Friends/Profile actual API36 + host persistence | Pass 1/1; atomic pair and both owner pointers; full outer exit 0; recovered install failure retained below |
| Persona PC13 actual API36 + host persistence | Pass 1/1; owner revision 4/peer revision 0; empty final Persona/live/receipt collections; full outer exit 0 |
| Exact new diff whitespace | Pass / exit 0; inherited full-baseline EOF exception remains below |

Full invocations, not just test assertions, determine success. Separate Android
fixtures are not an all-feature navigation flow. Shared AI uses synthetic
transport; the Search/My Friends/Persona fixtures use actual isolated Auth,
HTTPS Backend and Firestore. No real AI persistence, context, recovery, cleanup,
model, provider or ordinary-account execution is inferred.

## Reproduction, identity and cleanup

Pinned Flutter 3.47.2/Dart 3.13.2, Node 24.19.0/pnpm 11.19.0/TypeScript 7.0.2,
Java 21.0.12.1, existing Android SDK/build-tools 36 and the assigned API36 AVD.
Offline enforce-lockfile pub get; existing locked Backend dependency cache,
invocation-only pnpm_config_verify_deps_before_run=false. No dependency upgrade.

```text
flutter pub get --offline --enforce-lockfile
flutter test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed <26 changed Dart paths>
pnpm backend:verify
node build/jin-guarded-emulators.mjs
ENMORI_PERSONA_ANDROID_TEST=true flutter build apk --debug --no-pub --target integration_test/ai_shared_router_flow_test.dart
ENMORI_PERSONA_ANDROID_TEST=true flutter test --no-pub --reporter expanded integration_test/ai_shared_router_flow_test.dart -d emulator-5554
node tool/run_my_friends_emulators.mjs --android-search emulator-5554
node tool/run_my_friends_emulators.mjs --android emulator-5554
node tool/run_persona_android_emulators.mjs emulator-5554
```

The invocation-only guarded Emulator wrapper uses the committed
buildControlledEmulatorTestEnvironment, fixed demo project and loopback ports,
a fresh temporary profile, filtered child environment and finally cleanup.
Android fixture tools remain the unchanged versioned tools. Test credentials,
certificates and raw artifact files remain local and are not included here.

Execution/cleanup checkpoint: **2026-10-12 22:13:48 SGT**.
The dedicated AVD was verified by its existing name, API 36 and font scale 1.0.
It had no ENMORI package before these checks; no physical phone was targeted.
Shared AI and Persona APK identities were com.enmori.app.personatest; Search
and My Friends output APKs were com.enmori.app, used only on that dedicated AVD.
Local guard-build and actual test-output APKs are retained separately.
No independent installed-binary hash is claimed.

At settled readback both test-package names were absent, font scale remained 1.0,
ports 8080/9099/9150 had zero listeners, and no newly created owned fixture-profile
directory remained. The owned AVD was then shut down by its verified adb target;
the final adb readback had no emulator-5554 entry. Only test-owned fixture files/
profiles/services were cleaned. No claim about unrelated Gradle daemon ownership
or private user-app data is made. The temporary dependency junction was removed
without deleting its shared cache target. The Android and original source
checkouts retain clean tracked files and their respective recorded heads.

## Retained failures and limits

The exact #86-to-#87 diff whitespace passes. The full #72-to-source diff retains
the inherited copied decision EOF blank-line exception at line 56: Fail/exit 2,
not an all-whitespace-Pass claim. Initial local checker preparations incorrectly
assumed equal overlapping parents instead of three-way ancestry, guessed a YAML
OpenAPI path rather than api/openapi.json, and treated Windows CRLF extraction
as a byte-identical Git blob. The corrected checks above inspect actual merge
ancestry, JSON operations/schemas and explicit newline-equivalent identities.
No product file or assertion was changed to accommodate these checker errors.
Existing Kotlin/SDK metadata warnings were retained without version changes.

Search's scenario, independent 341-record readback and full outer invocation
passed, but Flutter's automatic teardown attempted to uninstall
com.enmori.app.personatest and reported DELETE_FAILED_INTERNAL_ERROR. The actual
Search output APK is com.enmori.app. The next My Friends invocation first met
INSTALL_FAILED_UPDATE_INCOMPATIBLE, then Flutter uninstalled the previous test
installation on this assigned empty-before-testing AVD and installed its APK;
its scenario/readback and full invocation subsequently passed. Both intermediate
failures remain in the logs. Package absence was explicitly checked before
Persona and again at final cleanup; no failure is relabelled as a successful
uninstall or first-attempt installation. A local post-Search log-tail command
also used the wrong relative directory after the wrapper changed cwd; the
original log and recorded wrapper exit 0 were read by absolute path afterward.
This was not a rerun of the product scenario.

Human TalkBack, physical keyboard, font-2.0/global accessibility, History UI,
real AI adapters and cloud/index/model/provider enablement are Not Run in this
supplement. Prior owner/reviewer runs keep their original attribution; neither
LI's device results nor old #86 executions are counted as these JIN runs.

## Review handoff and unintegrated work

At the final publication readback, #87 still has DU's existing independent
shared-code review request without a submitted conclusion. Its reviewed-
contribution acceptance is therefore still pending. This supplement publishes
execution evidence for that known source; it does not refresh the accepted
#84 candidate or self-accept LI code. SHI's applicable composition/isolation
review and LI's independent review of this JIN-authored evidence remain
required, alongside DU's distinct review of LI's shared source.

History #89 is delivered at 837194d6ee0f63f7d88c81ab282444db8241971f, but its
owner reports an unsuccessful Android end-to-end run and no LI review is yet
posted. It is not incorporated here; “not delivered” is now only a historical
observation. It does not block independent AI checks. #86, #88 and main remain
unchanged; no duplicate component review or source branch recreation is needed.
Future changed source requires its own applicable checks.

JIN's #90 document review at `99583d6` is separately
[APPROVED](https://github.com/3427564237/enmori-app/pull/90#pullrequestreview-5491753860).
It releases no implementation. LI must explicitly select any new real-AI
contract/slice and obtain the applicable producer handoffs.

The 22:00 reviewed-contribution target was not established at this checkpoint;
23:59 remains the assigned target, not a promise or a changed Sprint boundary.
No whole 42-route/38-state percentage, module/Sprint/UAT/Release/Done claim,
merge, Issue closure, Project promotion or runtime enablement is made.

## Local evidence fingerprints

Raw logs/APKs remain local; these identifiers are JIN-attributed, not reviewer downloads.

| Artifact | SHA-256 |
| --- | --- |
| backend-full.txt | 68627e84161d52680c422740239c958fcd6626cfcd830ded1a6a413b533405a9 |
| emulators.txt | f2463f7d1ae2302296e596dd280e5309a3328d9027c5185da870ee78a282c767 |
| flutter-full.txt | 8c4402375cc1c6d1815b189273e42df8d01a1f293c5460ef3f9998a4a0848011 |
| analysis.txt | 9a9d35ce9d6fac973a72f078461e18cde1f1c7f2ae7fa7a5916ae87adef4b99a |
| format.txt | 036c56754629c0023c7f6d995fecfa9206fdf2a81ac02908a2a2d32ca479732e |
| android-ai.txt | 6cb941957a8301fb8cd907fa84bbc93cec5ebecd31aaa2d8d082c6738257ce45 |
| android-search.log | 9f685fc6df4efe4bbaed17bb83055e3375f7935ab09820c4c6bcf336a54460d9 |
| android-friends.log | 4e66131efed4ec689ca3e8cea011d8959b6852752537ec0ece73fef8061b8406 |
| android-persona.log | 55a45b040406d1bffdc23740e8594de40d53232989d91e2ece58fbeffa64d494 |
| source-checks.json | f8b4ea3e48ebb934c7ee9dbbfc858d7f7a764ee23ee1c11524fce0ff899da4c0 |
| cleanup.json | 229636766b80cb39fec75420a6adcd9b6636178e5376754407fcd11c055054fb |
| run-android.ps1 | 06daa4c408c3cfe806bc6d4bed6e1bda403f6b76409a329e63c219c8544c5b87 |
| ai-guard-9a4931d.apk | 3413d10eb1d8c5fd59f2581a43d89dac65827eba7963b7c2c2a9f6ed2861a92f |
| ai-device-9a4931d.apk | 0aec946e3700bc6c1f2b615b2d7044db4fb663b470815d9e78db27390cc802dd |
| search-9a4931d.apk | 273a95c0b4cdb1a48834ed744311bfbadfe228e425b245583dcb6dacb5dc3907 |
| friends-9a4931d.apk | b6d555f5dff201825558572b3e0e2e885bb647d4c08ac5fc8ceadc47fda97690 |
| persona-9a4931d.apk | 85838de84531ede36762fb399f25cb7539e426f72b87bcb5be7d18e9746428d1 |
