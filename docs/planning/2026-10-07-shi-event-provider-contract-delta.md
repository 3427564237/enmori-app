# SHI Event provider evidence and minimum decision delta

Date: 2026-10-07 (SGT). Owner: SHI. Reviewer: ZHOU. Status: proposal; not a PM decision or implementation authorization.

Baseline: `main` at `f2d01a129ab4d409c5acb8027481f32b7afec7fe`. Request: [LI's focused owner follow-up in #44](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6030080157). The later PM checkpoint was inspected at documentation commit `0f16986205b56316212c259d82bed4e0c993bd8f`, not represented as merged into this baseline.

Retain the [original source research](../evidence/sprint3/2026-10-01-shi-event-source-research.md), [Detail proposal](2026-10-01-s3-event-detail-contract-proposal.md), [category/Interest contract](../decisions/2026-09-02-interest-tag-event-category-contract.md), and [bounded implementation approval](../decisions/2026-10-05-li-blocker-implementation-approval.md). Completed isolated synthetic Detail remains complete within its accepted scope. This delta does not reopen #47 or repeat that implementation.

## 1. Actual public coverage observed

Official pages were read through the web tool on 7 October. This is field-presence research, not an authenticated API run, provider-wide coverage measurement, ticket purchase, or availability guarantee. No catalogue, descriptions, images, or raw API payloads were copied into the repository.

| Sample | Official source | Observed minimum information | Unestablished information / consequence |
| --- | --- | --- | --- |
| TM-A | [Singapore Concerts category](https://ticketmaster.sg/categories/concerts) and [activity 26sg_sj83z](https://ticketmaster.sg/activity/detail/26sg_sj83z) | Title, 16 October 2026 start at 19:30, venue, and a ticket-link control; category membership is Concerts | No end time established. Displayed local time is not a validated UTC instant. A website slug is not proof of a Discovery occurrence ID. |
| TM-B | Same category and [activity 26sg_bigbang2026](https://ticketmaster.sg/activity/detail/26sg_bigbang2026) | Title, venue, separate performances on 17 and 18 October 2026 at 19:00, separate ticket-link controls | No end times established. One page covers multiple performances: do not collapse these into one occurrence or infer API identity. |
| PA-A | [onePA activity e91844509](https://www.onepa.gov.sg/events/wec-lpa-talk-2026-e91844509) | Title, venue, 10 October 2026, 10:00–13:00; pricing/vacancy viewing requires login | No validated UTC conversion or precise category-to-Interest row established. Booking/login was not executed. |

Public Singapore activity coverage exists in these three samples. Whether the approved acquisition channel actually returns them, with usable occurrence IDs, dates and rights, remains unverified. Missing end times must not be fabricated to satisfy the existing recommendation contract.

## 2. Permitted-use evidence, not a clearance claim

| Official evidence | Observed restriction / conditional basis | Remaining decision |
| --- | --- | --- |
| [Ticketmaster Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) | Conditional API licence; reasonable caching, requested content removal within 24 hours, and other operational/usage restrictions apply | Confirm the project's intended retrieval, display, storage, attribution and linking are covered by the applicable provider terms/permission. An API key alone is not this confirmation. |
| [Ticketmaster SG website terms](https://ticketmaster.sg/terms-of-use) | Personal-use limits and specific authorization for deep links are stated | Do not infer permission to scrape, republish, or expose real outbound URLs from public visibility or from general API documentation. Resolve which authorization governs the intended destination. |
| [onePA terms](https://www.onepa.gov.sg/terms-of-use) | Prior written permission is required for listed reuse, display, hyperlinking and information-retrieval storage unless otherwise provided | No project-specific permission was found in the inspected evidence. onePA is not an automatically authorized fallback, including a URL-only fallback. |

These are engineering permission gates for LI/provider confirmation, not a legal determination. No provider was contacted and no new account, credential, permission, or external service was created.

## 3. Recommended smallest next increment

Request LI approval for **one bounded, authorized Ticketmaster Discovery Singapore evidence run**, not a production importer:

1. Use privately provisioned approved credentials; never put the key, credential-bearing URL, headers or raw response into GitHub or this report.
2. Make one Singapore-filtered search with at most three returned events, and at most one corresponding Detail request. No pagination, bulk crawl, data writes, deployment, refresh scheduler, or new dependency.
3. Record sanitized result counts and field-presence/validation outcomes: provider occurrence identity, title, source URL, start/end/timezone and uncertainty flags, status, category namespace/ID/label, venue and required attribution. Do not retain marketing text or account data.
4. Establish whether there is at least one usable future Singapore occurrence under the existing complete-time recommendation contract. Report zero coverage or missing fields as such; never substitute website data or synthetic records as API evidence.
5. Have ZHOU independently review the resulting evidence and the next concrete mapping/storage proposal before implementation approval is requested.

The [official Discovery documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) describes API-key access, country filtering, classifications and date/time uncertainty flags. Documentation examples establish possible fields, not actual Singapore response coverage. The run is **Not Run**: privately provisioned approved access and applicable-use confirmation are not established by this artifact.

If this bounded run fails coverage or permission, return the observed limitation to LI. Do not silently switch to website scraping or onePA. Retain synthetic-only operation until LI selects a separately authorized alternative.

## 4. Concrete proposed mapping rows

These rows are candidates, not approved configuration. Source category namespaces remain distinct from Interest tags; no same-name matching or broad fallback is introduced.

| Row | Source discriminator | Proposed target | Evidence and activation gate |
| --- | --- | --- | --- |
| M01 | Ticketmaster SG **website category** `Concerts` | `interest_music` | Observed membership for TM-A/TM-B. Applies only if that website acquisition/use channel is separately authorized; cannot be used to infer an API classification. |
| M02 | Ticketmaster Discovery **segment** `Music`, documented ID `KZFzniwnSyZfZ7v7nJ` | `interest_music` | Official documentation example only. Require an actual authorized Singapore sample with the exact namespace/ID, then LI approval. Do not bridge M01 to M02 implicitly. |

The [fixed synthetic manifest](../../backend/fixtures/s2-event-demo-manifest.v1.json) defines active `interest_music` and `interest_community`; it does not prove current target-environment lifecycle state. Revalidate the target tag before any approved new assignment. Deduplicate IDs and preserve existing inactive-tag scoring rules.

No `Arts & Culture -> interest_music` or `onePA -> interest_community` row is proposed: neither has sufficient precise category evidence. Unmapped/ambiguous categories must remain unmapped, not guessed. This is not an approval to alter scoring, filtering, or zero-factor behavior.

## 5. Minimum fields and separately required behavior

Keep existing approved public Detail fields unchanged: required `eventId`, `title`, `startAt`, `externalSourceUrl`; optional `endAt`, `locationLabel`, `categoryLabel`, `shortDescription`. Existing Unicode, UTC, URL, availability, auth and onboarding validation remains binding. Optional fields are not inferred from marketing text.

For real recommendations, retain existing `events/{eventId}` fields `title`, `active`, `published`, `startAt`, `endAt`, `interestTagIds`, with identity in the document path. Do not synthesize missing end times, promote unknown source status, or admit ambiguous dates. Recommend deferring incomplete-time real records from this first ingestion slice; a separate browse-only behavior requires its own approval, not a hidden relaxation.

Before real acquisition implementation, LI must approve occurrence identity/binding, permitted stored projection and attribution, freshness/removal policy, and approved source URL scope using the real sample. This delta creates **no** physical collection, metadata fields, index, cache duration, endpoint or background job. If provider-required attribution cannot fit the approved surface, request an explicit surface/contract amendment before use.

Keep current Detail copy-link behavior; actual URL permission/validation remains required even without launching a browser. External launch, return handling and participation are separate decisions. Opening/copying a source URL is not evidence of attendance or `Going`. Any participation write and JIN Friend/common-Event read contract must be explicitly scoped and reviewed separately; this delta does not implement or approve them.

## 6. Exact remaining choices, owners and feasibility

| Choice / dependency | Responsible party | Recommended bounded disposition |
| --- | --- | --- |
| Acquisition/use and URL authorization | LI with provider/project authority | Confirm intended API use and destination rights; no website scraping fallback |
| Private API access | LI / authorized project credential owner | Provision privately after authorization; no plaintext credential request or publication |
| Actual Singapore occurrence/time/category coverage | SHI, independent reviewer ZHOU | Execute only the bounded evidence run after those gates; publish sanitized findings |
| M01/M02 activation and target tag lifecycle | LI, SHI/ZHOU verification | Approve only evidence-backed channel-specific rows; no inferred taxonomy bridge |
| Binding, stored projection, attribution and freshness/removal | LI, SHI proposal / ZHOU review | Decide from the actual sample before any real importer/adapter changes |
| External launch / participation and shared read | LI and affected Event/Friend owners/reviewers | Separate smallest contract delta; no inference from synthetic Detail acceptance |

This preparation artifact is delivered locally in this turn. The bounded API report can be the next SHI increment after access and use authorization; no completion date for real-provider implementation is committed without those prerequisites. Iteration 3's 11 October end is not proof of feasibility or permission. DU's separate #48 packet is not SHI's delivery and is not modified here.

## 7. Verification and publication boundary

- Public-page and official-document read-only research: executed; observations and limits above.
- Authenticated provider API, actual ingestion, refresh/removal, participation, Android integration, UAT and Release: **Not Run for this increment**.
- No product code, approved API contract, fixture, dependency, credential, deployment or Issue/Project status changed.
- Local documentation validation is recorded in the task handoff after execution; prior product test totals are not new test evidence.

Proposed publication batch, subject to the existing action-time confirmation rule: push the single documentation commit on `codex/s3-event-provider-delta-20261007`; create one Draft PR against `main`; request ZHOU review; publish one English #44 update linking the exact artifact/commit and the unresolved choices above. Do not merge, close/reopen an Issue, change the board, approve implementation or declare Sprint/Release/Done.
