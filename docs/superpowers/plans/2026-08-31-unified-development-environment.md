# Unified Development Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a repository-checked Flutter/Android command-line environment, install the required official Android SDK components on the current Linux workstation, and prove the generated application can produce a debug APK.

**Architecture:** Repository files declare exact application build inputs and provide a Dart-only cross-platform checker; each operating system owns the physical SDK/JDK installation and local paths. The checker separates required Flutter/Android failures from warning-only macOS iOS readiness, while host installation uses Google's official archive and interactive user license acceptance.

**Tech Stack:** FVM 4.3.0, Flutter 3.47.2, Dart 3.13.2, Android Command-line Tools 15859902, Android API 36, Build Tools 36.0.0, NDK 28.2.13676358, Gradle 9.3.1, AGP 9.1.0 from the Flutter 3.47.2 template, Kotlin 2.4.0, OpenJDK 25 with Java/JVM target 17.

**Spec:** `docs/superpowers/specs/2026-08-31-unified-development-environment-design.md`

## Global Constraints

- Do not modify application architecture, backend, data model, state management, dependencies, features, or UI.
- Do not install Android Studio, an Emulator, an AVD, a system image, or release-signing tools.
- Do not install any additional Codex Skill during this plan.
- Use FVM for every Flutter or Dart command; do not use an Arch/AUR Flutter SDK.
- Keep Flutter exactly 3.47.2 and Dart exactly 3.13.2.
- Keep Gradle 9.3.1, AGP 9.1.0, Kotlin 2.4.0, API 36, Build Tools 36.0.0, NDK 28.2.13676358, and Java/JVM bytecode target 17.
- Keep Android SDK paths, `android/local.properties`, license files, caches, credentials, keystores, and signing material untracked.
- Do not edit shell startup files or set a global `JAVA_HOME`.
- The user, not Codex, accepts the Android SDK download terms and any `sdkmanager --licenses` prompts.
- Preserve and exclude the user's currently untracked `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/OPEN_QUESTIONS.md`, and `docs/SOURCE_MAP.md` from every environment commit.

## File map

- `tool/android-sdk-packages.txt`: exact SDK-style package IDs consumed by `sdkmanager`.
- `.vscode/settings.json`: selects the project-local FVM Flutter SDK and nothing else.
- `tool/src/environment_check.dart`: testable policy, version parsing, SDK discovery, package-path checks, command execution abstraction, and report model.
- `tool/check_environment.dart`: minimal command-line entrypoint that prints results and sets the process exit code.
- `test/tool/environment_check_test.dart`: unit tests for platform policy, version parsing, SDK precedence, package discovery, and exit semantics.
- `docs/tooling/development-environment.md`: cross-platform setup, legal/manual steps, version contract, troubleshooting, and verification.
- `README.md`: short common onboarding commands and link to the detailed tooling guide.
- `docs/superpowers/specs/2026-08-31-unified-development-environment-design.md`: correct the download-license ordering discovered during planning.

---

### Task 1: Commit the Android SDK and editor contracts

**Files:**
- Create: `tool/android-sdk-packages.txt`
- Create: `.vscode/settings.json`
- Verify: `.fvmrc`
- Verify: `android/settings.gradle.kts`
- Verify: `android/gradle/wrapper/gradle-wrapper.properties`
- Verify: `android/app/build.gradle.kts`

**Interfaces:**
- Consumes: the exact version table in the approved spec.
- Produces: four newline-separated SDK package IDs and a VS Code workspace SDK path used by all later tasks.

- [ ] **Step 1: Add a failing contract check for the files that do not exist yet**

Run:

```bash
python -c 'from pathlib import Path; assert Path("tool/android-sdk-packages.txt").read_text().splitlines() == ["platform-tools", "platforms;android-36", "build-tools;36.0.0", "ndk;28.2.13676358"]; assert __import__("json").loads(Path(".vscode/settings.json").read_text()) == {"dart.flutterSdkPath": ".fvm/flutter_sdk"}'
```

