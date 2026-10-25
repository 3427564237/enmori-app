# App / UI — chat usability audit and bounded repair

Date: 25 October 2026, Asia/Singapore.

The first delivery below records the pre-choice audit at `f514a325`. LI later
selected C; the separate C increment and its exact baseline are recorded at the
end of this file. Earlier pending-choice statements are retained as history.

## Authority, baseline and ownership

The original LI request attachment was read directly, together with
[the recorded round authority](../../decisions/2026-10-25-li-ai-companion-round.md),
`AGENTS.md`, Skill routing, `ARCHITECTURE.md`, the round handoff and the retained
19/24 October AI decisions. This is reversible presentation work within existing
behavior. A/B/C, additional data use, cloud adoption and notification defaults
remain choices for Integration's decision packet.

- Workspace: `/home/miku/.codex/worktrees/fe1e/ENMORI`.
- Branch: `souma/ai-companion-app-20261025`.
- Clean starting HEAD: `b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.
- The initially empty attachment list was repaired by attaching this same managed
  worktree. A second checkout was not created.
- Actual development configuration was independently read from this chat's
  `turn_context`: `gpt-6.1-sol`, `effort=max`, turn
  `01a171a5-8d38-7dc3-b442-137759c0b79b`. This is not an application-model choice.
- Writes are confined to AI presentation, its local test and this evidence file.
  Shared routing, theme, locale aggregation, data/persistence and API files remain
  under Integration's ownership.

The repository copies of `ui-ux-pro-max`, `dart-flutter-patterns`,
`systematic-debugging` and `flutter-add-widget-test` were used. The focused UX
search returned contrast/readability guidance; the Flutter search returned
system text scaling guidance. These guide local presentation, not requirements.

## Demonstrated defects and changes

### Retained outgoing text claimed that sending was still active

The controller deliberately retains `localOutgoingText` after an uncertain
operation. Its existing controller regression explicitly requires retention until
authoritative readback. `_LocalOutgoing` instead always displayed `Sending…` /
`正在发送…`, including after `cancel()` had synchronously closed dispatch.
The existing page fixture dropped the outgoing text when switching to unknown,
which concealed this real controller/page combination.

The new test retains the same outgoing identity and original text while moving
from waiting to unknown. Before the repair, all four English/Chinese and
ordinary/social combinations failed: the bubble still contained the sending
label. The label now follows the existing `canCancel` dispatch state. An active
operation keeps the existing sending label; retained text after dispatch closes
shows `Not confirmed as saved` / `尚未确认保存`. It makes no persistence claim and
does not enable Send, Retry or history switching. Existing result readback stays
authoritative. No controller, transport or retry behavior was changed.

### System Back skipped the open conversation drawer

The social page's `PopScope(canPop: false)` called ordinary departure whenever
`didPop` was false, including while its drawer was open. The reproduction opened
the menu with an exact text/selection draft, then used `handlePopRoute`. Before
the repair, the departure callback ran once and the drawer remained open in the
fixture. The expectation was zero departures and a closed drawer.

A page-owned Scaffold key now lets this callback close the current drawer first.
With the drawer closed, the next Back follows the existing departure flow. The
same editor/draft survives both operations. This does not cancel, detach or
resend the session-owned operation. Investigation checked both the pinned
Flutter 3.47.2 route source and current official
[PopScope](https://api.flutter.dev/flutter/widgets/PopScope-class.html) /
[closeDrawer](https://api.flutter.dev/flutter/material/ScaffoldState/closeDrawer.html)
documentation.

### Consistent body reading

Persisted ordinary/social message bodies, the local outgoing body and selected
search context now use the existing theme's `bodyLarge` with 1.5 line height.
Previously social messages only overrode height, and the other surfaces inherited
smaller default body text. This keeps raw wording, line breaks and list text;
it adds no Markdown/HTML parser, link action, font asset or package. Font fallback
and system scaling remain platform-owned. Headers, small timestamps and brand
tokens are unchanged.

## Current-flow audit

| Area | Source / focused evidence | Remaining evidence layer |
| --- | --- | --- |
| English/Chinese and long lists | Existing locale lookup affects interface copy only; messages and drafts retain their raw text. New 375×812 normal, 320×740 2× Chinese and 740×375 2× English fixtures exercise a long bilingual reply without line truncation, primary scrolling and explicit Latest return. | Native glyph/fallback rendering and real reading comfort need LI/SHI phone review. |
| Keyboard, safe area and input | Existing SafeArea and constrained, locally scrolling pinned composer are retained. New fixtures preserve the same controller and exact composing range/selection through keyboard inset changes. | Physical IME, keyboard Back and device cutouts remain native checks. |
| Menu and Back | The reproduced drawer defect is fixed; next Back uses the existing callback. | Android predictive-Back/device handling is not established by widget `handlePopRoute`. |
| Waiting/cancel/unknown/failure | Dispatch fences, message-local waiting and recovery controls remain existing controller behavior. Retained unknown text now stops claiming active sending. | No real network cancellation, model latency or persistence claim. |
| Drafts/history/search/delete | Existing session-owned drafts, explicit search, cursor reads, tombstones and confirmed deletion flow remain in place. No new navigation choice was made. | Existing native earlier-page and visible-participant coverage gaps from v26 remain gaps. |
| Touch and contrast | Production button theme uses 48dp minimums. Calculated existing light-theme body contrast: `#203b32` on white = 12.12:1, on `#e4eee4` = 10.18:1; `#58665f` on white = 6.03:1. | These are token/source calculations, not TalkBack, native target or whole-screen certification. |
| Reduced motion | Existing `EnmoriMotion` and static typing dots under disabled animations remain. New usability fixtures disable animations. | Native animation timing/frame-rate and full accessibility review remain separate. |

