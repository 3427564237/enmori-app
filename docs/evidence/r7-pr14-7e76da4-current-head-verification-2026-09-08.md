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

## Immutable screenshot and accessibility evidence

The six screenshots are versioned with this evidence revision. After the
commit is pushed, their immutable GitHub links are the `blob/<evidence-head>`
links for the paths below; the PR comment records that exact evidence head.

The screenshots were captured on the Android device by the same R7 drive
command above. They are not emulator images and contain no account or note
content other than the controlled sanitized fixture.

| Surface | Versioned Android screenshot | Accessible controls / state covered by the R7 Android test |
| --- | --- | --- |
| M02 Registration | `docs/evidence/pr14-r7-7e76da4-android/r7_01_m02_registration.png` | Email, Password, confirmation, Username and submit are located by stable keys before capture. |
| M06 Optional data use | `docs/evidence/pr14-r7-7e76da4-android/r7_02_m06_initial_choice_information.png` | Purpose copy and the single Continue control are present before capture. |
| M07 paired Initial Choice | `docs/evidence/pr14-r7-7e76da4-android/r7_03_m07_paired_initial_choice.png` | Semantics labels include the optional-processing and Public/Private consequence for both Accept and Reject. |
| M08 Home shell | `docs/evidence/pr14-r7-7e76da4-android/r7_04_m08_home_shell.png` | New Check-in is present as the entry action before capture. |
| M19 Note-only Check-in | `docs/evidence/pr14-r7-7e76da4-android/r7_05_m19_note_only_check_in.png` | Note editor and Save Check-in are present before capture. |
| M20 saved Check-in | `docs/evidence/pr14-r7-7e76da4-android/r7_06_m20_saved_check_in_confirmed.png` | Saved Check-in confirmed and Return Home are present after authoritative create then later-read confirmation. |

The responsive widget suite exercises these semantic controls at 360x800 and
800x360 with text scales 1.0 and 2.0. In particular it asserts the M07
Accept/Reject accessible names and visible controls, M19 Save Check-in, and
M20 Return Home. This is widget-level semantics evidence, not a claim that an
Android screen reader session was independently executed.

The fresh runtime Android UI hierarchy for M20 was captured after this run and
sanitized in `docs/evidence/r7-pr14-current-head-device-ui-dump-2026-09-08.xml`.
It records Android roles, content descriptions, bounds, focusability,
scrollability and actions for New Check-in, Note, character count, Save
Check-in, confirmation and Return Home. The Note is redacted. The remaining
five pages have Android screenshot evidence plus the R7 and widget semantics
assertions above; a separate TalkBack execution was not run and is not
claimed here.

R14, R15, Q04, UAT, Release, and Done remain Not Run pending LI current-head review.
