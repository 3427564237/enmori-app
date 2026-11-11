# Purchased OpenAI credit — bounded successor proposal

Status: **proposal for root review and then LI confirmation**. No implementation, real grant, payment, cloud mutation, or paid request is authorized by this document. Prepared on 11 November 2026 against the existing [monetary contract](../../api/openai-budget-contract.md), [5 November trial decision](../decisions/2026-11-05-li-sol-test-app-acceptance.md), [teacher-delivery decision](../decisions/2026-11-11-li-two-month-teacher-delivery.md), and [operating plan](2026-11-11-teacher-delivery-operating-plan.md).

Subsequent explicit decision: [LI approved implementing this exact proposal without automatic recharge](../decisions/2026-11-11-li-teacher-stability-implementation.md). The original proposal below is retained. Its actual-purchase verification and concrete cap/validity installation conditions still apply; no future balance has been invented or armed by that approval.

## Recommendation and authority boundary

After LI manually purchases the planned **S$10** and the actual credited USD amount, spendable balance, deductions and expiry are verified, install **one separate paid-credit grant**. Use `ai_cloud_cost_budget/{grantId}` and its own `attempts` subcollection. Leave `ai_cloud_cost_budget/current` and every old attempt in place. Do not represent purchased credit as a gift, extend the old gift expiry, reset old counters, copy old attempts into a clean ledger, or treat a restart as new funding.

Propose an immutable new allowance of at most the actual purchased USD credit, reduced for older possible charges as specified below. This is a new allowance that needs explicit LI approval; the intention to buy S$10 has not already approved replacing the US$3.40 cap. The existing gift grant remains governed by its exact `originalGift / 20` formula. This proposal does not refresh that grant or resolve the discrepancy between its stored expiry and the user-reported expiry.

Retain the existing Azure service, authenticated-account audience, `gpt-6.1-sol`, model/request configuration, shared monetary/rate owner and consumer set: evaluation, test app, Conversation, Persona preview and proactive follow-up. A teacher account has no separate reserved allowance. Individual optional-processing/OpenAI consent, notification permission and schedules remain explicit. There is no automatic top-up, payment-method change, cloud-plan change, new scheduler, pricing scraper, telemetry stream or retention expansion.

## Evidence required before an installation packet exists

LI/operator supplies or inspects the actual billing state for the same organization/project and credential scope used by ENMORI. Record privately: purchase receipt, checkout currency and tax/FX treatment, **net USD credited**, purchase issuance time, credited balance after any prior negative balance, credit expiry, other grants sharing the balance, and whether other applications can spend that balance. S$10 is an intended payment amount, not US$10 or a guaranteed USD conversion. Do not install a future-dated or invented receipt. If the purchase cannot be completed within LI's intended amount, report the actual checkout terms; do not pay more.

Verify current model access, applicable token/cache-write prices and quota without a paid generation. The existing model, default service tier, endpoint, context/token ceilings and cache behavior must match that verification. A web pricing page is not evidence of the account's purchased balance. Missing or ambiguous credit, expiry, price, model access or external spending scope leaves monetary admission closed.

The operator packet contains the proposed exact USD cap, funding and pricing evidence references, prior ledger/attempt digests, every unresolved amount, validity dates, selected grant ID and rollback instructions. Private billing pages, receipt/account identifiers and credentials stay outside Git. Git records only the decision and sanitized outcome; persisted grant references are bounded opaque evidence IDs as in the existing contract.

## Fixed allowance and older liabilities

Use integer USD nanodollars and `bigint` arithmetic. Let:

| Symbol | Verified value at installation |
| --- | --- |
| `P` | Net USD credit actually added by this purchase; exclude taxes/FX fees and any gift |
| `R` | Provider-reported spendable USD balance after known deductions |
| `A` | LI-approved maximum new allowance; recommended `A <= P` |
| `U` | The entire old ledger's `reservedNanoUsd`, including lost reservation/settlement acknowledgements |
| `D` | Old confirmed charges not demonstrably reflected in `R`; use the entire old `spentNanoUsd` if reflection cannot be established |

The new fixed cap is `C = min(A, max(0, min(P, R) - U - D))`. Thus other credits in the displayed balance cannot make the old liabilities disappear from this purchase's allowance. All terms must be verified nonnegative safe integers; subtraction and comparisons use `bigint`. A zero result is valid exhausted authority and authorizes no call. Known other spending must already be deducted from `R`; unresolved external liabilities require an additional verified deduction or refusal to install, not an assumed zero.

`U` is deliberately deducted even if some of those requests may already have reduced the displayed balance. Ambiguous reflection is never used to release a hold. `U` and `D` remain fixed conservative deductions for this successor; later information does not automatically increase `C`. The old records retain their original spent/reserved amounts and every attempt state. This proposal adds no operator settlement, refund, transfer or deletion of an old unknown attempt. A stopped process cannot recover its lost dispatch or settlement capability.

