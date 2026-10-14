# ZHOU mobile AI / Persona owner handoff — 14 October 2026

Authority: [14 October accelerated assignment](../../../decisions/2026-10-14-li-ai-acceleration-and-target.md), [delivery plan](../../../planning/2026-10-14-li-ai-accelerated-delivery-plan.md), the selected N01/N05/N06 contract, and [Remaining A / R-A](../../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md). This is local owner implementation and verification. LI independently reviews this new ZHOU delta; no formal review, acceptance, device execution, merge or ordinary enablement is claimed.

The final working-tree inputs are bound by [mobile-source-manifest.json](mobile-source-manifest.json). The manifest records the base HEAD and SHA-256/Git blob for each of the nine mobile source/test files; it does not claim the uncommitted working tree is an immutable published commit. Root's eventual source publication and combined checks supply that binding.

## Delivered delta

- `buildAiConversationPage` and `AiConversationPage` accept optional `VoidCallback? onOpenPersonas`. A labelled Manage Personas control is rendered only when composition supplies a destination. LI retains Home/router/navigation ownership; the AI feature imports no Persona Data/Presentation.
- Back, Settings and the Persona callback use the same synchronous controller `leave()` fence. Existing in-flight confirmation also covers pending history/deletion. Private unsent drafts use the existing Persona editor's “Discard unsaved changes?” / “Keep editing” / “Discard” copy. Confirmed navigation clears/unfocuses input before callback. A session replacement invalidates an old confirmation. Explicit R-A Leave without retrying retains its selected one-action exit and copy even while an outcome read is pending.
- `HttpAiWireTransport` implements the existing six-operation wire boundary with the existing locked `http` package. Composition supplies a root HTTPS base URI and caller-owned client. The explicit isolated constructor additionally permits only numeric local loopback HTTP, with no remote/Android alias inference. URI credentials/query/fragment/non-root bases and cross-origin request references are rejected. Redirects are disabled. UTF-8 request/body mapping, full-response settlement, request/body abort and late response-stream detachment preserve another request on the same client. There is no automatic retry, default provider composition or logging. Existing controller/token sources and time budgets remain.
- Separate opt-in `lib/ai_persona_harness.dart` composes the actual AI page/controller/wire mapper and existing Persona management/editor/session with synthetic Auth, scripted AI and a memory-only Persona fixture. Its persistent banner states “Synthetic AI and Persona fixtures — no real storage or model”; a second sentence explicitly says Persona controls do not prove AI request snapshots. Create/edit/select/activate/delete and return work through the existing pages. After return the user explicitly reloads saved fixture messages; no old request resumes or resends. This harness is separate from LI's shared offline shell.

## Actual owner verification

Pinned Flutter 3.47.2 / Dart 3.13.2. Commands were run on the manifest's local source; final captured outputs:

| Check | Result | Transcript |
| --- | --- | --- |
| `fvm flutter test --no-pub test/features/ai_conversation test/harness/ai_conversation_harness_test.dart test/harness/ai_persona_harness_test.dart --reporter expanded` | 175 / 175 Pass | [mobile-tests.txt](mobile-tests.txt) |
| Scoped `fvm flutter analyze --no-pub` for AI feature, new harness and corresponding tests | Pass, no issues | [mobile-analyze.txt](mobile-analyze.txt) |
| `fvm dart format --output=none --set-exit-if-changed` for the nine source/test inputs | Pass, zero changed | [mobile-format.txt](mobile-format.txt) |

The new tests exercise the optional callback and draft/pending guards, session replacement, Persona return/no resend, HTTP pre-dispatch/headers/body cancellation and parallel request isolation, actual numeric-loopback HTTP cancellation, strict full UTF-8 body handling, redirect failure and safe transport-error mapping. Four new widget journeys use the actual Persona pages for CRUD/activation, an unsent draft, active AI cancellation and same-UID replacement. Fixture CRUD does not validate real Persona Backend persistence or AI snapshot selection.

Correction history is retained honestly: the first new harness run was 3 / 4 Pass. Its save tap used an obsolete layout position after `ensureVisible`, outside the 800×600 test viewport. Pumping the scroll layout before tap fixed the helper; all four then passed and are included in the final 175. An initial analyzer run reported two incorrect fixture enum names (four diagnostics); they were replaced with existing approved failure kinds. Those first raw outputs were returned by the execution tool but were not persisted to transcript files; no reconstructed raw transcript is supplied. The final logs above are actual subsequent executions.

## Integration and remaining evidence

```dart
buildAiConversationPage(
  context,
  onBack: onBack,
  onOpenSettings: onOpenSettings,
  onOpenPersonas: onOpenPersonas, // optional; LI supplies the real destination
)
```

An unchanged caller may omit `onOpenPersonas`; the existing required callback signature remains compatible. An isolated app can inject `AiWireRepository(HttpAiWireTransport(...))` at `aiConversationRepositoryProvider` using its selected Backend address, owned HTTP client and existing Auth provider. This file does not provide a real token, endpoint, certificate, Firebase environment or enablement flag. The adapter's presence is not permission to connect ordinary data.

Root owns the APK build and whole-source test/evidence packet. Actual controlled Backend/store/context/fake-Qwen end-to-end persistence is still dependent on JIN's selected six-operation HTTP/storage composition and the real reader's producer facts. Physical Android installation, hardware Back/background, TalkBack/human accessibility and LI independent acceptance remain separate evidence. Synthetic tests do not satisfy those gates or the 15 October 23:59 overall target.
