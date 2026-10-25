# App — LI v28 core-experience repair

25 October 2026, Asia/Singapore. Authority:
[LI's recorded feedback](../../decisions/2026-10-25-li-core-experience-repair.md).

## Exact starting point and ownership

The old App branch `souma/ai-companion-app-20261025` remains at `785571f`.
The worktree was clean before creating `souma/core-feedback-app-20261025` from
exact `087281e11ec5a681fd012b9d64431b225ed6f8ea`. `AGENTS.md`, Skill routing,
architecture and the entire new PM decision were read. The latest local chat
turn-context metadata verifies `gpt-6.1-sol` / `max`, not an inferred model label.
App owns AI/proactive feature source/tests and this report. Home, shared routes,
translations, API, infrastructure, friends/account and device composition remain
Integration-owned. No new session was created.

## v28 Send investigation

LI reports installing v28 and being unable to click Send. This is a user report,
not independent proof of their exact action sequence or current phone state.
The actual button is gated by all of:

1. AI controller `canSend`: authentication/repository, no active attempt/read,
   current location/reply authorization, no unresolved original operation, no
   saved-user Retry requirement, and no terminal permission/deletion state.
2. Nonblank editor text, rebuilt by the TextField's `onChanged` callback.
3. `_selectionReady`: inactive references, or the selector's confirmed current
   preparation. A selected source, explicit empty choice or expired preview can
   leave the selector active without this short-lived preparation.

The first focused widget run on unmodified production `087281e` used real
`TextInput` editing values with Chinese composing text. Both ordinary,
zero-selection modes passed: text/current-editor lease updated and the ordinary
prepare was invoked once, with no selected prepare or Check-in read. The third
case selected a source and returned: `AI.canSend=true` and the exact draft stayed
present, but the button callback was null. Result: **2 Pass / 1 Fail**. Thus a
local gating defect is reproducible; these results do not identify it as the
only explanation for LI's device symptom, nor blame the model or deployment.

QA separately prepared select-to-empty and empty-preview/cancel counterexamples;
their original-head run is recorded by QA independently, not counted here.
Unknown original operations, exact saved-U retry, explicit source/history
exclusions, Persona and permission checks must remain protected.

Integration confirmed the bounded repair direction: one explicit Send may
perform fresh source verification/prepare and one execute without mandatory
manual review first. A genuine source/history conflict retains the draft and
requires a decision. A prior whole-pair exclusion keeps only its identity intent
across expiry; fresh keys may be mapped only to unchanged pair identities.
This is not permission to clear `active` and silently use legacy history.

## Next automatic-day and follow-up increments

The committed Integration contract `api/ai-today-context-contract.md` extends
prepare with `{processing:'local',today:{timeZone}}` and owner-only automatic
card IDs/`today` metadata. Its current exact source is identified in the final
handoff when implemented. Today's interval/time comes from the server and
trusted device IANA zone; latest five, a sixth-row sentinel, exclusions without
backfill, local-only minimal fields, explicit off and original-operation fences
remain bounded. This increment is separate from the first Send-gating repair.

The old drawer label “明确跟进” opens settings/intent management, while creation
starts from an available saved real-user message through the existing typed
`onFollowUpRequested(SavedFollowUpSource)` callback. A failed settings/intent GET
correctly leaves unknown state and disables writes, but that entry does not
explain where a request starts. Product/Integration are mapping a readable
“稍后联系我” entry, a saved-message choice in the same topic and separate
management. Service unavailability must be explicit and must not be fabricated
as off/empty/saved. No new intent, model call or push occurs from a label change.

The remote-group Friends route already uses `FriendModulePage`, whose third
Discover tab contains `FriendDiscoveryPanel(home:false)`. The simpler lookup
page contains no suggestions. These sources were reported to Integration;
App did not edit Friends or avatar infrastructure.

All Flutter/Dart/Gradle work requires an Integration window and the shared lock.
No full suite, real provider/model call, real service write, APK build or phone
operation has been performed in this increment. The historical 58 baseline
failures remain outside this bounded repair.

## First independent increment: enable the explicit Send action

The page now gates references on whether a submission may start, rather than a
previous screen's confirmed preparation. A selected submission locally validates
the input and exact Retry U before any source read, then performs fresh owned
verification/prepare and one execute from the explicit Send. It does not use an
ordinary-send fallback to discard selected/excluded context. Source preparation
locks the editor and duplicate submission until completion; input/draft/selection
remain intact on rejection or unknown outcome.

Past-exchange exclusion intent contains only the bounded user/assistant IDs and
sequences, separately from expiring request keys. An unchanged pair set maps to
new keys after expiry. A changed set stops execution and shows the actual
conflict for review. Success or a new session/topic clears the per-reply intent.
Existing confirmed `send` remains the underlying original-operation path;
the new `submit` action orchestrates preparation without bypassing its fences.

The two old page expectations for mandatory pre-review were updated only within
the scope superseded by LI's new direction. Returning from a selection now
enables Send. Sending after preview expiry uses fresh keys; visiting References
or confirming its optional preview still does not send a message. The old
branches, commits and original 389-case evidence remain historical records.

Validation used the assigned short window and global nonblocking lock:

- New seven cases plus the nine affected page cases: **16/16**.
- Six existing selector expiry/history/unknown/user-saved/pending-access cases:
  **6/6**. These are separate cases, not a rerun of the full suite.
- Five changed Dart files: analyzer clean (`3.3s`) after correcting one missing
  flow-control brace. `git diff --check` is clean.

The new cases include real Chinese composing `TextInput` with no selected
Check-ins, selected-return explicit Send, local invalid input before requests,
fresh-key history exclusion across expiry, a changed pair stopping execution,
and unknown/user-saved recovery with the original U and no ordinary bypass.

Original red log: `app-send-gate-red.log`, SHA-256
`0968e42030be3ecafff1dc880088528b48871e4c3a8912c1b64ecde305fcf944`.
Green log: `app-send-gate-focused.log`, SHA-256
`941b6f1292a293e47a6a703275ce1c46da8a3fab49ad462a95ca01242e18fb73`.
Both are under `/home/miku/.local/state/enmori-core-feedback-20261025/`.
This is source/widget evidence for the identified gating path; no device action,
real service/model request, build or deployment is claimed.


## Automatic today and readable later-contact increment

Authority is the committed LI repair decision above and Integration's exact
`72fc616ca81d6d7703fc139600ce959d7a84dc9e`
`api/ai-today-context-contract.md`; Product's bounded packet is
`e344ab1f3a4993216c195cd0cc82acbb2366686d`. No other data scope is added.

Root composition explicitly enables `aiTodayReferencesEnabledProvider` (default
false) and overrides `aiTodayTimeZoneProvider`, a
`Provider<Future<Result<String>> Function()>`, with the existing device IANA
port's `currentIanaZone` tear-off. When enabled, a missing capability or zone is
visible failure, never a silent manual/ordinary/UTC fallback. Manual-only legacy
fakes retain their original semantics unless this explicit switch is enabled.

Automatic Send obtains the trusted device zone, then uses the server's current
day, five-source receipt and fresh opaque selection keys before one execute.
It performs no redundant client-owned-record read for normal Send. Optional
preview reads at most the server-returned five owned IDs for Note/Mood/Activity
and original time. Preview does not send. The last-checked day/zone, latest-five
sentinel, explicit off, per-topic source exclusions, and unknown-vs-zero states
are visible. Exclusions are applied to the server's top five without backfill;
off sends explicit `sources:[]`. Both persist after success in the topic and
clear on a new topic/session. Explicit single-record legacy references still
apply to that reply; the next reply returns to the topic preference.

Every automatic explicit Send freshly prepares even after preview confirmation.
A changed dependency/history set retains the draft and requires review. Old
history keys are never reused; only unchanged whole-pair identities can map to
fresh keys. Once execute dispatches, a generic selection conflict still goes
through the original operation GET: it is not proof of no saved user message.
No original-operation recovery code was replaced with a replay shortcut.

The drawer now offers “Ask me later / 稍后联系我”, selecting one available saved
real-user message from the current topic before the existing typed scheduling
flow. Assistant/unavailable/local-pending messages cannot become sources; live
session, topic, content-display and current-route checks protect callbacks.
Management is a separate entry. Labels and unavailable-service copy were
simplified without adding an intent, provider/model call, push or new API.

Added five automatic-mode widget/provider cases, two strict automatic wire
cases, and two later-contact page cases. Existing manual cases remain in place.
These new cases have NOT been executed here: Root requested all remaining
Flutter/Dart/Gradle validation centrally. Formatting/analyzer and relevant
AI/proactive tests are pending that central window. Only `git diff --check`
was run locally and passed. Prior Send-fix test results above apply only to
that earlier increment; no new APK, runtime, phone, UAT or Release claim follows.


### Assigned narrow diagnostic window and automatic-day correction

After Integration's centralized analyzer found the local `review` shadowing the
method invocation in `previewToday`, App renamed that local `preparedReview`
(`7fef973`). Integration applied the equivalent fix and reported analyzer clean.
The centralized 19-file batch then reported 243 pass / 6 fail; three failures
were these new automatic-day tests, while Integration owns the other three.
That total is not an App-wide or full-suite pass.

Integration explicitly granted App the sole Flutter slot for only the today
failure file or a minimal diagnostic. Under the shared nonblocking lock, the
five-case file reproduced 2 pass / 3 fail with `zoneReads=1, tokenReads=0`.
A temporary synthetic-only probe confirmed the exact Dart error: a narrowed
`Future<Success<String>>` rejects an `onTimeout` callback returning
`Failure<String>`. The broad exception boundary had converted that type error
into a visible unknown state before preparation; no model/service was involved.
The probe was removed after use, not retained as an implementation-mirroring
test. Existing automatic tests retain all behavioral assertions and now include
boundary diagnostics on failure.

The minimal production correction removes the timeout callback and lets the
existing catch convert the normal timeout exception into unknown. The same
five-case file then passed **5/5** unchanged in behavior assertions. This window
ran no other suite, analyzer, build, provider or phone operation, and the slot
was returned immediately. Remaining central checks stay with Integration.

Logs under `/home/miku/.local/state/enmori-core-feedback-20261025/`:
- `app-today-diagnostic.log` SHA-256 `f99eab34a361f86cea6b35df7444e30ef40f0788be3528a21ffef4ae5f3aab48`.
- `app-today-green.log` SHA-256 `a00f0372b4f7a0acf509ffb10d1774802c1af87b77134cf2f99ecad25c2c6d85`.
