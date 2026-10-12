# DU Check-in History Android Evidence

- **Last rerun:** 2026-10-13
- **Scope:** Issue #82, owner Check-in History / Footprint read and paging
- **Device:** Vivo V2243A, Android API 35, IANA zone `Asia/Singapore`
- **Data:** Firebase Auth and Firestore Emulators only; synthetic account and 22 synthetic owner records

## Functional Android run

The physical Android integration test passed on 2026-10-13 with `S3_HISTORY_ANDROID_PASS` for the device's local date `2026-10-13`. Five successful API reads covered the first page (20 records), next page (2 records), reload, the previous day's empty result, and return to today. The test used an Auth Emulator ID token obtained over an ADB reverse tunnel and sent it through the Android UI flow to the local backend, which verified the token and read the Firestore Emulator. This validates the real-device network path; it does not claim to exercise the FlutterFire native sign-in plugin in this run.

The host-side readback passed with `ownerRows=22`; all synthetic records remained unchanged. The feature flow performed reads only. Existing API 36 emulator evidence remains from the earlier run; the 2026-10-13 rerun used the physical API 35 device.

## Build and local checks

- Debug APK built and installed successfully with the isolated `com.enmori.app.historytest` application ID; APK metadata reports `minSdkVersionForDexing=24`.
- APK SHA-256: `863FC5087C26DA1B0E97CCCEE5CF99453332F6F422B882E3C48785046D16CD6C`.
- `flutter analyze`: passed with no issues.
- Full Flutter test suite: 161/161 passed.
- Backend TypeScript build and test suite: 323/323 passed on the pinned Node 24.19 runtime.
- `node --check tool/run_check_in_history_emulators.mjs` and `git diff --check`: passed.

Three captured screens show the first page, second page, and selected-date empty state:

- [First page](2026-10-13-du-history-first-page.png)
- [Next page](2026-10-13-du-history-next-page.png)
- [Previous-day empty state](2026-10-13-du-history-empty-day.png)

## Remaining evidence

- Android API 24/25 runtime execution: **Not Run**. The tested device was API 35; compatibility was addressed by replacing `java.time` usage with API-24-compatible `java.util`/`java.text` APIs and retaining `minSdk=24`.
- Accessibility-specific evidence: **Not Run — Deferred by S-SPONSOR-0910-RMVP01A-A11Y-DEFER**.
- UAT and Release: **Not Run**. No release, deployment, production API, or real user data was accessed.
- PR remains Draft/Open; no merge, Issue state, or project board change was made.

