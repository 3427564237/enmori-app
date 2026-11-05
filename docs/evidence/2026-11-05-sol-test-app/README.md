# Sol bounded test-app integration — 5 November 2026

[LI's scoped acceptance decision](../../decisions/2026-11-05-li-sol-test-app-acceptance.md)
defers only `reported-english-goal-chinese-reply`. The preserved Sol result is
23/24, with one nonblocking failure; the remaining blocking set is 23/23.
Luna's remaining grounding/arithmetic failures still block its selection.
No additional prompt/model evaluation was run to implement this decision.

## Source checks

The explicit test-app composition pins Sol, low reasoning, `goal-grounding-v1`,
structured nonstreaming Responses and `store:false`. The accepted projection is
counted before generation; consent and source authority are rechecked afterward,
and the paid request must match the counted body. Count and generation each
consume a persistent rate slot. Both adapters persist trusted late 429s, and
concurrent cooldowns retain the strongest waiting hold.

The expected-fence startup admits at most one cloud owner. Only its fenced
Settings writer can authorize or revoke cloud processing. Invalid armed settings
cannot fall back to an unfenced writer. Monetary expiry stops generation while
ordinary features remain available for a confirmed owner. Unknown provider
outcomes retain their full monetary reservations; shutdown does not turn those
unknown outcomes into refunds. Persona generation and proactive consumers remain
closed to OpenAI.

Pinned Node 24.19.0 strict compilation and all 1,792 Backend unit tests passed.
The Azure entry, ordinary-only runtime and latency tools passed 8 tests.
The actual Firestore Emulator concurrent-start test confirmed one winner and
rejected the stale claim. Its broader file passed 25/26; the historical Note
`readHistory` selection-conflict failure reproduced on clean baseline `7e5bb369`
(24/25), so this is recorded as an existing limitation, not a new pass.

The focused Flutter app/consent/controller suite passed 60 tests. The full AI
Conversation test directory passed 384/384; scoped analysis of 13 files was clean. It verifies
old Groq rejection, explicit OpenAI acceptance, actual cloud Today preparation,
reference routes without proactive features, provider-only withdrawal while
Prepare/Execute are pending, stale Settings rejection and no cached-reply flash
after reacceptance. A separate existing Home recommendation read-count test
failed identically on clean baseline `7e5bb369`; it is excluded from the focused
pass count, not relabelled as passed. The overlapping focused and full-suite
counts are not added together.
The implementation and both built artifacts use commit
`e7f55e659f76e8f0aa4ff62c570379d476b0264d`. See [validation.json](validation.json).

## Budget verification

Read-only Platform UI verification found the same displayed original US$68 gift,
US$67.91 remaining and a displayed 19 November expiry without a time or timezone.
The original conservative credit cutoff is retained. Project and organization
limits permit Sol and Luna. Standard global short-context prices were rechecked
against the [official price table](https://developers.openai.com/api/docs/pricing?latest-pricing-expanded=true)
and [Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
The original rates and US$3.40 cap are unchanged.

Before any new dispatch, the live ledger read confirmed 98 attempts, 96
settlements, US$0.0872567 spent and US$0.004096 reserved for unknown outcomes.
Available unreserved trial capacity was US$3.3086473. A same-cycle freshness
refresh is an explicit reviewed operator action; it does not reset these values.

After the same-cycle freshness refresh, three new synthetic generations cost
US$0.006604. The final ledger is 101 attempts, 99 reconciled, US$0.0938607 spent
and US$0.004096 reserved. Both original unknown holds are unchanged, leaving
US$3.3020433 unreserved within the original cap. The refresh expires at
2026-11-05T16:00:00Z; no automatic cycle or allowance renewal is enabled.
See [budget.json](budget.json). Model calls stopped after the two warm diagnostics.

## Cloud latency and acceptance

The existing Japan East service runs the new package with a 10-second activity
source deadline. From the operator host, 30 complete-response samples per ordinary
scenario gave the following results; these are not phone measurements.

| Scenario | p50 | p95 | Failures/timeouts |
| --- | ---: | ---: | ---: |
| Profile | 591 ms | 971 ms | 0/30 |
| Settings | 568 ms | 676 ms | 0/30 |
| Friends | 818 ms | 1,131 ms | 0/30 |
| Events | 10,954 ms | 11,993 ms | 0/30 |

All four observed warm p95 values meet their respective thresholds, but the
activity result is only 7 ms below its 12-second threshold. Ticketmaster was
available in all 30 responses; onePA was explicitly unavailable in all 30.
This verifies partial-source behavior, not recovery of both providers. The initial
cold onboarding request took about 9 seconds. See [all samples](ordinary-latency.json).

Three synthetic Sol conversations generated and persisted assistant replies.
The first Execute probe timed out at its incorrectly short 45-second client limit;
read-only canonical recovery subsequently returned `assistant_saved`. Its failed
probe result is preserved, and that request was never resent. Two new independent
warm requests with the client-compatible 75-second Execute limit returned HTTP 200,
with full Prepare-to-response times of **46.351 seconds** and **41.554 seconds**.
The 15-second AI target is not accepted. A 30-request AI benchmark was not run,
and no end-to-end AI p95 is claimed. See [diagnostic stages](cloud-latency-diagnostic.json).

The first request persisted its user message at +11.463 seconds, reserved cost
at +15.112 seconds, settled usage at +27.277 seconds and persisted the assistant
at +38.413 seconds, relative to the durable Execute intent written before HTTP
dispatch. These are application milestones, not isolated network-stage timings.
The reservation-to-settlement
interval includes Count, fresh checks and settlement as well as inference, so it
is not a pure model timing. Source review found repeated serial fresh Auth and
Firestore checks before and after generation. Backend region is Japan East;
Firestore is `asia-southeast1`. Aggregate Azure metrics did not establish a single
cause. These observations support investigating the application path; they do
not justify dropping consent, identity, source or history checks.

The quality-case waiver does not waive the separate latency target. Real-account
OpenAI activation remains off pending resolution of that performance gate. The
APK is a built integration candidate, not an enabled or accepted AI service.

## Cloud and phone boundary

The initial ordinary Azure check used two newly created synthetic identities.
Authentication, profile save/stale revision, Settings, private Check-in and
owner isolation passed. Live cloud checks also rejected a second identity,
an unmarked legacy client,
and optional-processing acceptance without the new OpenAI disclosure. Explicit
OpenAI acceptance allowed the synthetic generations. Withdrawal blocked a new
Prepare with `AI_CONTEXT_NOT_PERMITTED`; ordinary Profile and Settings stayed
available. See [withdrawal](cloud-withdraw.json) and [readback](cloud-readback.json).
The three synthetic conversations were deleted and their subsequent reads
returned 404; [cleanup evidence](cloud-diagnostic-cleanup.json) preserves those checks.
Only synthetic content was sent to OpenAI; no real-user consent or data was changed.

The [v56 APK metadata](apk-v56.json) records the same signer and permissions as
v54/v55, package `com.enmori.app.group`, and SHA-256
`3c13786c21f634c4ae94ffeb02b27dfb03d4fcfac01c2e0ff0f54b2b92dd5de7`.
This isolated recovery branch does not include the separate v55 admin-insights
branch. No phone was attached: the APK was not installed or uploaded. Retained-data
upgrade, Wi-Fi/mobile-network and personal-host-powered-off flows remain unverified.

No UAT or Release completion is claimed here. The existing Japan East host,
Firebase data, managed identity and HTTPS address are retained. There is no new
regional candidate or additional regional spend in this round. Old failure and
latency evidence remains under the November 4 reports.

## Rollback

The previous ordinary archive is privately retained at
`/home/miku/.local/state/enmori-cloud-resume-20261104/ordinary-backend.zip`.
Before removing cloud settings or restoring the ordinary archive, stop the Azure
cloud owner and verify container termination. Preserve all monetary attempts,
charges and unknown holds. Remove only the explicit OpenAI arm/config/key settings,
keep the verified package disarmed or restore the ordinary archive, verify normal
reads/writes, then restore the local unit's recorded prior enablement. Never run the legacy local worker concurrently
with an armed cloud owner. No personal data reset or reinstall-with-wipe is part
of rollback.

## Final restored state

At 2026-11-05T00:10:35Z, Azure was running the exact new package with
`aiConfigured:false`, Firebase reachable, and all three OpenAI settings absent.
The authenticated synthetic Profile returned 200. The retained private Check-in
then returned 200 with its original content, and a same-values Settings write and
readback preserved the withdrawn cloud consent. See [ordinary readiness](ordinary-restored-readiness.json)
and [retention checks](ordinary-restored-retention.json). Start submission to the
new listening event took approximately 273 seconds; warm latency does not describe
this startup interval. The original local service was restored enabled and active
and its readiness check passed after physical cloud stop and configuration removal.

The two owned synthetic Auth identities and their known ordinary test records
were removed after those checks ([cleanup receipt](smoke-cleanup.json)). Model
budget attempts, charges and unknown holds remain intact: a read-only final
transaction again verified the exact monetary counters and complete attempt digest
([restoration summary](restoration-summary.json)).
No real-account OpenAI activation took place. The ordinary service remains usable
while the separate AI latency decision and phone validation are outstanding.
