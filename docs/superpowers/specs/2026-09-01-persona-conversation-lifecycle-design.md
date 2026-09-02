# ENMORI Persona and AI Conversation Lifecycle Design

- **Status:** Approved by PM on 2026-09-01; Q-19 Resolved; Q-17 projection gate closed
- **Decision owner:** LI HOURUI, ENMORI PM
- **Decision source:** S-PM-0901-Q19
- **Scope:** Persona lifecycle, structured presentation projection, historical usage metadata, Conversation deletion, and Check-in source-deletion propagation
- **Related decision:** [`docs/decisions/2026-09-01-persona-conversation-lifecycle.md`](../../decisions/2026-09-01-persona-conversation-lifecycle.md)

This specification records the approved Q19-A through Q19-D sections and all PM amendments. It defines business semantics and testable boundaries, not storage structure, API payload names, retention periods, UI copy, or implementation tasks.

## 1. Lifecycle model

```text
Create
  ↓
Inactive Persona ── confirmed activation ──→ Active Persona
      ↑                 │                         │
      └──── replacement by another activation ───┘
      │                                           │
      └──────── permanent delete ←────────────────┘
```

Selection before confirmation is transient client intent, not a persisted lifecycle state. At most one live Persona is Active per owner, and zero Active Personas is valid.

## 2. Persona invariants

- An owner has at most five live Personas.
- A created Persona starts inactive.
- Only the owner can read, edit, activate, or delete it.
- Confirmation atomically replaces the unique Active Persona authority.
- Editing affects only requests that start afterward.
- Deleting the Active Persona atomically clears active authority.
- Deletion does not activate a replacement.
- Permanent deletion removes live entity/content, frees capacity, and has no restore path.
- Duplicate-effect protection applies to create; concurrency/precondition protection applies to conflicting activation, edit, and deletion.
- A user-level Active Persona authority, not independent per-Persona `isActive` flags, controls activation. Storage expression remains deferred.

## 3. Persona semantic model

```text
Persona
├── id: opaque identity
├── owner: verified user identity
├── displayName: owner-only management label
├── tone: neutral | warm | encouraging
├── responseLength: concise | balanced | detailed
├── formatStyle: plain | bulleted
├── createdAt / updatedAt: server-authoritative
└── revision: concurrency value
```

`displayName` is trimmed, non-empty, and free of control characters. Its final maximum length is a DTO validation decision. Duplicate names do not affect identity. The model has no free-text prompt, system instruction, role-play content, URL, tool instruction, or arbitrary extension field.

## 4. Presentation projection

```text
PersonaPresentationProjection
├── schemaVersion: persona_presentation_v1
├── tone: neutral | warm | encouraging
├── responseLength: concise | balanced | detailed
└── formatStyle: plain | bulleted
```

Backend constructs this projection only from the current Active Persona. It excludes identity, ownership, display name, revision, timestamps, original object, and every free-text value. Unknown enum values fail validation and do not pass through.

The mapping to model guidance is owned and versioned by Backend. Projection data is lower priority than system safety and purpose rules:

| Field/value | Permitted effect | Prohibited effect |
|---|---|---|
| `tone=neutral` | No added emotional framing | Altering facts or safety |
| `tone=warm` | Friendly expression | New facts or broader data |
| `tone=encouraging` | General supportive phrasing | Diagnosis, treatment, crisis judgment |
| `responseLength` | Expression detail | Additional source access |
| `formatStyle` | Paragraphs or bullets | Response-schema mutation |

The exact structured projection closes Q-17. Persona remains presentation-only and does not affect recommendation eligibility, score, or ordering.

## 5. Request-time consistency

```text
request starts
  ↓
resolve Active Persona + capture immutable projection snapshot
  ↓
model generation
  ↓
revalidate Conversation authority
  ↓
revalidate Persona has not been permanently deleted
  ↓
persist and deliver, or discard fail-closed
```

Edit and Active Persona change affect later requests only. They do not invalidate an in-flight snapshot. Permanent deletion does invalidate the corresponding in-flight result. Cancellation is best-effort; discard before persistence/delivery is mandatory.

