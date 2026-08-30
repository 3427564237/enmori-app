# ENMORI Project Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reproducible Android/iOS Flutter baseline for ENMORI with Flutter 3.47.2 managed by FVM, correct native identifiers, a committed dependency lockfile, and an audited initial Codex Skill set.

**Architecture:** FVM owns the exact Flutter SDK while each operating system owns its Android, Java, Xcode, and IDE dependencies. Flutter generates the standard starter application; bootstrap changes only native identifiers and onboarding/tooling files, with no product architecture or feature decisions.

**Tech Stack:** FVM, Flutter 3.47.2, Dart 3.13.2, Gradle Kotlin DSL, Xcode project configuration, Git, Codex Agent Skills.

**Spec:** `docs/superpowers/specs/2026-08-31-project-bootstrap-design.md`

## Global Constraints

- Flutter package name is exactly `enmori`.
- Android application ID and namespace are exactly `com.enmori.app`.
- iOS Runner base bundle identifier is exactly `com.enmori.app`.
- Generated platforms are Android and iOS only.
- Flutter is exactly `3.47.2`; Dart is the bundled `3.13.2`.
- `.fvmrc` is committed and `.fvm/` is ignored.
- `pubspec.lock` is committed and stable across repeated dependency resolution.
- Do not depend on Arch/AUR Flutter.
- Do not install Android SDK, JDK, Xcode, CocoaPods, device drivers, or IDE packages.
- Do not introduce product architecture, backend, state management, features, or UI decisions.

---

### Task 1: Install FVM and the pinned Flutter SDK

**Files:**
- Create outside repository: `/home/miku/fvm/bin/fvm`
- Create outside repository: `/home/miku/fvm/versions/3.47.2/`
- Create temporary: `/tmp/enmori-fvm-install.sh`

**Interfaces:**
- Consumes: official FVM install script and Flutter release `3.47.2`.
- Produces: `/home/miku/fvm/bin/fvm` and a runnable FVM-managed Flutter 3.47.2 SDK.

- [ ] **Step 1: Download the FVM installer without executing it through a pipe**

```bash
curl -fsSL https://fvm.app/install.sh -o /tmp/enmori-fvm-install.sh
```

Expected: exit status 0 and a non-empty `/tmp/enmori-fvm-install.sh`.

- [ ] **Step 2: Validate the downloaded shell script**

```bash
bash -n /tmp/enmori-fvm-install.sh
rg -n 'FVM_INSTALL_DIR|install' /tmp/enmori-fvm-install.sh
```

Expected: `bash -n` exits 0 and the installer exposes its documented installation controls.

- [ ] **Step 3: Install FVM without editing a shell startup file manually**

```bash
bash /tmp/enmori-fvm-install.sh
/home/miku/fvm/bin/fvm --version
```

Expected: the second command prints an FVM version. If the installer reports a different binary path, verify that path and use it consistently in the remaining steps; do not edit `.bashrc`, `.zshrc`, or equivalent.

- [ ] **Step 4: Install the exact official Flutter release**

```bash
/home/miku/fvm/bin/fvm install 3.47.2 --setup
/home/miku/fvm/versions/3.47.2/bin/flutter --version
```

Expected: Flutter `3.47.2`, stable channel, Dart `3.13.2`. Do not replace the version with the moving `stable` alias.

- [ ] **Step 5: Diagnose the host toolchain without treating platform dependencies as bootstrap failures**

```bash
/home/miku/fvm/versions/3.47.2/bin/flutter doctor -v
```

Expected: Flutter itself is detected. Record missing Android SDK/JDK components separately; iOS/Xcode availability is not expected on Linux.

---

### Task 2: Generate the Flutter project and pin it to FVM

**Files:**
- Create: `.fvmrc`
- Modify: `.gitignore`
- Create: `android/**`
- Create: `ios/**`
- Create: `lib/main.dart`
- Create: `test/widget_test.dart`
- Create: `pubspec.yaml`
- Create: `pubspec.lock`
- Create: `analysis_options.yaml`

