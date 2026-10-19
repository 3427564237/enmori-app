/** Explicit local configuration only. Never discover keys or log file contents. */
import { constants, openSync, fstatSync, readFileSync, closeSync, realpathSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { TicketmasterBrowseSource } from '../backend/dist/src/event-browse/infrastructure/ticketmaster-browse-source.js';

function privateJson(path) {
  if (!isAbsolute(path) || realpathSync(path) !== path) throw Error('EVENT_CONFIGURATION_UNAVAILABLE');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600 || stat.size > 16384) {
      throw Error('EVENT_CONFIGURATION_UNAVAILABLE');
    }
    return JSON.parse(readFileSync(fd, 'utf8'));
  } finally { closeSync(fd); }
}

export function retainedCoreEvents(directory, requested, enabled) {
  if (!requested) return { configuration: 'not_requested' };
  try {
    const config = privateJson(join(directory, 'event-source.json'));
    if (Object.keys(config).sort().join(',') !== 'credentialFile,musicInterestTagId' ||
        typeof config.musicInterestTagId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(config.musicInterestTagId) || typeof config.credentialFile !== 'string') {
      throw Error('EVENT_CONFIGURATION_UNAVAILABLE');
    }
    const credential = privateJson(config.credentialFile);
    if (credential.termsAccepted !== true || typeof credential.apiKey !== 'string' ||
        !credential.apiKey || /\s/.test(credential.apiKey)) throw Error('EVENT_CONFIGURATION_UNAVAILABLE');
    return {
      configuration: 'configured',
      input: {
        source: new TicketmasterBrowseSource({ key: () => credential.apiKey, enabled }),
        musicInterestTagId: config.musicInterestTagId,
      },
    };
  } catch { return { configuration: 'unavailable' }; }
}
