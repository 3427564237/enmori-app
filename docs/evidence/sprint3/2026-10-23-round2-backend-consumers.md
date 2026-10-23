# Round 2 Backend consumer check

Base: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`; branch `souma/product-round2-backend-20261023`.
Authority: [round-two scope](../../decisions/2026-10-23-li-product-round2.md), existing [core product rules](../../decisions/2026-10-19-li-core-feature-delivery.md), [participation contract](../../../api/event-participation-contract.md), and unchanged AI ownership/lifecycle contracts.

**Result:** all four named consumers can use existing approved interfaces. No new endpoint, field, index, migration, permission, data purpose, dependency or runtime change is required. This is a consumer compatibility and regression package, not a new Backend product feature. The previous startup-lock and calendar-index repairs are already in the baseline and are not counted again.

| Confirmed consumer | Existing boundary and integration requirement | Status |
| --- | --- | --- |
| App Home private Today preview → saved detail → edit/delete → return | `GET /v1/me/check-ins?date&timeZone` derives owner from verified identity. Civil-day `[start,end)` uses the requested IANA zone, including DST. Newest-first pages contain at most 20 items; a three-item preview is not a total count. Cursors are owner/date/zone-bound and expire after 15 minutes. Explicit return/read fetches current facts; rejected optional processing consent does not disable owner reading. | Existing; confirmed with App; exercised |
| Journal saved record → new editable draft → explicit save → independent detail | Owner-only `GET /v1/check-ins/{id}` must succeed before copying Note/Mood/Activity into the current session's draft. The ordinary create uses a new draft idempotency key, server-generated ID/time, and current settings/explicit visibility. Do not copy the old ID/time/visibility/place label/GPS/weather. The existing account-scoped 24-hour idempotency behavior applies; unknown results use the same new draft key. Client session guards must discard late source replies. No persisted template or source-reference field is introduced. | Existing; confirmed with Journal; exercised |
| Social Compare plans → visible other-user page + own participation → existing detail mutation → reread | Other-user pages expose only eventId/status. Each cursor request rechecks current visibility, eligibility, friendship and block state; access loss is an unavailable error, not an empty plan list. A 20-raw-record window may return a sparse/empty page with continuation; no scan-to-fill or inferred total. Cursor scope includes viewer/target. Own reads retain saved facts when the source is offline; source failures do not become `none`. Existing revision updates and unknown-result readback remain. | Existing; confirmed with Social; exercised |
| AI current-conversation text lookup → manually load older messages → return to same conversation | Existing message pages contain at most 20 messages in ascending sequence, with `nextBefore` identifying the oldest sequence for the next older page. Only currently available text may match; unavailable/tombstone replacements must remove old hits. Parent conversation listing requires purpose permission; ordinary owned-message management reads are distinct from permission to generate. Errors cannot be treated as exhaustion or an empty successful page. Search remains client RAM only and adds no model/server input, offline index or operation retry. | Existing; confirmed with AI; existing checks reused |

## Added regression coverage

`backend/test/check-ins/product-consumer-readback.test.ts` composes the actual create/get/edit/history applications and repositories over a synthetic in-memory datastore. It follows Journal's explicit new-key save into App's Today readback: new ID/time, independent current visibility, no copied location/weather, no weather call, same-key replay, edit/revision conflict, delete, unchanged original, civil-day boundaries and a second owner's isolation. The history query is a handwritten fake; it is not evidence of a real Firestore query or index.

`backend/test/event-participation.test.ts` adds the Compare plans case: sparse other-user pagination, wrong-viewer cursor rejection, privacy withdrawal denying both first and continuation pages, and unchanged own participation reads without querying an offline source.

## Verification

One strict build with the existing Node **24.19.0** and pinned TypeScript dependencies passed; build output stays in this checkout. One focused batch passed **112/112** across these compiled test files:

- `check-ins/product-consumer-readback.test.js`
- `check-ins/check-in-history.test.js`
- `check-ins/history-projection-transport.test.js`
- `event-participation.test.js`
- `ai-conversation/application-conversation-operations.test.js`
- `ai-conversation/conversation-history.test.js`
- `ai-conversation/transport.test.js`
- `ai-conversation/sourced-pair-cancellation.test.js`

Commands: `node node_modules/typescript/bin/tsc --project backend/tsconfig.json`; `node --test` with the eight paths above under `backend/dist/test/`; `git diff --check` passed. The batch includes two new consumer regressions and reuses existing authentication, serialization, cursor, tombstone and cancellation checks. No network service or model was called.

No confirmed server gap was found in these selected paths. No service source or normative API changed. Firebase/Emulator, shared-runtime startup, provider/model quality, signed APK and physical-device behavior were **not run** here. The preserved 58-probe AI relevance failure and intermittent initial Settings-read incident remain unresolved. Integration can take the test/document commit without deployment or client wiring; it retains responsibility for the new UI flows and composed candidate verification.