## Minimal interfaces for Integration's decision packet

These are dependency proposals only, not new DTOs, permissions or production
contracts. No proposed source card, cloud selector or notification control is
connected by this commit.

| Consumer / Integration-owned seam | Minimum information and behavior to agree |
| --- | --- |
| Home / owned Check-in / Event → AI entry in shared router | A trusted source kind and stable ID from the authorized source screen; explicit attach/review/Send. Arrival rechecks current account and source permission/version. Route entry alone must not send or widen data use. |
| “Referenced this time” selector and source detail navigation | A Backend-approved outward source projection/catalog independent of model text: source kind, trusted navigation target, effective version, historical occurrence time, observation time and availability. Temporary exclusions/attachments are request-scoped and cannot grant read access. Q19 Backend-only provenance IDs must not be exported directly. |
| Local/cloud processing disclosure | Explicit processing choice and the exact permitted data scope supplied by the approved contract, with server-side enforcement and no automatic cloud fallback. Persona is not consent. Existing `locationLabel` is not eligible AI context; future location use requires its own concrete authorization. |
| Proactive item / notification click | Genuine proactive message identity, recipient/session binding, canonical conversation/message target, trigger reason and source availability. Revalidate on arrival; do not invent a user prompt or trust model-provided IDs/URLs. Read state, delayed/expired/revoked behavior and production delivery must be contracted by Integration/Proactive. |
| Notification settings | Approved category/default/frequency/quiet-time/time-zone/lock-screen rules, capability states and an authoritative save/readback boundary. A UI switch cannot imply OS push permission or background delivery support. |

Context's initial warning about Q19 and location restrictions has been received
and incorporated. Product's C recommendation is still a recommendation. Existing
conversation list/history, within-conversation search, new topic and complete
conversation deletion remain available with their existing semantics.

## Verification record

Integration granted App the first bounded Flutter slot. Every Flutter/Dart
invocation uses nonblocking `flock -n` on
`/home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock`.

- Offline preparation: `fvm flutter pub get --offline --enforce-lockfile` exited
  0; no manifest/lockfile change.
- Initial new-file attempt did not compile because the test incorrectly marked
  the non-const state constructor const. This fixture error was corrected before
  interpreting product results.
- Initial valid new-file run: 0 passed, 5 failed, reproducing the four retained
  outgoing-label cases and Drawer Back. A focused Drawer run additionally
  recorded `Expected: 0; Actual: 1` departure.
