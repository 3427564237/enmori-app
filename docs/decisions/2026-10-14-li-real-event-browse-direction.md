# LI real Event list and Detail direction

- Source ID: S-PM-1014-LI-REAL-EVENT-BROWSE.
- Authority: human LI HOURUI / ENMORI PM.
- Date: 2026-10-14 (SGT).
- Confirmed human answer: **"先接真实列表和详情，保留现有推荐规则（推荐）"**.
- Scope: the next real Event delivery direction and its contract preparation; the question explicitly retained the concrete interface proposal for human review.

## Confirmed behavior and retained sources

Progress with a real activity list and Detail path, including source-backed activities whose end time is unavailable. Show the missing end information explicitly, rather than infer a duration. Preserve all existing Home/See All recommendation eligibility, ranking, filtering and response/record contracts. In particular, missing-end activities remain outside those recommendations.

This resolves the direction choice posed after the [actual bounded Ticketmaster SG evidence](../evidence/sprint3/2026-10-14-li-ticketmaster-bounded-api.md): authentication succeeded, the query reported 83 matches, and the three inspected occurrences plus one corresponding Detail lacked a parseable end timestamp. The observation is not a conclusion about all 83 results.

Retain [S-PM-0925-S3EVENT-CRITERIA](2026-09-25-sprint3-event-source-criteria.md), [S-PM-0915-S2EVENT-MAPPING](2026-09-15-sprint2-event-contract-mapping.md), and [S-PM-1014-LI-REAL-RUNTIME-CONTENT](2026-10-14-li-real-runtime-deployment-and-content-direction.md). This prospectively selects real list/Detail preparation instead of the earlier synthetic-only next increment; completed synthetic work and its evidence remain historical and labelled until replaced. It does not supersede recommendation requirements, provider obligations or source-backed minimum-field validation.

## Concrete interface packet to prepare

SHI owns the Event producer/list/Detail proposal and implementation; ZHOU independently reviews it. LI retains shared Home/router composition. Prepare one focused packet covering:

1. Where the real list is reached and how selecting an activity reaches Detail. The current `/events` Flutter route is See All recommendations; do not silently redefine it as provider browsing. At this documentation source, `api/openapi.json` has recommendation and Detail reads, but no real browse-list read.
2. The smallest Backend list contract, trusted Auth/onboarding boundary, allowed presentation fields, bounded retrieval/pagination policy and stable failure/empty behavior. Flutter accesses the provider through Backend; the API key remains server-side.
3. Occurrence identity/binding and Detail compatibility, including validated title/start/source URL, visible missing optional information, stale/removed/invalid-source behavior and source URL/attribution obligations.
4. Whether the first increment uses transient provider reads or an explicitly approved minimum stored projection, plus freshness and content-removal behavior. No collection, field, ID encoding, cache duration, scheduled job or index is selected by this direction.
5. Scope-appropriate verification: actual authorized provider field validation; list-to-Detail navigation; missing-end display and exclusion from existing recommendations; Auth/empty/dependency failures; secret and raw-response boundaries. Scripted/fake results remain separate from actual provider and Android evidence.

M02 category-to-Interest mapping remains separately unapproved. The browse/Detail packet need not activate it to deliver real activities. Participation/Going/Interested people, external-registration completion and shared Friend participation projections remain outside this selection.

The required product behavior is confirmed. Exact endpoint/DTO/storage/link/retention choices remain proposals until explicitly reviewed and approved; no implementation is authorized by inventing those choices. Existing approved work continues without a blanket blocker. No product code, API/schema, credential, fixture, Issue/Project state, merge or Sprint/UAT/Release claim changes in this decision receipt.
