/** Linux process ownership only; never accesses business data or AI fences. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync, openSync, closeSync, readSync,
  lstatSync, fstatSync, realpathSync, linkSync, constants } from 'node:fs';
import { join, resolve } from 'node:path';

const bootIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const refused = 'Runtime lock ownership unavailable; preserve the lock for inspection';
function validIdentity(value) {
  return value && Object.keys(value).sort().join(',') === 'bootId,pid,startTicks' &&
    Number.isSafeInteger(value.pid) && value.pid > 0 &&
    typeof value.startTicks === 'string' && /^[1-9][0-9]{0,19}$/.test(value.startTicks) &&
    typeof value.bootId === 'string' && bootIdPattern.test(value.bootId);
}
function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.uid === right.uid &&
    left.mode === right.mode && left.size === right.size && left.mtimeMs === right.mtimeMs;
}
function privateFile(stat, links) {
  assert(stat.isFile() && stat.uid === process.getuid() &&
    (stat.mode & 0o777) === 0o600 && stat.nlink === links && stat.size > 0 && stat.size <= 512, refused);
}
function snapshot(path, links = 1) {
  const before = lstatSync(path);
  privateFile(before, links);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    assert(sameFile(before, fstatSync(fd)), refused);
    const buffer = Buffer.alloc(513);
    const length = readSync(fd, buffer, 0, buffer.length, 0);
    const after = fstatSync(fd);
    privateFile(after, links);
    assert(length === before.size && sameFile(before, after) && sameFile(before, lstatSync(path)), refused);
    const text = buffer.subarray(0, length).toString('utf8');
    const identity = JSON.parse(text);
    assert(validIdentity(identity), refused);
    return { stat: after, text, identity };
  } finally { closeSync(fd); }
}

function unchanged(path, previous, links = 1) {
  const current = snapshot(path, links);
  assert(sameFile(current.stat, previous.stat) && current.text === previous.text, refused);
  return current;
}

export function processIdentity() {
  assert.equal(process.platform, 'linux', refused);
  const stat = readFileSync(`/proc/${process.pid}/stat`, 'utf8');
  const identity = {
    pid: process.pid,
    startTicks: stat.slice(stat.lastIndexOf(')') + 1).trim().split(/\s+/)[19],
    bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(),
  };
  assert(validIdentity(identity), refused);
  return identity;
}

export function acquireRealAccountLock(directory) {
  const identity = processIdentity();
  assert.equal(realpathSync(directory), resolve(directory), refused);
  const parent = lstatSync(directory);
  assert(parent.isDirectory() && parent.uid === process.getuid() && (parent.mode & 0o077) === 0, refused);
  const path = join(directory, 'real-account.lock');
  const create = () => {
    const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { writeFileSync(fd, JSON.stringify(identity)); } finally { closeSync(fd); }
    return snapshot(path);
  };
  let owned, recoveredPreviousBoot = false;
  try { owned = create(); }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const previous = snapshot(path);
    // Boot mismatch proves that this process cannot still be running. Missing
    // PID, elapsed time or a command-line mismatch alone never authorizes recovery.
    assert(previous.identity.bootId !== identity.bootId, refused);
    // A single atomic, persistent claim elects one reclaimer for this old boot.
    // Retain the old metadata: removing the claim would let a delayed contender
    // unlink a replacement lock. A crash during reclamation fails closed.
    const recovered = `${path}.recovered-${previous.identity.bootId}`;
    linkSync(path, recovered);
    unchanged(recovered, previous, 2);
    unchanged(path, previous, 2);
    unlinkSync(path);
    owned = create(); // Still exclusive, including against older launchers.
    recoveredPreviousBoot = true;
  }
  let released = false;
  return { recoveredPreviousBoot, release() {
    if (released) return;
    unchanged(path, owned);
    unlinkSync(path);
    released = true;
  } };
}
