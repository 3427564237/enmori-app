import datetime
import json
import os
from pathlib import Path
import socket
import ssl
import time
import urllib.error
import urllib.request
import zoneinfo

base = Path('/tmp/enmori-li124-session-path.txt').read_text().strip()
base = Path(base)
session = base / 'session'
out = Path('build/li-event-runtime/private-operator-probe.json')

def status():
    return json.loads((session / 'status.json').read_text())

def until(check, timeout=30):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            value = check()
            if value:
                return value
        except FileNotFoundError:
            pass
        time.sleep(.2)
    raise RuntimeError('Private operator acknowledgment unavailable')

until(lambda: (session / 'handoff.json').exists())
handoff = json.loads((session / 'handoff.json').read_text())
trust = ssl.create_default_context(cafile=str(base / 'cert.pem'))
observations = []
checks = []

def read(path, expected, token=None):
    headers = {} if token is None else {'authorization': 'Bearer ' + token}
    request = urllib.request.Request(handoff['baseUri'].rstrip('/') + path, headers=headers)
    try:
        response = urllib.request.urlopen(request, context=trust, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        assert response.status == expected
        if path.startswith('/v1/event-browse'):
            assert response.headers.get('cache-control') == 'no-store'
        body = json.load(response)
    checks.append({'route': '/v1/event-browse/{browseId}' if path.startswith('/v1/event-browse/') else path, 'status': expected})
    return body

initial = until(lambda: status() if status().get('eventBrowse') == {'configured': True, 'enabled': False, 'pending': 0} else None)
assert initial['eventControlFailed'] is False
assert initial['modelAttempts'] == 0 and initial['operatorHold'] is False
read('/v1/event-browse', 401)
request = urllib.request.Request(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key',
    data=json.dumps({'email': handoff['email'], 'password': handoff['password'], 'returnSecureToken': True}).encode(),
    headers={'content-type': 'application/json'},
)
with urllib.request.urlopen(request, timeout=15) as response:
    token = json.load(response)['idToken']
for path in ['/v1/event-browse', '/v1/event-browse/tm_c3ludGhldGlj']:
    assert read(path, 503, token)['error']['code'] == 'SERVICE_UNAVAILABLE'
for path in ['/v1/me/profile', '/v1/me/settings', '/v1/me/personas']:
    read(path, 200, token)

def write_command(value):
    target = session / 'event-command.json'
    assert not target.exists()
    temporary = session / 'li-event-command.tmp'
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.rename(temporary, target)

def acknowledged(enabled, failed):
    if (session / 'event-command.json').exists():
        return None
    current = status()
    if current.get('eventBrowse', {}).get('enabled') == enabled and current.get('eventControlFailed') == failed:
        return current
    return None

write_command({'enabled': True})
observations.append(until(lambda: acknowledged(True, False)))
# No Event request is sent while enabled: this proves private control/file/TLS
# behavior without using real content or any external source link.
write_command({'enabled': True, 'undeclared': True})
observations.append(until(lambda: acknowledged(False, True)))
assert read('/v1/event-browse', 503, token)['error']['code'] == 'SERVICE_UNAVAILABLE'
read('/v1/me/profile', 200, token)
write_command({'enabled': False})
observations.append(until(lambda: acknowledged(False, False)))
for current in observations:
    assert current['phase'] == 'running' and current['modelAttempts'] == 0
    assert current['modelPending'] == 0 and current['operatorHold'] is False

# Stop is made visible before the queued enable command. Neither a queued
# command nor closed-process data can authorize another source request.
fd = os.open(session / 'stop', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
os.close(fd)
write_command({'enabled': True})
def cleanup():
    closed = status()
    worker = json.loads((session / 'worker-exit.json').read_text())
    operator = json.loads((session / 'operator-exit.json').read_text())
    if closed.get('phase') == 'closed' and closed.get('cleanupConfirmed') and not closed.get('operatorHold') and worker.get('innerProfileRemoved') and operator.get('outerProfileRemoved') and operator.get('portsFree') and operator.get('exitCode') == 0:
        return {'closed': closed, 'worker': worker, 'operator': operator}
    return None
receipts = until(cleanup)
queued_ignored = (session / 'event-command.json').exists()
assert queued_ignored
(session / 'event-command.json').unlink()
for port in [8080, 9099, 4400, 4500, 9150]:
    with socket.socket() as proof:
        proof.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        proof.bind(('127.0.0.1', port))
result = {
    'recordedAtSGT': datetime.datetime.now(zoneinfo.ZoneInfo('Asia/Singapore')).isoformat(),
    'scope': 'actual reviewed Linux operator/private files/TLS/Auth/Firestore; no real-provider success exercised, modelAttempts0',
    'status': 'Pass', 'initialGate': initial['eventBrowse'], 'httpChecks': checks,
    'privateControl': [{'enabled': s['eventBrowse']['enabled'], 'eventControlFailed': s['eventControlFailed'], 'modelAttempts': s['modelAttempts']} for s in observations],
    'queuedEnableIgnoredDuringStop': queued_ignored, 'receipts': receipts,
    'fivePortsIndependentlyFree': True,
    'probeSentEventRequestsWhileEnabled': False,
    'providerEgressIndependentlyCounted': False,
    'providerSuccessOrRealContentClaimed': False,
    'actualContentGeneration': 0, 'deviceOrBrowserPerformed': False,
}
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
