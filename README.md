# ENMORI

Flutter project bootstrap for Android and iOS.

## Prerequisites

- Git
- FVM
- JDK 17 through JDK 25
- Android Command-line Tools and the SDK packages declared by the repository
- Xcode and CocoaPods on macOS when working on iOS

Do not use a globally installed Flutter SDK for this repository. The project SDK is pinned by FVM.

## Setup

```sh
fvm install
fvm flutter pub get
fvm dart run tool/check_environment.dart
```

See the [development environment guide](docs/tooling/development-environment.md) for the Linux, Windows, and macOS SDK setup, manual license steps, and troubleshooting. Use FVM for every Flutter and Dart command:

```sh
fvm flutter doctor -v
fvm flutter analyze
fvm flutter test
fvm flutter run
```

The project baseline is Flutter 3.47.2. Android uses application ID `com.enmori.app`, and iOS uses bundle identifier `com.enmori.app`.

## Team tooling

Repository-scoped Codex Skills live in `.agents/skills`. Required project MCP configuration lives in `.codex/config.toml`; each developer authenticates MCP services locally and must not commit credentials.
