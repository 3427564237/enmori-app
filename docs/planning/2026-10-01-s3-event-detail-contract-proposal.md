# S3-03 minimal Event detail and consumer contract proposal

Owner: SHI ZHENGQI. Issue: [#47](https://github.com/3427564237/enmori-app/issues/47). Reviewer: ZHOU YAOYIN. Status: **Proposed, Pending LI confirmation**. Prepared 2026-10-01 against main `432f5285966a6c2705473be21a2652ca2869520a`; source observations are in the [research record](../evidence/sprint3/2026-10-01-shi-event-source-research.md).

This preparation artifact proposes the smallest detail read alongside the accepted recommendation contract. It defines no executable route, normative OpenAPI, persistence migration, importer or participation mutation. Every new physical name below is a candidate for explicit approval.

## Existing contract preserved

[S-PM-0915-S2EVENT-MAPPING](../decisions/2026-09-15-sprint2-event-contract-mapping.md) remains controlling:

- `events/{eventId}` contains exactly `title`, `active`, `published`, `startAt`, `endAt`, `interestTagIds`; identity is the document path.
- Existing `GET /v1/recommendations/events?view=home|all` and its response remain unchanged: `asOf`, `formulaVersion`, `items`; each item has `eventId`, `title`, `startAt`, `endAt`, `matchedInterests`, `reasonCode`.
- Home is Top 2 after full Q03 ordering; See All recomputes independently. Presentation, venue, description, source URL and participation never score.
- No source IDs, links, description, provider payload, missing-end placeholder or new participation field is added to the six-field record. Missing/invalid end time cannot become a recommendation candidate.

## Proposed vertical flow

```text
authorized provider read (permission, credentials and mapping Pending)
  -> Backend validates occurrence, minimum facts and approved provenance
  -> ENMORI Event detail projection
  -> Flutter Event Detail
  -> user opens approved external activity page
  -> return to ENMORI; external registration outcome remains unknown

valid complete recommendation projection
  -> unchanged six-field Event record
  -> existing Home Top 2 / independent See All
  -> selected eventId loads the same detail identity
```

Provider titles, start instants and URLs must have actual source evidence. An event-list row with only a date or uncertain start does not establish a precise UTC instant. Multi-performance pages require an occurrence identity decision; do not duplicate or collapse performances by title. External registration, ticketing and payment belong to the provider. Returning from a browser does not prove registration or set Going.

## First detail read proposed for approval

Candidate route: `GET /v1/events/{eventId}`, through the existing verified Auth/account/onboarding boundary. No caller-selected owner, provider URL, query identity, score or private participant input. EventId is an opaque ENMORI identity shared with existing recommendation results; a provider ID/slug is not silently promoted into that namespace.

| Candidate response property | Proposed meaning / minimum rule |
|---|---|
| `eventId` | Validated opaque identity, consistent with recommendation navigation |
| `title` | Source-backed required display title |
| `startAt` | Required validated UTC instant; no invented timezone or default midnight |
| `externalSourceUrl` | Required source-backed HTTPS activity/registration URL, validated under an approved provider/host/link policy |
| `endAt` | Optional validated source-backed UTC instant after start; omitted when absent |
| `locationLabel` | Optional safe source-derived venue/location display; no user location |
| `categoryLabel` | Optional source display taxonomy; not an ENMORI EventCategoryId or scoring factor |
| `shortDescription` | Optional licensed plain-text source summary; no HTML, images or arbitrary provider object |

Named missing end/location/category/description values are omitted and visibly presented as unavailable in Detail, as directed by LI's [criteria record](https://github.com/3427564237/enmori-app/blob/479619e8d124f3342458506fc145dc4bfbe3f483/docs/decisions/2026-09-25-sprint3-event-source-criteria.md). Exact missing/error/loading copy and field limits remain Pending. Provider/source attribution needed by actual permission must be settled together with the final projection, not removed for minimality. Own participation is a separate read so this proposal cannot imply a default state or unauthorized participant disclosure.

Reuse approved Auth/onboarding/dependency error envelope semantics. Event not-found/unavailable/stale behavior, exact new codes, serialization, unexpected provider content and URL failure behavior require approval before OpenAPI implementation. Unknown/invalid source data fails closed; a failed upstream request cannot masquerade as successful empty recommendations.

## Acquisition/storage and compatibility choice

Preferred minimal direction for LI review: maintain a separately authorized source/detail projection behind an Event-owned Port while preserving the existing recommendation record. The exact detail storage collection/fields versus bounded live provider read is **Pending**, including occurrence ID binding, permitted cache duration, refresh and removal. Do not place detail-only records with absent end time into `events` merely to make a page reachable. No new index, scheduler or deployment is selected.

For complete recommendation candidates, the proposed source adapter would derive only the six approved fields after source validation and LI-approved tag mapping. Source status to `active`/`published` mapping must be confirmed; a visible page alone does not authorize those booleans. No unmapped category gains an inferred tag. Recommendation selection then uses the existing Q03/Q12 rules unchanged.

Missing-end-time reachability needs an explicit decision: **propose a separately approved Event browsing entry under `events-list`, independent of recommendations**, rather than widening See All. Its list API, paging and UI scope need their own bounded approval. Until that decision, those details are not reachable product outputs; the Home/See All path remains complete-data-only. This gap cannot be closed by synthetic data or an arbitrary hard-coded provider link.

## First consumer read needed by JIN

Friend ranking requires purpose-authorized Event associations under [Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md) and [Q03](../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md), not Event Detail or raw participation records.

Propose an Event-owned Application-facing read for a verified requester and a specified subject, with the fixed `friend_recommendation` purpose. After current relationship, Profile Privacy, consent, visibility and lifecycle checks, it returns only the deduplicated authorized union of that subject's Interested/Going Event IDs. No per-ID Interested/Going state, title, URL, full Event history, account record, directory or counts are returned by this Port. This is an internal bounded read, not a public arbitrary-user endpoint or a generic shared Event model. IDs remain in deterministic Backend processing and do not enter Qwen.

The first implementable consumer slice depends on LI/JIN's authoritative visibility contract and SHI's participation lifecycle/storage contract. Their precise request type, return type, deny/unavailable behavior and adapter remain Pending. A not-yet-authorized candidate read must be rejected before ranking; an empty authorized set must not stand in for unresolved permission. JIN can retain injected authorized projections for independent component tests meanwhile.

Interested People field/count disclosure is still unresolved in Q04-D. `going-people` remains Prototype Evidence Only. Nothing in this proposal enables those directories. Own Interested/Going mutation, external-return confirmation, revision/idempotency, retention/deletion and cross-feature invalidation require separately confirmed contracts.

## Concrete decision requests and unresolved list

| ID | Required confirmation / evidence | Owner / dependency |
|---|---|---|
| E01 | Authorized Ticketmaster Singapore API sample; actual coverage, occurrence IDs, precise instants, taxonomy and link | SHI with approved private provider credential; currently Not Run |
| E02 | Select provider/acquisition basis and confirm display/storage/link rights for the stated ENMORI use; onePA remains conditional | LI/provider; Pending |
| E03 | Confirm the one website-category mapping candidate, or obtain API taxonomy evidence and confirm its exact rows instead | LI; no approved row yet |
| E04 | Confirm detail route/projection, auth, field limits, attribution, missing/error copy and unavailable semantics | LI; Pending |
| E05 | Confirm separate detail acquisition/storage, occurrence identity binding, source status, refresh/removal and stale-data rules | LI; Pending |
| E06 | Confirm browsing reachability for valid details without end time, or retain them outside reachable scope | LI; explicit decision required |
| E07 | Confirm own participation lifecycle and the minimized JIN-purpose read, including visibility/revocation/deletion rules | LI with SHI/JIN; Pending |
| E08 | ZHOU independent review of these preparation artifacts | Requested after publication; Pending |

E01–E07 block only their affected implementation slices. Source evidence and this reviewed proposal can complete the kickoff with the gaps recorded; they do not imply implementation Ready.

## Verification plan after approval

Source-adapter tests must cover missing/uncertain time, absent/invalid end, duplicate occurrence, unmapped/inactive tags, canceled/stale/removed source and unsafe link. Existing recommendation tests must remain passing with unchanged DTOs, six-field records and ordering. Later Transport/OpenAPI tests verify the approved detail contract, authentication and safe failures. Isolated Emulator tests verify the approved persistence, visibility and consumer projection; approved Android evidence verifies Detail, independent Home/See All and outbound/return behavior. Product, provider API, Emulator and Android execution for this new slice are **Not Run**.

This documentation change is checked for links, source attribution and whitespace. Independent review, LI decisions, product verification, merge and closure remain recorded actions.
