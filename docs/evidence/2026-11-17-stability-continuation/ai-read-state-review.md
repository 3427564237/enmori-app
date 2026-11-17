# SC-12: read-state requests before a new topic is established

Reviewed 17 November 2026 SGT. Starting source:
`5bf281e6807eb69a5b08480f9c9e6a95b4044f95`.

Status: **client defect reproduced and minimally repaired; historical phone
incident attribution and final-package acceptance remain open.** No AI model,
remote service, device, grant, backend, dependency or product data was changed
by this work. All new execution evidence is offline Flutter widget/provider
work using synthetic repositories, not a server or phone test.

## Authority and original observation

The [continuation decision](../../decisions/2026-11-17-li-stable-candidate-continuation.md)
extends the [bounded client repair authority](../../decisions/2026-11-17-li-stable-candidate-followup.md).
The [approved companion first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md)
retains separate source/read metadata, current-owner authorization, unknown
read-state recovery by GET, actual proactive visibility before read marking,
and no automatic replay of a chat request. The source-use/unknown protections
in the [interaction specification](../../design/ai-companion-20261025/interaction-spec.md)
and the normative [read-state endpoint](../../../api/openapi.json) remain intact.

The [original SC-12 entry](../2026-11-17-stable-candidate/README.md) and
[phone record](../2026-11-17-stable-candidate/physical-acceptance.md) retain these
separate observations: v81 showed a source/reading-state warning while the first
send was pending, then beside a saved pair; explicit Check reading status
recovered. On v82 a saved pair and that warning were visible on re-entry, then
later existing reads cleared it. The captures contain no correlated HTTP or
persistence-stage trace. Repeated display is not proof of repeated failed calls.

## Deterministic mechanism

1. `AiConversationController._run` assigns the prepared ticket's conversation ID
   before dispatching `execute`. Its existing `_memory.established` is still
   false for a new reserved topic. The ID identifies the pending operation; it
   does not itself prove that a conversation was persisted.
2. `AiConversationPage` previously scheduled `checkReadState()` whenever that ID
   changed. The sidecar controller admitted the request on an authenticated,
   current, foreground topic ID without checking whether it was established.
3. The existing backend `FirestoreFirstFlowStore.readState` first calls
   `readableSequence(id, 0)`. `FirestoreConversationStore` requires an existing
   conversation inventory and refuses an absent topic. A GET that reaches this
   boundary before the first commit can therefore legitimately fail.
4. The independent failure is retained in `AiOwnedSourcesState.failure`. A later
   successful execute establishes the topic and merges the saved pair, but does
   not change the ID again. The old ID-only listener therefore did not obtain
   current read-state on this transition. A saved pair can coexist with that
   earlier warning until another read-state check.

This is a concrete client timing defect compatible with the observed symptom.
It does **not** establish that v81/v82 encountered this precise server ordering:
transport, token, source and other read failures remain possible in those
untraced historical requests. In particular, successful message persistence is
not evidence that a separate read-state request succeeded.

## Reproduction and minimal change

The new [permanent test](../../../test/features/ai_conversation/ai_reserved_topic_read_state_test.dart)
mounts the real page and controllers, returns a prepared ID, and holds execute
completion. Its fake read-state boundary refuses an unpersisted topic; after a
saved reply is supplied it can return a current read-state. The two initial
regressions failed on the starting production source: one premature read was
observed where zero were expected, and the independent failure remained after
the saved pair where a current successful read was expected. Both passed after
the change.

Production change: 15 added lines and 2 removed lines across four Dart files.

- `AiConversationState.conversationEstablished` exposes only the existing
  `_memory.established` value through the normal state snapshot. None of the
  places that establish or retire a topic was changed.
- `AiOwnedSourcesController.checkReadState` also requires that value. This
  protects direct calls, re-entry and queued callbacks, not just the button.
- The reading-status action is offered for established topics. The existing
  automatic check observes ID changes and the transition to established, so the
  first confirmed topic gets one ordinary GET instead of a premature one.

This does not globally suppress reads while generating: an already established
conversation retains its status during a new send and a History read. Unknown
execute results still use the original operation readback; confirmed user-only
or assistant-pair persistence can establish the topic, while no-effect cannot.
Real read failure is still shown and explicitly recoverable. Source-body hiding,
actual-visibility marking, unknown PUT fencing, permissions/session/foreground
checks, model dispatch, automatic operation-recovery limits, timeout values,
backend DTOs and data rules were not changed. There is no new retry loop.

## Offline regression result

