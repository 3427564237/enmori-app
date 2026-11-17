# LI: supplemental onePA query degradation and resumed release

Date: 17 November 2026 (Asia/Singapore). Authority: LI / PM, current task.

## Evidence and explicit decision

The [initial iteration decision](2026-11-17-li-interest-discovery-uiux.md) required all fifteen onePA acquisition tasks to succeed atomically. Azure verification completed eleven tasks and 141 raw records before Gaming/game returned HTTP 403; the complete snapshot was correctly withheld. LI initially selected a UI-only candidate with Backend release deferred. Both that disposition and the [failed source evidence](../evidence/2026-11-17-interest-discovery/cloud-source-probe.json) remain retained.

LI then resumed the task ("不暂缓了，继续把"). Asked explicitly whether this changed the previously approved all-fifteen-success rule to isolated supplemental-query failures, incomplete-coverage messaging and release after validation, LI confirmed: **“是，按查询级降级继续完成并发布”**.

This decision supersedes only the supplemental-query atomicity requirement and the temporary Backend deferral. It authorizes the necessary coverage projection, client notice, regression/runtime validation and existing Backend/Android release path. It does not waive source access restrictions, privacy, the default-list completeness rule, cancellation fences, budgets, identity integrity, scoring or real-source Food/Dance acceptance.

## Acquisition semantics

- The default list remains one required atomic group: up to its existing five pages / fifty raw records. Failure anywhere in that group makes the entire current onePA acquisition unavailable.
- Each of the fourteen approved fixed supplemental first-page queries is its own atomic group. A group must finish response correlation, parsing and official-link validation before any of its rows are admitted. A failed group contributes no rows. Continue the remaining fixed tasks, with no retries, alternate keywords, extra pages, details, credentials, access-control workarounds or new sources.
- Every task must settle as complete or failed within the existing shared 180-second source budget. Exhausting that total budget, external cancellation, supersession or a late result still invalidates the whole acquisition. No deadline-triggered publication of in-flight work is introduced. Existing individual stage timeouts may fail a supplemental group within that shared budget.
- Retain one browser, at most four pages, one default worker and three supplemental workers, maximum 190 raw records and the same fixed manifest. Deduplicate admitted complete groups in default-then-manifest order. A genuine conflicting normalized identity across admitted groups still invalidates the entire onePA acquisition; do not select a convenient winner.
- A completed default group plus settled supplemental groups may produce available onePA data with incomplete coverage. No stale data from a failed group is reused. Retain five-minute cache/coalescing and bind items plus coverage to the same generation; pagination does not retry failed queries.

## Availability and compatible coverage projection

Availability means a validated current provider result is available, including a valid empty result. Coverage completeness separately means every approved acquisition group completed successfully. A degraded but valid onePA result is available with incomplete coverage; a failed required default group or total-budget failure remains unavailable.

Use one internal immutable source-coverage projection, captured with each batch and complete recommendation snapshot. Retire it with those results. Never serialize coverage read from mutable global provider observations.

For v3 recommendations, add optional top-level `sourceCoverage: [{provider:"onepa", complete:boolean}]`. Keep existing `sourceStatus` rows exactly `{provider, available}`: the delivered v76 recommendation reader requires those rows to have exactly two fields, while allowing unknown top-level fields. V1/V2 omit coverage as they omit source status.

For Browse, preserve the top-level shape accepted by existing strict v3 readers. Add optional `coverageComplete:boolean` only to the available onePA `sourceStatus` row; existing Browse readers allow additional row fields. The internal coverage remains separate from availability. Emit known coverage only with available onePA data; no coverage field for unavailable or unknown results. New readers reject malformed, duplicate or contradictory coverage; absence means unknown and never implies complete coverage.

The client shows a bilingual notice when onePA coverage is explicitly incomplete, for empty and nonempty Home/For you/standalone recommendation and Browse results. Explain that some interest queries could not be loaded and the current activity range is incomplete. Do not claim a specific interest has no activities or expose private exclusion reasons. Existing whole-provider-unavailable notices remain separate. Refresh to an explicitly complete snapshot removes the incomplete notice.

No new endpoint, contract header/version, storage schema, dependency or infrastructure is introduced. This wire projection difference is solely for compatibility with already delivered v3 readers.

## Acceptance and delivery

Verify required-default failures, supplemental HTTP/error/timeout isolation, completed-group-only publication, all-task settlement, global timeout/cancel/late fences, 190-record and four-page limits, conflicting identities, immutable coverage, cache reuse and old/new client compatibility. Validate notices and recovery in both languages and small/enlarged layouts.

Repeat the normal authorized candidate source pipeline with these rules. Record successes and failures without obtaining denied content or substituting another query. Confirm real Food/Dance activities through the actual personalization/application/transport path using the same complete admitted source snapshot, separately from synthetic tests. Then use the reviewed package-only release/rollback and a newly signed Android candidate containing the coverage notice. Preserve existing configuration, account data and AI owner/ledger. Phone installation and acceptance remain separately evidenced.
