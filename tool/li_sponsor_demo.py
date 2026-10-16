#!/usr/bin/env python3
"""Manual preparation of the existing owned Sponsor preview; never starts a service.

No credentials or model/provider content are printed. No loop, keepalive change, data reset, install, log collection or model generation
retry is provided. next-round restarts only the dedicated app after confirmed deletion.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import urllib.request
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ADB = '/home/miku/Android/Sdk/platform-tools/adb'
PKG = 'com.enmori.app.personatest'
POINTER = Path('/tmp/enmori-li-phone-final-path.txt')
IDENTITY = ROOT / 'build/distributions/li-sponsor-demo-20261016/apk-identity.json'


class Refused(Exception):
    pass


def require(value, reason):
    if not value:
        raise Refused(reason)


def private(path, directory=False):
    st = path.lstat()
    require(not path.is_symlink() and st.st_uid == os.getuid()
            and st.st_mode & 0o077 == 0, 'private_file_ownership')
    require(stat.S_ISDIR(st.st_mode) if directory else stat.S_ISREG(st.st_mode),
            'private_file_type')
    require(path.resolve() == path, 'private_path_symlink')
    return st


def read_private(path):
    private(path)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as file:
        require(os.fstat(file.fileno()).st_size <= 32768, 'private_file_size')
        return file.read(32769)


def quiet(value):
    return (value.get('scope') == 'isolated-phone-service'
            and value.get('phase') == 'running'
            and value.get('accepting') is True
            and value.get('maintenanceHealthy') is True
            and value.get('retirementConfirmed') is True
            and value.get('admission') == 'open'
            and value.get('httpsListening') is True
            and value.get('adapterState') in ('stopped', 'not_checked')
            and all(value.get(k) == 0 for k in
                    ['modelPending', 'compilerPending', 'activeCalls', 'nonTerminal'])
            and all(value.get(k) is False for k in
                    ['quarantined', 'operatorHold', 'stopRequested', 'eventControlFailed'])
            and value.get('eventBrowse', {}).get('configured') is True
            and value.get('eventBrowse', {}).get('pending') == 0)


def status(session):
    path = session / 'status.json'
    require(-2 <= time.time() - private(path).st_mtime < 5, 'service_status_stale')
    value = json.loads(read_private(path))
    require(quiet(value), 'original_service_busy_or_held_do_not_reset')
    return value


def twice_quiet(session):
    first = status(session)
    time.sleep(0.7)
    second = status(session)
    require(first['modelAttempts'] == second['modelAttempts'], 'model_activity_changed')
    return second


def adb(serial, *args):
    result = subprocess.run([ADB, '-s', serial, *args], capture_output=True, timeout=30)
    require(result.returncode == 0, 'dedicated_phone_command_failed')
    return result.stdout


def installed(serial):
    identity = json.loads(IDENTITY.read_bytes())
    require(identity['package'] == PKG, 'unexpected_package')
    apk = ROOT / identity['relativePath']
    require(apk.is_file() and hashlib.sha256(apk.read_bytes()).hexdigest()
            == identity['sha256'], 'local_apk_identity_changed')
    require(adb(serial, 'get-state').strip() == b'device', 'phone_not_connected')
    path = adb(serial, 'shell', 'pm', 'path', PKG).decode().strip()
    require(re.fullmatch(r'package:/data/app/[A-Za-z0-9_./=+~\-]+/base\.apk', path),
            'dedicated_package_unavailable')
    digest = adb(serial, 'exec-out', 'sha256sum', path[len('package:'):]).decode().split()[0]
    require(digest == identity['sha256'], 'installed_apk_identity_changed')
    return apk


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        raise Refused('model_redirect_refused')


def remote_json(binding, path, payload=None):
    url = binding['endpoint'].rstrip('/') + path
    origin = urlsplit(binding['endpoint'])
    require(origin.scheme == 'http' and origin.hostname in ('127.0.0.1', '::1')
            and origin.path in ('', '/') and not origin.username and not origin.password
            and not origin.query and not origin.fragment, 'unexpected_model_origin')
    request = urllib.request.Request(url, data=None if payload is None else
                                     json.dumps(payload).encode(),
                                     headers={'Content-Type': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=60) as response:
        raw = response.read(2_000_001)
        require(len(raw) <= 2_000_000, 'model_metadata_size')
        return json.loads(raw)


def matching_models(value, binding, resident=False):
    matches = [m for m in value.get('models', []) if
               m.get('name') == binding['reference'] or m.get('model') == binding['reference']]
    if not matches and resident:
        return False
    require(len(matches) == 1, 'model_identity_not_unique')
    model = matches[0]
    require(model.get('digest') == binding['manifestDigest'], 'model_digest_changed')
    size = re.fullmatch(r'([0-9]+(?:\.[0-9]+)?)B', model.get('details', {}).get('parameter_size', ''))
    require(size and 8 <= float(size[1]) < 10 and
            model['details'].get('family', '').lower().startswith('qwen'),
            'formal_model_family_or_size_changed')
    if resident:
        require(model.get('context_length') == 8192, 'resident_context_changed')
    return True


def gate(session, enabled):
    if status(session)['eventBrowse']['enabled'] == enabled:
        return
    target, temporary = session / 'event-command.json', session / 'li-sponsor-command.tmp'
    require(not target.exists() and not temporary.exists(), 'source_command_already_pending')
    fd = os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as file:
        json.dump({'enabled': enabled}, file)
    os.rename(temporary, target)
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if not target.exists() and status(session)['eventBrowse']['enabled'] == enabled:
            return
        time.sleep(0.2)
    raise Refused('source_acknowledgment_unconfirmed_do_not_repeat')


def require_deleted_page(focus, raw):
    require(any(PKG in line for line in focus.splitlines() if 'mCurrentFocus=' in line),
            'show_confirmed_deleted_ai_page_first')
    start, end = raw.find('<?xml'), raw.find('</hierarchy>')
    require(start >= 0 and end >= 0, 'deleted_page_not_observed')
    tree = ET.fromstring(raw[start:end + len('</hierarchy>')])
    require(any(n.get('content-desc') == 'Conversation deleted.' or n.get('text') == 'Conversation deleted.'
                for n in tree.iter('node')), 'show_confirmed_deleted_ai_page_first')


def execute(args):
    base = Path(read_private(args.runtime_pointer).decode().strip())
    private(base, True)
    config = json.loads(read_private(base / 'operator-config.json'))
    session = base / 'session'
    private(session, True)
    require(config['phone']['sessionDirectory'] == str(session), 'original_session_mismatch')
    apk = installed(args.serial)
    lock = session / 'li-sponsor-preparation.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    inode = os.fstat(fd).st_ino
    os.close(fd)
    release_lock = True
    try:
        before = twice_quiet(session)
        if args.command in ('connect', 'next-round'):
            if args.command == 'next-round':
                focus = adb(args.serial, 'shell', 'dumpsys', 'window').decode()
                require(any(PKG in line for line in focus.splitlines() if 'mCurrentFocus=' in line),
                        'show_confirmed_deleted_ai_page_first')
                raw = adb(args.serial, 'exec-out', 'uiautomator', 'dump', '/dev/tty').decode()
                require_deleted_page(focus, raw)
                require(twice_quiet(session)['modelAttempts'] == before['modelAttempts'],
                        'product_activity_changed_do_not_restart')
                adb(args.serial, 'shell', 'am', 'force-stop', PKG)
                adb(args.serial, 'shell', 'am', 'start', '-W', '-n', PKG + '/com.enmori.app.MainActivity')
                time.sleep(2)
            # The existing helper verifies installed hash, app nonce and CONSUMED.
            from li_controlled_phone_handoff import transfer
            receipt = transfer(apk, session / 'handoff.json', args.serial, adb=ADB,
                               aapt='/home/miku/Android/Sdk/build-tools/36.0.0/aapt')
            require(receipt.get('status') == 'Pass' and receipt.get('configurationConsumed') is True,
                    'private_handoff_not_consumed_inspect_original')
            result = {'privateHandoffConsumed': True}
        elif args.command == 'off':
            gate(session, False)
            result = {'activitySourceEnabled': False}
        else:
            from li_controlled_phone_handoff import handoff
            _, port = handoff(session / 'handoff.json')
            mappings = [line.split()[-2:] for line in adb(args.serial, 'reverse', '--list').decode().splitlines()]
            require(all([f'tcp:{p}', f'tcp:{p}'] in mappings for p in (9099, port)),
                    'phone_reverse_missing_use_private_connect')
            binding = config['binding']
            require(binding['mode'] == 'formal-9b', 'unexpected_model_mode')
            require(remote_json(binding, '/api/version').get('version') == binding['ollamaVersion'],
                    'model_service_version_changed')
            matching_models(remote_json(binding, '/api/tags'), binding)
            resident = matching_models(remote_json(binding, '/api/ps'), binding, True)
            warmed = False
            if not resident:
                # Manual one-shot readiness recovery, only on the quiet original.
                focus = adb(args.serial, 'shell', 'dumpsys', 'window').decode()
                require(any(PKG in line for line in focus.splitlines() if 'mCurrentFocus=' in line),
                        'keep_enmori_foreground_before_manual_preparation')
                adb(args.serial, 'shell', 'input', 'keyevent', 'KEYCODE_HOME')
                try:
                    twice_quiet(session)
                    release_lock = False  # Unknown completion keeps this operator's lock.
                    response = remote_json(binding, '/api/generate', {
                        'model': binding['reference'], 'prompt': '', 'stream': False,
                        'options': {'num_ctx': 8192},
                    })
                    require(response.get('done') is True and response.get('response') == '',
                            'empty_readiness_not_confirmed_no_retry')
                    warmed = True
                    release_lock = True
                finally:
                    adb(args.serial, 'shell', 'am', 'start', '-n', PKG + '/com.enmori.app.MainActivity')
                require(matching_models(remote_json(binding, '/api/ps'), binding, True),
                        'model_not_resident_after_readiness')
            require(twice_quiet(session)['modelAttempts'] == before['modelAttempts'],
                    'product_model_activity_changed')
            gate(session, True)
            result = {'installedApkMatches': True, 'originalQuiet': True,
                      'formal9BResidentNow': True, 'manualEmptyPreload': warmed,
                      'activitySourceEnabled': True, 'productGenerationAdded': 0}
        print(json.dumps({'result': 'Pass', **result}))
    finally:
        if release_lock and lock.exists() and lock.lstat().st_ino == inode:
            lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'connect', 'next-round', 'off'])
    parser.add_argument('--serial', default='10AF5N20E0004UH')
    parser.add_argument('--runtime-pointer', type=Path, default=POINTER)
    args = parser.parse_args()
    try:
        execute(args)
        return 0
    except Refused as error:
        print(json.dumps({'result': 'Blocked', 'reason': str(error)}))
    except Exception:
        # Never expose a private path, upstream body or credential-bearing error.
        print(json.dumps({'result': 'Blocked', 'reason': 'preparation_unconfirmed_inspect_original_no_reset'}))
    return 1


if __name__ == '__main__':
    sys.exit(main())
