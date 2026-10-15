import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = 'docs/evidence/sprint3/2026-10-14-zhou-accelerated';
const testedExecutable = '3a8beaf320ddde617a37289ffda241bc858aebe2';
const manifest = JSON.parse(readFileSync(join(directory, 'source-final-validation.json'), 'utf8'));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = manifest.files.map(file => {
  const workingSha256 = hash(readFileSync(file.path));
  if (workingSha256 !== file.sha256) throw new Error(`Verification input changed: ${file.path}`);
  const workingGitBlob = git('hash-object', '--', file.path);
  const publishedGitBlob = git('rev-parse', `HEAD:${file.path}`);
  if (workingGitBlob !== publishedGitBlob) throw new Error(`Publication input differs: ${file.path}`);
  return { ...file, gitBlob: publishedGitBlob };
});
const upstream = '9b27638bbc9f1431ea7b04025c7945eeb05f2e8e';
const imports = ['docs/decisions/2026-10-14-li-ai-acceleration-and-target.md',
  'docs/decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md',
  'docs/decisions/2026-10-14-li-social-ui-increment-release.md',
  'docs/decisions/2026-10-14-li-social-ui-preview-direction.md',
  'docs/decisions/2026-10-14-li-pr99-bounded-disposition.md',
  'docs/planning/2026-10-14-li-ai-accelerated-delivery-plan.md',
  'docs/planning/2026-10-14-li-consolidated-next-decisions.md'].map(path => {
  const upstreamBlob = git('rev-parse', `${upstream}:${path}`);
  const publicationBlob = git('hash-object', '--', path);
  if (upstreamBlob !== publicationBlob) throw new Error(`Imported authority differs: ${path}`);
  return { path, upstream, gitBlob: upstreamBlob };
});
const logs = readdirSync(directory).filter(path => path.endsWith('.txt')).sort().map(path => {
  const absolute = join(directory,path), bytes = readFileSync(absolute);
  return { path: absolute.replaceAll('\\','/'), workingBytes: bytes.length,
    workingSha256: hash(bytes), gitBlob: git('hash-object','--',absolute) };
});
const apkPath = 'build/app/outputs/flutter-apk/app-debug.apk', apk = readFileSync(apkPath);
writeFileSync(join(directory,'publication-manifest.json'), JSON.stringify({
  capturedAt: new Date().toISOString(), executableCommit: testedExecutable,
  executableTree: git('rev-parse',`${testedExecutable}^{tree}`), verificationInputs: files,
  unchangedVerificationInputs: files.length, importedAuthority: imports, logs,
  apk: { path: apkPath, bytes: apk.length, sha256: hash(apk),
    entry: 'lib/ai_persona_harness.dart', syntheticOnly: true, deviceExecution: 'Not Run' }
},null,2)+'\n');
console.log(`Bound ${files.length} unchanged inputs, ${imports.length} authority blobs and ${logs.length} logs`);
