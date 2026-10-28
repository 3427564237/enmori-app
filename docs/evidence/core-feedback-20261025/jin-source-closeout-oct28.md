# JIN source-gap disposition and Backend review checkpoint

28 October 2026, SGT. Documentation-only continuation of the assigned owner
split. Local branch: `codex/jin-source-closeout-20261028`, based on approved
PR190 head `127943d292c3e9e42346989ef6041c5a7e305c39`. No product, classifier,
weight, contract, dependency, private configuration or runtime change.

## Evidence and attribution

LI's 28 October focused follow-up, supplied by the human in this task, reports
an authorized read-only check at 10:55 SGT: five pages, 85 raw occurrences,
79 eligible projections, Music 59 and Gaming 4 interest matches, other tags 0;
none of the 79 projections has a complete address. These are **LI's** results,
not a new JIN provider run. The supplied summary does not include raw payloads,
per-field rejection counts, taxonomy IDs or a remotely accessible v39 tree.
It therefore does not prove all missing projection fields were absent upstream.
Match counts are per tag and must not be added as distinct-event totals.

This continues the existing
[all-interest assignment](../../planning/2026-10-26-jin-all-interest-event-coverage.md)
and [previous matrix](jin-interest-coverage-oct26.md). The prior live-coverage
wait is narrowed by LI's observation, not repeated as wholly unknown.
[PR190 approval](https://github.com/3427564237/enmori-app/pull/190#pullrequestreview-5668581504)
at the exact head above is reported in the supplied PM handoff; R1–R3 are no
longer current blockers. The initial GitHub access failure is superseded by the
successful authenticated retrieval recorded below; it is not a current wait.
PR188's completed review remains separate from LI's adaptations in PR189.

## All fourteen tags: disposition of the observed source

The following conditions are unchanged approved implementation inputs, not a
new category mapping or claims about universal Ticketmaster coverage.

| Interest | Existing exact condition | LI's observed match count | Concrete disposition |
|---|---|---:|---|
| Books | Literary or Books | 0 | Condition absent from returned taxonomy; unsupported by this observed source catalogue |
| Travel | Travel | 0 | Condition absent; unsupported by this observed catalogue |
| Films | Film | 0 | Current empty; no unsupported-category conclusion from count alone |
| Fitness | Fitness | 0 | Current empty; do not substitute generic Sports |
| Dance | Dance | 0 | Current empty; do not substitute generic Music/Arts |
| Food | Food & Drink | 0 | Current empty; venue catering is not an activity match |
| Photography | Photography | 0 | Condition absent; a cover image does not supply the condition |
| Technology | Technology | 0 | Condition absent; no title-keyword fallback |
| Outdoors | Outdoor Recreation | 0 | Condition absent; outdoor location does not supply the condition |
| Volunteering | Volunteering | 0 | Condition absent; charity tickets do not prove volunteering |
| Art | Fine Art | 0 | Current empty; broad Arts & Theatre is not equivalent |
| Gaming | Gaming or eSports | 4 | Observed populated, subject to current identity/source checks |
| Community | Community/Civic | 0 | Current empty; no neighbourhood/title inference |
| Music | Existing Music segment ID KZFzniwnSyZfZ7v7nJ | 59 | Observed populated, subject to current identity/source checks |

The six absent-condition rows cannot be populated by changing weights, paging
again over the same snapshot, relaxing exact conditions or relabelling unrelated
events. Keep their rules dormant for a future genuinely supplied classification;
do not delete tags or claim fourteen live groups. The other six zero rows remain
current empty; the summary alone does not supply enough taxonomy detail to assert
each has a verified present ID. A healthy zero-match response is distinct from
provider failure. Independently permitted region/social factors remain truthful
under the existing formula; they are not counted as interest coverage.

## Introduction, address and genuine information links

Current local source examined: `backend/src/event-browse/domain/browse-values.ts`
and `infrastructure/ticketmaster-browse-source.ts` at `127943d`, plus the approved
[presentation contract](../../../api/event-detail-presentation-contract.md).
This is not an inspection of LI's unpublished v39 implementation.

| Gap | What the existing source path can deliver | Disposition / smallest next check |
|---|---|---|
| Introduction | Safe plain `info`, then `description`, normalized and bounded to 1000 Unicode scalars from the actual occurrence | Keep absent/rejected content visibly unavailable. The earlier 26 October assignment reports list/detail samples with neither field; no new count is inferred for the 79. If LI's retained response contains valid plain text that its projection drops, return a sanitized counterexample to JIN as a mapping defect. Do not fabricate a summary or use `pleaseNote`/HTML as an introduction without an applicable contract change. |
| Readable place | Actual venue name plus actual `address.line1` where present and within the field bound | A venue label is not proof of a full postal address. LI's 0/79 complete-address result must remain. Check raw line1 presence versus projection validity before diagnosing upstream absence; no reverse geocoding or invented completion. |
| Booking URL | Actual validated API-returned `url` on the approved Ticketmaster SG hosts | Keep its tickets/booking label. A seat-selection destination is not a separately verified information page. |
| Separate information URL | Only a real, separately verified occurrence-specific URL under the existing optional-action contract | The current DTO/projection has no independent information-URL source. Hide the separate action when unavailable. Never duplicate a booking URL, synthesize an `/activity/detail/` path from an ID, or scrape a page to pretend the field is supplied. |

The [official Discovery API documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
was read on 28 October: it documents event detail, optional information/description,
venue data and a ticket-purchase website URL. A schema field is not evidence that
Singapore supplies it. Existing bounded detail reads may check the same occurrence;
there is no basis for an additional all-event refresh or a live call from JIN.

For LI's next **existing authorized** source check, or from retained responses,
publish only source/head/time, inspected count, field-presence/validity counts,
plain-text accepted/rejected counts, URL role (booking vs independently verified
information), and per-tag taxonomy presence/match counts. Distinguish missing,
invalid, filtered, unknown and request failure. Keep raw text, API-key-bearing
URLs and private configuration private. If distinguishing list/detail needs a
request, use one already selected occurrence through the existing detail path;
do not reopen all five pages merely to repeat the coverage result.

## Smallest provider/permission decision to LI

Ticketmaster cannot presently establish six named interest groups or guarantee
introductions and separate information URLs. The next candidate is **onePA**,
already second in the
[published source order](../../decisions/2026-09-25-sprint3-event-source-priority.md),
not an arbitrarily selected replacement. That order authorizes feasibility
research, not automated copying or a production importer. SHI's existing
[bounded public-page observations](../sprint3/2026-10-01-shi-event-source-research.md)
remain attributed to SHI and do not prove six-category coverage.

**Concrete decision requested, not assumed approved:** retain the current truthful
Ticketmaster coverage while LI obtains or identifies a PA-authorized read-only
feed/API and permission to display its minimal public occurrence metadata in
ENMORI. The requested use is limited to stable occurrence ID, explicit category,
title, start (and supplied end), actual venue/address, a short plain introduction,
genuine information URL and onward-registration URL, with attribution, bounded
request-only reads, at most the existing five-minute memory lifetime and source
removal/disable. No attendee/member data, login, booking, images, bulk HTML scrape,
persistent copied catalogue, worker or new deployment is proposed.

PA must identify the actual documented access endpoint/feed, allowed uses and
limits; no endpoint, credential or permission has been found or invented here.
The [current onePA Terms of Use](https://www.onepa.gov.sg/terms-of-use), read on
28 October (page last updated 3 April 2026), restrict republication, display,
hyperlinking and information-retrieval storage unless otherwise provided or
prior written PA permission applies. The existing source decision already
requires a supported basis; this is not a new blanket approval requirement.

Once that access/basis exists, JIN can validate one actual occurrence per claimed
category and return exact category-ID mappings and the minimal adapter/contract
delta. onePA is **not** claimed to cover all six missing categories. If it also
lacks a category, report that category as unsupported; another named source
would require its own bounded choice. No contact, permission acceptance,
credential transfer or new provider operation was performed in this turn.

If LI does not select this limited source-expansion path, the current delivery
must remain explicitly partial in live category/information coverage. Accepting
that limitation is a PM scope disposition, not a code defect hidden by a green
test count. JIN has prepared the concrete choice; no product decision is made
on LI's behalf. The approved ranking implementation is not reopened.

## PR189 independent Backend/runtime review: access recovered

Requested published head, as supplied by PM:
`afe06ae9ec97abb2f5c0448501ccc7fd5eb47733`. Authenticated retrieval under
`chuxi12483468` subsequently succeeded, and its exact source is now available.
Remote head remained this commit; base is
`4d81af2f3dc0f5d68d8346eb248b30ed93097f76`, review tree
`d84c99edc2dd1f4cb233a43eca68c1b31f4b8773`.
Local v39 `0c8efb7...` / evidence `5263f33` is also not available and is not being
requested as a prerequisite for reviewing the published PR189.

Historical failed attempts, retained (superseded for current availability):

- GitHub connector `fetch_pr` with correct repository/PR: HTTP404.
- Existing `gh` network read: automatic approval timed out before process creation;
  its one allowed retry also timed out. This was not an unsafe-action finding.
- Non-escalated `gh pr view`: failed to connect to api.github.com, exit1.
- Public web retrieval: cache miss; existing in-app browser: GitHub page not found.
  No alternate signed-in browser is available through the browser inventory.
- No new account/login, token inspection/transfer, network-rule change or
  workaround service was attempted. At that earlier checkpoint no PR189 source,
  compile or test had been executed.

The focused review is now complete, with a reproducible **P2 cancellation-wait
finding** in the new host-preparation wrapper. Independent strict compilation and
97 affected cases pass, while the separate counterexample has one positive
control pass and two failures exposing the same defect. See the
[exact-source review and runnable probe](jin-pr189-backend-review-oct28.md).
These are JIN executions on the published PR189 tree, not LI's author results or
v39 approval. LI owns the correction; the next code checkpoint is its published
fix and affected counterexample result. DU retains client/navigation review.

SHI's latest supplied 28 October receipt reports no independently identified
Event presentation/source-consumption gap in its bounded inspection and no new
provider request or tests. It is not used as formal approval of LI's Backend or
client adaptations. Missing actual source fields remain the disposition above.

## Handoff status

This coherent packet contains the source disposition and independent PR189 review
evidence. The access wait is resolved. Remaining owners are LI for the new
host-preparation correction and the specific onePA access/display-basis decision,
and LI for final combined-source/device acceptance. No code ETA can be promised
for an unselected provider access path; JIN's next acquisition checkpoint is an
identified permitted feed and one real occurrence per claimed category. Existing
failure records, PR190 approval and all owner boundaries are preserved. No merge,
closure, Project transition, runtime/model/provider activation, install or
whole-app acceptance.
