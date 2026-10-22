# EP1 — Event participation physical contract

Authority: S-PM-1020-LI-EVENT-PARTICIPATION, approved P01–P06 including P05
delegation. Base900ca6f. This selects only the delegated Event implementation
details; existing Sponsor/PM source/privacy rules remain controlling.

## HTTP

Authenticated completed-owner routes, no-store, exact object schemas. Identity
comes only from the verified bearer principal. No Idempotency-Key is accepted.

- GET/PUT `/v1/events/{eventId}/participation`: GET `{participation}`; PUT exact
  `{status, ignored, expectedRevision}`. `status=none|interested|going`, ignored
  boolean, revision integer0..9007199254740991. Response participation exact
  `{eventId,status,ignored,revision}` plus updatedAt UTC when persisted. Missing
  record is none/false/revision0 without fabricated timestamp.
- GET `/v1/events/{eventId}/participants?status=interested|going&group=friends|others[&cursor=...]`:
  `{items:[{username,displayName?}],countState:exact|unavailable,visibleCount?,nextCursor?}`.
  Owner excluded. Each page freshly authorizes every row. No UID/accountId,
  ignored, private revision or timestamp. A cursor continues, even after an empty
  filtered page; no cursor is the only end marker. Counts never mean page length.
- GET `/v1/me/event-participations[?cursor=...]` returns own records including
  none/ignore tombstones so all owner views use the same facts.
- GET `/v1/users/{username}/event-participations[?cursor=...]` returns only
  currently authorized interested/going `{eventId,status}` rows. Unavailable
  source content is omitted, not reconstructed from participation data. This
  permission does not authorize any other profile field. Username is canonical,
  immutable public locator. Missing/ineligible/blocked target ->404.

Shape/unknown query/header/cursor400 REQUEST_INVALID; invalid scalar/state or
noncanonical stable ID422 EVENT_PARTICIPATION_INVALID; stale expectedRevision412
EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED; source absent404 EVENT_UNAVAILABLE;
existing authentication/onboarding/dependency errors retain existing safe envelope.
Authenticate precedes request validation. Schema validates shape/types; application
validates values. Unknown write result and412 must first read; no automatic replay.

## Persistence and transactions

One collection `event_participations`, ID lowercase SHA256(JSON.stringify([accountId,eventId])).
Exact fields `{accountId,eventId,status,ignored,revision,updatedAt}`. IDs canonical
safe internal Event IDs (1–128 ASCII alphanumeric/underscore/hyphen); tm_ browse
locators specifically rejected. Existing sourceEventId result remains canonical.
No title/link/image/description/time from provider is copied. Clock server-owned.
Missing record revision0; version is compared BEFORE no-op check. A true no-op
does not write or increment; valid change increments once. none/revision tombstone
retained to prevent stale resurrection. Current interested/going selection clears
ignored. A direct contradictory status-change+ignored=true is422. Ignore changes
alone preserve participation; cancellation preserves the requested existing ignore
flag. Missing-record no-op does not manufacture a tombstone.

New record with a change, switch into interested/going, or first ignored=true
requires an existing current source occurrence. Existing read, cancellation and
unignore do not contact the provider. Source expiry/refresh/removal never deletes
facts. Source availability is checked inside the transactional command, before
staging writes; unavailable source does not mutate. No autonomous cleanup.

Each repository operation is one transaction for own account binding, facts and
current participant access seam. The injected access factory is bound to that
same transaction; Bootstrap adapts existing account/profile and friendship readers.
No cross-feature Infrastructure import in inner layers or duplicate friend writes.

## Pagination, query limits and privacy

Order is document-ID ascending (opaque digest), versionEP1. Raw read chunks21;
each response processes at most20 raw records, so sparse authorized pages are
allowed. nextCursor refers to last processed digest, not a mutable snapshot.
Only one bounded21 raw query per page, no fill-until-full. Independent count scan
reads at most201 records (chunks<=21), authorizes at most200; >200 ->countState
unavailable and visibleCount omitted. <=200 fully scanned ->exact authorized count.
Count includes only requested status/group and excludes owner. Every response
re-reads current profile visibility, participation privacy, friendship/block and
eligibility; no cached authorization survives a cursor. Display name omitted when
profile visibility forbids it; username alone is sufficient.

