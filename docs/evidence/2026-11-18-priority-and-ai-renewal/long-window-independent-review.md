# Independent review of the proposed two-month evidence window

18 November 2026, Asia/Singapore. Read-only review of source `04f80272027f582c61c524c6cbec2a4dcb5b9578` and the proposed scope. No production change, remote request, model generation or dependency change was performed by this reviewer.

The [current decision](../../decisions/2026-11-18-li-onepa-priority-and-ai-continuation.md#confirmed-allowance-and-long-window-proposal-direction) approves an **additional** allowance `A = USD 3.40` and preparation of a two-month rule-change/risk proposal. It explicitly withholds approval to apply, deploy or install that proposal. Existing v87/v88 behavior remains in force. See the [operator review](ai-renewal-review.md) for the complete funding formula and retained-liability inventory.

## What the fixed cap guarantees

The application guarantees `spentNanoUsd + reservedNanoUsd <= C <= A` in its ledger, calculated using the immutable grant's price snapshot. It reserves the maximum applicable input rate plus bounded output, then settles recognized token usage using those same stored rates. It does not receive or independently reconcile the provider's actual billed USD in that path. Source: `cloud-cost.ts:138–153`, `firestore-cloud-cost-budget.ts:190,262` and `openai-cloud-transport.ts:335–347`.

Consequently **USD 3.40 is not an unconditional ceiling on future provider invoices**. For illustration only, if an output rate doubled while the stored snapshot remained unchanged, 1,000 output tokens would still be accounted as USD 0.01 locally while the provider could charge USD 0.02 for that component. The longer evidence interval increases exposure to an unobserved price change; this is not a prediction that a change will occur. Keeping today's four rates unchanged is correct for today's observation but cannot establish their future validity.

The proposed policy must expressly accept this residual risk. If a price change becomes known, the existing packet's deadline must not extend past its effective time. A conflicting rate must not be silently substituted: the existing freshness operator forbids rate changes, so the service must stop new AI admission and obtain a separately reviewed resolution. No new monitoring or automatic price update is included in this proposal.

## Funding, service duration and quota are separate

The initial `C = min(A, max(0, min(P,R)-U-D))` preserves the predecessor's unresolved reservations and unreflected confirmed charges. It does not earmark provider funds against another application or later shared-account spending. There is no continuous provider-balance feed in the budget authority. External spending, billing adjustments or exhausted provider funds can therefore stop AI before the fixed date even with local allowance remaining. A visible single active key does not exclude future shared spending.

Likewise, exhausting the new local cap or retaining additional unknown-outcome reservations can stop admission early. The target is an authorization interval, not a promise of uninterrupted service or a number of responses. New funding does not refund or erase historical spending, change account consent, or bypass ownership.

Existing per-model quota documents must remain. `FirestoreCloudQuotaAuthority.recover` (lines 129–155) carries forward the last confirmed remaining minute/day reservation windows and cooldown, shifting them across downtime. It does not credit unproved downtime as free capacity. Startup may legitimately update epoch and shifted timestamps through that existing recovery; an operator should compare the expected transformation, not demand byte-identical quota documents after recovery or reset them to obtain an immediate AI response. Paid-ledger installation itself does not touch quota.

## Minimal rule and compatibility boundary

Changing `paidCreditReviewWindowMs` from seven to 61 days changes the decoder's **maximum allowed age interval for both balance and price evidence on v2 grants**. It leaves v1 decoding, actual credit expiry, the minimum-of-deadlines admission check, model/rates, cap arithmetic, predecessor checks and owner lease unchanged. It does not itself hard-code 18 January or limit the rule to one grant.

The concrete packet therefore needs one exact, approved `Tcut`, in UTC and Asia/Singapore, for both grant deadlines. Each observation-to-deadline interval must fit the 61-day bound; an observation obtained later must not silently restart a fresh 61-day service period. No later refresh beyond that `Tcut` is authorized by this continuation. If a code-enforced global calendar cutoff is wanted instead, that is additional scope beyond the one-constant proposal and needs its own design and approval.

Current v87 rejects a v2 grant whose evidence interval exceeds seven days. Merely selecting a new private configuration is insufficient. A compatible source/build, its matching local operator implementation and the amended contract must be verified together before a long-window packet can be installed or selected. The final reviewed package must retain the exact Sol/default settings and current quota policy.

## Installation and rollback order

After separate implementation/deployment/installation approval, prepare and validate the compatible package and exact operator packet offline. During the approved maintenance window, stop/drain all owners, establish lease expiry and retire the old epoch, then capture the final predecessor ledger/attempts, quota and configuration evidence. Stage the compatible package while stopped; avoid an intermediate boot that creates a new live owner between the final fence capture and installation.

Use the matching new implementation to validate and install only the absent target paid ledger, against the exact newer fence and complete predecessor inventory. Inspect any unknown acknowledgement against that same grant/packet; do not replay installation or choose a fresh ID. Confirm the installed ledger and preserved historical state, select the matching grant configuration, then start one compatible service and verify mounted package, fence/owner, ledger and expected quota recovery. Starting v87 with the new long-window configuration cannot be a successful rollback.

Rollback must retain both ledgers, every attempt and unknown hold. Use a compatible package with the same installed grant, or an explicitly prepared ordinary-service-only configuration; never re-enable expired gift authority or reset funds/quota. Neither a successful startup nor the live model-metadata GET constitutes a successful paid generation. [Model and price review](model-price-review.md) separates those observations.

## Review status

The scope above is technically coherent as a proposal, subject to explicit acceptance of the longer evidence interval's risks and an exact cutoff/packet. The source patch, permanent boundary tests, build, operator dry runs and live installation are not represented here as completed. Independent review of the final unapplied patch will be appended separately; this document does not authorize its execution.

## Final unapplied patch and proposal review

The first reviewed private patch `paid-credit-61-day-envelope.unapplied.patch`, SHA-256 `e701aea14deb103364addab55f558f0d983219128c17cbf9e511f94d53e940d0`, changes only the paid-window constant and its explanatory comment in production. The other proposed changes add six permanent test cases and adjust imports/an existing comment. The test additions independently cover both windows at 61 days, +1 ms and +1 day rejection, shorter packets, delayed observations with a fixed supplied cutoff, earlier independent deadlines, and observations at/after cutoff. Existing funding, v1, operator and immutable-field tests are retained. The patch does not yet include execution of those proposed TypeScript tests or deployment.

The final revision is SHA-256 **`fe5697ff595df00e4e873b8d51d4705eac239b7ced62f0ca4baeef61ec5b8292`**. It additionally repairs an existing test fixture: the formerly fixed credit expiry, approximately 23 days, is moved to two milliseconds beyond the later observation plus the tested policy window. Otherwise the old over-window assertion would reject on credit expiry first under a 61-day policy, concealing that assertion's intended boundary. I independently checked that correction and `git apply --check`; production remains the same two additions/one removal, and the patch remains unapplied. The copied-module demonstration below is unaffected by this test-only revision.

I independently compared the private copied executable module with the existing compiled module: its only changes are that constant and comment. Running the pure, synthetic decoder demonstration under the pinned Node 24.19.0 produced **9/9 passing**. This includes a negative control showing the current seven-day decoder rejects the long packet and a limitation control showing the proposed generic decoder can accept a separately constructed packet with a later absolute deadline. Thus the demonstration does not falsely attribute a global calendar cutoff to the constant. No Firebase, network or real funding was used. Private independent log SHA-256: `3f3265df8ece983242d7f41beb3805906c4e204a412c2c7c1620b7c0c6eea825`.

Working-tree production/test hashes remain unchanged: `cloud-cost.ts` is `1479cc8fd87470b03d83718ec538c40973a72a243e583821b56ccb10ee612268`; `paid-cloud-credit.test.ts` is `95e17689d67557476b16554ea19f29d02576385a0f5094c177ae017475a92257`. This is isolated proposal evidence, not a new backend regression/build or deployed version.

The [main proposal](README.md) now proposes **18 January 2027, 07:42:00 SGT / 17 January 2027, 23:42:00 UTC** as `Tcut`, anchored to the current funding-observation minute plus two calendar months. It clearly labels the minute as a proposed operator choice rather than an exact user instruction, prevents installation delay from moving it, retains the min-of-deadlines formula and distinguishes the newly approved allowance from pending policy/execution approval. I found no substantive overclaim in those sections. Final operator code still must enforce that exact approved packet and its unknown-acknowledgement rules before deployment/installation can be accepted.
