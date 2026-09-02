# Recommendation and AI field allowlists — 2026-09-01

- **Status:** Approved; initially partial, fully resolved by S-PM-0901-Q19
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0901-Q17
- **Scope:** Q-17 purpose-specific field allowlists for deterministic recommendation and bounded AI
- **Builds on:** [S-PM-0831](2026-08-31-pm-requirements-decisions.md), [S-PM-0901-SCOPE](2026-09-01-comp3851b-mvp-scope-priorities.md), and [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md)
- **Detailed specification:** [`docs/superpowers/specs/2026-09-01-recommendation-ai-field-allowlists-design.md`](../superpowers/specs/2026-09-01-recommendation-ai-field-allowlists-design.md)

## Decision status

This decision resolves the field boundary for:

- Event Recommendation deterministic v1;
- Friend Recommendation deterministic v1;
- Friends Activity deterministic v1;
- consented Check-in conversational assistance without Persona injection; and
- bounded explanation/presentation of a single already-selected recommendation result.

At this decision point, Q-17 remained **Partially Resolved** because Active Persona data could not enter Qwen until a later Persona contract defined the exact `PersonaPresentationProjection`. S-PM-0901-Q19 subsequently approves that projection and closes the remaining gate; this sequence is retained rather than rewritten.

## Common allowlist boundary

Data use is deny by default. Every purpose-specific contract identifies its data subject, source, allowed semantic field, processing stage, authorization/privacy precondition, and prohibited fields. Approval for one purpose does not permit reuse for another.

Authorization, relationship, privacy, consent, and purpose checks occur before candidate construction, scoring, or AI-context construction. Deleted, invalid, unauthorized, or consent-withdrawn data does not enter new computation. Complete Firestore documents, arbitrary maps, unrestricted history, and client-selected database context are prohibited.

A derived value is allowed only when every input is allowed for that purpose and its deterministic source remains explainable. Precise, live, continuous, and background location is prohibited. Approx Location also requires explicit purpose approval and is not approved for any deterministic v1 recommendation or Qwen payload in this decision. Mood, Note, Activity, and related content cannot be used for mental-health or other sensitive inference.

Persona affects presentation only. Qwen receives only an already-authorized, filtered, minimized, purpose-specific payload. Recommendation explanation may verbalize an existing deterministic reason but cannot introduce a new factor, fact, score, candidate, or order. Permission to compute does not imply permission to return, log, or retain the same field.

## Event Recommendation v1

Allowed semantic inputs are:

- verified current-user UID for request ownership only, never scoring;
- the user's selected, valid Interest Tag IDs for matching;
- opaque Event ID for result identity only;
- Event active/published status and start/end time for eligibility only;
- valid Event Interest Tag IDs for deterministic interest matching; S-PM-0902-Q12 subsequently supersedes the ambiguous Category/Tag wording and excludes the separately typed Event Category ID from v1 scoring;
- Backend server time for time eligibility; and
- matched Tag safe display names and an existing deterministic reason for explanation.

Check-in content, Mood, Activity, Weather, Approx Location, precise location, demographics, friend data, Friends Activity, Special Care, Persona, AI conversations, Interested/Going counts, and global popularity are prohibited from v1 ranking. Event title, description, venue, and external URL may be used after ranking for separately authorized presentation but do not enter v1 scoring or Qwen recommendation decisions.

## Friend Recommendation v1

Allowed semantic inputs are:

- verified current-user UID for request ownership only;
- opaque candidate user ID for identity only;
- candidate active/eligible account state;
- candidate Profile Privacy for discoverability;
- friendship and pending-request relationship state to exclude self, existing friends, duplicates, and already-pending relationships;
- both users' valid Interest Tag IDs to derive shared interests;
- both users' purpose-authorized Interested/Going Event IDs to derive common Events; and
- safe shared-Tag display names, common-Event count, and an existing deterministic reason for explanation.

Only candidate Event associations already permitted for this requesting user and purpose may contribute. Backend may derive shared-interest identifiers/count and common-Event count, but does not expose the candidate's full interests or Event history. Check-in content, Mood, Activity, Weather, Approx Location, Footprint, Calendar, Persona, AI conversations, demographics, and Special Care are prohibited. Approximate/contextual overlap is not enabled in deterministic v1. Display name and avatar may be used after ranking under Profile Privacy but do not score.

## Friends Activity v1

Allowed semantic inputs are:

- verified current-user UID for request ownership only;
- opaque friend user ID and accepted-friendship state for candidate eligibility;
- owner Profile Privacy, relationship, and applicable Activity consent/visibility state for pre-ranking filtering;
- opaque Activity/source-record ID and approved Activity type for identity and deduplication;
- server-authoritative occurred/published time for recency;
- approved Activity type/category for later Q-03 relevance calculation;
- the requesting user's private Special Care boolean for Backend-only ordering weight; and
- safe Activity type, non-precise time category, and deterministic reason code for explanation.

