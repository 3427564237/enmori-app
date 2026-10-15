#!/usr/bin/env python3
"""Run only the owned synthetic Android flows after validating the built APK ID."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

TARGETS = {
    'demo': 'integration_test/controlled_demo_device_test.dart',
    'connected': 'integration_test/controlled_connected_device_test.dart',
    'activity': 'integration_test/activity_device_flow_test.dart',
    'offline': 'integration_test/offline_baseline_device_flow_test.dart',
    'combined': 'integration_test/baseline_device_flow_test.dart',
}
PACKAGE = 'com.enmori.app.personatest'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ('flutter', 'aapt', 'device'):
        parser.add_argument('--' + option, required=True)
    parser.add_argument('--flow', choices=TARGETS, default='combined')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    # Arguments are passed as argv, never interpolated into a shell command.
    environment = dict(os.environ, ENMORI_PERSONA_ANDROID_TEST='true')
    flutter = Path(shutil.which(args.flutter) or args.flutter).resolve(strict=True)
    sdk = flutter.parent.parent
    version = json.loads((sdk / 'bin/cache/flutter.version.json').read_text())
    if version.get('frameworkVersion') != '3.47.2':
        raise RuntimeError('The pinned Flutter SDK is required.')
    dart = sdk / 'bin/cache/dart-sdk/bin/dart'
    packages = sdk / 'packages/flutter_tools/.dart_tool/package_config.json'
    if not dart.is_file() or not packages.is_file():
        raise RuntimeError('The pinned SDK parser runtime is unavailable.')
    target = TARGETS[args.flow]
    subprocess.run([
        str(flutter), 'build', 'apk', '--debug', '--no-pub',
        '--target-platform', 'android-arm64', '--target', target,
    ], cwd=root, env=environment, check=True)
    # Flutter determines its teardown package before the integration rebuild.
    # A clean checkout otherwise falls back to the ordinary namespace. Never
    # let a missing/stale/ordinary APK reach device test or automatic teardown.
    apk = root / 'build/app/outputs/flutter-apk/app-debug.apk'
    if not apk.is_file():
        raise RuntimeError('The prebuilt dedicated test APK is missing.')
    badging = subprocess.run(
        [args.aapt, 'dump', 'badging', str(apk)],
        check=True, capture_output=True, text=True,
    ).stdout
    match = re.search(r"^package: name='([^']+)'", badging, re.MULTILINE)
    if match is None or match.group(1) != PACKAGE:
        raise RuntimeError('Refusing a non-dedicated APK before any device test.')
    # Use Flutter's exact SDK locator and APK parser. A badging-only check can
    # pass while Flutter's xmltree/launcher parse falls back to the ordinary
    # source namespace. Any SDK/tool/parser mismatch stops before device work.
    verified = subprocess.run([
        str(dart), '--packages=' + str(packages),
        str(root / 'tool/verify_baseline_apk.dart.template'), str(apk), args.aapt,
    ], cwd=root, env=environment, check=True, capture_output=True, text=True)
    if verified.stdout.strip() != 'ENMORI_APK_SDK_PARSER_VERIFIED':
        raise RuntimeError('The dedicated SDK package proof is unavailable.')
    print('ENMORI dedicated package and launcher verified; teardown uninstall disabled.', flush=True)
    # --no-uninstall controls teardown only. Flutter may still replace an old
    # owned test-package installation after a signature conflict. The SDK
    # parser above must identify only that dedicated package before launching.
    return subprocess.run([
        str(flutter), 'test', '--no-pub', '--no-uninstall', '-d', args.device,
        target, '--reporter', 'expanded',
    ], cwd=root, env=environment).returncode


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError, RuntimeError, ValueError):
        print('ENMORI guarded device runner stopped before further work.', file=sys.stderr)
        sys.exit(1)
