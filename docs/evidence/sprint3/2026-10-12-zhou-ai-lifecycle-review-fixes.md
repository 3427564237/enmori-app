# Local review fixes: unresolved Retry and Q17 optional fields

12 October 2026, SGT (UTC+08:00). Local fix and self-check only; no upload,
PR/comment/review publication or other external mutation. JIN's independent
implementation review and LI acceptance are not implied by this record.

## Source and controlling requirements

- Repository: `D:/3851 AI/formal/enmori-app`.
- Branch: `codex/zhou-ai-lifecycle-local-20261012`.
- Previous delivery: `7ddf803a165504f7493e2e1465de12374970d1cc`.
- Fixed source: `141d120ab12468cd0b0b05cd7288d474d07724e5`.
- Fixed source tree: `85176748c968be76c6ecbfad091c90d2da8164a8`.
- Existing authority: [LI's scoped release](../../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md),
  Issue #78 and approved #76 C04/LC08. The user expressly requested these two
  local fixes and self-check, without upload.
- Q17 field optionality is explicit in the
  [approved field design](../../superpowers/specs/2026-09-01-recommendation-ai-field-allowlists-design.md):
  `occurredAt` is required; `noteText`, `moodLabel`, `activityLabel` and
  `weatherConditionLabel` are optional. No product requirement was changed.

The earlier [465-case evidence](2026-10-12-zhou-ai-lifecycle-local.md) is retained
as a historical result. Later review exposed missing cases despite that pass;
this record supersedes its adequacy claim for the two affected behaviors.

## Repairs and actual regressions

**Unresolved writes and Retry.** Previously `uncertain` was set only after the
store Promise returned `unknown`. Cancellation released the user slot while a
saved-user write still awaited its acknowledgment, allowing an immediate Retry
to pass before the uncertainty flag appeared. A rejected acknowledgment had the
same gap. New regression tests reproduced this before the fix: **12 tests,
2 passed and 10 failed**, exit 1 (`ack-before-fix-02.log`).

Every user/assistant store call now marks its result unresolved before invoking
the Port. Only a still-live operation receiving a confirmation consistent with
its actual effect proof can clear that state. Once terminal, only successful
authoritative readback after the permanent effect fence clears it. Late
confirmed/absent/unknown/rejected acknowledgments cannot alter the readback or
revive the old operation. A content-free WeakMap keyed by the saved-user target
also prevents an older A capability from bypassing an unresolved Retry B, and an
old A readback cannot clear B's unresolved marker. This does not block a distinct
explicit Send or retain a generation lane with no active invocation.

The final **25 acknowledgment regressions** cover same-stack cancel/Retry
without any intervening await, before/after actual effects, exact deadline,
unknown/rejected/synchronously thrown confirmations, pending/failed readback,
older-capability bypass, normal confirmed flows and late acknowledgments after
readback for both user and assistant phases. Readback counts, model invocations,
one-time message effects, terminal outcomes and independent new Send behavior
are asserted.

**Q17 optional fields.** The old type and validator required all four optional
fields. New regression tests first produced **22 tests, 7 passed and 15 failed**,
exit 1 (`q17-before-tests.log`); each failed combination legitimately omitted
at least one optional field. The four Port properties are now optional and the
projection copies only present, validated fields. Omitted properties stay
omitted; no default text/labels or undeclared data are manufactured. Present
invalid values still fail closed, and `occurredAt` remains required.

The **22 Q17 regressions** cover all 16 field-presence combinations, including
timestamp-only Check-Ins, each field's invalid values, explicit empty strings,
timestamp validity, exact minimized output, immutable copying and exclusion of
identity/location/provider/history fields. The isolated Q17 run passed 22/22
after the repair, and the existing lifecycle regression passed 78/78.

## Final combined self-check

Using existing pinned Node **24.19.0**, pnpm **11.19.0** and TypeScript **7.0.2**:

```powershell
& 'D:/3851 AI/drafts/2026-10-12-zhou-ai-lifecycle-review-fixes/verify.ps1' -Task backend:verify -Log backend-verify-final-02.log
```

The runner selects the already-cached pinned pnpm for its child scripts and
restores PATH. `backend:verify` executes the strict Backend compiler followed by
all Backend tests. **Exit 0: 512 tests passed, 0 failed/cancelled/skipped**:
465 existing tests plus 25 acknowledgment regressions and 22 Q17 regressions.
The earlier 502/502 full run remains a checkpoint; the final run includes the
additional symmetric acknowledgment cases requested by internal review.

`git diff --check`, change-scope inspection and the private-key/token-pattern
check passed. The seven pre-existing untracked historical files match their
earlier hashes. No runtime scheduler, Bootstrap/public API, real storage/producer,
Flutter/UI, model configuration or dependency file changed. Source and test
files passed a separate read-only internal review; this is not JIN approval.

Formal source hashes, commands/results and raw-log hashes are in the
[fix manifest](2026-10-12-zhou-ai-lifecycle-review-fixes-manifest.json).
Scripts, isolated compiled probes and raw failed/passing logs remain only in
`D:/3851 AI/drafts/2026-10-12-zhou-ai-lifecycle-review-fixes/`; formal code and
evidence remain in the repository under `D:/3851 AI/formal/`.

Real-model, production data, emulator and device execution remain outside this
local fake-Port correction; none was performed or claimed. No automation was
restarted and no source or evidence was uploaded.
