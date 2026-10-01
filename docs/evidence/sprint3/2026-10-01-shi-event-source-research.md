# S3-03 Event source research — 1 October 2026

Owner: SHI ZHENGQI. Assignment: [Issue #47](https://github.com/3427564237/enmori-app/issues/47). Independent reviewer: ZHOU YAOYIN. Status: preparation evidence; provider selection, acquisition, storage and integration remain Pending.

The investigation used public, read-only pages and official documentation on 2026-10-01, Asia/Singapore. It made no authenticated provider API call, login, booking, import or product-data write. No authorized provider credential was supplied for this task. Raw pages, descriptions, images, provider JSON and copied catalogue records are not included here; this report records field-presence observations and source references.

## Controlling sources

- Sprint 3 kickoff: [#44](https://github.com/3427564237/enmori-app/issues/44) and #47; Ready applies to bounded preparation.
- Published planning source at PR #42 `479619e8d124f3342458506fc145dc4bfbe3f483`: [source priority](https://github.com/3427564237/enmori-app/blob/479619e8d124f3342458506fc145dc4bfbe3f483/docs/decisions/2026-09-25-sprint3-event-source-priority.md) and [minimum criteria](https://github.com/3427564237/enmori-app/blob/479619e8d124f3342458506fc145dc4bfbe3f483/docs/decisions/2026-09-25-sprint3-event-source-criteria.md). PR #42 remains unmerged in the kickoff record; its publication is not implementation approval.
- Existing [S2 Event physical contract](../../decisions/2026-09-15-sprint2-event-contract-mapping.md), [Q12](../../decisions/2026-09-02-interest-tag-event-category-contract.md), and [Q17](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md).
- Code baseline: main `432f5285966a6c2705473be21a2652ca2869520a`.

## Actual coverage and minimum fields

| Evidence | Public activity presence | Title | Start date/time | Openable activity page / onward registration | End time | Boundary |
|---|---|---|---|---|---|---|
| [TM-SG-01 public detail](https://ticketmaster.sg/activity/detail/26sg_itzy) | Observed Singapore venue/event row | Present | Present as local display | Detail opened; its Find tickets link opened a [seat-selection page](https://ticketmaster.sg/ticket/area/26sg_itzy/3543) | Not established in inspected detail | Public-page feasibility only; neither API nor permission proof |
| [TM-SG-02 public detail](https://ticketmaster.sg/activity/detail/26sg_theweeknd) | Observed Singapore venue and multiple performance rows | Present | Present for each performance | Detail opened; Find tickets links present, not transacted | Not established in inspected detail | Multiple performances require an approved identity/occurrence mapping; do not merge them into one inferred occurrence |
| [PA-01 public detail](https://www.onepa.gov.sg/events/wec-lpa-talk-2026-e91844509) | Observed named local venue | Present in description | Present | Detail opened; login-to-view-vacancies/pricing control present | Present | Registration completion not tested; no login or restricted inventory accessed |

Ticketmaster's [Singapore listings](https://ticketmaster.sg/activity) and [Concerts category](https://ticketmaster.sg/categories/concerts) expose actual local event links. The category page includes TM-SG-01/02. This supports a narrow public-page coverage finding, not completeness, availability guarantees, or equivalence to Discovery API inventory. Public participation fit follows LI's criterion; paid entertainment is not excluded by its activity type.

The [onePA Events page](https://www.onepa.gov.sg/events) exposed categories but its generic listing extractor showed no result. The direct PA-01 detail did expose required field presence. A generic listing's empty rendering is not proof that the provider has no events. This check does not establish a stable acquisition API or complete catalogue.

## Ticketmaster API feasibility — documented, not executed

Official [Discovery API v2 documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) describes authenticated event search/detail, an API key, a Singapore country filter, and event URL/start/end data. End-time and uncertain-date flags require validation. Documentation support is not an observed Singapore response. Actual Singapore result count, source IDs, occurrence boundaries, timezone/UTC fidelity, classification values and usable URLs remain unverified. Authorized API coverage is **Not Run**; no sample has been fabricated from the public site. The key must stay in approved private Backend configuration and must not enter source links, logs or client assets.

The next authorized read should be one small Singapore search and one returned event detail. Keep credentials and raw provider content private. Record response status, sample count, field-presence/validity, occurrence identity and taxonomy evidence in a sanitized result, then review actual permission and mapping before an importer is proposed.

## Intended use and permitted-use assessment

Intended product use: an ENMORI authenticated member receives source-derived card/detail information through Backend, then opens an approved provider activity page to continue registration. A later acquisition proposal may retain only necessary source-derived presentation and recommendation inputs. Retention duration, refresh, removal and outbound-link policy require decisions before execution.

| Source / applicable terms | Observation | Consequence for this intended use |
|---|---|---|
| [Ticketmaster API General Terms](https://developer.ticketmaster.com/support/terms-of-use/) | A conditional API licence is described; storage is limited to reasonable service periods, owner-requested removal is required within 24 hours, application data-use disclosure is required, and replacement/abusive API uses are restricted | Candidate permitted basis is licensed API use subject to the applicable terms and actual authorization. LI must confirm the application use, retention/removal procedure and disclosure; this research does not establish a completed licence/compliance review |
| [Ticketmaster Singapore site terms](https://ticketmaster.sg/terms-of-use) | Website use is limited and redistribution/deep-link use requires specific authorization | Public page access does not grant an HTML importer or app republication right. Resolve Singapore outbound-link authority and API/site terms interaction before rollout |
| [onePA Terms of Use](https://www.onepa.gov.sg/terms-of-use) | Restrictions cover reproduction, distribution, hyperlinks and information-retrieval storage unless otherwise provided or PA gives prior written permission | No permission for automated copying, retention or app display was established. Obtain applicable PA permission or a specifically supported permitted basis before that use; learning-project status alone does not establish it |

These are source-grounded permission gaps for LI to resolve, not a legal determination of an educational exception. Provider branding/images/long descriptions are outside the proposed minimum. No raw provider response or copied marketing content is published by this artifact.

## Evidence-backed mapping candidates

| Provider namespace / observed category | Existing ENMORI InterestTagId | Evidence | Proposed disposition |
|---|---|---|---|
| Ticketmaster SG website category `Concerts` | `interest_music` | Actual [category page](https://ticketmaster.sg/categories/concerts) groups the inspected music performances; the existing [fixed manifest](../../../backend/fixtures/s2-event-demo-manifest.v1.json) defines the controlled Music tag | Submit this single semantic pair to LI. Pending; it is a website taxonomy row only, usable only if that acquisition/category representation is separately authorized |

No Discovery API taxonomy row is proposed as observed: an authenticated Singapore sample must identify its actual classification ID/value before an API mapping row is submitted. The website category above must not be equated to a Discovery segment/genre by name. No onePA row is proposed: broad labels such as Arts & Culture are insufficient to infer Music, and neighbourhood/community wording does not establish `interest_community`. Unknown categories contribute no tag. These mappings create neither EventCategoryId values nor new catalogue entries; target tags must be Active at any later assignment.

## Preparation disposition

| Check | Result |
|---|---|
| Public source coverage/minimum-field presence observations | Observed for the named pages, bounded as above |
| Authenticated Singapore Discovery API sample | Not Run — authorized credential not supplied |
| API content-use/storage and Singapore deep-link basis | Pending LI/provider confirmation |
| onePA acquisition/republication basis | Pending PA permission or specifically supported basis |
| Category-to-Interest mapping | One candidate submitted; zero approved rows |
| Detail contract, missing-end-time reachability and participation read | Proposed in the [companion contract](../../planning/2026-10-01-s3-event-detail-contract-proposal.md) |
| Source importer, new API/storage, real integration or device tests | Not Run |
| ZHOU independent review / LI decisions | Pending |

The kickoff can be accepted as preparation with explicit gaps after independent review. Provider/integration implementation needs the listed decisions and authorized evidence.