Final command: `fvm flutter test --no-pub test/features/ai_conversation --concurrency=2 --reporter expanded`.
Result: **393 passed**, including **9 new tests**, approximately 40 seconds.
`fvm flutter analyze --no-pub lib/features/ai_conversation test/features/ai_conversation`
reported **No issues found** in 8.0 seconds. Existing hand-built state fixtures
were not changed merely to satisfy the new flag.

The nine new tests cover:

1. No early GET, warning or Check reading status action for a reserved new topic,
   including a direct controller call while execute is held.
2. The saved pair triggers one current read; no extra read appears after a
   30-second test-clock advance and no model request is replayed.
3. A known topic remains established during History loading and a later execute;
   read-state can still be checked while those operations are pending.
4. A real post-save read failure remains visible without a loop; an explicit
   button GET clears it, with prepare/execute counts unchanged.
5. Unknown send followed by no-effect readback performs no read-state GET.
6. Unknown send followed by confirmed user-only persistence performs one GET.
7. Unknown send followed by a confirmed saved pair performs one GET.
8. Same-UID session replacement discards a late old read failure.
9. A queued first-establishment check cannot read a newly reserved, different
   topic before that topic is established.

The existing suite also retains unknown read PUT/revision recovery, exact-source
read authorization, source invalidation, saved-source body readback, navigation,
draft and same-session send recovery coverage. Passing fake calls does not prove
live service availability, request latency or actual model behavior.

Test history is preserved rather than hidden. The first expanded eight-case run
had seven passes and one fixture failure: a real warning existed in controller
state, but the lazy ListView had not mounted the warning widget when asserted.
The fixture was scrolled to the actual reading-status section; production was
unchanged and all eight passed. The final nine-case fixture also starts new
conversation tests without selecting old History, uses a different reserved ID
for the queued-switch case, and avoids inventing duplicate message sequences in
the existing-topic pending case. All 393 tests were rerun after those refinements.

## Receipts and limits

Private logs remain under
`/home/miku/.local/state/enmori-stable-continuation-20261117/`; only sanitized
hashes are recorded here. No private screenshot, account content or payload was
copied into the repository.

| Private log | SHA-256 |
| --- | --- |
| `ai-read-state-before.log` — original two failures | `a66552f26a386cd17fd4bc215be8c1c84181a78e0d08df71b8c979cca0219131` |
| `ai-read-state-after.log` — initial two passes | `2a7fb398d377e1151ac99266dc33b23d155aeccf991ef53eb7e17b0a07524c22` |
| `ai-read-state-boundaries.log` — seven passes / lazy-view fixture failure | `8e8618809f91231284a058aabec3fb9f7df6aeb39a6f90494487451995718229` |
| `ai-read-state-boundaries-final.log` — eight passes | `380ee0397efeb74a5f7f0df21145b044659274162513d0b26b89c7d54da128fb` |
| `ai-read-state-regression-final.log` — final 393 passes | `715e5be78eca50c088befcc8f1762a33310774a92324e431f30f5e6bee0c4042` |
| `ai-read-state-analyze.log` | `dea217205e8c81a56907e62c6ebcc8f7ad62e7bee695d546c88630c6f8de1efb` |

| Final changed source/test | SHA-256 |
| --- | --- |
| `ai_conversation_providers.dart` | `cb595faf795adae30d8c2cbbb939dd37ee3bb5bb2ec8010a078f31e10f5b85a4` |
| `ai_owned_sources_providers.dart` | `2d36c3e4863522ded5169a884b8f713be20aa4ceaf4b760aad4c05447980592b` |
| `presentation/ai_conversation_page.dart` | `f809d6e9c49a557f7ca4156d2dbfbe553203475d8b44112c969789ebc6175ce4` |
| `presentation/ai_conversation_state.dart` | `83711c86a2bf9ca8cada6ae3d578aabe6b5a898de38c51e26cc5bda651bf2196` |
| `ai_reserved_topic_read_state_test.dart` | `e520f453a37562d2326733658e4bb4f7837c7e083d3e61c43d5e6e10bd7cb150` |
| `ai_reference_test_support.dart` | `dfdc06e18ed79c8102ed5480168a00ccf53664fefdf504189fb67881dadab50f` |

Independent Flutter/UI review checked the four production changes, the nine
new tests and the final shared fake. It found no blocking issue: the fake's
existing defaults remain intact, the new-topic cases do not inherit an old
History selection, and queued checks/session retirement retain their guards.
The reviewer independently checked the final 393-pass log, clean analyzer and
source/test/support hashes. No additional production change followed review.

The source/test changes are frozen for root's combined regression and candidate
packaging. Final APK/emulator or physical-phone acceptance of this change has
not been performed here. AI funding renewal remains deferred; no live-send
acceptance is claimed. The initial historical SC-12 causal gap remains separate
from closure of this deterministic client defect.