Expected: FAIL because `tool/android-sdk-packages.txt` and `.vscode/settings.json` do not exist.

- [ ] **Step 2: Create the exact package manifest**

Create `tool/android-sdk-packages.txt` with exactly:

```text
platform-tools
platforms;android-36
build-tools;36.0.0
ndk;28.2.13676358
```

- [ ] **Step 3: Create the minimal VS Code workspace setting**

Create `.vscode/settings.json` with exactly:

```json
{
  "dart.flutterSdkPath": ".fvm/flutter_sdk"
}
```

- [ ] **Step 4: Run the contract check and existing-version assertions**

Run:

```bash
python -c 'from pathlib import Path; import json; assert Path("tool/android-sdk-packages.txt").read_text().splitlines() == ["platform-tools", "platforms;android-36", "build-tools;36.0.0", "ndk;28.2.13676358"]; assert json.loads(Path(".vscode/settings.json").read_text()) == {"dart.flutterSdkPath": ".fvm/flutter_sdk"}; assert json.loads(Path(".fvmrc").read_text())["flutter"] == "3.47.2"'
rg -n 'gradle-9\.3\.1-all\.zip' android/gradle/wrapper/gradle-wrapper.properties
rg -n 'com\.android\.application.*9\.1\.0|org\.jetbrains\.kotlin\.android.*2\.4\.0' android/settings.gradle.kts
rg -n 'JavaVersion\.VERSION_17|JvmTarget\.JVM_17' android/app/build.gradle.kts
```

Expected: all commands exit 0 and show only the approved versions.

- [ ] **Step 5: Commit the contract files only**

```bash
git add tool/android-sdk-packages.txt .vscode/settings.json
git commit -m "chore: declare Android SDK environment contract"
```

Expected: the four unrelated user documents remain untracked.

---

### Task 2: Define the environment checker's behavior with tests

**Files:**
- Create: `test/tool/environment_check_test.dart`
- Create: `tool/src/environment_check.dart`

**Interfaces:**
- Consumes: package IDs from `tool/android-sdk-packages.txt`; host name strings `linux`, `windows`, and `macos`.
- Produces:
  - `enum RequirementLevel { required, warning, informational }`
  - `final class CheckResult`
  - `final class ValidationPolicy`
  - `final class CommandOutput`
  - `typedef CommandRunner`
  - `typedef DirectoryExists`
  - `ValidationPolicy policyForHost(String host)`
  - `int? parseJavaMajor(String output)`
  - `String? parseFlutterVersion(String output)`
  - `String? parseDartVersion(String output)`
  - `String? parseConfiguredAndroidSdk(String output)`
  - `String? chooseAndroidSdk(...)`
  - `List<String> missingAndroidPackages(...)`
  - `int resultExitCode(Iterable<CheckResult> results)`

- [ ] **Step 1: Write failing policy and version-parser tests**

Create `test/tool/environment_check_test.dart` beginning with:

```dart
import 'package:flutter_test/flutter_test.dart';

import '../../tool/src/environment_check.dart';

void main() {
  group('default validation policy', () {
    test('requires Flutter and Android on Linux and Windows', () {
      for (final host in ['linux', 'windows']) {
        final policy = policyForHost(host);
        expect(policy.flutter, RequirementLevel.required);
        expect(policy.android, RequirementLevel.required);
        expect(policy.ios, RequirementLevel.informational);
      }
    });

    test('treats iOS prerequisites as warning-only on macOS', () {
      final policy = policyForHost('macos');
      expect(policy.flutter, RequirementLevel.required);
      expect(policy.android, RequirementLevel.required);
      expect(policy.ios, RequirementLevel.warning);
    });
  });

  group('version parsing', () {
    test('parses the approved Flutter and Dart versions', () {
      const output = 'Flutter 3.47.2 • channel stable\n'
          'Tools • Dart 3.13.2 • DevTools 2.60.0';
      expect(parseFlutterVersion(output), '3.47.2');
      expect(parseDartVersion(output), '3.13.2');
    });

    test('parses current and legacy Java version formats', () {
      expect(parseJavaMajor('openjdk version "25.0.4.1"'), 25);
      expect(parseJavaMajor('java version "17.0.12"'), 17);
      expect(parseJavaMajor('java version "1.8.0_402"'), 8);
      expect(parseJavaMajor('not a Java version'), isNull);
    });
  });
}
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
fvm flutter test test/tool/environment_check_test.dart
```

