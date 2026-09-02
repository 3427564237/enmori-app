# Interest Tag and Event Category contract — 2026-09-02

- **Status:** Approved; Q12-A through Q12-D approved; Q-12 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q12
- **Approved scope:** Catalogue identity/name/matching bridge, lifecycle/reference rules, Admin authority, optimistic concurrency, stable application/HTTP errors, and explicit MVP exclusions
- **Builds on:** [S-PM-0831](2026-08-31-pm-requirements-decisions.md), [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md), and [S-PM-0901-Q03](2026-09-01-deterministic-v1-recommendation-formulas.md)

## Q12-A — Catalogue identity and Recommendation bridge

`InterestTagId` and `EventCategoryId` are distinct opaque, immutable, server-generated identity types with separate namespaces. An ID is never reused after permanent deletion.

A user profile selects `InterestTagId` values. An Event may reference one Event Category for classification and may separately reference Interest Tag values for interest matching.

Event Recommendation v1 matches:

```text
distinct(userInterestTagIds ∩ eventInterestTagIds)
```

`EventCategoryId` does not directly intersect with `InterestTagId`, contribute an additional score, or create an implicit same-name match. Any future Category-to-Interest mapping requires a separate approved contract.

This is an explicit PM supersession of the affected Q03/Q17 phrase `eventCategoryOrTagIds`: for v1 scoring, it means only the Event's valid `InterestTagId` references. This correction does not change the approved score, Event eligibility, tie-break, or total-order rules.

## Display name and uniqueness

Both catalogue types use a user-facing `displayName`. The stored display name is Unicode NFC, trimmed, between 1 and 50 Unicode code points, and contains no control or bidirectional-control character.

Uniqueness is enforced independently inside each catalogue type using a Backend-derived locale-independent comparison key:

```text
Unicode NFKC
→ Unicode default case folding
→ trim
→ collapse consecutive whitespace
```

The comparison key is Backend-only and is neither the entity identity nor its public display value. Names producing the same comparison key conflict within the same catalogue, including active and inactive entries. The same normalized display name may exist once as an Interest Tag and once as an Event Category because their namespaces are separate.

Rename never changes the opaque ID. Slugs, aliases, localized-name maps, free-form synonyms, and client-generated IDs are not part of the MVP contract.

## Q12-B — Reference and lifecycle contract

The lifecycle is:

```text
Active ⇄ Inactive → Permanently Deleted
```

A newly created Interest Tag or Event Category is Active. Active values may be assigned to new records. Inactive values cannot be newly assigned, but existing references are preserved and may be explicitly removed.

Deactivation does not cascade, detach, replace, or delete existing references. It does not delete or unpublish an Event, rewrite a Check-in, remove a user's existing Interest selection, or modify historical assistant content. Existing references retain a readable catalogue label while the value is Inactive. Ordinary users cannot select an Inactive value for a new reference.

### Interest Tag behavior

An Inactive Interest Tag is excluded from new Event and Friend Recommendation matching because it is not a valid scoring input. Existing user and Event references remain stored.

Restoring the same Interest Tag makes still-existing references valid again for subsequent requests. Restore does not create a reference that did not already exist and is not a reassignment.

### Event Category behavior

An Inactive Event Category cannot be assigned to a new Event or newly selected as the category of an existing Event.

An existing Event that already references an Inactive Event Category may retain that reference while unrelated Event fields are edited. Any operation that changes its category must select an Active Event Category.

Deactivation does not automatically unpublish the Event. The existing Event may retain and display the category label. Event Category state does not directly score Event Recommendation under Q12-A.

### Rename and restore

Rename preserves the opaque ID and updates current catalogue presentation for live references. It does not rewrite immutable audit records, retained assistant messages, or another separately approved historical snapshot.

Rename is permitted while Active or Inactive and remains subject to Q12-A uniqueness. Restore changes the same Inactive entity back to Active, creates no new identity, and makes no automatic assignment to a record that does not already reference it.

### Permanent deletion

Permanent deletion is permitted only when the catalogue value is Inactive and has no reference from any live or retained record whose approved lifecycle still requires that identity.

The reference check includes, as applicable, user Interest selections, Event category/tag assignments, Check-ins, and any other retained product or audit record requiring the catalogue identity.

Permanent deletion never cascades and never silently removes references. If any required reference exists, deletion is rejected and the value remains Inactive.

Reference creation/update and permanent deletion are concurrency-safe: a new reference cannot commit concurrently after the deletion check and leave a dangling identity. The concrete transaction, index, or schema mechanism remains a later data-contract decision.

Successful permanent deletion is immediate and irreversible. Repeating a permanent-delete operation must not recreate the entity, reuse the identity, or produce additional lifecycle side effects; Q12-C defines the concrete response semantics for an already-deleted identity. There is no Trash or Restore, and the deleted ID is never reused.

## Q12-C — Admin CRUD, concurrency, and errors

### Authority and read boundary

Catalogue mutation requires an authenticated identity whose Admin authority is verified by the Backend. Flutter-supplied role or ownership fields are never trusted.

Admin management reads may include Active and Inactive entries. Ordinary selection lists contain Active entries only. A product record already referencing an Inactive value may still receive its safe display label under Q12-B.

Create, rename, deactivate, restore, and permanent delete are Backend-authoritative operations. Clients cannot supply entity IDs, comparison keys, lifecycle timestamps, actor identity, or a new authoritative revision.

