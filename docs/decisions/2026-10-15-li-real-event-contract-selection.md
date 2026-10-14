# LI confirmed real Event browse/Detail contract selection

- Source ID: **S-PM-1015-LI-REAL-EVENT-CONTRACT**.
- Authority: human LI HOURUI / ENMORI PM.
- Date: 2026-10-15 (Asia/Singapore).
- Confirmed human answer: **"批准 EB01–EB06，EB07先仅复制链接（推荐）"**.
- Status: confirmed PM interface/implementation-scope selection; independent technical review and actual provider/runtime acceptance remain separate.

## Exact selected sources and supersession

This adopts EB01–EB06 of SHI's [#109 candidate at exact718da39440a6a3d67cce5ad9a3efbbb7f5acbc40](https://github.com/3427564237/enmori-app/blob/718da39440a6a3d67cce5ad9a3efbbb7f5acbc40/docs/planning/2026-10-15-shi-real-event-browse-contract-candidate.md), with EB07 limited to **copying the validated source URL**. The selected candidate's source validation, first-batch/missing-field UI text, failure/privacy boundaries and ownership apply to these rows. The external-browser option is not selected. No later candidate change is automatically approved.

The human selected the recommendation in [LI's concrete preview](https://github.com/3427564237/enmori-app/blob/e850b04b0c05194d1868018219da03e05dfdf13d/docs/planning/2026-10-15-li-real-event-contract-selection-preview.md), which explicitly retained real content/link activation until permitted use and review. This resolves only that preview's **human row-selection Pending** state and the interface choices left undecided by [S-PM-1014-LI-REAL-EVENT-BROWSE](2026-10-14-li-real-event-browse-direction.md). Preserve those earlier sources, historical Not Run findings and the [bounded size3 API evidence](../evidence/sprint3/2026-10-14-li-ticketmaster-bounded-api.md).

## Confirmed rows

| Row | Selected scope |
| --- | --- |
| EB01 | Home `Browse activities` entry, Flutter `/activities` list and `/activities/:browseId` Detail. Existing Home Top2 and `/events` recommendation See All retain their current semantics. SHI owns pages; LI shared entry/router. |
| EB02 | Protected `GET /v1/event-browse` and `GET /v1/event-browse/{browseId}`, verified current Firebase identity and completed onboarding before provider access; no request body/query or caller-selected provider settings/key. Existing Event/recommendation API contracts remain unchanged. |
| EB03 | Server-owned SG upcoming non-test known-date first batch20/page0/date ascending; one provider request per list or Detail, no implicit retry/pagination/overfetch. Upstream timeout10s and raw response ceiling1MiB. Source failure is a safe dependency failure, never a false empty success. |
| EB04 | Separate strict `tm_` plus canonical unpadded base64url UTF-8 occurrence locator; source ID `[A-Za-z0-9_-]{1,128}`, public length5–174. Strict decode/re-encode and returned Detail ID equality; no normalization/title collapse, persisted binding or recommendation/participation identity inference. |
| EB05 | List `{asOf,scope:"ticketmaster_sg_first_batch_v1",items:[{browseId,title,startAt,endAt?}]}`; Detail `{browseId,title,startAt,externalSourceUrl,endAt?,locationLabel?,categoryLabel?}`. Plain source attribution and visibly missing optional information as specified; no description/image/price/participant/raw-total projection. |
| EB06 | Request-only source reads, no Firestore/cache/import/job/index. Mobile memory cleared on logout/disposal/background, visible maximum age5min then clear/explicit Reload. Process-owned enable/disable and the selected removal/privacy responsibility apply; no new public Admin API or proven SLA. |
| EB07 | Copy validated returned source URL only. No external-browser launch, WebView, automatic opening, callback token, purchase or registration/Going completion claim. Implementation remains behind the provider-use activation gate. |

Apply the exact candidate's strict SG/future/onsale/uncertainty filtering, scalar/control/markup limits, explicit-offset-to-UTC-Z nanosecond-safe time normalization, valid optional `endAt > startAt`, exact allowed HTTPS host/URL policy, omission/missing-field display and existing safe ErrorEnvelope/status mapping. Invalid source information is excluded or unavailable according to that selected contract; no source fact or missing end is invented. Unknown authority or new ambiguity is reported within its affected behavior.

Keep all responses `Cache-Control:no-store` and credentials/raw provider errors/URLs/content out of public logs. Auth/onboarding refusal produces zero provider calls. Flutter accesses product content through Backend.

## Release and ownership boundary

The **PM contract-choice blocker is resolved** for these exact rows. ZHOU's independent technical review of #109 remains required under the selected packet; SHI does not self-approve it. The decision does not add a new repeated component review or hold unrelated already-approved work. Once the applicable technical review is clear, implement and verify the smallest selected slice on isolated synthetic fixtures; no new dependency, unselected endpoint/field/storage value or writer override follows.

SHI supplies feature-local Event Ports/adapters/pages/tests and a normative fragment. JIN retains sole-writer shared Backend Bootstrap/OpenAPI/route-inventory integration. LI wires shared Home/router after receiving SHI's concrete page/repository constructor handoff; DU independently reviews LI's new shared delta. Existing AI source review/restart defects do not turn this into a blanket Event contract hold.

Actual API first-batch validation, applicable minimal display/link use, required notices/privacy/removal readiness, controlled Backend/device integration and peer acceptance are still separately evidenced. The human's answer does not confirm provider permission or authorize bypassing it. Copying, displaying and opening real links remain unavailable until applicable rights are established; copying is not a permission workaround. The [provider clarification draft](../planning/2026-10-15-li-ticketmaster-use-clarification-draft.md) remains unsent. No key is requested again.

M02/category-to-Interest mapping, participation/Interested/Going/people, external-registration completion, pagination, catalogue ingestion and Home/See All recommendation changes are outside this selection. Missing-end activities remain excluded from existing recommendations. No main merge, Issue closure, Project promotion, ordinary/runtime/provider enablement or Event/Sprint/UAT/Release/Done acceptance is inferred.
