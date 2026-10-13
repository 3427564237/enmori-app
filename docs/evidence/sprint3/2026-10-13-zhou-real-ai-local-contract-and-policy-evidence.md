# ZHOU remaining real-AI contracts and selected policies — local evidence

## Subsequent authorized review handoff

The user subsequently authorized publishing this completed local packet, source
and evidence for JIN/LI review, while prohibiting merge, task closure and board
changes. The [durable instruction trail](../../decisions/2026-10-13-user-zhou-local-ai-development-scope.md)
preserves both instructions. The following local-only state and local manifest
describe the original pre-commit snapshot, not the new publication state.
The [submission manifest and results](2026-10-13-zhou-real-ai-submission-evidence.json)
bind unchanged tested code, documentation handoff additions and exported logs;
the new PR/comment provide the exact review head/tree without a circular self SHA.
[Final 542-test transcript](2026-10-13-zhou-real-ai-backend-tests-final.txt) and
[intermediate 539-test transcript](2026-10-13-zhou-real-ai-backend-tests-intermediate.txt)
are preserved separately. Neither publication nor the local agent review is
formal JIN approval or LI acceptance of this new batch.

Date: 13 October 2026, SGT (UTC+08:00). This is a local working-tree package;
**not uploaded, not committed, not a formal JIN review or LI acceptance**.

