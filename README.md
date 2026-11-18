# ENMORI

ENMORI is a social journal for Android. Record a mood or a note in a Check-in and revisit it in Calendar or Footprint. Browse events in Singapore, mark them as Interested or Going, and find them again in My plans. You can add friends by username and choose which Check-ins to include in an AI companion conversation.

## Install on Android

**[Download ENMORI 1.0.0 for Android (build 90)](https://github.com/3427564237/enmori-app/releases/download/v1.0.0/ENMORI-v90-release.apk)**

1. On a device running Android 7.0 (API 24) or later, sign in to GitHub with an account that has access to this repository and download the APK.
2. Open the file and follow Android’s installation prompt. If prompted, allow the browser or file manager that opened the APK to install apps.
3. If you already have build 88, open the new APK and choose **Update**. Installing over build 88 preserved the signed-in session in the Android emulator.

The signed package is `com.enmori.app.group`. The SHA-256 checksum for `ENMORI-v90-release.apk` is `d1d04ddbe2c8861f662d795648578dcb1c034002fa33c268dc26f23ef5e5a6e0`.

Build 90 fixes profile edits that could erase a previously saved region, keeps the Save action accessible when the landscape keyboard is open, and prevents late search results from replacing the event list after a query is cleared. The release was tested on an Android emulator against the deployed v91 backend. Physical-device, TalkBack and extended-use checks are still open for this build. [Release notes](https://github.com/3427564237/enmori-app/releases/tag/v1.0.0) · [Verification record (Chinese)](docs/evidence/2026-11-18-android-release/README.md)

## Develop locally

Use Git, FVM and JDK 17 through 25. FVM pins Flutter 3.47.2 and Dart 3.13.2. Android development also requires the Android Command-line Tools and the SDK packages declared by the repository. For iOS development, use Xcode and CocoaPods on macOS. [Development environment guide](docs/tooling/development-environment.md)

From the repository root, install the pinned SDK and check your environment.

```sh
fvm install
fvm flutter pub get
fvm dart run tool/check_environment.dart
fvm flutter doctor -v
```

Run the Flutter checks, then launch the offline social demo on a connected Android device or emulator.

```sh
fvm flutter analyze
fvm flutter test
fvm flutter run --target lib/social_offline_harness.dart
```

The main app entry point is `lib/main.dart`. A connected development build uses the team’s Firebase and backend configuration. The default Android application ID and iOS bundle identifier are both `com.enmori.app`.

The TypeScript backend uses Node.js 24.19.0 and pnpm 11.19.0. From the repository root, install dependencies and run its build and tests. [Backend setup](backend/README.md)

```sh
pnpm install --frozen-lockfile
pnpm backend:verify
```

## Team tooling

Use the repository’s Codex Skills in `.agents/skills/`. Codex discovers them from the checkout. When a personal Skill has the same name, select the repository copy. [Skill routing rules](docs/tooling/skill-routing.md) · [Skill inventory](docs/tooling/skills-inventory.md) · [Pinned sources and licences](team-skills.lock)

Project MCP endpoints are configured in `.codex/config.toml`. If you use Context7 or Figma, authenticate on your own workstation. Restart Codex after setup and verify access with a read-only call. Keep tokens, OAuth state, signing material and machine-specific configuration local.
