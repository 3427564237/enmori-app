# ENMORI Recommendation and AI Field-Allowlist Design

- **Status:** Approved by PM on 2026-09-01; initially partial, fully resolved by S-PM-0901-Q19
- **Decision owner:** LI HOURUI, ENMORI PM
- **Decision source:** S-PM-0901-Q17
- **Scope:** Purpose-specific semantic input fields for deterministic recommendation and bounded AI
- **Related decision:** [`docs/decisions/2026-09-01-recommendation-ai-field-allowlists.md`](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md)

This specification records the individually approved Q17-A through Q17-E design sections, including the revised Backend-authoritative Check-in window, scalar Activity/Weather projections, and Persona projection gate. It is a semantic data-use contract, not a Firestore schema, API DTO, algorithm, implementation plan, or proof of delivery.

## 1. Purpose registry and status

| Purpose | Status | Authoritative processor |
|---|---|---|
| Event Recommendation eligibility and deterministic ranking | Approved field boundary | Backend |
| Friend Recommendation eligibility and deterministic ranking | Approved field boundary | Backend |
| Friends Activity eligibility and deterministic ranking | Approved field boundary | Backend |
| Consented Check-in conversational assistance without Persona | Approved field boundary | Backend constructs minimized payload; Qwen presents |
| Single-result recommendation explanation without Persona | Approved field boundary | Backend supplies deterministic reason; Qwen may reword |
| Persona-influenced Qwen presentation | Approved by later S-PM-0901-Q19 | Backend-validated `persona_presentation_v1` only |
| Any other AI or recommendation purpose | Blocked / Not Ready | Requires a new PM decision |

Q-17 was initially partially resolved because the first five purposes had approved semantic fields while Persona-to-Qwen had no approved projection schema. S-PM-0901-Q19 subsequently supplies the exact projection and closes Q-17; the original ordering is retained here.

## 2. Cross-purpose processing order

Every use case follows this order:

```text
verified Auth Principal
    ↓
approved purpose
    ↓
authorization + relationship + privacy + consent
    ↓
purpose-specific source-field allowlist
    ↓
minimal typed projection
    ↓
deterministic eligibility / derivation / ranking
    ↓
authorized response projection
    └─ optional: minimized single-result Qwen presentation
```

Failure at an earlier gate stops the later stages. Filling a Top 2 slot, producing a friendly response, or preserving a previous recommendation is never a reason to bypass a gate.

## 3. Common model rules

- Deny fields and purposes by default.
- Identify fields by domain meaning in this decision; later API and storage names must map explicitly to that meaning.
- Approval is purpose-specific and stage-specific. Eligibility data does not automatically become scoring, display, logging, persistence, or Qwen data.
- Filter deleted, inactive, unauthorized, invisible, or consent-withdrawn data before constructing a candidate or AI projection.
- Do not pass complete Firestore documents, vendor objects, unrestricted maps, or arbitrary client-selected context across the boundary.
- A derived field is legal only when every input is allowed and the derivation is deterministic and explainable.
- Prohibit precise, live, continuous, and background location. Approx Location requires explicit approval and is absent from every approved Qwen payload and deterministic v1 recommendation here.
- Do not use content to infer mental health, diagnosis, treatment needs, protected traits, or another unapproved sensitive state.
- Qwen has no authority to fetch data, construct candidates, score, rank, authorize, or persist.

## 4. Event Recommendation contract

| Semantic field | Stage | Allowed use | Qwen |
|---|---|---|---|
| verified current-user UID | authorization | Identify actor and load own permitted input | Never |
| selected valid Interest Tag IDs | scoring | Match Event categories/tags | Only matched safe labels after selection |
| opaque Event ID | identity | Associate deterministic result | Not required |
| Event active/published status | eligibility | Exclude unavailable Event | Never |
| Event start/end time | eligibility | Apply later approved time rule | Never |
| valid Event Interest Tag IDs | scoring | Deterministic match; S-PM-0902-Q12 excludes Event Category IDs | Only matched safe labels after selection |
| Backend server time | eligibility | Time comparison | Never |
| deterministic reason code | explanation | Ground explanation | Allowed for selected result |

