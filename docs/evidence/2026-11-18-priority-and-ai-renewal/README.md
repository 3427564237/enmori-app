# onePA priority adjustment and two-month AI continuation proposal

> LI subsequently approved implementation, regression and deployment. The [v89 execution record](../2026-11-18-v89-paid-continuation/README.md) reports the resulting state. The proposal below preserves the earlier review checkpoint.

18 November 2026, Asia/Singapore. **Decision and reviewable proposal; AI renewal has not been executed.** Current client/backend remain v88/v87. No backend package, live monetary ledger, configuration, consent or phone state was changed in this stage. [Confirmed scope and supersession](../../decisions/2026-11-18-li-onepa-priority-and-ai-continuation.md).

## onePA disposition

SC-03 is now a deferred external-source limitation, so causal closure of its intermittent availability is no longer by itself this candidate's release gate. The same-ID failure → recovery → failure remains real evidence; it is not relabelled fixed. No in-app explanation of this prioritisation is added. Activity ranking, acquisition, timeouts, existing limited-result/error/recovery behavior, identity validation, refusal handling and expiry protections are unchanged. [Source and UI scope review](onepa-scope-review.md).

Other independent gates, including the unexplained dedicated-account consent response difference, readable registration terms and final-device acceptance, remain. This priority change does not declare the app stable.

## Verified inputs and remaining limits

The user confirmed the new purchase arrived. Read-only billing UI then showed an available additional purchased-credit entry, a Paid invoice and an expiry beyond the requested service period; automatic reload remains OFF. The original near-expiry credit was kept distinct. Raw balances, receipt identifiers, organization details and screenshots are not copied into Git.

The current Azure-selected credential retrieved `gpt-6.1-sol` with HTTP 200 and no generation. The single visible active key in the billing organization's UI had a masked suffix matching that credential, with a Default-project label; this is supporting organization correspondence, not an audit of every possible future spender. Model retrieval does not itself prove Restricted-key Responses-create permission or a successful AI reply. A first private read script used the wrong local price-snapshot field shape and failed before sending a model GET; the corrected shape read succeeded, and both records are retained.

The retained v1 financial inventory was read once through a bounded read-only transaction and passed the existing complete-inventory validator. Its authority is expired; owner/fence correspondence and the renewable lease were current at observation. Predecessor charges, unresolved reservations and all attempts remain. This live preliminary snapshot is **not** the final stopped/fenced install snapshot. Current official model rates match the prior fixed rates, but prior verification timestamps are expired. [Financial/operator review](ai-renewal-review.md), [model/price review](model-price-review.md).

## Concrete proposed policy

LI explicitly chose a **new per-cycle approved allowance A = USD 3.40** and asked for the rule-change/risk proposal for one two-month authorization before implementation. This is additional to preserved old spending; it is neither an automatic right to spend the entire purchase nor a lifetime-reset operation.

| Item | Proposed value / behavior |
| --- | --- |
| Service cutoff | **18 January 2027, 07:42:00 SGT** (`2027-01-17T23:42:00.000Z`). This proposed minute is the current funding-observation time rounded down to a minute, plus two calendar months. The user's approved target was the date/period, not this precise minute. Approving the concrete plan fixes this cutoff; deployment delays do not slide it forward. |
| Evidence-window ceiling | Replace the paid-v2 seven-day ceiling with **61 × 24 hours**. This fits 18 November → 18 January; it is not a generic claim that two months always equal 60 or 61 days. No change to v1. |
| Actual packet deadlines | For each balance/price observation, `validUntil = min(fixed cutoff, its verifiedAt + 61 days, verified purchased-credit expiry, any known earlier applicable price change)`. Later pre-install verification does not move the fixed cutoff. |
| Credit facts | Keep actual purchased issuance/expiry separate from the service cutoff. The UI currently exposes dates, not exact second-level issuance/expiry; the final packet must resolve those facts or document a competent, conservative interpretation before installation. Do not invent January as the provider's credit expiry. |
| Installed cap C | Existing integer-nanodollar formula `min(A, max(0, min(P, R) - U - D))`. A is fixed at 3.40; actual fresh balance, all predecessor reserves and unproven-reflected spend are still checked. Present observations support a provisional C of 3.40 under the stated funding scope, not an executed grant. A lower validated result must be shown rather than silently increasing authority. |
| Model and request policy | Existing Sol/default, low reasoning, existing input/output ceilings and quotas. No model switch, cache-retention extension or new consumer. |
| Automatic actions | No automatic top-up, freshness extension, future grant selection, retry of unknown generation, or permission/consent change. Restart cannot move the deadline. |
| At deadline or exhausted cap | Stop new AI admission using the current behavior; preserve financial/product history and ordinary non-AI service. |

