# Backend and OpenAI recovery — 4 November 2026

Authority: [approved recovery](../../decisions/2026-11-02-li-cloud-ai-backend-resume.md)
and [regional continuation and bounded compatibility verification](../../decisions/2026-11-04-li-indonesia-comparison-continuation.md).

Later on 4 November, LI authorized a bounded Luna-first minimal prompt repair.
The baseline below remains historical evidence; see the
[follow-up results and cumulative accounting](../2026-11-04-openai-goal-repair/README.md)
for the subsequent candidate runs and their unchanged rejection gate.

## Ordinary Backend deployment

Japan East now runs ordinary Backend source `1e3c5c085ac1a810517e671061290ac30946cbf8`.
The package fixes late provider-result acceptance, joining an already-cancelled
onePA catalogue read, and starting work after a disconnect during authentication.
The existing ten-second provider limit and explicit partial-source failure remain.
No model or scheduling worker is constructed by this deployment. The active
package manifest was read back, not inferred from upload success. [Deployment](deploy-status.json),
[checksum](ordinary-package.json), [package readback](deployed-package-readback.json).

All three Event regressions failed before their fixes. The deployed source passed
strict Node 24.19.0 compilation and 1775 Backend tests. Later OpenAI-only compatibility
and diagnostic source passed 1778 Backend tests; those later changes are not
deployed as a cloud AI service. The six Azure entry/latency-tool tests passed with
the existing `--experimental-test-module-mocks` flag; omitting that flag initially
failed the module-mocking test without indicating a product failure.

OneDeploy marked the package active before its replacement worker was ready.
The initial 30-per-category benchmark crossed a 406.62-second startup and old/new
container handoff; its 14 failed Event reads remain recorded. A separate complete
post-readiness benchmark, using the same synthetic identity and request collection,
produced:

| Read | Samples | p95 | Failures | Operator-host target |
| --- | ---: | ---: | ---: | --- |
| Profile | 30 | 1175 ms | 0 | <=3 s met |
| Settings | 30 | 933 ms | 0 | <=3 s met |
| Friends | 30 | 1162 ms | 0 | <=3 s met |
| Events | 30 | 12513 ms | 0 | <=12 s not met |

These are operator-host measurements, not phone acceptance. All 30 stable Event
responses reported Ticketmaster available and onePA unavailable. Four exceeded
12 seconds. Worker CPU reached 98% during the stable Event series; aggregate
metrics cannot isolate provider, authentication or other process cost. The cold
startup and remaining Event tail are unresolved performance limits.
[Full stable samples](japaneast-post-ready-latency.json), [transition analysis](azure-activity-transition.md).

Separate 30-sample operator-to-dependency probes found Firebase revocation-check
p95 1099 ms and owned Firestore read p95 80 ms, no failures. These do not isolate
Azure-to-Firebase timing. [Dependency samples](dependency-latency.json).
Synthetic onboarding, isolation, stale revisions and private Check-in checks
passed, but the restart readback occurred during the worker transition and is
not proof of that check on the ready replacement. Both synthetic identities and
their owned records were removed. [Create](smoke-create.json),
[transition readback](smoke-readback.json), [cleanup](smoke-cleanup.json).

## Regional comparison

Student-credit balance was reported as US$100, expiring 28 October 2027, with both
spending limits on. Indonesia Central passed subscription policy and B1 catalog
validation, but both actual allocation attempts returned no available instances.
The second attempt used an isolated group as Azure suggested; its empty group
was deleted and absence verified. No candidate plan, app, identity or federation
was created; incremental candidate compute cost is US$0. Japan remains the
existing service. [Eligibility, exact errors, pricing and cleanup](azure-indonesia-preflight.md).

## OpenAI trial

The authenticated platform showed one available US$68 original/remaining API
grant, issued 29 October and expiring 19 November (exact timezone not displayed).
The immutable trial cap is US$3.40. A conservative earlier credit cutoff and
same-day balance/price freshness close generation automatically without
replenishment. The restricted key is owner-only outside Git. [Billing evidence](openai-billing.json).

