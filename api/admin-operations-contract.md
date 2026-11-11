# Bounded Admin operations — 11 November 2026

Authority: [LI's confirmed decision](../docs/decisions/2026-11-11-li-admin-value-integration.md) accepts the [reviewed implementation contract](../docs/planning/2026-11-11-admin-value-contract-proposal.md). That retained contract defines the exact behavior, storage and 30-day retention exception. `openapi.json` defines the wire schemas. This document locates the implemented boundaries; it grants no additional product or deployment authority.

## API and privacy

Every new route authenticates the existing bearer identity, checks the current enabled Firebase user's exact `enmoriAdmin === true` claim, rejects unknown fields and uses `Cache-Control: no-store`:

| Operation | Route |
| --- | --- |
| Read passive status | GET `/v1/admin/operations-status` |
| Read/create categories | GET/POST `/v1/admin/event-categories` |
| Rename/deactivate/restore one category | PATCH `/v1/admin/event-categories/{eventCategoryId}` |
| Read/assign/clear one existing Event classification | GET/PUT `/v1/admin/events/{eventId}/category` |
| Read recent committed changes | GET `/v1/admin/operation-records?cursor=...` |

Category revisions, Unicode name validation, independent name uniqueness and inactive references follow Q12. The assignment revision starts at zero and survives clearing as a tombstone. New assignments require an active category in the same transaction. Existing provider `categoryLabel`, source identity, participation, interest matching and recommendation order remain unchanged. The optional `managedCategory` projection is resolved after existing Event authorization; lookup failure produces unavailable, never fabricated empty classification.

Interest and Event Category effective mutations, and assignment changes, append one allowlisted operation record in the same transaction. A failed audit append aborts the mutation. Transaction retries reuse the operation identity. No-op, denied and failed attempts do not appear as committed. Actors come from verified identity; no names, content, emails, request bodies, private-reference details or historical actors are invented. Connected permanent deletion remains closed, and future deletion proof must include both assignments and retained operation records.

## Status and retention

Status reads never dispatch model/provider work. Backend maintenance and Firebase identity evidence apply to the current request/service instance only. AI reports existing admission/maintenance readiness, not successful generation. Providers use actual observations; unseen and older-than-five-minute observations are unknown. onePA catalogue/index/row cache hits cannot refresh an upstream-success timestamp. Restart loses these process-local observations.

Operation records expire at exactly 30 × 24 hours. Reads enforce expiry independently of cleanup and use 50-item live pagination. Startup/hourly bounded cleanup removes at most 1,000 expired records per cycle. An incomplete/failed cycle marks maintenance unavailable. This implementation and Emulator checks do not prove the real-runtime physical-cleanup SLA.

## Client and rollout boundary

The current client decodes the optional managed classification separately from provider text. UI capability remains a navigation hint. Independent readback is required before confirming a write; uncertain writes cannot be replayed by capability refresh or a failed read. Session replacement discards old data/drafts and invalidates pending dialogs. Returning from classification refreshes the owning detail.

The extension uses the current version-3 Event response shape. Older strict version-3 APK readers do not accept a populated `managedCategory` field. A deployment must coordinate updated APK distribution **before the first real classification assignment**; no real association is created by implementation or tests. Older contracts without the version-3 header retain their legacy projection. This is a rollout constraint, not permission to deploy or modify existing accounts.