Expected: FAIL because `tool/src/environment_check.dart` does not exist.

- [ ] **Step 3: Implement the minimum policy and parsers**

Create `tool/src/environment_check.dart` with immutable value objects and these exact behaviors:

```dart
import 'dart:io';

enum RequirementLevel { required, warning, informational }

final class ValidationPolicy {
  const ValidationPolicy({
    required this.flutter,
    required this.android,
    required this.ios,
  });

  final RequirementLevel flutter;
  final RequirementLevel android;
  final RequirementLevel ios;
}

ValidationPolicy policyForHost(String host) => switch (host) {
      'macos' => const ValidationPolicy(
          flutter: RequirementLevel.required,
          android: RequirementLevel.required,
          ios: RequirementLevel.warning,
        ),
      'linux' || 'windows' => const ValidationPolicy(
          flutter: RequirementLevel.required,
          android: RequirementLevel.required,
          ios: RequirementLevel.informational,
        ),
      _ => throw ArgumentError.value(host, 'host', 'unsupported host'),
    };

String? parseFlutterVersion(String output) =>
    RegExp(r'Flutter\s+(\d+\.\d+\.\d+)').firstMatch(output)?.group(1);

String? parseDartVersion(String output) =>
    RegExp(r'Dart\s+(\d+\.\d+\.\d+)').firstMatch(output)?.group(1);

int? parseJavaMajor(String output) {
  final value = RegExp(r'version\s+"([0-9]+)(?:\.([0-9]+))?')
      .firstMatch(output);
  if (value == null) return null;
  final first = int.parse(value.group(1)!);
  return first == 1 ? int.parse(value.group(2)!) : first;
}
```

The same file will receive the remaining types in subsequent steps; do not add package dependencies.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
fvm flutter test test/tool/environment_check_test.dart
```

Expected: PASS for policy and version parsing.

- [ ] **Step 5: Add failing SDK discovery and exit-code tests**

Append tests that assert:

```dart
test('uses SDK discovery precedence without exposing unrelated env values', () {
  final sdk = chooseAndroidSdk(
    flutterConfiguredPath: '/flutter/configured/sdk',
    environment: const {
      'ANDROID_HOME': '/env/android-home',
      'ANDROID_SDK_ROOT': '/env/sdk-root',
      'SECRET_TOKEN': 'must-not-appear',
    },
    home: '/home/developer',
    host: 'linux',
    directoryExists: (path) => path == '/flutter/configured/sdk',
  );
  expect(sdk, '/flutter/configured/sdk');
  expect(sdk, isNot(contains('must-not-appear')));
});

test('reports exact missing Android package directories', () {
  final missing = missingAndroidPackages(
    sdkRoot: '/sdk',
    separator: '/',
    directoryExists: (path) => path.endsWith('/platform-tools'),
  );
  expect(missing, [
    'platforms;android-36',
    'build-tools;36.0.0',
    'ndk;28.2.13676358',
  ]);
});

test('warning-only failures do not make the process fail', () {
  expect(
    resultExitCode([
      const CheckResult.failed(
        name: 'Xcode',
        requirement: RequirementLevel.warning,
        message: 'not installed',
      ),
    ]),
    0,
  );
});

