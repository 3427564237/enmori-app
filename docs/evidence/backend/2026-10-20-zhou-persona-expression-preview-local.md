# ZHOU Persona expression/preview local verification

Date: 2026-10-20, Asia/Shanghai. Package: `927f775`; execution source baseline is recorded in the parent handoff evidence. Contract: [full expression and draft preview](../../planning/2026-10-20-zhou-persona-expression-preview-contract.md). Author: ZHOU implementation scope. Required different-author review: LI. This is component evidence, not reviewer approval, device acceptance, Release readiness or an actual Ollama result.

## Environment and commands

Workspace: `D:\3851 AI\formal\enmori-zhou-experience-20261020`. Node.js `24.19.0`; existing locked TypeScript `7.0.2`, Fastify `5.12.1`, Firebase Admin `14.3.0`; no added dependencies or lockfile changes. Parent prepared a local `node_modules` junction whose source lockfile hash matches this bundle. No global pnpm version was substituted.

```powershell
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test backend/dist/test/personas/preview.test.js backend/dist/test/personas/full-expression.test.js backend/dist/test/ai-conversation/firebase-admin-real-context-reader.test.js
```

Result: strict compilation passed; **24 tests passed, 0 failed, 0 skipped**. Test source is a handwritten fake Port, in-memory transactional gateway, SDK-subset fixture or fake HTTP response; none of these represents a live model/Firestore execution.

## Observed component behavior

- All seven added fields persist/read verbatim; each field participates in same-key create conflicts. Edits, optimistic revisions, selection, deletion of the current Persona and default restoration retain the existing semantics.
- A legacy stored row without new fields reads all seven as empty without a write. Present malformed Unicode, non-string values, present `undefined`, and undeclared fields fail closed.
- Default readers emit the old four-field structured projection. The explicitly selected local reader copies every approved expression field through the prepared context, with empty Check-ins and no Note query. A later producer mutation cannot alter the copied request. The native local prompt receives the expression; no model tools are supplied.
- Preview reads only current UID binding and completed-account consent/revocation generation before/after generation. Fake gateway write/collection-query methods fail the test if called. Before/after storage is identical; there is no saved Persona, selection, conversation, message, Note or candidate access.
- Rejected/withdrawn consent, revoked identity, a changed owner, and withdrawal/reaccept generation changes never deliver a reply. Invalid draft/text and malformed model output fail safely. Model exceptions do not expose their private text.
- Disconnect and mocked 45-second generation timeout withdraw delivery. The original local transport remains busy until its original response settles; another preview receives `AI_BUSY`, late text is discarded, and the fake HTTP model call count remains one.
- Fastify injection verifies authentication before malformed body handling, exact request shape, forbidden identity/history/Persona-ID fields, query/operation/idempotency-key rejection, text validation, 16384-byte rejection with `REQUEST_TOO_LARGE`, exact `{message}` success, `no-store`, and preview OpenAPI schema agreement.

The wider affected regression command additionally covers existing Persona core/HTTP contracts, synchronous capture, real-context reader, async conversation application/executor, old bounded prompt/runtime, simple chat and OpenAPI inventory. The parent integration evidence records its final result after the independently implemented history-discovery contract is joined; transient inventory failures during concurrent editing are not reported as a final pass here.

## Actual Persona Auth/Firestore Emulator verification

After the component fixture run, the parent authorized the existing isolated actual persistence boundary. This section supersedes the earlier local-run “Emulator Not Run” status; it does not replace any model or phone gate.

```powershell
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node backend/scripts/run-persona-emulators.mjs
```

The restricted runner adapts the existing R10 CLI/worker environment builder. It verifies the pinned Node/CLI/Admin versions and cached Firestore `1.22.0` JAR SHA-256, uses the unchanged `firebase.json` and confirmed `demo-enmori-rmvp01a-r10` project, and gives both CLI and test worker disposable credential profiles with only the approved environment allowlist. It checks loopback ports 8080/9099/4400/4500/9150 immediately before launch and refuses an existing listener. It runs only `backend/dist/emulator-test/personas.integration.test.js`; no LI service, host, credential, Ollama process, import/export or unrelated suite is used.

Result: **29 tests passed, 0 failed, 0 skipped**, test duration 35.151 seconds; CLI exit 0. Observed Persona business transaction totals: 228 calls, 234 actual SDK attempts, 6 retried calls, maximum 9 logical gets per attempt, 0 business collection scans. Fixture installation, inspection and cleanup are outside those counts. Fresh synthetic users/owner partitions are drained and deleted by each test harness after use. The owned emulators shut down normally and all five checked ports were free afterward; no existing process was killed.

The strict actual suite fixture now contains the seven default fields and the new exact stored-key inventory. New populated-field tests verify all seven values through actual create, GET reread, same-key conflict for each changed field, effective edit, stale-version rejection, activation and current deletion. A real legacy document without these fields reads empty values without migration/writes; malformed stored free-field types fail closed. Existing actual Auth tests include absent/malformed/expired/disabled/revoked identity; existing real transaction tests cover races, pre-commit rollback, lost committed completion, owner isolation and capacity.

Synthetic-only local raw output is retained at `D:\3851 AI\artifacts\persona-emulator-20261020\run.log` (SHA-256 `5a155c1cc5c24c30430c6a31e451859c6181fb607dcdbcc3555518506e49340d`); `firestore-debug.log` is beside it. Raw runtime logs remain outside Git. Emulator SDK/CLI failures were not encountered in this run.

## Not Run

- Live Ollama responses, including three relevant conversational turns and live full-expression behavior: no controlled LI host/model available to this component task.
- Android device flows, visual acceptance and LI's final retained-runtime launch: owned by the combined package/device acceptance.

LI acceptance must cover preview absent from formal history, draft preview neither saving nor activating, full-field save/reread, fifth/sixth capacity, confirmed switching, confirmed active deletion restoring default, stale versions, unsaved navigation, two-account isolation and consent withdrawal. Use actual approved candidates only when checking recommendation explanations. Normal chat unknown outcomes must be read through the original operation result before any explicit retry.
