# Recommendation empty-result design

- **Status:** Approved PM design; Q16 Common and Q16-A through Q16-C approved; Q-16 Resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q16
- **Implementation status:** Not implemented or verified

## Common contract

An empty module is a valid successful deterministic result. It contains no invented or broadened candidates, invokes no Qwen processing, and creates no user-visible Recommendation history.

The only retained/request-adjacent evidence is the aggregate non-content telemetry already authorized by Q14-C and Q14-D. A returned-result count of zero is permitted. Candidate identifiers, scores, factors, order, and protected eligibility/exclusion reasons remain prohibited from operational logs.

```gherkin
Given no candidate satisfies the approved module eligibility and positive-factor rules
When the Recommendation computation completes
Then the result is a successful empty result
And no otherwise-ineligible or zero-factor candidate is inserted
And Qwen is not invoked
```

```gherkin
Given a Recommendation request returns zero results
When operational telemetry is recorded
Then the approved returned-result count may be zero
But no excluded candidate identity or protected exclusion reason is retained
```

```gherkin
Given Home returns an empty module at asOf A
When See All or Refresh creates another request
Then it captures a new asOf
And it recomputes independently
And it does not reuse a stale result merely to avoid an empty state
```

## Module contracts

| Module | Approved title | Approved supporting text | Protected public boundary |
|---|---|---|---|
| Event Recommendation | `No event recommendations right now` | `Update your interests or check again later.` | Does not expose input/eligibility/match subreason or add zero-match/ineligible Events |
| Friend Recommendation | `No friend recommendations right now` | `Try searching for people or check again later.` | Does not expose privacy, block, relationship/request, or shared-factor subreason |
| Friends Activity | `No recent activity from friends` | `Check again later for updates from your friends.` | Does not distinguish friend count, recent-data absence, privacy filtering, or source deletion |

Each module exposes one public successful-empty meaning. Request-local branches may distinguish computation paths where necessary, but protected reasons cannot become response detail, product history, or operational telemetry.

```gherkin
Given an empty Friends Activity computation
When the Home or See All state is presented
Then the title is "No recent activity from friends"
And the supporting text is "Check again later for updates from your friends."
And the response does not identify why no Activity was eligible
```

## Common UI behavior

Home retains the module card and uses its approved empty copy. See All independently recomputes and uses the same copy when empty. Refresh is a new ordinary request with a new `asOf`; it does not reuse stale results, broaden candidates, or start an automatic loop.

Event may navigate to the existing Interest-management flow and Friend may navigate to the separate Add Friend search experience if Q-04 includes such controls. Search results do not enter Recommendation ranking. Q-04 retains authority over control presence, layout, iconography, loading, and other visual behavior.

Q-16 is resolved at the behavior/copy level. DTO names, HTTP mapping, implementation, and test evidence remain separate gates.