Prohibited scoring inputs include Check-in content, Mood, Activity, Weather, location, demographics, social data, Special Care, Persona, AI history, Interested/Going counts, and popularity. Event presentation fields such as title, description, venue, and URL are downstream display data and do not become scoring inputs.

## 5. Friend Recommendation contract

| Semantic field | Stage | Allowed use | Qwen |
|---|---|---|---|
| verified current-user UID | authorization | Identify actor | Never |
| opaque candidate user ID | identity | Associate result | Not required |
| active/eligible account state | eligibility | Exclude unavailable account | Never |
| candidate Profile Privacy | eligibility | Enforce discoverability | Never |
| friendship/pending-request state | eligibility | Exclude self, friends, duplicates, and pending relationships | Never |
| both users' valid Interest Tag IDs | scoring | Derive shared interests | Shared safe labels only after selection |
| both users' authorized Interested/Going Event IDs | scoring | Derive common Events | Common count only after selection |
| deterministic reason code | explanation | Ground explanation | Allowed for selected result |

The Backend may derive shared-interest identifiers/count and common-Event count. It does not expose the candidate's full interest or Event sets. Approximate/contextual overlap remains disabled in v1. Check-in, Mood, Activity, Weather, location, Footprint, Calendar, Persona, AI history, demographics, and Special Care are prohibited.

## 6. Friends Activity contract

| Semantic field | Stage | Allowed use | Qwen |
|---|---|---|---|
| verified current-user UID | authorization | Identify viewer | Never |
| opaque friend user ID | identity | Associate visible Activity | Not required |
| accepted friendship state | eligibility | Limit to current friends | Never |
| owner privacy + applicable consent/visibility | eligibility | Filter before ranking | Never |
| opaque Activity/source ID | identity/deduplication | Stable candidate identity | Never |
| approved Activity type/category | relevance | Apply later approved relevance rule | Safe type only after selection |
| server-authoritative occurred/published time | recency | Apply later approved recency rule | Non-precise time category only |
| requesting user's Special Care boolean | Backend-only weighting | Apply later approved weight after eligibility | Never |
| deterministic reason code | explanation | Ground explanation | Allowed only if it contains no Special Care data |

Special Care remains private to the requesting user and cannot change visibility or eligibility. Ranking does not read whole Check-in/Event objects. Check-in Note, Mood, Weather, location, Footprint, Persona, AI history, the friend's Interest profile, and demographics are prohibited. An unapproved Activity type cannot enter the candidate set.

## 7. Backend-authoritative Check-in window

For consented Check-in conversational assistance:

1. Capture one `asOf` from the trusted Backend Clock when the Use Case starts.
2. Define the rolling interval as `[asOf - 7 × 24 hours, asOf]`.
3. Use the server-authoritative persisted Check-in timestamp.
4. Reject client attempts to choose `asOf`, duration, or limit.
5. Remove unconsented, deleted, unauthorized, future-dated, and out-of-window records.
6. Sort eligible records by timestamp descending.
7. For equal timestamps, use opaque record ID only for stable selection; never include it in Qwen input.
8. Select the first five, or all available when fewer than five exist.
9. Reuse the captured `asOf` throughout the request.

This window is prohibited from recommendation eligibility, candidate construction, scoring, and ranking.

## 8. Check-in AI projection

The typed semantic projection for each selected Check-in is:

```text
CheckInAiProjection
├── occurredAt: UTC timestamp
├── noteText: authorized text, optional
├── moodLabel: normalized safe label, optional
├── activityLabel: normalized safe label, optional
└── weatherConditionLabel: normalized safe label, optional
```

`Activity` and `Weather` objects never enter Qwen. The Backend resolves them to the listed scalar safe labels. Raw provider payload, IDs, metadata, temperature, coordinates, provider name, arbitrary maps, Firestore paths, and internal references are excluded. Approx Location is excluded.

