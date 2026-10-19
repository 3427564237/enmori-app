# DU Unsaved-Exit Closure

## Provenance

- Handoff source revision: `927f77527b32d349aa08020f7de0e88402edb9c7`
- UI baseline revision: `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`
- Scope: prevent accidental loss of unsaved registration, profile, and account-settings input. Existing Check-in/Footprint behavior was inspected but not changed in this increment; no additional reproducible defect in that audited slice was established here.
- No API, persistence schema, backend, theme, AI/Persona, Event, or shared-workspace changes.

## Change And User Flows

- Registration: entering any account details or accepting terms and navigating Back now asks whether to stay or discard. Staying preserves the draft; discarding exits without submitting a registration request. Back is blocked while registration is pending. An untouched form exits without an unnecessary prompt.
- Profile and settings: changing any editable field and navigating Back now asks whether to stay or discard. Staying preserves the in-memory edits; discarding exits without a save. Unchanged views exit normally. Back is blocked while a save, location lookup, or sign-out operation is active.
- The existing explicit Save flows remain the only persistence path. No request is issued by the discard action.

## Verification

- Added widget coverage for registration, profile, and settings Back -> Stay -> Discard flows, including preservation of drafts and no accidental profile write.
- `git diff --check`: passed.
- Flutter widget tests and Dart analysis: **Not Run**. This machine has no `flutter`, `dart`, or `fvm` executable available. Repository baseline is Flutter `3.47.2` (`.fvmrc`). Run in a configured environment:

  ```powershell
  fvm flutter test test/app/account_preferences_flow_test.dart
  fvm flutter test test/features/rmvp01a_r6_pages_test.dart
  fvm flutter analyze
  ```

- Real-account/backend behavior, Android installation, keyboard/device Back behavior, and live Check-in/Footprint read/write were **Not Run**. No backend service, real account, or device was touched.
- Existing broader repository test totals are not asserted by this increment.

## Contract And Integration Note

This is a client-side navigation guard only. It does not change the approved profile/settings persistence contract or registration API. The guard compares editable values against the currently loaded profile/settings state; a future external refresh while the editor is open should continue to follow the existing controller/revision-conflict behavior. Integrate only after the added widget tests and analyzer pass on Flutter `3.47.2`; perform Android Back/keyboard smoke checks separately. This delivery is not a merge or release authorization.
