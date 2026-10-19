#!/usr/bin/env python3
"""Small local entry for the existing retained runtime and private phone handoff."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import time
import urllib.error
import urllib.request

REPO = Path(__file__).resolve().parents[1]
PKG = 'com.enmori.app.coretest'

def read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return {}

def directory(path):
    path = path.absolute()
    stat = path.stat()
    if path.resolve() != path or not path.is_dir() or stat.st_uid != os.getuid() or stat.st_mode & 0o077:
        raise ValueError('Use the original operator-owned private runtime directory')
    if (path / 'enmori-retained-core-v1').read_text() != 'ENMORI retained core v1\n':
        raise ValueError('Retained runtime marker missing')
    return path

def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=1):
            return True
    except OSError:
        return False

def owner_matches(lock):
    try:
        pid = int(lock['pid'])
        process = Path('/proc') / str(pid)
        ticks = process.joinpath('stat').read_text().rsplit(')', 1)[1].split()[19]
        command = process.joinpath('cmdline').read_bytes().split(b'\0')
        return (ticks == lock['startTicks'] and
                Path('/proc/sys/kernel/random/boot_id').read_text().strip() == lock['bootId'] and
                any(x.endswith(b'tool/run_retained_core.mjs') for x in command))
    except (OSError, ValueError, KeyError):
        return False

def status(root):
    lock = read_json(root / 'running.lock')
    owned = owner_matches(lock)
    ready = read_json(root / 'phone-ready.json')
    reachable = False
    if listening(9380):
        try:
            context = ssl.create_default_context(cafile=str(root / 'phone-certificate.pem'))
            urllib.request.urlopen('https://127.0.0.1:9380/v1/me/profile', context=context, timeout=2)
        except urllib.error.HTTPError as error:
            reachable = error.code == 401
        except (OSError, ValueError):
            pass
    result = {'ownedRunner': owned, 'lockPresent': (root / 'running.lock').exists(),
              'backendReachable': reachable, 'authReachable': listening(9099),
              'ready': bool(owned and reachable and ready.get('ready')),
              'aiConfiguredAvailable': ready.get('aiEnabled', False),
              'aiMaintenanceHealthy': ready.get('aiMaintenanceHealthy'),
              'eventsEnabled': ready.get('eventsProviderEnabled', False),
              'stopRequested': (root / 'stop-requested').exists(),
              'lastStop': read_json(root / 'last-stop.json')}
    if result['lockPresent'] and not owned:
        result['attention'] = 'Legacy or stale lock; do not delete or start a duplicate runtime'
    return result

def node_path(explicit):
    candidates = [explicit] if explicit else [shutil.which('node'), *sorted(
        (Path.home() / '.local/share/pnpm/store/v11/links/@/node/24.19.0').glob('*/node_modules/node/bin/node'))]
    for item in candidates:
        if item and subprocess.run([str(item), '--version'], capture_output=True, text=True).stdout.strip() == 'v24.19.0':
            return str(item)
    raise ValueError('Existing Node 24.19.0 required; supply --node. Nothing is installed automatically')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'status', 'connect', 'stop'])
    parser.add_argument('--directory', type=Path, default=Path.home() / '.local/state/enmori-core-verification-oct19')
    parser.add_argument('--node')
    parser.add_argument('--ai', action='store_true')
    parser.add_argument('--events', action='store_true')
    parser.add_argument('--serial')
    parser.add_argument('--apk', type=Path, default=REPO / 'build/deliverables/core-local-oct19/enmori-core-local-v7-debug.apk')
    parser.add_argument('--adb', default=str(Path.home() / 'Android/Sdk/platform-tools/adb'))
    parser.add_argument('--aapt', default=str(Path.home() / 'Android/Sdk/build-tools/36.0.0/aapt'))
    args = parser.parse_args()
    root = directory(args.directory)
    if args.action == 'status':
        print(json.dumps(status(root))); return 0
    if args.action == 'start':
        if (root / 'running.lock').exists():
            raise ValueError('Runtime lock exists; inspect status instead of starting again')
        node = node_path(args.node)
        if not (REPO / 'backend/dist/src/bootstrap/retained-core-runtime.js').exists():
            raise ValueError('Build the Backend once before starting')
        env = dict(os.environ, FIREBASE_EMULATORS_PATH=str(Path.home() / '.cache/firebase/emulators'))
        with open(root / 'launcher-private.log', 'ab') as log:
            os.chmod(log.name, 0o600)
            child = subprocess.Popen([node, 'tool/run_retained_core.mjs', str(root), '--phone',
                                      *(['--events'] if args.events else []), *(['--ai'] if args.ai else [])],
                                     cwd=REPO, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        print(json.dumps({'startedPid': child.pid, 'state': 'starting', 'next': 'Run status; model loading may take up to 120 seconds'})); return 0
    if args.action == 'stop':
        if not (root / 'running.lock').exists():
            print(json.dumps(status(root))); return 0
        (root / 'stop-requested').touch(mode=0o600)
        for _ in range(40):
            if not (root / 'running.lock').exists():
                result = status(root); print(json.dumps(result))
                return 0 if result['lastStop'].get('exportConfirmed') else 1
            time.sleep(1)
        print(json.dumps({'state': 'stopping', 'detail': 'Waiting for original work/export. No process was killed.'})); return 2
    if not args.serial:
        raise ValueError('connect requires an explicit --serial')
    if not status(root)['ready']:
        raise ValueError('Original owned runtime is not ready; inspect status first')
    from li_controlled_phone_handoff import transfer, READ_READY
    import shlex
    subprocess.run([args.adb, '-s', args.serial, 'shell', 'am', 'start', '-n', PKG + '/com.enmori.app.MainActivity'],
                   check=True, capture_output=True, timeout=15)
    # Do not force-stop an app with an unknown original operation merely to reconnect.
    for _ in range(8):
        ready = subprocess.run([args.adb, '-s', args.serial, 'shell', f'run-as {PKG} sh -c '+shlex.quote(READ_READY)], capture_output=True, timeout=10)
        if ready.returncode == 0 and b'nonce' in ready.stdout:
            report = transfer(args.apk.absolute(), root / 'handoff.json', args.serial, adb=args.adb, aapt=args.aapt, package=PKG)
            print(json.dumps(report)); return 0 if report['status'] == 'Pass' else 1
        time.sleep(1)
    print(json.dumps({'state': 'app_open_without_new_handoff', 'detail': 'No waiting nonce. Existing app session preserved; no install, reset or force-stop performed.'})); return 2

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        # Fixed local command/config categories only; never dump private service content.
        print(json.dumps({'state': 'unavailable', 'category': type(error).__name__,
                          'detail': str(error) if isinstance(error, ValueError) else 'Local command or file unavailable'}))
        raise SystemExit(1)