The request also contains the current user message. Stored historical conversation messages are not automatically attached. Note and label values are untrusted data and cannot override system policy or purpose.

## 9. Single-result explanation projection

The common projection contains module type, authorized result display label, and stable deterministic reason code. Its module extension is exactly one of:

- Event: matched Interest Tag safe display names;
- Friend: shared Interest Tag safe display names and common-Event count; or
- Friends Activity: authorized Activity type and non-precise time category.

It contains no candidate set, competing result, score vector, complete profile, complete interests, Event history, relationship graph, or Check-in content. Special Care never enters Qwen. Qwen may reword but cannot alter the reason or result.

## 10. PersonaPresentationProjection resolution

Persona CRUD, selection, and activation are approved product capabilities, but the Persona object is not an AI contract. S-PM-0901-Q19 approves:

```text
PersonaPresentationProjection
├── schemaVersion: persona_presentation_v1
├── tone: neutral | warm | encouraging
├── responseLength: concise | balanced | detailed
└── formatStyle: plain | bulleted
```

It satisfies all of these constraints:

- Backend produces it from the current Active Persona only.
- It has only the explicit fields and allowed values listed above.
- Backend validates its structure, length, characters, and values before Qwen use.
- It contains presentation-only tone/style information.
- It is treated as lower-priority untrusted data.
- It cannot alter safety, purpose, field access, authorization, candidates, scores, order, tools, or fallback.
- It contains no Persona/owner ID, lifecycle data, history, original object, Firestore document, arbitrary map, or undeclared field.

Persona ID, owner, display name, revision, timestamps, original object, and free text remain prohibited. With S-PM-0901-Q19, Persona-to-Qwen is no longer blocked by Q-17. Other runtime, retention, API, and UI gates remain independent.

## 11. Acceptance criteria for later implementation

### Common enforcement

```gherkin
Given a field is not listed for the active purpose
When the Backend constructs recommendation or AI input
Then the field is absent
And the Backend does not silently pass the source document
```

```gherkin
Given data is deleted, unauthorized, invisible, or has withdrawn consent
When a new computation is requested
Then that data is excluded before candidate or context construction
```

### Event Recommendation

```gherkin
Given an eligible user and eligible Events
When Event Recommendation input is constructed
Then scoring input contains only valid user Interest Tags and Event Interest Tag IDs
And Interested/Going counts, Check-ins, location, social data, and Persona are absent
```

### Friend Recommendation

```gherkin
Given candidate users include the actor, an existing friend, a pending relationship, and a discoverable unrelated user
When candidate eligibility is evaluated
Then only the discoverable unrelated user may proceed to scoring
And Special Care is never read
```

### Friends Activity

```gherkin
Given a Special Care friend has an Activity the viewer cannot access
When Friends Activity candidates are constructed
Then the Activity is excluded before ranking
And Special Care cannot restore it
```

### Check-in AI window and projection

```gherkin
Given Check-ins before, inside, and after the Backend window
And some are deleted or unconsented
When Check-in assistance context is built
Then one Backend asOf defines the rolling seven-day window
And only the five newest eligible records are projected
And Activity and Weather appear only as approved scalar labels
And no Approx Location or source object enters Qwen
```

### Persona gate

```gherkin
Given an Active Persona contains approved enum values
When a Qwen request is built
Then PersonaPresentationProjection contains only schemaVersion, tone, responseLength, and formatStyle
And no Persona identity, display name, object, revision, timestamp, or free text enters the request
```

## 12. Deferred decisions and downstream work

S-PM-0901-Q03 controls formulas, weights, recency/relevance calculation, normalization, and tie handling. S-PM-0901-Q19 defines Persona fields/lifecycle and closes the exact `PersonaPresentationProjection` gate. Q-14 controls retention/logging/audit behavior; Q-16 controls empty/fallback behavior and copy; Q-31 controls Qwen runtime, output schema, validation, timeout, concurrency, and failure behavior.

Later API and Firestore design must map every concrete field back to this semantic contract. A schema cannot broaden the allowlist.
