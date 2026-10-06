# LI follow-up publication — concrete pending preview

The user requested completion of LI's remaining work after teammate updates. The remaining #50 Pending lifecycle defect has been repaired and verified locally; the unchanged #54 shader review support is reproduced cleanly. Prior [publication authorization A](https://github.com/3427564237/enmori-app/blob/204e6862616f5d21cb19d21422188c829e2e977f/docs/decisions/2026-10-06-blocker-publication-approval.md) approved the earlier exact batch (`97d102d`/`204e686`), not this new executable fix. The retained action-time publication rule therefore requires a new confirmation after this concrete package is available.

## Prepared payload

- Candidate branch: `souma/s3-checkin-pending-recovery-20261006`, descendant of PR #50 `97d102de34dc457bbcb8f7154471ff1dea8efa7c`.
- Executable fix: `d54a04f8ea092aafd0a8ad7bd4bebd1e814105c5`, two Check-in Presentation files and five widget regressions. Subsequent commits add the focused [DU remediation packet](../evidence/sprint3/2026-10-06-li-checkin-pending-remediation.md), [SHI reproduction support](../evidence/sprint3/2026-10-06-li-shader-review-support.md), [measured results](../evidence/sprint3/2026-10-06-li-checkin-shader-results.json), and this preview only.
- Standalone #50 verification: focused widget 5/5 and complete Flutter 133/133 Pass, analysis zero issues, clean Backend 290/290 Pass. New-head Android/Emulator not run.
- Unchanged #54 `9cfb9a9` clean validation: Friend 3/3 and complete Flutter 150/150 Pass, analysis clean; source/generated shader present. SHI still supplies the actual independent conclusion.

## A — publish LI repair and focused reviewer follow-up (recommended)

1. Re-read #50 and the remote branch: expected current head `97d102de34dc457bbcb8f7154471ff1dea8efa7c`, base `codex/sprint3-first-slices`, Draft. If changed, inspect/reconcile first. Fast-forward its existing head branch `souma/s3-01-li-start-20260930` to the final local delivery commit without force; read back the exact head. Update the current-scope PR description/validation evidence, and request DU's exact-head re-review.
2. In one focused DU message, explain the owned operation invalidation, deferred Pending release, unchanged safe same-Note idempotent recovery and five before-failing/after-passing widget cases. Retain prior review history. Point out #43's separate exact-head prerequisite (`27b899fe93066298bd36d4d5dadf0f90a374a50d` over #42 `479619e8d124f3342458506fc145dc4bfbe3f483`); request the already-assigned DU review if not currently requested. Do not infer a #50 approval covers #43.
3. Keep #54's code/head unchanged. Submit the clean shader support packet to SHI in its Conversation and request Friend re-review on actual head `9cfb9a9e23d4a589e59c40cde78cceadd617cd70` after independent reproduction. No source/theme/SDK workaround or test exclusion. If #54 changed, recheck before referring to its head. ZHOU's existing Event-only approval on this exact head is retained; do not ask for repeated Event review of unchanged code.
4. Read back reviewer requests and comments. Keep both PRs Draft. No merge, Issue/Project mutation, LI/Sprint acceptance, UAT/Release, real-user/provider activation or credential/remote-machine access is included.

## B — publish LI repair and DU follow-up only

Execute A steps 1–2 and the #50 readback. Keep SHI's support local and make no new #54 message or reviewer request.

## C — retain all new work locally

No remote writes. The local repair commits, evidence and supported shader steps remain reviewable.

## Prepared reviewer message content

DU: your 6 October Pending-state finding at #50 `97d102d` is reproduced by five widget cases. The new exact head preserves the Note/Idempotency-Key, only invalidates the exiting page's owned operation, releases abandoned Pending UI state after disposal, and leaves newer page requests intact. All five now pass; standalone Flutter 133/133, analysis clean and Backend 290/290. Please review the new exact head and record the bounded conclusion. #43 remains a separate prior review gate.

SHI: the unchanged #54 exact `9cfb9a9` was tested after normal FVM clean/pub-get asset regeneration: Friend 3/3, full Flutter 150/150 and analysis all pass, with SDK source and compiled test shader present. The support packet provides a small package-resolution/bundle-presence diagnostic and clean commands. Please independently rerun your Friend cases on this head or a supported baseline review environment and record the result; LI/ ZHOU successful runs do not replace your recorded failure. Event approval remains ZHOU's existing scoped conclusion.
