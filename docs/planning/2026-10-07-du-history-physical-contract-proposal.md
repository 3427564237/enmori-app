# DU Check-in History Physical Contract Proposal

**Status:** Exact physical-contract proposal for LI review; not implementation authorization  
**Decision:** S-PM-1007-LI-NEXT-READ-A (H1-H7 confirmed)  
**Owner:** DU  
**Independent reviewer requested:** LI HOURUI  
**Baseline:** `main` at `ba94368b655c1d8885093ff1cf2a38c65400b8c2`  
**Scope:** One authenticated user's Check-ins for one selected civil date  
**Checks:** Product/API/Firestore/Emulator/Android execution are Not Run

## 1. Recommendation and approval boundary

Implement one narrowly scoped read after LI approves this exact route, response, cursor, query/index, dependency and error contract:

```http
GET /v1/me/check-ins?date=2026-10-07&timeZone=Asia/Singapore[&cursor=<opaque>]
Authorization: Bearer <Firebase ID token>
```

The server derives the owner from the verified principal and the existing Auth binding/onboarding flow. It must not accept owner/account IDs, a client-selected page size, arbitrary filters, or a client-provided UTC range.

This proposal makes physical choices for review. H1-H7 product direction is already decided; this document does not repeat those approvals. No endpoint, DTO, Firestore query/index, dependency, runtime configuration, Flutter route or production behavior is approved until LI accepts this exact proposal. Issue #48 remains closed and preparation-only; this proposal does not reopen it or make history implementation Ready.

## 2. Proposed HTTP contract

### Request

- Required query parameter `date`: exactly one ISO/Gregorian civil date, `YYYY-MM-DD`, years 0001-9999, and a real calendar date.
- Required query parameter `timeZone`: exactly one recognized IANA time-zone identifier (for example `Asia/Singapore`); reject numeric offsets, abbreviations and unknown zones.
- Optional query parameter `cursor`: exactly one opaque cursor returned by the previous page.
- Unknown, duplicate, blank, malformed, or repeated parameters return `400 REQUEST_INVALID`. In particular, reject `limit`, client owner IDs, and client UTC bounds.
- Fixed server page size: at most 20 returned records. Query 21 only as a lookahead to determine whether a next cursor exists.

The device's current IANA zone is captured when entering the date view. The UI uses that same zone for date selection and display. Changing date or zone discards the cursor and starts a fresh first-page request.

### Civil-day conversion and canonical UTC strings

Use the server, not client arithmetic, to derive the half-open interval from the selected date and IANA zone. Pin one byte representation for persisted values, query bounds and cursor tuples:

```
canonicalUtc = YYYY-MM-DDTHH:mm:ss.sssZ
```

For supported four-digit UTC years, format every instant as exactly three fractional digits and `Z`, equivalent to the current writer's `Date.toISOString()` representation. In particular, never serialize a zero-fraction boundary as `...T00:00:00Z`; it must be `...T00:00:00.000Z`. The same canonical formatter is used for both query bounds and the cursor's `lastCreatedAt`. Do not use Temporal's variable-precision `toString()` output directly as a Firestore string bound.

```
startUtc = canonical fixed-millisecond instant at the first valid time of the selected civil date
endUtc   = canonical fixed-millisecond instant at the first valid time of the next civil date
createdAt >= startUtc AND createdAt < endUtc
```

Use Temporal's date-to-zoned-date-time start-of-day behavior. If midnight is in a gap, the boundary is the first valid instant of that civil date; if midnight is ambiguous, use Temporal's specified compatible disambiguation. Do not substitute a fixed 24-hour duration. If an entire civil date was skipped by a zone transition, its start equals the next date's start; after current authorization succeeds, return `200 { checkIns: [], nextCursor: null }` without a Check-in query.

The API accepts civil years `0001` through `9999`, but the computed lower bound must itself be representable as a four-digit canonical UTC instant. If a zone/date conversion underflows before year 0001, reject it as `400 REQUEST_INVALID`. If the next-day upper bound exceeds the maximum four-digit UTC year (for example, `9999-12-31` in a negative-offset zone), omit only the upper Firestore range predicate: the audited storage invariant permits only four-digit UTC years, so no valid stored value can be at or beyond that expanded-year bound. Do not serialize an expanded year and compare it lexically with four-digit strings.

