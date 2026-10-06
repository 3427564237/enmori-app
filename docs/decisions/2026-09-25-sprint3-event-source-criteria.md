# PM clarification — Sprint 3 Event source criteria

- **Source ID:** S-PM-0925-S3EVENT-CRITERIA
- **Status:** Confirmed by LI HOURUI, ENMORI PM, on 2026-09-25; activity-type fit, minimum source-backed fields, outbound-link target, missing-field display, and explicit category-to-interest mapping direction only, not provider approval or `Ready`
- **Scope:** Which third-party activities may count toward Sprint 3 source fit, minimum source evidence and outbound link, how named missing fields appear in Event Detail, and the bounded method for assigning recommendation Interest Tags
- **Earlier sources retained:** [S-PM-0925-S3EVENT-SOURCE](2026-09-25-sprint3-event-source-priority.md) questioned whether ticketed entertainment fits a community-event goal and described opening an external registration page; [S-PM-0915-S2EVENT-MAPPING](2026-09-15-sprint2-event-contract-mapping.md) requires a valid `endAt` for the existing Home/See All recommendation candidates; [S-PM-0902-Q12](2026-09-02-interest-tag-event-category-contract.md) keeps Event Categories and Interest Tags distinct and forbids implicit matching

## Activity-type fit

LI confirms that **all activities the public can participate in may count**, including paid concerts and sporting events. A source need not predominantly provide neighborhood or community-organized activities to pass this type-of-activity screen. This supersedes only the earlier narrower source-fit assumption and rationale; it does not reorder the source candidates. Ticketmaster remains first, onePA second, and STB TIH is not restored as the planned first source.

## Missing-field display and recommendation boundary

An activity enters ENMORI only when its **title, start time, and an openable third-party activity/registration link** have real source evidence. Do not invent or infer one of these minimum values. The link may open the third party's Event page if users can continue to registration from there; a direct registration-form link is not required. This narrows the earlier “external registration page/URL” wording without changing the third party's responsibility for registration, ticketing, or payment. When the source omits location, category, short description, or end time, ENMORI Event Detail may still show an otherwise eligible activity and must visibly mark the missing information rather than inventing a value.

An activity without a valid end time remains excluded from the existing Home/See All Event Recommendations under S-PM-0915-S2EVENT-MAPPING. The detail-display decision does not silently loosen the recommendation record or eligibility rules. The product route by which an otherwise valid but non-recommended activity is reached remains a separate integration detail to resolve within approved scope.

## Explicit recommendation-tag mapping

LI approves a **small, explicit table** mapping a third-party source category to an existing ENMORI `InterestTagId` for Event Recommendations. The source's category is not itself an ENMORI `EventCategoryId` or `InterestTagId`; equal or similar names do not create a match. A source category with no approved table entry contributes no inferred Interest Tag. The illustrative “Concerts → Music” example in the clarification question is not an approved mapping row.

SHI proposes only the actual source-category/ENMORI-tag pairs needed for the selected provider, and LI confirms the entries before they feed the existing Interest-based recommendation path. This is a bounded mapping direction, not an approved set of entries, new catalogue lifecycle, or automatic classifier. Existing Q12 identity, active-tag, and recommendation rules remain in force.

Actual source coverage, evidence for the minimum fields and outbound link, permitted access and content use, the concrete mapping entries, and working Backend-to-Flutter integration still require verification or separate decisions. This clarification does not approve an importer, scraping method, data model, publication, `Ready`, or Sprint acceptance.
