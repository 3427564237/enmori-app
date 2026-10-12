# P05/P06 corrected implementation — Draft review handoff

12 October 2026, SGT (UTC+08:00). The user has now explicitly authorized
uploading the corrected P05/P06 code and test evidence as a **Draft PR**, with
JIN reviewing and LI accepting. **No merge is authorized.** Earlier local-only
delivery records remain accurate historical snapshots; their upload restriction
is superseded only for this requested Draft handoff.

## Exact review boundary

- Assignment: [#78](https://github.com/3427564237/enmori-app/issues/78).
- Implementation authority: [LI's formal C01–C07 / LC01–LC16 release](../../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md).
- Base: `codex/zhou-ai-lifecycle-proposal-20261011` at
  `8f4f61d3e5c7fbc53d75209df5b9ce51f6f2a092`, the unchanged #76 candidate.
- Head branch: `codex/zhou-ai-lifecycle-local-20261012`.
- Corrected executable source: `141d120ab12468cd0b0b05cd7288d474d07724e5`;
  tree `85176748c968be76c6ecbfad091c90d2da8164a8`.
- Fixed-source evidence commit: `c2c197a1638cce1f69b55b4a9001267f5d704c53`.
  Subsequent handoff commits only add/update this index and the published test
  transcript; executable verification inputs remain identical to `141d120`.

This is a stacked implementation PR based on #76, so its diff isolates the
approved lifecycle, corrections and evidence. It does not merge or alter the
candidate branch, the main branch, #78 status or any Project status.

## Reviewable evidence

- [Corrected behavior, failure reproductions and final verification](2026-10-12-zhou-ai-lifecycle-review-fixes.md).
- [Exact-source and raw-log hashes](2026-10-12-zhou-ai-lifecycle-review-fixes-manifest.json).
- [Published command/test-result transcript](2026-10-12-zhou-ai-lifecycle-test-results.txt):
  512 passing case lines, full-run totals and recorded exit code. The complete
  final log was inspected before this exact copy was promoted to formal evidence;
  it contains command lines, test names, counts and the exit code, with no local
  paths or detected credential material. This is the recorded run, not a rerun.
  Its SHA-256 matches the original raw-log entry in the manifest:
  `ed354beb2d3b4be1af4cd045b25a4bf298551ab02808f8a0de156970e3900dcc`.
- [C01–C07 / LC01–LC16 lifecycle evidence](2026-10-12-zhou-ai-lifecycle-local.md),
  with an explicit correction notice retaining the earlier 465-case history.

Reproduce with pinned Node **24.19.0**, pnpm **11.19.0**, TypeScript **7.0.2**
and the existing lockfile, from the repository root:

```text
pnpm backend:verify
```

Strict compile and all **512 tests pass**, exit **0**, with no failed, cancelled
or skipped tests. This includes 25 new acknowledgment-race cases and 22 Q17 cases
in addition to the earlier 465. The original raw logs and local wrappers remain
separately under `D:/3851 AI/drafts/`; only the inspected final transcript is
promoted above. The local wrappers are not prerequisites for a
reviewer using the pinned repository commands. No dependency was added or changed.

## Requested decisions

- **JIN @chuxi12483468:** independently review the actual published head, including
  the C04/LC08 pending-write fence and older-capability guard, Q17 optional-field
  omission, real effect ordering, disposal and existing runtime compatibility.
- **LI @3427564237:** accept only this approved internal fake-Port implementation
  after the new implementation review and evidence are satisfactory. Candidate
  document approval and previous Persona/joint validation do not approve this code.

The PR stays Draft and unmerged pending those decisions and further user
instruction. No public API, Firestore/real producer, Flutter/UI/router, actual
model/host, deployment or dependency expansion is included. No claim of complete
P05/P06 public routes, M26/M27, Sprint, UAT or Release acceptance is made.