**Interfaces:**
- Consumes: FVM-managed Flutter SDK from Task 1.
- Produces: standard Flutter starter project, FVM version contract, and native projects for later builds.

- [ ] **Step 1: Generate only Android and iOS in the existing repository root**

```bash
/home/miku/fvm/versions/3.47.2/bin/flutter create --platforms=android,ios --org com.enmori --project-name enmori .
```

Expected: Flutter reports project creation success; the existing `.git/` and `docs/` remain present. The generated native identifier is temporarily `com.enmori.enmori` and is corrected in the next step.

- [ ] **Step 2: Pin the project to Flutter 3.47.2 with FVM**

```bash
/home/miku/fvm/bin/fvm use 3.47.2 --force --skip-pub-get
```

Expected `.fvmrc` content includes:

```json
{
  "flutter": "3.47.2"
}
```

Expected `.gitignore`: `.fvm/` is ignored while `.fvmrc` is not ignored.

- [ ] **Step 3: Correct Android's generated identifiers**

Modify `android/app/build.gradle.kts` so its production configuration contains:

```kotlin
android {
    namespace = "com.enmori.app"

    defaultConfig {
        applicationId = "com.enmori.app"
    }
}
```

Preserve all other Flutter-generated Gradle settings.

- [ ] **Step 4: Correct the iOS Runner identifiers**

In `ios/Runner.xcodeproj/project.pbxproj`, replace the generated production base `com.enmori.enmori` with `com.enmori.app`. Runner test identifiers may use the derived `com.enmori.app.RunnerTests` suffix.

- [ ] **Step 5: Verify the native identifiers exhaustively**

```bash
rg -n 'namespace|applicationId' android/app/build.gradle.kts
rg -n 'PRODUCT_BUNDLE_IDENTIFIER' ios/Runner.xcodeproj/project.pbxproj
rg -n 'com\.enmori\.enmori' android ios
```

Expected: Android namespace/application ID and iOS Runner base values use `com.enmori.app`; the final search returns no production occurrence of `com.enmori.enmori`.

- [ ] **Step 6: Verify generated files before committing**

```bash
test -f pubspec.yaml
test -f pubspec.lock
test -f android/app/build.gradle.kts
test -f ios/Runner.xcodeproj/project.pbxproj
test -f lib/main.dart
test -f test/widget_test.dart
git diff --check
```

Expected: every check exits 0.

- [ ] **Step 7: Commit the reproducible Flutter baseline**

```bash
git add .fvmrc .gitignore analysis_options.yaml android ios lib pubspec.yaml pubspec.lock test
git commit -m "chore: bootstrap Flutter project"
```

Expected: the commit includes `pubspec.lock` and does not include `.fvm/`.

---

### Task 3: Document FVM onboarding and prove the lockfile is stable

**Files:**
- Modify: `README.md`
- Verify: `pubspec.lock`

**Interfaces:**
- Consumes: generated Flutter project and `.fvmrc` from Task 2.
- Produces: platform-neutral onboarding commands and evidence that dependency resolution is reproducible.

- [ ] **Step 1: Replace the generated README with minimal toolchain onboarding**

Write `README.md` with this content:

````markdown
# ENMORI

ENMORI is a Flutter application targeting Android and iOS.

## Toolchain

- Install FVM using the supported method for your operating system.
- Run `fvm install` in this repository to install the Flutter version pinned by `.fvmrc`.
- Use `fvm flutter ...` and `fvm dart ...` for project commands.
- Manage Android SDK and JDK locally on Android development hosts.
- Manage Xcode and CocoaPods locally on macOS development hosts.

## Verify the baseline

```bash
fvm flutter pub get
fvm flutter analyze
fvm flutter test
fvm flutter doctor -v
```

