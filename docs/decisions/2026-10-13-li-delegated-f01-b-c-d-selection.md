# LI delegated choice — isolated real-AI persistence semantics

- Status: selected PM product-rule amendments; implementation and enablement remain separate.
- Source ID: S-PM-1013-LI-DELEGATED-F01-BCD.
- Decision authority: LI HOURUI / PM; recorded 13 October 2026, Asia/Singapore.
- Authorization: after receiving the [four-choice brief](../planning/2026-10-13-li-real-ai-product-choice-brief.md), human LI said “你帮我决定即可”. The agent chose all four rows under that explicit delegation. This is not a claim that LI separately answered “accept” to each row.
- Scope: the first isolated synthetic-Auth/Firestore/fake-Qwen Note-only adapter direction selected by [conditional A](2026-10-12-li-isolated-note-conversation-conditional-a.md). No ordinary-user, Cloud/production or live-Qwen scope is added.

## Sources and authority

The exact alternative terms and proof plan are the [#90 proposal at 99583d6](https://github.com/3427564237/enmori-app/blob/99583d6bd601ba51c577d46901b3e07e389e6fd8/docs/planning/2026-10-12-zhou-real-ai-slice-closure-proposal.md), F01-B/C/D. JIN's document/technical review [5491753860](https://github.com/3427564237/enmori-app/pull/90#pullrequestreview-5491753860) reviews that proposal; it does not approve implementation. The [accepted #92 capability observations](2026-10-12-li-ai-capability-slice-acceptance.md) establish bounded SDK/Emulator behavior, not a product guarantee.

Retain the old sources: [Q14](2026-09-02-retention-logging-audit-policy.md), [Q31](2026-09-02-qwen-runtime-failure-contract.md), the [C01–C07 bounded internal approval](2026-10-12-li-friend-search-and-internal-ai-approval.md), and its [C06 candidate source](https://github.com/3427564237/enmori-app/blob/99583d6bd601ba51c577d46901b3e07e389e6fd8/docs/planning/2026-10-11-zhou-ai-application-lifecycle-contract-candidate.md) (blob `1d63c7573d84da47cd07379d52fe1a66cf015a81`). Their strict fake-Port scope remains unchanged.

Q14/Q31 and the affected later contracts are attributed PM decisions, also identified as PM sources in SOURCE_MAP. No conflicting higher-authority rule was identified in those applicable sources. The [authority hierarchy](2026-09-02-project-authority-supersession-governance.md) remains controlling; this decision cannot waive a law, privacy/platform obligation or conflicting Sponsor/Supervisor requirement. Any discovered conflict stops only its affected behavior.

## Four explicit selections and supersession

These are prospective, non-equivalent amendments within the scope above. Preserve the original clauses; they continue outside that scope. Select the following product semantics from F01-B/C/D, without selecting the proposal's separate physical inventory.

| Choice | Earlier promise affected | Selected rule |
| --- | --- | --- |
| 1. F01-B terminal ordering — accept | Q31-B/C06 forbid later assistant persistence when local cancel/disconnect/deadline wins before the effect. | Local terminal immediately ends the Application, stops new dispatch/transactions and original-response delivery, releases ownership and application content references. A transaction already handed to the SDK is ordered against the durable terminal-fence transaction by Firestore commit order: fence first prevents the old transaction committing afterward; content transaction first permits its otherwise valid saved effect, even when physical commit or ACK is later than local terminal. A later authorized read may discover that valid result. |
| 2. F01-B necessary SDK bytes — accept | Q14 request-only processing and C07 terminal disposal do not authorize a post-terminal processing purpose. | Only already issued database I/O may retain its necessary verified message bytes inside the SDK until that I/O settles, then release them immediately. Application cannot retain reusable prompt/candidate content, replay, cache, log, generate again or create a new copy. Supplier buffer destruction that cannot be observed stays unknown. |
| 3. F01-C expiry edge — accept | Actual-effect expiry forbids a physical append at/after expiry. | Only a pre-expiry SDK-submitted transaction ordered before the expiry fence may create a late physical copy. It is inaccessible, cannot be delivered or used for further generation, and never becomes a valid retention anchor. The entire expired Conversation is cleaned within the original expiry instant + 24 hours. Immediate 90-day expiry, no revival and the original cleanup obligation remain. |
| 4. F01-D external Auth checkpoint — accept | C06 requires current trusted authority at the exact actual effect. | Preserve request/admission checks. Before each content transaction freshly check revoked/disabled status and synchronously recheck the original Application/session/deadline; known loss stops new writes. Admit the unobserved external-Auth-check-to-Firestore-commit window. Account/purpose/source authority in Firestore remains transactionally checked and ordered against producer changes. No atomic external Auth-at-commit guarantee is claimed. |

The reason for this selection is practical and explicit: accepted capability evidence supports transaction ordering and authoritative metadata, while local cancellation does not prove remote rollback. The narrower observable promises allow progress without reporting impossible cancellation or atomic cross-system checks as satisfied.

The real adapter's logical contract must distinguish dispatch guard, durable close barrier and authoritative readback from the synchronous fake `effect(commit)` contract. It may report a confirmed `closed` barrier or `unresolved`; an unknown barrier is not confirmed Cancel, `no_effect` or `user_saved`. An acknowledged commit also does not by itself establish valid content or expiry. No asynchronous Firestore call is inserted into the synchronous fake commit callback.

All accesses, readback, pagination, Send/Retry, model dispatch, delivery and cleanup must enforce the same expiry/no-revival result from authoritative full-precision creation metadata and the previous valid cutoff. Equal-to-cutoff is expired. A late copy never extends the anchor, and an old page or accepted-slot pointer cannot bypass that result. If unsettled I/O crosses original expiry + 24 hours, the cleanup SLA has failed: keep content inaccessible, retain the failure, and never reset the clock or report success. This selects product invariants; the exact `appendBefore`/`latestMessageId` fields, resolver implementation and transaction/query inventory remain the separate N02 choice.

The 60/5/45 Application budgets, one-active/two-queued limits, one non-terminal request per user, quarantine until actual model termination, fresh explicit Retry, F02 guarded complete-response sink and no terminal-late original delivery remain. No consent/source/Persona-invalid content, deleted-target reconstruction, sensitive-token persistence or new logging is allowed. Model dispatch and sink retain their applicable current-authority checks. Ordinary accounts, real provider/model access, UAT and Release remain outside this selection.

## Next assignment — one focused remaining packet

F01's four PM-choice holds are now resolved by this record. Do not ask LI to choose these same rows again or reopen unchanged accepted client/internal-AI reviews.

ZHOU → JIN: reconcile the existing #90 N02 inventory and F03/unknown-recovery/source-cleanup dependencies with these selected semantics in one source-bound packet. Identify only the remaining exact physical/producer/retention choices, their old/new differences, and affected implementation dependencies. Reuse #92's established observations; request additional synthetic probes only for an actual uncovered guarantee, with a bounded assignment before execution. Keep authority-loss, ACK-loss, expiry and concurrent barrier counterexamples visible. JIN checks the resulting technical contract; LI handles the consolidated remaining PM-owned contract decision without per-file confirmations.

LI/DU's already approved History/shared work continues independently. This decision does not release a new physical schema/index/control-retention choice, an F03 producer/snapshot contract, an unknown-recovery receipt or a cleanup topology. It grants no whole real-store prototype/adapter implementation or runtime enablement. The remaining hold is localized to code that depends on those unselected contracts or unproved guarantees; approved slices continue.

Publish the durable decision on existing #90 and #66. No new task, merge, closure, board promotion, replacement deadline or overall Sprint/UAT/Release/Done claim is created. Recording this decision runs no product/Emulator/device test.