test('required failures return a non-zero exit code', () {
  expect(
    resultExitCode([
      const CheckResult.failed(
        name: 'Android SDK',
        requirement: RequirementLevel.required,
        message: 'not installed',
      ),
    ]),
    1,
  );
});
```

- [ ] **Step 6: Run the expanded tests and verify the new tests fail**

Run:

```bash
fvm flutter test test/tool/environment_check_test.dart
```

Expected: FAIL because SDK discovery, package checks, `CheckResult`, and `resultExitCode` are not implemented.

- [ ] **Step 7: Implement the remaining pure behavior**

Add:

- `CheckResult.passed` and `CheckResult.failed` const constructors;
- `isFailure`, `name`, `requirement`, and redacted `message` fields;
- `chooseAndroidSdk` precedence: valid Flutter-configured path, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, then Linux `~/Android/Sdk`, macOS `~/Library/Android/sdk`, or Windows `%LOCALAPPDATA%/Android/sdk`;
- `missingAndroidPackages` mapping the four manifest IDs to `platform-tools`, `platforms/android-36`, `build-tools/36.0.0`, and `ndk/28.2.13676358` using the supplied separator;
- `resultExitCode`, returning 1 only when at least one failed result has `RequirementLevel.required`;
- `parseConfiguredAndroidSdk`, accepting a non-empty `android-sdk:` line from `flutter config --list`.

Do not iterate over or print the entire process environment. Read only `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `HOME`, `USERPROFILE`, and `LOCALAPPDATA`.

- [ ] **Step 8: Run formatter, analyzer, and focused tests**

Run:

```bash
fvm dart format tool/src/environment_check.dart test/tool/environment_check_test.dart
fvm flutter analyze
fvm flutter test test/tool/environment_check_test.dart
```

Expected: formatting succeeds, analyzer reports no issues, and all checker tests pass.

- [ ] **Step 9: Commit the tested checker core**

```bash
git add tool/src/environment_check.dart test/tool/environment_check_test.dart
git commit -m "test: define development environment checks"
```

---

### Task 3: Add the executable environment checker

**Files:**
- Modify: `tool/src/environment_check.dart`
- Create: `tool/check_environment.dart`
- Modify: `test/tool/environment_check_test.dart`

**Interfaces:**
- Consumes: pure parsers, policy, SDK selection, and report exit semantics from Task 2.
- Produces:
  - `final class CommandOutput`
  - `typedef CommandRunner = Future<CommandOutput> Function(String executable, List<String> arguments)`
  - `typedef DirectoryExists = bool Function(String path)`
  - `final class EnvironmentChecker`
  - `Future<List<CheckResult>> EnvironmentChecker.run()`

- [ ] **Step 1: Write failing orchestration tests with fake commands**

Add tests using a `Map<String, CommandOutput>` fake runner. Cover these exact cases:

- Flutter 3.47.2 and Dart 3.13.2 pass.
- Flutter 3.48.0 is a required failure.
- Java 25 passes; Java 26 is a required failure for Gradle 9.3.1.
- Linux missing API 36 is a required failure.
- macOS missing `xcodebuild` and `pod` creates warning-only failures and `resultExitCode` remains 0 when Flutter/Android pass.
- a command-not-found exception is converted into a failed result rather than escaping with a stack trace.

Use keys in the form `executable|arg1|arg2`, for example `fvm|flutter|--version` and `java|-version`, so fake outputs remain deterministic.

- [ ] **Step 2: Run tests and verify orchestration is absent**

Run:

```bash
fvm flutter test test/tool/environment_check_test.dart
```

Expected: FAIL because `EnvironmentChecker`, `CommandOutput`, and `CommandRunner` are undefined.

- [ ] **Step 3: Implement injected command orchestration**

Implement `EnvironmentChecker` so `run()` performs only:

1. `fvm flutter --version` and exact Flutter/Dart comparison;
2. `java -version` and the inclusive supported runtime check 17–25;
3. `fvm flutter config --list`, explicit environment keys, and standard paths for SDK discovery;
4. exact Android package-directory checks;
5. `adb version` and absolute `<sdk>/cmdline-tools/latest/bin/sdkmanager --version` as informational checks;
6. on macOS only, `xcodebuild -version` and `pod --version` at warning level.

The system constructor uses `Process.run`, `Directory(path).existsSync`, `Platform.operatingSystem`, and `Platform.environment`. Combine stdout and stderr only for the named command being parsed. Result messages may include tool versions and the selected Android SDK path, but never arbitrary environment values.

- [ ] **Step 4: Create the minimal command-line entrypoint**

Create `tool/check_environment.dart`:

```dart
import 'dart:io';

import 'src/environment_check.dart';

Future<void> main() async {
  final results = await EnvironmentChecker.system().run();
  for (final result in results) {
    final label = result.isFailure
        ? result.requirement == RequirementLevel.required
            ? 'FAIL'
            : 'WARN'
        : 'PASS';
    stdout.writeln('[$label] ${result.name}: ${result.message}');
  }
  exitCode = resultExitCode(results);
}
```

- [ ] **Step 5: Run all checker tests, formatting, and analysis**

Run:

```bash
fvm dart format tool/check_environment.dart tool/src/environment_check.dart test/tool/environment_check_test.dart
fvm flutter test test/tool/environment_check_test.dart
fvm flutter analyze
```

Expected: all tests pass and analyzer reports no issues.

- [ ] **Step 6: Run the checker before Android SDK installation**

Run:

```bash
fvm dart run tool/check_environment.dart
```

Expected on the current host: Flutter and Java pass; Android SDK is a required failure; the process exits 1 without printing secrets.

- [ ] **Step 7: Commit the executable checker**

```bash
git add tool/check_environment.dart tool/src/environment_check.dart test/tool/environment_check_test.dart
git commit -m "feat: add cross-platform environment checker"
```

---

### Task 4: Document team setup without local-path leakage

**Files:**
- Create: `docs/tooling/development-environment.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-31-unified-development-environment-design.md`

**Interfaces:**
- Consumes: commands and policies implemented by Tasks 1–3.
- Produces: one canonical detailed setup guide and a short README entrypoint.

- [ ] **Step 1: Correct the spec's license-ordering sequence**

Verify the spec states both human gates in this order:

1. user accepts the official terms before Command-line Tools download;
2. user handles additional `sdkmanager --licenses` prompts before package installation.

Run:

```bash
rg -n 'before.*download|sdkmanager --licenses|must not accept' docs/superpowers/specs/2026-08-31-unified-development-environment-design.md
```

Expected: both gates are present. The correction was identified during plan authoring and must travel with the implementation commits if it is not already committed.

- [ ] **Step 2: Write the detailed development environment guide**

Create `docs/tooling/development-environment.md` with these sections and exact policies:

- Version Contract: copy the approved version table without changing values.
- Common Setup: `fvm install`, `fvm flutter pub get`, and `fvm dart run tool/check_environment.dart`.
- Android SDK Components: reference `tool/android-sdk-packages.txt` and the official `sdkmanager --package_file` syntax.
- Linux: example SDK root `$HOME/Android/Sdk`; no shell edit required.
- Windows: standard `%LOCALAPPDATA%\Android\Sdk` example and PowerShell command forms.
- macOS: standard `$HOME/Library/Android/sdk` example; default Xcode/CocoaPods findings are warnings.
- Licenses: developer acceptance before download and interactive `sdkmanager --licenses`; never use `yes | sdkmanager --licenses`.
- VS Code: install Dart and Flutter extensions and use committed `.vscode/settings.json`; do not select a global SDK.
- Android Device: use a physical device initially; emulator setup is outside scope.
- iOS Readiness: on macOS record `xcodebuild -version`, `pod --version`, and run `fvm flutter build ios --no-codesign` before iOS implementation.
- Verification: checker, doctor, pub get, analyze, test, and debug APK build commands.
- Troubleshooting: SDK discovery precedence, two-`adb` version check, JDK 17–25 boundary, and a stop rule before changing pinned versions.
- Never Commit: absolute SDK paths, `local.properties`, licenses, caches, credentials, keystores, or signing profiles.