- Isolated label repair run: 4/4 passed. After Drawer repair: 5/5 passed.
- Final new-file run with long-reply/IME cases:
  `fvm flutter test --no-pub test/features/ai_conversation/ai_chat_usability_test.dart`
  exited 0, **8/8 passed**, no hit-test/overflow warning.
- `fvm flutter analyze --no-pub lib/features/ai_conversation/presentation/
  test/features/ai_conversation/ai_chat_usability_test.dart` exited 0:
  `No issues found! (ran in 7.8s)`.
- Integration authorized the related existing regression batch:
  `fvm flutter test --no-pub
  test/features/ai_conversation/ai_conversation_page_test.dart
  test/features/ai_conversation/ai_message_search_test.dart
  test/features/ai_conversation/ai_localization_test.dart` exited 0,
  **82/82 passed**, without hit-test/overflow warnings. This includes explicit
  pagination/error handling, deleted/unavailable content, session/consent
  invalidation, draft/history switching, delete confirmation, reduced-motion
  typing, labeled Cancel at large text and language changes. The unedited output
  is retained locally at
  `/home/miku/.local/state/enmori-ai-companion-20261025/app-existing-ui-regression.log`.
- There are **90 distinct passing focused UI scenarios** across the two final
  batches, not 90 new tests and not the whole project suite. `git diff --check`
  is clean. No shared runtime was modified. The Flutter slot is ready to release
  to Integration/QA after this exact source delivery.

All fixtures are synthetic and use the existing controller/provider boundary.
No real model, Firebase/service data, cloud request, notification, APK, device
write or deployment was exercised. Historical small-plan semantic failures,
v26's scoped phone evidence and remaining UAT/Release gates are unchanged.

## Second increment — approved C main entry

### Confirmed source and exact baseline

LI's direct answer to the A/B/C question was read in the Integration chat,
user message `01a171b5-67bd-7ff0-9cfc-023225279b93`:
`C：连续主入口＋历史／新话题（推荐）`.
The durable authority is
[25 October C selection](../../decisions/2026-10-25-li-ai-entry-c.md),
commit `2bb638b47e682217007cf02cd505550d88d627cf`. The clean App branch was
fast-forwarded only after checking that the reviewed `f514a325` delivery was its
ancestor. This commit is the exact baseline of the second increment.

Product confirmed that the bounded layout/interaction changes conform to C.
The authorization concerns the entry form and existing conversation boundaries;
it does not approve source projections, additional context, cloud processing,
proactive delivery or new persistence. This increment changes no controller,
Repository, route, theme, API, storage, dependency or retention contract.

### Source gaps and resulting behavior

| Earlier source behavior | C increment |
| --- | --- |
| The main page already opens the session's current conversation directly, but History is mainly inside the generic menu. | A named 48dp History icon action is directly visible in the main app bar. The existing menu remains available for Persona, settings and permissions. Opening History reads only through existing controller capabilities and never selects a history row or sends automatically. |
| Current-message lookup is inside the overflow menu. | History also has a top-level “Find in conversation” action. It opens the same existing page, limited to loaded, available messages. The overflow search and whole-conversation deletion remain available. |
| The entry calls the new boundary “New conversation”. | Visible controls and typed status copy say “New topic”. The existing controller command remains the same: one unsent draft stays for explicit editing, old saved conversations stay in History, and the next explicit Send uses the existing new-conversation path. No separate topic entity or title is introduced. |
| Choosing the already selected History row still enters the discard/selection flow. | Same authorized current ID is a no-op after the drawer closes: retain the exact draft/selection, do not reread, switch, clear operation state or send. Selecting a different conversation still requires explicit draft discard. |
| An empty-looking transcript can display the welcome illustration during reads or uncertain recovery. | The welcome state requires idle/success, `canSend`, no read, no messages and no local outgoing. It distinguishes a new topic from an authorized current empty conversation. A saved-conversation read has a static live status; uncertainty remains in its existing recovery state. No unbounded loading animation was added. |

The existing session controller already retains the current conversation,
messages and a single `TextEditingValue` draft in RAM across route removal.
The new tests exercise that actual page/controller draft boundary. Account or
consent replacement still clears private editing state; a captured old History
callback rechecks the current page/session and capability before opening.

