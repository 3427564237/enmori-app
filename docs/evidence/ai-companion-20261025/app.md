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

## Third increment — F0 settings and explicit scheduling checkpoint

### Authority and shared baseline

This is the first runnable App slice of the
[approved F0/F1a/D1 decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
not the completion of all three flows. It follows the bounded
[Product F0 handoff](../../design/ai-companion-20261025/first-flow-handoff.md).
The App branch fast-forwarded through the approved contracts and shared
dependencies to `1a1f96b11606d6ecd7bb1124b823a9dfbad6e7d5`. Integration owns
shared routes, composition, core errors, dependencies and Android code.
The public HTTP projection was checked against Delivery's independent transport
candidate `f1fce8adb0753860d03d644e3d95d0169d1bf3e9`, including its correction
from internal state to the minimal public intent view. Native civil-time
resolution uses Integration's existing `com.enmori.app/time_zone` channel and
the `1a1f96b` contract; no offset or local-zone fallback is used.

### Implemented App boundary

- Optional chat callbacks `onFollowUpRequested(SavedFollowUpSource)` and
  `onOpenFollowUps` keep the existing composition unchanged until explicitly
  injected. Only a current available saved user message exposes the source
  action. A captured action rechecks the session, topic and current source;
  local outgoing, assistant and unavailable rows cannot initiate scheduling.
  Entering either flow keeps the exact single chat draft and does not Send.
- `ProactiveFollowUpPage({required source, required onBack})` reviews the raw
  saved source and occurrence time. It resolves explicit civil fields and IANA
  zone through `FollowUpTimePort`. A DST gap is distinct from an unavailable
  resolver; a fold requires an explicit offset/instant choice. Date/time/zone
  changes remove confirmation. Device-zone changes hold submission for an
  explicit keep/change choice. A quiet-time suggestion changes fields only
  after the user's choice, resolves again, and still needs confirmation.
- An initial settings read can prove revision-zero/off with no selected zone;
  it never invents UTC or treats a failed read as default off. The first
  confirmation performs only the settings PUT. Its ACK and new revision enable
  a separate explicit create action. Scheduling never initializes push or runs
  the model. Limits remain category `explicit_follow_up`, local processing,
  one per rolling 24 hours, 480-minute cooldown and at most three active intents.
- `ProactiveSettingsPage({required onBack})` displays known settings and the
  complete bounded active list, with explicit on/off/indefinite pause/cancel.
  Unknown reads remain unknown. Cancellation uses the current intent revision;
  an uncertain cancellation retains the visible row and original intent ID.
  Provider acceptance copy does not claim device delivery or reading.
- The feature-owned HTTP adapter makes one bounded attempt, uses caller-owned
  HTTP resources and per-request abort, rejects redirects/malformed successful
  receipts, and maps the exact N01 top-level `requestId` error envelope. Create
  sends only IDs, dueAt, zone, processing and revision with one UUIDv4 key;
  source text and owner identity never enter that request. Public responses do
  not accept internal dispatch/source/grant fields. An unknown create retains
  the original command/key and offers only its GET readback, never another POST.
- Form recovery is session RAM only: source IDs plus the reviewed time, without
  copied source text or a disk store. Session replacement, content invalidation,
  backgrounding and consent loss retire the source view, clear captures, abort
  in-flight work and ignore late results. An admitted uncertain key stays fenced
  until the same-session authoritative read; a new session drops private state.

### Verification and limits

All invocations used the coordinated nonblocking Flutter lock. Offline pub get
with `--enforce-lockfile` completed without changing the manifest or lockfile.
The initial analyzer-only runs found informational style issues; those were
fixed before tests. The first new-suite run passed 44/45; the sole failure was
the synthetic Chinese test container lacking Material localization delegates.
The next related run passed 114/115; its sole failure attempted to edit a
not-yet-built generic-page field. The test now uses bounded actual scrolling
and hit-test checks. Neither failure was turned into a weaker assertion.

The final command analyzed only the owned feature/page and test boundaries,
then ran `test/features/proactive` plus the five existing AI UI test files
listed in the C increment. It exited 0: **155/155 distinct scenarios passed**
(49 new F0 scenarios, four new chat-entry scenarios and 102 existing UI cases).
Analyzer: `No issues found! (ran in 11.6s)`. No overflow, hit-test warning or
exception remained. Raw final output:
`/home/miku/.local/state/enmori-ai-companion-20261025/app-f0-focused-final.log`.
Earlier logs are retained alongside it as `app-f0-suite-initial.log` and
`app-f0-suite-second.log`. `git diff --check` is clean.

This checkpoint supplies feature ports, HTTP/time adapters, controller, pages
and synthetic tests for Integration's first composition. Genuine proactive
origin/source cards, authorized resolver/anchor navigation, same-topic reply,
visible read watermark, F1a selection and the explicit D1 SDK adapter remain
the next App slice. The current callback/constructor surface is ready for
Integration; this commit alone does not install a shared route or bootstrap.
No real service/model, Firebase data, push registration/send, APK/Gradle,
phone write or deployment was exercised. Source/widget evidence is not runtime,
physical-device, UAT, Release or Done acceptance. The exact source commit is
handed off separately for independent QA; these local results do not replace it.

### Independent Product finding — first-read recovery

Product reviewed the frozen `d893d2d9b631779f40c540acac50251a86013220`
and found a P2: the follow-up form offered readback for an uncertain settings
write, but not for a failed initial settings/active-intents GET. This left
scheduling disabled until route exit, which could lose unsubmitted choices.
The finding was confirmed against source; the earlier failed-read widget case
covered only the separate settings page.

The form now exposes **Check contact settings** whenever settings are unknown,
and **Check active follow-ups** whenever the complete active set is unknown.
Both perform only their existing GET, retain all current date/time/zone,
candidate and confirmation values, and never enable by guessing or create an
intent automatically. Two new widget cases fail each initial prerequisite
independently, explicitly recover it on the same form, check preserved choices
and verify zero settings/create writes.

Integration released the coordinated Flutter slot for this correction. The
next origin/source-port work was isolated in a local WIP checkpoint first, so
this validation has exactly the F0 fix on `d893d2d`. Targeted analyzer passed
with no issues and the complete proactive suite passed **51/51**. Raw output:
`/home/miku/.local/state/enmori-ai-companion-20261025/app-f0-prerequisite-recovery.log`.
No shared route, ordinary AI behavior, dependency, native or real-service
operation changed. The existing 155-case record remains the checkpoint's
record; it is not added to this rerun's count.

### Independent Product finding — one future fold candidate

Product's second frozen-source P2 identified an overly strict time check:
with two valid native fold candidates, `any(past)` rejected both even when the
later instant was still in the future. The trusted resolver deliberately
returns all offsets, while the approved requirement concerns the selected
future instant.

The form now retains both fold rows and the ambiguity explanation, explicitly
labels/disables each passed instant, and leaves the group unselected. The user
must select the future row and confirm it. It does not filter the group into
an automatically selected single choice. Both-past and single-past results
remain rejected; submission also rechecks the selected instant after the
device-zone await. Two widget counterexamples cover earlier-past/later-future
and both-past, including the actual submitted later instant and zero implicit
selection.

The source/anchor WIP was again isolated before this correction. On the merged
shared baseline `70ca23d0dda44dbe3fc2fa380ca06dcfb8b5f485` (retaining the first
P2 correction), targeted analyzer passed without issues and the complete
proactive suite passed **53/53**. Raw output:
`/home/miku/.local/state/enmori-ai-companion-20261025/app-f0-fold-future.log`.
This remains fake/widget time evidence, not Android time-channel/device proof.

## Fourth increment, protocol checkpoint — genuine messages and owned sources

This first source checkpoint freezes only Domain/HTTP wire work so Integration
can implement F1's separate selected-reply capability without editing App's
active UI/controller work. It is based on `16e1923bc3041d6384e59d702da5cd8623f4b6f3`.
The controlling authority remains the approved first-flow decision. Exact
source/anchor/read-state DTOs were checked against the shared source contracts
and Integration's transport through `ba1797e6be7c75f7303c254f47d45e32af56d171`.
The separate delivery resolver returns an authorized anchor from only
`deliveryRef`; its existence does not authorize registration or notification sends.

`AiMessage` adds explicit proactive origin, occurrence and minimized source cards
with legacy defaults. The decoder validates the literal approved category and
rejects partial origin, fake user origin, rich/unavailable cards, normalized
invalid times and source bodies on tombstones. Source timestamps retain their
full projection precision as display strings; versions remain opaque authority.
An ordinary execute/readback pair cannot use a standalone proactive assistant.

Optional `AiOwnedSourcesRepository` and `AiCompanionReplyRepository` capabilities
leave old adapters and request shapes intact. The real wire mapper implements
exact source/delivery resolution, bound message anchor, versioned topic-read
GET/PUT and explicit same-topic reply execution. Anchor `pageBefore` must decode
to exactly sequence + 1 in the existing canonical cursor format. A source resolver
returns only the expected typed target, never an arbitrary path or model URL.
The four new typed failures use N01's top-level requestId and safe local copy.

Eleven new synthetic wire cases passed as part of the latest complete
AI/proactive **344/344** candidate regression, with analyzer clean; the UI and
controller in that broader run are still separate WIP at this checkpoint.
Only the protocol files and their independent wire test are frozen here. Their
standalone final output is `app-source-protocol-final.log` under
`/home/miku/.local/state/enmori-ai-companion-20261025/`.
UI composition, actual visible read marking, exact page reveal, draft-editor
ownership and F1/D1 remain subsequent checkpoints, not claims of this commit.
No real Backend, model, Firebase, SDK/token, notification, device, APK/Gradle or
deployment operation was performed for this protocol validation.

## Fourth increment, App checkpoint — exact source view, visible reading and one draft

This UI/controller increment follows protocol `807613d`. Root's pure selected
contract/wire commits `090e996` and `a7a288f` were consumed as `5d579e5` and
`49e1c60`; they do not add an F1 picker or selected-send UI in this checkpoint.
The first-flow authority and source/anchor/read contracts remain unchanged.

- Genuine proactive rows carry the application-owned “You requested this
  follow-up” label, safe source actions and an unread dot only after a known
  watermark. The controller excludes standalone proactive assistants from
  ordinary pair/retry evidence. Text stays plain and source versions stay opaque.
- Optional `initialMessage: AiMessageLocator?` and
  `onOpenSourceTarget: ValueChanged<AiSourceTarget>?` extend the existing page.
  A source tap resolves the exact current receipt before navigation. Message
  targets stay in the feature; Root routes typed Check-in targets. A locator
  reads its authorized anchor, then the existing transcript with the returned
  `before`, and requires the exact available ID/sequence. Failure has explicit
  read-only recovery and never opens a global Latest page in its place.
- A same-topic locator preserves the current reply/user-saved retry binding and
  draft. A different topic retains the existing explicit discard confirmation.
  Proactive reply selection adds only a local association; explicit real-user
  Send carries the approved replyTo field through the existing operation fence.
- Source navigation/read metadata use a separate session/topic/foreground/consent
  lifetime. A later denial aborts earlier transcript reads so a delayed older
  response cannot restore its body. Only IDs in a newly accepted page recover
  their own hidden source views; reading an unrelated page cannot authorize the
  rest of the cached history. A retired reply stays blocked until exact recheck
  or explicit removal of its association, keeping the user's own draft.
- `AiVisibleMessage` observes the actual text render box after layout, its scroll
  viewport, painted opacity and current route. Offscreen, covered, offstage and
  incomplete-fade bodies do not mark reading. The metadata controller rechecks
  the committed available proactive ID and current revision. Unknown PUT remains
  unconfirmed and fenced until GET; row construction, notification receipt and
  clicks alone are not read acknowledgements or delivery proof.
- A session-RAM draft editor lease permits only the current AI page to edit or
  Send. When two AI pages coexist around a pushed record editor, the returning
  page restores the current controller TextEditingValue/selection and consumes
  the current locator. It cannot resurrect discarded text, replay a captured old
  Send callback or reapply an obsolete initial locator. Unknown operation guards
  survive both page stacks. Other record-editor drafts are retained.
- References default disabled through `aiCompanionReferencesEnabledProvider`.
  Root enables the approved composition explicitly. The settings page also adds
  optional `Widget? pushControls`, default null, for Delivery's separate D1 UI.
  This checkpoint neither initializes Messaging nor implements that D1 controller.

### Exact validation and retained failure history

All Flutter work used the coordinated nonblocking global lock. The first new
wire/controller run passed 15/19: the fixture had allowed a lazily rebuilt source
observer to see an earlier cached read before initializing the new session epoch.
The fixture now starts that observer before the fresh transcript; production
still refuses cached proof. The corrected 19/19 run is retained as
`app-origin-source-epoch-tests.log`. A new stacked-page case initially sampled a
button before its text-edit rebuild; adding the real frame resolved that fixture.

The complete AI/proactive candidate then passed **344/344**, with analyzer clean,
in `app-origin-regression-final.log`. Its sole earlier failure was an old R-A test
that started at Latest, searched down for an unbuilt recovery control above it,
and required a new notifier instance. An isolated archive of exact `d893d2d`
reproduced the same instance failure after fixing navigation; see
`app-origin-ra-d893-baseline.log` and the baseline path receipt in this directory.
The test now uses bounded top-to-target scrolling/hit testing and asserts the
session/target/unknown/no-resend behavior, retaining every business guard rather
than requiring a notifier disposal mechanism. Runtime lifetime was not changed
to satisfy that stale assumption.

After the complete run, final local-page recovery and reply privacy cases were
added. The exact final scoped batch passed **104/104**, including owned source
controller/page/visibility cases, ordinary AI controller/R-A recovery regression
and Root's eight selected-wire cases. Analyzer: `No issues found! (ran in 13.1s)`.
Raw output: `app-source-ui-final.log`. No overflow, hit-test warning or exception
remained. Counts above describe separate runs and are not added together. Every
log named in this section is under
`/home/miku/.local/state/enmori-ai-companion-20261025/`.

The latest privacy cases prove that a partial page cannot restore another cached
source, a same-topic exact read preserves its retry/reply binding, and cancelling
a retired reply association is explicit. UI coverage includes two coexisting AI
pages around a retained record editor, original unknown-operation recovery,
covered/offscreen text, exact navigation failure, typed source routing and a
320px Chinese screen at 2× text. `git diff --check` is clean.

These are synthetic/source/widget and localhost-wire checks. No real Backend,
model, Firebase, SDK token/registration, notification, phone, APK/Gradle or deploy
was invoked. Existing model semantic failures remain unchanged. Shared target
routes/flag composition and the independently owned D1 candidate need Root's
separate integration/QA; F1 picker/review/selected-send UI remains the next App
increment. This is not UAT, Release or Done acceptance.

## Product P1: search-derived source display (2026-10-25)

Product's exact `629a22d` review found that chat correctly hid a source-denied
body while Find still derived matches and neighboring context from the canonical
message. The body was still canonically available, so availability alone was
insufficient evidence for display. The shared current display predicate now
gates chat, Find results, selected content, context and previous/next controls.
Captured selection callbacks recheck the current source state before acting.
Session/topic mismatch hides source-bearing content; unrelated available messages
remain searchable. Temporary source uncertainty does not rewrite stored messages
as tombstones, and only a fresh exact accepted read restores the affected view.

The focused search/source-page run passed **27/27**. New counterexamples cover
direct-hit denial, a denial arriving with search already open on a neighbor,
captured Next after denial, and an already-selected source becoming hidden on
background/resume until a fresh exact transcript read. Existing search draft,
history, tombstone, unknown-operation and narrow 2x text cases also passed. There
were no model prepares/executes in the new privacy cases. Analyzer initially
reported two missing flow-control braces; after that formatting-only correction
the same four changed Dart files analyzed cleanly (`3.7s`). `git diff --check`
is clean. Raw log: `app-search-display-gate.log`, SHA-256
`8995ed9031bc7c284895dd0702414a727a527ec062f6776b3b36cf2c8b6e1a11`,
under the local evidence directory above. This is an App source/widget repair;
Product/QA independently close their P1 review against this new commit.

## F1a App candidate: choose, review, then explicitly Send (2026-10-25)

This consumes the LI first-flow decision, Root's selected-reply domain/wire
contract (`5d579e5` / `49e1c60` here), and Product/Integration's bounded
history-exclusion handoff. Root's pure review component `cad5fb4` is retained as
local cherry-pick `af2a79c`; App's next commit contains the controller, picker,
composer and corresponding evidence/tests, with no edits to Root's wire/domain.

### Selection and review boundary

- References opens an explicit own-Check-in picker with zero defaults, a maximum
  of five choices and the inclusive rolling seven-day limit. Eight UTC date
  first pages bound retrieval; next pages require an explicit action with the
  returned cursor. Unknown/failed dates remain a partial list, and a failed or
  repeating cursor neither empties the earlier rows nor drains pages in a loop.
- Check-ins immediately become a small RAM projection: ID, current Note,
  recorded Mood/Activity, original time and revision. Location labels,
  coordinates and weather are not fields of this state. Display uses the
  original time and labels Mood/Activity as recorded, not current facts.
- Exact owned IDs are re-read before and after prepare. A source changing during
  that interval invalidates review; an unavailable/unknown read removes the old
  displayed quotation while retaining the choice for explicit recheck/removal.
  Prepare sends IDs only. No saved cardRef/version is decoded or mapped to a
  record ID; execution includes the current prepare's complete source-key set.
- Excluding displayed past exchanges cancels the old preparation and prepares
  afresh. Only exact matching user/assistant IDs and sequences map the explicit
  intent onto fresh history keys. A changed set resets the exclusion and
  confirmation. Whole pairs are excluded, no earlier pair is backfilled, and
  saved exchanges are not deleted. Generic conflict copy does not guess which
  source/pair caused it. Captured Confirm/Exclude/Refresh callbacks must still
  match their displayed revision and current route/session; confirming only
  returns to the unchanged draft, with no execute.

### Original operation, scope and private preparation

The original prepare token/ticket stays private in the existing AI controller.
Public state receives only sanitized selection metadata. Both original absolute
expiries and the original monotonic 15-second budget apply; confirm/Send does not
acquire another token or renew a ticket. Expiry, changed choices/source access,
background, auth/consent loss and an explicit topic switch retire held keys.
Pending reads can be left without waiting for a late prepare to replace newer
choices. Attempt cleanup clears the selected ticket and history keys as well as
the existing token/key, including the attempt object used as outgoing identity.

Selected Send transfers its original preparation into the existing execution,
cancel, timing and unknown-operation machinery. The draft remains in the editor
while pending/unknown. A dispatched 409/source failure is still fenced: only
the original operation GET can prove no-effect, the exact saved U for Retry, or
an accepted assistant pair. No-effect retains choices for a newly reviewed Send;
user-saved Retry names that original U, never saves another U. Accepted success
clears this reply's selection and only the still-matching submitted draft.
An explicit topic-scope key distinguishes user topic changes from a reserved
operation ID becoming canonical or returning no-effect; new topics keep the
draft while clearing the old source selection.

`AiConversationPage` and its builder add optional `initialCheckInId` and
`initialCheckInSessionKey`. Root supplies the current AI session-key object for
its explicit owned-detail route. The current editor reads its existing topic,
then consumes that request once by opening the picker; existing choices and
draft stay intact. An unknown operation waits in chat with a pending-attachment
notice. After safe readback, another explicit tap is required. A same-UID auth
replacement cannot reuse the old stamp, issue the target GET or select it.
Root separately owns the actual Check-in action and shared route/extra binding.

### Exact verification and retained corrections

The first 15-case run passed 11 and found four failures. Two were actual state
bugs: PopScope read its old pre-confirm snapshot, and new-topic no-effect was
mistaken for an explicit topic switch. These now read current confirmation and
the explicit topic scope respectively. A narrow-screen fixture also searched
down for a lazy Review button above the viewport; bounded top-to-target scrolling
fixed that navigation without weakening hit-test assertions. The next 15 cases
passed; analyzer flow-control/style findings were repaired. Later 19-case and
385-case runs are retained as separate pre-final checkpoints, not summed.

The final candidate passed **389/389** across this checkout's entire
`test/features/ai_conversation` and `test/features/proactive` directories,
including **25** F1 controller/page cases and Root's six review-panel cases.
It covers 0/5/6 choices, rolling time boundaries and cursor errors, original
token/expiry, fresh pair identity/exclusion, same-UID replacement and late reads,
source edits/authorization loss, execute conflict/unknown/user-saved Retry,
no-effect/assistant-saved recovery, two AI pages around an intact other editor,
captured review callbacks, explicit detail entry and its unknown/session guards,
and 320px English/Chinese at 2x text. No overflow, tap warning or exception
remained. Two final missing flow-control braces were then fixed without changing
behavior; all four AI/proactive source/test directories analyzed cleanly
(`11.8s`). `git diff --check` is clean.

Raw final log: `/home/miku/.local/state/enmori-ai-companion-20261025/app-f1-final.log`,
SHA-256 `002babf00e62b0f9222f5b34fc67b1d21dda8e2c284ac32d9de5211a0648e816`.
All Flutter/Dart work used the coordinated global lock. This is App source,
fake repository, widget and localhost-wire evidence, not final shared routing,
Delivery D1, deployed Backend/model, Firebase/FCM, APK/phone, UAT, Release or Done
acceptance. No real model/Backend request, data write, registration or push was
performed. Product/QA review this exact new commit independently.

## F1a P2: pending execution after source-access retirement

App self-review after `ee44827` found that content-access retirement changes the
selector epoch. A pending selected-send await then correctly refuses to update
that retired epoch, but its local `sending` flag was never released. After Cancel
and an authoritative original-operation no-effect GET, AI could send while the
selector still refused a new review. Product source review `4ad63af` and QA's
independent original-head red evidence `982df02` preserve that failure; the
389-case checkpoint above did not cover this pending-execution transition.

The content-access listener now releases only its local `sending` flag when
retiring the epoch. `_recoveringSelected`, the original operation identity,
unknown guard, draft and choices are unchanged. It cannot prepare/execute while
the original AI operation remains unresolved. Two new source/fake cases cover
foreground access mutation and background/resume, explicit original Cancel,
unknown blocking a new prepare, original GET no-effect permitting a fresh
review, a late old execute response unable to overwrite it, and a new explicit
confirm/Send. Both passed (**2/2**); these two Dart files analyzed cleanly
(`3.8s`). No full-suite count is added to this focused run.

Raw log: `app-f1-access-recovery.log`, SHA-256
`da1f2e8c92d9c926e8d91a92afe80a73fb51230f72c28851641b06fee4eff55e`,
in the local evidence directory. This is a source/widget recovery correction,
with no native background, service, model, notification or physical-device claim.

## Minimal C harness visibility correction

Integration compared its complete candidate run against exact `b81d93f` using
the same SDK and unchanged original 19 test files: 58 of 62 failures reproduced
on that baseline. Its comparison is retained in
`integration-flutter-baseline-comparison.json`; those historical failures are
not rewritten as a green full-project result. The two new App harness failures
were the social overlong-text/Unicode-scalar rejection display checks. The
existing draft, selection, focus, no-request, correction and exact request-count
assertions remain unchanged.

Diagnostics confirmed the controller had the correct input error, the original
2401-scalar draft and focus were kept, and the status existed offscreen. The
history viewport was **240px**, not zero; at offset zero its scroll range was
64px. The error follows the empty-topic introduction, so it needed a downward
scroll. An initial upward-scroll/top-jump hypothesis failed and is retained in
`app-c-status-fixture.log`, `app-c-status-fixture-second.log` and the diagnostic
logs. No keyboard hiding, shorter text, provider mutation or production change
was used. The final fixture adds only a bounded call to its existing visibility
helper before the text assertion.

The exact two social rejection cases then passed **2/2**; the changed test file
analyzed cleanly (`4.4s`). Final log: `app-c-status-fixture-final.log` in the local
evidence directory. All broader baseline-only fixture drafts were removed from
the worktree and retained only as an uncommitted local patch for traceability;
their old business assertions and cases were not changed or waived.
