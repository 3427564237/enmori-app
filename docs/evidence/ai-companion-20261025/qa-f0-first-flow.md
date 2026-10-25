# QA — first F0 implementation seams and counterexamples

25 October 2026. Authority is the scoped
[first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
traced in [qa-approved-scope.md](qa-approved-scope.md). The previously Proposed
Context/Delivery contracts remain the preserved implementation detail sources
within that approval. This ledger adds focused cases to [qa-matrix.md](qa-matrix.md);
it introduces no product rule or external execution permission.

QA normally merged shared base `ce6782c2337267cd991b008560b5df91a8cb208b`
while preserving QA `fde71e7`; merge head is
`0a3700989c12e8f3da5c49bc844df55a56f8d6b9`. No production code was authored.
The first interface/sender source reads below used immutable Git objects:

| Candidate | Independently inspected scope | Evidence limit |
| --- | --- | --- |
| Context `42b0b2a4e1151b43e9608f953c9a986c2c078394` | `backend/src/proactive/ports/first-flow.ts` | Types/comments only. Author reports strict compilation; QA did not execute it. |
| Context `ff00e7c7455f5ba64e99caff6cfbc389137ebe9f` | Complete 21-line shared-Port delta from `42b0b2a` | Adds mandatory asynchronous identity verification, an explicit revision-conflict result and minimized public read models. Interface-only closure below; effect behavior remains Not Run. |
| Delivery `e0fbccec26e03f46c03c250e3532c516e43642e3` | Single-POST sender and all 12 sender tests | Source shows real loopback received-POST counters and explicit no-replay cases. Author reports 12 sender + 29 policy tests passed; no independent execution at this checkpoint. Signature alignment with the shared Port is pending. |

## Source findings and integration seams

**F0-REVIEW-01 — async identity seam, observed at `42b0b2a`; interface corrected at `ff00e7c`.**
`ProactiveActor` has only `principal.firebaseUid` and synchronous `current()`.
That shape does not express a fresh asynchronous identity/eligibility check or
its unknown result. Existing conversation `fresh()` awaits `verifyCurrentAuth`,
checks current authority again and compares the original UID; the actual Firebase
verifier uses `verifyIdToken(token, true)`. New HTTP effects must preserve current
session/revocation checks, while scheduled work uses the confirmed durable intent
and current owner eligibility without retaining yesterday's bearer. Context and
Delivery were asked to make this seam explicit in their shared contract. This
is an interface gap; no running F0 authorization failure has been claimed.

QA independently inspected the correction: mandatory
`verifyCurrentAuth(): Promise<IdentityVerificationResult>` distinguishes verified,
invalid, forbidden and unavailable outcomes and documents separate HTTP/worker
authority. It does not turn a stored boolean into permission. The same delta
defines public settings/intent views that omit private grant/source fields. This
closes the missing interface hook only. The real store still must invoke it,
compare the original UID, check current authority across the await and fail
closed on every non-verified outcome; F0-A01 remains Not Run.

**F0-REVIEW-02 — shared physical model lane, unresolved composition.**
The `GenerationTransport` alias correctly requires physical settlement, but
sharing a type does not share admission state. Current retained composition gives
chat and Persona Preview the same `LocalChatTransport` instance and `pending`
flag. F0 must join that same host boundary. A separate transport instance or a
second in-memory flag would allow another call while a previous outcome remains
unknown. Integration/Delivery own the concrete wiring and its counterexample.

**F0-REVIEW-03 — malformed routing value, open at `e0fbcce`.**
The sender checks token emptiness, byte count and controls but does not check
`isWellFormed()`. An unpaired surrogate therefore passes those checks despite
the approved well-formed UTF-8 requirement. Delivery was asked to reject it with
zero POSTs in the aligned candidate. This is a static source finding, not an
executed test failure. The pre-alignment boolean claim also cannot itself supply
fresh routing data; the shared Port's successful claim returns the current
registration value/revision and is the intended alignment point.

**Existing read/retention paths require coordinated changes.** At `ce6782c`:

- `firestore-conversation-store.ts` `message()` requires every assistant to have
  `replyToUserMessageId`; `listOwnedMessages()` requires it to be the user's
  accepted pair. A genuine standalone proactive assistant cannot use this path
  unchanged. Ordinary effect/outcome/pair readers must keep their old semantics.
- `history()` selects the latest two canonical complete pairs. A proactive
  message is neither a fabricated user nor that user's replacement accepted
  assistant. Reply association and history projection need an explicit compatible
  implementation, not accidental pair reconstruction.
- `real-retention-resolver.ts` currently advances the cutoff on every on-time
  appended message. Its callers in the conversation store, maintenance and cleanup
  project only role/sequence/create time/append-before. All consumers must carry
  the approved non-advancing distinction consistently. The maintenance parser
  itself also requires the old pair shape.
- The wire serializer currently emits only the old message fields. Store, wire,
  App decoding, anchor lookup and source-use validation must agree on new origin,
  receipt version and reply association while retaining old responses.

These are known baseline adaptation points, not failures of an unpublished F0
implementation. No origin backfill or invented persisted retention timestamp is
authorized by identifying them.

## Focused acceptance matrix

Every row below is **Not Run for an integrated F0 candidate**. D = source/contract
inspection, S = deterministic or injected-boundary execution, I = isolated
composed storage/service execution, M = actual synthetic model, P = authorized
physical device. A source review or author-reported run never substitutes for
the other layers. Execution waits for Integration's scheduled slot; actual
provider/device operations still need their separately scoped authorization.

| ID | Counterexample and required observation | Layers | Owner |
| --- | --- | --- | --- |
| F0-A01 | Delay fresh HTTP identity verification, then revoke/disable, replace UID or return unavailable. No reserve/publish/claim effect; current checks bracket the await. Scheduled execution proves current eligible fixed owner from durable intent, with no stored bearer/session object. | D, S, I | Context / Delivery / Integration |
| F0-A02 | Owner B supplies A's intent, source, topic, registration or delivery locator; A's response settles after session replacement. No private projection, mutation or notification routing crosses owner boundaries. Client identifiers grant no authority. | S, I, P | Context / Delivery / App |
| F0-S01 | Source is an assistant, absent, another topic/owner, expired, or an old observation rewrapped in a fresh envelope. Only one currently available saved real user message qualifies; immutable ID/sequence/full-precision time and every observation's freshness are verified. | S, I | Context |
| F0-S02 | Source/topic/grant changes during generation. Publish rejects the stale reservation, produces no canonical message or push, and does not regenerate that occurrence. | S, I | Context / Delivery |
| F0-S03 | Edit/switch the selected Persona after capture versus delete it before acceptance. Preserve approved in-flight snapshot/edit semantics; deletion blocks the in-flight result. After acceptance retain only Q19 presentation usage fields, with no Persona identity in durable business receipts or historical read dependency. | D, S, I | Context |
| F0-C01 | Repeat the identical intent key/normalized command after lost ACK, then reuse that key with changed data. First reads the original receipt without another model call; second conflicts. Terminal/recovered intents never return to queued. | S, I | Context / Delivery |
| F0-C02 | Race different due intents and two workers against the same owner state. The atomic reservation prevents competing generation; publication creates one message + versioned source receipt + published/not-started outbox and charges one contact. Dispatch/ACK never charges again. | S, I | Context / Delivery |
| F0-C03 | Reserve/publish ACK is lost; restart from queued, reserved/prepared, published/not-started and dispatching. Inspect durable identity: interrupted unpublished work fails, fresh unattempted outbox may claim, dispatching becomes unknown without resend. Count messages and contact charges after a real isolated persistence restart. | S, I | Context / Delivery |
| F0-C04 | Fourth active intent, rolling 24-hour/cooldown boundary, off/on, pause, category withdrawal, zone change and quiet interval crossing midnight/DST. Enforce the approved fixed bounds, do not reset the old budget or resurrect cancelled work, and hold unresolved zone choices. | S, I, P | Context / Delivery / App |
| F0-M01 | Saved request contains instructions to act or invent a new user turn. Provider input is the dated `quotedRequest` plus confirmed due/zone and current permitted Persona; no invented user record, automatic Check-ins/history, tools or cloud fallback. Review the complete synthetic model input/output separately. | D, S, M | Delivery / Runtime / QA |
| F0-M02 | Chat, preview and two F0 intents race; generation ignores abort or has unknown HTTP settlement. One shared host lane remains occupied until physical settlement; no second model POST, early release, hidden retry or late publication. | S, I | Integration / Delivery / Runtime |
| F0-R01 | Canonical transcript U1/A2/P3, then real U4/A5: P3 is one genuine proactive assistant, preserves U1/A2 and sequence ordering, and does not masquerade as U1's accepted reply. Existing ordinary pair/effect/history consumers and explicit reply association remain coherent. | S, I, P | Context / App |
| F0-R02 | Publish P3 just before, exactly at, or after the old cutoff; repeat proactive appends and tombstone P3. Old cutoff remains unchanged, late commit never revives the topic, and immutable append-before/full-precision checks survive all reads. A later authorized real U4/A5 advances retention by the existing rule. | S, I | Context |
| F0-R03 | Read/list/search/anchor, maintenance and expiry cleanup inspect the same U/A/P inventory at the same clock. All reach the same retention decision; malformed/partial inventory is unknown, not empty success or cleanup authority. Topic deletion covers the new dependent records without deleting unrelated account data. | S, I | Context / Integration |
| F0-R04 | Source is deleted or retained use withdrawn after publication, then read P3 through transcript/anchor/card. Content is unavailable and its source references are removed according to the approved lifecycle. Proactive off alone stops future contact but preserves otherwise authorized accepted history. | S, I, P | Context / App |
| F0-R05 | New `source_use_v2` and legacy receipts coexist; a model emits a source ID/URL or a caller supplies another message's card. Only the authorized typed resolver reveals minimized current-owner navigation. No legacy backfill, raw provenance, copied text, Persona identifiers or guessed URLs. | D, S, I, P | Context / App / Integration |
| F0-R06 | Anchor lies on a 20-message boundary or at unsafe sequence overflow. Canonical `pageBefore` is used as `?before=`, then the exact message ID/sequence is found. Unknown/deleted target never opens a different topic or replays an operation. | S, I, P | Context / App |
| F0-R07 | Mark a missing, unavailable or future sequence; race stale revision, delayed ACK or hidden/unmounted target. Only an actually visible current available message advances the monotonic watermark. Reads do not extend retention; partial pages provide an unread dot rather than an invented total. | S, I, P | Context / App |
| F0-D01 | Token acquisition is delayed while consent/source/registration/quiet/expiry changes; claim ACK is then delayed through abort/expiry. Recheck after token and immediately after claim. Invalidated authority yields zero actual message POSTs; a consumed/unknown claim is never recycled. | S, I | Context / Delivery |
| F0-D02 | Return 401/503, redirect, reset, timeout, malformed or oversized ACK; lose ACK after provider receipt. Count actual received message POSTs, not wrapper calls. At most one, no refresh-and-rePOST/SDK fallback/retry; unknown stays unknown. | S, I | Delivery |
| F0-D03 | Registration has malformed Unicode, forbidden controls, wrong kind, stale lease/revision or another installation. Reject before send; ordinary metadata never returns token. Fresh claim supplies the current routing value; notification contains only generic/hidden fields and opaque authenticated locator, NORMAL priority and `0s` TTL. | D, S, I | Context / Delivery |
| F0-D04 | Actual foreground/background/ordinary-closed/force-stop conditions, late click and account replacement. Review the named signed candidate and separately authorized test window; correct topic and visible read-state, no privacy leak, and provider acceptance never means displayed/read. | P | Integration / LI or SHI / QA |

F1a's exact-source closure, five-record/seven-day bounds, exclusions and draft
conflict cases remain in the broader QA matrix/contract ledger and follow F0 as
their own implementation slice. F1b, location and automatic triggers stay deferred.
The known local-model **12 Pass / 12 Fail** result is unchanged. The separate
[v27 artifact check](qa-v27-artifact.md) covers C/usability only.
