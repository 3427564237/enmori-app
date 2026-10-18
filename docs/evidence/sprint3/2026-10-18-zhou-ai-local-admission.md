# ZHOU — preserve editing after local AI input rejection

18 October 2026, SGT. Workspace `D:/3851`; branch `codex/zhou-ai-continuity-20261018`.

## Current review, candidate and work direction

- LI formally [approved #151](https://github.com/3427564237/enmori-app/pull/151#pullrequestreview-5562552620), exact `8c31f34c4ac257d665cf6fd7fed4a190460f708e`, with independent 361/361 and scoped analysis/format/whitespace. No correction request was outstanding at this checkpoint. That is this packet's base.
- JIN [#154](https://github.com/3427564237/enmori-app/pull/154), head `8abb9bc63e304b69804729f1dc761fac832d22ed`, executable merge `940d220c399120fd7649d8ea8856b790ad622dce`, tree `f8aadccd3c471d17ad5615c90e2087b5bb354aec`, includes #151. LI and SHI completed their respective reviews; [SHI's receipt](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6249086603) verifies actual `.hcitest` v2 installation and installed-base SHA256 `6bef23b5352d170483852aab2bd91ac02c6ed04bc9a6aa98dd3b0006db5c024a`. Connected `.personatest` v9 is a different artifact, SHA256 `8ffa6492677c7f5d829b45624c1a6558d73feb71b793661aad94b3c5ceff4f73`; its build does not prove current service/model usability.
- SHI observed ordinary Persona creation/dirty Keep editing and some keyboard/draft/Retry interactions in the offline fixture. The second Retry outcome was not captured. Dialog-open session replacement and held-waiting states remain unverified on the phone because those fixture controls are absent. Ordinary dirty confirmation does not substitute for them.
- Latest durable priorities are imported byte-for-byte from PM commits `12422a6a2b03a7c67071388a1d3fb7cb0776b347` and `911001ae9e1b1280e6a24d1ad3c7ba11eff8eddb`: [functionality/reliability first](../../decisions/2026-10-18-li-functionality-and-reliability-priority.md) and [complete user journey](../../decisions/2026-10-18-li-complete-user-journey-delivery.md). They supersede prospective TalkBack/extra-matrix queue wording while retaining historical evidence and existing tests. TalkBack is not a current dependency.

The new direction explicitly calls for demonstrated input/action/data-loss repairs and ZHOU's preserved drafts, session isolation and cancellation. The prior follow-on inspection had not changed local-rejection editing without that explicit direction. This packet now fixes that bounded ordinary-input failure. It preserves [the continuous queue](../../decisions/2026-10-18-li-zhou-du-continuous-improvement.md) and the selected [N01/N05/N06 source](https://github.com/3427564237/enmori-app/blob/2f00a6c7ab686ffba2429a4dc74761b12a04d3a5/docs/planning/2026-10-12-zhou-conversation-persistence-mobile-contract-candidate.md): original text is not truncated, Retry must match the saved user text, and a locally rejected input starts no attempt.

## Demonstrated defect and minimal correction

1. Paste 2401 ordinary characters, or 2401 valid supplementary Unicode scalars, into the existing AI input. Press Send. The actual controller rejects locally, with no HTTP request, but the page previously cleared the draft and removed focus first.
2. From an explicitly established synthetic `user_saved` outcome, enter different text and press Retry. The controller correctly refuses it with `Enter the same saved message to retry.` and no new request. The page nevertheless discarded the user's editable correction.

The root cause is the unconditional clear/unfocus in `_submit` before calling the controller. The page now invokes the existing command first and clears only when the same current session synchronously enters cancellable `preparing`. The controller already validates before creating its attempt, publishes that state before waiting for its token, and does not yield between those local steps. No validator is duplicated in the view and no controller or wire contract is changed.

Local refusal leaves draft text, selection and editing focus available for correction. A deliberately admitted Send/Retry still clears input; remote failure, cancellation/leave and session cleanup retain their existing rules. This is not restoration of previously sent text or automatic Retry. Only one production file changes. The existing page-test Retry double now reflects synchronous admission while preserving session and history, and a new real-client journey fixture tests the refused-to-corrected path.

## Before / after and user outcome

| Execution | Result |
| --- | --- |
| Exact #151 baseline export plus the final new journey test | **2 pass / 6 fail**, exit 1: both 2400-scalar positive controls pass; all six editable-draft counterexamples fail |
| Final source, affected client/controller/wire/harness/router set | **266/266 pass**, exit 0; includes all eight new cases, not an additional eight |
| Final three changed Dart files | Fatal-info analysis clean; non-writing format 3/0; whitespace pass |

Each plain/social page variant verifies: overlong ASCII and overlong Unicode remain editable with zero HTTP calls, followed by a deliberate corrected Send; 2400 Unicode scalars are accepted intact; a mismatched Retry retains draft/selection/focus and adds zero calls. Correcting to the exact saved text then permits explicit Retry, ordinary history reload, a further Send in the same conversation, and another reload. The final messages have sequences 1–4, with the original user ID, sequence, timestamp and content preserved. Request assertions bind Retry to the exact original U/conversation and both Retry/next-Send execute texts to their deliberate inputs.

These tests use the actual page, controller, typed repository and HTTP adapter with explicit synthetic Auth/HTTP responses. The peer retains synthetic rows in test memory only; its injected `user_saved` outcome is not evidence of a real backend settlement. Existing affected cancellation/return/session/tombstone/unknown regressions are retained. No actual backend, database, model or device was invoked.

The baseline archive uses this host's `core.autocrlf=true`; original tracked blobs are verified allowing only that configured LF/CRLF conversion. The final new test is added to that export; existing generated package metadata is copied without a dependency update. [The receipt](2026-10-18-zhou-ai-local-admission.json) binds source, original PM blobs, exact test input, logs and baseline verification.

Investigation failures are retained separately: the initial test helper did not pump after entering text before tapping the newly enabled action; an intermediate plain-page fixture pushed a second page sharing one controller and was replaced by a single-page real repository/transport composition. A malformed UTF-16 widget fixture was rejected by Flutter text layout itself, so it was removed from this ordinary editable-input fixture; existing wire validation remains unchanged, and no widget preservation claim is made for malformed UTF-16. Flutter committed the Retry composing range during the interaction; assertions preserve exact text/selection/focus without claiming native IME composition preservation. The Retry double initially dropped saved history when made more faithful to admission, then was corrected to retain it. None of these intermediate fixture failures is presented as the final six product counterexamples. The final eight-case baseline and final 266-case run use identical final tests. A local independent review found no actionable source issue; it is not LI approval.

## Commands

Logs are under `build/zhou-continuity-20261018/`; hashes are in the receipt.

```powershell
fvm flutter test --no-pub --reporter expanded test/features/ai_conversation test/harness/ai_local_rejection_journey_test.dart test/harness/ai_network_harness_test.dart test/harness/ai_network_persona_harness_test.dart test/harness/ai_network_cancel_return_test.dart test/harness/ai_connected_repeat_journey_test.dart test/harness/ai_conversation_harness_test.dart test/harness/ai_persona_harness_test.dart test/app/ai_conversation_shared_router_test.dart test/app/history_ai_home_router_test.dart test/harness/social/offline_social_feedback_test.dart
# In the #151 export with only the current new test added:
flutter test --no-pub --reporter expanded test/harness/ai_local_rejection_journey_test.dart
fvm dart analyze --fatal-infos lib/features/ai_conversation/presentation/ai_conversation_page.dart test/features/ai_conversation/ai_conversation_page_test.dart test/harness/ai_local_rejection_journey_test.dart
fvm dart format --output=none --set-exit-if-changed lib/features/ai_conversation/presentation/ai_conversation_page.dart test/features/ai_conversation/ai_conversation_page_test.dart test/harness/ai_local_rejection_journey_test.dart
git diff --check
```

## Candidate handoff and remaining local dependencies

LI reviews the new client delta. JIN retains candidate composition: consume the source contribution on the existing approved candidate and bind its actual source/tree/APK/package/version/signer before SHI attributes new phone results. #154/v2 does not already include this later correction. The two copied PM documents are original authority records, not new decisions authored by ZHOU. No shared router/bootstrap/backend/API/schema/permission/dependency/runtime is changed.

On an identified new `.hcitest` no-model candidate, SHI can use ordinary font and the existing page: paste a harmless local 2401-character draft, press Send, observe the existing correction and retained editable draft, then deliberately shorten it and exercise the synthetic Send. An existing safe `user_saved` fixture can exercise wrong-text Retry → corrected exact Retry → Reload → next Send. Do not create that state through a real model call. Reuse old accepted behavior; no new TalkBack or extreme-font matrix is requested.

The separate landscape/Pinyin observation still lacks a normal-font failure and viewport/IME-height evidence. Minimal localization on the already verified v2 is: focus a harmless unsent draft at ordinary font in portrait, open the current keyboard and rotate to landscape; record viewport dp, system padding, IME inset and visible composer area; distinguish editor-internal scrolling from composer-margin scrolling; hide/reopen the keyboard and check draft and visible actions. No Send/model action is required. Zero overflow logs do not establish reachability. No layout change or normal-font fix is claimed without that counterexample.

Real services/9B repeat-use still require JIN/LI's original failure disposition, approved capture/access steps and an identified usable connected candidate. Current offline fixture phone observations, the `.personatest` build and this local journey do not prove real AI recovery. New APK/build/install/phone results, the remaining fixture-dependent #151 phone cases, current real model/persistence and whole-application acceptance are **Not Run here**. Only the dependent real steps wait; this source delivery does not wait for the model, capture or old merges. No Issue closure, Project transition, merge or whole-module/Sprint/Release claim.
