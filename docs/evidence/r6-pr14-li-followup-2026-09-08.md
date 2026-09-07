# PR #14 R6 LI follow-up evidence

Date: 2026-09-08 (SGT)

## Scope

DU revision only. R14, Q04, UAT, Release and Done remain Not Run.

## Revisions

- Base/main: `ba8bfcca68b0de73c8c6b46e9f40385f999dd469`
- Merge base before this revision: `ba8bfcca68b0de73c8c6b46e9f40385f999dd469`
- Revised head: `8d52ed0b5353bdb78229879a65c1430398f26f1e`

## R6 changes

- Registration maps all repository failures to stable public copy and never renders `failure.message`.
- Registration exposes an SP-01 linked multi-error summary with field-level focus links and semantics.
- Registration, Onboarding and Check-in call `abandon()` from page lifecycle disposal; page disposal invalidates late command results without writing provider state.
- Added the one-character Username regression (`a` is rejected) and a widget test proving a late onboarding response is ignored after page exit.
- M06 retains the approved exact title `Initial Choice information`, purpose copy, and supporting Accept/Public and Reject/Private statement; M06 remains information-only and M07 remains the decision state.

## Verification

- `dart format lib test`: Pass
- `flutter analyze`: Pass
- `flutter test`: Pass, 51/51
- `flutter build apk --debug`: Pass
- integration APK build using `integration_test/r6_surface_device_evidence_test.dart`: Pass
- `git diff --check`: Pass
- Debug/integration APK SHA-256 from this source tree: `16FFB108AFBA115DFAAB8C7B9FEF9D38A2E06DA056906F8EFA551AAF70166B84`

## Device execution

ADB target observed: `10ACC70EX7000Y8`; state `device`. Device: `V2243A`, Android `15`, API `35`. Exact-head drive command completed successfully after USB installation authorization. Result: `R7 bounded Android evidence covers six approved R6 pages`, Pass. Six screenshots were produced under `build/r7-screenshots`; sanitized accessibility/UI dump is present in the existing R7 evidence package. No device blocker remains.