**Storage compatibility gate:** the inspected authoritative writer uses fixed-millisecond `Date.toISOString()`, but the parser accepts optional/variable fractional precision and source inspection does not prove live records conform. Before implementation, an authorized read-only audit must confirm every in-scope `createdAt` is canonical fixed-millisecond UTC and within the supported four-digit year range. If any valid legacy value is non-canonical, stop; do not skip, normalize, or silently migrate it. Request a separately approved compatible query/data strategy.

The device's current IANA zone is captured when entering the date view. The UI uses that same zone for selection and formatting. Changing date or zone discards the cursor and starts a fresh first-page request. Return the canonical UTC source timestamp; do not return a local timestamp.

**Dependency recommendation:** add exactly pinned `@js-temporal/polyfill@0.5.1` to the backend only, using Temporal `PlainDate`/zoned conversion for deterministic civil-day boundaries. This is a proposed production dependency, not an installed or tested one; LI must approve it. See [js-temporal/temporal-polyfill releases](https://github.com/js-temporal/temporal-polyfill/releases). If LI rejects a new dependency, do not substitute handwritten offset arithmetic; bring forward the smallest reviewed alternative and DST evidence.

### Success response

```json
{
  "checkIns": [
    {
      "checkInId": "opaque-id",
      "note": "A note",
      "createdAt": "2026-10-07T02:00:00.000Z",
      "checkInVisibility": "private"
    }
  ],
  "nextCursor": null
}
```

- `checkIns` has 0-20 items and reuses the approved CheckIn projection: opaque `checkInId`, Note, UTC `createdAt`, and the stored optional `checkInVisibility` snapshot.
- If a legacy document omitted `checkInVisibility`, omit it in the response. Never substitute the account's current setting or infer Mood, Weather, Activity, or location.
- `nextCursor` is null only when the lookahead found no 21st record; otherwise it is a non-empty opaque token.
- No records is `200` with an empty array and null cursor. A dependency/data failure is never represented as an empty success.
- Add `Cache-Control: no-store` to every response, including errors.

### Error mapping

Reuse the existing public error envelope and codes. Do not expose repository/provider messages, document paths, owner identifiers, cursor plaintext, or whether another user's record exists.

| Condition | Status | Public code |
|---|---:|---|
| Invalid/duplicate/unknown query, invalid date or zone, malformed/tampered/expired/mismatched cursor | 400 | `REQUEST_INVALID` |
| Missing/invalid Firebase identity | 401 | `AUTH_REQUIRED` |
| Authenticated but disallowed principal | 403 | `AUTH_FORBIDDEN` |
| No completed account binding | 409 | `ONBOARDING_REQUIRED` |
| Firestore/index/key/configuration dependency failure or invalid stored Check-in projection | 503 | `SERVICE_UNAVAILABLE` |

There is no list-route 404. Existing `GET /v1/check-ins/{checkInId}` behavior and its non-enumerating `CHECKIN_UNAVAILABLE` contract remain unchanged.

## 3. Proposed application and Firestore boundary

Follow existing feature ownership and dependency direction:

1. Add a narrow Check-in application use case and repository port for listing one owner's selected-date page. Keep route parsing/transport separate from civil-date and cursor domain validation.
2. Reuse existing verified principal, Auth binding, onboarding validation, `CheckInProjection` parser, public ErrorEnvelope and route registration. Derive internal `accountId` only from the current Firebase UID binding; never trust a caller-supplied owner.
3. Extend the Firestore adapter with one typed, Check-in-specific bounded query capability. Do not build a general query/pagination framework and do not widen unrelated feature repositories.
4. In one fresh Firestore transaction for every page, resolve the current UID binding and account, then execute the bounded owner/date query. Each next-page call repeats authorization and source checks. A page is not a continuation of a frozen multi-page transaction.
5. Existing records live at `check_ins/{checkInId}` and store `ownerAccountId`, `note`, string `createdAt`, and `checkInVisibility`. No new collection, copied history, stored paging session, new field, deletion operation, or retention change is proposed.

### Query and ordering

Proposed collection query:

```
collection: check_ins
where ownerAccountId == server-derived accountId
where createdAt >= startUtc
where createdAt < endUtc
order by createdAt DESC, document ID DESC
limit 21
```

Return the first 20. If a 21st exists, encode the last returned row (the 20th) as the continuation boundary. The next request uses the same owner/date/zone/range and `startAfter(createdAt, documentId)`. This gives the required newest-first order with descending opaque-ID tie-break for equal timestamps, without locale ranking.

**Proposed composite index:** collection scope on `check_ins`, `ownerAccountId ASC` and `createdAt DESC`, with document-name ordering descending to match the explicit ID tie-break. Confirm the exact Firebase CLI `firestore.indexes.json` representation and Emulator behavior before any index file is changed; Firestore may represent the document-name tie-break implicitly. No index currently exists in the inspected main baseline.

**Required timestamp-format gate:** the inspected parser accepts UTC strings with optional or variable fractional precision, while Firestore stores `createdAt` as a string. Lexicographic string range/order is reliable only if persisted values have a uniform sortable representation. Before implementation, run a read-only audit of existing records and verify the authoritative writer's exact serialization. If any valid legacy values are non-canonical or lack fixed precision, stop: this proposed string query cannot silently skip, normalize, or misorder them. LI must approve a minimal data-compatible alternative (or a separately scoped migration) before code. Do not add a timestamp field or migrate data under this proposal.

### Bounded reads and staged authority checks

For an authenticated valid request, resolve the current UID binding and account in the same fresh transaction as the later Check-in query. A successful page reads those two authority documents plus at most 21 matching Check-in documents per transaction attempt. This is an application-level document bound, not a promise about billed index-entry reads or transaction retries. There is no owner-wide scan and no client-selectable limit.

Perform cursor processing in these stages:

1. Fastify authentication runs first. Missing/invalid bearer identity returns `401 AUTH_REQUIRED` without parsing a cursor.
2. After authentication, validate query syntax/date/zone and cursor wire format, AES-GCM tag, version and expiry locally. Malformed, tampered, expired or unsupported cursors return `400 REQUEST_INVALID` before any repository/Firestore read.
3. For a locally valid request/cursor, resolve current UID binding and account. Missing onboarding binding returns `409 ONBOARDING_REQUIRED`; malformed/unavailable authority data returns the existing generic `503 SERVICE_UNAVAILABLE`. These authority reads take precedence over comparing a valid cursor's owner claim.
4. Compare the decrypted cursor's owner, date, zone, UTC bounds and version with the resolved current account and request. A mismatch returns generic `400 REQUEST_INVALID` and performs zero Check-in reads/query. The required current binding/account reads are allowed.
5. Only after those checks, execute the bounded Check-in query in the same transaction. Do not weaken current authorization to make cursor rejection appear to have zero total repository access.

This order avoids data access for locally invalid tokens while ensuring every page revalidates current authority. Generic public errors do not reveal whether a different account or record exists.

## 4. Cursor contract

Recommend a stateless authenticated-encryption cursor rather than a raw Firestore ID, unsigned cursor, database path, or server-side pagination session.

- Encoding: base64url of version, 96-bit nonce, AES-256-GCM ciphertext and authentication tag. A key ID is unnecessary for the proposed single in-memory process key.
- Encrypted payload: version, internal owner account ID, civil date, IANA zone, canonical fixed-millisecond UTC start/end (or the explicit terminal-upper-bound marker), last returned canonical `createdAt`, last returned `checkInId`, and expiry.
- Every page binds the token to the currently resolved owner, date, zone, range and version. Local malformed encoding, failed authentication tag, invalid payload shape, unsupported version or expiry returns `400 REQUEST_INVALID` before Firestore. After current authority is resolved, an owner/date/zone/range mismatch returns the same generic code and zero Check-in query/read; the two required authority reads may occur.
- Proposed lifetime: 15 minutes from first-page issuance. A cursor rejected after expiry requires Reload from page one.
- **Exact available-runtime key candidate for LI approval:** generate one 32-byte key with Node's built-in `randomBytes(32)` when the existing single controlled Backend process starts; retain it only in process memory and inject it directly into the history use case. Do not add an environment variable, file, external secret manager, credential, repository secret, or new infrastructure. The current controlled runtime is a single LI-hosted process and already uses Node's built-in crypto.
- Process restart/redeploy intentionally invalidates outstanding cursors; the client handles the generic invalid-cursor response by clearing the cursor and offering/retrying a fresh first-page read. This is acceptable for a short-lived continuation token and avoids persistent key provisioning/rotation. The 15-minute expiry still applies within a process.
- This candidate is not valid for multiple concurrent Backend processes/replicas. If the approved topology changes, stop and obtain LI approval for a shared protected key source before enabling multi-instance traffic. Do not invent a secret-manager integration.
- Use Node's built-in `node:crypto`; no crypto dependency is proposed. LI approval is still required for this key lifecycle and restart behavior before implementation.

The exact cursor tests must use the injected key/Clock ports. Missing key should be impossible after successful startup; fail startup closed if secure key generation fails rather than accepting requests or returning an empty list.

## 5. Concurrency, ownership, legacy data and UI cache

- Each page is a newly authorized read. Inserts newer than the current cursor may not appear in already-started continuation pages; the UI offers Reload from page one. Do not claim snapshot isolation across pages.
- Deletion/unavailability after page one must not make a stale cursor reveal another row or another owner. A deleted boundary document does not authorize anything; continuation is by the authenticated tuple and current query.
- On token/account/permission change observed by the app, clear visible rows and cursor before rendering another account. On date/zone change, Reload, and return to the history view, perform a fresh authorized request or discard stale in-memory state according to the approved client lifecycle. No persistent local history copy is added.
- Malformed required stored fields (Note, timestamp, ID, or a present invalid visibility value) fail the page closed as a generic 503; do not silently omit corrupt rows. A missing legacy optional visibility value remains omitted.
- Existing owner-only individual reads remain as-is. This proposal grants no Friend, AI, Weather, Activity, or Location access. Q17's Friends Activity content prohibitions continue to apply. Optional AI processing-consent withdrawal does not itself withdraw owner-only reading.
- No saved Check-in edit/delete action is authorized. Prototype-only `checkin-edit` remains outside this read contract.

## 6. Focused verification plan (all Not Run)

### Contract and parser tests

- Exact success envelope, 0/20 items, next-cursor presence only after lookahead, fixed server limit, unknown/duplicate parameters, and rejection of client owner/UTC-range/limit inputs.
- Canonical serialization tests for persisted values, both query bounds and cursor tuple: `.000Z` and `.500Z` compare and filter correctly; start is inclusive; prior-millisecond values are excluded; next civil-day midnight `.000Z` is excluded. Noncanonical stored precision is blocked by the read-only audit, never normalized in the query.
- Real/leap/invalid dates, invalid and offset-only zones, lower-bound year underflow rejection, `9999-12-31` upper-bound omission for expanded next year, zone changes, DST spring-forward/fall-back (23/25-hour dates), midnight gap and overlap, and a fully skipped date such as `Pacific/Apia` 2011-12-30 producing an authorized empty result without a Check-in query.
- Error precedence: unauthenticated request returns 401 before cursor parsing; authenticated malformed/tampered/expired cursor performs zero repository/Firestore reads; missing onboarding plus a locally valid cursor returns 409 before cursor-owner comparison; wrong-owner/date/zone cursor allows only current UID-binding/account reads then returns 400 with zero Check-in query; matching cursor performs current authority reads and then the bounded query.
- All public error codes/statuses above; no raw exception/provider message; `Cache-Control: no-store` on every path.

### Repository and Emulator tests

- Owner A cannot read Owner B's data; owner ID always comes from Auth binding, including when client query parameters try to override it.
- Date range is start-inclusive/end-exclusive and matches the selected IANA civil day after fixed-millisecond canonical formatting; public order matches `createdAt DESC, checkInId DESC` for exact ties.
- Exactly the matching first 20 are returned; 21st triggers a cursor, continuation has no duplicate and does not claim a frozen snapshot.
- Insert-newer, delete-boundary/delete-row, auth-binding change, and permission/account change between pages require fresh authorization and cannot disclose data.
- Empty result is success; Firestore failure, missing index, invalid record and transaction retry are not empty success. Valid legacy visibility omission stays absent; invalid-present visibility and malformed records fail closed.
- Verify the approved composite index in the Firebase Emulator and record actual query/document counts available from the harness, transaction retries and index-entry caveats. Before any runtime data access, run the separately authorized counts-only timestamp-format audit; do not export Notes, IDs, paths or raw records.
- Cursor key tests cover per-process generation/use, process-restart invalidation and clean first-page recovery. Multi-process behavior is out of scope and must be disabled unless a shared key contract is separately approved.

### Flutter/Android evidence after code approval

- Build the exact reviewed Flutter/backend contract head; record Git SHA, build command/config identity and APK SHA-256. No secrets in build args, logs, screenshots or evidence.
- On a dedicated Android Emulator first, sign in with a local synthetic account, create/use owned Check-ins, exercise selected date, empty date, 20+ page continuation, reload, zone/date reset, session/account change, recoverable network/backend failure and retry. Confirm UI clears stale rows and never maps dependency failure to empty success.
- Then execute the same approved flows on the available Android device against the approved HTTPS runtime. Capture sanitized screenshots and UI/semantics evidence mapped to the exact APK SHA and Backend head. Keep real credentials local; do not upload tokens, cursor plaintext, notes or raw logs.
- Report Backend contract tests, Emulator, Android device and every unrun case separately as Pass/Fail/Blocked/Not Run. Emulator evidence does not substitute for Android device evidence; document-only review does not substitute for either.

## 7. Decisions requested from LI

Please approve or return a focused change request on this exact physical contract:

1. `GET /v1/me/check-ins`, required `date` + `timeZone`, optional opaque `cursor`, no caller limit/owner/range.
2. Response shape and the exact reuse of approved CheckIn projection including stored optional visibility.
3. Server-side Temporal civil-day calculation and the proposed pinned backend-only `@js-temporal/polyfill@0.5.1` dependency.
4. Owner/date/time query, order, 21-row lookahead and composite index; specifically the fixed `.sssZ` representation for storage, derived bounds and cursor tuple, terminal-year rule, DST/skip-day behavior, and counts-only audit gate.
5. AES-256-GCM stateless owner/date/zone-bound cursor, 15-minute expiry, and the proposed per-process in-memory Node CSPRNG key with restart invalidation and single-process topology constraint.
6. Existing public error codes, fail-closed data handling and `Cache-Control: no-store`.
7. Staged Backend/Emulator/Android evidence plan and the staged validation/auth precedence, including zero Check-in query (not zero authority reads) for a valid wrong-owner cursor.

No code or Firestore index should be changed before this approval. If the timestamp audit finds mixed legacy representations, that is a precise implementation blocker requiring a separate approved query/data strategy.

## 8. Delivery and feasibility

- **This proposal:** delivered on the current main baseline as a document-only Draft PR for LI review.
- **Physical implementation estimate:** planning estimate, not a commitment: about 2-3 engineering days after LI approves the exact contract, provided the read-only timestamp audit passes and the controlled secret is provisioned. This includes focused backend/parser/Emulator work and a narrow Flutter integration with tests.
- **Evidence/feasibility:** add roughly 0.5-1 day for exact-head integration and device evidence after a usable Emulator/runtime/device window is available. The 11 October Sprint target is conditional, not promised; LI review latency, timestamp incompatibility, index approval, secret provisioning, or device/runtime access can move it. Report each dependency as a blocker rather than marking unrun checks complete.
- **Execution status:** no implementation, tests, index deployment, Backend request, Emulator flow, APK, or Android run was performed for this proposal. All remain **Not Run**.

## 9. Sources inspected

- Main baseline `ba94368b655c1d8885093ff1cf2a38c65400b8c2`: `api/openapi.json`, `backend/src/transport/register-routes.ts`, `backend/src/transport/schemas.ts`, `backend/src/check-ins/infrastructure/firestore-check-in-repository.ts`, `backend/src/check-ins/ports/check-in-repository.ts`, `backend/src/shared/infrastructure/firebase/firestore-gateway.ts`, `backend/src/shared/infrastructure/firebase/firestore-records.ts`, and root `package.json`.
- [LI decision S-PM-1007-LI-NEXT-READ-A](https://github.com/3427564237/enmori-app/blob/c8264b4113fe3a1ce6431997c97e4ab5dd03840a/docs/decisions/2026-10-07-li-next-read-option-a.md): H1-H7 direction and implementation boundary.
- [Issue #48 focused next step](https://github.com/3427564237/enmori-app/issues/48#issuecomment-6033556183): exact physical contract, reviewer, evidence and no-reopen boundary.
- [Earlier #48 kickoff proposal](https://github.com/3427564237/enmori-app/blob/main/docs/planning/2026-10-07-s3-du-checkin-history-first-read-proposal.md): preparation-only background; superseded only where H1-H7 now decide product direction.
- [Temporal polyfill releases](https://github.com/js-temporal/temporal-polyfill/releases): dependency candidate reference; no package was installed or executed.
