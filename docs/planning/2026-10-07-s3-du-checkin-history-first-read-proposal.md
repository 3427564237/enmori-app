# S3-04 DU Check-in History First-Read Preparation

**Status:** Preparation proposal only; not an approved product/API/storage contract  
**Issue:** #48  
**Owner:** DU  
**Review requested:** LI  
**Baseline:** `main` at `f2d01a129ab4d409c5acb8027481f32b7afec7fe`  
**Prepared:** 2026-10-07

## 1. Purpose and scope

This packet audits the approved Note-only Check-in create and owner-only later-read flow, then proposes the smallest next read capability: a signed-in user viewing their own Check-ins for one selected calendar date.

It does not authorize or implement a history endpoint, Firestore query/index, schema or DTO changes, Check-in editing/deletion, Weather/location enrichment, Calendar/Footprint integration, social disclosure, or AI consumption. Those remain separately gated decisions and reviews.

## 2. Existing approved flow

The current OpenAPI contract provides:

- `POST /v1/check-ins`: Note-only create, authenticated principal, idempotency key, server-owned creation time; create/replay responses are documented.
- `GET /v1/check-ins/{checkInId}`: a separate owner-only later read using an opaque ID. Missing and non-owned records are intentionally indistinguishable (`CHECKIN_UNAVAILABLE`).
- The current Check-in response includes the opaque `checkInId`, Note, UTC `createdAt`, and may include the creation-time `checkInVisibility` snapshot.

The approved RMVP-01A contract keeps the create path Note-only. The PR #50 decision preserves the visibility value captured at creation for that record; it is metadata, not permission to disclose the Check-in to another user. No list-by-date/history route is present in the baseline OpenAPI.

**Conclusion:** the existing create and owner-by-ID read can remain unchanged. A date-history read is a distinct, not-yet-approved contract.

## 3. Minimum first-read proposal

### Product behavior

1. Require an authenticated user. Derive ownership from the verified principal; never accept an owner/account ID from the client as authority.
2. Read only that user's non-deleted Check-ins for one explicitly selected date.
3. Return a compact list sufficient for the user's own history: opaque navigation ID, UTC creation timestamp, and Note. Do not add optional fields merely because another requirement mentions them.
4. Render timestamps in the selected calendar's agreed time zone. Keep the source timestamp in UTC.
5. Return an empty list for a date with no visible records. Do not distinguish “no records” from records that the caller is not allowed to see.
6. Keep failures generic and actionable; do not return another user's identifiers, existence, storage paths, or raw repository/provider messages.

### Candidate date and ordering semantics (decision required)

**Recommendation for discussion:** the client supplies a civil date (`YYYY-MM-DD`) and an IANA time-zone identifier for the calendar view. The service validates both and interprets the selected date as the half-open interval between local midnight at the start of that date and local midnight at the next date, converted to UTC. This handles daylight-saving transitions without assuming every date is 24 hours.

The stored `createdAt` remains UTC. The UI formats it in the selected time zone. The current contract does not define which time zone is authoritative; LI/PM must decide whether this is device-local, a future account preference, or another explicit product rule before an API is designed.

**Candidate ordering:** newest `createdAt` first, with a deterministic opaque-ID tie-breaker. The tie-break direction and whether exact timestamp ties are possible need LI confirmation.

### Bounded result proposal (decision required)

If a single date can exceed the agreed response bound, use bounded pages with an opaque cursor tied to the query date/time zone and a stable snapshot boundary. Do not expose Firestore paths or raw document IDs as cursors. The page size, cursor lifetime, snapshot consistency, and whether paging is needed for the first release are open decisions; no values are approved here.

### Empty, loading, and error states

- Loading: show a date-scoped loading state without implying that no records exist.
- Empty: show a neutral “no Check-ins for this date” state.
- Auth required: use the existing authentication handling.
- Invalid date/time zone: return a stable validation error without echoing untrusted values.
- Network/service failure: retain the selected date and allow retry; never silently turn a failed request into an empty result.
- Ownership/missing semantics: preserve the existing fail-closed, non-enumerating behavior for individual Check-in reads. A future history query must not reveal other users' records.

Exact endpoint and error-code mapping require API-owner approval.

## 4. Privacy, deletion, and consistency

