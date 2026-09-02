# Deterministic v1 recommendation formulas — 2026-09-01

- **Status:** Approved; Q-03 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901-Q03
- **Scope:** Event Recommendation, Friend Recommendation, and Friends Activity deterministic v1 scoring and total ordering
- **Builds on:** [S-PM-0901-SCOPE](2026-09-01-comp3851b-mvp-scope-priorities.md), [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md), and [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md)
- **Detailed specification:** [`docs/superpowers/specs/2026-09-01-deterministic-v1-recommendation-formulas-design.md`](../superpowers/specs/2026-09-01-deterministic-v1-recommendation-formulas-design.md)

## Common scoring contract

Eligibility, authorization, privacy, consent, source-state validation, and Q-17 allowlist filtering complete before scoring. Each module uses a fixed, versioned, non-negative integer additive formula. No module applies candidate-pool normalization or changes weights based on the current candidates.

Duplicate Tag, Event, Activity, and relationship references are removed by opaque identity before derivation. A missing optional factor contributes zero and cannot be replaced with an unapproved field. Every result retains a safe structured factor breakdown and formula version without retaining unauthorized raw data.

The controlling reproducibility rule is:

> same valid input + same `asOf` + same formula version → same score and breakdown; after applying the approved module-specific deterministic tie-break, the same total order must result.

Every module-specific formula defines a total deterministic ordering before implementation can be Ready. The Backend ranks the complete eligible set before selecting Home Top 2. Flutter preserves Backend order. Scores cannot be compared across modules.

Qwen does not construct candidates or influence factors, points, scores, tie-breaks, or order. The fixed v1 formulas do not read Admin Recommendation Configuration.

## Event Recommendation v1

This is an upcoming-event recommender. An Event is eligible only when it is active, published, and has not yet started at the captured Backend `asOf`; therefore `startAt > asOf`. The user and Event Interest Tag sets are Q-17-filtered and deduplicated. At least one match is required. S-PM-0902-Q12 subsequently clarifies by explicit PM supersession that the Event side contains valid `InterestTagId` references only; the separately typed `EventCategoryId` does not enter this intersection.

```text
matchedInterestIds =
  distinct(userInterestTagIds ∩ eventInterestTagIds)

interestMatchCount = size(matchedInterestIds)

score = interestMatchCount
```

The factor breakdown uses `interest_match_count`, the matched count, equal integer points, and formula version `event_recommendation_v1`.

The total order is:

1. score descending;
2. `startAt` ascending; then
3. opaque Event ID ascending using canonical, locale-independent lexicographic ordering.

All time comparisons use the captured `asOf` and UTC instants. Event ID does not score and does not enter Qwen. Zero-match Events do not enter the ranked result. Popularity, Interested/Going count, location, recency decay, and dynamic normalization are absent.

## Friend Recommendation v1

A Candidate must be active/eligible and discoverable, and cannot be the requester, an existing friend, a duplicate, or a user with a pending friendship/request relationship in either direction.

Each user's authorized Event set is the deduplicated union of that user's purpose-authorized Interested and Going Event IDs. The common set is the intersection of those two unions. An Event contributes at most once regardless of Interested/Going state combination.

```text
sharedInterestIds =
  distinct(requesterInterestTagIds ∩ candidateInterestTagIds)

requesterAuthorizedEventIds =
  distinct(requesterInterestedEventIds ∪ requesterGoingEventIds)

candidateAuthorizedEventIds =
  distinct(candidateInterestedEventIds ∪ candidateGoingEventIds)

commonEventIds =
  distinct(requesterAuthorizedEventIds ∩ candidateAuthorizedEventIds)

sharedInterestCount = size(sharedInterestIds)
commonEventCount = size(commonEventIds)

sharedInterestPoints = sharedInterestCount × 2
commonEventPoints = commonEventCount × 1

score = sharedInterestPoints + commonEventPoints
```

The factor breakdown contains `shared_interest` and `common_event`, with their matched counts and points, under formula version `friend_recommendation_v1`.

The total order is:

1. score descending;
2. `sharedInterestCount` descending;
3. `commonEventCount` descending; then
4. opaque Candidate user ID ascending using canonical, locale-independent lexicographic ordering.

At least one shared Interest or common Event is required. Special Care, Approx Location, common location, mutual-friend count, and Profile content are absent. Explanation may expose only safe shared-Interest labels and common-Event count; the common-Event factor alone cannot infer or expose the Candidate's specific Interested/Going state.

## Friends Activity v1

The only eligible v1 Activity types are:

- `check_in_created`;
- `event_interested`; and
- `event_going`.

Backend captures one `asOf`. An Activity must have `occurredAt <= asOf` and lie in `[asOf - 7 × 24 hours, asOf]`. Friendship, privacy, consent, source visibility, deletion, and current source state are checked before scoring. Candidate construction follows the approved current source-state/activity contract; stale or invalid historical Activity records cannot remain eligible merely because they exist.

Recency points are:

```text
0 <= age < 24 hours       → 3
24 <= age < 72 hours      → 2
72 <= age <= 168 hours    → 1
otherwise                 → ineligible
```

Activity relevance points are:

```text
check_in_created  → 1
event_interested  → 1
event_going       → 2
```

Special Care points are:

```text
requester marked Activity owner Special Care → 2
otherwise                                    → 0
```

The score is:

```text
score = recencyPoints + activityRelevancePoints + specialCarePoints
```

The factor breakdown contains `recency`, `activity_relevance`, and Backend-private `special_care`, under formula version `friends_activity_v1`.

The total order is:

1. score descending;
2. `occurredAt` descending; then
3. the canonical unambiguous `(activityType, sourceRecordId)` tuple ascending using locale-independent lexicographic ordering.

Special Care applies only after eligibility and visibility. It is a soft weight rather than hard pinning, cannot restore an ineligible Activity, and does not enter Qwen, client responses to the friend, or ordinary logs. The final tuple is used only for stable tie-breaking and does not score.

## Readiness and deferred behavior

Q-03 is Resolved. Formula implementation is not Ready until its applicable Q-17 semantic fields, concrete DTO/schema mapping, tests, owner/reviewer, and platform evidence are present. Persona-to-Qwen remains independently Blocked and does not affect deterministic scoring.

Zero-result behavior and copy are subsequently resolved by [S-PM-0902-Q16](2026-09-02-recommendation-empty-result-contract.md). That decision does not alter these formulas, broaden eligibility, or permit zero-factor Event/Friend results. API/Firestore names and representations remain separate contracts.

## Authority and change control

This is a current PM recommendation decision. It is not a Sponsor/Supervisor decision, does not retroactively approve S-ALG4, and does not prove implementation or verification. S-ALG4's 0–100 scores, normalization, decay, weights, and tie-breakers remain unapproved wherever they differ from this decision.

Any formula change requires a new version and PM decision. Historical recommendation results retain the formula/configuration version used when produced; later changes cannot silently rewrite their basis.
