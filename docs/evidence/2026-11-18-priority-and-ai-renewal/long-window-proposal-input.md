# One paid-credit continuation: exact long-window patch proposal

Status: **prepared for review; not approved for implementation or execution**. The [current decision](../../decisions/2026-11-18-li-onepa-priority-and-ai-continuation.md#confirmed-allowance-and-long-window-proposal-direction) records an approved **additional per-grant allowance A = USD 3.40**, and the user's choice to receive a concrete one-time two-month rule-change/risk proposal first. This does not authorize applying the patch, deployment, grant/configuration writes or model calls. Backend v87 and its seven-day decoder remain unchanged.

## Proposed fixed cutoff and delayed verification

Proposed `Tcut = 2027-01-18 07:42:00 Asia/Singapore`, exactly `2027-01-17T23:42:00.000Z`. Root proposes this minute by taking the private funding observation at `2026-11-17T23:42:47.574006Z`, rounding **down** to the minute, then adding two calendar months. This is a concrete proposed operator choice, not the user's verbatim timestamp or an already installed expiry. It is 47.574006 seconds less than 61 days after that observation.

The production decoder's proposed maximum interval is exactly **61 × 24 hours**, not 62 days. Each actual observation keeps its real timestamp. For the one installation packet:

```text
balanceValidUntil = min(Tcut, balanceVerifiedAt + 61 days,
                        actualCreditExpiry, any known earlier applicable price change)
priceValidUntil   = min(Tcut, priceVerifiedAt + 61 days,
                        actualCreditExpiry, any known earlier applicable price change)
```

If a trustworthy funding/pricing limitation requires an earlier deadline, use it and disclose that shorter achievable period. Do not invent a later observation. Delayed approval, deployment or verification **does not move Tcut** or restart a new 61-day period. If either evidence deadline is not strictly after its own observation, refuse the packet. At the exact earliest deadline, existing `now < expiresAt` admission closes; no extra millisecond is granted.

Actual purchased-credit issuance and expiry remain separate factual fields. The UI currently provides a date-only credit expiry; record a verified or explicitly justified conservative boundary before producing an executable financial packet, without claiming an invented provider timestamp. The support cutoff is never written over the actual credit-expiry fact. The allowance remains subject to the approved predecessor-liability formula and a fresh final inventory; the earlier read supports the proposed USD 3.40 cap but is not the post-retirement installation inventory.

## Exact unapplied patch

Private patch: `/home/miku/.local/state/enmori-ai-renewal-20261118/long-window-proposal/paid-credit-61-day-envelope.unapplied.patch`.

SHA-256: `fe5697ff595df00e4e873b8d51d4705eac239b7ced62f0ca4baeef61ec5b8292`.

Baseline: source commit `04f80272027f582c61c524c6cbec2a4dcb5b9578`; the affected production/test files are unchanged in the working tree. The private proposal generator reads them and writes copies/diff only outside the repository. `git apply --check` succeeded; the patch has **not** been applied.

Production change, exclusively in `backend/src/ai-runtime/domain/cloud-cost.ts`:

```diff
-export const paidCreditReviewWindowMs = 7 * 24 * 60 * 60 * 1000;
+// Maximum per-observation envelope; the reviewed operator packet fixes the earlier absolute cutoff.
+export const paidCreditReviewWindowMs = 61 * 24 * 60 * 60 * 1000;
```

The second file, `backend/test/ai-runtime/paid-cloud-credit.test.ts`, imports the existing expiry/current helpers, corrects the old seven-day-specific comment, moves the existing over-window fixture's credit expiry beyond the tested boundary so that credit expiry cannot mask the intended window rejection, and proposes six permanent cases:

- exactly 61 days is accepted, while an existing seven-day packet remains accepted;
- each balance/price window separately rejects 61 days + 1 ms;
- each separately rejects 62 days;
- later real verification timestamps preserve a supplied fixed cutoff and close at equality;
- actual credit expiry and earlier independent balance/price deadlines retain their existing effects;
- verification at or after the packet cutoff cannot reopen that packet.

No public API, grant/ledger schema, field, amount formula, rate, model, dependency, quota, owner lease or account-consent rule changes. V1 is unchanged. The constant is a **generic maximum for v2**: it does not itself encode 18 January. This intentionally avoids a temporary calendar date in the domain decoder. Existing runtime admission never changes evidence timestamps, and startup does not invoke the operator.

The absolute Tcut must therefore be fixed in the approved single-use packet, the two selected grant deadlines and the operator's exact expected-output checks. Do not authorize a later manual refresh or generate a replacement grant that extends beyond Tcut. A separately crafted packet with shifted observations and deadlines within 61 days can pass the generic decoder; this patch must not be represented as a cryptographic or domain-level prohibition of that separate operator action. The intended restriction is the exact approved operation plus existing configuration/ledger equality, not a new hidden schema field.

## Offline evidence and limits

Pinned Node 24.19.0 ran a private, purely synthetic nine-case demonstration against (a) the current compiled decoder and (b) a private copy whose only executable difference is the proposed bound. All **9/9 passed**. The current decoder intentionally rejected the synthetic 61-day packet under its approved seven-day policy; that is not a product defect. The copied proposal accepted 61 days and rejected the independent over-bound windows, preserved earlier expiry, and demonstrated fixed supplied timestamps at admission. A final explicit control confirmed that the generic interval alone does not enforce the separate operator's absolute Tcut.

Private artifacts: `long-window-proposal/decoder-demonstration.mjs`, `decoder-demonstration.log`, `cloud-cost-proposed.mjs`, and `proposal-build-receipt.json` under the same private renewal directory. Demonstration log SHA-256: `8d898d3ca2bb0586ffa33a8d736219752e9d7890f61db3acef186ddad34cd169`. All funding/rates/IDs in the demonstration are fabricated fixtures. It reads no Firebase, credentials, provider API or real account data. No repository source/test was changed or compiled for this demonstration. The proposed TypeScript test additions have not yet been applied, typechecked or run as the permanent suite; source/fake demonstration is not deployable-package or live-acceptance evidence.

If implementation is approved, first run the new permanent tests against the old bound to capture the expected policy-change baseline; then apply the production change, run all paid-grant/operator/ownership/unknown-ACK/expiry tests, full backend verification, isolated Firebase and Azure entry checks, and independent review. Retain the exact v1 formula, full predecessor unknown liabilities, same-ID install inspection, one-mutation guard, unchanged rates/cap on refresh and quota recovery semantics. The compiled candidate package must contain only reviewed changes and match the final source.

## Risk being accepted if the proposal is approved

The longer window is an explicit maintenance/risk tradeoff: it removes planned weekly evidence refreshes for this one continuation. It does not prove that provider prices, spendable shared funds, billing adjustments or model access will stay unchanged for two months. The [independent current-price review](model-price-review.md) verifies the four currently applicable rates; it is point-in-time evidence, not a future price guarantee.

The local ledger reserves and settles using the frozen price snapshot and returned usage counts. Its USD 3.40 cap bounds that local approved arithmetic. An unobserved provider rate increase, external account consumption, pending external liability or provider adjustment can make actual provider charges/available balance differ. Do not describe the local cap as an unconditional provider-invoice maximum. Known current external liabilities still need to be deducted or resolved before installation; accepting future observation risk does not turn a known funding deficit into valid funding.

The package retains cap exhaustion, actual credit expiry, fixed evidence cutoff, consent and ownership failure behavior. It adds no automatic top-up, background freshness extension, future price prediction, retry of unknown operations or reset of existing quotas. Ordinary service keeps its established failure behavior. Current minute/day/cooldown allowances remain governed by the existing shared rate authority; funding does not replenish those quotas.

## Deployment/install order and rollback

This is a contract/source change followed by a concrete operator migration, not a configuration-only renewal. Current v87 rejects a 61-day grant. Do not select the long grant while v87 remains the active decoder, nor start a new package merely to acquire an owner before the reviewed monetary migration.

After separate implementation/execution approval, prepare and verify the compatible exact package and operator locally. Stage the compatible package before the financial migration; inside the reviewed stop/drain window, retire the old epoch, capture final retained history, validate/install the one paid seed and inspect the exact result, select the matching v2 grant and compatible package, then start one service. Every actual ordering/operation belongs in the exact operator packet. Maintain the old and new complete ledger/attempt inventories; compare the existing expected quota recovery transformation rather than requiring post-start epoch/deadline bytes to remain identical.

The existing `FirestoreServiceOwner`, `FirebaseAdminFirestoreGateway` and `PaidCloudCreditOperator` supply the reviewed owner/read-time and ledger primitives. The old v87 package-only wrapper requires current v1 monetary authority and does not implement this migration. A new narrow wrapper must preserve its stopproof/settings/state comparisons, strengthen retirement with the exact captured owner/fence, persist one original mutation intent, and reconcile lost acknowledgements without a replacement epoch/grant. The final executable wrapper has not been produced or approved by this patch proposal.

Rollback after paid installation must preserve both ledgers and every unknown hold. Use a compatible package with the same paid grant, or ordinary-only mode after stop/drain. Do not restore the expired gift, redirect paid attempts to `current`, reset the new paid counters, re-enable a second owner or use the old seven-day v87 decoder with the long packet. A successful future installation/readback will prove that operation only; an AI reply and broader release acceptance remain separately evidenced.

See [initial renewal review](ai-renewal-review.md) for the actual preliminary inventory and source mapping, and [independent long-window review](long-window-independent-review.md) for the independent scope/risk assessment.
