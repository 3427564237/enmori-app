# AI continuation: authority, funding and operator review

Review date: 18 November 2026, Asia/Singapore. Evidence type: local source/contract/operator review; a proposed read-only financial-inventory script received local syntax validation only. This reviewer performed no remote request, database/configuration write, purchase or model call. Root is separately verifying the live billing evidence. Private billing identifiers, screenshots, credentials and full financial inventories remain outside Git.

Later decision in this same review: LI has selected **additional A = USD 3.40** and requested the **one-time two-month rule-change/risk proposal first**. The earlier unknown-A and weekly-maintenance discussion below describes the initial review state; it is retained for traceability. The [exact long-window proposal and unapplied patch](long-window-proposal-input.md) now supplies the proposed 61-day bound, fixed 18 January cutoff and validation/rollback consequences. Implementation, deployment and grant/configuration writes remain unapproved.

## Conclusion and authority

The [18 November instruction](../../decisions/2026-11-18-li-onepa-priority-and-ai-continuation.md) authorizes proceeding toward a funded two-calendar-month continuation, with the target date **18 January 2027, Asia/Singapore**. It supersedes the earlier instruction to defer renewal. The user also reports that the purchase has arrived; root has reported a fresh purchased-credit entry and paid invoice. This review does not independently certify those UI observations or turn an account balance into an approved application spending limit.

The existing v1-to-v2 purchased-credit implementation can support that service period without a new data model, provider, host or dependency. It cannot currently represent a single two-month balance/price evidence window. The existing **maximum seven-day window is a PM-approved maintenance/risk policy**, implemented in code; it is not a law, provider credit lifetime or immutable safety limit. It can be changed by an explicit scoped PM decision and matching contract/code/tests. Merely changing private configuration to sixty days fails the current decoder.

The smallest route using the existing implementation is one paid grant plus repeated manual evidence refreshes through 18 January. That requires actual scheduled operator work and short controlled maintenance; setting a January date once does not provide two months of continuous AI admission. If the requested outcome is one installation with no weekly maintenance, the concrete longer-window policy below must be resolved and implemented before claiming that outcome.

Controlling sources:

