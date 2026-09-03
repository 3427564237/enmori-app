---
name: flutter-add-integration-test
description: Configures Flutter Driver for app interaction and converts MCP actions into permanent integration tests. Use when adding integration testing to a project, exploring UI components via MCP, or automating user flows with the integration_test package.
metadata:
  model: models/gemini-3.1-pro-preview
  last_modified: Tue, 21 Apr 2026 18:29:20 GMT
---
# Implementing Flutter Integration Tests

## ENMORI project boundary

This repository is pinned to Flutter 3.47.2 and uses FVM. Prefer the current `integration_test` workflow: `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` plus `fvm flutter test integration_test/<name>_test.dart` on an assigned Android or iOS target. Do not add `enableFlutterDriverExtension()`, a `test_driver/` host script, legacy `flutter_driver`, or another dependency unless an approved test requirement specifically needs the legacy/web/Firebase Test Lab driver path. Do not change application behavior or add keys unless the assigned acceptance criteria justify a stable test seam.

## Contents
- [Project Setup and Dependencies](#project-setup-and-dependencies)
- [Interactive Exploration via MCP](#interactive-exploration-via-mcp)
- [Test Authoring Guidelines](#test-authoring-guidelines)
- [Execution and Profiling](#execution-and-profiling)
- [Workflow: End-to-End Integration Testing](#workflow-end-to-end-integration-testing)
- [Examples](#examples)

## Project Setup and Dependencies

Configure the project to support Flutter SDK `integration_test` only when the applicable approved plan requires it.

1. Verify the approved Flutter SDK dependencies in `pubspec.yaml`; if the approved plan requires adding them, use FVM:
   ```bash
   fvm flutter pub add 'dev:integration_test:{"sdk":"flutter"}'
   fvm flutter pub add 'dev:flutter_test:{"sdk":"flutter"}'
   ```
2. Initialize `IntegrationTestWidgetsFlutterBinding` in the integration test; do not enable the legacy Flutter Driver extension in the application entry point by default.
3. Prefer existing semantics, text, types, and approved keys. Add a stable `Key` only when the test contract justifies it.

## Interactive Exploration via MCP

Use the Dart/Flutter MCP server tools to interactively explore and manipulate the application state before writing static tests.

- **Launch**: Execute `launch_app` with `target: "lib/main_test.dart"` to start the application and acquire the DTD URI.
- **Inspect**: Execute `get_widget_tree` to discover available `Key`s, `Text` nodes, and widget `Type`s.
- **Interact**: Execute `tap`, `enter_text`, and `scroll` to simulate user flows.
- **Wait**: Always execute `waitFor` or verify state with `get_health` when navigating or triggering animations.
- **Troubleshoot Unmounted Widgets**: If a widget is not found in the tree, it may be lazily loaded in a `SliverList` or `ListView`. Execute `scroll` or `scrollIntoView` to force the widget to mount before interacting with it.

## Test Authoring Guidelines

Structure integration tests using the `flutter_test` API paradigm.

- Create a dedicated `integration_test/` directory at the project root.
- Name all test files using the `<name>_test.dart` convention.
- Initialize the binding by calling `IntegrationTestWidgetsFlutterBinding.ensureInitialized();` at the start of `main()`.
- Load the application UI using `await tester.pumpWidget(MyApp());`.
- Trigger frames and wait for animations to complete using `await tester.pumpAndSettle();` after interactions like `tester.tap()`.
- Assert widget visibility using `expect(find.byKey(ValueKey('foo')), findsOneWidget);` or `findsNothing`.
- Scroll to specific off-screen widgets using `await tester.scrollUntilVisible(itemFinder, 500.0, scrollable: listFinder);`.

**Conditional Logic for Legacy `flutter_driver`:**
- If maintaining or migrating legacy `flutter_driver` tests, use `driver.waitFor()`, `driver.waitForAbsent()`, `driver.tap()`, and `driver.scroll()` instead of the `WidgetTester` APIs.

## Execution and Profiling

Execute Android and iOS integration tests with `fvm flutter test integration_test/<name>_test.dart`. Use the legacy/web/Firebase Test Lab `flutter drive` path and host driver only when the assigned test scope explicitly requires it.

**Conditional Execution Targets:**
- **If testing on Chrome:** Launch `chromedriver --port=4444` in a separate terminal, then run:
  `flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d chrome`
- **If testing headless web:** Run with `-d web-server`.
- **If testing on Android (Local):** Run `flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart`.
- **If testing on Firebase Test Lab (Android):**
  1. Build debug APK: `flutter build apk --debug`
  2. Build test APK: `./gradlew app:assembleAndroidTest`
  3. Upload both APKs to the Firebase Test Lab console.

## Workflow: End-to-End Integration Testing

Copy and follow this checklist to implement and verify integration tests.

- [ ] **Task Progress: Setup**
  - [ ] Add `integration_test` and `flutter_test` to `pubspec.yaml`.
  - [ ] Initialize `IntegrationTestWidgetsFlutterBinding` in the test file.
  - [ ] Assign `ValueKey`s to target widgets.
- [ ] **Task Progress: Exploration**
  - [ ] Run `launch_app` via MCP.
  - [ ] Map the widget tree using `get_widget_tree`.
  - [ ] Validate interaction paths using MCP tools (`tap`, `enter_text`).
- [ ] **Task Progress: Authoring**
  - [ ] Create `integration_test/app_test.dart`.
  - [ ] Write test cases using `WidgetTester` APIs.
  - [ ] Create a host driver only for an explicitly approved legacy/web/Test Lab execution path.
- [ ] **Task Progress: Execution & Feedback Loop**
  - [ ] Run `fvm flutter test integration_test/app_test.dart` on the assigned target.
  - [ ] **Feedback Loop**: Review test output -> If `PumpAndSettleTimedOutException` occurs, check for infinite animations -> If widget not found, add `scrollUntilVisible` -> Re-run test until passing.

## Examples

### Standard Integration Test (`integration_test/app_test.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('End-to-end test', () {
    testWidgets('tap on the floating action button, verify counter', (tester) async {
      // Load app widget.
      await tester.pumpWidget(const MyApp());

      // Verify the counter starts at 0.
      expect(find.text('0'), findsOneWidget);

      // Find the floating action button to tap on.
      final fab = find.byKey(const ValueKey('increment'));

      // Emulate a tap on the floating action button.
      await tester.tap(fab);

      // Trigger a frame and wait for animations.
      await tester.pumpAndSettle();

      // Verify the counter increments by 1.
      expect(find.text('1'), findsOneWidget);
    });
  });
}
```

### Host Driver Script (`test_driver/integration_test.dart`)

```dart
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() => integrationDriver();
```

### Performance Profiling Driver Script (`test_driver/perf_driver.dart`)

Use this driver script if you wrap your test actions in `binding.traceAction()` to capture performance metrics.

```dart
import 'package:flutter_driver/flutter_driver.dart' as driver;
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() {
  return integrationDriver(
    responseDataCallback: (data) async {
      if (data != null) {
        final timeline = driver.Timeline.fromJson(
          data['scrolling_timeline'] as Map<String, dynamic>,
        );

        final summary = driver.TimelineSummary.summarize(timeline);

        await summary.writeTimelineToFile(
          'scrolling_timeline',
          pretty: true,
          includeSummary: true,
        );
      }
    },
  );
}
```
