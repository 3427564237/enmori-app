# App origin/source independent Product review

25 October 2026 · Product / UX · source inspection, no Flutter execution.

Protocol checkpoint: `807613d5e054810aa14c7a75add230f6cbb3f904`, parent
`16e1923bc3041d6384e59d702da5cd8623f4b6f3`.
UI/controller checkpoint: `629a22d7b00580e2a39360efd1270a7bd7ac7e94`, parent
`49e1c60c6f655452a876e500c911c24faa2718d3`. The latter was read from an immutable
Git archive; App's ongoing F1 changes were not treated as part of this review.

Authority remains [LI's first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
[the interaction specification](interaction-spec.md) and the approved source/read
contracts. In particular, search covers only currently available messages,
source verification failure must not reveal the old body, one current draft is
preserved across navigation, and a notification click is not a read acknowledgement.
The repository Flutter/Dart checklist guided inspection without adding scope.

## P1 — source-hidden bodies remain accessible through conversation search

**Open at `629a22d`.** A failed source resolver masks the message in the main
conversation but leaves its retained `AiMessage` available with its original text.
The existing search page reads that object without consulting the new source
visibility state. It can therefore display the same body in a matching result,
selected message or neighbouring context after the main view has withheld it.

Concrete source path:

1. `ai_owned_sources_providers.dart:355–366` handles a resolver failure,
   invalidates earlier transcript reads and adds the message ID to `_hidden`.
   The conversation controller's `invalidateSourceReads` marks the reply target
   unverified but retains the message object and its availability/text.
2. `ai_conversation_page.dart:496–557` applies `sources.hides(message)` to the
   chat tile and disables its source/reply actions. The Find action still uses
   `canFindAiMessages` and opens the existing search page.
3. `presentation/ai_message_search_page.dart:23–27,123–139` checks only the overall
   conversation state plus `AiAvailability.available` and text. Search results
   can match the source-hidden body's distinctive text.
4. The same file at `193–202` passes raw neighbouring messages to its context
   view; `375–376` displays their text based only on availability. Filtering the
   matches alone would leave this second route open.

Counterexample: open a current proactive/source-bearing assistant, fail its source
resolver with `AI_SOURCE_UNAVAILABLE` or an unknown verification result, observe
the chat body become hidden, then Find its distinctive text. Alternatively select
an adjacent available user message and inspect its nearby context. Neither path
requires sending a new message or resolving the source again.

App and Integration received this exact-head finding, and QA received the two
counterexamples. The bounded repair should reuse the existing current display
gate for search matches, selected items, neighbouring context and navigation,
including a search already open when authority changes. Keep unrelated available
messages searchable. Do not convert a temporary unknown into a permanent tombstone,
delete canonical history or clear the user's draft to hide the symptom.

This is a source counterexample, not an independently executed widget result.
The author's chat-only disappearance assertion does not exercise either search
projection. Closure requires a fix checkpoint and focused review/validation.

### Focused repair — bd10a8e

Product independently inspected all five files in
`bd10a8e1598e71f040e38fd3330f7e5baaf64859`, whose parent is the original
`629a22d7b00580e2a39360efd1270a7bd7ac7e94` review checkpoint. **The reported source
finding is addressed. QA subsequently closed its focused widget gate below.**
The original P1 and its counterexample above remain part of the record.

The shared `canDisplayAiMessage` predicate now gates the chat body, search
matching and excerpts, selected content, neighbouring context and previous/next
actions. Search watches current source state, so an already open selected/context
view reacts to later denial or foreground invalidation. `_select` re-reads the
current conversation/source state before using a captured message ID; a callback
captured before denial cannot select the newly hidden body. Session/topic mismatch
withholds source-bearing content. Unrelated available messages remain searchable.

The patch does not rewrite canonical messages, add tombstones or initiate a model
request. Existing exact-page recheck determines when temporary source hiding may
end. Product read the three new cases: direct search after denial, denial arriving
while an adjacent message is selected plus its captured Next callback, and a
selected source remaining hidden across background/resume until fresh exact read.

App reports 27/27 focused checks and clean analysis of four Dart files. Product
verified the local author log's 27-pass line, analysis result and SHA-256
`8995ed9031bc7c284895dd0702414a727a527ec062f6776b3b36cf2c8b6e1a11`
(`app-search-display-gate.log`); Product did not execute Flutter. QA initially
acknowledged the fix diff while awaiting its coordinated execution window.

### Independent QA closure — exact bd10a8e

QA reported independent source inspection and **3/3** new counterexamples at
exact `bd10a8e1598e71f040e38fd3330f7e5baaf64859`: the hidden direct match is absent
while an unrelated user message remains searchable; denial masks an already open
neighbour context and the captured Next cannot restore it; the selected source
stays hidden across background/resume until fresh exact read. QA's reported log
SHA-256 is `254f52c289188ea1abd0bbe772c8990dd2985720f851c39d63de72471a1dfa88`.
QA returned the Flutter window to Integration. Its separate evidence is
`9c65bb6ffc1fbdae7cf3d29b5caa02bca902127c`,
`docs/evidence/ai-companion-20261025/qa-app-source-search.md`; Product read that
record. QA did not execute an old-head red run, and none is inferred here.

**P1 closed within the independently reviewed source/widget scope.** The original
629a22d failure remains above. QA's three cases are not added to App's 27 or 104,
and this focused closure is not a full source UI, runtime, device or F1/D1 result.

## Other inspected boundaries

| Boundary | Source observation | Evidence limit |
| --- | --- | --- |
| Protocol origin | Complete proactive origin/occurrence/category tuple is restricted to assistant rows; unavailable rows carry no text/source card; proactive rows cannot prove an ordinary user/assistant pair. | No backend/model execution by Product. |
| Source protocol | Cards are minimized and immutable after wire parsing. Typed resolver kind must match the card; arbitrary URLs/paths are rejected. Current public card DTOs are available-only; later UI withholding is separate local state. | No claim that a readable card itself grants new model use. |
| Exact location | Direct anchor identity is checked, its canonical `before` page is fetched, and the exact available message ID/sequence is required. Failure shows a read-only recovery view; it does not substitute Latest. | Shared target routing is Integration's separate composition. |
| Per-message recheck | Only newly accepted page IDs leave the hidden set. Source failure invalidates earlier reads. Unrelated page refresh cannot release a retired reply target. | P1 above means the display restriction is not yet applied to every view. |
| Read state | Actual text render box, current route, scroll viewport, nonzero area, offstage and opacity checks precede the callback. The controller rechecks current session/topic/foreground/consent and the committed available proactive message. | No new native/device observation, delivery proof or cross-device acceptance. |
| Unknown read | A PUT sets unconfirmed before dispatch; failure/412 retains the fence until successful GET. No chat Send or retry is initiated by metadata reads. | Product read implementation and test cases; did not run them. |
| Reply and retry | Same-topic exact lookup retains the existing user-saved retry and reply binding. Proactive reply selection is local until an explicit real-user Send. | F1 selected-send UI is not part of this checkpoint. |
| Stacked AI pages | Current-route editor lease gates edits/Send. Returning pages copy the current controller TextEditingValue, including selection, and retire an obsolete initial locator. Source editor routes remain retained. | Author cases cover a retained Check-in editor and the original unknown operation; this is not a new router framework or device result. |
| Default composition | Reference capability defaults off; optional `pushControls` is a host slot. | D1 implementation, SDK initialization and actual notification actions are outside this slice. |

No other blocking source finding was identified in the reviewed scope at the
original checkpoint. The focused repair above addresses the P1 source finding;
the attributed QA closure covers its three counterexamples, not complete F0/F1/D1.

## Validation attribution

Product read the protocol diff, production UI/controller changes and relevant
test source. App reports 11/11 protocol checks at `807613d`, a separate earlier
344/344 candidate run, then 104/104 plus clean analysis for the final scoped UI
batch. These are attributed author runs, not Product's independent execution,
and their counts are not added together. Reported final log:
`app-source-ui-final.log`, SHA-256
`254a0a43d66088840d4341f2a7d3038aee48d56852c38d93adc886d6738ddc1d`.
Product checked that local author log's hash and final 104-pass line; reading
the log does not turn it into an independently executed run.

Product did not use the Flutter slot or run Gradle/APK, a model, real account,
notification, device or deployment. F1 Domain/Data ancestors do not constitute an
F1 picker/review/Send UI. Shared route/flag wiring, D1, independent QA and runtime
quality remain separate gates. Prior model quality failures are unchanged by
this source review.
