# LI isolated Persona Home/router implementation and handoff

Date: 9 October 2026, Asia/Singapore. Owner: LI HOURUI. Independent source reviewer: DU KUN. Task: [#68](https://github.com/3427564237/enmori-app/issues/68).

## Result and source boundary

LI's Home/router contribution is implemented and locally verified: an isolated `Manage Personas` Home entry, the four approved routes and typed feature-page assembly. It is ready for DU's independent review and ZHOU's concrete page/harness handoff. **This is not complete Persona feature integration or UI acceptance.** No Persona feature pages/session/Repository have been published at this checkpoint; the default page composition is absent. Product routes require both the existing isolated flag and an explicitly supplied complete four-page composition. No placeholder production surface or simulated product success is shipped.

- Controlling authority: [confirmed full-flow A decision at 141ebcf](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md), unchanged P08/PC11–PC13/client PC14 [candidate at 55fa4a7](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md).
- Release: JIN [5467525337](https://github.com/3427564237/enmori-app/pull/67#pullrequestreview-5467525337) at checklist `15ab509`, [durable gate release](https://github.com/3427564237/enmori-app/blob/7799609d61c949643a2c17f88f6b442ba86ff240/docs/evidence/sprint3/2026-10-09-persona-p08-implementation-release.md). LI also completed the requested [formal scope review 5467736278](https://github.com/3427564237/enmori-app/pull/67#pullrequestreview-5467736278) at the same exact checklist head; this adds no new scope/merge prerequisite.
- Isolated integration source/base: [#69](https://github.com/3427564237/enmori-app/pull/69), `00cb606961bfeb1cbe09bcd6afdc040c08b57ce1`. This separate stacked branch preserves #69's exact candidate for JIN's pending gate; it is not an approved replacement combined tree.
- Tested source commit: **`17a9ba6fbd202b255d943250b4f39628fd5e1c16`**. Tests/APK were executed on the byte-identical four-file payload immediately before that source commit. Subsequent evidence commit changes only this document.
- Four source/test files, ordered as Home, router, page composition, widget test: manifest SHA-256 **`79ea2d66683e59c8d720ff0949098fe358e0d5e26d97b5d92085d72dd898147d`** (one line per file: lowercase byte SHA-256, two spaces, relative path, LF).

## Concrete shared-file and page boundary

LI owns `lib/app/home_shell_page.dart`, `lib/app/router/app_router.dart` and new `lib/app/router/isolated_persona_pages.dart`. ZHOU owns client/feature Repository/session/pages and concrete isolated-harness overrides. Coordination was [published before edits](https://github.com/3427564237/enmori-app/issues/68#issuecomment-6077342154); no overlapping feature files were edited.

`IsolatedPersonaPages` is an immutable, app-owned composition with four required builders. The nullable `isolatedPersonaPagesProvider` defaults to null. Supply real feature constructors in the isolated harness, together with ZHOU's real feature/session/Repository provider composition, then override the existing `isolatedSlicesEnabledProvider` to true. Ordinary bootstrap is unchanged and supplies neither override. Neither Flutter switch grants Backend authorization; the actual synthetic Emulator Backend guard remains authoritative.

| Builder | Exact named navigation arguments after positional `BuildContext` | Route |
| --- | --- | --- |
| `overview` | `VoidCallback onManage`, `VoidCallback onBack` | `/personas` |
| `management` | `VoidCallback onCreate`, `ValueChanged<String> onEdit`, `VoidCallback onBack` | `/personas/manage` |
| `create` | `VoidCallback onBack` | `/personas/new` |
| `edit` | `String personaId`, `VoidCallback onBack` | `/personas/:personaId/edit` |

The router supplies navigation only. Home pushes the overview; its management callback pushes management; create/edit callbacks push the corresponding form and encode the opaque edit ID exactly once. Back pops the stack, falling back to overview for a parentless form/management page and Home for a parentless overview. This does not implement OS deep-link restoration, make Backend requests, activate a selection, settle a command or reload Home recommendations. Existing Home data/failure/profile/event callbacks are retained.

Pages remain responsible for dirty/in-flight confirmation before calling `onBack`, and must use their own `PopScope`/approved flow for system Back. Session commands live in ZHOU's authenticated-session state across pages; these router closures do not own/cancel them. Each callback rejects a disposed context/provider, a replaced auth subject or a non-authenticated current gate. Account-subject changes reconstruct the router; feature same-UID session-instance/result validation remains a separate PC12 obligation.

ZHOU can implement the four builders directly using the signatures above without editing shared Home/router. Return the actual feature head and concrete fixture wiring for LI to reconcile/test. No new product decision or repeated Backend review is needed. JIN reviews ZHOU code; DU reviews this LI contribution; full UI acceptance remains LI's evidenced decision.

## Actual LI verification

Toolchain: existing FVM 4.3.0, Flutter 3.47.2 / Dart 3.13.2, committed package pins/lockfile and existing local Android SDK/Gradle. No package/version, Backend/API/data contract, runtime fixture, SDK setting or ordinary bootstrap changed. Offline locked dependency resolution passed.

| Executed command / scope | Result |
| --- | --- |
| `fvm flutter pub get --offline --enforce-lockfile` | Pass; lock unchanged |
| `fvm flutter test --no-pub --reporter expanded test/app/persona_home_router_test.dart` | **17/17 Pass** |
| `fvm flutter test --no-pub --reporter expanded` | **242/242 Pass** (225 inherited + 17 new); zero final failed/skipped cases |
| `fvm dart analyze --fatal-infos lib test integration_test` | Pass, no issues |
| `fvm flutter build apk --debug --no-pub` | Pass; Debug APK generated in 7.4 seconds |
| Source whitespace check | Pass |
| `adb devices -l` | No attached device; Android execution **Not Run** |

New tests cover ordinary route/entry omission even with supplied builders; isolated flag without builders; all four route handoffs and Back without changing Home reads; encoded ID round-trip; all seven non-authenticated router gates; identity replacement; disposed/auth-loss callbacks; feature-controlled discard confirmation/system-Back veto; parentless form → overview → Home navigation; and reachable/labeled Home action on 320×640 with actual 2× text scaling.

Only test fixtures render synthetic route-marker pages. They prove callback/assembly behavior, not M23–M25 product UI, PC11/PC12 feature semantics, actual create/edit/activate/delete, PC13 persistence or visual/accessibility acceptance. The discard fixture verifies that this assembly permits page-owned confirmation; ZHOU must implement the actual form/in-flight guards.

Debug APK: `build/app/outputs/flutter-apk/app-debug.apk`. SHA-256: **`4821b1c6a3015cec41a83aba48bbb599be5afab9659a25e80288e87f9ce53bc4`**. This ordinary/default-disabled APK was built by LI on Linux; it is not DU's earlier APK and not a Persona device acceptance artifact. Build logged existing Kotlin-plugin migration / SDK XML-version / Java-native-access warnings, but exited successfully. No APK execution is claimed.

Retained failed attempts: the first focused run had 16 passes and one small-screen miss because the test tapped before post-scroll layout. After adding the required frame, navigation succeeded but a test-owned `SemanticsHandle` was left active until too-late teardown. A later semantics assertion queried an off-screen item before its semantics node existed. The helper now waits for post-scroll layout, the semantics assertion first exposes/layouts the action and its handle is disposed in `finally`. Final focused/full runs pass. Two interim full runs also contained the same failing test-fixture case; no production fix was needed for these helper defects. Earlier logs remain attributed as failed, not hidden by final totals.

Local command/build/review logs and the four-file manifest: `/tmp/enmori-li-home-router-20261009/`. These are local diagnostics; this committed record supplies durable results and reproduction commands.

Final source self-review corrected the parentless overview Back fallback from a no-op to Home and extended the existing parentless-navigation assertion. Focused 17/17, full 242/242, analysis and APK were rerun for this final payload. Earlier source `1732231` / publication `2569c00` and its 47.3-second APK build remain an earlier valid checkpoint; the current source/hash above supersede only that implementation checkpoint. The final APK was rebuilt in 7.4 seconds.

## Remaining independent work and truthful readiness

- DU independent review of this new LI source: **Pending** at publication. Return one focused finding/result at the actual PR head; a source correction requires only affected checks and an updated exact head.
- ZHOU concrete Persona pages/client/session/fixture wiring and their PC11/PC12/client PC14 results: **Not Run / not supplied here**. The routing boundary alone does not accept those cases.
- Actual two-owner Android/Backend/persistence flow, screenshots and applicable accessibility checks: **Not Run**. No attached device.
- #69 JIN new combined gate and LI's independent review of that gate: **Pending**, separately. The base's earlier 366/366 Backend, 71/71 Emulator and 225/225 Flutter remain prior LI evidence at their original heads; Backend/Emulator were not rerun for this Flutter-only change.
- No remote merge, Issue completion, manual Project transition, real-account/provider/model/cloud access, index deployment, runtime promotion, AI/Conversation scope or whole-module/Sprint/UAT/Release acceptance. Original 42-route/38-state and 11 October target remain; no overall on-time claim or invented percentage.
