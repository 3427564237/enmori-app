# LI: interest-first Event recommendation ordering

Date: 15 November 2026 (Asia/Singapore). Authority: LI / PM, current task.

## Confirmed instruction

After the Gaming-only / Music diagnostic, LI answered the pending ranking question:
“兴趣匹配优先，其他根据位置，年龄好友等其他影响算法的往下排序”.

This resolves the pending Event ordering choice in
[the Friends/discovery decision](2026-11-15-li-friends-discovery-usability.md).
Implement interest-first ordering while retaining other genuinely relevant candidates.

## Bounded ordering

1. Events with at least one currently selected, active, explicitly classified interest match precede every Event with no such match.
2. Within each of those two groups, retain the existing total score descending, then start instant ascending, then stable Event identity ascending.
3. Preserve existing factor weights, eligibility, private-data permissions, ignore state and truthful reason receipts. Non-interest candidates still need an existing positive permitted signal; no-interest matches are not fabricated. If there are no interest matches, other qualifying candidates remain available in their normal score order.
4. Rank the complete eligible set before Home Top 2 and subsequent groups. Fresh selection reads can move candidates between the groups. The Flutter client keeps the authoritative Backend order.

This changes Event ordering only, including the legacy v2 representation. It does not change Friend recommendations or Friends Activity. The v1 result is unaffected because every eligible v1 candidate already has an interest match.

## Compatibility and supersession

This explicitly supersedes score-only precedence for Events in the delegated
[25 October recommendation decision](2026-10-25-li-recommendation-completion.md),
[28 October v3 decision](2026-10-28-li-event-profile-discovery.md),
[v2 contract](../../api/recommendation-v2-contract.md) and
[v3 contract](../../api/event-profile-discovery-v3.md). Those records remain.
The formula identifiers retain their existing factor/weight and wire meanings;
this amendment adds an ordering priority, not a new factor or score. No DTO,
endpoint, schema, dependency, data migration or new version field is needed.
Installed compatible clients, including the v68 candidate, consume the new
order after a fresh recommendation read once the Backend update is running.

Use the existing service deployment mechanism if available and verify its
current package before replacing it; do not introduce a new host or alter
service settings, AI budgets, notification dispatch, or account data for this
ranking increment. Preserve rollback and distinguish source tests, deployment,
live account results and physical-device acceptance.
