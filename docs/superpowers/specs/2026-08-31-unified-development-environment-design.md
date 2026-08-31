# ENMORI Unified Development Environment Design

**Status:** Approved for documentation on 2026-08-31. Implementation requires the follow-on plan and a separate execution step.

## Goal

Provide a reproducible Flutter and Android command-line development environment for ENMORI across Linux, Windows, and macOS while keeping platform-managed tools outside the repository. The environment must be sufficient to analyze, test, and build the generated Android application without selecting application architecture, backend services, state management, dependencies, features, or UI behavior.

## Governing decisions

- FVM remains the only project-level Flutter version manager.
- Flutter remains pinned to `3.47.2`; Dart remains the bundled `3.13.2`.
- The Android environment uses Google's official command-line SDK tooling. Android Studio and an Android Emulator are not part of this phase.
- Android SDKs, JDKs, Xcode, CocoaPods, device drivers, and editors remain host-managed dependencies.
- The repository defines required versions and a cross-platform validation contract, but never commits a developer's absolute SDK path, credentials, accepted-license files, device configuration, or signing material.
- The current Linux workstation may continue using OpenJDK 25. No global `JAVA_HOME` is introduced unless an observed tool failure proves it is required.
- No missing Codex Skill is installed as part of this environment work. The current audited Skill set and the deferred decisions in `docs/tooling/skills-inventory.md` remain authoritative.

## Scope

### Included

- A repository-owned Android SDK package manifest.
- A cross-platform Dart environment checker invoked through FVM.
- Workspace-level VS Code selection of the FVM-managed Flutter SDK.
- Team onboarding for Linux, Windows, macOS, Android licenses, and iOS validation boundaries.
- Local installation of the official Android command-line SDK on the current Linux workstation.
- Registration of that SDK with the pinned Flutter toolchain.
- Analysis, unit/widget tests, Flutter doctor diagnostics, and an unsigned/debug Android APK build.

### Excluded

- Android Studio, Android Emulator, AVD images, and emulator acceleration setup.
- iOS/Xcode installation or validation on Linux.
- Release signing, keystores, Play Console, App Store, provisioning profiles, or CI signing.
- Firebase CLI/configuration, backend tooling, Ollama, Figma, GitHub, or Notion integration.
- Application architecture, packages, state management, backend topology, schemas, features, or UI decisions.
- Automatic acceptance of Android SDK license agreements.
- Creating or installing replacement Skills solely to fill names in the toolbox diagram.

## Environment model

The environment has three ownership layers:

1. **Repository-owned contracts**
   - `.fvmrc` selects the exact Flutter SDK.
   - the Gradle wrapper and generated Android plugin declarations select Gradle, AGP, and Kotlin plugin versions.
   - `tool/android-sdk-packages.txt` lists the Android packages needed by this baseline.
   - `tool/check_environment.dart` validates observable versions and required commands.
2. **Host-managed developer tools**
   - FVM itself, a compatible JDK, Android Command-line Tools, Xcode/CocoaPods on macOS, editors, USB drivers, and physical devices.
   - locations and installation mechanisms differ by operating system.
3. **Machine-local generated state**
   - `.fvm/`, `.dart_tool/`, Gradle caches, Android SDK contents, `android/local.properties`, accepted Android licenses, and device/AVD state.
   - none of this state is committed.

This split keeps build inputs reviewable without pretending that Linux, Windows, and macOS use identical filesystem layouts.

## Version contract

| Component | Contract | Source of contract |
| --- | --- | --- |
| FVM | Installed per developer; current bootstrap host uses `4.3.0` | Host-managed tool |
| Flutter | Exactly `3.47.2` | `.fvmrc` |
| Dart | Exactly `3.13.2`, bundled with Flutter | Flutter SDK |
| Gradle | Exactly `9.3.1` | `android/gradle/wrapper/gradle-wrapper.properties` |
| Android Gradle Plugin | Exactly `9.1.0` | `android/settings.gradle.kts` |
| Kotlin Android plugin | Exactly `2.4.0` | `android/settings.gradle.kts` |
| Android compile SDK | API 36 | Flutter 3.47.2 generated contract |
| Android target SDK | API 36 | Flutter 3.47.2 generated contract |
| Android minimum SDK | API 24 | Flutter 3.47.2 generated contract |
| Android Build Tools | `36.0.0` | AGP 9.1 compatibility baseline |
| Android NDK | `28.2.13676358` | Flutter 3.47.2 generated contract |
| Java runtime for Gradle | JDK 17 through JDK 25 for this wrapper; current host uses 25 | AGP minimum plus Gradle runtime compatibility |
| Java/Kotlin bytecode target | Java 17 / JVM 17 | `android/app/build.gradle.kts` |