## 6. Historical usage semantics

Historical Conversation does not retain or resolve a Persona object. The permitted immutable metadata is:

```text
presentationMode: default | persona
presentationProjectionVersion: non-content schema version, only for persona mode
```

The version cannot identify, fingerprint, hash, or reconstruct Persona. No ID, name, owner, enum combination, content, or full projection is retained. Persona deletion does not rewrite this metadata. Conversation/message deletion removes it according to the later retention contract.

Already-generated messages are not regenerated solely because Persona is edited, deactivated, or deleted. Because the projection contains presentation dimensions rather than Persona content, historical output does not require the deleted live entity to remain readable.

## 7. Conversation deletion model

Owner-confirmed deletion targets the complete Conversation:

```text
Conversation delete
├── Conversation record/content
├── all user message content
├── all assistant message content
├── presentation usage metadata
└── Check-in source provenance metadata
```

Deletion is permanent, idempotent, and has no restore path. It does not cascade to Persona, Check-in, Event, or unrelated data. Individual-message deletion is not added by this decision.

For an in-flight request, model cancellation is best-effort. Before persistence and delivery, Backend revalidates Conversation authority. A deleted Conversation rejects the result, and a late response cannot recreate it.

## 8. Source provenance and deletion propagation

Check-in-assisted messages may retain Backend-only provenance `(sourceType, sourceRecordId)` for each required Check-in. Provenance exists only to revalidate that dependent generated content remains displayable.

For a message with required sources `S`:

```text
messageAvailable = every(source in S, source remains valid for this purpose)
```

If any required source becomes deleted or unauthorized, the entire generated assistant message becomes unavailable. The read path enforces this before cleanup. Cleanup removes content and may replace it with an unavailable tombstone that preserves order but no content.

After deletion processing and tombstone replacement, the deleted source ID is removed. Retaining it longer requires a separate retention decision. Conversation deletion removes remaining provenance and tombstones.

## 9. Acceptance criteria

### Unique activation

```gherkin
Given one Persona is Active
When the owner confirms activation of another Persona
Then the new Persona is the sole Active Persona atomically
And both live Persona entities remain
```

### Active deletion

```gherkin
Given the owner confirms permanent deletion of the Active Persona
When deletion succeeds
Then the live Persona content is removed
And active authority is empty
And no other Persona is activated automatically
And one capacity slot becomes available
```

### Snapshot semantics

```gherkin
Given a Persona-based request has captured its projection
When the Persona is edited or another Persona becomes Active
Then the in-flight request may complete using its captured snapshot
And subsequent requests use the newer state
```

### Permanent deletion race

```gherkin
Given a Persona-based request is generating
When that Persona is permanently deleted before persistence or delivery
Then cancellation may be attempted
But the result is discarded regardless of cancellation success
And it is neither persisted nor returned
```

### Projection allowlist

```gherkin
Given an Active Persona contains the approved live fields
When Backend constructs PersonaPresentationProjection
Then it contains only schemaVersion, tone, responseLength, and formatStyle
And no Persona identity, display name, revision, timestamp, object, or free text enters Qwen
```

### Conversation deletion race

```gherkin
Given a Conversation is deleted while a model call is active
When a late model result arrives
Then Backend authority revalidation rejects the result
And the deleted Conversation is not recreated
```

### Multiple Check-in dependencies

```gherkin
Given an assistant message depends on multiple approved Check-ins
When any one required Check-in is deleted or becomes unauthorized
Then the complete assistant message is unavailable
And no partial generated text is returned
```

### Provenance cleanup

```gherkin
Given deleted-source processing has replaced generated content with an unavailable tombstone
When cleanup completes
Then the tombstone contains no deleted source ID or original content
Unless a later explicit retention decision requires that identifier
```

## 10. Deferred contracts

Q-14 determines retention durations and automatic deletion. Q-04/UI baseline determines final presentation and copy. Q-27 controls account-action consequences. Q-31 controls general model runtime/failure behavior. Concrete API and Firestore contracts must implement these semantics without broadening them.
