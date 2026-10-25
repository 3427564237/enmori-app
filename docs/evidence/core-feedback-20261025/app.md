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
