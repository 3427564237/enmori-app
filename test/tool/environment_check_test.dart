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
      const output =
          'Flutter 3.47.2 • channel stable\n'
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

  test(
    'uses SDK discovery precedence without exposing unrelated env values',
    () {
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
    },
  );

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
}
