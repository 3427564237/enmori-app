# ENMORI Project Bootstrap Design

## Purpose

Initialize ENMORI as a standard Flutter mobile application and establish a reproducible, cross-platform Flutter toolchain before feature development begins.

## Project identity

- Flutter package name: `enmori`
- Android application ID: `com.enmori.app`
- iOS bundle identifier: `com.enmori.app`
- Project root: the existing repository root
- Generated platforms: Android and iOS only
- Feature development is outside this bootstrap scope.

## Flutter toolchain

- FVM is the only project-level Flutter version manager.
- The project baseline is Flutter `3.47.2`, the official stable release current when this design was approved.
- The corresponding bundled Dart SDK is `3.13.2`.
- `.fvmrc` must contain the exact Flutter version `3.47.2`; it must not contain the moving alias `stable`.
- `.fvmrc` is committed so Linux, Windows, and macOS developers select the same Flutter SDK.
- `.fvm/` is ignored because it contains machine-local links and metadata.
- Project Flutter and Dart commands use `fvm flutter ...` and `fvm dart ...`.
- The project must not depend on an Arch or AUR Flutter package.
- Android SDK, JDK, Xcode, CocoaPods, device drivers, and IDEs remain platform-managed system dependencies.

FVM itself is a developer tool rather than a repository dependency. On this Linux workstation it will be installed using the current FVM project's documented standalone installer, without first installing a system Flutter SDK. Other developers may use the supported FVM installation method for their operating system.

## Repository shape

Flutter will generate its normal application skeleton directly in the repository root with `flutter create --platforms=android,ios --org com.enmori --project-name enmori .`. The existing `.git` directory must be preserved.

Flutter derives the initial native identifiers from the organization and project name, so this command initially produces `com.enmori.enmori`. Bootstrap must then change only the generated native identifier settings:

- Android `namespace` and `applicationId` become `com.enmori.app`.
- iOS Runner `PRODUCT_BUNDLE_IDENTIFIER` values become `com.enmori.app`; generated test-host identifiers may retain their normal suffixes derived from this base identifier.

The Dart package and project name remain `enmori`. Bootstrap must not rename them to `app` as a shortcut for obtaining the native identifier.

The generated starter counter application and its starter widget test are retained only as a smoke-testable baseline. No product architecture, state-management library, backend integration, or UI design is chosen during bootstrap.

The repository will additionally contain:

- `.fvmrc` for the exact Flutter SDK version.
- `.gitignore` rules for FVM's machine-local directory.
- `pubspec.lock` containing the resolved application dependency graph; it is committed and must not be ignored.
- `README.md` onboarding commands that consistently use FVM.
- `docs/superpowers/` bootstrap design and execution records.

## Skill installation policy

Skills are installed into the user's Codex skill directory, not copied into the Flutter repository. Installation is split into two groups:

1. Project definition and governance: project context, requirements engineering, architecture, data modeling, testing strategy, Scrum planning, privacy/security, and consistency review.
2. Flutter delivery: Flutter architecture and patterns, responsive layout, layout diagnosis, animation, Dart unit tests, widget tests, integration tests, Flutter/Dart review, and systematic debugging.

Each requested third-party Skill must be resolved to a specific public repository and inspected for a valid `SKILL.md` before installation. Exact-name matches from a trusted upstream source are preferred. Already installed Skills are reused. A Skill with no verifiable exact source is reported as unresolved rather than replaced by a merely similar Skill. Installing Skills does not make them all active in every task; later prompts select only the smallest relevant set.

## Failure handling

- If the FVM installer or Flutter SDK download fails, leave the Git repository intact and report the failed stage and command.
- If FVM resolves a different release for the moving `stable` alias, do not silently change the approved baseline; install `3.47.2` explicitly.
- If Flutter generation encounters an existing path, inspect it before deciding whether to preserve or replace it.
- Do not edit shell startup files without explicit approval. Verification may invoke FVM by its absolute installed path in the current session.
- Do not install Android SDK, JDK, Xcode, CocoaPods, or IDE packages as part of this bootstrap.
- Do not install unverifiable Skills.

## Verification

Bootstrap succeeds when all of the following hold:

- FVM reports its installed version.
- `fvm flutter --version` reports Flutter `3.47.2` and Dart `3.13.2`.
- `.fvmrc` pins Flutter `3.47.2`.
- `fvm flutter pub get` succeeds.
- `pubspec.lock` exists, is tracked by Git, and remains unchanged after a second `fvm flutter pub get`.
- `fvm flutter analyze` succeeds.
- `fvm flutter test` succeeds.
- Android `namespace` and `applicationId` are exactly `com.enmori.app`.
- iOS Runner build configurations use `com.enmori.app` as their base product bundle identifier.
- No production identifier remains as the generated `com.enmori.enmori` value.
- `git status` shows no Flutter SDK cache under version control.
- Every requested Skill is classified as installed, already available, or unresolved with its source status recorded.

`fvm flutter doctor -v` is diagnostic rather than a pass/fail gate: missing platform-managed dependencies are reported separately. A Linux workstation is not expected to validate an iOS/Xcode build.

## Sources checked at approval time

- Flutter release archive JSON listed Flutter `3.47.2` as the current stable Linux release on 2026-08-31.
- FVM documentation defines `.fvmrc` as the committed project version configuration, recommends ignoring `.fvm/`, and exposes Flutter commands through `fvm flutter`.
