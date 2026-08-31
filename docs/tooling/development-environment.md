# ENMORI Development Environment

This guide defines the shared Flutter and Android command-line environment for Linux, Windows, and macOS. The repository owns version contracts; each developer owns local SDK paths, license acceptance, and platform tooling.

## Version contract

| Component | Required version |
| --- | --- |
| Flutter | Exactly `3.47.2`, selected by FVM |
| Dart | Exactly `3.13.2`, bundled with Flutter |
| Gradle | Exactly `9.3.1` |
| Android Gradle Plugin | Exactly `9.1.0`, from the Flutter 3.47.2 generated template |
| Kotlin Android plugin | Exactly `2.4.0` |
| Android compile/target SDK | API 36 |
| Android minimum SDK | API 24 |
| Android Build Tools | `36.0.0` |
| Android NDK | `28.2.13676358` |
| Java runtime for Gradle | JDK 17 through JDK 25 |
| Java/Kotlin bytecode target | Java 17 / JVM 17 |

FVM itself is host-managed; the bootstrap workstation currently uses FVM 4.3.0. Do not substitute an Arch/AUR or other globally installed Flutter SDK for project commands.

## Common setup

Install Git, FVM, and a compatible JDK using the normal mechanism for your operating system. From the repository root, run:

```sh
fvm install
fvm flutter pub get
fvm dart run tool/check_environment.dart
```

The checker requires Flutter and Android readiness on Linux, Windows, and macOS. Under its default policy, missing Xcode or CocoaPods on macOS is reported as a warning and does not fail otherwise valid Flutter/Android work. A future target-specific mode may tighten that policy.

## Android Command-line Tools and packages

Download Android Command-line Tools only from the [official Android Studio download page](https://developer.android.com/studio). Read and accept the terms shown for the download yourself; an agent or script must not accept them for you.

Install the archive using Google's `cmdline-tools/latest` directory layout. The exact application build packages are declared in `tool/android-sdk-packages.txt`:

```text
platform-tools
platforms;android-36
build-tools;36.0.0
ndk;28.2.13676358
```

After installing Command-line Tools, review package licenses interactively:

```sh
<sdk-root>/cmdline-tools/latest/bin/sdkmanager --licenses --sdk_root=<sdk-root>
```

Enter every response yourself. Never automate this command with `yes`, redirected input, or an agent-generated response. After acceptance, install the manifest using the [official `sdkmanager` package-file interface](https://developer.android.com/tools/sdkmanager):

```sh
<sdk-root>/cmdline-tools/latest/bin/sdkmanager --sdk_root=<sdk-root> --package_file=<repository-root>/tool/android-sdk-packages.txt
```

Recent Command-line Tools releases may print a deprecation notice recommending the newer `android sdk` command. This baseline retains `sdkmanager` because its interactive `--licenses` and `--package_file` behavior has been verified for the current setup. Treat migration to `android sdk` as a separate tooling-contract change: verify equivalent license and manifest behavior, then update this guide and the checker together.

The manifest intentionally contains no emulator or system image. Use a physical Android device for initial development; emulator and AVD setup are outside this phase.

## Linux

The conventional per-user SDK root is `$HOME/Android/Sdk`. Example commands after installing Command-line Tools there are:

```sh
"$HOME/Android/Sdk/cmdline-tools/latest/bin/sdkmanager" --licenses --sdk_root="$HOME/Android/Sdk"
"$HOME/Android/Sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/Android/Sdk" --package_file="$PWD/tool/android-sdk-packages.txt"
fvm flutter config --android-sdk "$HOME/Android/Sdk"
```

No shell startup-file edit is required. A distribution-provided `adb` may remain installed; compare it with the SDK-managed copy if command resolution becomes ambiguous.

## Windows

The conventional SDK root is `%LOCALAPPDATA%\Android\Sdk`. In PowerShell, from the repository root:

```powershell
$enmoriSdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
& "$enmoriSdkRoot\cmdline-tools\latest\bin\sdkmanager.bat" --licenses --sdk_root="$enmoriSdkRoot"
& "$enmoriSdkRoot\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="$enmoriSdkRoot" --package_file="$PWD\tool\android-sdk-packages.txt"
fvm flutter config --android-sdk "$enmoriSdkRoot"
```

USB device drivers remain host-managed. Do not commit a Windows SDK path or generated `local.properties` file.

## macOS

The conventional Android SDK root is `$HOME/Library/Android/sdk`. Example commands are:

```sh
"$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" --licenses --sdk_root="$HOME/Library/Android/sdk"
"$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/Library/Android/sdk" --package_file="$PWD/tool/android-sdk-packages.txt"
fvm flutter config --android-sdk "$HOME/Library/Android/sdk"
```

Before iOS implementation is considered ready, record and verify:

```sh
xcodebuild -version
pod --version
fvm flutter build ios --no-codesign
```

The default checker treats missing Xcode or CocoaPods as warning-only because Android work remains valid. This does not claim that the host is ready to build iOS.

## VS Code

Install the Dart and Flutter extensions. The committed `.vscode/settings.json` points `dart.flutterSdkPath` to `.fvm/flutter_sdk`, so the editor, analyzer, and debugger use the pinned SDK. Do not override the workspace with a global Flutter SDK path.

Context7 and other project MCP services are separate from the application toolchain. Developers authenticate those services locally; credentials never belong in VS Code workspace settings or repository files.

## Verification

Run these commands from the repository root:

```sh
fvm dart run tool/check_environment.dart
fvm flutter doctor -v
fvm flutter pub get
fvm flutter analyze
fvm flutter test
fvm flutter build apk --debug
```

The final command produces `build/app/outputs/flutter-apk/app-debug.apk` using the standard local debug signing configuration. Release signing is outside this phase.

On a physical Android device, enable developer options and USB debugging, connect it, then verify discovery with:

```sh
fvm flutter devices
```

## Troubleshooting

The checker searches for the Android SDK in this order:

1. the SDK registered by `fvm flutter config --android-sdk`;
2. `ANDROID_HOME`;
3. `ANDROID_SDK_ROOT`;
4. the standard SDK path for the current operating system.

If the system and SDK-managed `adb` commands behave differently, compare them before editing `PATH`:

```sh
adb version
<sdk-root>/platform-tools/adb version
```

JDK 17 through JDK 25 is valid for the pinned Gradle wrapper; application bytecode remains targeted at Java/JVM 17. Do not replace JDK 25 pre-emptively. Capture the exact Gradle or AGP failure first.

If an SDK package is unavailable or the build proposes changing Flutter-generated Gradle/plugin versions, stop and verify the official repository and pinned project contract. Do not silently upgrade or downgrade Flutter, Gradle, AGP, Kotlin, API, Build Tools, or NDK versions.

## Never commit

Keep all of the following machine-local:

- absolute SDK and JDK paths;
- `android/local.properties`;
- accepted Android license files;
- `.fvm`, Dart, Gradle, and Android SDK caches;
- credentials, tokens, service-account files, and MCP authentication;
- keystores, signing profiles, and provisioning material;
- generated build artifacts.
