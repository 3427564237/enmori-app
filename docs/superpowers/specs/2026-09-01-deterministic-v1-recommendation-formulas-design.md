# ENMORI Deterministic v1 Recommendation Formula Design

- **Status:** Approved by PM on 2026-09-01; Q-03 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Decision source:** S-PM-0901-Q03
- **Scope:** Deterministic scoring, factor breakdown, eligibility thresholds, and total ordering for three Week 9 recommendation modules
- **Related decision:** [`docs/decisions/2026-09-01-deterministic-v1-recommendation-formulas.md`](../../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md)

This specification records the approved Q03-A through Q03-D sections and their PM amendments. It consumes the S-PM-0901-Q17 semantic fields but does not define API DTOs, Firestore schema, user-facing fallback copy, or implementation tasks.

## 1. Common deterministic pipeline

```text
verified request + captured asOf
    ↓
authorization / privacy / consent
    ↓
current source-state and Q-17 field filtering
    ↓
deduplicated typed factor inputs
    ↓
fixed module formula + safe breakdown
    ↓
module-specific total deterministic ordering
    ↓
complete ranked result
    ↓
Home Top 2 projection
```

The formula never repairs or compensates for an invalid candidate. Invalid data is excluded before scoring.

## 2. Common invariants

- Scores are non-negative integers and additive within one module.
- Each module has an immutable v1 formula identifier.
- No score is normalized against the current candidate set.
- Duplicate semantic references are removed by opaque identity before counts are calculated.
- Missing optional factors contribute zero; unapproved factors do not exist to the formula.
- Scores have meaning only inside their own module.
- Full ordering precedes Top 2 selection.
- Qwen and Flutter cannot modify scoring or order.
- Admin Recommendation Configuration is not read by v1.
- Every factor breakdown contains stable factor code, inputs expressed as approved derived counts/buckets, integer points, and formula version.
- Private factors such as Special Care remain Backend-only even when present in an internal test/audit breakdown.

The reproducibility invariant is:

> same valid input + same `asOf` + same formula version → same score and breakdown; after applying the approved module-specific deterministic tie-break, the same total order must result.

## 3. Event Recommendation

### 3.1 Eligibility

An Event proceeds only when:

- current source state is active and published;
- `startAt > asOf`, so the Event has not started;
- user Interest Tags and Event Interest Tags pass Q-17 and are deduplicated; S-PM-0902-Q12 explicitly supersedes the former ambiguous Category/Tag wording; and
- their intersection is non-empty.

An ongoing, started, past, inactive, unpublished, or zero-match Event is not a v1 ranked result.

### 3.2 Formula

```text
M = distinct(userInterestTagIds ∩ eventInterestTagIds)
score = |M|
```

```text
factorCode: interest_match_count
matchedCount: |M|
points: |M|
formulaVersion: event_recommendation_v1
```

### 3.3 Total order

Compare candidates by this tuple:

```text
(-score, startAt, canonicalEventId)
```

The numeric negation is notation for descending score. `startAt` and ID are ascending. The ID comparison is canonical and locale-independent lexicographic.

## 4. Friend Recommendation

### 4.1 Eligibility

A Candidate proceeds only when:

- the account is active/eligible and purpose-discoverable;
- the Candidate is not the requester;
- no accepted friendship exists;
- no pending friendship/request relationship exists in either direction;
- the Candidate is not duplicated; and
- at least one shared Interest or common Event exists.

### 4.2 Event-set derivation

```text
requesterEvents = distinct(requesterInterested ∪ requesterGoing)
candidateEvents = distinct(candidateInterested ∪ candidateGoing)
commonEvents = distinct(requesterEvents ∩ candidateEvents)
```

Only purpose-authorized IDs enter either union. Interested and Going are equivalent for this factor. One Event contributes once regardless of the combination of states. The factor does not reveal which state the Candidate used.

### 4.3 Formula

```text
sharedInterests = distinct(requesterInterests ∩ candidateInterests)

sharedInterestCount = |sharedInterests|
commonEventCount = |commonEvents|

sharedInterestPoints = 2 × sharedInterestCount
commonEventPoints = 1 × commonEventCount

score = sharedInterestPoints + commonEventPoints
```

