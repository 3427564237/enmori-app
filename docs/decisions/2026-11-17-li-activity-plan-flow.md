# LI: choose an activity, save a plan, find it again

Date: 17 November 2026 (Asia/Singapore). Authority: LI / PM, current chat.

## Confirmed scope

LI selected the first three proposed improvements against v78, followed by
physical-phone acceptance: “先做前 3 项，再完成真机验收”. Implement from
v78 source `d544ce6c`, retaining the complete earlier release history.

1. My plans cards show the authorized event time and venue from the existing
   detail read. Keep plan-update time distinct. Move Interested/Going controls
   next to the event detail summary, before long descriptions.
2. Show saved interests and the current activity area even when recommendations
   exist. Provide direct interest editing and reuse existing area selection.
3. A successful Ignore recommendation action offers immediate Undo using the
   existing restore operation. Keep participation status, session/revision
   fences, unknown-write reread requirements and the Hidden recovery route.
4. Verify real interest matching, route return, background/foreground and
   network interruption on the connected Android phone. Retain application data
   during upgrade. Source tests, synthetic renders, APK checks and physical
   results are distinct evidence.

Admin onePA warm-up status is a subsequent proposal, outside this increment.
No backend, API, persistence, ranking, source acquisition, dependency or
infrastructure changes are selected.

## Preserved sources and precise change

- [Participation P01–P06](2026-10-20-li-event-participation-selection.md):
  ignored remains independent of Interested/Going; only current confirmed
  revisions may be changed. Undo clears ignored without restoring older status.
- [Event return and freshness](2026-10-26-li-reference-and-event-usability.md):
  keep authorization, source expiry, refresh and unavailable-content behavior.
- [Interest discovery](2026-11-17-li-interest-discovery-uiux.md): extend the
  empty-state edit entry to a persistent conditions summary. Preserve interest
  limits, inactive references, save/conflict/unsaved-exit behavior and tab return.
- [Card polish](2026-11-17-li-recommendation-card-polish.md) and
  [v78 loading](2026-11-17-li-activity-loading-performance.md): retain visual
  conventions, ordering, Top 2, waiting controls and source coverage semantics.

Only the listed presentation and recovery-entry changes supersede the older
placement. No whole-project or physical acceptance is implied by this record.
