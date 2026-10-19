#!/usr/bin/env python3
"""Deliver private synthetic inputs to the dedicated native integration APK."""
import argparse
import json
from pathlib import Path
import shlex
import subprocess
import time
from li_controlled_phone_handoff import transfer, READ_READY
from private_handoff_file import read_private_handoff_file


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--serial', required=True)
    parser.add_argument('--stage', choices=['register', 'records', 'saved-records', 'read'], default='register')
    args = parser.parse_args()
    adb = '/home/miku/Android/Sdk/platform-tools/adb'
    package = 'com.enmori.app.coretest'
    # Inputs are accepted only from the same operator-owned private file reader
    # as the TLS handoff. No content is passed in command arguments or output.
    identities = json.loads(read_private_handoff_file(args.directory / 'phone-identities.json'))
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        result = subprocess.run([adb, '-s', args.serial, 'shell',
                                 f'run-as {package} sh -c ' + shlex.quote(READ_READY)],
                                capture_output=True, timeout=10)
        if result.returncode == 0 and b'nonce' in result.stdout:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Native test readiness was not observed')
    report = transfer(args.apk, args.directory / 'handoff.json', args.serial,
                      adb=adb, aapt='/home/miku/Android/Sdk/build-tools/36.0.0/aapt', package=package)
    if report['status'] != 'Pass':
        print(json.dumps(report))
        return 2
    identities.update(readOnly=args.stage == 'read', resumeRecords=args.stage in ('records', 'saved-records'), recordSaved=args.stage == 'saved-records')
    script = ('umask 077; if [ -d code_cache ]; then d=code_cache; else d=cache; fi; '
              'test ! -e "$d/core-device-input.json" || exit 1; '
              'cat > "$d/core-device-input.tmp" && mv "$d/core-device-input.tmp" "$d/core-device-input.json"')
    result = subprocess.run([adb, '-s', args.serial, 'shell',
                             f'run-as {package} sh -c ' + shlex.quote(script)],
                            input=json.dumps(identities).encode(), capture_output=True, timeout=10)
    if result.returncode != 0:
        raise RuntimeError('Private test input delivery failed')
    print(json.dumps(report))
    return 0 if report['status'] == 'Pass' else 2


if __name__ == '__main__':
    raise SystemExit(main())
