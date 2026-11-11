# Admin value increment — concrete contract proposal

Status: **Approved by LI on 11 November 2026**, selecting “按此方案实现并入（推荐）”. The original proposal below is retained as the reviewed contract. Approval is not implementation or verification evidence.
Date: 11 November 2026, Asia/Singapore.
Direction: [LI's implementation/integration request](../decisions/2026-11-11-li-admin-value-integration.md).
Baseline: demo-ready `a5491dde`; preserve the v61 product source and existing Interest management.

## 1. User-visible result

Profile's authorized Admin entry opens a small administration home with Runtime status, Interest tags, Event categories, and Operation records. Existing Interest actions remain available. Use current Flutter theme, Chinese/English strings, ordinary navigation, accessible text labels, safe areas and loading/error/empty states.

Runtime status is read-only. It reports the current service instance's observed status; opening the page must not generate AI replies, scrape Event sources, restart services, alter configuration, or incur a new paid model request. No data yet means “Not observed”, not “Healthy”.

Event categories support list/search, create, rename, deactivate and restore. The recommended addition is explicit classification of an already existing, currently accessible Event: an Admin selects a category or clears the association. Category names and source category text are shown separately. This association is a proposed extension requiring LI's decision, because the current Event implementation has only provider `categoryLabel` strings and no ENMORI category identity.

Operation records show recent committed catalogue changes and Event-classification changes. They do not show ordinary users' journals, conversations, Persona content, private references, or credentials.

## 2. Authorization and general protocol

All new Admin routes require the existing verified bearer identity, revocation handling, enabled Firebase user and fresh exact `enmoriAdmin === true` check on every request. Reuse the existing capability response only as a navigation hint. It does not grant permissions. Refresh/revoke/session-replacement handling must clear stale Admin screen data and reject late responses.

All new responses use `Cache-Control: no-store`. Unknown request keys are rejected. IDs and timestamps are server-authoritative; existing UTC ISO 8601 timestamp, bounded identifier, safe error-envelope and request-ID conventions apply. Existing 400 REQUEST_INVALID, 401 AUTH_REQUIRED, 403 AUTH_FORBIDDEN, 404 CATALOGUE_NOT_FOUND, 409 catalogue conflicts, 412 CATALOGUE_REVISION_PRECONDITION_FAILED, 422 CATALOGUE_INVALID and 503 SERVICE_UNAVAILABLE semantics are reused. Event lookup retains its existing unavailable response and access rules.

No dependency, index, migration, external logging vendor, hosting arrangement, service supervisor, role hierarchy or recommendation formula is added. A discovered need for one must be reported before adoption.

## 3. Runtime status contract

Proposed route: `GET /v1/admin/operations-status`, no body/query.

Response: `{observedAt, services:[{service, configured, state, lastObservedAt?, lastSucceededAt?, reason?}]}`.

- `service`: `backend`, `firebase`, `ai`, `ticketmaster`, or `onepa`.
- `state`: `ready`, `unavailable`, `unknown`, or `disabled`.
- `reason`: optional `not_configured`, `not_observed`, `stale_observation`, `dependency_unavailable`, or `maintenance_unavailable`; never raw exception text.
- `observedAt` is the trusted Backend response time. Other timestamps refer to actual observations, not page opening. Backend/Firebase evidence describes only the observed request/connection boundary, never all operations.
- AI readiness is the current existing runtime admission/maintenance signal, explicitly labelled readiness rather than successful generation. A missing AI observation cannot be synthesized from configuration alone. Last-success time, when present, comes only from a completed successful operation and contains no user/content linkage.
- Provider observations come from actual settled source reads. No startup `available:true` default is treated as a real observation. Failed, cancelled, skipped and cached reads must not fabricate a successful provider probe. Observations older than five minutes yield `unknown/stale_observation`, while the last timestamps remain labelled as historical.
- Keep only each service's latest non-content observation and latest success in process memory. Restart clears them. This is one service instance, not aggregate monitoring across replicas or environments.
- Manual page refresh rereads these observations. No automatic polling or external probe is added.

## 4. Event Category catalogue contract

Proposed routes follow the approved Interest lifecycle:

| Route | Request | Success |
| --- | --- | --- |
| GET `/v1/admin/event-categories` | No body/query | 200 `{eventCategories:[{eventCategoryId,displayName,lifecycleState,revision}]}` |
| POST `/v1/admin/event-categories` | `{displayName}` | 201 `{eventCategory:{eventCategoryId,displayName,lifecycleState:"active",revision:1}}` |
| PATCH `/v1/admin/event-categories/{eventCategoryId}` | `{expectedRevision,displayName}` **or** `{expectedRevision,lifecycleState}` | 200 `{eventCategory:{...}}` |

Approve the same complete-small-catalogue read exception as Interest management, including active and inactive values and stable ID ordering. Names use the existing Q12 Unicode validator and normalizer; uniqueness is independent from interests and includes inactive categories. Creation uses server-generated `cat_`-prefixed UUID identities and atomic name reservations. The client sends a create once, preserves uncertain results and requires independent readback; it never automatically replays an unknown create.

Proposed Firestore records:

- `event_categories/{eventCategoryId}`: exactly `displayName`, `lifecycleState`, `revision`.
- `event_category_names/{sha256(comparisonKey)}`: exactly `comparisonKey`, `eventCategoryId`.

Existing Interest storage is unchanged. Rename/lifecycle operations check expected revision before no-op handling; effective changes increment once. Catalogue records and name reservations are read and mutated in the same transaction. Inactive categories retain references but reject new assignment. Restore preserves the identity.

Permanent deletion stays unavailable for this increment, matching the existing real-data Interest gate. The new audit and assignment records add retained references, so they must be included in any future deletion proof. No direct-database deletion workaround or misleading Delete button is introduced.

## 5. Recommended Event association extension

The catalogue alone would not change the categories displayed on existing provider Events. To deliver useful classification, propose these additional operations and their narrowly bounded storage:

| Route | Request | Success |
| --- | --- | --- |
| GET `/v1/admin/events/{eventId}/category` | No body/query | 200 `{eventId,revision,eventCategoryId?,displayName?,lifecycleState?}`; revision 0 means never assigned |
| PUT `/v1/admin/events/{eventId}/category` | `{expectedRevision,eventCategoryId}` to assign; `{expectedRevision}` to clear | 200 same envelope after committed mutation |

An Admin selects an Event through the existing accessible Event list/detail flow, not an arbitrary unverified ID or copied private record. The Backend must validate the currently accessible Event identity through the existing source boundary. No provider availability failure becomes an implicit unassignment.

Proposed `event_category_assignments/{eventId}` stores exactly `revision` and optional `eventCategoryId`. Clearing leaves a revisioned empty association to prevent an ABA race. It does not delete or change the source Event. New assignments read and require an active category in the same transaction; retaining the identical inactive category is permitted. Stale revisions reject before no-op handling.

Existing `categoryLabel` remains the provider's text. Add optional `managedCategory:{eventCategoryId,displayName,lifecycleState}` to the relevant Event browse/detail DTOs and display it with a distinct “ENMORI category” label. Resolve the current catalogue name on reads; no duplicated category names are stored in Event records. Preserve Interest matching, recommendation ordering, source identity, source links, participation and visibility. A failed association lookup is an explicit unavailable read, not a fabricated empty association.

This proposal does not add Event creation, cancellation, bulk classification, import, a provider-category mapping system or automatic reassignment.

## 6. Limited operation records and retention amendment

Proposed route: `GET /v1/admin/operation-records?cursor=...` returns `{records:[...],nextCursor?}`, newest first, 50 records per page. The optional opaque base64url cursor contains only validated last server time and audit ID, has a bounded canonical format, and never conveys authorization. Reads reauthorize and enforce expiry regardless of cursor. This is live pagination, not an immutable historical snapshot.

Proposed `admin_operation_records/{serverGeneratedUuid}` fields:

- `occurredAt`, `expiresAt`;
- `actorAdminUid` derived from the verified principal;
- `targetType`: `interest_tag`, `event_category`, or `event_category_assignment`;
- `targetId`;
- `operation`: `create`, `rename`, `deactivate`, `restore`, `assign`, or `clear`;
- optional `beforeRevision` and required `afterRevision`;
- `result: "committed"`.

The API record adds `recordId` and exposes only this allowlist. It does not store names, request bodies, IPs, email addresses, private reference identities/counts, changed private content or raw errors. Display the verified Admin identifier without looking up or exporting a user's private Profile. The UI explains that these are committed changes, not a complete log of attempted operations. No-op requests create no record. Failed/denied requests continue through approved sanitized operational error handling and do not produce fake committed records.

Write each effective catalogue/association mutation and its operation record atomically in the same Firestore transaction. If the record cannot commit, the mutation cannot be reported as committed. Transaction retries reuse one server event identity; they cannot multiply history entries. Older unaudited records are not backfilled with invented actors/times. Existing Interest endpoint DTOs remain compatible.

Proposed new retention purpose: **30 × 24 hours from trusted `occurredAt`**. At `now >= expiresAt`, the record is immediately inaccessible. Cleanup runs in bounded batches at service startup and hourly through the existing application lifecycle; no new scheduler service is introduced. Target physical cleanup is within 24 hours, and real-runtime scheduler evidence must be separately established before claiming that SLA. Failed cleanup is surfaced as degraded Admin maintenance; it does not expose expired records or break non-Admin features.

Approval would supersede Q12-D's retained-catalogue-audit exclusion **only** for this allowlisted, expiring record. Q14 configuration/version and account-request retention remain unchanged. These records cannot become usage analytics, private-reference inspection or full entity version history.

## 7. Verification and integration

Use the repository's existing Node/TypeScript/Fastify/Firebase/Flutter toolchain without package changes. Cover current/revoked/disabled Admin authority, ordinary-user denial, cross-session late responses, exact DTO/error/OpenAPI consistency, Unicode conflicts, equal-revision races, inactive assignments, atomic audit failure, retry duplication, expiry boundaries, pagination validation and cleanup failure. All mutation/concurrency/retention tests use resettable fake or guarded Emulator data, never existing demo/user records.

Verify the status page cannot invoke providers/models or leak errors and that it distinguishes unseen/stale/readiness observations. Check category and record screens in Chinese/English, small screens, large text, keyboard and dark/light themes. Run relevant Backend/Flutter suites and strict analysis; compare any inherited failures rather than hiding them. Produce a signed compatible Android APK using the established build path, preserving existing data when a separately authorized installation occurs.

Local integration target: the current `souma/demo-ready-20261111` development line, after rechecking its new commits and dirty files. Preserve all intervening work. No remote `main` merge, teammate message, new Admin role grant, real catalogue/association write, paid model probe or new infrastructure is included in this proposal.

After implementation and local verification, present exact commit/diff, tests and artifact for the final deployment/install step; deployed service and phone verification must not be claimed from source tests alone.

## Decision requested

Approve this bounded contract, including the explicit Event association extension and 30-day limited audit exception, for implementation and local integration; or identify the fields/behavior to change. Once approved, record the confirmation in `docs/decisions/` before changing normative API or Backend product code.
