# QA review of proposed F0/F1 physical contracts

25 October 2026. Independently read Context's complete appended contract at
`3ed4b3ed6a97f501069c692e1b98a47da7db4305` and the corresponding Delivery
revision at `38c81660b5c3cf33566fddacf5d79ff03ec1ef44`. These commits change
documentation only. Context source remains the independently reviewed
`8ce74a8`; Delivery source remains `6d3b590`.

**Design/contract consistency only (D): the four material preflight
inconsistencies are resolved.** No additional substantive contradiction was
identified in the exact final text. All new behavior remains Proposed; this
review neither adopts contracts nor authorizes API/storage changes, dependencies,
source use, cloud calls, scheduling, notification sends or device tests.

| Preflight discrepancy sent to authors | Exact final resolution |
| --- | --- |
| F0 cap/category/quiet wire differed between documents. | One F0 shape: only `explicit_follow_up`, local processing, cap 1 per rolling 24h, cooldown 480 minutes, explicit `window` or `disabled` quiet union. Earlier A/B alternatives remain historical proposals. Future internal `daily` mapping is explicit adapter work. |
| Publication state and purpose epoch were not present in both occurrence tables. | Both name `authorizationScope`, complete `requiredSources` and `requiredCategories`; `state:published` requires message ID, sequence and `publishedAt`. Context defines the durable non-token intent-purpose epoch and fresh worker authority. |
| Saved-message resolver purported to judge exclusions without receiving a draft selection. | That resolver checks saved-message/source read authority only. Draft `invalid_selection` / 409 belongs to the F1 prepare/execute boundary. Temporary exclusions do not delete historical messages. |
| Message-anchor cursor shape was underspecified. | `pageBefore` is canonical unpadded base64url JSON `{v:1,before:sequence+1}`; caller uses existing `?before=`, then finds the exact ID/sequence. Response continuation stays `nextCursor`. QA checked the actual current parser/store and corrected an earlier QA message that had said `?cursor=`. |

The final proposal explicitly retains these limits:

- F0 quotes one saved user request in its owned live topic; it does not create a
  fake user turn. It requires fresh source/consent/topic fences, an atomic
  canonical publication, and a single `not_started → dispatching` sender claim.
  Unknown sends are not replayed; provider acceptance is not delivery/read.
- R-ANCHOR is an explicit proposed Q14 exception. Proactive publication would
  preserve the old cutoff; normal real-user/reply behavior stays unchanged.
  Source deletion and whole-topic deletion have separate retained-use effects.
- Persona identity/version is an in-flight guard, not a durable source-receipt
  field. Q19's two accepted presentation-usage fields remain the stated limit.
- F1a/F1b selection authorizes the exact current request's source set. A real
  reader must prove complete, bounded inherited dependencies; the current
  category helper does not establish per-record proof. Event provider-version
  evidence remains an explicit unresolved adapter gate, without invented ETags.
  Location stays deferred.
- One existing owner/fixed installation and a short lease do not prove general
  account transfer or instantaneous offline revocation. T1 is one ordinary E2E
  plus up to two separately permitted transport diagnostics, not three policy
  E2Es. T2 is separate. Resource numbers remain proposed ceilings, not meter or
  bill observations; SDK/sender pairing and actual-region feasibility still
  belong in Integration's decision packet.

The source readers, HTTP/API schemas, Firestore records/transactions, scheduler,
native notification integration and independent device proofs are not supplied
by these documents. C's already-confirmed entry decision does not select F0/F1,
their retention exceptions or any external verification. No unrelated source
tests were repeated for these documentation-only changes.

## Subsequent D1 dependency/source compatibility check

