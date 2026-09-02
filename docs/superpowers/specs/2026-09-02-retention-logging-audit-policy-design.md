# Retention, logging, and audit policy design

- **Status:** Approved PM design; Q-14 requirement contract resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q14
- **Implementation status:** Not implemented or verified by this document

## 1. Purpose and precedence

This specification defines purpose-limited retention, deletion visibility, cleanup deadlines, log allowlists, and audit lifetimes for the Week 9 MVP and the retained COMP3851B Admin scope. It refines, but does not broaden, the approved data-use, lifecycle, Backend, or Account Action Request boundaries.

If an entity-specific permanent deletion rule makes content unavailable earlier than the automatic retention period, that deletion rule wins. A scheduler delay never restores access or extends an expiry.

## 2. Common lifecycle semantics

| Term | Required meaning |
|---|---|
| Expiry instant | Backend-authoritative UTC instant at which reads and processing fail closed. |
| Immediately inaccessible | The application cannot return or process the expired/deleted data even if physical cleanup is pending. |
| Physical cleanup within 24 hours | Operational SLA for removing already-inaccessible data; not a grace, recovery, Trash, Restore, or soft-delete period. |
| Content minimization within 24 hours | Operational SLA for removing content fields while retaining a separately authorized audit shell. |
| Dedicated retention anchor | Purpose-specific immutable or narrowly advanced timestamp; a generic `updatedAt` is prohibited. |
| Secondary copy | Any retained prompt, projection, payload, model output, debug record, snapshot, or duplicate created by processing a primary entity. It requires its own approved purpose. |

All enforcement uses trusted Backend time. Read/processing paths enforce expiry independently of cleanup jobs.

## 3. Retention matrix

| Data class | Anchor and duration | At boundary | Cleanup / remaining record |
|---|---|---|---|
| AI Conversation and messages | 90 days after `lastPersistedMessageAt`, unless owner deletes earlier | Immediately inaccessible | Entire Conversation physically cleaned within 24 hours |
| Transient AI prompt/projections/raw output | Request lifetime only | Discard after request or fail-closed result | No retained copy |
| Q19 source provenance | Only while required to revalidate a retained assistant message | Remove/minimize when purpose ends | Cannot outlive message/Conversation; tombstone has no source ID |
| Recommendation computation | Request lifetime only | Discard after response | No Recommendation entity/history |
| Operational log | 30 days after `loggedAt` | Immediately inaccessible | Physically cleaned within 24 hours |
| Admin Configuration Draft | 90 days after `lastContentChangedAt` | Immediately inaccessible | Physically cleaned within 24 hours |
| Superseded published config | Later of 365 days after replacement/deactivation or last approved dependent-history retention end | Immediately inaccessible when retention ends | Physically cleaned within 24 hours |
| Config audit event | 365 days after event time | Immediately inaccessible | Physically cleaned within 24 hours |
| Pending Account Action Request | Exact `expiresAt = createdAt + 90 × 24h` | Immediately `Expired`; cannot process | Reason minimized within 24 hours; request shell remains |
| Minimized expired Account Action Request | 365 days from canonical `expiresAt` | Immediately inaccessible | Whole record physically cleaned within 24 hours |

## 4. AI processing and Conversation acceptance rules

The Backend constructs purpose-approved projections in memory and sends only approved fields to Qwen. It retains no parallel prompt/projection/raw-response record. Only a validated, safe, current, authorized result may become an accepted assistant message.

`lastPersistedMessageAt` changes only when a user message or accepted assistant message is successfully persisted. The following do not advance it:

- reads;
- Conversation-title or non-message metadata changes;
- Persona edits/activation;
- generation start;
- failed, invalid, unsafe, stale, deleted-authority, or otherwise discarded output; or
- provenance cleanup and tombstone replacement.

### Acceptance examples

```gherkin
Given a Conversation whose lastPersistedMessageAt is T
When the owner successfully persists a user message at T2
Then lastPersistedMessageAt becomes T2
```