```text
factors:
  shared_interest:
    matchedCount: sharedInterestCount
    points: sharedInterestPoints
  common_event:
    matchedCount: commonEventCount
    points: commonEventPoints
formulaVersion: friend_recommendation_v1
```

### 4.4 Total order

Compare candidates by:

```text
(-score, -sharedInterestCount, -commonEventCount, canonicalCandidateId)
```

All counts descend; the final ID ascends under canonical, locale-independent lexicographic ordering.

## 5. Friends Activity

### 5.1 Eligibility and source state

Allowed Activity types are exactly `check_in_created`, `event_interested`, and `event_going`. An Activity proceeds only when:

- its owner is an accepted friend of the requester;
- privacy, consent, and source visibility permit the requester to see it;
- the source is current, valid, and not deleted;
- `occurredAt <= asOf`; and
- `occurredAt >= asOf - 168 hours`.

Stale or invalid historical Activity records are ineligible even if a materialized record remains stored.

### 5.2 Points

For `age = asOf - occurredAt`:

| Age interval | Recency points |
|---|---:|
| `0 <= age < 24h` | 3 |
| `24h <= age < 72h` | 2 |
| `72h <= age <= 168h` | 1 |
| otherwise | Ineligible |

| Activity type | Relevance points |
|---|---:|
| `check_in_created` | 1 |
| `event_interested` | 1 |
| `event_going` | 2 |

| Requester's private relationship setting | Special Care points |
|---|---:|
| Activity owner is Special Care | 2 |
| Otherwise | 0 |

```text
score = recencyPoints + activityRelevancePoints + specialCarePoints
formulaVersion = friends_activity_v1
```

Special Care is evaluated only after eligibility. It is a weight, not hard pinning, and cannot make private or stale Activity eligible.

### 5.3 Total order

Define the final identity as the unambiguous pair `(activityType, sourceRecordId)`. Compare candidates by:

```text
(-score, -occurredAt, canonical(activityType, sourceRecordId))
```

The final pair is compared component by component using locale-independent lexicographic ordering. It is not an ambiguous concatenated string.

## 6. Acceptance criteria

### Reproducibility and full order

```gherkin
Given the same valid candidates, captured asOf, and formula version
When a module is evaluated repeatedly
Then each candidate has the same score and factor breakdown
And the approved tie-break produces the same complete total order
```

### Event upcoming boundary

```gherkin
Given one matching Event starts exactly at asOf
And another matching Event starts after asOf
When Event Recommendation is evaluated
Then the Event starting exactly at asOf is ineligible
And the future Event may be ranked
```

### Event total tie

```gherkin
Given Events have equal score and equal startAt
When they are ordered
Then canonical locale-independent Event ID order determines their total order
```

### Friend pending relationship

```gherkin
Given a pending request exists from requester to Candidate or Candidate to requester
When Friend Recommendation candidates are built
Then the Candidate is excluded in either case
```

### Friend common Event deduplication

```gherkin
Given both users have Interested and Going records for the same authorized Event
When common Event points are calculated
Then that Event contributes exactly one common Event
And explanation does not reveal the Candidate's specific state
```

### Activity bucket boundaries

```gherkin
Given visible current Activities have ages of 24, 72, and 168 hours
When Friends Activity is scored
Then their recency points are respectively 2, 1, and 1
And an Activity older than 168 hours is ineligible
```

### Activity current source state

```gherkin
Given a stored Activity points to a source that is deleted, invalid, or no longer visible
When candidates are constructed
Then the Activity is excluded before scoring
```

### Special Care privacy

```gherkin
Given an eligible Activity owner is Special Care
When Friends Activity is scored
Then two Backend-only points are added
And the flag and factor do not enter Qwen, ordinary logs, or a response to the friend
```

### Top 2

```gherkin
Given more than two eligible candidates
When the module completes its total ordering
Then Home receives the first two results from that order
And no client-side reordering occurs
```

## 7. Deferred contracts

Q-16 controls no-result behavior and copy; it cannot introduce ineligible or zero-factor Event/Friend results without a new formula decision. Concrete API/Firestore fields must map to S-PM-0901-Q17. S-PM-0901-Q19 closes the Persona projection gate without changing these scores. Q-31 controls Qwen runtime and failure behavior, not ranking.

Any later formula change creates a new formula version. It cannot mutate the meaning or stored breakdown of historical results.
