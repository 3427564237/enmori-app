# RMVP-01A LI R1/R2 implementation and handoff — 2026-09-03

- **Work package:** GitHub Issue #3 — Flutter entry, onboarding and Check-in integration
- **Owner:** LI HOURUI
- **Approved task IDs covered:** R1 implementation/owner tests; R2 traceability and handoff record
- **Baseline:** `ce1a6e13955c9d1806758e453c7ded661da1e083`
- **Working branch:** `codex/rmvp-01a-flutter-r1`
- **Evidence status:** local owner evidence only; independent review, controlled Firebase/Backend integration, Android device execution, R3, R15 and R16 remain pending

## Scope implemented

| Approved boundary | Implementation evidence | Owner-test evidence |
| --- | --- | --- |
| Firebase email/password client boundary | `lib/features/auth/domain/auth_repository.dart`; `lib/features/auth/data/firebase_auth_repository.dart` | Session routing and single-subscription assertions in `test/widget_test.dart`, `test/app/rmvp01a_flow_integration_test.dart` and `integration_test/rmvp01a_client_flow_test.dart` |
| Application-lifetime session → onboarding-aware Router | `lib/app/providers.dart`; `lib/app/router/app_router.dart` | Resolving, unauthenticated, onboarding-required, authenticated and unavailable redirect tests in `test/app/router/app_router_test.dart` |
| Product onboarding through Backend only | `lib/features/account/domain/account_repository.dart`; `lib/features/account/data/backend_account_repository.dart`; `lib/features/account/presentation/onboarding_controller.dart` | Approved payload, safe projection, incomplete status and late-result cancellation tests |
| Note-only create and separate owner read through Backend only | `lib/features/check_in/domain/check_in_repository.dart`; `lib/features/check_in/data/backend_check_in_repository.dart`; `lib/features/check_in/presentation/check_in_controller.dart` | Declared-field-only payload, separate encoded-ID read, stable privacy-safe error and late-result cancellation tests |
| Bearer token, idempotency and safe failure boundary | `lib/core/network/backend_api_client.dart`; `lib/core/network/idempotency_key_generator.dart`; `lib/core/result/result.dart` | Authorization/Idempotency headers, 22–64 base64url constraint and stable error mapping tests |
| Dependency composition and fail-closed configuration | `lib/app/bootstrap.dart`; `lib/app/app.dart`; `pubspec.yaml`; `pubspec.lock` | Missing Firebase/API configuration does not create an authenticated or persisted success state |

The placeholder route surfaces in `lib/app/router/app_router.dart` are compile-safe seams only. They intentionally contain no product copy, interaction or visual acceptance and must be replaced/integrated by DU's independently owned R6 output. They are not Q04 evidence and are not `Visual Implementation Ready`.

## Runtime configuration handoff

No credential, token, service-account file or production endpoint is committed. A controlled run supplies the following compile-time values through the execution environment:

- `ENMORI_FIREBASE_API_KEY`
- `ENMORI_FIREBASE_APP_ID`
- `ENMORI_FIREBASE_MESSAGING_SENDER_ID`
- `ENMORI_FIREBASE_PROJECT_ID`
- `ENMORI_API_BASE_URL`
- `ENMORI_USE_FIREBASE_AUTH_EMULATOR=true` for isolated Auth execution
- `ENMORI_FIREBASE_AUTH_EMULATOR_HOST` and `ENMORI_FIREBASE_AUTH_EMULATOR_PORT` when the assigned Android target cannot use the defaults

The default Auth emulator host/port are `10.0.2.2:9099`, suitable only for an Android emulator reaching a host service. The Backend base URL has no default. Missing or invalid required configuration fails closed. ZHOU's R9/R10 controlled environment remains the authority for the actual sanitized values and execution instructions.

## Observed owner verification

| Command | Observed result |
| --- | --- |
| `fvm flutter analyze` | Pass — no issues found |
| `fvm flutter test` | Pass — 33 tests |
| `fvm flutter build apk --debug` | Pass — `build/app/outputs/flutter-apk/app-debug.apk`; no device result implied |
| `fvm flutter test integration_test/rmvp01a_client_flow_test.dart` | **Not Run** — no connected device supported by this project; Linux desktop was present but the repository has no Linux target |

The APK build emitted two non-fatal toolchain warnings: FlutterFire plugins still apply the Kotlin Gradle Plugin, and the installed Android command-line tooling reported an SDK XML-version mismatch. The build also installed the already-requested Android SDK Platform 34 package locally. These observations are not Android device evidence and require normal dependency/toolchain review before Done.

The `integration_test/` case is a Fake-repository client-boundary test. Even when executed, it does not substitute for JIN's R13 controlled Firebase Auth/Backend integration execution, DU's R7 named Android device evidence, or UAT.

## Dependency and review handoff

1. **DU / R8:** independently review LI's R1 architecture, dependency direction, route behavior and owner tests. Integrate R6 surfaces through the route seams without moving product behavior into widgets.
2. **SHI / R5A:** review this R2 traceability/handoff record and confirm the client payload/error mapping remains consistent with R4 Backend/OpenAPI behavior.
3. **ZHOU / R9–R10:** publish only sanitized controlled-environment values and ensure the client never accesses Firestore product data directly.
4. **JIN / R12–R15:** retain integration, device and UAT results as `Not Run` until predecessor outputs and the controlled environment exist; then run the committed test against the assigned Android target and collate independent evidence.
5. **LI / R3:** review SHI's R4 output and DU's R6/R7 output only after those artifacts exist; do not self-review R1.
6. **LI / R16:** review JIN's R15 final gate record only after R15 exists. R16 cannot be completed from the current owner evidence.

## Current completion claim

R1 code and local owner tests plus the R2 handoff record are prepared for independent review. Issue #3 and RMVP-01A are not Done. Controlled-emulator integration, Android device evidence, Q04 evidence, independent reviews, R3, R15, R16, merge and PM scope acceptance remain outstanding.
