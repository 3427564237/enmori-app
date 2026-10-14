import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const output = process.argv[2];
if (!output) throw new Error('Manifest output path is required');
const paths = [];
function collect(directory, extension) {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, extension);
    else if (entry.isFile() && path.endsWith(extension)) paths.push(path);
  }
}
for (const directory of ['backend/src', 'backend/test', 'backend/emulator-test']) collect(directory, '.ts');
for (const directory of ['lib', 'test', 'integration_test']) collect(directory, '.dart');
paths.push('package.json', 'pnpm-lock.yaml', 'backend/tsconfig.json', 'pubspec.yaml',
  'pubspec.lock', 'analysis_options.yaml', '.fvmrc');
const files = paths.sort().map(path => {
  const bytes = readFileSync(join(root, path));
  return { path: relative(root, join(root, path)).replaceAll('\\', '/'),
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
writeFileSync(output, JSON.stringify({ capturedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  files }, null, 2) + '\n');
console.log(`Captured ${files.length} verification inputs`);
