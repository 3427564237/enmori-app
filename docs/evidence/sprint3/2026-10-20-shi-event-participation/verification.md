# SHI EP1 / EB2 implementation verification

Executed 20 October 2026, Singapore time. Owner evidence, **not independent approval**.

## Immutable binding / authority

- Integration base `900ca6fcdefb77e9aa95d96fa80994ebf826398f`, branch
  `souma/li-shi-du-integration-20261020` (remote rechecked unchanged before publication).
- Source commits `2e14227` + `71e0f4083d3ad88aaad11e890796bbe04a3f091e`.
- Final tested source tree `3c9e690e7ee9cedba63256ad3b3f07d5321e7b9b`.
  Subsequent evidence-only commit does not change executable sources or tests.
- P01–P06/P05: `docs/decisions/2026-10-20-li-event-participation-selection.md`.
  EB2: PM decision copied from PR #165 exact `7e802c6` (no UI/AI package cherry-pick).
- Contract: `api/event-participation-contract.md`, `api/event-participation.json`,
  composed `api/openapi.json`. Later EB2 section explicitly supersedes only the
  former no-pagination exclusion. Prior 19Oct partial/pending evidence remains
  historical; it is not silently relabeled as this implementation's result.

## Environment / actually executed gates

Node **24.19.0**, pinned Flutter **3.47.2** / Dart **3.13.2**, Windows x64,
Java **21**. Existing approved dependency installation reused through a local
ignored node_modules junction; **no new pnpm frozen install is claimed**.
Offline Flutter lockfile-enforced dependency resolution passed; package manifests
and lockfiles unchanged. No dependency/version/SDK upgrade.

| Gate | Actual result | Scope / limitation |
| --- | --- | --- |
| Strict Backend TypeScript compile | Pass | `backend/tsconfig.json`; exit0 |
| Backend affected contract/Transport/source/owner suites | **72/72 Pass** | Eight explicitly listed files below; not full Backend suite |
| Flutter owner / repository / widget / paging suites | **43/43 Pass** | Five files; `--no-test-assets`, test-only NoSplash |
| Actual Auth + Firestore Emulator | **4/4 Pass** | SDK over owned loopback-only Emulators, not in-memory evidence |
| Scoped Dart analysis | Pass, no issues | Feature/browse/route/client/result and new tests |
| Changed-file Dart format / whitespace | Pass | No production theme/assets weakened |
| OpenAPI composition `--check` | Pass | Route inventory, errors, no-store and schemas included in Backend tests |
| Real provider calls / deployment / account enablement | **Not Run** | No real key, LI runtime or shared records accessed |
| APK / real phone / browser registration / whole-app acceptance | **Not Run** | LI's later candidate/device gate, not inferred from components |

## Reproduce from repository root