- [ ] **Step 3: Replace README setup with the canonical short path**

Keep the existing project identity and add:

```markdown
fvm install
fvm flutter pub get
fvm dart run tool/check_environment.dart
```

Link to `docs/tooling/development-environment.md`, state that all Flutter/Dart commands use FVM, and keep the existing `com.enmori.app` identifiers. Do not duplicate platform-specific installation instructions in README.

- [ ] **Step 4: Validate documentation and secret/path hygiene**

Run:

```bash
rg -n '3\.47\.2|3\.13\.2|android-36|36\.0\.0|28\.2\.13676358|9\.3\.1|9\.1\.0|2\.4\.0' docs/tooling/development-environment.md README.md
! rg -n 'yes \|.*sdkmanager --licenses' docs/tooling/development-environment.md README.md
! rg -n '/home/miku|GITHUB_PAT_TOKEN|api[_-]?key|bearer token|client[_-]?secret' README.md docs/tooling/development-environment.md tool .vscode
git diff --check
```

Expected: version references are present, automated license acceptance and local absolute paths are absent, and diff check passes.

- [ ] **Step 5: Run repository tests before committing docs**

Run:

```bash
fvm flutter analyze
fvm flutter test
```

Expected: no analyzer issues and all tests pass.

- [ ] **Step 6: Commit only environment documentation and the spec correction**

```bash
git add README.md docs/tooling/development-environment.md docs/superpowers/specs/2026-08-31-unified-development-environment-design.md
git commit -m "docs: add cross-platform development setup"
```

---

### Task 5: Install official Android Command-line Tools on the Linux host

**Files:**
- Read: `tool/android-sdk-packages.txt`
- Create outside repository: `/home/miku/Android/Sdk/cmdline-tools/latest/**`
- Download outside repository: `/tmp/android-commandlinetools-linux-15859902_latest.zip`

**Interfaces:**
- Consumes: user acceptance of Google's displayed SDK terms and official artifact metadata.
- Produces: `/home/miku/Android/Sdk/cmdline-tools/latest/bin/sdkmanager` with no repository changes.

- [ ] **Step 1: Confirm the target is absent before any write**

Run:

```bash
test ! -e /home/miku/Android/Sdk/cmdline-tools/latest
```

Expected: exit 0. If the path exists or is a symlink, stop and inspect it; do not overwrite or merge it.

- [ ] **Step 2: Pause for the user to accept the official download terms**

