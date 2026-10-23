# Social product increment — 23 October 2026

Status: confirmed PM delegation; bounded implementation selected by Social.
Source: the human-authorized Social launch prompt in chat
`01a1689b-0dd3-7560-b85b-25100b4a02eb`, and the human's explicit six-chat
collaboration answer in source chat `01a15293-dbcf-75e2-b020-398d61d677cb`.
Starting source is `7cf12cd398eb1a613eff2e5c867af5a623428cf5`, including v24.

## Selected increment

Events gains a My plans entry and companion page using the existing owner participation API.
The existing Profile section shares that implementation. Users can accumulate
pages, filter currently loaded facts by Interested, Going or hidden
recommendations, open the stable-ID detail to manage the existing state, and
return without losing their selected filter or earlier pages. Cancelled facts
remain reachable in All records. Source content is read separately and is never
archived in a plan. Confirmed changes use the existing shared participation
controller; uncertain writes remain uncertain until an explicit read.

Friends Activity offers an event action directly on an authorized event row.
Before navigation it re-reads the existing purpose-bound activity projection and
matches username, type, source record and Event ID. Removed or inaccessible rows
cannot open from old content. Check-in activity keeps its existing detail path.
Home receives this through the same component and callback, not a second feed.

## Authority and supersession scope

This executes the launch prompt's delegated internal layout, copy and existing
interface composition choices. It supplements
[23 October refinement](2026-10-23-li-product-experience-refinement.md) only in
Events' internal view organization and direct Friends Activity navigation. That
earlier task's instruction to continue its old work branch applies to that task;
the new launch explicitly selects this isolated role branch and a new Draft PR
targeting `souma/li-zhou-runtime-20261020`.

Preserve [P01–P06](2026-10-20-li-event-participation-selection.md),
[EB2 and activity display scope](2026-10-20-li-event-batches-friends-activity.md),
the existing exact Username and relationship contracts, approved mappings,
server authorization, revision checks and external-registration confirmation.
No new data fields, purposes, API, dependency, infrastructure, Booked state,
global route or source-content persistence is approved or required here.

## Verification and delivery boundary

Targeted fake-Repository tests cover pagination/retry, loaded-only filters,
cross-page confirmed/uncertain state, source-unavailable management, return
continuity, session replacement, and activity revocation. These establish source
behavior only. Integration owns shared service, APK and physical-device checks.
This record does not accept UAT, Release, deployment or real-account mutations.

## Same-round language extension

The human's actual App-chat message `01a168a0-5c07-78e1-afb2-a6aafae02152`
(requesting Settings Chinese/English choice, persisted reopening, and actual UI
coverage) was read directly in `01a1689b-0799-7550-a624-e44ec1aa3081`.
Integration supplies the locale and typed-failure helpers and global persistence.
Social translates its Friends/Events/participation UI, including dynamic counts,
status labels, disclosures and shared Home card copy. Source event content,
usernames, shared interest names, user Notes/Mood and API enum/ID values retain
their originals. Journal owns the shared record/calendar/map translations;
Social changes only relationship/profile copy and shared failure feedback on
that page. This does not add translation/model services or change data purposes.
