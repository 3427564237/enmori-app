# ENMORI

Flutter project bootstrap for Android and iOS.

## Prerequisites

- Git
- FVM
- Platform tooling for the target OS (Android SDK and JDK; Xcode on macOS for iOS)

Do not use a globally installed Flutter SDK for this repository. The project SDK is pinned by FVM.

## Setup

```sh
git clone <repository-url>
cd ENMORI
fvm install
fvm flutter pub get
fvm flutter doctor -v
```

Use `fvm flutter` for all Flutter commands:

```sh
fvm flutter analyze
fvm flutter test
fvm flutter run
```

The project baseline is Flutter 3.47.2. Android uses application ID `com.enmori.app`, and iOS uses bundle identifier `com.enmori.app`.

## Team tooling

Repository-scoped Codex Skills live in `.agents/skills`. Required project MCP configuration lives in `.codex/config.toml`; each developer authenticates MCP services locally and must not commit credentials.