Show the user [Android Studio and Command-line Tools downloads](https://developer.android.com/studio), identify `commandlinetools-linux-15859902_latest.zip`, and state that Google lists SHA-256 `4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583`. Do not download until the user explicitly confirms acceptance of the displayed Android SDK terms.

- [ ] **Step 3: Download the exact official Linux archive**

After user acceptance, run:

```bash
curl --fail --location --output /tmp/android-commandlinetools-linux-15859902_latest.zip https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip
```

Expected: curl exits 0 and the file is approximately 181.8 MB.

- [ ] **Step 4: Verify checksum before extraction**

Run:

```bash
echo '4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583  /tmp/android-commandlinetools-linux-15859902_latest.zip' | sha256sum --check
```

Expected: `/tmp/android-commandlinetools-linux-15859902_latest.zip: OK`. Stop on any mismatch.

- [ ] **Step 5: Inspect archive paths and extract into a fresh temporary directory**

Run:

```bash
unzip -l /tmp/android-commandlinetools-linux-15859902_latest.zip
enmori_cli_tmp="$(mktemp -d /tmp/enmori-android-cli.XXXXXX)"
test -d "$enmori_cli_tmp"
```

Expected: archive paths are rooted under `cmdline-tools/`, with `bin/sdkmanager`, `lib/`, `NOTICE.txt`, and `source.properties`; the task-specific variable contains a fresh directory under `/tmp/enmori-android-cli.*`.

In the same shell session, run:

```bash
unzip -q /tmp/android-commandlinetools-linux-15859902_latest.zip -d "$enmori_cli_tmp"
test -x "$enmori_cli_tmp/cmdline-tools/bin/sdkmanager"
```

Expected: both commands exit 0.

- [ ] **Step 6: Install the verified files into the user SDK root**

With escalated filesystem permission but no root privilege, run in the same shell session so the validated temporary-directory variable remains defined:

```bash
install -d /home/miku/Android/Sdk/cmdline-tools/latest
cp -a "$enmori_cli_tmp/cmdline-tools/." /home/miku/Android/Sdk/cmdline-tools/latest/
```

Expected: `/home/miku/Android/Sdk/cmdline-tools/latest/bin/sdkmanager` is executable. Do not add symlinks or edit shell startup files.

- [ ] **Step 7: Verify the command-line tool**

Run:

```bash
/home/miku/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --version --sdk_root=/home/miku/Android/Sdk
```

Expected: a numeric Command-line Tools version and exit 0.

---

### Task 6: Accept package licenses and install the pinned Android SDK packages

**Files:**
- Read: `tool/android-sdk-packages.txt`
- Create outside repository: `/home/miku/Android/Sdk/licenses/**`
- Create outside repository: `/home/miku/Android/Sdk/platform-tools/**`
- Create outside repository: `/home/miku/Android/Sdk/platforms/android-36/**`
- Create outside repository: `/home/miku/Android/Sdk/build-tools/36.0.0/**`
- Create outside repository: `/home/miku/Android/Sdk/ndk/28.2.13676358/**`

**Interfaces:**
- Consumes: installed `sdkmanager` and the user-entered license responses.
- Produces: the exact SDK directory structure consumed by the checker and Gradle.

- [ ] **Step 1: Start interactive license review in a visible terminal**

Run with a TTY:

```bash
/home/miku/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --licenses --sdk_root=/home/miku/Android/Sdk
```

Open that running session in the Codex terminal panel and pause. The user reads the presented licenses and enters their own responses. Codex must not send `y`, pipe `yes`, or otherwise accept on the user's behalf.

- [ ] **Step 2: Verify license review completed**

After the user finishes, poll the same terminal session.

Expected: `All SDK package licenses accepted` and process exit 0. If the user declines any license, stop; do not install that package or weaken the manifest.

- [ ] **Step 3: Install the repository package manifest**

Run:

```bash
/home/miku/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/home/miku/Android/Sdk --package_file=/home/miku/Documents/ChatGPT/ENMORI/tool/android-sdk-packages.txt
```

Expected: installation completes for Platform Tools, API 36, Build Tools 36.0.0, and NDK 28.2.13676358. Do not install an emulator or system image.

- [ ] **Step 4: Verify exact package directories**

Run:

```bash
test -x /home/miku/Android/Sdk/platform-tools/adb
test -d /home/miku/Android/Sdk/platforms/android-36
test -d /home/miku/Android/Sdk/build-tools/36.0.0
test -d /home/miku/Android/Sdk/ndk/28.2.13676358
```

Expected: all checks exit 0.

- [ ] **Step 5: Compare the system and SDK-managed adb versions**

Run:

```bash
/usr/bin/adb version
/home/miku/Android/Sdk/platform-tools/adb version
```

Expected: record both versions. If they differ, do not edit PATH; Flutter will use the copy in its registered SDK root and the system copy remains available for Arch maintenance.

---

### Task 7: Register the SDK and prove the Android build

**Files:**
- Machine-local ignored output: `android/local.properties`
- Generated ignored output: `build/app/outputs/flutter-apk/app-debug.apk`
- Verify: `pubspec.lock`

**Interfaces:**
- Consumes: installed SDK root and repository checker.
- Produces: passing environment checks and a debug-keystore-signed APK for application ID `com.enmori.app`.

- [ ] **Step 1: Register the SDK with the pinned Flutter installation**

Run:

```bash
fvm flutter config --android-sdk /home/miku/Android/Sdk
```

Expected: Flutter reports that `android-sdk` is set to `/home/miku/Android/Sdk`. This is machine-local Flutter state.

- [ ] **Step 2: Run the repository checker**

Run:

```bash
fvm dart run tool/check_environment.dart
```

Expected on Linux: Flutter 3.47.2, Dart 3.13.2, Java 25, API 36, Build Tools 36.0.0, NDK 28.2.13676358, `adb`, and `sdkmanager` pass; process exits 0.

- [ ] **Step 3: Run Flutter doctor and classify unrelated targets**

Run:

```bash
fvm flutter doctor -v
```

Expected: Flutter and Android toolchain pass. Missing Chrome or Linux desktop tools may remain diagnostic because the project targets only Android and iOS. Xcode is not expected on Linux.

- [ ] **Step 4: Prove dependency lock stability**

Run:

```bash
cp pubspec.lock /tmp/enmori-environment-pubspec.lock
fvm flutter pub get
cmp -s pubspec.lock /tmp/enmori-environment-pubspec.lock
git ls-files --error-unmatch pubspec.lock
```

Expected: dependencies resolve, `cmp` exits 0, and Git reports `pubspec.lock` is tracked.

- [ ] **Step 5: Run analysis and all tests**

Run:

```bash
fvm flutter analyze
fvm flutter test
```

Expected: no analyzer issues and every test passes.

- [ ] **Step 6: Build the debug APK**

Run:

```bash
fvm flutter build apk --debug
```

Expected: `build/app/outputs/flutter-apk/app-debug.apk` exists and the build succeeds using the standard local debug signing configuration. Release signing is not configured or tested.

- [ ] **Step 7: Verify identifier, artifact, and Git hygiene**

Run:

```bash
test -f build/app/outputs/flutter-apk/app-debug.apk
rg -n 'namespace = "com\.enmori\.app"|applicationId = "com\.enmori\.app"' android/app/build.gradle.kts
git check-ignore -v android/local.properties build/app/outputs/flutter-apk/app-debug.apk
git status --short
```

Expected: identifiers are exact, local/build outputs are ignored, and Git status shows no unexpected environment artifact. The four pre-existing user documents may still appear as untracked and must remain untouched.

- [ ] **Step 8: Commit any remaining tracked environment changes only**

If Tasks 1–4 were committed exactly as planned, no tracked change should remain. If formatting or documentation validation produced a legitimate tracked correction, inspect it and commit only its explicit paths:

```bash
git diff --check
git status --short
```

Do not use `git add .` while unrelated user documents are untracked.

---

## Final acceptance checklist

- [ ] `fvm --version` reports 4.3.0 on the bootstrap host.
- [ ] `fvm flutter --version` reports Flutter 3.47.2 and Dart 3.13.2.
- [ ] `fvm dart run tool/check_environment.dart` exits 0 on the configured Linux host.
- [ ] Android API 36, Build Tools 36.0.0, NDK 28.2.13676358, Platform Tools, and Command-line Tools are detected.
- [ ] Android SDK terms and package licenses were accepted by the user, not automated.
- [ ] `fvm flutter analyze` and `fvm flutter test` pass.
- [ ] `fvm flutter build apk --debug` produces `app-debug.apk` using standard debug signing.
- [ ] `pubspec.lock` remains byte-stable and tracked.
- [ ] no SDK, cache, absolute path, license, secret, keystore, or build artifact is tracked.
- [ ] no application architecture, backend, state-management, dependency, feature, or UI decision was introduced.
- [ ] the user's pre-existing untracked project-context documents remain untouched.