Use the approved Node installation and pinned FVM Flutter SDK. The Windows run
invoked that SDK's bundled Dart + flutter_tools snapshot directly because of its
local launcher environment; the following FVM forms identify the same pinned tools.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/event-participation.test.js backend/dist/test/event-participation-visibility.test.js backend/dist/test/contract/openapi.test.js backend/dist/test/event-browse-composition.test.js backend/dist/test/controlled-event-projection.test.js backend/dist/test/event-browse-pagination.test.js backend/dist/test/event-browse/event-browse.test.js backend/dist/test/controlled-event-browse.test.js
node backend/scripts/sync-event-participation-openapi.mjs --check
fvm flutter test --no-pub --no-test-assets --reporter expanded test/features/external_registration_flow_test.dart test/features/event_participation_components_test.dart test/features/participation_repository_test.dart test/features/participation_journey_test.dart test/features/event_batches_test.dart
fvm dart analyze lib/features/event_participation lib/features/event_browse lib/app/router/event_participation_routes.dart lib/core/network/backend_api_client.dart lib/core/result/result.dart test/features/participation_repository_test.dart test/features/participation_journey_test.dart test/features/event_batches_test.dart
node backend/scripts/run-event-participation-emulator.mjs
git diff --check
```

Emulator prerequisites: existing approved Java21/Firebase Tools/emulator binaries,
compile first, set local JAVA_HOME/PATH and existing emulator binary cache path.
Runner probes ports **19099/18080/14400/14500/9150** before launching; occupied
ports cause refusal, not takeover. Fixed **demo-enmori-rmvp01a-r10** project only,
explicit generated deny-all client rules, fresh ignored credential profile,
existing allowlisted environment guard, synthetic identities and data. The SDK
runner strips Firebase CLI-injected ambient configuration before enforcing the
same guard; it does not weaken it. Teardown resets only these owned fixtures,
verifies participation records absent, deletes SDK apps and stops owned Emulators.
Final SDK process exit0 and Auth/Firestore/hub/logging shutdown were observed.

Coverage includes real CAS race200/412, independent Repository reread, owner
isolation, expired-source cancel/unignore/tombstone, privacy/friend/block changes,
bounded indexed sparse pages and Username-only callbacks. Unit/fake suites are
separately labeled and also cover count-over200 omission, legacy-private fields,
safe error precedence, input spoofing, unknown write recovery and scoped cursors.

EB2 tests use an attributed HTTP double for Ticketmaster (not live provider proof):
upstream page0 -> page1 fail -> same page1 retry -> filtered-empty continuation ->
page2 terminal; invalid/wrong-owner/expired/duplicate cursor rejected. Later-page
stable-ID Detail/availability crosses the controlled disable gate. Flutter tests
cover stable-ID dedupe, duplicate click fence, old-session completion rejection,
retained rows/cursor on failure, visible bottom Next/Retry/terminal hint and
background clearing. Browser-return regression rebuilds with fresh callbacks
**and fresh opener objects**, then confirms exactly one explicit Going write.

## Preserved failures and bounded repairs

1. Initial SDK harness load failed because Firebase CLI injected FIREBASE_CONFIG;
   the existing guard correctly refused it. Reapplication of the existing child
   environment allowlist fixed the harness, not the guard. A subsequent **3 Pass /
   1 Fail** was a fixture incorrectly expecting a filled page; it now follows
   the already-required sparse cursor. Final actual SDK suite **4/4**.
2. New client invalid-date regression initially failed: a normalized February30
   was accepted. Adapter now round-trips UTC calendar components; original invalid
   input assertion remains. Final scoped client/widget suite **43/43**.
3. Source `2e14227` Backend run **71 Pass /1 Fail** retained. Unchanged atomic
   source-generation test failed at `assert.ok(detail.ok)` because optional
   source capabilities were advertised even when unsupported. `71e0f4` exposes
   them only when available and preserves the cached first generation; exact
   same assertion plus later-page tests now pass **72/72**. Intermediate strict
   compile failure from exactOptionalPropertyTypes is also retained; corrected
   optional function declarations, not relaxed compiler options.
4. Earlier standard asset-enabled Flutter invocation failed before assertions
   on missing `flutter/runtime_effect.glsl`. A broader no-assets run was
   **70 Pass /2 Fail**, both unchanged older widget taps requiring missing
   `shaders/ink_sparkle.frag`. These failures remain unresolved environment/asset
   limitations. This delivery's NoSplash/no-assets component proof is **not**
   visual/shader/full-Flutter/APK/device evidence, and the broader run is not green.
5. First scoped analysis reported one missing-braces info in the new controller;
   fixed and rerun with no issues. No lint/compiler/test exclusions were added.

Local generated log SHA-256 receipts (logs retained under ignored build/):

- Final Backend72: `aa1e89eb8aa0a8c25f1de49bd280109459046a6a3d33d830555a20c3a4e2ec2e`.
- Original Backend71/1: `63d54a2e651bb8d9136df3431d8290d791a5836981d5867bad186998d24b9b44`.
- Final Flutter43 at71e0f4: `4e34eb03242d8b62de0a6cfd9a64ba5cc1e441607c57f99f5f302ae0e7f4108b`.
- Final actual Emulator4 at71e0f4: `daa3e585fe3c1c4d6dba1a4c60a30dbb4651762fdc4389c527649d1d7985ab6d`.

## Next owners / remaining gates

**ZHOU:** independent exact-head Event contract/source review. **LI:** evidence
review, final root/runtime/candidate wiring and authorized actual device flow.
**JIN:** consume the bounded profile/relationship/deletion seams and implement
his separate Home friend activity extension. See the single integration note:
`docs/planning/local-ui-handoff-oct19/shi-event-integration-oct20.md`.

No main merge, auto-merge, Issue/Project closure, deployment, UAT, Release or Done
is requested or implied. Existing shared runtime, phone and original worktrees
were not changed. Draft review delivery does not remove LI's rollout permission.
