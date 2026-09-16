# S2-01 LI Android Emulator execution

- Executor: LI / PM-controlled execution, 2026-09-16
- Tested source: `abc339c38fbf3d6464921f6352e28fa9029c93c1`
- Previous reviewed head: `5db460ad8b28f84268a25cf05c334c997c1a0196`
- Scope: Issue #27 / PR #32, Interest page and real Backend persistence only
- Android: local Pixel 6 AVD, Android 16 / API 36, x86_64, KVM; ADB state `device`
- Flutter 3.47.2 / Dart 3.13.2; Node 24.19.0 / pnpm 11.19.0

## Result

| Check | Observed result |
| --- | --- |
| Flutter analyze on the Dart test increment | Pass, no issues |
| Complete Flutter regression suite | Pass, 88/88 |
| Android integration test | Pass, 1/1 test with the scenario assertions below |
| Debug APK build/install during integration execution | Pass |
| Final whitespace check | Pass |

The successful Android run completed at approximately 10:32 UTC. Its APK SHA-256
is `89b6c7f7b4997cc5a377f62e3b99b07c184e6a95a9b576682b9baf938451f7c1`.
This is a test APK with synthetic Emulator configuration, not a distributable
Demo/Release APK.

## Executed assertions

The committed `integration_test/s2_interest_real_backend_test.dart` authenticated
a synthetic identity through Firebase Auth Emulator, used the actual HTTPS
Backend client/repository, and verified persisted data through the real
Firestore Emulator adapter:

1. Active catalogue value is present; toggling it and saving succeeds.
2. A later Backend read has the new selection and revision increment.
3. Destroying and reopening the editor reads the persisted checkbox state.
4. A second authenticated repository write advances the revision; saving from
   the stale editor shows the conflict panel and disables Save.
5. Explicit Reload removes the conflict and loads the authoritative selection.
6. Saving the empty selection succeeds and the later read is empty with exactly
   two further revisions (second writer plus post-reload save). The failed stale
   write did not silently overwrite or advance the revision.

No Event repository/UI or final team smoke is included in this execution.

## Isolated setup and reproduction

Start only the existing Auth/Firestore Emulator pair from `firebase.json` for
`demo-enmori-rmvp01a-r10`. Both listeners bind to host loopback. The CLI and test
Backend children use `buildControlledEmulatorTestEnvironment` with isolated
credential profiles and metadata discovery disabled. No real Firebase project,
cloud credentials, production mode or controlled Demo data is used.

Fixture construction follows the existing R13 cross-boundary test: construct
`buildApp` with the actual Firebase verifier, Firestore repositories, Interest
use cases, clock and ID generator; create one synthetic Auth user, complete its
onboarding through the existing use case, and create one active Interest record
with `displayName`, `lifecycleState: active`, and `revision: 1` in the Emulator.
The temporary HTTPS listener serves the same Fastify `app.routing` handler on a
dynamically allocated loopback port. It is test-only, not a deployed runtime.

Generate a temporary one-day certificate with SAN IPs `10.0.2.2` and `127.0.0.1`.
Pass its public PEM bytes as base64 using
`ENMORI_TEST_TLS_CERTIFICATE_BASE64`; the test permits that trust only with a
`demo-` Firebase project and HTTPS Android host-loopback alias `10.0.2.2`.
It uses an otherwise empty trust store and never sets `badCertificateCallback`.
The private key and ephemeral fixture credentials stay machine-local.

Supply the test's existing required defines using a private local JSON file:
API base URL, synthetic Firebase values, synthetic test email/password and the
active Interest ID, plus the optional public test certificate. Do not commit
the generated JSON, keys, APK, user identity or raw diagnostic logs.

Commands (local fixture paths and target identifier are intentionally omitted):

```sh
fvm flutter analyze
fvm flutter test
fvm flutter test integration_test/s2_interest_real_backend_test.dart \
  -d <local-android-emulator> \
  --dart-define-from-file=<private-local-fixture-json> \
  --reporter expanded
git diff --check
```

The Flutter regression/analyzer results preceded the final debug XML adjustment;
the successful Android build/test included that final adjustment. Backend source,
dependencies and lockfiles did not change, so earlier Backend 125/125 and
Firebase Emulator 17/17 results remain historical evidence, not new reruns.

## Failed attempt and bounded fix

The first actual Android attempt failed before Interest operations because
Firebase Auth Emulator uses HTTP and Android rejected cleartext traffic to
`10.0.2.2`. The debug manifest now references a debug-only network security
configuration: cleartext denied by default, allowed only for that exact address,
without subdomains. Main/Release manifests and product HTTPS validation are
unchanged. The repeat run passed. No global cleartext or TLS bypass was added.

SDK XML and future Kotlin-plugin migration notices were non-failing build
warnings. No framework, plugin or dependency upgrade was performed.

## Evidence boundary and handoff

This replaces the earlier local `No AVD` blocker and adds real Active-Tag,
reopen/read, stale-conflict/reload and empty-save Android Emulator evidence.
The previous narrow phone observation remains historical and unchanged.

DU must independently review the test/debug-config increment at the new PR head.
The previous approval is valid only for its earlier head. PR #32 and Issue #27
remain open pending that disposition and normal merge. Demo initialization,
S2-03 Event integration, S2-06, final LI team smoke, UAT and Release are not proved
by this Interest test.
