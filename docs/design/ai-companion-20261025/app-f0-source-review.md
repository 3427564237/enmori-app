# App F0 independent Product source review

25 October 2026 · Product / UX · source review only.

Reviewed checkpoint: `d893d2d9b631779f40c540acac50251a86013220`, parent
`1a1f96b11606d6ecd7bb1124b823a9dfbad6e7d5`. The review used an immutable Git
archive, not App's subsequent working changes. The bounded follow-up comparison
is `d893d2d..be0a7b16fcf1b7324512a78c0dea24a4af1fe687`, followed by the
four-file fix at `16e1923bc3041d6384e59d702da5cd8623f4b6f3`. These focused
comparisons are not a fresh review of every intervening Integration change.

Authority: [LI's first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
[F0 handoff](first-flow-handoff.md), and [interaction specification](interaction-spec.md).
The repository Flutter/Dart review checklist guided inspection; it does not add
requirements or acceptance authority.

## Findings and disposition

### P2-1 — failed initial prerequisite reads have no recovery within the form

At `d893d2d`, an unsuccessful initial settings or active-intents GET leaves the
corresponding value unknown. `ProactiveState.canSchedule` correctly requires both
to be known, but the follow-up form exposes Check settings only when
`settingsUnconfirmed` or `settingsStale` is set. An ordinary initial GET failure
sets neither flag. There is no active-intents read action on that form. Verify
time only invokes the TimePort. The user cannot complete scheduling without
leaving and reopening; form choices made before `_submit` have not yet been
saved through `keepSourceReview`.

Source anchors at the reviewed checkpoint:

- `lib/features/proactive/presentation/proactive_state.dart:40–53` — prerequisite gates.
- `lib/features/proactive/proactive_providers.dart:141–143,183–224` — initial reads and failure state.
- `lib/features/proactive/presentation/proactive_follow_up_page.dart:551–568,598–608` — missing recovery and disabled submit.
- The existing failed-read widget case covers the settings page, not this form.

**Closed by independent source inspection of `be0a7b16fcf1b7324512a78c0dea24a4af1fe687`.**
The precise diff adds the settings-null condition and an intents-null action,
calling only the existing `readSettings` and `readActive` methods. Neither action
replaces the form controllers, candidates or confirmation, and neither initiates
a settings PUT or intent POST. Two new form cases assert preserved date/time and
confirmation, no mutations, and submit becoming available after a successful GET.

App reports clean analysis and 51/51 proactive tests on that fix. Product read
the cases and source; Product did not independently execute Flutter. QA's separate
run must retain its own exact integration checkpoint and result.

### P2-2 — an expired DST candidate rejects the still-future candidate

At `d893d2d`, `_resolve` rejects the whole candidate set when **any** instant is
not after now (`proactive_follow_up_page.dart:203–210`). For a trusted repeated
local-time result containing 00:30Z and 01:30Z, with now at 00:45Z, the later
instant is a valid future choice but the form reports that a future time is
needed and offers neither candidate. The platform resolver intentionally returns
every valid offset for that civil time
(`android/app/src/main/java/com/enmori/app/FollowUpCivilTimeResolver.java:26–38`).

The approved constraint concerns the selected future instant. The handoff also
requires an explicit choice when the local time repeats. Keep that ambiguity
visible, disable the past candidate, and require the user to select the remaining
future candidate and confirm. Do not silently turn a fold into an automatically
selected single result. If all candidates are past, keep the existing rejection.

**Closed by independent source inspection of `16e1923bc3041d6384e59d702da5cd8623f4b6f3`.**
The fix keeps both candidates with no default, disables and labels past rows,
and rejects the set only when all are past (while retaining zone/UTC validation).
It also rechecks the chosen future instant after the device-zone await and
clears confirmation if time has passed. Product read both added cases and the
test-clock injection: one requires explicit selection/confirmation of the later
instant and asserts that exact create time; the other verifies all-past rejection.

App reports clean analysis and 53/53 proactive tests on its merged shared baseline
`70ca23d0dda44dbe3fc2fa380ca06dcfb8b5f485` with this correction. Product did not
execute those tests. This closure concerns the reported source counterexample,
not Android time-channel, device or end-to-end acceptance.

## Other inspected paths

| Path | Source observation at d893d2d | Limit of this observation |
| --- | --- | --- |
| Saved user entry | `SavedFollowUpSource.fromMessage` rejects unavailable, empty and non-user messages; the action rechecks the current session, topic and exact current message before navigation. | Backend must independently authorize the saved source. A UI snapshot is not authority. |
| Civil time and zone | Explicit civil fields and IANA zone; strict TimePort result validation; gaps hold; two candidates require a choice; edits clear resolution and confirmation; device-zone changes require a user decision. | Original P2-2 closed by the focused fix above. No native platform execution by Product. |
| Quiet hours | Shows the allowed-time suggestion as an explicit action and resolves it again; it does not auto-schedule. | No native layout or timezone database acceptance implied. |
| Settings then create | `_submit` returns after settings ACK. A second explicit action creates the intent with its own UUID and current revision. | No real service call or persistence verified by this review. |
| Unknown outcomes | Pending create/cancel retains the original identity; check uses GET; unknown does not automatically POST again. Settings unknown/stale requires a read. | Runtime and cross-session durable recovery remain separate evidence. |
| Off, pause and cancel | Explicit off, indefinite pause, and known-intent cancellation use current revisions. Copy distinguishes accepted, unknown, expired and possible dispatch. | Push delivery, recall and device behavior are not established. |
| Draft and retired source | Ordinary follow-up navigation does not send/clear the chat draft. Session/content-authority retirement clears private form display and rejects late results. | Source inspection does not establish every native navigation or lifecycle interaction. |

Shared router/bootstrap composition is absent from the reviewed App checkpoint:
the repository provider defaults to null and feature callbacks are optional.
That is an explicitly assigned Integration seam, not an additional App finding.
This review did not consume Integration's moving working tree as part of d893d2d.

The later proactive source/read/reply flow, F1a and D1 UI are outside this App
checkpoint. No Flutter, Gradle, APK, model, real-account, notification or physical
device operation was run by Product. The author's earlier 155 passing tests are
not counted as Product's independent execution or as end-to-end acceptance.
