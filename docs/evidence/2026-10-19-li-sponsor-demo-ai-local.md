# Sponsor demo AI local increment — 19 October 2026

Authority: `S-PM-1019-LI-SPONSOR-DEMO-LOCAL-TAKEOVER`, [local takeover decision](../decisions/2026-10-19-li-sponsor-demo-local-takeover.md). This is local code/test evidence. Real 9B/device/UAT/Release and whole-product acceptance remain Not Run here; parent owns final activation/APK verification.

## Behavior and integration seam

`open_conversation_v1` is independent from the unchanged default `bounded_routine_summary_v1` prompt, validator and corpus. Public output remains `ai_assistant_message_v1`. Operator selects the SAME strategy in `ControlledConversationPrompt(counter, "open_conversation_v1")`, controlled-service candidate gate and `createIsolatedConversationComposition({conversationStrategy:"open_conversation_v1", ...})`. No real runtime starts implicitly.

Existing canonical storage supplies the latest TWO complete pairs by assistant completion sequence/time, then excludes tombstones/source-invalid pairs without older backfill. An older U retried later is ordered by its eventual assistant completion. Unknown/corrupt/dependency reads fail rather than becoming empty history. Pair identities remain internal and history bytes are request-local. No public DTO, stored history snapshot, message field, token registry or log payload was added.

Current external Auth, purpose generation, live Conversation, exact canonical pair and historical provenance are rechecked before dispatch, and in the SAME actual content transaction. Source loss rejects the entire new assistant write. New assistant provenance unions current Notes and historical/transitive dependencies in the existing minimized source representation. More than 15 distinct required sources fails unavailable before generation; no ancestral dependency is dropped. Consent reject/regrant cannot reuse the old generation. New input plus current Notes, Persona and complete two-pair history enter the existing complete prompt token budget: 4096 passes, 4097 fails without truncation. Original deadlines, quarantine, cancellation, unknown-result reconciliation, retention and diagnostic rules remain.

New conversation changes only the local target after the previous operation result is determined. The next explicit send uses existing reserved-new preparation. It issues no deletion or resend, blocks pending/unknown outcomes, and preserves draft/selection/focus. Old stored messages keep their original retention. No historical conversation directory was added.

## Concrete semantic policy

The independent gate checks exact input/output shape/version, well-formed nonempty text, at most two complete pairs, projection freshness and candidate equality. Existing raw JSON/control/markup/URL/tool checks remain separate. Concrete whole-output rejection covers private/system-access and mutation claims, health diagnosis/treatment/crisis language, unsupported Event/recommendation claims, backend/schema/credential disclosure, and persistent/other-conversation memory claims. Numbers and quoted attributions require exact support in current/prior user messages or Notes; previous assistant claims alone do not establish user facts.

The versioned synthetic corpus in `backend/test/ai-conversation/open-conversation.test.ts` covers ordinary English/Chinese connected replies; prohibited/unsupported/ambiguous claims; changed/missing history; unknown reads; source revocation during generation; full-input token counting and role-control escaping. These conservative concrete checks can reject safe replies and cannot mathematically prove universal natural-language grounding. No second model, output repair, fixed reply or content fallback was introduced.

## Verification and prior failures

Pinned Node24.19.0, existing TypeScript/dependencies, Flutter3.47.2/Dart3.13.2. Existing caches reused with `flutter pub get --offline`; no lock/toolchain upgrade.

- Strict TypeScript build: pass.
- Full Backend unit/Port/transport/parser/legacy semantic suite: **992/992 pass**, including24 new open-policy/prompt/orchestration cases.
- Actual Auth/Firestore `real-conversation-store.integration.test.ts`: **25/25 pass**, including3 new history cases: latest-two/no-backfill/atomic stale-pair write refusal; historical Note deletion; older-U retry completion ordering. Fake Qwen remains explicit.
- AI Flutter controller/wire/session/recovery/widget suite: **194/194 pass**, including determined/unknown New conversation guards and both presentations' draft/selection/focus.
- `flutter analyze --no-pub`: no issues. `git diff --check`: pass.

Exact commands: pinned Node runs `node_modules/typescript/bin/tsc --project backend/tsconfig.json`, `--test 'backend/dist/test/**/*.test.js'`, and the adapter test file through the existing controlled-environment builder. Pinned Flutter runs `test --no-pub test/features/ai_conversation` and `analyze --no-pub`.

Actual adapter tests used exclusively owned temporary Auth19099/Firestore18080, hub14400/logging14500/websocket19150 on loopback, a separate generated credential profile and existing `buildControlledEmulatorTestEnvironment`. No other agent's Emulator data/ports were used. Tests verified exact owned fixture teardown, then the CLI stopped its Emulators.

Earlier failed verification remains historical: a new Flutter test helper initially omitted captured `conversationId`; it was corrected before the full194-case passing run. First Emulator launch collided on CLI default logging4500 and left its own Firestore child; that identified child was stopped and explicit hub/logging/websocket ports selected. A second launch before that own child exited reported its port in use. Subsequent isolated adapter runs passed24/24, then25/25 after retry-order coverage was added. No product success was inferred from these launcher failures.
