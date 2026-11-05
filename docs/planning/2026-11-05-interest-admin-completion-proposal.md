# Interest administration completion proposal

Status: **approved by LI on 5 November 2026**; [confirmation record](../decisions/2026-11-05-li-ai-latency-admin-polish.md#confirmed-interest-management-extension).
Retained original proposal below. This is not authority to deploy, grant Admin rights, or mutate real
catalogue data. Prepared against v55 source `69f05699` for the 5 November request
to improve Admin and AI response time.

## Decision requested

Approve one complete Interest administration increment using the existing
Flutter/Fastify/Firebase stack: management read, rename, deactivate, restore and
reference-protected permanent deletion, with independent readback and current
Admin checks. Retain the existing create operation. Use the concrete API and
storage mechanism below, without new dependencies or a general administration
framework. If the reference inventory cannot be verified complete, complete the
other operations and keep permanent deletion unavailable rather than weaken Q12.

This extends the single-create implementation boundary in the
[19 October decision](../decisions/2026-10-19-li-core-feature-delivery.md) and
[21 October assignment](../handoff/2026-10-21-parallel-completion/zhou-admin.md),
and the frontend-only boundary in the
[4 November increment](../decisions/2026-11-04-li-nonai-admin-insights.md), only
for this Interest increment. It preserves the wider
[C2 scope](../decisions/2026-08-31-pm-requirements-decisions.md) and all
[Q12 catalogue semantics](../decisions/2026-09-02-interest-tag-event-category-contract.md).

## Product rules already decided

Q12 already requires stable typed IDs; Active → Inactive → permanent deletion
with restoration only before deletion; inactive references and labels retained;
new inactive assignments denied; rename allowed in either state; atomic Unicode
name uniqueness including inactive entries; expected-revision validation before
no-op handling; and permanent deletion only when inactive and free of every
required live or retained reference. No cascade, bulk action, private reference
count/details, role self-assignment, or direct account action is introduced.

## Proposed API contract

All management routes require verified bearer identity followed by a fresh
server-owned `enmoriAdmin === true` and enabled-user check. Every outcome uses
`Cache-Control: no-store`. Existing safe error envelopes and auth ordering apply.

| Operation | Proposed request | Successful response |
| --- | --- | --- |
| Management catalogue | `GET /v1/admin/interest-tags`, no body/query | `200 {interestTags:[{interestTagId,displayName,lifecycleState,revision}]}`, active and inactive, stable ID ordering |
| Create | Existing `POST /v1/admin/interest-tags {displayName}` | Existing `201 {interestTag:{interestTagId,displayName,lifecycleState:"active",revision:1}}` unchanged |
| Rename | `PATCH /v1/admin/interest-tags/{interestTagId} {expectedRevision,displayName}` | `200 {interestTag:{interestTagId,displayName,lifecycleState,revision}}` |
| Deactivate/restore | Same PATCH route, `{expectedRevision,lifecycleState:"inactive"|"active"}` | Same current-item envelope |
| Permanent delete | `DELETE /v1/admin/interest-tags/{interestTagId} {expectedRevision}` | `204`, no body |

PATCH permits exactly one of `displayName` and `lifecycleState`; it never combines
two mutations. `expectedRevision` is the previously read positive safe integer,
consistent with existing catalogue storage. Effective changes increment once;
no-ops retain the revision after checking the precondition. Unknown keys, client
IDs inside bodies, actor fields and authoritative replacement revisions fail
validation. The public active-only `GET /v1/interest-tags` is unchanged.

Keep the existing boolean capability DTO unchanged for old clients. Its true
value already denotes the same current Admin role; only this newly approved
client slice would use it as a navigation hint for the expanded page. Every
management operation still checks real current authority independently.

Map Q12 semantic errors to explicit existing-style public codes:
`CATALOGUE_NOT_FOUND` 404, `CATALOGUE_NAME_CONFLICT` 409,
`CATALOGUE_REFERENCED` 409, `CATALOGUE_STATE_CONFLICT` 409,
`CATALOGUE_REVISION_PRECONDITION_FAILED` 412 and `CATALOGUE_INVALID` 422.
Preserve 400 `REQUEST_INVALID`, 401 `AUTH_REQUIRED`, 403 `AUTH_FORBIDDEN` and
503 `SERVICE_UNAVAILABLE`. A referenced failure reveals no record identity,
owner, count, or private content. A repeated successful delete returns 404.

## Proposed storage and consistency mechanism

Reuse `interest_tags/{id}` with its existing `displayName`, `lifecycleState` and
`revision`, and `interest_tag_names/{sha256(comparisonKey)}`. No rewrite of existing
IDs, reference values or histories is proposed. Current create already reads
the small active/inactive catalogue within a Firestore transaction to cover
legacy items lacking name reservations. Rename keeps that guard, validates the
old reservation before removing it if present, and claims the new key atomically.

Read the item and expected revision inside the mutation transaction before
changing it. Deactivate/restore alter only lifecycle state and revision. Existing
owner-selection writes already read each selected catalogue item in their
transaction and reject new inactive references; retain this boundary.

The current repository stores Interest references in
`account_interests/{accountId}.interestTagIds` and `events/{eventId}.interestTagIds`.
Before enabling deletion, verify the complete physical reference inventory
against all approved retained records and every producer in the assembled
runtime. Do not assume that these two collections exhaust a deployed database
merely because they are the current source matches.

For the verified small MVP inventory, perform complete reference reads in the
same transaction as the inactive/revision check, then delete the item and its
matching name reservation. Reference creators must read/validate the catalogue
item inside their own transaction, so a concurrent lifecycle change/delete
cannot leave a dangling reference. An incomplete scan, invalid stored record,
unknown producer, exceeded transaction limit, or failed dependency closes the
delete path. No cache, out-of-transaction zero count, or migration is a deletion
proof. If complete safe scans require a new index/reference registry or data
migration, that choice requires a separate concrete decision; it is not silently
included here.

## UI and validation

Extend the existing page with Active/Inactive/All filtering and per-item rename,
deactivate/restore and guarded permanent-delete actions. Display the stable ID;
keep names and drafts after failure; re-read on stale revisions; never
automatically replay an unknown mutation. Show success only after independent
management readback. Permanent delete needs an explicit irreversible-action
confirmation and is shown only after the verified Backend path exists. Preserve
session replacement, capability loss, keyboard access and large text behavior.

Verify ordinary/disabled/revoked users, same-UID session replacement, duplicate
names, stale revisions including no-ops, inactive retained selections, concurrent
assignment/deletion, failed/unknown writes and independently confirmed readback.
Use isolated fixtures/emulators. Real Admin claim grants, real catalogue
mutations, deployment and phone acceptance remain separate authorized actions.

## Wider C2 scope

Event Category CRUD needs its separate physical catalogue and actual Event
reference producer; external-provider category strings are not converted into
ENMORI categories. Recommendation Draft/Publish/history needs the approved
factor-registry producer and a version/publication contract. Pending Account
Action Requests need the auditable request/status/access/retention contract and
must never execute account actions directly. These are retained objectives,
not completed capabilities or dummy entries in this increment.
