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

Repository-scoped Codex Skills live in `.agents/skills` and are discovered from the cloned repository; do not copy them into each member's personal Skill directory. Use only the smallest set selected by [the routing rules](docs/tooling/skill-routing.md). The [Skill inventory](docs/tooling/skills-inventory.md) describes the shared and excluded set, and [`team-skills.lock`](team-skills.lock) pins third-party source commits, licences, local modifications, and verification. Codex may show both repository and personal Skills when they have the same declared name; they are not merged. In this repository, select the copy whose displayed path is under this checkout's `.agents/skills/`. Personal copies are not team-controlled sources.

Required project MCP endpoints may be declared in `.codex/config.toml`, but authentication is per developer and local. Never share or commit tokens, OAuth state, service-account files, or machine-specific configuration. Context7 and Figma users must complete any required authentication on their own workstation. Restart Codex after cloning this change or completing local authentication so repository Skills and MCP state are rediscovered; verify access with a harmless live call rather than printing a credential.
