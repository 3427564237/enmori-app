# LI history physical-contract decision — revised #59

Status: **Proposed; awaiting explicit LI selection.** Source: DU #59 `f075c0f11dc50ce58e4116d53d794fa53f4f26d4`, base/main `ba94368b655c1d8885093ff1cf2a38c65400b8c2`. H1–H7 remain confirmed by [S-PM-1007-LI-NEXT-READ-A](../decisions/2026-10-07-li-next-read-option-a.md). This is a new physical-contract confirmation, not a repeat of that earlier A selection.

## Reviewed exact candidate

[DU's pinned 219-line candidate](https://github.com/3427564237/enmori-app/blob/f075c0f11dc50ce58e4116d53d794fa53f4f26d4/docs/planning/2026-10-07-du-history-physical-contract-proposal.md) is the exact contract to approve. LI has resolved R1/R2 in independent proposal review; all product checks remain Not Run.

| Choice covered | Exact bounded candidate |
| --- | --- |
| HTTP | `GET /v1/me/check-ins`, exactly one civil `date` and IANA `timeZone`, optional opaque `cursor`; no client owner/range/page size/filters; current verified owner/onboarding |
| DTO/purpose | `{checkIns:[{checkInId,note,createdAt,checkInVisibility?}],nextCursor:string|null}`; 0–20 records; stored optional visibility only, legacy omission; no Friend/AI/other-purpose reuse; no-store responses and existing safe error codes |
| Civil date/dependency | Backend-only exact `@js-temporal/polyfill@0.5.1`; fixed `YYYY-MM-DDTHH:mm:ss.sssZ` storage/bounds/cursor; first valid civil-day boundary, midnight/DST/skipped-date and terminal-year rules exactly in the pinned source; no handwritten 24-hour fallback |
| Query/index | Owner equality and canonical UTC range, descending createdAt/document-ID tie-break, 21-row lookahead, at most two current-authority plus 21 Check-in documents per attempt; feature-local query port; collection composite index semantics `ownerAccountId ASC`, `createdAt DESC`, descending document-name order (implicit representation allowed only if equivalent and verified) |
| Cursor/key | AES-256-GCM encrypted owner/date/zone/range/last tuple, random 96-bit nonce, first-page-anchored 15-minute expiry; one 32-byte Node CSPRNG process-memory key at startup; restart invalidates outstanding cursors and prompts fresh-page recovery; single Backend process only, no stored key/session/secret service or new crypto dependency |
| Validation/concurrency | Authentication first; local query/cursor validation before repository; then current binding/account, cursor-state comparison, then Check-in query. Wrong-owner/query cursor can read required authority only, zero Check-in reads/query. Fresh independent pages; clear stale client state and preserve current-source/legacy/bad-data rules |
| Verification/ownership | DU implementation/evidence, LI independent review; Backend contract and actual Auth/Firestore Emulator, Flutter and actual Android evidence per source. No new general framework, copied history, edit/delete operation, migration or unlisted dependency. New physical deltas still require their own scoped decision |

## Recommended first execution boundary

Approve the above physical choices but **first target only the existing isolated Firebase Auth/Firestore Emulator synthetic population**, using the already configured `demo-enmori-rmvp01a-r10` test project. This explicitly narrows the candidate's initial audit/execution target; it does not claim synthetic records are compatible evidence for other datasets.

- DU identifies the exact synthetic dataset and performs a complete, read-only, paged `createdAt` compatibility audit there before implementation. Report only aggregate format/type/year counts and coverage; no Notes, IDs, paths, cursors or raw records. Use the existing resettable isolated fixture harness; no live-data import. Keep synthetic data isolated and clean it after verification.
- If every in-scope value is compatible, implement and validate only that isolated slice. If incompatible, stop the affected string-query work and submit one smallest compatible alternative; do not normalize, migrate or introduce a timestamp field silently.
- This audit permission includes no real-user or controlled-demo datastore access. Before enabling against any such environment, obtain the exact named-target audit/access decision, complete compatibility evidence and actual compound-index availability/query proof. Until then real-runtime promotion is blocked, even when Emulator/device evidence passes.
- Emulator executes valid queries without tracking compound indexes; Emulator evidence cannot prove real index deployment/missing-index behavior. Keep that check separately Not Run under the [official Firebase limitation](https://firebase.google.com/docs/emulator-suite/connect_firestore#how_the_cloud_firestore_emulator_differs_from_production). No index deployment or live-data request is part of this batch.
- This selects no additional Flutter package, migration, host/runtime topology, credential or deployment choice. Existing approved Android/Flutter contracts apply; propose only a necessary unlisted physical/dependency delta if one is actually needed. Do not replace device IANA-zone behavior with a guessed abbreviation or fixed zone.

## Three choices

- **A — recommended:** approve the exact revised #59 physical contract plus the isolated audit/execution boundary above. Persist the selected decision; archive the reviewed document-only #59 by normal merge only while its exact head/review/main/tree remain verified; publish DU's focused implementation/evidence next steps. Implementation starts only after the complete isolated timestamp audit passes. Real/demo activation and index deployment remain unapproved.
- **B — approve contract, audit target first:** approve the same physical contract, but authorize no new dataset access or implementation yet. DU first returns the exact intended existing-data audit target, authorized access path and minimized audit procedure for LI confirmation; retain the proposal's before-implementation compatibility gate. Archive/publish only the confirmed contract; no audit or runtime execution follows automatically.
- **C — retain reviewed proposal:** keep the technical review complete and #59 Draft. Approve no physical choices, new data access, dependency/index change or implementation. Existing H1–H7 and #48 preparation acceptance remain intact.

A/B archiving is documentation only and preserves the source branch. The rehearsed merge of this unchanged head into current main has tree `dcc0a7bd1e887aa7ec5ac98e8d49576170901b64` and adds only the proposal. Re-read at action time; a material change requires reconciliation, not silent approval of a different candidate.

None of the choices reduces the 42-route/38-state Sprint target or establishes 11 October feasibility, full module/Sprint/UAT/Release acceptance, real provider/account enablement or completed Backend/Emulator/Android tests. #48 remains Closed/preparation Done; #44 remains Open/Backlog. My Friends/Event/Persona gates remain separate.
