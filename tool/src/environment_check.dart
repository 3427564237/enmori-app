import 'dart:io';

enum RequirementLevel { required, warning, informational }

typedef DirectoryExists = bool Function(String path);
typedef CommandRunner = Future<CommandOutput> Function(
  String executable,
  List<String> arguments,
);

final class CommandOutput {
  const CommandOutput({
    required this.exitCode,
    required this.stdout,
    required this.stderr,
  });

  final int exitCode;
  final String stdout;
  final String stderr;

  String get combined => [
    stdout,
    stderr,
  ].where((part) => part.trim().isNotEmpty).join('\n').trim();
}

final class CheckResult {
  const CheckResult.passed({
    required this.name,
    required this.requirement,
    required this.message,
  }) : isFailure = false;

  const CheckResult.failed({
    required this.name,
    required this.requirement,
    required this.message,
  }) : isFailure = true;

  final bool isFailure;
  final String name;
  final RequirementLevel requirement;
  final String message;
}

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

String? parseConfiguredAndroidSdk(String output) {
  final match = RegExp(
    r'^android-sdk:\s*(.+?)\s*$',
    multiLine: true,
  ).firstMatch(output);
  final value = match?.group(1)?.trim();
  return value == null || value.isEmpty ? null : value;
}

String? chooseAndroidSdk({
  required String? flutterConfiguredPath,
  required Map<String, String> environment,
  required String? home,
  required String host,
  required DirectoryExists directoryExists,
}) {
  final candidates = <String?>[
    flutterConfiguredPath,
    environment['ANDROID_HOME'],
    environment['ANDROID_SDK_ROOT'],
    switch (host) {
      'linux' when home != null => '$home/Android/Sdk',
      'macos' when home != null => '$home/Library/Android/sdk',
      'windows' when environment['LOCALAPPDATA'] != null =>
        '${environment['LOCALAPPDATA']}\\Android\\sdk',
      _ => null,
    },
  ];

  for (final candidate in candidates) {
    if (candidate != null &&
        candidate.isNotEmpty &&
        directoryExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

List<String> missingAndroidPackages({
  required String sdkRoot,
  required String separator,
  required DirectoryExists directoryExists,
}) {
  const packageDirectories = {
    'platform-tools': ['platform-tools'],
    'platforms;android-36': ['platforms', 'android-36'],
    'build-tools;36.0.0': ['build-tools', '36.0.0'],
    'ndk;28.2.13676358': ['ndk', '28.2.13676358'],
  };

  return [
    for (final entry in packageDirectories.entries)
      if (!directoryExists(<String>[sdkRoot, ...entry.value].join(separator)))
        entry.key,
  ];
}

int resultExitCode(Iterable<CheckResult> results) =>
    results.any(
      (result) =>
          result.isFailure && result.requirement == RequirementLevel.required,
    )
    ? 1
    : 0;

final class EnvironmentChecker {
  const EnvironmentChecker({
    required this.host,
    required this.environment,
    required this.home,
    required this.pathSeparator,
    required this.directoryExists,
    required this.commandRunner,
  });

  factory EnvironmentChecker.system() {
    final processEnvironment = Platform.environment;
    final allowedEnvironment = <String, String>{
      for (final key in const [
        'ANDROID_HOME',
        'ANDROID_SDK_ROOT',
        'HOME',
        'USERPROFILE',
        'LOCALAPPDATA',
      ])
        key: ?processEnvironment[key],
    };

    return EnvironmentChecker(
      host: Platform.operatingSystem,
      environment: allowedEnvironment,
      home: allowedEnvironment['HOME'] ?? allowedEnvironment['USERPROFILE'],
      pathSeparator: Platform.pathSeparator,
      directoryExists: (path) => Directory(path).existsSync(),
      commandRunner: (executable, arguments) async {
        final process = await Process.run(executable, arguments);
        return CommandOutput(
          exitCode: process.exitCode,
          stdout: process.stdout.toString(),
          stderr: process.stderr.toString(),
        );
      },
    );
  }

  final String host;
  final Map<String, String> environment;
  final String? home;
  final String pathSeparator;
  final DirectoryExists directoryExists;
  final CommandRunner commandRunner;

  Future<List<CheckResult>> run() async {
    final policy = policyForHost(host);
    final results = <CheckResult>[];

    final flutterOutput = await _runCommand(
      results: results,
      name: 'Flutter',
      requirement: policy.flutter,
      executable: 'fvm',
      arguments: const ['flutter', '--version'],
    );
    if (flutterOutput != null) {
      _recordExactVersion(
        results: results,
        name: 'Flutter',
        requirement: policy.flutter,
        actual: parseFlutterVersion(flutterOutput.combined),
        expected: '3.47.2',
      );
      _recordExactVersion(
        results: results,
        name: 'Dart',
        requirement: policy.flutter,
        actual: parseDartVersion(flutterOutput.combined),
        expected: '3.13.2',
      );
    } else {
      results.add(
        CheckResult.failed(
          name: 'Dart',
          requirement: policy.flutter,
          message: 'not checked because Flutter is unavailable',
        ),
      );
    }

    final javaOutput = await _runCommand(
      results: results,
      name: 'Java',
      requirement: policy.android,
      executable: 'java',
      arguments: const ['-version'],
    );
    if (javaOutput != null) {
      final javaMajor = parseJavaMajor(javaOutput.combined);
      results.add(
        javaMajor != null && javaMajor >= 17 && javaMajor <= 25
            ? CheckResult.passed(
                name: 'Java',
                requirement: policy.android,
                message: 'version $javaMajor (supported range 17-25)',
              )
            : CheckResult.failed(
                name: 'Java',
                requirement: policy.android,
                message: javaMajor == null
                    ? 'version could not be parsed'
                    : 'version $javaMajor is outside supported range 17-25',
              ),
      );
    }

    final configOutput = await _runCommand(
      results: results,
      name: 'Flutter Android SDK configuration',
      requirement: RequirementLevel.informational,
      executable: 'fvm',
      arguments: const ['flutter', 'config', '--list'],
    );
    final sdkRoot = chooseAndroidSdk(
      flutterConfiguredPath: configOutput == null
          ? null
          : parseConfiguredAndroidSdk(configOutput.combined),
      environment: environment,
      home: home,
      host: host,
      directoryExists: directoryExists,
    );

    if (sdkRoot == null) {
      results.add(
        CheckResult.failed(
          name: 'Android SDK',
          requirement: policy.android,
          message: 'not found in Flutter configuration or standard locations',
        ),
      );
    } else {
      results.add(
        CheckResult.passed(
          name: 'Android SDK',
          requirement: policy.android,
          message: sdkRoot,
        ),
      );
      final missing = missingAndroidPackages(
        sdkRoot: sdkRoot,
        separator: pathSeparator,
        directoryExists: directoryExists,
      );
      results.add(
        missing.isEmpty
            ? CheckResult.passed(
                name: 'Android SDK packages',
                requirement: policy.android,
                message: 'all pinned packages are installed',
              )
            : CheckResult.failed(
                name: 'Android SDK packages',
                requirement: policy.android,
                message: 'missing: ${missing.join(', ')}',
              ),
      );

      await _recordTool(
        results: results,
        name: 'sdkmanager',
        requirement: RequirementLevel.informational,
        executable: [
          sdkRoot,
          'cmdline-tools',
          'latest',
          'bin',
          host == 'windows' ? 'sdkmanager.bat' : 'sdkmanager',
        ].join(pathSeparator),
        arguments: const ['--version'],
      );
    }

    await _recordTool(
      results: results,
      name: 'adb',
      requirement: RequirementLevel.informational,
      executable: 'adb',
      arguments: const ['version'],
    );

    if (host == 'macos') {
      await _recordTool(
        results: results,
        name: 'Xcode',
        requirement: policy.ios,
        executable: 'xcodebuild',
        arguments: const ['-version'],
      );
      await _recordTool(
        results: results,
        name: 'CocoaPods',
        requirement: policy.ios,
        executable: 'pod',
        arguments: const ['--version'],
      );
    }

    return results;
  }

  Future<CommandOutput?> _runCommand({
    required List<CheckResult> results,
    required String name,
    required RequirementLevel requirement,
    required String executable,
    required List<String> arguments,
  }) async {
    try {
      final output = await commandRunner(executable, arguments);
      if (output.exitCode == 0) return output;
      results.add(
        CheckResult.failed(
          name: name,
          requirement: requirement,
          message: _firstLine(output.combined, fallback: 'command failed'),
        ),
      );
    } on ProcessException {
      results.add(
        CheckResult.failed(
          name: name,
          requirement: requirement,
          message: 'command unavailable',
        ),
      );
    }
    return null;
  }

  Future<void> _recordTool({
    required List<CheckResult> results,
    required String name,
    required RequirementLevel requirement,
    required String executable,
    required List<String> arguments,
  }) async {
    final output = await _runCommand(
      results: results,
      name: name,
      requirement: requirement,
      executable: executable,
      arguments: arguments,
    );
    if (output != null) {
      results.add(
        CheckResult.passed(
          name: name,
          requirement: requirement,
          message: _firstLine(output.combined, fallback: 'available'),
        ),
      );
    }
  }

  static void _recordExactVersion({
    required List<CheckResult> results,
    required String name,
    required RequirementLevel requirement,
    required String? actual,
    required String expected,
  }) {
    results.add(
      actual == expected
          ? CheckResult.passed(
              name: name,
              requirement: requirement,
              message: 'version $actual',
            )
          : CheckResult.failed(
              name: name,
              requirement: requirement,
              message: actual == null
                  ? 'version could not be parsed; expected $expected'
                  : 'version $actual; expected $expected',
            ),
    );
  }

  static String _firstLine(String value, {required String fallback}) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? fallback : trimmed.split(RegExp(r'[\r\n]')).first;
  }
}
