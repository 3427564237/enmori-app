# DU Unsaved-Exit Closure

## Provenance

- Handoff source revision: `927f77527b32d349aa08020f7de0e88402edb9c7`
- UI baseline revision: `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`
- Integration base: current `main` at `d59cb128bfe0b5889baae0b08c973e140505590f`.
- Scope: prevent accidental loss of unsaved registration, profile, and account-settings input. Existing Check-in/Footprint behavior was inspected but not changed in this increment; no additional reproducible defect in that audited slice was established here.
- No API, persistence schema, backend, theme, AI/Persona, Event, or shared-workspace changes.

## Change And User Flows

- Registration: entering any account details and navigating Back asks whether to stay or discard. Staying preserves the draft; discarding exits without submitting a registration request. Back is blocked while registration is pending. An untouched form exits without an unnecessary prompt.
- Profile and settings: changing an editable field and navigating Back asks whether to stay or discard. Staying preserves in-memory edits; discarding exits without a save. Unchanged views exit normally. Back is blocked while a save or sign-out operation is active.
- Existing explicit Save flows remain the only persistence path. Discard does not issue a request.

## Verification

- Added widget coverage for registration, profile, and settings Back -> Stay -> Discard flows, including preservation of drafts and no accidental profile write.
- `git diff --check`: passed.
- Flutter widget tests and Dart analysis: **Not Run**. Flutter, Dart, and FVM executables are unavailable on this machine. Repository baseline is Flutter `3.47.2` (`.fvmrc`). Run in a configured environment:

  ```powershell
  fvm flutter test test/app/account_preferences_flow_test.dart
  fvm flutter test test/features/rmvp01a_r6_pages_test.dart
  fvm flutter analyze
  ```

- Real-account/backend behavior, Android installation, keyboard/device Back behavior, and live Check-in/Footprint read/write were **Not Run**. No backend service, real account, or device was touched.

## Contract And Integration Note

This is a client-side navigation guard only. It does not change the approved profile/settings persistence contract or registration API. Dirty state compares editable values with the currently loaded profile/settings state; existing revision-conflict behavior remains unchanged. LI: run the focused widget tests and analyzer on Flutter `3.47.2`, then perform Android Back/keyboard smoke checks. This delivery is not merge or release approval.
