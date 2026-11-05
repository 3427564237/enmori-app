# Interest administration management — 5 November 2026

Authority: [LI's confirmed execution decision](../docs/decisions/2026-11-05-li-ai-latency-admin-polish.md)
accepts the [concrete implementation proposal](../docs/planning/2026-11-05-interest-admin-completion-proposal.md).
This extends the former single-create implementation boundary, preserving all
[Q12 lifecycle, uniqueness, concurrency and privacy rules](../docs/decisions/2026-09-02-interest-tag-event-category-contract.md).
The normative wire schemas are in `openapi.json`.

## Identity, compatibility and routes

Verified bearer authentication precedes request validation. Every management
operation independently rereads the current Firebase user's enabled state and
exact boolean `enmoriAdmin` claim. `GET /v1/me/interest-tag-admin-capability`
retains its exact existing `{canCreateInterestTags:boolean}` response as a
navigation hint; it never authorizes a mutation. No role grant or direct account
action is added. All registered management responses set `Cache-Control: no-store`.

- `GET /v1/admin/interest-tags`: no query/body. Returns 200
  `{interestTags:[{interestTagId,displayName,lifecycleState,revision}]}` including
  active and inactive rows in stable ascending ID order. The small MVP catalogue
  is a complete transaction read, with no new cursor contract.
- `POST /v1/admin/interest-tags`: unchanged `{displayName}` and 201 creation
  acknowledgement. The new item is active with revision 1.
- `PATCH /v1/admin/interest-tags/{interestTagId}`: exactly
  `{expectedRevision,displayName}` or `{expectedRevision,lifecycleState}`.
  Lifecycle state is `active` or `inactive`; the two changes cannot be combined.
  Returns 200 `{interestTag:{interestTagId,displayName,lifecycleState,revision}}`.
- `DELETE /v1/admin/interest-tags/{interestTagId}`: exactly `{expectedRevision}`;
  204 with no body only when permanent deletion is actually committed. This
  operation is unavailable in connected composition until its complete physical
  reference inventory is separately verified as described below.

Revisions are positive safe integers read from the Backend. Each effective
change increments once. Expected revision is checked before no-op determination;
an accepted no-op returns the same revision. IDs never change during rename or
state transitions. The ordinary `GET /v1/interest-tags` remains active-only;
existing inactive selections retain their readable label and may be removed.

## Failure and recovery

`CATALOGUE_NOT_FOUND` 404 covers absent/deleted/wrong-type identities.
`CATALOGUE_NAME_CONFLICT` 409 includes active and inactive Unicode comparison
keys. `CATALOGUE_REFERENCED` 409 reveals only that a required reference remains;
no owner, reference count or record identity is returned.
`CATALOGUE_STATE_CONFLICT` 409 rejects permanent deletion while active.
`CATALOGUE_REVISION_PRECONDITION_FAILED` 412 requires rereading before a new
deliberate mutation. `CATALOGUE_INVALID` 422 covers name/domain validation.
Existing 400/401/403/503 request, authentication, authorization and dependency
envelopes remain. A repeated successful permanent delete returns 404 and has no
new effect. Unknown writes are never automatically replayed; keep the draft and
independently reread the catalogue before another deliberate action. A local
matching name does not prove the original create succeeded.

## Physical inventory and atomicity

Management reuses `interest_tags/{id}` (`displayName`, `lifecycleState`,
`revision`) and `interest_tag_names/{sha256(comparisonKey)}` (`comparisonKey`,
`interestTagId`). Rename reads the entire current small catalogue and both
relevant name reservations inside the same transaction. This includes legacy
unreserved rows, detects duplicate normalized names and rejects corrupt
reservations. It removes an old reservation only when its stored owner/key match
the changed item; no ID or existing reference is rewritten.

The verified isolated MVP reference inventory is:

| Stored reference | Producer/read boundary |
| --- | --- |
| `account_interests/{accountId}.interestTagIds` | `FirestoreInterestRepository.replaceOwn`; every new assignment reads current active catalogue state in the same transaction. Existing inactive references remain permissible. |
| `events/{eventId}.interestTagIds` | Approved S2 stored Event records and isolated fixtures. All rows count, including past, inactive and unpublished Events. The connected runtime has no public Event write route. |

Current Check-in records, AI message/source receipts and Event participation
records do not store typed Interest catalogue identities. Recommendation DTOs and
external-provider category mappings are transient projections, not new durable
reference collections. This source inventory is not by itself proof that an
arbitrary deployed database has no earlier or additional reference producer.

The deletion adapter therefore requires an explicitly injected
`VerifiedInterestReferenceInventory`. The concrete isolated MVP checker reads
both complete collections inside the deletion transaction, rejects malformed or
unknown record shapes, and exposes only clear/referenced/unavailable internally.
The inactive-state check, expected revision, complete reference inspection,
matching reservation removal and item deletion share that transaction. Concurrent
reference creation must read the same catalogue record, preventing a successful
delete from leaving a newly committed dangling reference.

All connected runtime compositions deliberately omit this inventory proof.
DELETE consequently returns 503, and the connected client keeps permanent-delete
controls unavailable. No new public capability field or environment flag is
introduced. Isolated tests explicitly construct the verified checker after
resetting their own demo-only dataset. Enabling deletion for real data requires
checking the deployed producers and retained schema inventory; if a reference
registry, index or migration is necessary, a separate concrete decision is still
required. Rename, deactivate, restore and management reads are fully wired
alongside existing creation in the controlled, retained and Azure-backed paths.

Event Category, recommendation configuration and pending account requests retain
their wider C2 direction and are not claimed as delivered by this Interest slice.
