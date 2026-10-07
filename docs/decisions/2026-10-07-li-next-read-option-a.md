# LI next-read decision — option A confirmed

- Source ID: S-PM-1007-LI-NEXT-READ-A.
- Decision maker: LI HOURUI, PM; 7 October 2026, Asia/Singapore.
- Human confirmation: LI answered `a` to the concrete A/B/C packet linked at `fe1da7957493bfb154fb4fe9e8f3bf36de9471ef` after the PM closeout update. This confirms **A**, not an earlier approval batch.
- Source trail: [original decision preview](../planning/2026-10-07-li-next-read-decision-preview.md), DU #56 `d1ed3f0ab78c7af267b28988bfcbeff1453eafac`, SHI #57 `9850aa8ed5c655c018c006684c5a627d4f2a1cca`, and JIN #58 `2cdf7315a3f088a090f1e24a287bfc53506a0447`.
- Effect: H1–H7 product direction is confirmed; the exact F01–F05 isolated My Friends candidate is approved subject to SHI's independent exact-head preparation review and reconciliation; the Event gate/report boundary is retained. This replaces only those sources' proposal/Pending status for the named choices. Their old texts, prior requirements, preparation acceptance and review history remain available.

## Confirmed history direction, physical contract still pending


These settle the seven DU product questions while leaving DU to propose the exact normative route/DTO/cursor/query/index and any genuinely necessary dependency. No implementation starts merely because this direction is confirmed; the remaining physical choices need their exact scoped approval.

| Item | Proposed bounded choice |
|---|---|
| H1 — owner/date/time zone | Authenticated owner only, derived server-side through existing Auth/onboarding boundaries. Use the device's current IANA time zone captured on entering the date view; show that zone and use one zone consistently for selection and formatting. Switching zone/date resets paging and triggers a fresh read. No Account time-zone preference or migration. Treat a selected civil date as that date's local-day range converted to UTC; do not assume 24 hours across DST |
| H2 — existing projection | Reuse the already approved owner Check-in presentation fields: opaque `checkInId`, Note and UTC `createdAt`, plus the **stored optional** `checkInVisibility` snapshot. New records retain their saved value; legacy omission remains explicit; invalid saved values fail safely. No inferred Mood/Weather/Activity/location or current-Settings substitution. Existing individual read remains unchanged |
| H3 — deterministic order | Descending creation time, then descending opaque Check-in ID for an exact tie; no locale/name ranking. Keep UTC source time immutable. DU must demonstrate the chosen store/query order corresponds to this public order |
| H4 — bounded pages | Server-fixed maximum 20 records per page, continuation when more remain; no successful truncation represented as the complete date. Cursor is opaque and bound to owner/date/zone/query state. Each page is a fresh authorized read; do not promise a frozen multi-page snapshot or add stored pagination sessions. New/concurrent records can require Reload. Exact cursor encoding/validation and scan bounds remain in DU's physical proposal |
| H5 — current-source/deletion/cache | Every request/page honors current source and owner authority. Deleted/unavailable records never become a stale-cursor disclosure. Clear visible results on observed auth/account/permission change and invalidation; fresh reads on date/page/reload and return to the view; dependency failure is not empty success. No persistent history copy, deletion operation, realtime push or new retention policy. Optional AI processing-consent withdrawal does not automatically withdraw owner-only reading; purpose permissions remain separate |
| H6 — Calendar/Footprint | One owner-date read can serve their authorized common list/date purpose. First deliver the bounded Footprint date list and preserve selected-date handoff; this does not complete full Calendar/Footprint, add maps or cancel later display-permitted optional-field requirements. No Friend/AI reuse of this response; Q17 Friends Activity content prohibitions remain binding |
| H7 — owner/reviewer/physical approval | DU owns this frontend/Backend contract and later implementation; LI independently reviews it and confirms only needed shared router integration. Before changing OpenAPI/Firestore/query/index/dependencies, DU supplies one exact physical contract with safe errors, cursor/race/legacy/privacy cases and the required real Backend/Android evidence plan. No new architecture, general pagination framework or unapproved source/migration |

