# PR #14 R6 Local Verification Evidence

Timestamp: 2026-09-06 20:03 +08:00
Executor: @397781783dk-prog / DU
Branch: `du/r6-rmvp01a-ui-widget-first-pass`
Base: `main@d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`
Code head before this evidence-only commit: `ab886007e8905aeb17f542aab1fad23be5c4893f`

## Scope

R6 local UI/widget first-pass evidence for PR #14, plus R7 device visibility status. RouteBoundaryPage remains an R6 seam only and is not Q04 completion evidence.

## Local Verification

- `flutter pub get`: Pass. Dependencies resolved. Flutter emitted a non-fatal upstream git fetch warning: `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`.
- `dart format lib test`: Pass. `Formatted 39 files (8 changed) in 0.10 seconds.`
- `flutter analyze`: Pass. `No issues found! (ran in 8.1s)`.
- `flutter test test\features\rmvp01a_r6_pages_test.dart`: Pass. `5/5` tests passed.
- `flutter test`: Pass. `45/45` tests passed.
- `flutter build apk --debug`: Blocked/Fail. No current-run APK success is claimed.

## R6 Widget Tests Covered

- R6 surfaces render in portrait and landscape bounds.
- Registration blocks mismatched confirmation before auth command.
- Onboarding submits a paired initial choice with idempotency.
- Note-only Check-in blocks invalid note before repository create.
- Note-only Check-in shows committed and confirmed states.

## Device Evidence

ADB visible device:

```text
10ACC70EX7000Y8        device product:PD2243 model:V2243A device:PD2243 transport_id:1
```

Device properties:

- Manufacturer: vivo
- Model: V2243A
- Android release: 15
- SDK/API: 35

## Current APK / R7 Blocker

The connected Android device is visible, so ADB visibility is no longer the blocker. The current blocker is Windows Java/Gradle file access during APK build.

Reproduced after:

- clean Gradle home,
- Gradle daemon stop,
- serial build with `--no-daemon --max-workers=1`,
- `JAVA_TOOL_OPTIONS=-Dsun.zip.disableMemoryMapping=true`.

Observed failures include:

```text
java.nio.file.AccessDeniedException: C:\Users\lenovo\Documents\ChatGPT\3851B\enmori-work\toolchains\android-sdk\platforms\android-34\core-for-system-modules.jar
Execution failed for task ':firebase_core:compileDebugJavaWithJavac'.
java.nio.file.AccessDeniedException: ...\gradle-home-pr14-serial\caches\9.3.1\transforms\...\lifecycle-livedata-core-2.7.0-api.jar
```

A stale local `build\app\outputs\flutter-apk\app-debug.apk` exists from `2026-09-03 18:13:22 +08:00`; it is not counted as current PR #14 APK evidence.

## Not Run Boundary

Android app/device UI execution, Q04, accessibility, and UAT remain Not Run until a current APK build/install/run completes successfully.