Delivery's documentation-only `4a388d9fdb96596482fb7aa30760d0f1dbe203df`
narrows the proposed first registration kind to literal `fcm_token` with exact
`firebase_messaging: 16.7.0`. Context's corresponding documentation-only delta
`ce0a5ed5ba5ded1365faa816025f747a6729863e` matches that wire/storage kind and
explicitly distinguishes opaque-value acceptance from provider validation.
QA read both complete deltas; no new substantive contract contradiction was
identified. QA also independently read
pub.dev's primary metadata for
[16.7.0](https://pub.dev/api/packages/firebase_messaging/versions/16.7.0),
[16.7.1](https://pub.dev/api/packages/firebase_messaging/versions/16.7.1) and
[17.0.1](https://pub.dev/api/packages/firebase_messaging/versions/17.0.1).
Their Core constraints are respectively `^4.14.0`, `^4.15.1` and `^5.1.0`.
The actual repository locks Core 4.14.0/interface 8.1.1/Auth 6.6.1, with FVM
Flutter 3.47.2 and Dart constraint ^3.13.2. The 16.7.0 declared constraints fit
that baseline; this is not evidence of successful dependency resolution/build.

QA independently read the
[pinned 16.7.0 messaging source](https://raw.githubusercontent.com/firebase/flutterfire/firebase_messaging-v16.7.0/packages/firebase_messaging/firebase_messaging/lib/src/messaging.dart):
it provides `getToken`, `onTokenRefresh`, `deleteToken`, `setAutoInitEnabled`, and
does not provide the newer `register`/`onRegistered` interface. Existing installed
Admin 14.3.0 declarations still provide `TokenMessage` and `send(message,dryRun?)`,
but explicitly deprecate `TokenMessage` in favor of `FidMessage`. No FID-to-token
conversion or implicit Core/Auth upgrade is justified by this evidence.

Primary metadata readback is in
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/delivery-4a388d9/package-metadata.json`,
SHA-256 `1246174e0bfb659f2ce4ad59bdb828e9a389b79718c928adf45d91bb49e5ce3f`.
QA did not install/resolve dependencies, build native code, initialize/register a
device, inspect credentials, or call a sender, including dry-run. Actual native
configuration, merged manifest, project/IAM, token acceptance, revocation and
delivery remain unverified. Pure policy test counts do not grow from this D-layer
review.

## Later sender retry finding — original SDK choice is insufficient

After the compatibility checkpoint above, Integration identified a material
implementation assumption in D1. QA independently traced the installed Admin
14.3.0 source: `Messaging.send` calls `FirebaseMessagingRequestHandler`, which
constructs `AuthorizedHttpClient(app)` without a retry override. Its base
`HttpClient.sendWithRetry` uses `defaultRetryConfig`: up to four retries on 503,
`ECONNRESET` and `ETIMEDOUT`. The public `Messaging.send(message,dryRun?)`,
Messaging exports and `AppOptions` inspected here expose no supported retry
disable parameter. `httpAgent` and the legacy transport switch do not establish
such a guarantee.

Thus **one SDK sender invocation is not one HTTP message attempt**. The original
4a388d9/ce0a5ed5 `getMessaging(...).send(...)` suggestion cannot establish the
proposal's no-replay rule. This finding changes the sender choice, not the
previous package-constraint/token-API evidence. No actual notification was sent
or duplicated in this review; a future adapter has not been implemented.

A replacement under author review uses the existing public
`Credential.getAccessToken()` interface for authorization and a separately
controlled direct HTTP v1 message POST with no application retry or redirect.
QA independently checked the
[FCM send method](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages/send)
and [HTTP v1 authorization guide](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
Token acquisition is not message submission; neither interface presence nor
documentation proves the actual project's permission or device acceptance.
After asynchronous token acquisition and durable claiming, the final dispatch
must still check source/grant/expiry/cancellation. A 401, 503, timeout, malformed
response or crash cannot trigger token-refresh-and-message-replay. Future
injected-boundary tests must count HTTP attempts rather than SDK invocations.
No token getter, auth endpoint, sender, dry-run, policy test or model was called
to establish this source finding.

Delivery corrected this proposal at
`b8b853208b88dee4d1dc46dc9497a6e67a87305c` (S1, documentation only).
Context synchronized it at `98447a90e3e35abc3a5c404d847e99f1f5dcb0c9`.
QA read both complete deltas from 4a388d9 and ce0a5ed respectively; their
sender/attempt semantics match. The correction explicitly supersedes the SDK
sender choice, preserves its historical cause, separates OAuth traffic from
message POSTs, uses a fixed native HTTP endpoint without retry wrappers or
redirects, and requires fresh authorization after token/claim awaits. It also
correctly maps REST priority/TTL to `NORMAL` / `'0s'`, independently checked
against the [REST Android configuration](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#AndroidConfig).
T1 limits now count actual message POST attempts. A single provider request is
not promised to guarantee exactly one physical delivery.

**The sender-choice finding is corrected at D layer in that Delivery delta.**
No direct-HTTP adapter/network property is passed by this text. Future tests must
observe actual received POSTs for 503/reset/redirect/delay, including zero POSTs
after credential failure or authority loss while awaiting token/claim. The
original 29 pure-policy tests were not rerun or relabeled as transport proof.