Special Care never bypasses eligibility or visibility, never notifies the friend, and does not enter Qwen. Ranking does not read complete Check-in or Event documents. Check-in Note, Mood, Weather, Approx Location, Footprint route, Persona, AI conversations, the friend's Interest profile, demographics, and location overlap are prohibited. Deleted, consent-withdrawn, or no-longer-visible sources disappear from new candidate results.

The exact Activity type/category enum remains subject to its approved domain contract. An unapproved type cannot enter the candidate set.

## Consented Check-in conversational assistance

The Backend may construct a Qwen request from:

- the current user message;
- no Persona data until `PersonaPresentationProjection` is approved; and
- at most five eligible Check-in projections selected from the Backend-authoritative preceding-seven-days window.

The Backend captures one trusted `asOf` at Use Case start. The rolling window is `[asOf - 7 × 24 hours, asOf]`. Selection uses the server-authoritative persisted Check-in timestamp. The client cannot set `asOf`, the window, or the limit. The Backend first removes unconsented, deleted, unauthorized, future-dated, and out-of-window records; sorts the remainder newest-first; uses opaque record ID only as a stable selection tie-break and never as AI input; and selects at most five. The same `asOf` applies for the complete request.

Each selected Check-in is projected only to:

- UTC `occurredAt`;
- authorized `noteText`;
- normalized safe `moodLabel`;
- normalized safe `activityLabel`; and
- normalized safe `weatherConditionLabel`.

Qwen does not receive the Check-in, Activity, or Weather object; provider payloads; arbitrary maps; IDs; metadata; temperature; coordinates; provider name; Approx Location; Firestore paths; internal references; or undeclared fields. MVP requests do not automatically attach stored conversation history. Note, Mood, and future Persona projection values remain untrusted content and cannot override the system safety or purpose boundary.

## Recommendation explanation/presentation

Qwen may receive one result already selected by deterministic Backend logic, never a candidate set. The minimum explanation payload may contain:

- module type, an authorized result display label, and stable deterministic reason code;
- for Event Recommendation, matched Interest Tag safe display names;
- for Friend Recommendation, shared Interest Tag safe display names and common-Event count; or
- for Friends Activity, authorized Activity type and non-precise time category.

Candidate profiles, full interests, Event histories, relationship graphs, Check-in content, scores, score vectors, and competing candidates are prohibited. Special Care does not enter Qwen; any approved explanation of its private influence must use a deterministic Backend template. Qwen may reword an existing reason only and cannot modify eligibility, score, order, or result identity.

## Persona projection gate at this decision point

The only future Persona input allowed in principle is a Backend-produced and validated `PersonaPresentationProjection` derived from the current Active Persona. The Persona object, Firestore document, arbitrary configuration map, IDs, owner/lifecycle fields, history, and undeclared free fields are prohibited.

The projection must be lower-priority untrusted presentation data and may affect only approved tone/style presentation. It cannot alter system safety, purpose, allowlist, authorization, candidates, scores, order, tool access, or fallback. Its exact fields and value domains were not approved by this decision and were therefore Blocked / Not Ready at this point in the trail.

## Later Persona projection resolution

S-PM-0901-Q19 subsequently approves `persona_presentation_v1` with only `schemaVersion`, `tone`, `responseLength`, and `formatStyle` under their approved enum values. Backend excludes Persona identity, owner, display name, revision, timestamps, original objects, and free text. This closes the remaining Q-17 gate. See [`2026-09-01-persona-conversation-lifecycle.md`](2026-09-01-persona-conversation-lifecycle.md).

## Explicitly deferred

This decision does not approve:

- numeric weights, normalization, recency/relevance formulas, score ranges, tie handling, or Top 2 truncation behavior;
- Activity type/category enum values;
- API DTO names, Firestore field names, collection structure, indexes, or migrations;
- Persona projection fields or values, Persona deletion, or historical-conversation semantics;
- AI conversation retention, logging/audit period, historical context, or deletion schedule;
- empty-state, no-candidate, unavailable-model, unsafe-output, or user-facing fallback copy;
- Qwen timeout, concurrency, runtime parameters, output schema, or safety-validation implementation; or
- permission to add fields not listed above.

These remain controlled by Q-03, Q-14, Q-16, Q-19, Q-31, applicable feature contracts, and later PM decisions. S-PM-0901-Q03 subsequently resolves the v1 formulas, and S-PM-0901-Q19 subsequently resolves the Persona fields/projection and lifecycle; the other deferred boundaries remain separate.

## Later incremental formula decision

The PM subsequently resolved Q-03 in [`2026-09-01-deterministic-v1-recommendation-formulas.md`](2026-09-01-deterministic-v1-recommendation-formulas.md) (S-PM-0901-Q03). That decision supplies fixed v1 points and total ordering for the approved recommendation fields. It does not change this allowlist; S-PM-0901-Q19 separately closes the Persona projection gate.

## Authority and change control

This is a current PM data-use decision. It is not a Sponsor/Supervisor decision, does not retroactively change COMP3851A behavior or evidence, and does not prove implementation or verification. A Week 9 Must remains Not Ready while any applicable formula, lifecycle, retention, fallback, runtime, UI, ownership, testing, or platform-evidence gate is unresolved.