AGP 9.1 requires Gradle 9.3.1, SDK Build Tools 36.0.0, and at least JDK 17. Gradle 9.3.1 can run on Java 25, so the current OpenJDK 25 installation does not need to be replaced. See the [AGP 9.1 compatibility table](https://developer.android.com/build/releases/agp-9-1-0-release-notes) and [Gradle Java compatibility matrix](https://docs.gradle.org/9.3.1/userguide/compatibility.html).

The Android Command-line Tools package and `platform-tools` are host-managed moving tools: their exact revisions are not application build inputs and are not pinned in Git. The checker records their observed versions where available. API, Build Tools, and NDK packages remain exact.

## Repository artifacts

### Android SDK package manifest

`tool/android-sdk-packages.txt` contains one SDK-style package path per line:

```text
platform-tools
platforms;android-36
build-tools;36.0.0
ndk;28.2.13676358
```

It is consumed with `sdkmanager --package_file=<path> --sdk_root=<host-sdk-root>`. The package manifest does not include an emulator or system image. The command format follows the [official sdkmanager contract](https://developer.android.com/tools/sdkmanager).

### Cross-platform environment checker

`tool/check_environment.dart` uses only the Dart standard library and is invoked as:

```sh
fvm dart run tool/check_environment.dart
```

It must:

- run on Linux, Windows, and macOS;
- locate the repository root without depending on the caller's current subdirectory;
- parse `.fvmrc` and verify Flutter `3.47.2` and Dart `3.13.2` through FVM;
- inspect `java -version` and require a supported JDK runtime for the pinned Gradle wrapper;
- detect the Android SDK from Flutter configuration, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or standard host paths without writing any configuration;
- verify API 36, Build Tools 36.0.0, and NDK 28.2.13676358 directories;
- report `adb` and `sdkmanager` availability when present;
- on macOS, report whether `xcodebuild` and CocoaPods are available, without failing Android-only work because iOS signing is unavailable;
- distinguish required failures, target-specific warnings, and informational observations;
- never print environment-variable values that may contain credentials;
- exit non-zero only when a required project contract for the selected host target is violated.

The first implementation may default to validating Flutter plus Android on Linux/Windows and Flutter plus Android/iOS prerequisites on macOS. Optional flags may narrow the target later, but the initial script must not introduce a general task runner or package dependency.

### VS Code workspace settings

`.vscode/settings.json` points `dart.flutterSdkPath` at `.fvm/flutter_sdk`. This makes the editor, analyzer, debugger, and integrated terminal use the same Flutter SDK selected by FVM. It contains no user-specific absolute path. Dart Code treats an explicitly configured workspace Flutter SDK as the highest-priority SDK location; see [Dart Code SDK discovery](https://dartcode.org/docs/sdk-locating/).

No unrelated formatting, theme, extension, Java language-server, or UI setting is added.

### Team documentation

`docs/tooling/development-environment.md` provides:

- the version contract;
- official FVM and Android Command-line Tools installation boundaries;
- Linux, Windows, and macOS SDK-root examples;
- manual Android license acceptance;
- physical-device setup as the initial Android run target;
- macOS-only Xcode/CocoaPods and unsigned iOS build verification;
- standard setup and diagnostic commands;
- a rule that local paths, credentials, licenses, and signing files remain untracked.

`README.md` receives only a short link and the common setup/check commands. Detailed platform instructions live in the tooling document to avoid duplicating and drifting instructions.

## Current Linux workstation installation

The current host uses a per-user SDK at `/home/miku/Android/Sdk`. This is a local choice, not a path imposed on teammates.

Implementation will:

1. Download the official stable Android Command-line Tools artifact or installer without piping it directly into a shell.
2. Record its download URL and checksum in the execution evidence.
3. Inspect the installer/archive layout before execution or extraction.
4. Install Command-line Tools under the selected SDK root using the official `cmdline-tools/latest` directory structure.
5. Ask the user to accept Android SDK licenses interactively; Codex must not synthesize license acceptance.
6. Install the package manifest with `sdkmanager`.
7. Register the SDK with the FVM-managed Flutter SDK using `fvm flutter config --android-sdk /home/miku/Android/Sdk`.
8. Allow Flutter/Gradle to generate ignored `android/local.properties`; never commit it.

The existing Arch `android-tools` package may remain installed. The SDK-managed `platform-tools` copy is part of the coherent SDK root; command resolution and `flutter doctor` output will be inspected so two `adb` installations do not silently produce incompatible server/client behavior.

No shell startup file is changed during the first implementation. If persistent `ANDROID_HOME` or PATH changes prove necessary for a developer workflow, they require a separate, explicit decision based on observed failure. Android documents `ANDROID_HOME` as a common SDK locator, but Flutter's registered SDK path and explicit `--sdk_root` are sufficient for the planned commands; see [Android environment variables](https://developer.android.com/tools/variables).

## License and secret handling

- Android SDK license text must be displayed and accepted by the developer who is bound by it.
- License files under the Android SDK remain machine-local.
- The environment checker never accepts licenses or modifies SDK state.
- No Android, Firebase, GitHub, Figma, Notion, Context7, signing, or model-runtime token enters the repository.
- `android/local.properties`, keystores, service-account files, OAuth material, and platform signing profiles remain untracked.

## Verification

### Repository contract

- `.fvmrc` contains Flutter 3.47.2.
- Gradle, AGP, Kotlin, SDK, Build Tools, NDK, and bytecode targets match the version table.
- the package manifest parses as four non-empty package IDs with no duplicates.
- the environment checker passes its own focused tests or fixture-based command-output checks.
- `.vscode/settings.json` parses as JSON and contains only the approved FVM SDK selection.
- no absolute developer path or secret is introduced in tracked files.

### Flutter and Android gates

```sh
fvm dart run tool/check_environment.dart
fvm flutter doctor -v
fvm flutter pub get
fvm flutter analyze
fvm flutter test
fvm flutter build apk --debug
```

The final APK must be produced from the standard generated application using application ID `com.enmori.app`. Building the APK is an environment verification step, not feature implementation.

### Cross-platform gates

- A Windows teammate must be able to run the same FVM, checker, analyze, test, and debug APK commands with a Windows-local SDK root.
- A macOS teammate must run the same Flutter checks and additionally record `xcodebuild -version`, CocoaPods availability, and `fvm flutter build ios --no-codesign` before iOS implementation is considered ready.
- Lack of Xcode on Linux is informational, not a failure.
- Chrome and Linux desktop diagnostics are irrelevant because the project targets only Android and iOS.

## Failure handling

- If the official Command-line Tools download or checksum cannot be verified, stop before extraction.
- If license acceptance is incomplete, stop before installing licensed packages and hand the prompt to the user.
- If JDK 25 fails despite the documented Gradle compatibility, capture the exact Gradle/AGP failure before considering JDK 17; do not downgrade pre-emptively.
- If an SDK package is unavailable, confirm the official repository listing and the pinned Flutter/AGP contract before changing a version.
- If the system and SDK copies of `adb` conflict, select one coherent copy only after comparing their versions and Flutter's detected SDK root.
- If Android build verification proposes changing generated Gradle/plugin versions, stop and report the conflict rather than silently upgrading the project.
- Existing unrelated or untracked user files remain untouched and are excluded from environment commits.

## Completion criteria

This design is complete when:

- the repository contains a reviewed, platform-neutral environment contract;
- the current Linux workstation has the official command-line Android SDK packages needed by Flutter 3.47.2;
- the environment checker reports the pinned Flutter/Dart/Android/JDK contract accurately;
- analysis, tests, and debug APK build pass;
- Android SDK licenses were accepted by the user rather than automated;
- Git contains no SDK, cache, local path, credential, signing material, or unrelated user document;
- no application architecture, backend, state-management, feature, or UI decision was introduced.