Cursor: unpadded canonical base64url of JSON `[1,scopeDigest,lastDigest,signature]`.
scopeDigest=SHA256(JSON.stringify([requesterAccountId,eventId/status/group or owner
query scope])). Signature=HMAC-SHA256 of first3 items using injected >=32-byte
private key. No plaintext UID/accountId, no cursor authority, no client-selected
scope. Reject altered scope, bad signature, padding, trailing fields, oversize>512.
Key is supplied by host composition, not generated per request or embedded in Git.

Index: eventId/status/__name__ ascending composite for participant query; existing
automatic accountId single-field ascending index (with implicit document-ID tie
break) for owner/profile queries. No redundant owner composite. A permanently
deleted account must delete its matching rows through the existing account deletion
owner; expose a bounded cleanup seam but do not invent/enable an account deletion
executor or claim it ran. Normal restart retains facts.

## Composition and rollout

Repository is real FirestoreGateway-backed code, tested against handwritten
gateway and isolated Emulator where available. Feature route registration is
explicit; default ordinary/real-account bootstrap remains unchanged. LI wires the
feature alongside the existing controlled source and trusted access factory.
Recommendations may inject ignored filtering only, with existing Music matching,
ordering and consent behavior unchanged. Browsing remains manual for rejected
consent. No external booking confirmation is inferred from browser return; explicit
Yes is the user's declaration to save Going. ZHOU independently reviews SHI.
# EB2 next-batch supplement — 20 October PM extension

Source: PR #165 decision `2026-10-20-li-event-batches-friends-activity.md`
at `7e802c6215f8f3967ea220807083619f6c66adfc`. This locally supersedes
the former first-batch-only/no-query exclusion, not recommendation rules.

`GET /v1/event-browse?cursor=<opaque>` accepts exactly one optional cursor;
detail still accepts no query. First request has no cursor. Successful batches
retain the existing scope literal for compatibility and add optional `nextCursor`;
absence means the end of the available source window, not the entire catalogue.
The server fixes SG, date ascending and 20 raw rows per batch; at most 50 batches
are available in a five-minute source window. No client provider page/key/filter.
The private HMAC-SHA256 position binds version, hashed current owner, exact UTC
`asOf` and next page. Invalid/expired/wrong-owner/duplicate cursors return existing
400 REQUEST_INVALID, dependency failures existing 503, authentication remains first.
No cursor or private key is logged. A key change invalidates existing positions.

Filtered-empty batches may still carry a next position. The client appends and
deduplicates by stable Event ID (legacy browse ID only when absent), retains the
usable list and same position on failure, locks duplicate clicks and clears all
rows/position on background, five-minute expiry or any observed session change.
Reload explicitly starts over; Next never implicitly calls the first page.
Source-only identity lookup for newly observed occurrences is bounded to 1,000
IDs/five minutes in process memory, no titles/provider documents persisted. New
participation rechecks current source detail; process loss/expired lookup fails
closed and requires a fresh list read. Cancel/unignore remain source-independent.

## Observed source display window — 22 October implementation

Under S-PM-1021-LI-PARALLEL-COMPLETION, existing `peek(eventId, asOf)` includes
successfully browsed pages in the current page-zero generation: 20 rows/page,
pages 0–49, at most 1,000 distinct IDs in process memory. Each later page replaces
its own earlier page atomically. Duplicate IDs have one identity, with page zero
taking display precedence. No auto-fetch, title archive, new storage/DTO field
or change to first-page-only recommendation candidates is introduced.

Later pages match the initialized generation's exact cursor `asOf` and never
extend its five-minute lifetime. Page-zero admission (even a failed refresh),
invalidation and disable clear observed display pages. Late/superseded/aborted
page reads cannot republish them. Failed later-page reads leave published pages
intact for explicit same-cursor retry. Cold cursor reads after process loss do
not initialize a title projection. Missing/expired/unobserved title stays
unavailable, not fabricated history or successful empty Detail. Source-current
selection, selectedAt, cancel/unignore and authorized participant paging remain.
