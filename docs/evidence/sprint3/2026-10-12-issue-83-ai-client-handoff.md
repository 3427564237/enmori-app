# Issue #83 — selected AI client owner handoff

Date: 12 October 2026, SGT (UTC+08:00). Owner validation completed at approximately **18:30 SGT**. This is owner execution evidence; JIN independent review and LI bounded acceptance remain pending. APK compilation is not device execution or complete M26 delivery.

## Authority and exact source

- [#83](https://github.com/3427564237/enmori-app/issues/83), child of [#44](https://github.com/3427564237/enmori-app/issues/44): ZHOU `@YaoyinZhou3922` owns; JIN `@chuxi12483468` reviews new code; LI `@3427564237` records bounded acceptance.
- [Execution reissue at `f8c6772`](https://github.com/3427564237/enmori-app/blob/f8c6772/docs/decisions/2026-10-12-li-parallel-delivery-reissue.md) releases selected N01/N05/N06 client implementation and one focused Draft handoff. It supersedes only the earlier document-only execution arrangement for this independent slice.
- [Selected candidate `2f00a6c7ab686ffba2429a4dc74761b12a04d3a5`](https://github.com/3427564237/enmori-app/blob/2f00a6c7ab686ffba2429a4dc74761b12a04d3a5/docs/planning/2026-10-12-zhou-conversation-persistence-mobile-contract-candidate.md), [conditional A](../../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md), [reissue record](../../decisions/2026-10-12-li-parallel-delivery-reissue.md) and [Flutter architecture](../../../ARCHITECTURE.md) control this work. Accepted internal #79 `d242cc9b8fa5626a877d0397c6f1a41278b5c81a` remains a separate earlier component.

Executable source is commit **`deffe041b2713aec28e04b8dbb509dc553db2e40`**, tree **`997be8e1aa5ca69bd29a11f35ea9823a2b5fe5f3`**, parent **`2f00a6c7ab686ffba2429a4dc74761b12a04d3a5`**, on `codex/issue-83-ai-client`. Its 19 changed files are **17 Dart files and two exact LI decision copies**. Evidence is added afterward; the PR/owner handoff comment binds the final published evidence head and actual publication timestamp, avoiding a self-referential commit claim.

The [source manifest](2026-10-12-issue-83-source-manifest.json) binds 24 source/input hashes, including code Git blobs/local SHA-256 values, and four published transcript hashes. Published logs are normalized to UTF-8 without BOM and LF, with trailing horizontal whitespace removed and one final newline. They are **not byte-identical to raw logs**; raw and published SHA-256 values are recorded separately and were verified. The results below apply to the executable source above.

## Delivered behavior and boundaries

N01 supplies actual handwritten request/response/error/operation/cursor mapping for the six selected operations. N05 supplies actual controller/session/route ownership, synchronous dispatch fencing before cancellation, request-specific abort, original-token/key best-effort Cancel, 15-second token/prepare, 75-second execute and 90-second total windows, fresh ordinary reads and explicit Retry. N06 supplies the actual plain-text page, selected states/copy, whole Delete and accessible controls. Results merge by message ID and sequence, preserve original user timestamp, and retain tombstones against obsolete available replies. Old route/session/attempt callbacks cannot update the current flow; same-UID replacement and logout invalidate old state.

`lib/features/ai_conversation/` contains Domain contracts/models, constructor-injected `AiWireRepository`/`AiWireTransport`, Riverpod controller/providers and Presentation. `lib/core/result/result.dart` extends the existing approved failure protocol. Domain/Data do not receive Riverpod `Ref`; the feature consumes Auth through its existing provider/Domain contract and imports no other feature's Data/Presentation. `aiConversationRepositoryProvider` defaults to `null`. Ordinary/demo app, Home and router do not mount this harness or a successful AI transport.

The separate `lib/ai_conversation_harness.dart` entry composes the actual page/controller/wire mapper with `lib/harness/ai_conversation/` handwritten transport and synthetic Auth. Its persistent banner reads **“Synthetic test transport — no real storage or model”**. Scenarios cover success, limited permission, busy, dependency failure, rejected reply, unresolved result and waiting for Cancel; fixture controls cover same-UID session replacement, logout and unavailable assistant content. Explicit result reads/Retry, reload/tombstone merge and whole Delete operate only on scripted memory. Fixture messages/timestamps are not real persistence evidence; fixture session replacement is not a product recovery exit.

No network/Firebase initialization/real token/Backend/store/model is present in the harness. No new endpoint, schema/index/transaction, context adapter, dependency/version, SDK package, platform scaffold or ordinary runtime enablement is included. Client windows do not extend Backend 60/5/45 or prove model termination, durable writes or phone receipt.

## Builder and LI integration handoff

Import `package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart`:

```dart
Widget buildAiConversationPage(
  BuildContext context, {
  required VoidCallback onBack,
  required VoidCallback onOpenSettings,
})
```

The page reads `aiConversationControllerProvider`; compose Auth and `aiConversationRepositoryProvider` through existing injection. Callback/identifier inputs confer no authority. For [#85 / Draft #87](https://github.com/3427564237/enmori-app/pull/87), [shared provider source at `8f7d719e065807d2d6776858f928886079a1a62c`](https://github.com/3427564237/enmori-app/blob/8f7d719e065807d2d6776858f928886079a1a62c/lib/app/router/isolated_history_ai_pages.dart) defines the required composition:

```dart
isolatedAiConversationPageProvider.overrideWithValue(
  IsolatedAiConversationPage(build: buildAiConversationPage),
)
```

That binding with this test transport belongs only in an **explicit synthetic harness**, with controlled dependencies and the isolated flag. LI owns `/ai-assistant`, Back pop/Home and existing `AppRoutes.settings`; DU reviews new LI shared code. **#87 has not been integrated into this executable tree.** This standalone harness's synthetic Back/Settings receipts do not prove Home/router integration, reviewed combined-source gates or real destinations.

## Actual verification and reproduction

Existing pinned Flutter 3.47.2 / Dart 3.13.2 were used. Logs below retain the actual output, including warnings.

| Check | Actual result |
| --- | --- |
| `fvm flutter test --no-pub --reporter expanded` | **418/418 Pass**; [full transcript](transcripts/issue83/flutter-full.txt) |
| Included new tests | **110** = wire 32 + controller 28 + recovery 17 + page 23 + harness 10; these are included in 418 alongside baseline 308, not additional tests to add again |
| `fvm flutter analyze --no-pub` | **Pass, no issues**; [analysis transcript](transcripts/issue83/flutter-analyze.txt) |
| `fvm dart format --output=none --set-exit-if-changed` on the 17 manifest Dart files | **Pass, 0 changed** |
| `git diff --check` for the source change | **Pass** |
| Initial Android harness APK build | **Failed**: Kotlin incremental caching crossed C: Pub cache and D: workspace roots; [retained initial transcript](transcripts/issue83/android-build-initial.txt) |
| Android retry with existing process-only compiler flags below | **Pass, 11.4 seconds**; [final build transcript](transcripts/issue83/android-build-final.txt) |
| Actual Android device interaction/accessibility and real Conversation persistence | **Not Run** |

Successful build command, reusing the process-only workaround already documented in [the published Persona handoff](2026-10-09-zhou-persona-review-handoff.md):

```powershell
fvm flutter build apk --debug --no-pub --target lib/ai_conversation_harness.dart --android-project-arg=kotlin.incremental=false --android-project-arg=kotlin.compiler.execution.strategy=in-process
```

APK: `build/app/outputs/flutter-apk/app-debug.apk`; SHA-256 **`c83cf40ad3a05ce9d3b8845a87336560f00ae469c19691df561b2bcdd05b4155`**. No dependency/SDK/configuration change was made to obtain this result. The transcripts retain build/toolchain warnings; successful compilation is not device acceptance.

For later execution on an available configured device, use `fvm flutter run --no-pub --target lib/ai_conversation_harness.dart -d <available-device-id>`. This is a reproduction instruction, not a recorded device run.

Retained correction history: the initial controller run was 25/26; its fake-clock/auto-dispose timing needed a 1 ms advance. Peer review identified five race/protection gaps, corrected with the 17 recovery regressions. The same-key Auth composer-draft regression brings the page suite to 23. Initial harness tests exposed old-page disposal closing a replacement controller, now guarded by session identity, and needed a frame after input and scrolling to the lazily built Delete control; the final ten pass. A transient concurrent-development compile attempt preceded the matching session-key-aware `detach` signature. The initial wire test hit a shared Flutter cache collision before execution; a component run used `--no-track-widget-creation`, while the final full suite passed with ordinary tracking. Ten controller style infos were fixed before final clean analysis. Earlier component checkpoints and failed attempts do not replace the final 418-test run; none is presented as an independent review result.

## Remaining gates and delivery targets

| Item | Status / responsible path |
| --- | --- |
| F01 actual write linearization/fences, cross-operation/restart pending effects and final N02 physical inventory | **Blocked for dependent implementation** — ZHOU resolution → JIN → LI |
| F03 real coherent context/authority view and producer invalidation; complete source discovery/offline/interrupted cleanup | **Blocked for real adapters/cleanup** — ZHOU with LI/DU → JIN → LI |
| Permanent-unknown exit/next actions | **Blocked** — selected safe unknown remains; no force resend, new receipt or fabricated recovery |
| Real Backend/store/context/model, NC04–NC09, full Android Conversation persistence/Cancel/Delete | **Not Run; dependent work held** — synthetic client checks do not satisfy these gates |
| M27 production content, live model/host/tokenizer, ordinary/runtime enablement and Recommendation explanation | **Not selected by #83** — E01–E04 and existing release obligations remain |
| New-source JIN review, LI bounded acceptance, #87 composition and changed-tree combined gate | **Pending** — owner verification, review, acceptance and integration are separate outcomes |

Deliver one focused **Draft** code/tests/evidence packet. JIN reviews this new ZHOU code; LI accepts within scope. SHI reviews JIN-authored composition and LI reviews JIN-authored gate evidence. No merge, ordinary enablement, Sprint/UAT/Release/Done or complete M26 approval is claimed.

[#83](https://github.com/3427564237/enmori-app/issues/83) targets **20:30 SGT** first runnable packet, **22:00 SGT** reviewed integration contribution and **23:59 SGT on 12 October 2026** bounded delivery/required acceptance. Owner validation at about 18:30 is the observed checkpoint; publication/review/acceptance must use their actual subsequent timestamps. These targets are not achieved-review claims or an extension of the original 11 October Sprint date.
