# LI joint evidence publication — concrete preview

Status: prepared locally; publication not authorized by this document. The user requested continuation after teammate approvals. Local composition and early verification are within the approved implementation scope. The previous [action-time batch](../decisions/2026-10-06-li-followup-publication-approval.md) published #50 and shader follow-up only; a new remote joint evidence branch and new team messages require confirmation of the concrete package below. No new product/API/storage decision is proposed.

## Reviewable package

- Local branch: `souma/s3-joint-validation-20261006`.
- Executed product candidate: `e029f51cf0db6bca7064634ebe351470e878a804`, composing current main `281c16b`, DU-reviewed #50 `ec59a16`, and SHI/ZHOU-reviewed #54 `9cfb9a9`.
- [Focused evidence and remaining gates](../evidence/sprint3/2026-10-06-li-joint-validation.md). A later evidence/publication commit adds documents only; verify the executable tree remains identical before publishing.
- Existing #50/#54 heads, bases and Draft status stay unchanged. No additional product PR is needed for this evidence handoff.

## A — publish evidence and request the remaining existing gates (recommended)

1. Re-read main, #42/#43/#50/#54 exact heads and reviews. Reconcile any new source or review changes before execution; do not silently substitute another product candidate.
2. Persist LI's actual option-A authorization under `docs/decisions/`. Push the final evidence branch without force or updates to main/the existing PR branches. Read back its exact SHA and confirm the tested executable tree.
3. Publish one focused joint evidence comment in #54, with immutable evidence/candidate links and measured results. Mention verified JIN account `chuxi12483468` for the **existing combined gate**, retaining LI's later independent review. Do not reassign DU as an Android executor or request repeated SHI/ZHOU component review of unchanged code.
4. Publish one concise prerequisite follow-up in #43 for already-assigned DU `397781783dk-prog`, referencing the joint packet and asking for the bounded #43 exact-head conclusion. Explain that #42's applicable planning review/acceptance basis also needs verification; do not falsely assign DU a new #42 scope or record it as cleared.
5. Read back both comments and the remote branch. Preserve Draft, all independent review boundaries and historical failures. No merge, PR retargeting, Issue/Project advancement, Sprint acceptance, UAT/Release, real-user/provider activation, new credentials or access to another machine is included.

## B — publish evidence only

Execute A steps 1–2. Make no new reviewer/team message or review request. Leave the existing gates pending.

## C — retain the local candidate and evidence

No remote writes. Keep the exact candidate, tests and packet available for later handoff.

## Prepared messages

For #54: LI has composed the reviewed #50/#54 heads with current main without conflicts and completed the early local joint checks in the linked packet. The only executable difference from reviewed #54 is the exact DU-reviewed Check-in Pending fix/test from #50; Friend/Event/shared wiring and Backend/OpenAPI are unchanged. Component approvals remain scoped to their original commits. @chuxi12483468, please provide the existing JIN-owned combined-gate packet on this exact candidate, identifying actual checks, environment, results and any unresolved cases. LI will independently review your submitted gate evidence. This handoff does not approve merge or Sprint acceptance.

For #43: @397781783dk-prog, #50 and #54 now have their scoped component approvals, and LI's early joint checks are recorded in the linked packet. Please submit the already-requested independent conclusion for #43 `27b899fe93066298bd36d4d5dadf0f90a374a50d` over #42 `479619e8d124f3342458506fc145dc4bfbe3f483`. #50 approval and passing joint tests do not clear this predecessor. #42's applicable planning review/acceptance basis has not been verified as cleared; report any missing prerequisite without treating the Copilot quota comment as approval. Both implementation PRs remain Draft.
