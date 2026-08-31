# ENMORI Domain Language

This glossary defines the canonical product terms used across ENMORI requirements, planning, design, and implementation. It defines language only; it does not approve architecture or implementation details.

## Product and history

**ENMORI**:
The current public product name. Nexus Five is the team name.
_Avoid_: Campus Connect, Nexus Five as the product name

**Check-in**:
A user-owned timestamped record containing at least a Note or Mood and optional permitted context.
_Avoid_: Check-in post, status update

**Calendar**:
The user's monthly Check-in history view, including selected-date summaries and navigation to the same date in Footprint.

**Footprint**:
The selected-date Check-in history and permitted approximate-location route view.
_Avoid_: Check-in Timeline

## Events and discovery

**Interested**:
An event-interest intent independent from Going.

**Going**:
The user-facing event status recorded through explicit user action or confirmation; it does not prove third-party registration completion.
_Avoid_: Booked externally

**Booked**:
An internal business meaning associated with Going, not a separate user-facing state or proof of third-party completion.

**Friends Activity**:
Visibility-filtered eligible activity from established friends, ranked only after filtering.
_Avoid_: Activity Recommendation

**Friend Recommendation**:
A passive People You May Want To Know result, separate from My Friends search and Add Friend search.

**Special Care**:
A private per-user flag for any established friend, with no friendship-duration threshold; it influences ranking or pinning only.

## AI presentation

**Persona**:
One of up to five user-defined AI presentation configurations, with no authorization, eligibility, or recommendation-ranking power.

## Administration

**Interest Tag**:
A controlled catalogue value used by profiles, events, recommendations, and approved AI context.

**Event Category**:
An Admin-managed catalogue classification for events whose permanent deletion is blocked while referenced.

**Recommendation Configuration**:
A versioned configuration of recommendation factors that are already implemented and approved; Draft changes affect new recommendations only after Publish.

**Account Action Request**:
An auditable Pending proposal to Disable, Suspend, Delete, or Restore an account; the request does not itself change account state.