The new ledger starts its **own** spent/reserved/attempt/reconciled counters at zero because it represents new funding. Its spend plus reserves can never exceed `C`. Older liabilities are not inserted as fake new attempts and are not counted as new confirmed spend. Reports must identify both grants; the new zero counters must never be presented as lifetime zero usage. A price change, second purchase or later cycle does not create another allowance automatically.

## Minimum internal storage and configuration change

Keep v1 decoding and its existing `current` path unchanged. Add an exact `openai_cost_grant_v2` variant for this single purchased-credit successor, with these fields:

| Field | Proposed meaning |
| --- | --- |
| `schemaVersion`, `grantId`, `provider`, `currency` | `openai_cost_grant_v2`, new random UUID, `openai`, `USD` |
| `fundingKind`, `fundingReference` | `purchased_credit`; bounded opaque purchase/evidence reference |
| `creditIssuedAtMs`, `creditExpiresAtMs` | Actually verified purchase issuance and expiry |
| `creditedPurchasedNanoUsd`, `approvedCapNanoUsd` | Immutable `P` and approved `A` |
| `verifiedSpendableRemainingNanoUsd` | Immutable creation observation `R` |
| `predecessor` | Exactly `{grantId, reservedLiabilityNanoUsd, unreflectedSpentNanoUsd}` identifying the retained v1 `current` grant and fixed `U`, `D` |
| `balanceVerifiedAtMs`, `balanceValidUntilMs` | Last explicit verification and its approved review deadline |
| `capNanoUsd` | Exactly `C`, fixed for the grant |
| `priceSnapshot` | Existing exact snapshot/price shape; only the unchanged selected Sol model is allowed for this deployment |

No `originalGiftCreditNanoUsd` or fictitious gift cycle is present in v2. Reject extra fields, malformed references, unsafe integers, invalid time order, wrong predecessor or a cap not equal to the approved formula. Credit/balance/price expiry remain independent; the earliest closes admission. The original v1 schema and five-percent arithmetic are not weakened.

The v2 ledger uses `schemaVersion: openai_cost_budget_v2` and the same remaining ledger fields: `grant`, `processEpoch`, `generation`, `lastObservedAtMs`, `reservedNanoUsd`, `spentNanoUsd`, `attemptCount`, `reconciledCount`. Its document ID must equal `grant.grantId`; its attempts retain the existing exact `openai_cost_attempt_v1` shape and original grant ID. No collection or index is added. The old `current` document is not repurposed as an active pointer.

Select exactly one grant in the existing private OpenAI configuration. Derive the ledger path from the validated grant variant: v1 means `current`, v2 means the exact UUID. Do not accept an arbitrary database path or discover the newest grant on startup. Replace the two existing hardcoded US$3.40 checks **only** with variant-specific validation: the current gift deployment retains that cap; the explicitly reviewed paid configuration must exactly match its installed v2 grant and approved cap. All OpenAI consumers receive the same one monetary owner; no fallback to an older ledger when the selected one fails.

Recovery/reserve/settlement retain their original owner, clock, runtime-fence, unknown-ACK and `maxAttempts:1` rules. Every attempt stays permanently bound to its original path/grant. For this first successor, a reserve also checks the same UUID under the retained predecessor's attempts and rejects reuse there; it does not fetch old content or replay an operation. Do not construct a chain/registry for hypothetical later purchases in this slice. Any further successor needs its own reviewed carry-forward accounting.

## Explicit installation and rollback

1. Finish source/fake/guarded Emulator review before making a real packet. Obtain approval of the concrete purchase evidence, new `C` and validity windows. Stop and drain all old owners and workers; preserve the exact old ledger and complete attempt digests.
2. Retire the old runtime epoch through the existing reviewed operator ownership procedure **before** taking the final predecessor snapshot. Require confirmed fence replacement: an old in-flight transaction must conflict with it. Local stop or a lost transaction acknowledgement alone does not prove the old ledger is stable. If renewable service ownership has been adopted, follow its stopped/drained, expired-lease re-arm procedure; this monetary proposal does not invent another owner path.
3. Read the now-fenced predecessor and verify its sums/counts against retained attempts. Prepare the v2 seed from that exact observation and billing evidence. In one single-attempt transaction read the captured current runtime fence, entire predecessor ledger and target absence; then create only the new v2 ledger. Do not modify the predecessor, delete attempts or reset quota. An existing target, changed predecessor/fence, or unknown ACK stops installation.
4. Read back the exact seed and unchanged predecessor/attempt digests. A lost create ACK is reconciled read-only against the same grant ID; never create a second grant to make the operation look successful. Install compatible configuration/package, acquire ownership through the reviewed procedure, and recover only this existing ledger. Recovery never seeds missing state or allocates new money.
5. Verify ordinary authenticated service and both ledger inventories without a paid model call. Keep the old package/configuration as evidence. Rollback closes/drains the paid owner and preserves both ledgers and all attempts; use a compatible package with the same paid grant, or ordinary-only mode. Do not reactivate an expired gift, redirect paid attempts to `current`, or reset the paid counters to make an old binary run.

## Longer validity without pretending to know future balances or prices