Clients cannot choose, generate, or overwrite the authoritative catalogue revision. For revision-protected mutations, the client may supply only the previously observed revision as an expected-revision precondition; the Backend alone determines the resulting revision.

### Optimistic concurrency and mutation safety

Every catalogue entity has an opaque concurrency revision. Each effective rename, deactivate, or restore advances it exactly once.

Rename, deactivate, restore, and permanent delete require the caller's expected revision. A stale revision never silently overwrites newer state. For every revision-protected mutation, the expected revision is validated before determining whether the requested mutation would be a no-op.

Create and rename enforce the Q12-A comparison-key uniqueness atomically. If concurrent operations claim the same key, at most one succeeds.

Creation of a new catalogue reference, or replacement of an existing reference with a different catalogue value, validates that the referenced value is Active in the same protected consistency boundary as the reference mutation.

Merely preserving an already-existing Inactive reference during an unrelated record update is not a new assignment and remains permitted under Q12-B. This applies even when a client DTO represents the containing record or reference list in full.

Permanent deletion checks Inactive state and zero required references in the same protected consistency boundary. A request that passes its expected-revision precondition but produces no effective change may return the current state without advancing the revision and without creating duplicate lifecycle effects.

Repeating permanent delete after the identity has already been removed produces no additional effect and returns `catalogue_not_found` as defined below.

### Stable application and HTTP semantics

| Application category | HTTP | Meaning |
|---|---:|---|
| `catalogue_validation_failed` | 422 | Parsed name/Unicode/field domain validation failed |
| `catalogue_not_found` | 404 | ID does not exist, was permanently deleted, or belongs to the wrong catalogue type |
| `catalogue_name_conflict` | 409 | Comparison key already exists in that catalogue, including an Inactive value |
| `catalogue_referenced` | 409 | Permanent deletion is blocked by a required live/retained reference |
| `catalogue_state_conflict` | 409 | Operation conflicts with lifecycle state, including permanent delete while Active |
| `catalogue_revision_precondition_failed` | 412 | Expected revision is stale |
| `not_authenticated` | 401 | Identity is missing or invalid |
| `not_authorized` | 403 | Identity is authenticated but lacks Backend-verified Admin authority |
| `dependency_unavailable` | 503 | Required persistence dependency is unavailable |

Malformed JSON or an unreadable transport request may use `400 Bad Request`; a validly parsed domain conflict is not collapsed into generic `400`.

Duplicate name, retained reference, invalid lifecycle state, and stale revision remain distinguishable stable categories. `catalogue_revision_precondition_failed` requires refetch before retry; the Backend does not merge or overwrite automatically.

`catalogue_referenced` returns no private referencing entity ID, user identity, reference count, or protected record detail. It may state only that permanent deletion is blocked because required references remain and that the catalogue value must remain Inactive unless separately restored by an authorized Admin.

Raw framework, Firebase, and Firestore errors never enter the API. Transport maps only stable application categories consistently with L1/Ops-1. Operational logs remain constrained by Q14-D: catalogue names, bodies, Admin UID, and referenced-record details do not enter ordinary logs.

Q12-C approves semantic categories and HTTP status mappings. Concrete endpoint paths, DTO property names, and error-envelope shape remain part of the later API Contract.

## Q12-D — Explicit MVP exclusions

The Week 9 Catalogue MVP includes no CSV, spreadsheet, or other bulk import/export.

There is no bulk create, rename, deactivate, restore, permanent delete, merge, or reassignment operation. Each approved create operation creates exactly one catalogue entity. Each approved mutation of an existing entity targets exactly one typed catalogue identity.

The MVP includes no:

- automatic duplicate merge, ID replacement, reference migration, or mass reassignment;
- hierarchical Category/Tag tree, parent-child relationship, arbitrary Category-to-Interest mapping, synonym graph, or inheritance;
- user-created or community-created Interest Tag/Event Category;
- localized-name map, alias, slug, description, icon, colour, image, arbitrary metadata, or custom sort weight;
- scheduled deactivation or scheduled restore, expiry, archive state, soft delete, Trash, or restoration after permanent deletion;
- automatic cascade, substitute value, or `uncategorized` fallback when a reference becomes Inactive or deletion is blocked; or
- catalogue usage analytics, reference-count disclosure, or private referencing-record inspection through the Admin UI.

Catalogue mutation remains protected Admin behavior. Similar display names do not authorize Backend deduplication.

Q12 does not create a retained catalogue audit-history product. Q14-D operational telemetry may record only its already-approved non-content request fields. Any future catalogue audit record requires an approved purpose, field allowlist, access rule, and retention contract.

Concrete Firestore structure/indexes, endpoint paths, DTO/error-envelope property names, pagination/filter query shape, and UI visual layout remain later implementation/API/UI contracts.

User Interest-selection cardinality, Event Interest-Tag cardinality, and whether Event Category is mandatory for Event publication belong to their respective Profile/Event validation contracts. Q12-D does not silently choose those values.

## Q-12 closure

Q12-A through Q12-D resolve Q-12 at the catalogue requirement-contract level. This resolution does not prove implementation, migrate existing data, approve a physical schema, or make Admin Catalogue PBIs Ready without API/schema, authorization, concurrency, UI, and test evidence.

## Authority and readiness

This is a current PM catalogue/domain decision, not a Sponsor/Supervisor decision, not retroactive COMP3851A scope, and not implementation or verification evidence. Q-12 is Resolved at requirement-contract level. Physical schema, DTO fields, endpoint/error-envelope shape, implementation mechanism, UI layout, and evidence remain separate gates.
