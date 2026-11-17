# Interest discovery and usability iteration

Authority: [17 November LI decision](../../decisions/2026-11-17-li-interest-discovery-uiux.md). Base: v75 `936176ddbaa8878022754f6cf8408775c5e93e02`; isolated branch `souma/uiux-interest-coverage-20261117`. Prior Home/Profile/card and friend-profile repairs are retained.

## Delivered behavior

- onePA: shared public manifest of default five pages plus fourteen fixed first-page queries, maximum 190 raw records, stable identity deduplication and a finite title vocabulary. One browser, four pages, one 180-second deadline; all fifteen tasks are required. A failed acquisition publishes no partial/stale onePA candidates. Ticketmaster stays independent.
- Explicit `Published:true` and `Published:1` are accepted; absent/ambiguous privacy, private/invitation/password and timezone checks remain. Food/Dance/Music flow into existing interest-first ranking, with Music's configured catalogue identity preserved.
- Optional v3 recommendation source availability belongs to the complete captured snapshot. V1/V2 omit it. Empty and nonempty recommendation views show provider degradation independently from bounded-range empty results.
- Home/standalone Browse goes directly to Browse; ordinary Events opens For you. Date filters traverse bounded remaining pages and offer stop/continue/clear without claiming an interrupted search is empty.
- Interests have local name search, removable selected summary and visible count/save controls. The existing limit, inactive references, revision conflicts and unsaved-exit behavior remain.
- My plans is available in the common Events header. Empty recommendations provide Edit interests and Browse. The edit route also works in the existing browse-disabled composition.

## Verification

Pinned tools: Node 24.19.0, Flutter/Dart 3.47.2, existing dependency lockfiles. No dependency changes.

- TypeScript compilation and full Backend regression: **1,974 passed**.
- Final static Flutter analysis: **no issues**.
- Final full Flutter regression: **1,876 passed**. Six focused Emulator suites: **28 passed**. [Verification receipt](verification.json) retains log hashes. Cloud and release results are separate below.
- The first full Flutter run found two outdated assertions for the approved My plans placement and completed date-filter range. Both related files subsequently passed all 13 tests. A new browse-disabled edit-route regression passed with the entire 21-test recommendation UI file.
- Emulator execution identified old test prerequisites: isolated Auth/Firestore ports, explicit friend recommendation opt-in, and the approved internal participation `selectedAt` field. Only fixture/runner expectations were corrected; no production privacy or participation rule was loosened.
- One earlier full Flutter run exposed an existing OSM test race: the cache worker had not persisted the stale metadata before the next read. The test now waits for bounded metadata readback; production caching is unchanged. The isolated file passed and the subsequent full run passed all 1,876 tests.

`after/` contains 26 actual Flutter-rendered PNGs with synthetic data: English/Chinese, normal phone, 320px with 2x text, landscape, interest keyboard inset, and healthy/degraded empty recommendations. The interactions and hit targets are exercised by `interest_discovery_render_test.dart`, `interest_discovery_usability_test.dart`, and `recommendation_empty_render_test.dart`. These are widget evidence, not a device acceptance record.

## Runtime and packaging boundaries

[Operator preparation](operator-preparation.json) includes independent review, 35 Python and 22 Node offline checks of the existing forward update and an exact-package reverse path. Reverse activation retains v71, unchanged settings and the normal renewable owner acquisition; its exceptional stopped-after-start boundary is explicitly recorded. These offline checks are not a rollback execution claim.

The existing v71 backend package was downloaded and verified before any switch: `2026111511215971.zip`, SHA-256 `11a06e77848a74ddc8c1faa3221302fe2f93c5c9631264239f827dae2a187604`, source `a447689781b8b389c972009380a25c63f39fd5d7`. Its Backend/dependency/runtime launcher baseline matches this branch's inherited v75 Backend. The release uses the existing single-service package update, stopped/drained activation and service-owner verification; no configuration, grant, account or database migration is part of this iteration.

[v76 Android candidate](android-v76-candidate.json) was signed with the existing group certificate: package `com.enmori.app.group`, version `1.0.0-discovery20261117` / 76, APK `/home/miku/Downloads/ENMORI-discovery-v76-release.apk`. The release build passed; the package is non-debuggable and dependency files are unchanged. This packaging receipt alone does not establish the backend release or phone acceptance.

The first pre-switch source probe lost its SSH transport before a final result; it is not counted as source success or failure. A read-only reconciliation verified the old package remained mounted and the probe process had ended before retrying with a longer SSH channel. The onePA source deadline stays 180 seconds.

Final pre-switch result: [cloud source receipt](cloud-source-probe.json) records **11/15 tasks and 141 raw records in 80.779 seconds**, followed by a real **HTTP 403 on Gaming/game**. Request keyword/paging correlation was correct. The approved all-or-nothing onePA acquisition correctly returned unavailable; no complete snapshot or real-source application result was produced. The prior timeout, single-page success and instrumented attempt are retained as separate hashed artifacts. The complete source release gate therefore remains **not passed**. No backend package was prepared/activated and the existing v71 selector was retained.

The real adapter/application/transport verification helper passed its positive and empty synthetic self-tests, but was not run on a complete real-source snapshot. Food/Dance mapping is implemented and regression-tested; **live Food/Dance recovery is not accepted or deployed**. LI has been asked whether to retain the atomic policy and defer Backend release or authorize a separate query-level degradation design. No such change has been assumed.

Fourteen mapping rules and fixed searches do not guarantee fourteen currently eligible event categories. Food/Dance acceptance must identify actual source candidates and application results. Physical retained-data acceptance is separate from signed APK and cloud HTTP evidence; no phone was connected at the packaging preparation check.
