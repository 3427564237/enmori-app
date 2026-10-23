#!/usr/bin/env python3
"""Operate the existing real Firebase account composition on localhost only."""
import argparse
import hashlib
import shlex
import json
import os
from pathlib import Path
import signal
import ssl
import subprocess
import time
import urllib.request
import urllib.error
from core_local import node_path

REPO = Path(__file__).resolve().parents[1]
ROOT = Path.home() / '.local/state/enmori-real-auth-oct19'

def read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return {}

def owned(lock):
    try:
        pid = int(lock['pid'])
        process = Path('/proc') / str(pid)
        return (process.joinpath('stat').read_text().rsplit(')', 1)[1].split()[19] == lock['startTicks']
                and Path('/proc/sys/kernel/random/boot_id').read_text().strip() == lock['bootId']
                and any(arg.endswith(b'tool/run_real_account_local.mjs') for arg in process.joinpath('cmdline').read_bytes().split(b'\0')))
    except (OSError, ValueError, KeyError):
        return False

def status(root, config):
    owner = owned(read_json(root / 'real-account.lock'))
    state = read_json(root / 'real-account-status.json')
    reachable = False
    if owner:
        try:
            urllib.request.urlopen('https://127.0.0.1:9381/v1/me/onboarding',
                context=ssl.create_default_context(cafile=config['certificatePath']), timeout=3)
        except urllib.error.HTTPError as error:
            reachable = error.code == 401
        except (OSError, ValueError):
            pass
    return {'ownedRunner': owner, 'httpsIdentityGate': reachable,
            'ready': bool(owner and reachable and state.get('ready')),
            'lastState': state, 'lockPresent': (root / 'real-account.lock').exists()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'status', 'stop', 'connect'])
    parser.add_argument('--directory', type=Path, default=ROOT)
    parser.add_argument('--serial')
    parser.add_argument('--apk', type=Path, default=REPO / 'build/deliverables/real-account-oct20/enmori-real-account-v8-debug.apk')
    args = parser.parse_args()
    root = args.directory.absolute()
    if root.resolve() != root or root.stat().st_uid != os.getuid() or root.stat().st_mode & 0o077:
        raise ValueError('Private original account directory required')
    config_path = root / 'local-backend.json'
    if config_path.is_symlink() or config_path.stat().st_uid != os.getuid() or config_path.stat().st_mode & 0o077:
        raise ValueError('Private original configuration required')
    config = read_json(config_path)
    if config.get('projectId') != 'enmori-rmvp-controlled' or config.get('host') != '127.0.0.1' or config.get('port') != 9381:
        raise ValueError('Unexpected account runtime target')
    lock_path = root / 'real-account.lock'
    if args.action == 'start':
        # The Node runner owns the atomic lock check/acquisition, including
        # proven prior-boot recovery. Do not delete or pre-approve a lock here.
        for name in ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']:
            if name in os.environ:
                raise ValueError('Emulator environment is forbidden')
        with open(root / 'real-account-private.log', 'ab') as log:
            os.chmod(log.name, 0o600)
            child = subprocess.Popen([node_path(None), 'tool/run_real_account_local.mjs', str(config_path)],
                cwd=REPO, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        print(json.dumps({'phase':'starting', 'pid':child.pid})); return
    if args.action == 'stop':
        lock = read_json(lock_path)
        if lock_path.exists() and not owned(lock):
            raise ValueError('Stale ownership; no process was signalled')
        if owned(lock):
            os.kill(int(lock['pid']), signal.SIGTERM)
            for _ in range(20):
                if not lock_path.exists(): break
                time.sleep(1)
    if args.action == 'connect':
        if not args.serial or not status(root, config)['ready']:
            raise ValueError('A device serial and ready service are required')
        adb = str(Path.home() / 'Android/Sdk/platform-tools/adb')
        installed = subprocess.run([adb, '-s', args.serial, 'shell', 'pm', 'path', 'com.enmori.app'], check=True, capture_output=True, text=True).stdout.strip()
        if '\n' in installed or not installed.startswith('package:/data/app/') or not installed.endswith('/base.apk'):
            raise ValueError('Install and confirm the exact real-account candidate first')
        installed_path = installed.removeprefix('package:')
        digest = subprocess.run([adb, '-s', args.serial, 'shell', 'sha256sum', shlex.quote(installed_path)], check=True, capture_output=True, text=True).stdout.split()[0]
        if digest != hashlib.sha256(args.apk.read_bytes()).hexdigest():
            raise ValueError('Installed candidate does not match; nothing was launched')
        subprocess.run([adb, '-s', args.serial, 'reverse', 'tcp:9381', 'tcp:9381'], check=True, capture_output=True)
        subprocess.run([adb, '-s', args.serial, 'shell', 'am', 'start', '-n', 'com.enmori.app/.MainActivity'], check=True, capture_output=True)
        # No install, password entry, signout, reset, or cloud mutation here.
    print(json.dumps(status(root, config)))

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError):
        print(json.dumps({'phase':'unavailable', 'detail':'Check the original private configuration/runtime; nothing was reset.'}))
        raise SystemExit(1)
