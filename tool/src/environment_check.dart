enum RequirementLevel { required, warning, informational }

typedef DirectoryExists = bool Function(String path);

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
