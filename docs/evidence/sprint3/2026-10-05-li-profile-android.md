# LI own Profile Android and real Backend verification — 2026-10-05

Owner/executor: LI HOURUI. Task: [#45](https://github.com/3427564237/enmori-app/issues/45). Assigned different reviewer: DU KUN. Scope is the [approved first own Profile increment](../../decisions/2026-09-30-own-profile-first-slice-approval.md), not full Profile/Settings or Sprint acceptance.

## Source and review boundaries

- Existing product/review head: [PR #50](https://github.com/3427564237/enmori-app/pull/50), `acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5`.
- DU approved that exact head on 4 October. The review explicitly covers the bounded own-Profile/navigation increment over #43, and excludes predecessor acceptance and real Backend/device execution.
- Additional test/runner source: `92212487daa31f8f8f799f0c5366199761d614ad`, based directly on that reviewed head. Product `lib/`, Backend source, API, manifests, dependencies and lockfiles are unchanged by this increment.
- Existing stacked chain: #42 `479619e8d124f3342458506fc145dc4bfbe3f483` → #43 `27b899fe93066298bd36d4d5dadf0f90a374a50d` → #50. #43 has no formal review in the 5 October snapshot. This execution is owner evidence and cannot supply that independent approval.
- The new test/runner/evidence diff is local pending publication and DU disposition. Existing approval remains evidence for its exact historical scope; it is not relabelled as review of these additions.

## Isolated environment and reproduction

Android target: existing `enmori_s2_api36` AVD, Android 16/API 36, x86_64; ADB reports `device`. Flutter 3.47.2/Dart 3.13.2, Node 24.19.0/pnpm 11.19.0, Java 25.0.4.1, Gradle 9.3.1. The test uses the existing Auth/Firestore Emulator configuration and non-real project `demo-enmori-rmvp01a-r10` only.

The [runner](../../../tool/run_s3_profile_emulators.mjs) reuses `buildControlledEmulatorTestEnvironment`, strips CLI-injected credential-discovery configuration before the Admin boundary, and constructs the actual Firebase verifier, Firestore repositories, application use cases and Fastify route handler. It creates one synthetic identity and onboards it through the existing use case, then supplies only approved synthetic Interest and six-field Event records. No real Firebase project, provider import, controlled-Demo data or cloud credential is used.

The temporary test-only HTTPS listener binds host loopback with a dynamically allocated port. Its one-day certificate is trusted only by an empty test trust store for the Android host-loopback alias `10.0.2.2`; the Dart test rejects any other project/host or missing certificate before authentication. No `badCertificateCallback`, product TLS change or public ingress is introduced. Test account credentials, TLS private key and defines JSON remain in a mode-restricted temporary directory removed by the runner. Emulator data disappears when its processes stop.

Resolve the existing pinned dependencies, use the cached SDK selected by `.fvmrc`, start the existing isolated AVD, and run with the pinned Node binary first in PATH:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm backend:build
fvm flutter pub get --enforce-lockfile
fvm flutter analyze --no-pub
fvm flutter test --no-pub --reporter expanded
pnpm backend:test
node tool/run_s3_profile_emulators.mjs <emulator-serial>
git diff --check
```

`tool/run_s3_profile_emulators.mjs` requires Node 24.19.0 and an `emulator-<number>` target. It expects the local FVM SDK link to exist; `fvm use 3.47.2 --skip-pub-get` creates it where absent. Keep any editor-setting side effect outside the published diff. The runner starts/stops only the existing loopback Auth/Firestore pair and performs the SDK `integration_test` execution; no new Flutter Driver/dependency/platform upgrade is involved.

## Executed checks

| Check | Observed result |
|---|---|
| Locked Flutter dependency resolution | Pass; existing lockfile unchanged |
| Flutter static analysis on the final test source | Pass, no issues |
| Full Flutter unit/widget suite; product files identical to the reviewed head | Pass, 113/113 |
| Pinned Node strict Backend build and suite | Pass, 277/277 |
| Android SDK integration test | Pass, 1/1 complete scenario, all listed assertions executed |
| Test APK build/install | Pass; SHA-256 `124f258f2551db9a4220c908471b696394c72e734eac966cc147528b1e9b689b` |
| Independent host Firestore verification after Android execution | Pass; exactly empty selection at revision 3 |
| New test/evidence DU review | Pending; existing product approval is separately recorded above |
| Predecessor #43 independent review / merge / combined JIN gate | Not Run / Pending as applicable |

Complete machine-local logs are retained under `/home/miku/.local/state/enmori/sprint3-li-20261005/`; the APK is in this worktree's ignored `build/app/outputs/flutter-apk/app-debug.apk`. The hash identifies the instrumented integration-test APK, not a distributable Demo/Release build. Sanitized results are also recorded in [the result summary](li-profile-20261005/result-sanitized.json).

The [Android scenario](../../../integration_test/s3_own_profile_real_backend_test.dart) uses the actual application/router, Firebase Auth observation, HTTPS Backend client and Account/Interest/Event repositories. It verifies:

1. Home's initial successful empty recommendations; own canonical Username and previously selected inactive Interest are displayed in Profile.
2. The existing editor saves the active Music fixture while retaining the selected inactive tag; a later protected Backend read observes revision +1 and the canonical selection.
3. Done returns to Profile; displayed tags follow the canonical Backend order, including the inactive label. Returning to Home issues a new recommendation read and shows the matching synthetic Event.
4. An unsaved toggle followed by AppBar Back leaves persisted selection/revision unchanged and emits no Interest PUT. Returning from Profile with system Back still triggers an independent Home read.
5. Clear selection/save followed by system Back, without Done, rereads the persisted empty Profile. A later Backend read observes exactly one further revision; Home refresh removes the previously matching Event.
6. Destroying/reopening Profile rereads the same empty canonical selection and Username. Empty See All returns to Home safely and issues a fresh Home read.
7. After the Android scenario, the host reads Firestore through the existing Admin test adapter boundary and verifies the final stored selection is exactly empty at revision 3. This corroborates persistence independently of the Flutter page.

No false-success, error/retry, overlapping-read or account-replacement device claim is made here: those remain in the existing 11 Profile widget cases. Small-phone/2× text coverage likewise remains widget evidence, not a new device accessibility acceptance. This is real Backend and real Firestore/Auth **Emulator** integration, not a cloud/controlled-Demo, physical-phone, iOS, visual-fidelity, UAT or Release run.

## Test setup corrections, with product behavior retained

The first runner attempt failed before execution because the fresh worktree had no local FVM link. A second attempt exposed Firebase CLI's injected `FIREBASE_CONFIG`; the existing allowlist must be reapplied before the SDK child, as the repository's Emulator runner already does. Neither attempt proves product execution.

The first Android scenario reached the Backend but exposed a fixture error: public onboarding deliberately omits internal AccountId. Seeding from that minimized response wrote an unrelated fixture path, so the owner's initial read was correctly empty. Resolving the existing Auth Binding inside the Backend test fixture fixed the seed without exposing an internal ID to Flutter or changing the public contract.

The next scenario saved successfully but the test expected a pre-save tag order. Existing editor options submit active catalogue selections before retained inactive selections; the Backend preserves the submitted order. The corrected test verifies the canonical Backend result and the Profile's matching displayed order. No product logic was changed to satisfy the test.

## Handoff and retained gates

DU's new test/evidence disposition, predecessor review/merge, final combined-tree checks and LI acceptance remain separate. JIN's combined gate remains Not Run. [The PM action preview](../../planning/2026-10-05-li-sprint3-completion-preview.md) updates #45 dependencies from the actual reviewed JIN/SHI artifacts while retaining unresolved Profile/Settings/producer contracts. No message to another owner, formal review, merge, Issue/Project status mutation, UAT or Done claim is made by this local increment.
