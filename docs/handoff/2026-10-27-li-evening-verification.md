# LI evening verification and next increments

This supplements, and does not replace, the [morning v36 record](2026-10-27-li-startup-recovery-v36.md).
The existing v36 phone package and Backend `44e44a2cc46f08c9f2eed47d3626cc156d469dda`
were retained. No runtime configuration, model, timeout, dependency, product code,
application data reset or service restart was performed in this evening run.
The host had independently rebooted before this session; its service started at
16:32 SGT. This is a changed environment, not evidence that the morning failure
was repaired by a code change.

## Phone and cold first send

USB was reconnected and v36/original login verified. At 17:24:56 SGT Ollama
reported no loaded model. One new, synthetic, references-off topic was sent;
no morning operation was retried. Empty preload returned HTTP 200 in 6.856 s
(runner load about 5.55 s), followed by chat HTTP 200 in 1.583 s. The service's
execute request returned HTTP 200 in 22.196 s. These are different nested
measurements, not durations to add together. The saved user and assistant rows
were visible on the phone, the draft cleared, and editing/reference controls
became usable. Explicit read-state/message checks and leaving/re-entering the
AI page retained both rows and cleared the temporary read-state warning.
This is phone-visible readback evidence; no independent Firestore audit is claimed.

Before this send the host had about 9.1 GiB available RAM and 514 MiB GPU memory
in use. Morning preload was about 60 s, including about 58 s model loading.
The new observation supports a bounded cold-send pass under the present load.
Resource contention is a hypothesis, not a proven cause. The morning failed
case and its unknown-operation history remain intact; cold reliability across
load conditions is not closed. The approved 30-minute residency and client
15/75/90-second limits remain unchanged.

Home initially showed a recommendation failure with a service 503. On returning
later its normal controls appeared, and Events loaded actual Ticketmaster rows.
This is recovery evidence, not a claim that all recommendation failures are fixed.
Automatic-today references were restored after the test and the phone was left
on Home. No purchase, participation update, notification, photo change or
existing Check-in edit occurred.

## ZHOU's bounded real-model packet

LI's current instruction to finish assigned work was applied to the existing
[team assignment](../planning/2026-10-25-v29-next-round-team-prompt.md), using
[ZHOU's exact-head handoff](https://github.com/3427564237/enmori-app/blob/97be7bed3a991814ca9856339cde422d25c16983/docs/evidence/core-feedback-20261025/zhou-small-plan-diagnosis.md).
Slot `LI-20261027-evening-one-pass` ran 17:26:16–17:27:48 SGT. Before dispatch,
the latest phone execution had terminated successfully, no Ollama TCP request
was active, the phone was on Home, and no worker was configured. The old
application outcome records were not cleared. The existing validation lock
was held during this one serial run. No competing model consumer was started.

Candidate: `cf50715556e6124513305323c2cc4d4d89a508f5`, clean working source.
The existing pinned Node 24.19.0/dependencies were reused after matching the
lockfile. Strict Backend compilation and 17 existing serializer/corpus/private
output tests passed. The runner recorded source and compiled hashes.

Exactly 24 fixed current-prompt cases received terminal responses; all 24 were
protocol eligible within 45 seconds. Observed durations were 0.908–11.587 s.
No case was retried, no additional context track or cloud provider was run, and
the evaluator made no product conversation writes. The already resident model
was used without an extra preload. Raw requests/responses remain owner-only at
`/home/miku/.local/state/enmori-recovery-20261027/zhou-local-cf50715/`.

**Semantic acceptance remains 24 unreviewed by an independent reviewer.**
LI's non-independent triage found concrete remaining failures: the English
rest goal still became a V25 device test; the Chinese rest goal introduced
studying its label; the fresh 12-minute rest answer omitted step timings; and
the code-text case named a function without giving its implementation.
Conversely the genuine-study response now had complete JSON and 5+8+7 minute
steps, and the genuine-test response avoided the previous data-reset advice.
These observations are not a new pass/fail score or a replacement for the
historical independent 12 Pass / 12 Fail result. No prompt tuning or model
change is justified as a proven fix by this single run.

## Remaining delivery gates and useful increments

- JIN #190 now has fixes at `127943d292c3e9e42346989ef6041c5a7e305c39`
  (product/test commit `b5ff56b6289bfaace8ac6f8e868660790a03f320`). The latest
  observed review state still requires ZHOU's review of this corrected head.
  It was not deployed. After review, LI owns integration and real provider/
  recommendation verification; source fixtures do not supply that evidence.
- LI #189/#191 still need independent review. The current package is not
  declared full UAT, Release or Done. DU's complete latest delivery evidence
  remains to be located/received; absence of a packet does not prove no work.
- Highest-value existing scope: JIN/SHI's actual Event introduction and genuine
  information URL, with separate information/ticket actions. The current source
  gap cannot be solved by drawing a button that still opens a ticket URL.
- Next experience increment to propose: distinguish AI sending, awaiting reply,
  saved-but-readback-failed and unknown outcome in concise recovery copy. Keep
  drafts and the existing no-resend rules. This evening exposed why those states
  need to be understandable; new copy is a proposal, not adopted requirements.
- DU's existing small-screen/large-text/bilingual, avatar save/readback and
  Home/Friends recovery package can proceed independently of new backend scope.
- Keep the small-plan helper's quality limitation visible in review decisions;
  choose whether to retain it as a draft aid or simplify its entry after reading
  the actual 24-case evidence. Do not add calendar/task automation to compensate.

The [machine-readable supplement](../evidence/2026-10-27-li-evening-verification.json)
binds the private evaluation artifacts. No teammate was messaged and no PR was
merged or Issue closed in this session.
