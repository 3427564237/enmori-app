# LI #85 — accepted AI client in shared isolated Home/router

12 October 2026, Asia/Singapore. Owner LI; DU reviews new LI shared code;
JIN executes the applicable changed-candidate gate. Authority remains the
[parallel reissue](../../decisions/2026-10-12-li-parallel-delivery-reissue.md).
The [earlier shared-entry packet](2026-10-12-li-issue85-shared-entry.md) is retained
as its historical pre-builder checkpoint. This record updates only the AI
binding and current-source local verification, not the missing DU History page.

## Exact source

- Previously published #87: `8f7d719e065807d2d6776858f928886079a1a62c`.
- Accepted #88 input: `398f81c901fc64f230442dc1405d0ba6b75763b7`; [LI approval](https://github.com/3427564237/enmori-app/pull/88#pullrequestreview-5490506405) and [PM acceptance](https://github.com/3427564237/enmori-app/blob/d76804c5e2d49018efe6679fb3a9be97389347ba/docs/decisions/2026-10-12-li-ai-client-component-acceptance.md).
- Actual two-parent composition: `b6c0707ad4b7562bcde5eb78118827ea5c1c39da`, tree `4eb5c5a323508210fdf078cccf8213ce469a1fd1`; exact 833-file union, zero conflict resolutions/manual input changes.
- Tested shared implementation: `31a3baadafe0fb828231b3e18b9ac3e4cf927eba`, tree `822ae9da9138fff527c52c9d3121c265579e0a5f`.
- Device-handoff commit: `0105f580e74ec70a15318d67a5db3ad044401ee1`, tree `be9ef5add9096735138826ac201bb19e0551155f`; adds only the ten-line `integration_test/ai_shared_router_flow_test.dart`. Its entire lib/test/backend/API/Android/dependency payload equals tested `31a3baa`. Final analysis/format include this wrapper; actual device execution remains Not Run.
- Subsequent evidence changes are Markdown only. The PR binds its published head.

Backend/API, Auth, normal main, Android configuration and dependencies equal #86
`bae777d1de637cbbe6c4e312bdb9c50a54ff90d4`. All accepted AI feature source is
inherited unchanged from #88. LI's new code is the original four shared files
plus the new harness entry/app, seven shared-flow assertions and device wrapper.
DU reviews LI's shared composition, not a repeated review of unchanged #88.

## Actual delivered integration

`lib/ai_home_router_harness.dart` is a separate explicitly synthetic entry.
It composes the actual EnmoriApp/Home/router, accepted
`IsolatedAiConversationPage(build: buildAiConversationPage)`, real controller and
`AiWireRepository`, and the already accepted handwritten synthetic Auth/transport.
A completed synthetic Account fixture feeds the existing authenticated router
gate. Fixture consent is rejected; it supplies no real source permission.

The persistent banner says “Synthetic test transport — no real storage or model”
on Home, AI, Settings and signed-out routes. The Backend base URI is explicitly
null regardless of ambient compile-time URL. Firebase/Bootstrap is not invoked.
Other repository defaults remain unavailable; the existing Settings page truthfully
shows unavailable content, not fake Settings success. Harness controls replace
the synthetic session or sign out; they are not product recovery actions.

Normal main/composition still has no AI builder/repository and the isolated flag
is false. History stays independently null/hidden; DU has not supplied #82 at
this checkpoint. This delivers a real AI page in a controlled synthetic shared
composition, not real Backend/Firestore/context/model or whole M26/History.

## Actual local checks

| Check | Result and exact attribution |
| --- | --- |
| Full Flutter unit/widget at `31a3baa` | Pass 478/478, exit 0; includes seven new shared-flow cases |
| Strict Backend build/full regression at `31a3baa` | Pass 543/543, zero failed/cancelled/skipped/todo; exit 0 |
| Fatal-info lib/test/integration_test analysis including `0105f58` wrapper | Pass, no issues |
| Non-writing format of all 26 changed Dart files including wrapper | Pass, zero changes |
| #86-to-current source diff whitespace | Pass |
| Full #72-to-current baseline whitespace | Retained Fail / exit 2: inherited copied decision EOF line 56 only |
| Android debug APK, target `lib/ai_home_router_harness.dart`, source `31a3baa` | Pass; Gradle 110.9s, exit 0 |
| Device wrapper execution | Not Run: no adb device and no existing dedicated validation AVD on this host |
| New guarded full Emulator/Android regression | Not Run by LI here; JIN changed-candidate execution remains separate |
| DU new shared-code review / combined PM acceptance | Pending at publication |

