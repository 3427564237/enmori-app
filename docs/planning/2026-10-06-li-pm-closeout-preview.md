# LI PM closeout — concrete remaining batch

Status: local assessment and action preview, not independent approval or merge authorization. Scope is the three approved blocker increments and their stacked predecessors #42/#43/#50/#54. The request to complete LI's PM work does not turn their results into whole-module or Sprint completion. Current remote evidence is [published joint validation](https://github.com/3427564237/enmori-app/blob/e97ca58ca2d125287fc2a30c9085c56c5a8bd3cb/docs/evidence/sprint3/2026-10-06-li-joint-validation.md).

## Verified gates and smallest correction

| Gate | Current evidence | Next action |
|---|---|---|
| #50 component review | DU approved `ec59a166f8901932bf9453ee49d7b51e671d32e4` | Retain approval and exact source |
| #54 component reviews | SHI Friend and ZHOU Event approved `9cfb9a9e23d4a589e59c40cde78cceadd617cd70` | Retain approvals; do not repeat unchanged component reviews |
| Early combined checks | Product `e029f51cf0db6bca7064634ebe351470e878a804`: Backend 313, Flutter 155, Emulator 37, Android 1, analysis all pass | Reuse this recorded execution while the executable tree remains identical |
| #42 planning review | No human GitHub conclusion or requested reviewer; Copilot quota comment is not approval | Propose **SHI / `GGGGHOST-CN`** as the different reviewer for this document-only predecessor; LI/SHI governance cross-review is the established preference |
| #43 predecessor review | DU request pending on `27b899fe93066298bd36d4d5dadf0f90a374a50d` over #42 `479619e8d124f3342458506fc145dc4bfbe3f483` | Existing request retained; ask for one bounded conclusion rather than per-file reviews |
| JIN combined gate | Existing handoff on #54; no JIN-authored submitted record found | JIN submits actual candidate/coverage/results, including any unresolved cases; LI independently reviews that record |
| PM scope acceptance and merge | Not Run | Execute only after the checks below and approval of the exact batch |

#42 is a real missing review gate, rather than an additional product-design decision. Its [confirmed planning policy](../decisions/2026-09-24-sprint-planning-estimation-policy.md) retains independent review. The approved [team policy](../../.agents/skills/enmori-scrum-planning/references/team-policy.md) states: “Low-risk documentation may skip JIN but never the different reviewer.” Its assignment rule permits LI to adjust reviewer mapping without self-review. LI authored #42; LI/Codex's checks cannot replace the different reviewer.

Local checks of the exact #42 head against its original main baseline `432f5285966a6c2705473be21a2652ca2869520a`: 17 changed files, no product/API/Backend code; 119 local Markdown links resolve; diff whitespace check passes. The handoff contains five owner rows and 42 unique routes. These are owner checks, not SHI approval. Provider/source and five prototype-only decisions remain explicitly gated. The historical Astra prompt and previous owner validation are supporting material, not a submitted team review.

## PM assessment of #45 kickoff scope

Issue #45 is a **preparation kickoff**, not completion of LI's 16-route module. Its approved contract and audit artifacts exist; later bounded implementations do not rewrite that distinction.

| Original acceptance item | Artifact / disposition |
|---|---|
| Baseline audit and retained approved behavior | [LI start](../evidence/sprint3/2026-09-30-li-start.md) and [first slice](../evidence/sprint3/2026-09-25-first-slice.md) |
| DU packet for #43 at its exact base/head | [DU packet](../evidence/sprint3/2026-09-30-li-du-review-packet.md); independent #43 conclusion still pending |
| Smallest Profile/Settings proposal with unresolved fields separated | [first Profile preview](2026-09-30-li-own-profile-first-slice-preview.md), [Profile/Settings contract](2026-10-05-li-profile-settings-contract-preview.md), and narrow [blocker approval](../decisions/2026-10-05-li-blocker-implementation-approval.md) |
| First route/Home inputs, without a shared framework | [LI completion preview producer/dependency table](2026-10-05-li-sprint3-completion-preview.md) and module proposals already published |
| DU independent preparation disposition | Historical/current #50 approvals are scoped; request an explicit confirmation that the bounded kickoff preparation is covered, or its remaining finding, with the #43 conclusion. Do not silently reinterpret the Pending-fix-only review as approval of every preparation criterion |

Do not close #45 until all five preparation items have adequate independent disposition and LI's bounded acceptance. Closing this kickoff must explicitly preserve unimplemented module/prototype work. #44 remains open/Backlog; #48 has no submitted preparation artifact and LI's review is Not Run. #46/#47/#49 Done statuses cover their accepted preparation only. None is converted into full Friend/Event/AI/Check-in completion by this batch.

## Conflict-free local merge rehearsal

