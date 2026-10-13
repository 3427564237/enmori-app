# LI remaining AI choice — concrete isolated increment

Status: proposed; no choice has been made by this document. Prepared 13 October
2026 SGT after the human request to finish LI work and prioritize increments.

The exact candidate is [#93 at 110eda443fbe101608c6aa6df551e52b6a18da5a,
sections 3–6](https://github.com/3427564237/enmori-app/blob/110eda443fbe101608c6aa6df551e52b6a18da5a/docs/planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md).
[JIN review 5500140319](https://github.com/3427564237/enmori-app/pull/93#pullrequestreview-5500140319)
approves the candidate's technical consistency and the two unwired helpers.
The prior [four F01 choices](../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md)
are already selected and do not require another answer.

## Recommended choice A — approve the isolated contract, deliver in small batches

Approve the exact N02/F03/R-A/C-A candidate in sections 3–6, only for the first
synthetic Auth/Firestore/fake-Qwen Note-only slice. LI is the accountable operator
for unresolved controls and the single cleanup entry. The candidate's 15-minute
alert and 24-hour operator response are operational targets, not evidence of
completion, automatic TTL, or permission to delete unresolved controls.

This explicitly selects the following new matters; these are not covered by the
old F01 delegation:

| Group | Concrete selection and consequence |
| --- | --- |
| N02 | Section 3's exact paths, fields, transactions, resolver, queries/index declarations and control lifetimes. Adds Conversation messages/provenance/effects, operation and runtime fences, one cleanup checkpoint, and the Account revocation generation. No unspecified fields or ordinary-data migration. |
| F03 | Sections 4.2–4.6: fixed acceptance-time view; completed owner with current accepted consent may use eligible own Notes in the inclusive seven-day window, including existing Notes; rejected denies the purpose without input-only fallback. Revocation generation is preserved by all writers, increases atomically on withdrawal, and is stamped only on sourced replies. This explicitly amends the minimum Q19 provenance purpose and governs ordinary owner read versus AI versus cleanup. |
| R-A | Section 5's no-receipt recovery and exact copy: explicit Check result and Leave without retrying. Unknown may remain unresolved; leaving never proves no write, deletes messages or permits forced Retry. Same-U pending protection and original session/operation remain. |
| C-A | Section 6's full canonical two-sweep cleanup, whole-reply tombstone plus complete provenance/stamp removal, single Backend cleanup entry, page 25, startup/hourly sweep targets and checkpoint maximum 24 hours. Keeps the original expiry+24h obligation; late I/O or outages cannot reset it. |

Implementation release remains bounded: ZHOU first delivers the separable R-A
client delta; LI completes the Account producer delta and writer inventory;
DU supplies immutable Note/time/non-reused source identity facts with source
evidence. The reader/store/cleanup implementation uses only the selected rows
whose producer and capability prerequisites are actually satisfied. JIN reviews
each coherent new contribution once; unchanged #88/#92/#93 results stay on their
sources. Do not wait for all modules or old PR merges.

Additional SDK experiments are limited to the uncovered group/name ordering,
wildcard index policy, multi-parent and deleted-reference keyset behavior,
concurrent close/initialization/restart ordering and ACK-loss evidence. Each
must have a fixed synthetic fixture, existing locked stack, isolated launcher,
exact success/failure limits and complete teardown before execution; this
choice is not an unbounded experiment or ordinary-runtime authorization.

Keep ordinary/demo/cloud/live-model/index deployment disabled. The choice
does not prove DU's guarantees, SDK cleanup/clock guarantees, real adapter
acceptance, M26/Sprint completion, UAT or Release. Source failures stay visible.
Merge, task closure and board changes remain outside this request.

## Choice B — release only the no-receipt client delta

Select section 5's R-A copy/exit behavior and its matching meaningful client
tests. Keep all new N02 fields/indexes/control retention, F03 purpose/producer
amendments and C-A runner/checkpoint choices proposed. Pure policy acceptance,
History/shared integration and already approved work continue. This produces
a usable client increment while the dependent real adapters remain held.

## Authority and next action

AGENTS.md says: “Do not make a major architecture, backend, data-model,
dependency, or infrastructure decision without explicit approval.” The earlier
“你帮我决定即可” decision expressly concerns four F01 rows. It is not reused as
authority to select these different physical and processing-purpose contracts.

Human LI may choose A, B, or explicitly delegate these remaining choices to the
agent. Persist the exact answer and old/new scope under docs/decisions before
releasing dependent work. This document is a reviewable proposal, not a new
approval step for already authorized History or previously accepted components.