Pinned Flutter 3.47.2/Dart 3.13.2; offline enforce-lockfile pub get with no lock
changes. Node 24.19.0/pnpm 11.19.0/TypeScript 7.0.2 use the unchanged verified
cache and invocation-only `pnpm_config_verify_deps_before_run=false`; no install,
version change, relaxed compiler or credential access. Temporary cache symlink
removed after Backend verification, target untouched. Final tracked-clean source.

Seven shared-flow tests bind the actual page to Home, perform scripted-wire
success and authorized synthetic reread after Back, traverse the actual Settings
route, confirm Stay/cancel-and-leave before Back or Settings during an outstanding
execute, retain unknown protection without automatic resend, and remove private
view/input on same-UID replacement or observed logout. The device wrapper reuses
these exact assertions under IntegrationTestWidgetsFlutterBinding; its unexecuted
seven cases are not added to the widget count. System Back uses the binding's
pop-route callback; no physical-key/audible/TalkBack claim.

The first shared-flow run was 2 Pass / 5 Fail: test code tapped Send before the
TextField onChanged frame rebuilt the previously disabled button. A diagnostic
reproduction showed disabled=true before the text frame and false after it; a
single pump after enterText corrected the test timing. No accepted feature code
or rejection assertion was changed. Final focused 7/7 and full 478/478 passed.
Build emitted existing Kotlin plugin/SDK XML warnings; no upgrade was performed.

## Artifacts and reproduction

Local APK: `build/app/outputs/flutter-apk/app-debug.apk`, 166,987,360 bytes,
SHA-256 `2c4ce2702d6ec6a96bda26f7ecc676c6d468bd76501e565d209d57aa26672647`.
SDK aapt confirms `com.enmori.app`, version 1.0.0/code 1, min API 24,
target/compile API 36. This is a new local build, not the owner #88 APK or an
installed/device-tested artifact. Do not install this package over an ordinary
user app; the assigned execution target is the dedicated test environment.
Raw APK/logs remain ignored/local, not uploaded.

Commands on this package:

```text
fvm flutter pub get --offline --enforce-lockfile
fvm flutter test --no-pub --reporter expanded
fvm dart analyze --fatal-infos lib test integration_test
pnpm backend:verify
fvm flutter build apk --debug --no-pub --target lib/ai_home_router_harness.dart
fvm flutter run --no-pub --target lib/ai_home_router_harness.dart -d <assigned-dedicated-test-device>
fvm flutter test --no-pub integration_test/ai_shared_router_flow_test.dart -d <assigned-dedicated-test-device>
```

LI retained hashes under ignored `build/li86-review/`:

| Artifact | SHA-256 |
| --- | --- |
| shared-ai-full-final.log | `c1a9fdc4aafac18c4224cb3c393e8cdbd68dfe6a952cc2945c64a3e75c0e02d4` |
| shared-ai-backend.log | `f054048918e019d341613704d5f97bffbaf7e7116cfe55ffc5e6fa24339bc895` |
| shared-ai-analyze-final.log | `e8dc9876c280f5e5856ad02bdfff74e10fe944a331b6e4f3ea1f4297666ad735` |
| shared-ai-android-build.log | `a5acea62449b0f001d881d22b2b1e0c6d0ea7808edd551a123c5602efbac8c18` |
| shared-ai-source-checks.json | `a39cbf7246ae2a3d7e8ad394a3c7c446d8e37bcfa57f2ff41d6833d1644e772b` |
| shared-ai-format-final.log | `f239ace240924fce38f457ac1acf5315b276d8679f58e8f73317851019dc4609` |
| shared-ai-apk-identity.json | `70cac8c271903c9decbc6b7bee0e70e0ff36e9aecf1614daa5c6125cbbae09f1` |

## Remaining work and truthful status

DU reviews the coherent LI shared delta while #82 continues; JIN can independently
precheck this known candidate and execute applicable source-bound gates in the
assigned test environment. Reviewed real DU History joins when received, without
holding this AI contribution. Keep accepted #86 and #88 checkpoints immutable;
changed-source results/reviews stay separate. No new signature/product decision
or repeat unchanged feature report is needed. Today's 22:00/23:59 remain targets.
No self-acceptance of LI code, merge, Issue closure, Project promotion, real
source/provider/model/runtime enablement, whole Sprint/UAT/Release claim.
