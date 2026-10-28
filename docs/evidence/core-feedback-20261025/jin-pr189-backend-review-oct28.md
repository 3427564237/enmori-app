# JIN independent PR189 Backend/runtime review

28 October 2026, SGT. Review scope: LI's new Backend/runtime preparation,
cancellation, maintenance-retirement and diagnostic changes, plus the applicable
API contract delta. DU retains client/navigation review. No author source was
modified and no completed PR188/PR190 component approval was reopened.

## Source and authority

- PR189 head: `afe06ae9ec97abb2f5c0448501ccc7fd5eb47733`.
- Base: `4d81af2f3dc0f5d68d8346eb248b30ed93097f76`.
- Reviewed tree: `d84c99edc2dd1f4cb233a43eca68c1b31f4b8773`.
- Authenticated GitHub identity: `chuxi12483468`; head/base re-read unchanged
  before preparing the formal review. No submitted review was present then.
- Used the repository Backend and systematic-debugging Skills; Skill sync commit
  `5ccc43122c442d63063ce41c6f6ff952152dea23`. No Skill/dependency installation.
- Applicable decisions: `2026-10-26-li-v31-recovery-and-state-preservation.md`,
  `2026-10-26-li-reference-off-history-exclusion.md`, and the retained 19 October
  simplification. Empty host preload precedes the business generation budget;
  cancellation must prevent later business dispatch without releasing an
  unsettled physical model lane. Unknown receipts are not successful retirement.

The detached review checkout remained tracked-clean after execution. All eight
changed Backend/API/runtime inputs were checked against their HEAD Git blobs
after execution. This is not a claimed before/after hash manifest of the whole
repository. The local manifest also records raw file SHA256 values.

## R1 — P2: cancelled business dispatch still awaits physical preload

Location: `backend/src/bootstrap/prepare-conversation-host.ts:13`.

The wrapper unconditionally awaits `prepareHost()` before rechecking revocation.
Its cancel/dispose methods revoke the inner execution but do not settle this
outer wait. The actual application registry therefore reports Cancel terminal
while the original execute remains pending. `acquireTargetLease(..., 'closed')`
also waits on that execute's `dispatchSettled` before it can confirm quiescence.

This is observable with a merely delayed cold preload. It becomes permanent
when the preload receives an unsuccessful/invalid terminal receipt: the existing
`LocalModelLane.receive` deliberately returns a never-settling promise and retains
`pending=true, outcomeUnknown=true` because physical stoppage is unproved. The
new wrapper runs before the normal business runtime deadline starts, so that
deadline cannot end the abandoned wrapper. The real HTTP execute handler also
awaits this application promise through its disconnect cleanup.

The probe composes the real application registry, new wrapper, actual inner
executor's pre-dispatch cancellation, and real LocalModelLane with handwritten
HTTP/Auth/clock fixtures. No business ports open. Both cases receive a successful
terminal Cancel and an aborted delivery, yet the execute and target lease remain
pending. After an explicitly supplied matching terminal envelope in the delayed
case, both settle; a positive control confirms this and zero business dispatch.

Required correction: detach the cancelled business waiter from physical preload
completion, including cancel/dispose/delivery-abort paths, and preserve safe
handling of late completion/rejection. Keep the physical receipt and lane
quarantine intact; cancellation is not proof of model termination, permission
for another preload/generation, a successful old outcome or cleared durable
claim. No new product timeout or blind retry is requested. Add the unresolved
preload case to the new preparation tests. The existing tests always resolve or
reject their preparation fixture before awaiting the cancelled result and miss
this case.

## Independent execution

Windows PowerShell; existing bundled Node binary reports **v24.22.1**. Existing
TypeScript CLI and dependencies reused; no package installation. `node` and `tsc`
below denote those existing absolute executables. Work directory is the detached
PR189 checkout. `OUT` is a new ignored local `build/review189` directory.

