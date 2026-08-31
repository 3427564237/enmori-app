import 'dart:io';

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

  group('environment checker orchestration', () {
    const sdkRoot = '/sdk';
    const installedDirectories = {
      sdkRoot,
      '/sdk/platform-tools',
      '/sdk/platforms/android-36',
      '/sdk/build-tools/36.0.0',
      '/sdk/ndk/28.2.13676358',
    };

    Map<String, CommandOutput> validCommands({
      String flutterVersion = '3.47.2',
      int javaVersion = 25,
      bool macos = false,
    }) => {
      'fvm|flutter|--version': CommandOutput(
        exitCode: 0,
        stdout:
            'Flutter $flutterVersion • channel stable\n'
            'Tools • Dart 3.13.2',
        stderr: '',
      ),
      'java|-version': CommandOutput(
        exitCode: 0,
        stdout: '',
        stderr: 'openjdk version "$javaVersion.0.1"',
      ),
      'fvm|flutter|config|--list': const CommandOutput(
        exitCode: 0,
        stdout: 'android-sdk: /sdk',
        stderr: '',
      ),
      'adb|version': const CommandOutput(
        exitCode: 0,
        stdout: 'Android Debug Bridge version 1.0.41',
        stderr: '',
      ),
      '/sdk/cmdline-tools/latest/bin/sdkmanager|--version': const CommandOutput(
        exitCode: 0,
        stdout: '19.0',
        stderr: '',
      ),
      if (macos) ...{
        'xcodebuild|-version': const CommandOutput(
          exitCode: 1,
          stdout: '',
          stderr: 'not installed',
        ),
        'pod|--version': const CommandOutput(
          exitCode: 1,
          stdout: '',
          stderr: 'not installed',
        ),
      },
    };

    Future<List<CheckResult>> runChecker({
      String host = 'linux',
      Map<String, CommandOutput>? commands,
      Set<String> directories = installedDirectories,
      CommandRunner? commandRunner,
    }) {
      final outputs = commands ?? validCommands(macos: host == 'macos');
      return EnvironmentChecker(
        host: host,
        environment: const {},
        home: '/home/developer',
        pathSeparator: '/',
        directoryExists: directories.contains,
        commandRunner:
            commandRunner ??
            (executable, arguments) async =>
                outputs['$executable|${arguments.join('|')}']!,
      ).run();
    }

    test('accepts the approved Flutter, Dart, and Java versions', () async {
      final results = await runChecker();
      expect(
        results.where((result) => result.name == 'Flutter').single.isFailure,
        isFalse,
      );
      expect(
        results.where((result) => result.name == 'Dart').single.isFailure,
        isFalse,
      );
      expect(
        results.where((result) => result.name == 'Java').single.isFailure,
        isFalse,
      );
      expect(resultExitCode(results), 0);
    });

    test('rejects a Flutter version outside the project contract', () async {
      final results = await runChecker(
        commands: validCommands(flutterVersion: '3.48.0'),
      );
      final flutter = results
          .where((result) => result.name == 'Flutter')
          .single;
      expect(flutter.isFailure, isTrue);
      expect(flutter.requirement, RequirementLevel.required);
    });

    test('accepts Java 25 and rejects Java 26', () async {
      final supported = await runChecker(commands: validCommands());
      expect(
        supported.where((result) => result.name == 'Java').single.isFailure,
        isFalse,
      );

      final unsupported = await runChecker(
        commands: validCommands(javaVersion: 26),
      );
      final java = unsupported.where((result) => result.name == 'Java').single;
      expect(java.isFailure, isTrue);
      expect(java.requirement, RequirementLevel.required);
    });

    test('requires every pinned Android package on Linux', () async {
      final results = await runChecker(
        directories: installedDirectories.difference(const {
          '/sdk/platforms/android-36',
        }),
      );
      final packages = results
          .where((result) => result.name == 'Android SDK packages')
          .single;
      expect(packages.isFailure, isTrue);
      expect(packages.message, contains('platforms;android-36'));
      expect(resultExitCode(results), 1);
    });

    test('keeps missing macOS iOS prerequisites warning-only', () async {
      final results = await runChecker(host: 'macos');
      final xcode = results.where((result) => result.name == 'Xcode').single;
      final pods = results.where((result) => result.name == 'CocoaPods').single;
      expect(xcode.isFailure, isTrue);
      expect(pods.isFailure, isTrue);
      expect(xcode.requirement, RequirementLevel.warning);
      expect(pods.requirement, RequirementLevel.warning);
      expect(resultExitCode(results), 0);
    });

    test('converts command-not-found into a result', () async {
      final results = await runChecker(
        commandRunner: (executable, arguments) async {
          if (executable == 'fvm') {
            throw const ProcessException('fvm', [], 'not found');
          }
          return validCommands()['$executable|${arguments.join('|')}']!;
        },
      );
      final flutter = results
          .where((result) => result.name == 'Flutter')
          .single;
      expect(flutter.isFailure, isTrue);
      expect(flutter.message, 'command unavailable');
    });
  });
}