Retain C3–C6, RMVP R2 and the narrow saved-visibility amendment. The next list is a bounded incremental consumer of existing Note-only records, not a silent supersession of wider Check-in requirements. The physical approval is explicitly still required; no endpoint or new stored field is selected here.

## Approved isolated My Friends candidate, independent review still pending


Approve **F01–F05 as the exact isolated-only candidate in [JIN's pinned #58 proposal](https://github.com/3427564237/enmori-app/blob/2cdf7315a3f088a090f1e24a287bfc53506a0447/docs/planning/2026-10-07-jin-friend-next-contract-delta.md)**, subject to SHI's independent exact-head preparation review and any resulting reconciliation before implementation:

- Existing explicit synthetic eligibility/block sources, default-disabled activation; no real-user eligibility/backfill or real lifecycle decision.
- Only current eligible accepted friends with `public`/`friends_only` Profile visibility and an actual DisplayName; hide valid Private/unset-name/protected rows. No exact-lookup exception extended to this list, fallback name, avatar, public Profile action, Activity or recommendation consumer.
- The proposed `GET /v1/me/friends`, minimized response, feature-local initialized owner pointers, pair `listRefs`, atomic acceptance/fixture cleanup, random entry-reference cursor, independent pages and existing safe-error mapping exactly as documented. Scan at most 20 plus one lookahead; the claimed maximum 106 document reads is per transaction attempt and must be demonstrated in the Emulator, not assumed verified.
- The limited `/friends/list` surface, Reload/Next and non-actionable rows; filtered empty pages can continue and must not claim the whole friendship set is empty. No persistent cache or general shared model.
- Preserve all current request semantics/formulas and component/Android/gate reviews. New code/tests/results remain Not Run until actual implementation; this is not full `friends-page` or nine-route delivery.

Any material source change after `2cdf7315` requires reconciliation with the selected decision; no different candidate is silently approved.

PM approval and SHI independent review are distinct. At execution-time readback #58 has no review, stays Draft/Open and must not be represented as implementation Ready. Once SHI approves the same candidate and any findings are reconciled without a material contract change, JIN can implement the approved isolated slice; repeating LI's approval of unchanged F01–F05 is unnecessary. A material contract change must be presented as a specific delta. Router `/friends/list` and its proposed bounded entry/copy are included in F05; no additional Home or public-Profile handoff is approved.

## Retained Event evidence boundary


Accept #57 as researched **preparation** and endorse only its bounded evidence-report direction. Actual Ticketmaster Discovery use remains contingent on privately verified authorized access and applicable acquisition/display/storage/link rights; no credentials are sought or provider contacted here. After those gates are actually established, the proposed run is at most one Singapore search of three results plus one Detail request, no pagination/data write/import/deployment/new dependency, with sanitized field/identity/time/category/attribution findings and ZHOU review.

Neither mapping row M01/M02 is activated by this packet. Website categories/links are not API identities, and onePA/scraping is not an authorized fallback. The first real importer, stored projection, freshness/removal and external launch/participation still require their exact separate approval. Missing evidence remains a specific dependency; it does not block the two independent read proposals.

## Execution and status boundary

Publish this durable source and focused next steps on existing #44, #48 and #58. DU supplies one exact route/DTO/date-zone/cursor/query/index/error contract and evidence plan for LI's next physical-contract review; do not reopen the completed #48 kickoff or start unapproved history code. JIN/SHI complete the one pending #58 preparation review, then deliver the approved isolated code and evidence with JIN/SHI implementation review. No owner/reviewer substitution, repeated review of unchanged prior increments or general framework is requested.

All new product/API/Emulator/Android/provider execution checks are **Not Run**. #45–#49 remain preparation-only Done; #44 remains Open/Backlog. The 42-route/38-state target, 11 October Sprint feasibility and any eventual explicit scope negotiation remain unchanged. This does not approve real-account Friend enablement, provider rights/credentials, M01/M02 activation, full-module/Sprint acceptance, UAT or Release. Persona's existing next-proposal request remains separate.