```text
node <existing-typescript>/bin/tsc --project backend/tsconfig.json --outDir OUT/compiled
node --test OUT/compiled/test/ai-runtime/chat-host-preparation.test.js
            OUT/compiled/test/ai-runtime/local-first-flow-transport.test.js
            OUT/compiled/test/ai-conversation/application-conversation-operations.test.js
            OUT/compiled/test/ai-conversation/async-conversation-operation-executor.test.js
            OUT/compiled/test/ai-conversation/conversation-io-coordinator.test.js
node --check tool/run_real_account_local.mjs
git diff 4d81af2f3dc0f5d68d8346eb248b30ed93097f76 HEAD --check
node <receipt-checkout>/docs/evidence/core-feedback-20261025/jin-pr189-cancel-probe.mjs OUT/compiled
```

The five `node --test` paths were passed in **one invocation**, not five counts
added to overlapping suites. Results:

| Check | Actual result |
|---|---|
| Fresh strict Backend compilation | Pass, exit0 |
| Five affected Backend files | 97/97 Pass, 0 skip, exit0 |
| Runtime script syntax | Pass, exit0 |
| Source diff whitespace | Pass, exit0 |
| Portable review probe (separate from the 97) | 1 positive control Pass / 2 regression Fail, exit1 |
| Eight changed input blobs | All match reviewed HEAD; tracked checkout clean |

Probe observations (synthetic identities/text only):

| Case | Cancel | Business execute | Closed-target lease | Physical lane | Business ports |
|---|---|---|---|---|---:|
| Held cold preload | terminal | still pending | still pending | pending, outcome known only as not yet received | 0 |
| HTTP503 preload receipt | terminal | still pending | still pending | pending, outcomeUnknown | 0 |

The two 75ms observation bounds in the probe are not proposed operational limits.
The permanent-failure conclusion additionally follows from the production
never-settling receipt branch. The held fixture is explicitly completed after
observation and its acquired lease released. The failed fixture has no sockets,
model, timers or external service; its unresolved promises do not keep Node alive.

[Runnable counterexample](jin-pr189-cancel-probe.mjs), SHA256:
`826196de4233e023bf07ce67b93f3811eeda1d06d61fe958314ba740c736e0a0`.
The original ignored probe also produced 1 Pass / 2 Fail; its result is retained,
not added again. The portable version adds target-lease observation and accepts
the compiled source directory as its argument.

Local raw logs, retained without overwriting (not claimed uploaded):

| File under review checkout | SHA256 |
|---|---|
| `build/review189/compile.log` (empty success output) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `build/review189/affected.log` | `eb007a8fb64e8fe8eb603b8740fcb64deedfd57cea2a8346c9c10aaca41d058f` |
| `build/review189/cancel-probe.log` (initial reproduction) | `c552d2b9b9a837bcbd5e9c61291729514c0105d9c6383531ee9dba1cfa37dc74` |
| `build/review189/cancel-probe-portable.log` | `7b6c3b0d5df64bff304a15298c5542441a3e28169c0c761fa5995a8c78aa3705` |
| `build/review189/changed-inputs.json` | `409b08e00cbf1ca818966a4ad1aa1477b700f53a9afb87d32aa20262e55eae34` |

## Preserved limitations and next checkpoint

Initial GitHub connector/network/approval-timeout failures were superseded by
successful authenticated CLI access. The first long nested worktree checkout
failed on Windows filename length; a shorter detached `build/r189` checkout
succeeded with per-command `core.longpaths=true`. No persistent Git configuration
was changed. These preparation failures are not product test failures.

No live Ollama/model, provider, real account, Firebase SDK/Emulator, Flutter,
APK or phone execution; no v39 unpublished-composition approval. Existing author
and teammate results retain their attribution. No raw prompts, credentials or
account/network identifiers were collected. Source acquisition disposition is
[in the same packet](jin-source-closeout-oct28.md).

Review disposition: **REQUEST_CHANGES**, limited to the new R1 above. LI owns the
correction. JIN's next checkpoint is the published fix plus its affected
regression result; old component gates do not reopen. No merge, closure, board
transition, runtime activation or whole-app acceptance.
