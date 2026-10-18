# ZHOU — session-owned AI / Persona confirmations

18 October 2026, SGT. Workspace `D:/3851`; branch `codex/zhou-session-dialog-hci-20261018`.

## Source and authority

- Approved baseline: #148 `e1a51eab55522a53c2b7c98440a46660098b4635`, including approved #147. LI's existing 90/90 and 251/251 reviews remain historical scoped results, not new runs here.
- Tested source commit: `6962b519a1c18cbf698fd89e2516cc4adfb7f6d0`; tree `1c4513e034e4963f769a8004a0795bfae8da54cf`. Seven files: five feature presentation files and their two existing widget-test files. Later evidence commits do not change these inputs.
- [Confirmed continuous improvement assignment](../../decisions/2026-10-18-li-zhou-du-continuous-improvement.md), ZHOU row and delivery rules; [LI's next item after approvals](https://github.com/3427564237/enmori-app/issues/83#issuecomment-6248368041) prioritizes existing cancel/leave/return and session replacement.
- Existing rules: [Persona P03/P05, PC12](../../planning/2026-10-07-zhou-persona-first-contract-delta.md) retain session-instance isolation and separate page lifetime from command settlement. [Approved AI remaining scope](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md) selects section 5 of [the retained packet](../../planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md): invalidated sessions clear private local state; leaving is not proof of remote termination or deletion.

## Demonstrated defect and correction

Open AI discard, leave or delete confirmation, then replace the observed session or reject authentication. The page's session key rebuilt the page and invalidated its actions, but `showDialog` had pushed a separate root route. That old modal remained above the replacement page. Persona activation, deletion, dirty discard and in-flight/uncertain-create exit confirmations had the same lifetime gap. The messages are static; no Persona-name disclosure was demonstrated. Existing post-await session/mounted guards already prevented old feature mutations/navigation.

A cached old dialog button also used an unconditional top-level `pop`: if another page had since been pushed above it, the old callback could pop that newer page. This is a separate observable symptom of the same missing dialog ownership.

Each invoking page now retains its specific `DialogRoute<bool>`. Disposal immediately invalidates that ownership and schedules removal of only that route after the current frame, avoiding Navigator mutation during rebuilding. AI also dismisses its owned confirmation on same-session authentication rejection. The three Persona pages dispose their page-local confirmation holder; the session command and any eligible eventual completion retain their existing lifetime.

Buttons require the owned route to still be current. Old callbacks cannot pop a newer route or confirmation. Existing confirmation text, explicit action requirements, root Navigator, captured theme, SafeArea, barrier defaults, closed-loop traversal and cancel autofocus remain. No new retry, transport, API, runtime, dependency or storage behavior was introduced.

## Before / after evidence

| Check | Before | Current source |
| --- | --- | --- |
| 7 new AI widget cases | 7/7 fail on baseline | Pass within 54 AI-page cases and the 361 affected cases |
| 19 new Persona widget/session cases | 19/19 fail on baseline | 19/19 pass, included in the 361 affected cases |
| Exact baseline export plus the two final test files, filtered to all 26 new cases | 0 pass / 26 fail, exit 1 | No baseline source changes; only test overlays and generated package metadata |
| Affected AI/Persona, navigation, network-fixture and repeat-journey regression set | Not rerun broadly on old source | **361 pass / 0 fail**, exit 0 |
| Fatal-info analysis of all 7 changed Dart files | — | No issues, exit 0 |
| Non-writing format / whitespace | — | 7 files / 0 changes; diff check pass |

The 26 cases cover AI discard/leave/delete on replacement and same-key auth rejection; Persona activation/deletion/discard on same-UID replacement and signout; all three Persona pages' busy and uncertain-create exits; continued explicit use; stale callbacks; and a newer route above the old modal. Persona uses the actual auth observation / session / provider chain with a synthetic repository. AI page tests use an explicitly synthetic controller. Existing affected tests retain controller/wire-fixture, unknown-result and repeat-journey coverage; no real network service was contacted.

The baseline counterfactual was exported with `git archive e1a51ea...` under this host's `core.autocrlf=true`. Its original tracked files were checked against that commit's blobs, allowing only that configured LF/CRLF conversion, except the two intentionally overlaid current tests. The generated `.dart_tool/package_config.json` and `package_graph.json` were copied from this same toolchain; no dependency update was performed. See [machine-readable receipt](2026-10-18-zhou-session-dialog-hci.json) for hashes and counts.

Retained investigation history: early small reproductions failed on the old AI/Persona source. An intermediate AI assertion incorrectly required every `ModalBarrier` in the app to disappear; MaterialApp already retains a barrier. It was corrected to check that the exact old dialog route is inactive, followed by actual interaction. An early Persona fixture reused a const-equal auth observation, so it did not produce a new session and three busy tests timed out; the final fixture creates a distinct observation and asserts a distinct session key. An offstage case was narrowed to explicit page teardown, rather than inventing an immediate rebuild requirement for a paused offstage Consumer. None of those intermediate runs is reported as the final 26-case counterfactual or final green result.

Independent local static review of the five source files found no actionable finding. This is additional local review, **not LI acceptance**. SHI #132 remains at unchanged `7da25cade87f808606320aff0f5c343cef4e1b5f`; its completed Event review is not repeated by this packet.

## Reproduction and verification

Flutter 3.47.2 / Dart 3.13.2, Windows. All logs are retained under `build/zhou-session-dialog-hci-20261018/`; hashes are in the receipt. The 26 new cases are included in the 361, not added to that total again.

```powershell
fvm flutter test --no-pub --reporter expanded test/features/ai_conversation test/features/personas test/harness/ai_network_harness_test.dart test/harness/ai_network_persona_harness_test.dart test/harness/ai_network_cancel_return_test.dart test/harness/ai_connected_repeat_journey_test.dart test/harness/ai_conversation_harness_test.dart test/harness/ai_persona_harness_test.dart test/app/ai_conversation_shared_router_test.dart test/app/history_ai_home_router_test.dart test/app/persona_home_router_test.dart test/harness/social/offline_social_feedback_test.dart

# Run in the exact baseline export with the two current widget tests overlaid:
flutter test --no-pub --reporter expanded test/features/ai_conversation/ai_conversation_page_test.dart test/features/personas/persona_pages_test.dart --name 'session dialog|session-owned Persona'

fvm dart analyze --fatal-infos lib/features/ai_conversation/presentation/ai_conversation_page.dart lib/features/personas/presentation/persona_page_parts.dart lib/features/personas/presentation/persona_editor_page.dart lib/features/personas/presentation/persona_management_page.dart lib/features/personas/presentation/persona_overview_page.dart test/features/ai_conversation/ai_conversation_page_test.dart test/features/personas/persona_pages_test.dart
fvm dart format --output=none --set-exit-if-changed lib/features/ai_conversation/presentation/ai_conversation_page.dart lib/features/personas/presentation/persona_page_parts.dart lib/features/personas/presentation/persona_editor_page.dart lib/features/personas/presentation/persona_management_page.dart lib/features/personas/presentation/persona_overview_page.dart test/features/ai_conversation/ai_conversation_page_test.dart test/features/personas/persona_pages_test.dart
git diff --check
```

## Handoff and limits

LI reviews this new source under #83. JIN can consume source-only `6962b51` after the applicable review and identify the combined candidate. The earlier Persona/composer packets are already approved; their old merges and the model fault do not block this client delivery.

SHI's compact device procedure, on an identified combined candidate with an existing authorized synthetic/no-model session fixture:

1. Open each existing AI confirmation without generating a model request: use a draft for discard, a preexisting synthetic waiting state for leave, and a seeded synthetic saved conversation for delete. Change the observed session through the existing authorized fixture. The old confirmation must close; no old delete/leave/send/retry should execute. Reopen and complete a fresh explicit action.
2. Repeat Persona activation/delete/dirty-discard and each page's in-flight/uncertain-create exit confirmation. Replace the observed session, including same-UID replacement and signout. Check that old state/selection/draft and old confirmation are absent and fresh controls work. Do not create a real unresolved operation merely to seed this test.
3. Retain a newer route while the old page is torn down: it must remain. Check system Back, Keep/Stay/Cancel autofocus, TalkBack labels and focus return on the actual combined APK.

If the authorized session-transition or waiting-state fixture is unavailable, hold only that device case and report its exact missing fixture; do not invoke the blocked real model to manufacture it. New Android/TalkBack/APK and real backend/model results for this packet are **Not Run**. This 361-case subset is not a whole-application run or release acceptance. The original real-AI failure and JIN's disposition/capture work remain separate; no real-model call, device operation, runtime change, merge or Issue/Project transition was performed here.
