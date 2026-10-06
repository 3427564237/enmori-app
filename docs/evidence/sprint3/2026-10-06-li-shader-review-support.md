# LI — clean Flutter shader/test reproduction for SHI

Scope: support SHI's existing independent Friend validation, without modifying product theme/shader behavior, skipping tests or replacing SHI's disposition. Exact checked PR #54 head: `9cfb9a9e23d4a589e59c40cde78cceadd617cd70`. No file at that head was edited. LI used the existing FVM Flutter 3.47.2 / Dart 3.13.2 SDK on Linux x64 and recreated generated project assets.

## Actual clean run

```sh
fvm flutter clean
fvm flutter pub get
fvm flutter analyze --no-pub
fvm flutter test --no-pub test/features/blocker_slices_test.dart --name Friend --reporter expanded
fvm flutter test --no-pub --reporter expanded
```

All commands completed: analysis zero issues; targeted Friend 3/3 Pass; complete suite 150/150 Pass, no skips. Tracked tree stayed clean, including pubspec/lockfiles. No SDK patch, source asset copy, splash/theme override, dependency change or test exclusion. The compiled framework shader exists after this clean run.

Observed preflight: framework source exists, 3,873 bytes, SHA-256 `4dd56d9448e5a3589847a32117cb376849b42efb89d3025f3459be4e41467823`; compiled test asset `build/unit_test_assets/shaders/ink_sparkle.frag` exists, 13,472 bytes, SHA-256 `ae7b534a900971131e73bf9cee9b038b5bb9450a582a516c9dc5ab3c43c75f3a`. Flutter package resolves to the existing pinned `/home/miku/fvm/versions/3.47.2/packages/flutter`. These hashes describe LI's run; compiled-byte hashes are not a cross-platform acceptance requirement.

## Small diagnostic on SHI's checkout

First use the exact checked head in a clean checkout; preserve uncommitted files. Confirm `fvm flutter --version` and `fvm dart --version` use the approved baseline. Save the following temporary diagnostic as `build/pr54_shader_preflight.dart` (create the build directory if needed), then run `fvm dart run build/pr54_shader_preflight.dart` before/after the clean commands above:

```dart
import 'dart:io';
import 'dart:isolate';

Future<void> main() async {
  final uri = await Isolate.resolvePackageUri(
    Uri.parse('package:flutter/src/material/shaders/ink_sparkle.frag'),
  );
  final source = uri == null ? null : File.fromUri(uri);
  final compiled = File('build/unit_test_assets/shaders/ink_sparkle.frag');
  print('Flutter package shader: ${uri?.toFilePath()}');
  print('Framework shader exists: ${source?.existsSync() ?? false}');
  print('Compiled test shader exists: ${compiled.existsSync()}');
  if (compiled.existsSync()) print('Compiled bytes: ${compiled.lengthSync()}');
}
```

The diagnostic was run here and reports both files present. The pinned Flutter tool's `packages/flutter_tools/lib/src/asset.dart`, `_getFrameworkShaders`, includes the framework shader from `packages/flutter/lib/src/material/shaders`; Material InkSparkle loads `shaders/ink_sparkle.frag`. This makes package/SDK source resolution and generated test-bundle presence the first two boundaries to check, rather than changing application behavior.

If the framework source resolves missing, retain the resolved path/version and use a complete approved baseline SDK; do not fabricate an app asset or patch the SDK. If source exists but the compiled asset is still absent after the clean test build, retain the first build/test failure and use the verified baseline review environment. If both exist but runtime still fails, retain that mismatch for SHI's environment diagnosis; this run does not prove its remote root cause.

SHI still needs to independently execute the Friend tests on the exact head or an accepted supported review environment and publish an actual conclusion. LI's 150/150 and ZHOU's separate 150/150 runs do not relabel SHI's recorded 142/8 failure as a pass. New-head Android/whole-module acceptance, merge, real-account/provider activation, UAT and Release remain separate.