```gherkin
Given a model result is invalid, unsafe, stale, or no longer authorized
When the Backend discards it
Then no assistant message is created
And lastPersistedMessageAt does not change
And no raw output copy is retained
```

```gherkin
Given trusted Backend time reaches lastPersistedMessageAt plus 90 days
When a read occurs before the cleanup job runs
Then the Conversation is not returned
And the cleanup job removes it within 24 hours
```

## 5. Recommendation computation and logging

Each Home or See All request captures its own `asOf` and computes its own deterministic total order. Continuity between those independent requests is not guaranteed without a future approved snapshot/pagination contract.

Recommendation operational logs may add only module type, formula version, eligible-candidate count, returned-result count, latency, status, and trusted correlation ID to the common log allowlist. Candidate identifiers, scores, factors, and ordering are forbidden.

## 6. Cross-layer operational-log contract

The allowlist applies to application-controlled Transport, Application, Infrastructure adapters, HTTPS edge, process supervision, and error-handling paths. Framework/vendor defaults must be constrained when they would emit prohibited data.

A trusted server component creates a fresh correlation ID per request. It is not derived from or equal to client request IDs, idempotency keys, identities, sessions, or business objects.

Raw-log access is outside product UIs and limited to the minimum Backend operator role. Aggregate reporting cannot be reversed into a user, candidate, content item, or rank. Production debugging must not add fields outside the allowlist; detailed examples use synthetic development data.

## 7. Admin Recommendation Configuration lifecycle

A content-changing Draft mutation advances `lastContentChangedAt`; reading, previewing, validation, or status inspection does not. Published versions are immutable. Replacement/deactivation starts the 365-day version-retention calculation, but a longer approved historical dependency extends retention. Ending a reference does not restart the 365-day period.

Audit actors are explicit:

- `admin` plus verified Admin UID for an authenticated authorized Admin action; or
- `system` with no fabricated Admin identity for expiry, cleanup, or other Backend-generated events.

## 8. Account Action Request lifecycle

Q14 approves retention mechanics and a controlled enum field type only. Q14 does not define any enum member. Until Q-27 is resolved, the Backend must not infer or accept action values or implement approval/execution behavior.

### Exact expiry

```text
createdAt := immutable trusted-server creation instant
expiresAt := createdAt + 90 × 24 hours
expired := trusted Backend now >= expiresAt
```

The expiry job records system action using canonical `expiresAt`; its actual run time cannot extend retention.

### Expiry acceptance examples

```gherkin
Given a Pending Account Action Request with expiresAt E
And the expiry worker has not yet run
When trusted Backend time is equal to or later than E
Then the request is treated as Expired
And no processing is permitted
```

```gherkin
Given an Account Action Request has expired at E
When no more than 24 hours have elapsed
Then the free-text reason must be removed by the end of that interval
And the minimal audit shell remains
And this is not deletion of the whole request
```

```gherkin
Given a minimized Account Action Request reaches E plus 365 days
When a read occurs
Then the record is immediately inaccessible
And the whole record is physically cleaned within 24 hours
```

## 9. Readiness and verification gates

Q-14 resolution does not make affected PBIs implementation-ready by itself. Before production work, the affected contract still needs:

- concrete API and persistence schema review;
- authorization and operator-role enforcement;
- cleanup/minimization job design with idempotency and retry behavior;
- clock-boundary and scheduler-delay tests;
- proof that edge, framework, process-supervisor, and adapter defaults obey the log allowlist;
- deletion-race and fail-closed read tests; and
- Q-27 resolution before any Account Action Request action vocabulary or processing.

## 10. Out of scope

No legal hold, custom backup, analytics vendor, Recommendation history/snapshot, individual AI message deletion, Admin factor registry, concrete Account Action value/workflow, Firestore topology, endpoint/DTO, error code, or Qwen runtime setting is approved here.
