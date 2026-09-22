# S2-02 Event mapping — bounded proposal for LI confirmation

- Owner: SHI ZHENGQI (`GGGGHOST-CN`)
- Assigned work: [Issue #28](https://github.com/3427564237/enmori-app/issues/28)
- Independent implementation reviewer: ZHOU YAOYIN
- Status: **Proposed, not a confirmed PM decision or normative API contract**
- Approved semantic source: S-PM-0913-SPRINT2, published at PR #25 head `3a110132b01f2dee3605351ce123aa90a3376ccb`
- Interest interoperability reference: LI's mapping at PR #32 head `c83faf2f3223468744c440dee5714c59b853b64e`; PR #32 is still Draft/unmerged
- Unchanged rules: Q03, Q12, Q17, Q16, Q14 and the existing verified UID/account binding

The Sprint 2 decision assigns SHI the concrete Event mapping record before
shared integration. This records the minimum proposed choices explicitly,
rather than attributing unspecified property names, error codes or record
mechanics to earlier approvals. Under the Backend skill's mandatory-stop gate,
Transport/OpenAPI, Firestore mapping and initialization are not implemented
until LI confirms the affected choices. Domain/Application types in the first
slice are internal contracts, not an approval of these wire/storage names.

## 1. Proposed public mapping

The approved path remains `GET /v1/recommendations/events?view=home|all`.
Require exactly one `view`, either `home` or `all`, reject undeclared query
parameters and accept no client identity, score, `asOf`, cursor or body.
Reuse existing bearer authentication and server-generated request IDs.

Proposed successful response (200):

```json
{
  "asOf": "2026-09-15T00:00:00.000Z",
  "formulaVersion": "event_recommendation_v1",
  "items": [{
    "eventId": "opaque-event-id",
    "title": "Synthetic Event",
    "startAt": "2026-09-16T00:00:00.000Z",
    "endAt": "2026-09-16T01:00:00.000Z",
    "matchedInterests": [{"interestTagId": "opaque-tag-id", "displayName": "Safe label"}],
    "reasonCode": "interest_match"
  }]
}
```

Only the displayed fields are serialized; each object rejects extra fields.
The proposed `interest_match` reason is emitted only for a positive active
identity intersection. Do not return score, factor breakdown, Category,
protected explanation, accountId/UID, document paths or vendor objects.
Title is joined only as presentation after ranking, never a scoring input.
Empty is the same response with `items: []`; no explanation or fallback.

Home ranks the full eligible set then returns at most two. All computes again
with its own server `asOf` and returns the full eligible order. Match labels
are deduplicated and ordered by the same locale-independent identity comparison,
not by labels or locale. No continuity, history, cache or Qwen request is added.

Reuse `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `ONBOARDING_REQUIRED` and
`SERVICE_UNAVAILABLE` with the existing safe envelope/statuses.
**Confirmation needed:** syntactically invalid/missing/duplicate/unknown query
parameters should return a new narrowly scoped `REQUEST_INVALID` (400), safe
message `Request parameters are invalid.` Existing Check-in/Username errors
must not be mislabeled as recommendation errors. This proposal does not change
the existing endpoints' error behavior or LI's Interest 422/412 errors.

## 2. Proposed physical mapping and read boundary

Reuse approved collection `events`. Proposed `events/{eventId}` allowlist:

```text
title: well-formed, nonempty string
active: boolean
published: boolean
startAt: valid UTC ISO 8601 string ending in Z
endAt: valid UTC ISO 8601 string ending in Z, strictly after startAt
interestTagIds: array of safe opaque Interest Tag document IDs
```

Identity is carried by the document path, **not an extra persisted eventId**.
No Category, URL, participants, ownership, ranking weight, index, scheduling,
publication service or Event mutation API is introduced. Do not silently choose
a new Event title/tag maximum; fixture size is a separate bounded test input.
Empty Event tag lists remain persisted but yield no recommendation. Treat invalid
source records as ineligible, not a reason to fabricate candidates.

**Confirmation needed:** UTC fractions with up to nine digits are compared
without millisecond truncation, with calendar validity enforced. Canonical
opaque identity ties use case-sensitive, locale-independent string lexicographic
comparison, without normalization/case folding. Non-ASCII production identity
generation is not introduced by this slice.

Read verified UID's existing `auth_bindings/{uid_ + base64url(UTF-8 UID)}` and
valid completed `accounts/{accountId}` first. Only then read that account's
`account_interests/{accountId}`, current `interest_tags` labels/lifecycle and
`events`, using LI's recorded Interest mapping. Missing own selection is empty;
missing or invalid account/binding is onboarding-required. Do not read another
account's selection or copy Check-in visibility into Profile privacy.

Use the existing repository/gateway boundary and bounded test/demo catalogue
reads; no new composite index, query framework or cross-request snapshot is
selected. The adapter maps only explicit approved-purpose inputs into the inner
Port. Infrastructure catches and normalizes vendor failures. Requests do not
write recommendation entities, inputs, scores, factors or ordering history.

## 3. Proposed initialization boundary

Initialize only an explicit named synthetic manifest with a small catalogue
and Event set, sharing Interest identities with LI's fixtures. Resolve exact
manifest IDs with LI before publishing the shared fixture. Use create-only
semantics: all named targets must be absent, or exactly match the same fixture;
if any named target differs, fail without writes. Never `set` over existing
data, delete collections, touch accounts, or accept arbitrary import input.
The protected consistency boundary must prevent partial initialization and races.

Separate resettable Emulator test fixtures from demonstration initialization.
Reuse the existing fail-closed Auth/Firestore Emulator configuration and
synthetic project for automated tests. No credentials, project override or
production access is introduced.

**Confirmation needed before demonstration execution:** explicit isolated-demo
project allowlist and approved named manifest. No real-demo reset, deployment
or physical Android evidence is claimed or delegated to SHI. These environment
choices do not block pure owner tests or later isolated Emulator verification.

## 4. Next verification after confirmation

Implement hand-maintained OpenAPI 3.1/static Fastify schemas, authenticated
Transport tests, Event Infrastructure Port contract tests and real Auth +
Firestore Emulator persistence/initialization tests. Retain the existing R4/R9/
R10 test suites. Reuse the unchanged pinned lockfile/toolchain; no dependency or
generator is proposed. Request ZHOU's current-head independent review only with
precise commit, commands/results and remaining evidence boundaries.

Until actual execution: Event Transport, OpenAPI, Firestore adapter, Emulator,
demonstration initialization and product acceptance remain **Not Run**. An
inner-layer first slice is not completion of Issue #28 or the whole SHI package.
