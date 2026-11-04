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
pass count, not relabelled as passed. Final artifact evidence is recorded
separately. No attached phone was present at the initial November 5 check.

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

## Cloud and phone boundary

The initial ordinary Azure check used two newly created synthetic identities.
Authentication, profile save/stale revision, Settings, private Check-in and
owner isolation passed. These checks do not prove cloud AI or mobile latency.

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
restore the ordinary package, verify normal reads/writes, then restore the local
unit's recorded prior enablement. Never run the legacy local worker concurrently
with an armed cloud owner. No personal data reset or reinstall-with-wipe is part
of rollback.
