// Content-free verification binding for this explicit operator/test increment.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const git = args => execFileSync('git', args, {maxBuffer: 30 * 1024 * 1024});
const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => Buffer.from(value.toString('utf8').replaceAll('\r\n', '\n'));
const sourceCommit = git(['rev-parse', 'HEAD']).toString().trim();
const sourceTree = git(['rev-parse', 'HEAD^{tree}']).toString().trim();
const entries = git(['ls-tree', '-rz', '--full-tree', 'HEAD', '--',
  'backend/src', 'backend/test', 'backend/emulator-test', 'backend/scripts', 'backend/tsconfig.json',
  'lib', 'test', 'integration_test', 'android', 'api', 'tool', 'package.json', 'pnpm-lock.yaml',
  'pubspec.yaml', 'pubspec.lock', 'analysis_options.yaml', 'firebase.json', '.fvmrc', '.gitattributes',
]).toString().split('\0').filter(Boolean).map(value => {
  const match = /^(\d+) blob ([0-9a-f]+)\t(.+)$/u.exec(value); assert(match);
  return {gitBlob: match[2], path: match[3]};
});
const batch = execFileSync('git', ['cat-file', '--batch'], {
  input: entries.map(entry => entry.gitBlob + '\n').join(''), maxBuffer: 30 * 1024 * 1024,
});
let position = 0;
const sources = entries.map(entry => {
  const newline = batch.indexOf(10, position);
  const match = /^([0-9a-f]+) blob (\d+)$/u.exec(batch.subarray(position, newline).toString());
  assert(match); assert.equal(match[1], entry.gitBlob);
  const size = Number(match[2]), blob = batch.subarray(newline + 1, newline + 1 + size);
  position = newline + 1 + size + 1;
  const working = readFileSync(entry.path);
  assert.deepEqual(normalized(working), normalized(blob), 'Verification input changed: ' + entry.path);
  return {...entry, gitBlobSha256: hash(blob), workingSha256: hash(working), normalizedSha256: hash(normalized(blob))};
});
assert.equal(position, batch.length);
const destination = process.argv[2]; assert(destination?.startsWith('build/zhou-1015/'));
const result = {sourceCommit, sourceTree, capturedAt: new Date().toISOString(), sourceCount: sources.length,
  normalizedInputsSha256: hash(JSON.stringify(sources.map(({path, normalizedSha256}) => ({path, normalizedSha256})))), sources};
writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.info(JSON.stringify({sourceCommit, sourceTree, sourceCount: sources.length, normalizedInputsSha256: result.normalizedInputsSha256}));
