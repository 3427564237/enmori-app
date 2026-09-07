# PR #14 current-head R6/R7 verification

Date: 2026-09-08 SGT

## Exact code revision

- Code head: `7e76da4d5a0e714922747bbd5d92ac61a474bcb7`
- Merge base: `ba8bfcca68b0de73c8c6b46e9f40385f999dd469`
- Device: vivo `V2243A`, Android 15 / API 35, ADB serial `10ACC70EX7000Y8`

## R6 correction

- M06 now uses approved title `Optional data use`, exact body, and supporting statement.
- Registration, Onboarding, and Check-in map existing-account, protected, and service-unavailable failures to the approved public catalogue without rendering repository messages.
- Focused widget coverage includes M06 exact copy and all affected public-error branches.

## Local verification on the exact code revision

- `dart format --output=show --set-exit-if-changed lib test integration_test test_driver`: Pass.
- `flutter analyze`: Pass.
- `flutter test`: 56/56 Pass.
- `flutter build apk --debug`: Pass.
- `flutter build apk --debug --target integration_test/r6_surface_device_evidence_test.dart`: Pass.
- `git diff --check`: Pass.
- APK SHA-256: `C6813B2C0368957FDB69036C74E1266D41D17A4175B8BB19FF70B3D9F0881FF9`.

## R7 Android verification on the exact code revision

Command:

```powershell
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/r6_surface_device_evidence_test.dart -d 10ACC70EX7000Y8 --use-application-binary build/app/outputs/flutter-apk/app-debug.apk --no-pub --keep-app-running
```

Result: Pass, `R7 bounded Android evidence covers six approved R6 pages`; `All tests passed!`.

The fresh screenshots are in `build/r7-screenshots`:

- `r7_01_m02_registration.png`
- `r7_02_m06_initial_choice_information.png`
- `r7_03_m07_paired_initial_choice.png`
- `r7_04_m08_home_shell.png`
- `r7_05_m19_note_only_check_in.png`
- `r7_06_m20_saved_check_in_confirmed.png`

The fresh runtime UI hierarchy was captured after this run and sanitized in `docs/evidence/r7-pr14-current-head-device-ui-dump-2026-09-08.xml`. It retains only ENMORI hierarchy, public labels, bounds, focusability, and actions; the Note value is redacted.

R14, R15, Q04, UAT, Release, and Done remain Not Run pending LI current-head review.