Recommend a **maximum seven-day operator review window**, checked and refreshed by day six where possible, rather than the current daily midnight boundary. This is a proposed maintenance/risk policy requiring LI approval; it is not a statement that today's evidence proves the next seven days. App startup, scheduled follow-ups and service restarts cannot advance either timestamp. Do not set evidence validity directly to 16 January merely because that is the desired support end date.

At each review LI or a named authorized operator inspects actual balance/usage, negative or pending charges, unchanged model access/rates and any known future price-effective date. Balance/price validity ends no later than seven days after its own observation, the actual credit expiry, or an earlier known applicable price change. Use a shorter window if the evidence supports only that. Check early enough to plan a short controlled stop/drain and the existing compare-and-set freshness update, then read back; an on-time manual refresh avoids a scheduled daily AI shutdown. It does not promise maintenance without interruption.

Refresh may change only balance-verification timestamps and price snapshot ID/verification/validity timestamps. It cannot change creation `R`, `P`, `A`, `C`, predecessor liabilities, model, rates, credit expiry, counts, amounts or attempts. Preserve the previous evidence and exact ledger/attempt digests. The new observed balance must cover `C - newLedger.spentNanoUsd` (which includes current reservations), the full retained `U`, and confirmed old/new charges not demonstrably reflected in that balance. Old confirmed charges now proven reflected need not be deducted a second time in this coverage check, but creation `D` and `C` still never change. If billing evidence cannot establish coverage, do not refresh. There is no automatic inheritance of a larger balance, exchange-rate gain, refund, gift renewal or manual top-up.

This policy requires LI's confirmation that the verified funding scope is not being independently consumed by another application; otherwise the packet needs a concrete allowance for that spending or a shorter reviewed window. No new provider account, key, payment method or spend-limit setting is selected here. A provider billing error, observed price mismatch, unexpected external spend or unverifiable deduction closes cloud admission for operator reconciliation; no blind model retry or grant enlargement follows. Ordinary features continue under their existing failure contract.

The [current official pricing page](https://developers.openai.com/api/docs/pricing) distinguishes model, service mode and cache-write prices; it is a point-in-time source, not a two-month price guarantee. The [official spend-limit guidance](https://developers.openai.com/api/docs/guides/spend-limits) says enforcement can lag, so even a provider limit is not exact enforcement of this application's grant. The [billing error guide](https://developers.openai.com/api/docs/guides/error-codes) separately identifies exhausted credit. These pages were read on 11 November; they do not verify this account's future receipt or balance. This proposal changes no provider spend-limit configuration.

The local hard-cap proof holds for calls that all cross this authority and whose actual applicable charges are bounded by the verified price snapshot. Unannounced price changes, independent account spending or provider billing adjustments between reviews are not bounded by this local ledger. A seven-day policy explicitly retains that residual risk; it cannot honestly promise an unconditional provider-invoice maximum. If LI requires that stronger guarantee, the current manual-evidence mechanism is insufficient and that requirement must stay unresolved rather than being hidden by a later `validUntilMs`.

## Verification and honest delivery claim

Before approval to arm, cover at least: unchanged exact v1 formula; invalid/mixed gift-paid records; cap arithmetic/overflow/negative capacity; old unknown ACK deduction; same attempt ID across both paths; independent new counts with byte-for-byte old history preservation; missing selected ledger; configuration/ledger mismatch; concurrent reserve at the new cap; expiry and stale evidence; unknown install/recovery/reserve/settlement ACK; epoch replacement and late old transaction; restart retaining all reserves; refresh preserving every immutable value; and all five consumers sharing the one owner. Use fake prices and isolated Emulator records, no paid generation.

Recommended evidence layers are contract approval, source/Emulator results, actual purchase verification, operator installation/readback, and subsequently authorized real-client behavior. Funding is only one condition of two-month operation. This proposal cannot guarantee a message count, fair teacher allocation, no outages, unchanged prices or that S$10 lasts until 16 January. Existing 30-day device registration, operating ownership, physical push delivery and cross-region use remain separate constraints.

Suggested LI confirmation after root review: “批准为手动 S$10 充值核实后的实际 USD 余额建立独立 paid grant，按上述公式扣除旧未知费用并固化新上限；旧赠送账本和全部 attempts 保留。批准最长七天、提前人工复核的维护窗口；不自动充值或扩大额度。实际到账、有效期和具体上限核实后再安装。”

## Source implementation points reviewed

- `backend/src/ai-runtime/domain/cloud-cost.ts`: v1 exact decoder, gift formula, expiry, reservation and settlement arithmetic.
- `backend/src/ai-runtime/infrastructure/firestore-cloud-cost-budget.ts`: hardcoded `current`/attempt paths, exact grant equality, single-attempt transactions, immutable original reserves and non-recoverable local permits.
- `backend/src/ai-runtime/application/cloud-cost-budget-owner.ts`: one original dispatch capability, no automatic grant initialization/refund.
- `backend/src/bootstrap/openai-test-app-composition.ts` and `tool/azure_backend.mjs`: both currently require US$3.40; changing the configuration alone cannot install this proposal.

This commit adds only this proposal. It changes no normative API contract, source, configuration, data, billing state or production permission.
