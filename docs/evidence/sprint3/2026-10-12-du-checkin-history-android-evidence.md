# DU Check-in History Android Evidence

- **Date:** 2026-10-12
- **Scope:** Issue #82, owner Check-in History / Footprint read and paging
- **Device:** Vivo V2243A, Android API 35, IANA zone `Asia/Singapore`
- **Data:** Firebase Auth and Firestore Emulators only; synthetic account and 22 synthetic owner records

## Functional Android run

The physical Android integration test passed with `S3_HISTORY_ANDROID_PASS` for the device's local date `2026-10-12`. Five successful API reads covered the first page (20 records), next page (2 records), reload, the previous day's empty result, and return to today. The test used an Auth Emulator ID token obtained over an ADB reverse tunnel and sent it through the Android UI flow to the local backend, which verified the token and read the Firestore Emulator. This specifically validates the real-device network path; it does not claim to exercise the FlutterFire native sign-in plugin in this run.

The host-side readback passed with `ownerRows=22`; all synthetic records remained unchanged. The feature flow performed reads only. An API 36 emulator run also passed the same five-read and 22-row readback checks.

## Build and local checks

- Debug APK built successfully with the isolated `.historytest` application ID and was installed with standard `adb install -r`.
- `flutter analyze`: passed with no issues.
- `test/features/check_in_history_controller_test.dart`: 4/4 passed.
- Dart formatting, `node --check tool/run_check_in_history_emulators.mjs`, and `git diff --check`: passed.

## Remaining evidence

- Screenshot capture: **Not Run**. A subsequent Flutter-driven reinstall reaches the vivo package-interception screen and requires the device owner's identity verification. The app was not installed through that pending prompt, and no screenshots are claimed. Continue after the owner completes the on-device verification.
- Accessibility-specific evidence: **Not Run — Deferred by S-SPONSOR-0910-RMVP01A-A11Y-DEFER**.
- UAT and Release: **Not Run**. No release, deployment, production API, or real user data was accessed.
- PR remains Draft/Open; no merge, Issue state, or project board change was made.

