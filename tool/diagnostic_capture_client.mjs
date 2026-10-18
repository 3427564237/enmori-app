import { spawnSync } from 'node:child_process';
import { ControlledPhoneDiagnostics } from '../backend/dist/src/bootstrap/controlled-phone-diagnostics.js';
import { ControlledDiagnosticRetention } from '../backend/dist/src/bootstrap/controlled-diagnostic-retention.js';

// Fixed installed command only. No shell, caller-selected executable/path/UID,
// environment credentials, raw child error or implicit installation.
export function installedCapture(command, record) {
  if (process.platform !== 'linux' || !['append', 'health'].includes(command)) throw new Error('CAPTURE_UNAVAILABLE');
  const result = spawnSync('/usr/bin/sudo', ['-n', '--', '/usr/local/sbin/enmori-diagnostic-capture', command], {
    input: command === 'append' ? JSON.stringify(record) : '', encoding: 'utf8',
    env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C' },
    stdio: ['pipe', 'pipe', 'pipe'], timeout: 2000, killSignal: 'SIGKILL', maxBuffer: 4096,
  });
  if (result.error || result.signal || result.status !== 0 || result.stdout !== 'CAPTURE_OK\n' || result.stderr !== '') {
    throw new Error('CAPTURE_UNAVAILABLE');
  }
}

/** The seam invokes only synthetic helpers in local tests. Live CLI never
 * accepts a replacement command; actual OS authorization belongs to sudo. */
export function createHostDiagnostics(invoke = installedCapture) {
  const retention = new ControlledDiagnosticRetention();
  return new ControlledPhoneDiagnostics(record => {
    const validated = retention.read(record, true);
    if (!validated) throw new Error('CAPTURE_UNAVAILABLE');
    invoke('append', validated);
  }, () => { invoke('health'); return retention.healthy; });
}