The [human's current instruction](../../decisions/2026-10-13-user-zhou-local-ai-development-scope.md)
authorizes local contracts, technical review and separable development. The
[formal F01 decision](../../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md)
at `20ff6cfc01ec0caaa7f811ec3d9d4eec547f2072` selects all four product rows.
They are resolved, not resubmitted for selection. The accepted #92 observations
are reused at `029437c5939bfb50643254a7a976bf7fc70c8c12` without new probes.

## Delivered local changes

The [concentrated packet](../../planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md)
contains N02's paths/fields/transactions/queries/indexes and normal/abnormal control
retention, F03's producer/purpose/writer and fixed-start-view contracts, R-A's
no-receipt recovery/exit and same-U pending protection, and C-A's complete source
cleanup, deletion barriers, checkpoint ABA and independent clocks. Remaining exact
choices stay candidates. Both previous candidate documents receive a reading
entry; their previous bodies are retained without rewriting their historical
approvals or Pending status.

Local development adds two SDK-free, unwired policies and two Node test files:

- `backend/src/ai-conversation/domain/real-effect-expiry.ts`: full-precision
  seconds/nanoseconds, explicit first/existing lineage, equality expiry, no late
  retention anchor, original 90-day/24-hour clocks, and unavailable metadata.
- `backend/src/ai-conversation/application/real-write-control.ts`: synchronous
  terminal latch, original guard after each fresh external Auth check, permanent
  closure on known loss or unavailable authority, and monotonic closed/unresolved
  durable-barrier observations. It stores no content and issues no I/O.
- `backend/test/ai-conversation/real-effect-expiry.test.ts`: 14 mathematical tests.
- `backend/test/ai-conversation/real-write-control.test.ts`: 16 control tests,
  including Auth-await cancellation, loss/regrant, malformed authority, delayed
  unresolved close and already-issued synthetic I/O completion.

The five LI source files were imported from the exact commit byte-for-byte under
Git's working-copy normalization. Their expected/actual Git blobs matched:

| Source file | Verified Git blob |
| --- | --- |
| `docs/decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md` | `566f48b64712f89cd919ec4b483c6b92d259c004` |
| `docs/planning/2026-10-13-li-real-ai-product-choice-brief.md` | `bb0f69f23dc61f0a883a4286d890b6581e8fdc27` |
| `docs/decisions/2026-10-12-li-ai-capability-slice-acceptance.md` | `c2b5335317d209ffda48b17a36f3569a1a4dae02` |
| `docs/planning/2026-10-12-li-ai-producer-and-shared-entry-handoff-draft.md` | `1c10740a4e10f309574dd43f436c675408ba7d4c` |
| `docs/decisions/2026-10-12-li-real-ai-capability-verification-only.md` (required link from the accepted evidence record) | `f40242b5e23a7dab8ea16063bebb8043233ea30d` |

## Verification and exact local source

Local branch: `codex/zhou-ai-contract-local-20261013`. Unchanged base/HEAD:
`029437c5939bfb50643254a7a976bf7fc70c8c12`. There is no new commit head.
The [source manifest](2026-10-13-zhou-real-ai-local-source-manifest.json) records
each delivered file's normalized Git blob and working-copy SHA-256, command
results and local evidence-log hashes. It excludes itself to avoid a circular
hash. Seven pre-existing untracked Persona documents remain outside this batch.

| Actual command/check | Final result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | PASS after final code change; Node 24.19.0, installed pinned TypeScript 7.0.2. |
| `node --test backend/dist/test/ai-conversation/real-effect-expiry.test.js backend/dist/test/ai-conversation/real-write-control.test.js` | Owner 30/30 PASS; independent local reviewer also 30/30 PASS against the same compiled source. |
| `node --test --test-reporter=spec 'backend/dist/test/**/*.test.js'` | Final 542/542 PASS, 0 failures/cancelled/skipped/todo; 15:06:10–15:06:12 SGT. |
| Source import, historical-body preservation, relative links, Markdown and change allowlist | Results in the source manifest; these are document/source checks, not product acceptance. |

The first build and 27/27 new tests, 539/539 full tests passed before a subsequent
self-review found that a failed Auth observation merely returned false and could
be followed by regrant on the old request. The policy now latches terminal on
known loss, malformed or unavailable authority; three adversarial tests were
added. Final 30/30 and 542/542 are the applicable snapshot. Initial passing test
counts remain intermediate evidence, not proof the uncovered behavior was safe.
No test failure is concealed; the defect was found by source/contract review.
The separate local source-verification helper initially failed to decode `%20`
in its own Windows file URL, then exposed a missing imported authority-link
dependency and an incorrect trim of the first Git status row. Those verifier
issues were corrected at their source; the dependency was imported exactly, not
edited or newly approved. Attempts are retained in the local verification log.
These were tooling/document checks, not product or Backend test failures.

Local raw test logs and command-result JSON are under
`D:\3851 AI\drafts\2026-10-13-ai-contract-local`, including the intermediate and
final runs. They contain synthetic test names/results, not live user documents.
The [technical review](2026-10-13-zhou-real-ai-local-technical-review.md) records
the independent local findings and their disposition.

## Limits and next contract dependencies

These policies are absent from runtime wiring. They do not create any physical
schema/index, issue real transactions, read producers, alter public DTOs, dispose
other components' content or prove SDK buffer destruction. A fresh Auth result
is an observation, not a reusable write permit; the caller still needs the final
synchronous original guard and transactional Firestore authority checks. Closed
is not no_effect/user_saved. N02 must bind the exact op/session/epoch and all
same-U pending writes, with authoritative result validity/readback.

No new Emulator, Cloud, Flutter, Android, live model or cleanup runner execution
occurred. Full-precision mathematics does not prove 1 ns database precision or
the real clock/metadata mapping. True SDK handoff, ACK loss, arbitrary concurrent
barriers, full deletion and original-expiry+24h completion are still unproved by
this local batch; the packet's Not Run matrix preserves them. The existing strict
fake-Port, accepted client, #92 probes, API, index, dependencies, Bootstrap and
shared entry are unchanged. No merge, Issue closure, board update or overall
S3/UAT/Release/Done claim is made.

The next human review has one concentrated remaining package rather than four
repeated F01 questions. JIN reviews the actual new delta; LI selects the remaining
PM-owned physical/purpose/retention terms, with LI/DU producer guarantees. This
run ends locally in accordance with the no-upload instruction.
