# Luna-first minimal prompt repair — 4 November 2026

Authority: [LI's bounded Luna-first repair decision](../../decisions/2026-11-04-li-luna-first-minimal-goal-repair.md).
This follows the retained [baseline model evaluations](../2026-11-04-cloud-resume/README.md).
Neither repaired candidate passed the unchanged all-case semantic gate. OpenAI
generation remains disabled in the application; no test-app deployment or APK
was produced from this candidate.

## Change and verification

Source `d97812dedf0408926bf4cf4aed0162429e7dd073` adds the explicit
`goal-grounding-v1` OpenAI prompt profile. One static paragraph asks the model to
follow the latest explicit outcome and constraints, treat labels and background
activities as context unless action is requested, avoid requiring unstated
objects, and ask only necessary questions. It contains no case IDs, marker values
or activity-specific branches. Baseline remains the default.

The production Responses builder and evaluator apply the same profile. The
original 24 inputs, histories, personas, golden baseline and semantic criteria
are unchanged. Tests compare both models' 24 candidate bodies with the actual
chat projection, preserve every baseline request hash, and reject baseline token
evidence or grants for a changed request. The source compiled strictly under
Node 24.19.0; 165 affected offline tests and an independent 59-test subset passed.
Independent source and operator reviews found no remaining dispatch blocker.
These checks establish source behavior, not semantic acceptance.

Both models received new exact-body token preflight evidence. The single-use
operator pinned clean Git source, the entire compiled Backend JavaScript tree,
evaluation helpers, fixtures and its own checksum. It retained all original 50
attempt records and both model quota histories. Luna ran first; Sol was admitted
only after the changed Luna report had a complete, hash-bound independent failure
review. There were no automatic retries or additional prompt candidates.

## Actual model results

| Model | Protocol and settlement | Semantic | Generation p50 | Generation p95 | New usage charge |
| --- | --- | --- | --- | --- | --- |
| Luna | 24/24 | 21/24 | 2.450 s | 4.613 s | US$0.0018537 |
| Sol | 24/24 | 23/24 | 3.454 s | 12.560 s | US$0.0441940 |

These are 24 synthetic operator observations per model, including settlement.
They are not 30-sample phone end-to-end measurements or a provider invoice.
All calls used low reasoning, nonstreaming structured Responses output and
`store:false`; no real-user content was submitted.

Luna retained both original failures:

- `reported-english-goal-chinese-reply`: despite the explicit quiet-break goal,
  it asks which device to verify and directs checking device instructions before
  resting. It supplies one restful step instead of the required three.
- `labelled-desk-goal`: it still requires gathering loose papers that the user
  did not identify as present.

It also regressed `explicit-language-request`: a three-minute neck block gives
two 30-second holds on each side, defining two minutes without a remaining
minute. Together with the two-minute shoulder block, the described actions total
four rather than the requested five minutes.

Sol corrected Luna's paper and timing failures and regressed no original or
baseline-Sol passing case. Its sole failure remained the label/goal confusion:
it asks which device/function to verify, adds five minutes of studying, then
offers the break as only its last step. The generic rule did not correct this
behavior; the minimal repair is therefore unsuccessful for adoption.

[Luna complete responses](luna-report.json), [independent review](luna-semantic-review.json),
[Sol complete responses](sol-report.json), [independent review](sol-semantic-review.json).
The original failed reports remain untouched in the preceding evidence folder.

## Budget and service state

Both retests together added **US$0.0460477**. The same original US$3.40 grant now
has 98 attempts and 96 settlements: **US$0.0872567** confirmed charges and
**US$0.004096** retained unknown reservations, leaving **US$3.3086473**.
The two original ambiguous requests remain reserved and unchanged. Neither
restart, model selection nor this follow-up replenished the grant. Existing
balance/price freshness expires at 16:00 UTC on 4 November; this record does not
extend it or authorize more trials.

[Luna accounting](luna-accounting.json), [Sol accounting](sol-accounting.json),
[source, hashes and measured results](validation.json).

The local service was gracefully stopped during the paid runs, and its existing
exclusive lock guarded each evaluator. Azure Japan East continued serving the
ordinary Backend without a new deployment. After both runs, the original local
service was restarted normally; its existing local-model configuration remains.
Readiness was confirmed at 10:04:57 UTC, with Firebase Auth and Firestore checks
passing. A subsequent read-only comparison confirmed the entire monetary record,
all 98 attempts and both model quota records exactly matched the post-Sol state.
[Restoration and unchanged-ledger receipt](restored-service-and-ledger.json).
The candidate profile stays opt-in and unadopted. Rollback requires no cloud or
client action because it was never enabled. Keep the known ordinary Azure package
and the existing signed v54 client described in the prior evidence.

No phone was attached, no real-user consent was exercised, and no Wi-Fi/mobile,
host-off, UAT or Release acceptance is claimed. Conditional test-app work remains
closed because both candidates failed the approved quality gate.
