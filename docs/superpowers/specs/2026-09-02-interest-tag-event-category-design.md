# Interest Tag and Event Category design

- **Status:** Approved PM design; Q12-A through Q12-D approved; Q-12 Resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q12
- **Implementation status:** Not implemented or verified

## Approved type boundary

```text
InterestTag
├── InterestTagId       opaque, immutable, server-generated
└── displayName

EventCategory
├── EventCategoryId     opaque, immutable, server-generated
└── displayName

Event
├── EventCategoryId     classification reference
└── InterestTagId[]     v1 interest-matching references
```

The two ID types are never compared for equality. Equal-looking display names do not create a relationship. Event Recommendation v1 intersects the user's valid Interest Tag IDs only with the Event's valid Interest Tag IDs.

This supersedes only the ambiguous Q03/Q17 `eventCategoryOrTagIds` input phrase. Formula weight, eligibility, upcoming-Event rule, factor breakdown, and total ordering are unchanged.

## Name model

| Value | Purpose | Contract |
|---|---|---|
| `displayName` | Product presentation | Trimmed NFC, 1–50 Unicode code points, no control/bidi-control characters |
| comparison key | Backend uniqueness only | NFKC, Unicode default case fold, trim, collapse whitespace |

Uniqueness includes inactive entries and is scoped independently to each catalogue type. IDs survive rename and are never reused after deletion.

```gherkin
Given an active or inactive Interest Tag whose comparison key is "sports"
When an Admin attempts to create another Interest Tag named "  SPORTS  "
Then the operation conflicts
```

```gherkin
Given an Interest Tag named "Community"
When an Admin creates an Event Category named "Community"
Then catalogue-name uniqueness does not conflict
And the two records remain unrelated typed identities
```

```gherkin
Given a user selects Interest Tag I1
And an Event has Category C1 with the same display name as I1
But the Event does not reference Interest Tag I1
When Event Recommendation v1 scores the Event
Then C1 creates no interest match
```

## Approved Q12-B lifecycle

```text
Active ⇄ Inactive → Permanently Deleted
```

Inactive preserves identity, display, and existing references but prevents new assignment. Deactivation has no cascading mutation. Inactive Interest Tags do not score; restoration makes still-existing references valid on later requests without recreating them.

An Event may retain an already-referenced Inactive Category while unrelated fields are edited. Creating an Event or changing an existing Event's category requires an Active Category. This distinguishes retaining a reference from newly assigning it.

Permanent deletion requires both Inactive state and zero required live/retained references. It is concurrency-safe and non-cascading. Successful deletion is irreversible; repeated deletion cannot create further lifecycle effects, while response semantics belong to Q12-C.

```gherkin
Given an Event already references an Inactive Event Category
When an authorized operation changes only the Event title or time
Then the existing Category reference may remain
```

```gherkin
Given an Event already references an Inactive Event Category C1
When an operation attempts to newly select C1 or another Inactive Category
Then the category assignment is rejected
```

```gherkin
Given an Inactive Interest Tag still has a user or Event reference
When it is restored
Then the same ID becomes Active
And the still-existing reference is valid for subsequent Recommendation requests
And no new reference is created
```

```gherkin
Given an Inactive catalogue value has a required retained reference
When permanent deletion is requested
Then deletion is rejected
And no reference is removed or rewritten
```

## Approved Q12-C mutation protocol

Admin mutation authority is verified by Backend. Ordinary selectors receive Active values; Admin management may read both states; containing records may display an already-referenced Inactive label.

The client may submit an observed revision only as `expectedRevision`. It cannot choose the new revision. Rename/state/delete validate expected revision before no-op detection, so stale clients cannot turn a `412` into apparent success.

```text
revision-protected command
  → authenticate and authorize Admin
  → locate correct typed identity
  → compare expected revision
  → validate state/name/reference rules
  → apply effective mutation, if any
  → Backend advances authoritative revision exactly once for an effective rename/state change
```

New/replacement references atomically require Active state. Preserving the same already-existing Inactive reference during unrelated updates is not assignment, including when a full-record/list DTO carries that unchanged reference.

| Category | HTTP |
|---|---:|
| catalogue validation failed | 422 |
| not found/deleted/wrong typed identity | 404 |
| duplicate normalized name | 409 |
| required reference blocks delete | 409 |
| lifecycle state conflict | 409 |
| stale expected revision | 412 |
| not authenticated | 401 |
| not authorized | 403 |
| dependency unavailable | 503 |

Referenced-conflict output reveals no referencing identity, user, count, or protected detail. Because permanent delete already requires Inactive state, it says the value must remain Inactive unless an authorized Admin separately restores it.

```gherkin
Given Admin A observed revision 4
And Admin B changed the entity to revision 5 and the entity is already in Admin A's requested state
When Admin A submits the revision-protected command with expected revision 4
Then the result is catalogue_revision_precondition_failed
And no no-op success bypasses the stale revision
```

```gherkin
Given an Event retains Inactive Category C1
When an update preserves C1 and changes only the title
Then Active-state assignment validation is not triggered for C1
But replacing C1 with any Category requires the newly selected Category to be Active
```

## Approved Q12-D exclusions and closure

The MVP has no bulk import/export and no bulk create, rename, deactivate, restore, permanent delete, merge, or reassignment. One create creates one new Backend-identified entity; one existing-entity mutation targets one typed identity.

It also excludes automatic deduplication/migration, hierarchy/mapping/inheritance, non-Admin creation, extended/localized presentation metadata, scheduling/archive/soft-delete behavior, cascading/substitution, usage analytics, reference-count/private-reference inspection, and a retained catalogue audit-history product.

```gherkin
Given an Admin submits one approved create command
When it succeeds
Then exactly one catalogue entity is created
And the Backend generates its typed opaque identity
```

```gherkin
Given a request attempts to mutate multiple existing catalogue identities
When it reaches the catalogue use case
Then it is outside the approved MVP contract
```

Q-12 is Resolved at the requirement-contract level. Profile/Event cardinality/publication requirements and concrete API/schema/UI/evidence remain separate.
