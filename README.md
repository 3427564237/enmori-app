# ENMORI

<img src="assets/branding/messenger-bird.png" alt="ENMORI's messenger bird" width="96" height="96">

ENMORI is a social journal for Android. Record a mood or a note in a Check-in and revisit it in Calendar or Footprint. Browse events in Singapore, mark them as Interested or Going, and find them again in My plans. You can add friends by username and choose which Check-ins to include in an AI companion conversation.

## Install on Android

**[Download ENMORI 1.0.0 for Android (build 92)](https://github.com/3427564237/enmori-app/releases/download/v1.0.0/ENMORI-v92-release.apk)**

1. Download the APK to a device running Android 7.0 (API 24) or later.
2. Open the file and follow Android’s installation prompt. If prompted, allow the browser or file manager that opened the APK to install apps.
3. If you already have build 90, open the new APK and choose **Update** to keep the existing installation and its data.

The signed package is `com.enmori.app.group`. The SHA-256 checksum for `ENMORI-v92-release.apk` is `b55693cad40716290a42dabcad67293c70c541e2b7b1a61bcbc3efcaf0b75168`.

Build 92 brings the messenger bird to the Android launcher and splash screen. It includes the build 90 fixes for saved profile regions, profile forms with a landscape keyboard, and late event search results. [Release notes](https://github.com/3427564237/enmori-app/releases/tag/v1.0.0) · [Screenshots and verification (Chinese)](docs/evidence/2026-11-18-android-release/README.md#android-100-构建-92)

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
