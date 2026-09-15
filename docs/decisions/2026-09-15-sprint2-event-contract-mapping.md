# Sprint 2 Event recommendation physical contract mapping

- **Source ID:** S-PM-0915-S2EVENT-MAPPING
- **Status:** Confirmed by LI HOURUI, ENMORI PM, on 2026-09-15
- **Scope:** Issue #28 / S2-02 minimum Event recommendation API, Firestore read mapping and isolated verification
- **Earlier sources retained:** S-PM-0913-SPRINT2, S-PM-0901-Q03, S-PM-0901-Q17 and S-PM-0902-Q12
- **Concrete proposal confirmed:** `docs/planning/2026-09-15-s2-event-data-mapping-proposal.md` at PR #33 head `035e78b0d78bd6ab5a62242420742421ce7b8895`, except the demonstration-execution choices explicitly deferred below

## Decision

The bounded Event recommendation contract in the linked proposal is approved for implementation. `GET /v1/recommendations/events` requires exactly one `view=home|all` query value and accepts no undeclared query parameters or client-selected identity, score, `asOf`, cursor or body. The success response contains only `asOf`, `formulaVersion` and `items`; an item contains only `eventId`, `title`, `startAt`, `endAt`, `matchedInterests` (safe `interestTagId` and `displayName`) and deterministic `reasonCode: "interest_match"`. An empty `items` array is a successful response. Event title and safe labels are presentation fields after deterministic ranking; no score, factor breakdown, protected reason or vendor/storage field enters the response.

`REQUEST_INVALID` maps to HTTP 400 with the safe message `Request parameters are invalid.` **only** for missing, duplicate, unknown or otherwise invalid Event recommendation query parameters. Existing Auth, onboarding, dependency and other endpoints' errors, including the Interest 422/412 cases, remain unchanged.

The physical Event record is `events/{eventId}`. Its document allowlist is `title`, `active`, `published`, `startAt`, `endAt` and `interestTagIds` as specified in the proposal; opaque Event identity comes from the document path, not a duplicate field. UTC/source validity follows the proposal, including valid UTC ISO 8601 instants ending in `Z`, up to nine fractional digits without millisecond truncation, `endAt > startAt`, and canonical case-sensitive, locale-independent opaque-ID tie ordering. Invalid source records do not become recommendation candidates. Existing verified UID/Auth Binding, completed Account and LI's own-Interest mapping remain the read and ownership boundary. No new Event mutation API, index, account field, Check-in field or recommendation history is approved.

SHI may proceed with static Fastify schemas, hand-maintained OpenAPI, the Firestore adapter/Port contract tests and isolated Auth/Firestore Emulator tests within this scope. Isolated synthetic Emulator fixtures may be used for verification. This confirmation does not approve a deployment, production write, general import, demo reset or physical Android execution.

## Deferred demonstration choices

The explicit isolated-demo project allowlist and named initialization manifest, including exact fixture IDs, require separate LI confirmation **before actual demonstration initialization/execution**. They do not block the current Transport, persistence or isolated Emulator work. The proposal's create-only/no-overwrite boundary remains controlling for any later approved demo initialization.

This decision fixes previously unspecified physical names and the narrow query error within S-PM-0913-SPRINT2. It does not supersede Q03 ranking, Q12 lifecycle, Q17 data minimization, Backend architecture or independent-review requirements. Contract confirmation is not implementation acceptance, Emulator evidence, Issue closure, merge, UAT or Release approval.