The existing automatic authorized message refresh is unchanged, including on
uncertain reentry when it is otherwise admitted. It refreshes saved content and
tombstones; it does not release the unresolved operation fence, call result
readback or resend. The UI retains recovery controls. No initial-read contract
is replaced by this presentation increment.

### Explicit local gap

There is no newly approved disk/cross-device current-conversation pointer,
reading anchor or draft store. This increment does not guess the newest History
row after a cold start. A user can open History and explicitly resume an
authorized conversation. Existing mounted-route reading state remains; a fresh
page keeps the existing Latest behavior. Broader restart/read-position recovery
remains P6, rather than an implied delivery claim for C.

### Focused verification

Integration granted the App C slice the sole bounded Flutter slot. Every
invocation takes the same nonblocking global lock; no APK/Gradle work is run.

- Initial reproduction against the unchanged selection handler:
  `ai_continuous_entry_test.dart --plain-name 'opening the current conversation'`
  failed because `ai-confirm-discard` was present. Raw output:
  `~/.local/state/enmori-ai-companion-20261025/app-c-initial.log`.
- The isolated same-ID guard then passed that one case, including unchanged
  editor value and no extra read or selection. Raw output:
  `app-c-current-topic-fix.log` in the same local directory.
- First complete new-file run: 10/12 passed. The loading fixture timed out on an
  unnecessary indeterminate progress animation; the final UI uses the static
  live text. The landscape Drawer target was not yet built; its test now uses a
  bounded real Drawer scroll and requires a hit-testable target before tapping.
  The failure output is retained in `app-c-new-tests.log`.
- That candidate's new-file rerun passed 12/12 without overflow/hit-test
  warnings: `app-c-new-tests-final.log`. It still contained an initial-read
  experiment that was subsequently removed as described next; it is not the
  final source's acceptance record.
- The first related batch passed 89/90. The sole failure expected the original
  automatic ordinary message read on unknown entry, which that experiment had
  suppressed. A trial changed expectation passed 90/90. Source review with QA
  established that the original read safely refreshes authorized content and
  never releases the operation fence. The suppression and modified old test
  were both removed; the existing page test is unchanged from the C baseline.
  Both `app-c-related-ui-regression.log` and
  `app-c-related-ui-regression-final.log` remain as experiment history, separate
  from the final validation below.
- Coverage includes empty entry without automatic history selection, exact
  same-session draft return, current-row continuation, explicit other-row
  discard, unknown/no-resend protection with admitted ordinary reads, loading versus empty, revoked/stale
  History actions, New topic without dispatch, retained search/delete and
  320dp English/Chinese plus 740×375 landscape at 2× text.
- Final source command:
  `fvm flutter test --no-pub
  test/features/ai_conversation/ai_continuous_entry_test.dart
  test/features/ai_conversation/ai_conversation_page_test.dart
  test/features/ai_conversation/ai_message_search_test.dart
  test/features/ai_conversation/ai_localization_test.dart
  test/features/ai_conversation/ai_chat_usability_test.dart` exited 0,
  **102/102 distinct scenarios passed** in that single final batch, with no
  hit-test/overflow warning. It includes 12 new C scenarios and 90 related
  existing scenarios; experiment reruns are not added to that count. Raw final
  output: `app-c-authorized-refresh-final.log`.
- Final `fvm flutter analyze --no-pub
  lib/features/ai_conversation/presentation/
  test/features/ai_conversation/ai_continuous_entry_test.dart` exited 0:
  `No issues found! (ran in 6.7s)`. Output: `app-c-analyze.log`.
- All log basenames above are under
  `/home/miku/.local/state/enmori-ai-companion-20261025/`. The manifest and
  lockfile remain unchanged. `git diff --check` is clean. No full-project test
  expansion, APK or Gradle build was run. All Flutter processes are complete;
  the slot is released with the exact commit for QA's independent review.

This is source/widget evidence. No real backend/model call, automatic cloud
fallback, notification, APK, device write or data migration was performed.
QA's dirty-source pre-review is not the final exact-commit independent review.