- Scope the query to the authenticated owner on the server; ownership is not a client filter.
- Treat deletion and privacy/consent revocation as authoritative. A record no longer eligible for this user must not reappear through a cached page or stale cursor.
- Do not create a secondary history copy or broaden retention. The existing source record remains authoritative.
- A page cursor must not bypass a later permission or deletion check. Whether reads require a snapshot boundary, revalidation per page, or both is an implementation decision for the approved contract.
- The `checkInVisibility` snapshot does not grant Friend Activity, public, or other-user read access.
- No saved-edit capability is implied; `checkin-edit` remains Prototype Evidence Only / Pending Authority.

## 5. Consumer and projection boundaries

### Calendar and Footprint

The first read is proposed for the signed-in user's own selected-date history. Calendar/Footprint presentation may consume that own-history result only after the date/time-zone semantics and UI contract are approved. This packet does not authorize map points, location data, or a new Calendar/Footprint endpoint.

### Friend Activity / JIN

No Note or Check-in projection to another user is authorized by this own-history proposal. A stored visibility snapshot alone is insufficient. Any Friend Activity read requires an explicit purpose-specific contract covering visibility, friendship, blocks, consent, deletion, and the minimum fields. Until approved, third-party Check-in/Note access remains unavailable and Pending.

### AI / ZHOU

The history response must not be forwarded wholesale to AI. Q17 is a separate, backend-only, consent- and purpose-gated conversational projection: after authentication, consent, deletion, eligibility, and time-window checks, at most the five newest eligible items within the rolling seven-day window; only the approved minimized fields may be projected. It excludes IDs, storage paths, provider payloads, temperature, location, and arbitrary maps. This preparation adds no AI access and does not change Q17.

### Optional Weather, Activity, and location

The current RMVP-01A Check-in is Note-only. Weather is optional backend enrichment under Q13 and must not block creation. Activity and Approximate Location require their own approved source and display permissions. None is required for the minimum own-history read proposed here. Do not add a Flutter provider dependency or make the existing create flow depend on these sources.

## 6. Candidate consumer list

| Consumer | Candidate use | Current authority |
|---|---|---|
| Signed-in user / Check-in history | Read own selected-date summaries | Proposal; date-history API not approved |
| Calendar / Footprint | Present the user's own date-scoped records | Product/UI and integration details require approval |
| JIN / Friend Activity | Cross-user Check-in or Note projection | Not authorized; Pending |
| ZHOU / AI | Separate minimized conversational context under Q17 | Existing separate contract only; this proposal grants no access |
| Weather / Activity / Approx Location | Optional enrichment or display | Separate source/permission contracts; excluded from minimum read |

## 7. Decisions requested from LI/PM

1. Confirm the intended calendar time-zone authority and local-date-to-UTC interpretation.
2. Confirm whether the minimal own-history response is limited to ID, UTC timestamp, and Note, and whether any already-authorized optional fields are in scope.
3. Decide whether a bounded page is necessary for the first slice; if so, approve a product-level bound and cursor behavior before physical design.
4. Confirm the required deletion/revocation consistency visible across pages and cached UI.
5. Confirm whether Calendar and Footprint are consumers of the same own-history contract or require distinct purpose-specific projections.
6. Keep Friend Activity and AI access explicitly separate; confirm no cross-user projection is part of S3-04.
7. Identify the API/backend owner and the approval needed before any OpenAPI, DTO, query, index, or storage change.

## 8. Readiness and next step

The smallest authorized next step is LI review of this proposal and PM resolution of the decisions above. After approval, the API/backend owner can produce a separate exact contract and implementation proposal; it should receive its own review before code or storage changes.

No implementation, runtime, Android, Emulator, or product-flow tests were run for this document-only preparation. This packet does not claim those checks passed, and it does not mark Issue #48, Calendar, Footprint, UAT, Release, or Sprint acceptance complete.

## Sources reviewed

- `api/openapi.json` on the stated baseline: current Check-in create and owner-by-ID read contracts.
- `docs/decisions/2026-09-03-rmvp-01a-contract-approval.md`: approved RMVP-01A boundary.
- `docs/superpowers/specs/2026-09-03-rmvp-01a-refinement-contract-r2-preview.md`: Note-only R2 scope and exclusions.
- `docs/decisions/2026-08-31-pm-requirements-decisions.md`: C3-C6 product requirements; physical read contract remains to be decided.
- `docs/decisions/2026-09-02-production-weather-contract.md`: Q13 optional Weather boundary.
- `docs/decisions/2026-09-01-recommendation-ai-field-allowlists.md`: Q17 purpose-specific AI allowlist.
- `docs/PROJECT_CONTEXT.md`: lifecycle, permission, deletion, and consumer boundaries.