Luna model access and all 24 free input-token counts succeeded. Its first paid
request returned a terminal HTTP 200 but failed protocol/accounting validation.
One separately claimed, previously unattempted case demonstrated an adapter bug:
a documented all-zero hosted-tool summary was rejected. The narrow fix accepts
only recognized explicit zero summaries; unknown, empty and nonzero summaries
remain rejected. Both earlier failed attempts and US$0.004096 reservations remain
intact. Their original capabilities were not replayed or retrospectively settled.
[Original failure](luna-initial-report.json), [diagnosis](luna-diagnostic-report.json).

Following independent source and operator review, one corrected Luna pass ran
the unchanged 24 prompts and rubric. All 24 passed protocol checks and reconciled
usage. Operator generation p50 was 2.16 s and p95 8.28 s; this is 24 observations,
not a 30-sample phone latency claim. The pass accounted for US$0.001729 from
provider-reported usage at the verified Standard rates; this is not an invoice.
Independent semantic review found 22/24 passes: the rest-plan verification-label
case and an invented required-paper case still failed. Eight of ten historical
failures were corrected with no regression. Luna is not approved for test-app
adoption. [Corrected report](luna-corrected-report.json),
[independent semantic review](luna-semantic-review.json),
[retained budget](luna-corrected-accounting.json).

Sol then ran its one permitted 24-case comparison after separate model access,
free token counts and independent review of the operator. It reused the same
monetary grant and retained all Luna charges and unknown reservations. All 24
protocol checks and settlements passed. Generation p50 was 4.43 s, p95 13.06 s
and maximum 13.68 s. Independent semantic review found **23/24** passes: the
verification-label case still became testing/study work instead of the requested
rest plan. Nine of ten historical failures were corrected, with no previous-pass
regression. Sol repaired one of Luna's two failures and regressed none of its
passes. Both candidates fail the unchanged all-case adoption gate, so no cloud
model was selected or enabled. No prompt sweep or further candidate follows.
[Sol report](sol-report.json), [independent review](sol-semantic-review.json).

| Candidate | Protocol | Semantic | Generation p95 | Confirmed usage cost |
| --- | --- | --- | --- | --- |
| Luna, corrected pass | 24/24 | 22/24 | 8.278 s | US$0.001729 |
| Sol | 24/24 | 23/24 | 13.064 s | US$0.039480 |

The durable ledger readback contains 50 attempts and 48 reconciliations:
US$0.041209 confirmed usage charges plus US$0.004096 still reserved, against the
original US$3.40 cap. Conservatively uncommitted allowance is US$3.354695. This
is application accounting, not a provider invoice or permission for further
experiments. The first two failed attempts were not erased, refunded or silently
rerun with the same capabilities. Runtime epochs advanced under the existing
exclusive process lock while preserving `cleanupGeneration`; the shared grant
was initialized once and subsequently recovered without replacement.
[Final accounting](sol-accounting.json).

The exact-generation-body token evidence, live/mock separation, durable rate
claims and content-free rejection diagnostics are now implemented. Independent
review caught and corrected mock token evidence acceptance, duplicate counting
JSON fields, mismatched provider/model rate authority, and the zero-tool envelope
compatibility defect before adoption. No real user content was sent to OpenAI.

## Rollback and evidence limits

The previously deployed ordinary package remains at
`/home/miku/.local/state/enmori-cloud-resume-20261102/ordinary-backend.zip`;
its source is `477417fe7c6b3696a1b766f6e8dd80c01929db70`.
Use a single deployment and inspect status/readiness before retrying or measuring.
The current package is retained under the corresponding `20261104` private folder.
Neither private directory, credential nor synthetic token state is a deployment
artifact directory to publish wholesale.

No Android device was attached. v54 remains the prior same-signature ordinary
client candidate; no new APK, cloud AI client rollout, real-user consent,
Wi-Fi/mobile-data phone acceptance, personal-machine-off acceptance, UAT or Release
is claimed. The local application service was temporarily stopped for exclusive
model evaluation while the Japan ordinary service remained available, then
restarted through its normal user service. OpenAI inference is not enabled in
either service. The actual personal computer stayed on; this does not substitute
for the plan's machine-off phone acceptance.
