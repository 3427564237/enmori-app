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