`pubspec.lock` is committed and must be updated intentionally whenever dependencies change.
````

- [ ] **Step 2: Resolve dependencies once and save the resulting lockfile snapshot**

```bash
/home/miku/fvm/bin/fvm flutter pub get
cp pubspec.lock /tmp/enmori-pubspec.lock.before
```

Expected: `pub get` succeeds and the temporary snapshot exists.

- [ ] **Step 3: Resolve dependencies a second time and compare byte-for-byte**

```bash
/home/miku/fvm/bin/fvm flutter pub get
cmp /tmp/enmori-pubspec.lock.before pubspec.lock
git check-ignore pubspec.lock
```

Expected: `cmp` exits 0. `git check-ignore pubspec.lock` exits 1, proving the lockfile is not ignored.

- [ ] **Step 4: Run the generated quality baseline**

```bash
/home/miku/fvm/bin/fvm flutter analyze
/home/miku/fvm/bin/fvm flutter test
```

Expected: analysis reports no issues and the starter widget test passes.

- [ ] **Step 5: Commit onboarding and any deterministic lockfile result**

```bash
git add README.md pubspec.lock
git commit -m "docs: add FVM onboarding"
```

Expected: `git ls-files --error-unmatch pubspec.lock` succeeds.

---

### Task 4: Install the verified, non-conflicting Skill subset

**Files:**
- Create outside repository: `/home/miku/.codex/skills/dart-add-unit-test/`
- Create outside repository: `/home/miku/.codex/skills/flutter-add-integration-test/`
- Create outside repository: `/home/miku/.codex/skills/flutter-add-widget-test/`
- Create outside repository: `/home/miku/.codex/skills/flutter-apply-architecture-best-practices/`
- Create outside repository: `/home/miku/.codex/skills/flutter-build-responsive-layout/`
- Create outside repository: `/home/miku/.codex/skills/flutter-fix-layout-issues/`
- Create outside repository: `/home/miku/.codex/skills/dart-flutter-patterns/`
- Create outside repository: `/home/miku/.codex/skills/flutter-dart-code-review/`
- Create outside repository: `/home/miku/.codex/skills/requirements-engineering/`
- Create: `docs/tooling/skills-inventory.md`

**Interfaces:**
- Consumes: exact public GitHub Skill paths and existing Codex Skills.
- Produces: validated Skill directories available from the next Codex turn plus an auditable status record.

- [ ] **Step 1: Confirm the existing workflow Skill instead of reinstalling it**

```bash
test -f /home/miku/.codex/skills/brainstorming/SKILL.md
```

Expected: exit status 0. `brainstorming` is classified as already installed.

- [ ] **Step 2: Install the six exact Flutter-team Skills**

```bash
python3 /home/miku/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo flutter/agent-plugins \
  --path skills/dart-add-unit-test \
         skills/flutter-add-integration-test \
         skills/flutter-add-widget-test \
         skills/flutter-apply-architecture-best-practices \
         skills/flutter-build-responsive-layout \
         skills/flutter-fix-layout-issues
```

Expected: six installed Skill directories, each containing `SKILL.md`.

- [ ] **Step 3: Install the two Flutter/Dart implementation-review Skills from ECC**

```bash
python3 /home/miku/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo affaan-m/ECC \
  --path skills/dart-flutter-patterns \
         skills/flutter-dart-code-review
```

Expected: both installed directories contain `SKILL.md`. These Skills supply idiom and review guidance but do not choose ENMORI's state management or architecture during bootstrap.

- [ ] **Step 4: Install the traceable requirements-engineering Skill**

```bash
python3 /home/miku/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo SwiftyJourney/requirements-engineering-skill \
  --path skills/requirements-engineering
```

Expected: `/home/miku/.codex/skills/requirements-engineering/SKILL.md` exists.

- [ ] **Step 5: Do not install ambiguous or mismatched exact names**

