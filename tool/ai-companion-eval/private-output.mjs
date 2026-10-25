import assert from 'node:assert/strict';
import { lstatSync, realpathSync, mkdirSync, writeFileSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';

export function outsideRepository(root, target) {
  const part = relative(resolve(root), resolve(target));
  return part === '..' || part.startsWith(`..${sep}`) || isAbsolute(part);
}

export function writeExclusiveJson(path, value) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); }
  finally { closeSync(fd); }
  const parent = openSync(dirname(path), 'r');
  try { fsyncSync(parent); } finally { closeSync(parent); }
}

export function createPrivateOutput(root, destination) {
  const out = resolve(destination), parent = dirname(out), stat = lstatSync(parent);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() &&
    (stat.mode & 0o077) === 0 && realpathSync(parent) === parent, 'Use an owner-only canonical parent directory');
  assert(outsideRepository(realpathSync(root), out), 'Raw reports must be outside the repository');
  mkdirSync(out, { mode: 0o700 });
  return { path: out, save(name, value) {
    assert(/^[a-zA-Z0-9_.-]+$/.test(name) && name !== '.' && name !== '..', 'Invalid artifact name');
    writeExclusiveJson(resolve(out, name), value);
  } };
}
