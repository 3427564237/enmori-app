# RMVP-01A invalid Idempotency-Key public error — 2026-09-05

- **Source ID:** S-PM-0905-RMVP01A-IDEMPOTENCY-KEY-ERROR
- **Status:** Approved by LI HOURUI
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Public error classification for a missing or malformed required `Idempotency-Key` on the two already approved RMVP-01A protected create commands
- **Builds on:** S-PM-0901-BACKEND, S-PM-0903-RMVP01A-CONTRACT and S-PM-0903-RMVP01A-START
- **Delivery input:** LI's R3 finding on Draft PR #12 and SHI ZHENGQI's minimal clarification proposal on Issue #2

## Decision

Add this stable public error to the approved RMVP-01A error catalogue:

| Code | HTTP status | Safe message | Applicable boundary |
|---|---:|---|---|
| `IDEMPOTENCY_KEY_INVALID` | 400 | `Provide a valid request key and try again.` | Required `Idempotency-Key` is absent or does not match the approved 22–64 base64url-character syntax |

The classification applies only to the already approved protected commands:

- `PUT /v1/me/onboarding`; and
- `POST /v1/check-ins`.

Authentication is evaluated first. Missing, malformed or expired identity remains `AUTH_REQUIRED` / HTTP 401, and revoked or disabled identity remains `AUTH_FORBIDDEN` / HTTP 403, even when the request also has a missing or malformed idempotency key. Only after authentication succeeds may the command-header condition return `IDEMPOTENCY_KEY_INVALID`.

`IDEMPOTENCY_CONFLICT` / HTTP 409 remains exclusively for reuse of the same syntactically valid key with different normalized member input. It must not classify header absence or syntax failure.

The existing public error envelope remains unchanged: the response contains only the stable `code`, safe `message` and opaque `requestId`. The raw key must not enter logs, responses, paths or evidence.

## Bounded clarification and supersession

S-PM-0903-RMVP01A-CONTRACT remains controlling except for this explicit addition to its stable error catalogue. This decision resolves the catalogue gap for an already required header and supersedes only any implementation that classifies a missing or malformed key as `IDEMPOTENCY_CONFLICT`.

No endpoint, HTTP method, request or response field, header syntax, DTO, Firestore record or field, index, dependency, deployment choice or product flow is added or changed.

## Required R4 verification

R4 must update its public failure catalogue, Transport mapping, static schemas, hand-maintained OpenAPI and owner evidence consistently. Fastify injection coverage must demonstrate:

1. an authenticated onboarding or Check-in command with a missing key returns HTTP 400 and `IDEMPOTENCY_KEY_INVALID`;
2. an authenticated command with a key outside the approved syntax returns the same classification;
3. missing, malformed or expired identity still returns `AUTH_REQUIRED` before command-header validation;
4. revoked or disabled identity still returns `AUTH_FORBIDDEN` before command-header validation; and
5. a valid key reused with different normalized input remains `IDEMPOTENCY_CONFLICT` / HTTP 409.

The response and logging checks must confirm that the raw key and private request content are not exposed.

## Required Flutter verification

The handwritten Flutter client mapping must recognize `IDEMPOTENCY_KEY_INVALID` as its own stable application-failure kind while preserving fail-closed handling for every unknown code. Focused owner tests must verify the new mapping and confirm that an undeclared code still becomes the existing safe service-unavailable failure.

This mapping does not authorize a new screen, interaction branch or user-facing copy beyond the approved server-safe message and existing generic failure presentation.

## Scope and evidence boundary

This decision does not approve either current implementation, close R3/R4, merge PR #8 or PR #12, or establish Backend, Emulator, Android, Q04, UAT, Release or Done evidence. Both affected implementations still require their assigned independent reviews and normal merge gates.