Record these classifications rather than substituting unrelated Skills:

- `flutter-animating-apps`: historical Flutter Skill name is no longer present in the current Flutter repository; unresolved.
- `project-context`: search results refer to project-specific placeholder/injection workflows rather than a clear general source; unresolved.
- `software-architecture`: the prominent exact-name result imposes JavaScript-specific rules and overlaps Flutter architecture guidance; skipped as conflicting.
- `data-modeling`: current `domain-modeling` is already installed and covers domain terminology/ADR work; defer an additional ERD-specific Skill until its source and scope are explicitly chosen.
- `testing`: prominent exact-name results target JavaScript/Vitest and conflict with the installed Flutter test Skills; skipped as mismatched.
- `scrum-planning`: no unambiguous source was specified; unresolved.
- `project-consistency-review`: no unambiguous source was specified; unresolved.

- [ ] **Step 6: Verify every newly installed Skill structurally**

```bash
for enmori_skill in \
  dart-add-unit-test \
  flutter-add-integration-test \
  flutter-add-widget-test \
  flutter-apply-architecture-best-practices \
  flutter-build-responsive-layout \
  flutter-fix-layout-issues \
  dart-flutter-patterns \
  flutter-dart-code-review \
  requirements-engineering; do
  test -s "/home/miku/.codex/skills/${enmori_skill}/SKILL.md"
done
```

Expected: all checks exit 0. Installed Skills become discoverable by Codex on the next turn.

- [ ] **Step 7: Record the inventory and scope decisions**

Create `docs/tooling/skills-inventory.md` listing all 17 requested names with columns for status, source, and responsibility. Use only these statuses: `installed`, `already installed`, `skipped: conflict`, `skipped: mismatch`, `deferred: source`, and `deferred: scope`.

- [ ] **Step 8: Commit the Skill inventory**

```bash
git add docs/tooling/skills-inventory.md
git commit -m "docs: record Codex skill inventory"
```

Expected: the repository contains only the inventory; global Skill implementation files remain outside Git.

---

### Task 5: Run final repository verification

**Files:**
- Verify: all repository bootstrap files
- Verify: Git history and ignore rules

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: evidence that the bootstrap meets the approved spec without introducing product decisions.

- [ ] **Step 1: Verify exact SDK and FVM project selection**

```bash
/home/miku/fvm/bin/fvm --version
/home/miku/fvm/bin/fvm flutter --version
rg -n '"flutter"\s*:\s*"3\.47\.2"' .fvmrc
```

Expected: Flutter 3.47.2 and Dart 3.13.2; `.fvmrc` matches the exact release.

- [ ] **Step 2: Verify dependencies, analysis, and tests one final time**

```bash
/home/miku/fvm/bin/fvm flutter pub get
/home/miku/fvm/bin/fvm flutter analyze
/home/miku/fvm/bin/fvm flutter test
git diff --exit-code -- pubspec.lock
git ls-files --error-unmatch pubspec.lock
```

Expected: every command exits 0.

- [ ] **Step 3: Verify native identifiers and generated platform scope**

```bash
rg -n 'namespace = "com\.enmori\.app"|applicationId = "com\.enmori\.app"' android/app/build.gradle.kts
rg -n 'PRODUCT_BUNDLE_IDENTIFIER = com\.enmori\.app' ios/Runner.xcodeproj/project.pbxproj
test ! -d web
test ! -d linux
test ! -d macos
test ! -d windows
```

Expected: exact native identifiers and only Android/iOS generated platform directories.

- [ ] **Step 4: Verify repository hygiene and scope**

```bash
git check-ignore .fvm/flutter_sdk
git ls-files .fvm
git status --short
git log --oneline --decorate -5
```

Expected: `.fvm/flutter_sdk` is ignored, `git ls-files .fvm` prints nothing, and the working tree is clean. Review the commit list to confirm that it contains documentation/toolchain/bootstrap changes only.