The library ceiling is generic paid-v2 validation; the exact January cutoff is enforced by the one reviewed packet and no automatic refresh. A one-line ceiling change alone does **not** cryptographically prohibit a separately authorized operator from installing later evidence. Such later renewal is outside this decision and must not be presented as already approved.

## Risks being accepted if the longer policy is approved

1. **Price drift:** the internal cap is computed from the verified price snapshot. Provider usage returns token counts, not the final invoice dollars. If actual rates increase before the fixed cutoff, the unchanged ledger may undercount the invoice; USD 3.40 is therefore not an unconditional provider-invoice guarantee. Keep the currently approved rates and record any known scheduled change as an earlier cutoff.
2. **Shared funding and adjustments:** other uses of the organization or provider adjustments can reduce real funds before ENMORI's ledger reaches its cap. There is no continuous provider-balance monitor. A long window increases this observation gap; source/payment/access failure still stops usable AI, and purchased credit alone does not guarantee uninterrupted service for two months.
3. **Finite capacity:** two months is a time limit, not unlimited usage. The cap, existing quotas, retained unknown liabilities and per-account consent can stop or deny generation earlier. No reset is used to manufacture capacity.
4. **Rollout compatibility:** v87 rejects a 61-day v2 packet. A compatible reviewed backend package must be deployed before paid-grant selection. Config-only date editing would leave admission unavailable. The existing v88 APK does not require rebuilding for this budget rule.
5. **Transition ambiguity:** stop/drain, exact epoch retirement, one-shot grant installation and config synchronization can have unknown acknowledgements. Reconcile the same intent/UUID by readback; never blind-retry, discard an old hold or start a second owner. Keep ordinary-service fallback explicit.

The seven-day rule is a project risk policy, not a law or provider limitation. The proposed change consciously accepts a longer observation interval; it does not claim that today's balance/prices have been verified in the future.

## Implementation and acceptance scope if approved

- Preserve the 11 November decision and proposal; add a narrow superseding long-window decision and update the budget contract. Retain funding/deduction math, all current and old attempts, consent, owner, rate policy and normal API/data model.
- Change only the paid-v2 evidence duration bound in production. Prepare boundary regressions for balance and price independently (exact 61 days accepted, +1 ms refused), earlier actual credit expiry, earlier fixed packet cutoff, exhausted cap, current v1 behavior and unchanged operator immutable fields.
- Verify the full backend suite, the affected monetary/operator/owner suites, isolated Firestore transactions and the real Azure composition/loader with a synthetic long-window packet. No automated test targets live product data or makes a model call.
- Build and independently check the exact backend candidate. Retain the same v88 APK. Present that concrete package, test results, private-config diff and rollback for deployment approval; do not treat this proposal as the later package approval.
- Prepare the one-shot private operator with persisted intents, wrong/stale state rejection and unknown-ACK readback. While the one existing service is stopped/drained, stage the compatible package, retire the old epoch with exact owner/fence conditions using the matching new operator, capture final history, validate/install one new paid ledger, select exactly that grant and start the compatible service once. Do not boot an intermediate owner between capture and installation. Verify both retained histories, config/grant equality, mounted package, owner lease and ordinary endpoints.
- No new paid model verification is selected yet. A separate bounded synthetic-send decision is needed to add AI-reply acceptance; read-only model and ledger readiness cannot substitute for it. No phone operation.

See [operator sequence and rollback](ai-renewal-review.md#minimal-installation-and-rollback-sequence). Rollback keeps both histories and the same compatible paid grant, or restores ordinary-only mode. It never reactivates expired v1, deletes the new ledger, frees unknown reserves or rolls back user data.

## Proposal validation

A private, **unapplied** source/test patch is prepared for review: one production duration constant/comment plus proposed boundary regressions. The copied proposed module passed nine synthetic offline demonstrations, including the existing seven-day decoder deliberately rejecting the long packet, the proposed 61-day boundary, +1 ms refusal and separate earlier deadlines. These demonstrations are not a full backend run, a successful compilation/run of all proposed permanent tests, a deployed package or paid-grant acceptance. Main production/test files and the normative budget contract remain unchanged.

[Exact patch scope and prototype evidence](long-window-proposal-input.md), [independent risk/patch review](long-window-independent-review.md), [verification receipt](verification.json).

## Delivery status

onePA priority is recorded; the AI amount is confirmed; funding, current model visibility, historical liability and applicable rates have been checked at separate evidence boundaries. The longer-window implementation/deployment has **not** been approved or applied yet. Current expiry remains effective until the successor is actually installed and verified. The requested output for this stage is this concrete rule-change/risk proposal, not a claim of completed two-month renewal.