- [11 November implementation approval](../../decisions/2026-11-11-li-teacher-stability-implementation.md), especially its actual-purchase condition and accepted manual review policy.
- [Approved purchased-credit proposal](../../planning/2026-11-11-openai-paid-credit-successor-proposal.md), preserving its original proposal and subsequent acceptance trail.
- [Budget contract: one purchased-credit successor](../../../api/openai-budget-contract.md#one-purchased-credit-successor-v2).
- [Same-service owner contract](../../../api/openai-service-owner-contract.md), independent of monetary admission.
- [Earlier gift re-verification](../../decisions/2026-11-11-li-openai-balance-reverification.md): a displayed later provider expiry did not extend the old immutable gift grant.

## Four independent times

| Time | Meaning and current implementation |
| --- | --- |
| Requested service period | Two calendar months, ending 18 January 2027; record the exact activation/cutoff timestamps in the packet. Two calendar months from 18 November are 61 days, not an assumed 60 days. |
| Purchased credit issuance/expiry | Facts from the actual paid credit; must not be replaced by the service target. Root's newly reported purchase extends beyond the target. The expired old gift grant remains unchanged. |
| Balance and price evidence windows | Each has its own observation and deadline. `paidCreditReviewWindowMs` is seven days; both must end within that bound and no later than credit expiry or a known earlier applicable price change. The earliest monetary deadline closes admission. |
| Exclusive owner lease | 120 seconds, renewed every 30 seconds, with a 15-second safety margin; this is process exclusivity, not purchased money or evidence freshness. Renewal never refreshes money. |

Implementation: `backend/src/ai-runtime/domain/cloud-cost.ts:60–112` checks both seven-day windows and computes their minimum with actual credit expiry. `backend/src/ai-runtime/infrastructure/firestore-service-owner.ts` acquires/renews only the two owner/fence records. Neither implementation creates funding during ordinary startup.

## Facts and values still required for a concrete packet

The new instruction supplies the continuation goal and permission to prepare its execution. It does not manufacture these factual inputs:

1. Same provider organization/project and credential scope; actual net USD purchased amount, issuance, exact expiry boundary, fresh spendable balance after deductions, receipt and any known external spending. An unrelated application's unknown liabilities cannot be recorded as zero. The earlier planned S$10 is not evidence of today's net USD purchase.
2. Current model access, applicable ordinary/cached/cache-write/output prices, quota and unchanged request configuration, verified without generation. See the parallel model/price review when complete.
3. Complete retained v1 ledger and permanent attempts, including every unknown reservation. A live preliminary read is planning evidence; the final installation packet must capture them again **after old epoch retirement**.
4. Concrete new approved allowance `A`, calculated cap `C`, evidence policy/deadlines, exact selected grant UUID and rollback. A new grant with the same numeric USD 3.40 limit would be an additional per-grant allowance, not lifetime total spending capped at USD 3.40. This report does not silently approve either that amount or the entire new purchase.

Use exact integer USD nanodollars:

```text
P = actual net purchased USD credit
R = freshly verified spendable USD balance after deductions
A = explicitly selected new allowance, A <= P
U = entire retained predecessor reserved amount
D = confirmed predecessor spend not proved reflected in R
C = min(A, max(0, min(P, R) - U - D))
```

If charge reflection is not demonstrable, use all old confirmed spend for `D`. Preserve `U` even if it may already have affected the displayed balance. Preserve the old ledger/attempts unchanged; the new ledger's initially zero counters describe only new funding. No new lifetime-zero claim, refund, reset, automatic recharge or second successor follows.

## Prepared bounded inventory read

Private proposal: `/home/miku/.local/state/enmori-ai-renewal-20261118/read-retained-money-proposed.mjs`, SHA-256 `d46e8b26c60802f064cfd7d1918d6831b751f46c9f1c8a58ddad0132052408a8`.

The script requires an explicit `--execute-network` argument and existing ADC; it never prints credentials. It issues one read-only transaction for the fixed v1 ledger, runtime fence, service owner and two existing quotas, plus the ledger's content-free attempts. A 2,001-row sentinel rejects inventories above 2,000; the total operation has a 90-second local bound. It checks the complete counts/sums/reservation/settlement arithmetic with the existing `cloudCostInventoryMatches`. Its private output is exclusive-create, so an earlier observation cannot be overwritten.

The output distinguishes valid-but-expired v1 authority from a malformed ledger. It gives sanitized counts, U/D and digests; a conditional purchased-credit ceiling is explicitly labelled dependent on root's billing observation and unresolved spending scope, with `A = null`. It does not create a paid grant or claim payment/allowance approval. Pinned Node 24.19.0 `--check` passed; this reviewer did not execute its network mode.

Root subsequently executed this exact read once, successfully, at **2026-11-17 23:43:58.882–23:43:59.415 UTC** (18 November SGT). Private receipt SHA-256: `8a5cb8f3573025497c2c7c99fd8fd27be54fa800aec5d9ca5df3b84309a7075f`. This reviewer independently checked its local receipt: 122 attempts, 120 reconciled, exact spent/reserved inventory sums, expired v1 credit/balance/price deadlines, and matching current owner/fence. The actual monetary inputs and conditional allowance ceiling were sent privately to root for the concrete choice; no cap has been approved or installed by this read. The observed live owner continued renewing independently of the expired monetary grant. This preliminary snapshot is not substituted for the final post-retirement capture.

The four stored Sol/default rates were separately provided to the [model/price reviewer](model-price-review.md). Their original evidence deadline was expired; equality with a newly verified official price page would establish a new observation, not retroactively make the old evidence current. Root's billing UI reports a date-only new-credit expiry; its exact timestamp/time-zone boundary is still a packet input to resolve conservatively and record explicitly, rather than guessing the provider's time zone.

## Minimal installation and rollback sequence

`createOfflinePaidCloudCostBudgetSeed` is pure; `PaidCloudCreditOperator.install/refresh/inspect` already implements exact-state one-shot mutation and same-intent readback. These are reviewed library operations, **not an existing general deployment CLI**. The historical v87 package operator cannot be reused unchanged: `owner_config.mjs:96` explicitly requires a current, USD 3.40 v1 grant, and its stop/capture/start flow does not install a paid successor.

Prepare an exact private wrapper and packet before any write. Reuse the established stop/drain evidence, settings comparison, single-instance checks and source-pinned library functions. Do not remove the expired-grant check from a general wrapper or reinterpret expired v1 as current. The paid-migration wrapper must distinguish structural old-history validation from admission under the new current grant.

1. Record the verified funding/pricing evidence, proposed immutable cap/deductions, exact validity policy, one new UUID, source/package identity, old selected configuration and intended configuration diff. Preserve model, rate policy, consumer set and per-account consent.
2. Stop/drain every possible old process, including local workers. Confirm platform stop and the applicable server-observed owner lease expiry; a local timeout is not proof of a remote write outcome.
3. Retire the old runtime epoch using the reviewed exact owner/fence procedure, then take the final complete predecessor inventory. `paidCreditPredecessorMatches` requires an older predecessor generation and different epoch. Stop/drain alone does not satisfy it. The wrapper must show the exact retirement and any vacant-owner re-arm CAS; preserve cleanup generation, service identity and monotonic lease version. Neither deleting the owner nor an unguarded epoch write is acceptable.
4. Validate the pure seed against that captured fence/inventory. Install only the new UUID ledger once, through `PaidCloudCreditOperator`, with target absence and `maxAttempts: 1`. Any unknown acknowledgement requires `inspect` of the original UUID, exact expected seed and original inventories; do not create another ID or replay the mutation.
5. Read back the exact new ledger and unchanged old ledger/attempts/quotas. Change only the private selected-grant configuration to the matching installed v2 grant. Retain the single renewable service owner, and start only one service. Startup may advance the owner/fence and recover the existing selected paid ledger; it may not seed funding or fall back to v1.
6. Verify mounted package, configuration/grant equality, current owner/fence/lease, retained inventories/unknown holds, expected quota recovery and ordinary authenticated service. This authorization selects no paid model test; readiness/ledger evidence is not proof of an AI reply.
7. On rollback, stop/drain and preserve both ledgers and every attempt. Use a compatible package with the **same paid grant**, or ordinary-only mode. Never reactivate expired gift authority, zero counters, move attempts to `current`, release unknown holds, or enable another owner.

The final wrapper must be locally tested for wrong/stale fence, active lease, changed inventories/settings, duplicate target, missing ledger, unknown install/config ACK, expected configuration rollback and refusal to repeat a mutation. Its exact hashes and executable steps require independent review; this source review is not that completed operator verification.

## Maintaining the two-month target using current code

For each actual balance/price observation, choose a deadline no more than seven days later, also bounded by actual credit expiry and any known earlier price change. Review by day six where possible; a November 18 initial observation would ordinarily require another verified operation around November 24, with the actual clock times recorded. Subsequent reviews must use actual observation times, never pre-fill a schedule as future evidence.

At each review inspect balance/usage/deductions, unknown liabilities, model access and applicable prices. Use a controlled stop/drain and exact same-grant freshness CAS; preserve cap, funding, deductions, rates, credit expiry, counters, epoch fields and all attempts. `refresh` changes only balance verification timestamps and price snapshot ID/verification/validity timestamps. The observed balance must cover `C - paidSpent + U + unreflectedConfirmedOldAndNew`; current reservations are already included in `C - paidSpent`. Matching private configuration must be updated to the exact refreshed grant before starting the single service. Verify readback/owner and retain before/after evidence each time. Unknown ACK is reconciled read-only against the same packet.

Do not schedule artificial timestamp extensions or automatically assume an unchanged balance. If review is missed, funding is insufficient, rates changed or evidence is unclear, AI admission closes while ordinary service follows its existing behavior. Repeated short maintenance is an operational cost of this route; no two-month uptime or message-count guarantee follows.

## If one two-month evidence window is intended

This is possible as a different PM-approved project risk policy, not by falsely treating January as verified billing evidence. Prepare a narrowly scoped supersession of the seven-day policy in the decision/proposal/budget contract, explicitly accepting the longer interval's risk from price changes, shared-account spending and billing adjustments. Select an exact calendar cutoff and maximum duration that covers the actual 61-day target; do not equate two calendar months with sixty days.

The minimum source change is the paid evidence-window bound and its boundary regressions, preserving actual credit expiry, the minimum-of-deadlines admission check, exact fixed cap, successor deductions, ownership and per-account consent. Update both balance and price window tests, invalid-boundary/expiry tests, operator immutable-field tests and full affected verification. No new grant field, storage, provider, API or dependency is inherently required. The current decoder rejects such a packet, so a compatible reviewed package must be deployed before installing/selecting it; that deployment requires the applicable exact-package authorization. Existing current-package v2 capability alone is not evidence that this longer policy is already supported.

Even an accepted longer window remains a risk decision, not proof of future unchanged rates or an unconditional provider-invoice maximum. Preserve fail-closed behavior for known expiry, cap exhaustion or detected mismatch. No change to the 120-second owner lease is needed or implied. No policy/code/configuration change is made by this report.
