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