`git merge-tree --write-tree` and temporary unreferenced `git commit-tree` objects were used; no checkout, remote branch or PR was changed. Starting from current main, sequential merge rehearsal produced:

| Order | Exact source head | Expected merged Git tree |
|---|---|---|
| #42 | `479619e8d124f3342458506fc145dc4bfbe3f483` | `e534723a37c7d88ecb0096e48df88b05a371841f` |
| #43 | `27b899fe93066298bd36d4d5dadf0f90a374a50d` | `6efcaa50e91b4cb8097c783cfeebd50704301759` |
| #50 | `ec59a166f8901932bf9453ee49d7b51e671d32e4` | `938956e715c9d4370d9a5ecd37b0474a9f959693` |
| #54 | `9cfb9a9e23d4a589e59c40cde78cceadd617cd70` | `227d8992b984fd5e7c9bcb908d238b6afd241e12` |

Main is `281c16b07a64633dea083808f9b8a3a567d7e6c4`. All four steps are conflict-free. The final **entire tracked tree**, not just selected files, equals the tested product candidate `e029f51` exactly. The published evidence branch additionally carries four documents. Rehearsal is not a remote merge and grants no missing review.

## A — SHI review and full guarded closeout (recommended)

1. Persist LI's actual A response as a narrow PM assignment/publication/conditional-closeout decision. Publish this PM record on the existing evidence branch, retaining every original PR head and review. Add only documents and the authorization record; verify the executable tree still matches the tested candidate.
2. Request SHI's independent **document-only** review on exact #42 head `479619e`. Publish one focused #42 message with the source hierarchy, supersession/prototype/source boundaries and small validation results. Do not reopen SHI's completed Friend review.
3. Append one short addendum to the existing authorized DU #43 comment linking the #45 kickoff matrix and requesting its bounded preparation disposition together with #43. Append a link to this PM record in the existing JIN #54 handoff so the evidence-review/merge boundary is clear. Preserve the original comment content; do not send repeated reminders or invent deadlines.
4. After actual SHI/DU conclusions and JIN evidence arrive, LI/Codex reviews JIN's record independently: exact source and test coverage; actual versus reused checks; real Emulator/Android evidence; protected/error/race coverage; cleanup/privacy; unresolved cases and bounded acceptance. Record the conclusion under LI's identity, citing JIN's artifact. Failed, missing, stale or materially incomplete evidence keeps only the affected action pending.
5. Conditional merge authority applies only to the four exact heads and main/expected trees above, after **all applicable independent gates** pass and no blocking findings remain. Re-read heads, bases, review scope and checks before each action; retarget #43/#50/#54 to main in order only after their predecessor merges; verify their remaining reviewed diff is unchanged; mark ready and use normal non-squash merges with the expected head guard. Preserve source branches and history. Stop on new source/main changes, conflicts or tree/diff mismatch; reconcile and present the materially changed batch before merging. This does not approve a different head or bypass CI/review.
6. After remote merge/tree readback and verified #45 preparation disposition, publish LI's **kickoff-only** acceptance, check its five actual criteria, close #45 and set only its Project item Done. Preserve #44 and remaining implementation scope. Record actual outcomes; do not label unexecuted conditional steps completed.

This option does not authorize Sprint acceptance, UAT/Release, real-account/provider activation, missing physical contracts, new credentials, access to another machine or reassignment of JIN's gate. No scheduled automation or new Codex thread is created by this preview. No external action in this new batch has run.

## B — use ZHOU for #42, otherwise the same guarded batch

Replace only the new #42 reviewer with verified `YaoyinZhou3922`. LI still authors the planning artifact, and the other existing reviewer/gate assignments remain unchanged. Do not repeat ZHOU's Event review.

## C — keep this preparation local

No new publication, reviewer assignment or conditional merge authorization. Existing DU/JIN requests remain active; their missing conclusions remain pending.

## Prepared #42 request

SHI (or ZHOU for option B): please independently review document-only #42 at `479619e8d124f3342458506fc145dc4bfbe3f483`, original baseline `432f5285966a6c2705473be21a2652ca2869520a`, current main `281c16b07a64633dea083808f9b8a3a567d7e6c4`. LI's PM planning decisions are already attributed; this is their requirements/governance review, not approval of new product behavior. Check the five-owner/42-route mapping, different reviewers, confirmed hour/Point-policy supersession, Ticketmaster/onePA priority and source criteria trail, retained five prototype gates, and truthful implementation/Ready/acceptance wording. Owner checks: 17 document/image files only, 119 links valid, diff check passes. Existing component and joint evidence is linked in the PM record; it does not replace this planning review. Submit one scoped conclusion at the exact head. #43/#50/#54 remain Draft until their own gates and conditional merge checks pass. No importer/provider rights, field/schema changes or implementation are assigned by this request.
