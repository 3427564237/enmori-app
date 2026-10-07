# LI history physical contract — option A approved

- Source ID: S-PM-1007-LI-HISTORY-PHYSICAL-A.
- Decision maker: LI HOURUI, PM; 7 October 2026, Asia/Singapore.
- Human confirmation: LI answered `a` to the revised history physical-contract A/B/C packet pinned at `f996d7fce5d8ecf1caff65441c832e1d86bff091`. This is the final physical-contract selection for #59, separate from the earlier H1–H7/My Friends A decision.
- Exact approved DU source: #59 `f075c0f11dc50ce58e4116d53d794fa53f4f26d4`, base `ba94368b655c1d8885093ff1cf2a38c65400b8c2`; [LI independent technical Approval](https://github.com/3427564237/enmori-app/pull/59#pullrequestreview-5441004323), R1/R2 resolved.
- Source trail: [original physical-choice preview](../planning/2026-10-07-li-history-physical-decision-preview.md), [re-review evidence](../evidence/sprint3/2026-10-07-li-du-history-physical-rereview.md), and [confirmed H1–H7](2026-10-07-li-next-read-option-a.md). Preserve the old proposed/Pending text and earlier findings as history.

## Approved physical contract


[DU's pinned 219-line candidate](https://github.com/3427564237/enmori-app/blob/f075c0f11dc50ce58e4116d53d794fa53f4f26d4/docs/planning/2026-10-07-du-history-physical-contract-proposal.md) is the exact approved contract. LI has resolved R1/R2 in independent proposal review; all product checks remain Not Run; independent review is not runtime evidence.

| Choice covered | Exact bounded candidate |
| --- | --- |
| HTTP | `GET /v1/me/check-ins`, exactly one civil `date` and IANA `timeZone`, optional opaque `cursor`; no client owner/range/page size/filters; current verified owner/onboarding |
| DTO/purpose | `{checkIns:[{checkInId,note,createdAt,checkInVisibility?}],nextCursor:string|null}`; 0–20 records; stored optional visibility only, legacy omission; no Friend/AI/other-purpose reuse; no-store responses and existing safe error codes |
| Civil date/dependency | Backend-only exact `@js-temporal/polyfill@0.5.1`; fixed `YYYY-MM-DDTHH:mm:ss.sssZ` storage/bounds/cursor; first valid civil-day boundary, midnight/DST/skipped-date and terminal-year rules exactly in the pinned source; no handwritten 24-hour fallback |
| Query/index | Owner equality and canonical UTC range, descending createdAt/document-ID tie-break, 21-row lookahead, at most two current-authority plus 21 Check-in documents per attempt; feature-local query port; collection composite index semantics `ownerAccountId ASC`, `createdAt DESC`, descending document-name order (implicit representation allowed only if equivalent and verified) |
| Cursor/key | AES-256-GCM encrypted owner/date/zone/range/last tuple, random 96-bit nonce, first-page-anchored 15-minute expiry; one 32-byte Node CSPRNG process-memory key at startup; restart invalidates outstanding cursors and prompts fresh-page recovery; single Backend process only, no stored key/session/secret service or new crypto dependency |
| Validation/concurrency | Authentication first; local query/cursor validation before repository; then current binding/account, cursor-state comparison, then Check-in query. Wrong-owner/query cursor can read required authority only, zero Check-in reads/query. Fresh independent pages; clear stale client state and preserve current-source/legacy/bad-data rules |
| Verification/ownership | DU implementation/evidence, LI independent review; Backend contract and actual Auth/Firestore Emulator, Flutter and actual Android evidence per source. No new general framework, copied history, edit/delete operation, migration or unlisted dependency. New physical deltas still require their own scoped decision |

## Approved first audit and implementation boundary


LI approves the above physical choices and **first target only the existing isolated Firebase Auth/Firestore Emulator synthetic population**, using the already configured `demo-enmori-rmvp01a-r10` test project. This explicitly narrows the candidate's initial audit/execution target; it does not claim synthetic records are compatible evidence for other datasets.

- DU identifies the exact synthetic dataset and performs a complete, read-only, paged `createdAt` compatibility audit there before implementation. Report only aggregate format/type/year counts and coverage; no Notes, IDs, paths, cursors or raw records. Use the existing resettable isolated fixture harness; no live-data import. Keep synthetic data isolated and clean it after verification.
- If every in-scope value is compatible, implement and validate only that isolated slice. If incompatible, stop the affected string-query work and submit one smallest compatible alternative; do not normalize, migrate or introduce a timestamp field silently.
- This audit permission includes no real-user or controlled-demo datastore access. Before enabling against any such environment, obtain the exact named-target audit/access decision, complete compatibility evidence and actual compound-index availability/query proof. Until then real-runtime promotion is blocked, even when Emulator/device evidence passes.
- Emulator executes valid queries without tracking compound indexes; Emulator evidence cannot prove real index deployment/missing-index behavior. Keep that check separately Not Run under the [official Firebase limitation](https://firebase.google.com/docs/emulator-suite/connect_firestore#how_the_cloud_firestore_emulator_differs_from_production). No index deployment or live-data request is part of this batch.
- This selects no additional Flutter package, migration, host/runtime topology, credential or deployment choice. Existing approved Android/Flutter contracts apply; propose only a necessary unlisted physical/dependency delta if one is actually needed. Do not replace device IANA-zone behavior with a guessed abbreviation or fixed zone.

## Authorized archive and focused handoff

Archive document-only #59 through normal merge after action-time head/review/main/remaining-diff checks. Approved head is only `f075c0f11dc50ce58e4116d53d794fa53f4f26d4`; the rehearsed merge into current `ba94368b655c1d8885093ff1cf2a38c65400b8c2` has tree `dcc0a7bd1e887aa7ec5ac98e8d49576170901b64` and adds only the proposal. Preserve the source branch; use no admin/force/protection bypass. Stop if a material head/base/tree change invalidates the reviewed archive.

Publish this controlling source, actual archive receipt and DU's next steps on the existing #59/#44 surfaces. DU owns the complete isolated timestamp audit; only after that passes may DU implement the approved feature-local Backend/OpenAPI/index-source/Flutter increment and required isolated/device verification, then submit one exact-head diff/evidence packet to LI for independent implementation review. Do not claim implementation Ready before the compatibility gate, and do not repeat PM approval of unchanged choices or prior kickoff review. If a necessary unlisted dependency/contract change appears, return only that concrete delta; incompatible legacy data does not authorize migration.

Generating a new process-local cursor key is part of the approved runtime lifecycle; no external secret provisioning is needed. A process restart invalidates cursors and requires first-page recovery; multi-process use is unapproved. Existing required backend isolation/privacy/failure boundaries remain binding.

This approves index source semantics and isolated query validation, not real index deployment, data access, runtime promotion or hosting changes. #48 stays Closed/preparation Done, #44 Open/Backlog; the 42-route/38-state target and 11 October feasibility/scope negotiation remain. Every new audit/Backend/Emulator/Flutter/Android/real-index result starts Not Run. Existing My Friends/Event/Persona gates, full-module/Sprint/UAT/Release and provider/account enablement remain separate.
