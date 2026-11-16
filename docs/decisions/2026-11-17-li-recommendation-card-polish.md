# LI — Continue recommendation and activity-card UI refinement

Date: 17 November 2026. Authority: LI / PM in the current UI chat.

After delivery of items 1 and 2, LI instructed “继续优化其他”. In the existing four-item review, this continues items 3 (recommendation loading/return experience) and 4 (activity-card density). Preserve the prior Profile/Home improvements and the separately approved v74 friend-profile repair.

## Bounded implementation

- Diagnose avoidable recommendation reloads or scroll jumps, then fix demonstrated presentation/lifecycle problems. Loading must remain visible and cancellable by existing navigation; errors, empty results and locally expired content remain distinct.
- Keep the existing mandatory fresh reads on route/foreground return, five-minute invalidation, owner/access fences, backend ordering and Top 2 projection. Do not add result caching, stale cards, automatic retries, API changes or a new freshness policy to hide latency.
- Improve scanning of existing activity cards: prioritize title, time and location; group secondary source/price/status information; reduce unnecessary placeholders and spacing while retaining truthful unknowns, source attribution, status/deadline warnings and existing participation actions. Full detail information remains available through the existing route.
- Use production Flutter renders with synthetic fixtures and relevant small-screen, text-scaling, theme and interaction checks. Physical-device evidence is separate.

## Preserved sources and supersession

- [15 November layout decision](2026-11-15-li-home-layout-refinement.md) and [17 November items 1 and 2](2026-11-17-li-profile-home-density.md) remain in effect. Only the previous statement that items 3 and 4 are proposals is superseded by this continuation.
- [Home recommendation repair](2026-10-20-li-home-events-repair.md), [Event content/performance](2026-11-15-li-event-content-performance.md), [Event regression repair](2026-11-15-li-event-regression-repair.md), and [overview without an introduction](2026-10-29-li-event-overview-without-introduction.md) retain their data, freshness and content boundaries. This increment changes presentation only, except for evidence-backed fixes that restore those existing rules.
- [v74 friend profile repair](2026-11-16-li-friend-profile-repair.md) is integrated unchanged from source commit `282a3f68`; no new friend behavior is selected here.

No new backend, dependency, data model, provider activation, deployment, remote publication or full-UAT acceptance is implied.
