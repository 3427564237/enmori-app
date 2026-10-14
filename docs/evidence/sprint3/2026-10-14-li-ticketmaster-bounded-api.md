# LI authenticated Ticketmaster Singapore evidence

Executed: 2026-10-14 11:32:47 UTC / 19:32:47 SGT. Operator: LI.
Authority: [S-PM-1014-LI-REAL-RUNTIME-CONTENT](../../decisions/2026-10-14-li-real-runtime-deployment-and-content-direction.md), the human's developer setup request, and subsequent **"以保存"** confirmation. The private configuration had a nonempty key and human-set `termsAccepted: true`; no account signup or terms acceptance was performed for the human.

This executes only the bounded operation proposed in [SHI's provider delta](../../planning/2026-10-07-shi-event-provider-contract-delta.md). That earlier artifact's Not Run statement remains historical. This is operator evidence awaiting ZHOU's independent review, not an approved importer or product integration.

## Request and result

One authenticated HTTPS Discovery search used `countryCode=SG`, `size=3`, `sort=date,asc`, `startDateTime=2026-10-14T11:32:47Z`, and `includeTBA=no`, `includeTBD=no`, `includeTest=no`. No pagination or retries occurred. One Detail request used the first returned occurrence ID; it returned the same ID. Both requests returned HTTP 200 with parsed JSON. The key and complete request URLs are deliberately omitted.

The search's `page.totalElements` was **83** and **3** events were returned. This is the provider-reported matching count for this query at this instant, not a catalogue-wide coverage or availability guarantee. All three summaries and the corresponding Detail had:

- a nonempty occurrence ID and title, a future timezone-aware start, and no true start uncertainty flag among `dateTBA`, `dateTBD`, `timeTBA`, `noSpecificTime`;
- an event timezone field, venue information, venue country code `SG`, and status code `onsale`;
- an HTTPS source URL with hostname `ticketmaster.sg` and classification information;
- the exact Discovery **segment** ID `KZFzniwnSyZfZ7v7nJ` used by candidate mapping M02.

None had a parseable timezone-aware `dates.end.dateTime`. Consequently **0/3** samples have the complete ordered start/end pair required by current Home/See All recommendations. This does not prove that all 83 results lack an end, or that other end fields are absent. No duration or end time was inferred.

The [sanitized receipt](2026-10-14-li-ticketmaster-bounded-api.json) preserves counts and field checks only. The original operator check named timezone-aware fields `startUtcPresent`/`endUtcPresent`; the public receipt renames them accurately. The check accepts timezone offsets and is **not** the approved Z-terminated, nanosecond-safe UTC validator. Unicode lengths, full URL policy, source status-to-publication semantics, attribution and a complete product projection were not validated. Raw content was discarded, so this receipt cannot certify them retrospectively. The 0/3 complete-time result remains decisive regardless of start serialization.

## Concrete consequence and next proposal

[S-PM-0925-S3EVENT-CRITERIA](../../decisions/2026-09-25-sprint3-event-source-criteria.md) already permits otherwise eligible Detail to mark missing end information, but explicitly excludes these activities from existing recommendations. The Detail-only reachability path remains a separate decision. Do not change Home/See All eligibility, populate synthetic end times, or silently insert these records into `events/{eventId}`.

The smallest proposed next delivery is a real activity browsing/Detail path with missing end visibly shown, preserving existing recommendations. Before implementation, SHI should consolidate the reachability/API choice, occurrence identity binding, minimum stored or transient projection, attribution/source-link scope, and freshness/removal behavior into one concrete contract delta for LI; ZHOU reviews that packet. A different choice is to propose an explicit recommendation-contract amendment. Neither is approved by this report.

M02 now has actual Singapore namespace/ID evidence, but its activation still requires LI confirmation and current target-tag validation. M01 website categories are not substituted. `onsale` is observed provider metadata, not automatically ENMORI `active`/`published` or proof of registration/participation.

Official [Discovery documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) describes this access path. The refreshed [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) limit caching to reasonable service periods, require requested content removal within 24 hours, and require visitor-data disclosure. Human acceptance permits the authorized probe; this report does not select production retention, establish all display/link permissions, or waive those obligations. No website scraping or alternate provider call occurred.

## Verification boundary

- Actual provider requests: 2/2 HTTP 200; credential authentication established for this run.
- Raw provider content persisted: none; product writes: zero; credentials published: none.
- Real importer, product API/Firestore/Flutter integration, refresh/removal, participation, device evidence and UAT/Release: Not Run for this increment.
- No new dependency, product code, normative contract, Issue/Project state or synthetic fixture changed. No product tests were rerun for this documentation-only receipt.
