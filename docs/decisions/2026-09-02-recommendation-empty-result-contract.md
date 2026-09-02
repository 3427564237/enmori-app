# Recommendation empty-result contract — 2026-09-02

- **Status:** Approved; Q16 Common and Q16-A through Q16-C approved; Q-16 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q16
- **Approved scope:** Common empty-result semantics, privacy, telemetry, request independence, refresh behavior, module-specific public empty states, exact copy, and common UI behavior
- **Builds on:** [S-PM-0901-Q03](2026-09-01-deterministic-v1-recommendation-formulas.md), [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md), [S-PM-0902-Q14](2026-09-02-retention-logging-audit-policy.md), and [S-PM-0902-Q31](2026-09-02-qwen-runtime-failure-contract.md)

## Q16 Common Empty-Result Contract

An empty Recommendation result is a successful deterministic computation, not an AI, dependency, or transport failure.

Backend returns no fallback candidate that violates Q03 eligibility, positive-factor, or ordering rules. Top 2 may therefore contain zero, one, or two results.

Empty-state handling never invokes Qwen and does not create or retain user-visible Recommendation history entries. Privacy-minimised operational telemetry already permitted by the system logging/observability contract may still record the request outcome, such as an empty result count, but must not retain otherwise-ineligible candidate identities or protected eligibility reasons.

Home and See All are independent computations under Q14-C. An empty result from one request does not authorize reuse of stale results from another request.

The public empty state must not reveal whether candidates were removed because of another user's privacy, friendship/request state, blocking, deletion, or other protected eligibility data.

Refresh is a new normal Recommendation request with a new `asOf`; there is no automatic retry loop or hidden candidate broadening.

## Public reason boundary

Each module exposes only one successful public `empty` meaning. The Backend may distinguish request-local computation paths where needed, but they are not returned as protected subreasons, retained as product Recommendation history, or added to operational telemetry:

- Event Recommendation may encounter no valid Interest input, no eligible upcoming Event, or no positive match;
- Friend Recommendation may encounter no eligible candidate or no positive common factor; and
- Friends Activity may encounter no currently valid and visible Activity in the seven-day window.

## Q16-A — Event Recommendation

Approved copy:

- **Title:** `No event recommendations right now`
- **Supporting text:** `Update your interests or check again later.`

The empty state cannot insert a zero-interest-match Event, an already-started Event, or any otherwise-ineligible Event. If navigation is offered, it may open the existing Interest-management flow; Q-04 controls visual placement.

## Q16-B — Friend Recommendation

Approved copy:

- **Title:** `No friend recommendations right now`
- **Supporting text:** `Try searching for people or check again later.`

The empty state cannot disclose whether a person was excluded by privacy, blocking, an existing/pending relationship, or lack of shared factors. If navigation is offered, it opens the separate Add Friend search experience and does not merge search results into Recommendation ranking.

## Q16-C — Friends Activity

Approved copy:

- **Title:** `No recent activity from friends`
- **Supporting text:** `Check again later for updates from your friends.`

The public state does not distinguish no established friends, no recent Activity, privacy filtering, source deletion, or another protected eligibility cause.

## Common UI behavior

Home retains each Recommendation module and displays its approved empty copy instead of hiding the module. See All performs its own independent computation and displays the same module-specific copy when empty.

An empty Home result does not disable a later See All or Refresh request. Refresh performs a new normal Recommendation request with a new `asOf`. The public response exposes only the module's successful `empty` state and no protected subreason.

Q-04 still controls the presence and visual treatment of any refresh/CTA control, icons, placement, and loading transitions. Concrete DTO field names remain part of the later API contract.

## Authority and readiness

This is a current PM Recommendation behavior decision, not a Sponsor/Supervisor decision and not implementation or verification evidence. Q-16 is Resolved at requirement-contract level. It does not approve endpoint/DTO fields, HTTP mapping, visual layout, component styling, or implementation readiness.
