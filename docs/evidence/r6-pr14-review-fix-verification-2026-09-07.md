# PR #14 R6 Review-Fix Verification Evidence

Timestamp: 2026-09-07 03:45 +08:00 / 2026-09-07 03:45 SGT
Executor: @397781783dk-prog / DU
Branch: `du/r6-rmvp01a-ui-widget-first-pass`
Base: `main@d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`
Evidence head before this document: `0b2618e92cc93308a05aa5f316a16e164788cf8a`

## Review Findings Addressed

LI's five R6 review blockers from PR #14 review `pullrequestreview-5125398664` were addressed in the smallest R6-only scope:

1. M02/M06/M07 sequence restored: Username collection, separate Initial Choice information page with single Continue, then paired Initial Choice accept/reject actions.
2. Username validation aligned to the approved canonical rule: 3-30 lowercase ASCII letters, digits, and underscores; starts and ends alphanumeric; no consecutive underscores. Boundary and uppercase rejection tests added.
3. Check-in pending state no longer claims commit. Action copy is `Save Check-in`, pending copy is neutral, and `Check-in saved.` is shown only after authoritative create response.
4. M20 confirmation flow completed with `Retry confirmation`, `Return Home`, and stable error-kind to UI copy mapping. Repository `failure.message` is not rendered directly for Check-in confirmation/create failures.
5. Widget evidence expanded to 360x800 and 800x360 at text scales 1.0 and 2.0, plus semantics, pending/disabled/error association, and no hidden focused field/action checks.

## Verification

Formatting:

```text
dart format integration_test test_driver
Formatted 2 files (0 changed) in 0.01 seconds.
```

Analyze:

```text
flutter analyze
Analyzing enmori-app...
No issues found! (ran in 8.6s)
```

Focused R6 Widget Tests:

```text
flutter test test\features\rmvp01a_r6_pages_test.dart
00:01 +9: All tests passed!
```

Full local test suite:

```text
flutter test
00:02 +49: All tests passed!
```

Note: the suite now contains 49 tests after adding the focused R6 review coverage; this supersedes the earlier 45-test count.

Debug APK:

```text
flutter build apk --debug
Running Gradle task 'assembleDebug'...                              9.4s
√ Built build\app\outputs\flutter-apk\app-debug.apk
```

APK artifact:

```text
Path=build\app\outputs\flutter-apk\app-debug.apk
Length=223775099
LastWriteTime=2026-09-07 03:38:37 +08:00
```

Diff check:

```text
git diff --check -- lib test integration_test test_driver
Pass: no output, exit code 0.
```

Integration-target APK build:

```text
flutter build apk --debug -t integration_test\r6_surface_device_evidence_test.dart
Running Gradle task 'assembleDebug'...                              8.9s
√ Built build\app\outputs\flutter-apk\app-debug.apk
```

## Android Device Evidence Status

ADB-visible device:

```text
10ACC70EX7000Y8        device product:PD2243 model:V2243A device:PD2243 transport_id:1
```

Device properties:

- Manufacturer: vivo
- Model: V2243A
- Android release: 15
- SDK/API: 35

Corrected R7 drive command prepared and committed:

```text
flutter drive --driver test_driver\integration_test.dart --target integration_test\r6_surface_device_evidence_test.dart -d 10ACC70EX7000Y8 --use-application-binary build\app\outputs\flutter-apk\app-debug.apk --no-pub --screenshot build\r7-screenshots --no-keep-app-running
```

Observed execution:

- First drive attempt installed and connected to VMService on the Android 15 device, then failed on an evidence-test assertion that matched only the literal text `Register`. The app had reached `route-register`; the assertion was corrected to use stable R6 keys: `route-register`, `r6-register-email`, `r6-register-password`, and `r6-register-submit`.
- Corrected integration-target APK rebuild passed.
- Second corrected drive attempt remained at `Installing build\app\outputs\flutter-apk\app-debug.apk...` for more than 90 seconds with no test output and was interrupted. This is consistent with device-side install confirmation/security gating on the vivo handset.

Current R7 blocker:

- R7 six-page real Android execution, sanitized screenshots, and accessibility capture are still blocked by device-side ADB install confirmation/security gating for the corrected integration-test APK.
- ADB visibility is not the blocker; the device is visible and reachable.

## Boundary

- R6 review-fix local work is complete and verified.
- Android launch smoke is not counted as R7 completion.
- The corrected R7 integration test and driver are committed, but R7 remains blocked until the Android device allows the corrected APK install/run and the six screenshots/accessibility capture are produced.
- Q04, controlled backend integration, UAT, Release, and Done remain Not Run.
