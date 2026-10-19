# SHI Event participation: partial source delivery

## Source receipt

- Input ZIP: `enmori-team-handoff-927f775.zip`, 10772819 bytes,
  SHA256 `8690231af8cc177e97593ae820006b9baa6b1ee7ffeb86111434da644719f3fc`.
- All13 manifest-listed files verified. Git bundle SHA256
  `7c47dbe50a3e728e109f5dfffeb948c19ad5ebeb8e3250b6fd682e00d921a794`.
- Verified checkout927f77527b32d349aa08020f7de0e88402edb9c7 and ancestor
  51ecb5c11ff23ce3bf36fbf9280d2e00646ac857. Created a new checkout and branch
  `codex/shi-events-participation-20261019`; original workspaces/files untouched.
- No APK/credentials/runtime data in the input. No remote fetch, push, PR,
  installation, service activation, merge, Issue/Project transition or closure.

## Implemented scope / user outcomes

- Shared Event card consumes existing EventDetail by stable ID, inherits theme,
  presents known time/category/location/description and optional already-authorized
  reason/count; absent data is not an invented zero/description/end time.
- Opt-in external-registration action: explicit third-party disclosure, cancel,
  open, actual background/return observation, Yes/No dialog. Only explicit Yes
  invokes the supplied Going writer once. No or dismissed dialog writes nothing;
  failed open cannot become Going. Inactive alone is not treated as departure.
- Async native handoff can settle before or after return; repeat taps, repeated
  resume, disposal and same-subject/new-account replacement fence stale work.
- Uncertain write result permits only authoritative readback, not blind mutation
  replay. This does not undo a sent Backend action or claim a booking.
- Pure Backend visibility policy reuses existing ProfileVisibility: missing/private
  hidden, friends-only requires current friendship, blocks/ineligible deny,
  eligible owner reads own value. Consent is not a manual-participation gate.

All write/read/native dependencies in tests are explicit handwritten fixtures.
They prove local transitions, not real registration, Backend persistence or TLS.

## Executed checks and retained failures

Environment: existing Flutter3.47.2 / Dart3.13.2; Node24.19.0; TypeScript7.0.2.

1. Offline locked pub resolution failed because geolocator was not cached. One
   network `pub get --enforce-lockfile` downloaded the supplied locked dependency
   set successfully; pubspec/lock files unchanged, no version selection/upgrade.
2. Standard `flutter test --no-pub` failed before cases: impellerc could not find
   `flutter/runtime_effect.glsl` while compiling material_ui/SDK shaders. Retained
   local `flutter_01.log`, SHA256
   `832680c987b1a0760155432a4ecdb3ba2696abdc34c0c27f1023410d7650ee10`.
   Root cause beyond missing-include compiler boundary is not established. No
   SDK/package/shared-theme edits and no claim that asset build now passes.
3. First no-assets attempt exposed four fixture `await void` compile errors;
   removed invalid await from the synchronous lifecycle method. Next run passed
   11 logic cases but had a missing InkSparkle asset and one widget callback
   failure. Test-only NoSplash removes the unavailable visual shader dependency;
   it is not a production-theme or rendering fix.
4. Traced the widget failure: `expect` inside a registered callback conflicted
   with pending guarded `tapAt`. Capture the synthetic event ID in the callback
   and assert the same ID/count after pumping. Temporary traces were removed.
   No product assertion weakened or production guard bypassed.
5. Final `flutter test --no-pub --no-test-assets --reporter expanded
   test/features/external_registration_flow_test.dart
   test/features/event_participation_components_test.dart`: **16/16**, exit0.
   Test-only NoSplash; no asset/real-Playfair visual claim. Includes same-subject
   replacement during disclosure and other-account replacement during return.
6. Scoped Dart fatal-info analysis on5 new Dart files: no issues, exit0;
   non-writing formatter5/0; whitespace check passed.
7. Scoped strict TypeScript compile plus Node test of new privacy policy:
   **5/5**, exit0. Reused installed TypeScript/Node typings from the existing
   checkout, explicitly `--types node`; initial command without that option
   failed to resolve node:test/node:assert. Not a product red, no dependency edit.
   No claim of full Backend build or Emulator contract suite.

Final Flutter local output: `build/shi-event-checks/flutter-final.log`, SHA256
`0b41f93c3fefff1dd78b9247fdf574b6754789f57a5baccbc74290ae40b8d756`.
Local logs are not all bundled raw host evidence; the committed record states
their actual outcomes. Old tests/counts and LI device evidence are not transferred.

## Incomplete / blockers / owners

- **LI physical contract decision**: see the single concentrated candidate in
  `docs/planning/2026-10-20-shi-event-participation-contract-gaps.md`.
  Public path/DTO/precondition, physical persistence/lifetime, ignore semantics
  and authorized participant pagination/identity are not defined by the supplied
  product brief. Backend Skill requires stopping those selections. Therefore
  full Interested/Going/cancel/ignore persistence and participant page remain
  **not implemented**, not merely waiting for credentials.
- **SHI after selection**: actual transport/OpenAPI/schema/Firestore adapter,
  strict contract fixtures, participants Friends/Others paging and profile
  participation section; targeted isolated integration and independent ZHOU review.
- **JIN**: existing trusted relationship/profile identity seam, not duplicate
  social state. No new JIN task or acknowledgement asserted by this record.
- **LI final composition/host/device**: inject actual Backend callbacks/opener,
  connect Home/Events/profile routes, verify one candidate. No private host touched.
- Asset-enabled widget run/APK, real save/readback/conflict, authorization paging,
  Music recommendation regression on real data, Android external flow: **Not Run**
  for this increment. Overall package incomplete; no UAT/Release/Done claim.
