# Flutter query-coverage validation

17 November 2026. Implements the client portion of
[LI's confirmed query-level degradation decision](../../../decisions/2026-11-17-li-supplemental-query-degradation.md).

## Observed result

Home's recommendation section, standalone recommendations, Events / For you,
and Events / Browse display the explicit incomplete onePA coverage notice for
both empty and nonempty snapshots. The legacy Browse composition also displays
it. English: “Some onePA interest searches could not be loaded. The current
activity range is incomplete.” Chinese: “onePA 部分兴趣查询暂时无法读取，当前活动范围不完整。”
The existing whole-provider-unavailable notice remains separate; the render
fixtures deliberately combine unavailable Ticketmaster with available but
incomplete onePA to exercise both states.

Complete or unknown fresh snapshots remove the incomplete notice. Unknown is
not represented as complete. Coverage is never interpreted as absence of a
particular interest's events. Empty-state Edit interests and Browse actions
remain reachable by scrolling at 320px width and 2x text.

Recommendation parsing accepts the optional v3 top-level `sourceCoverage` and
keeps `sourceStatus` rows at exactly two fields. Browse reads optional
`coverageComplete` only inside an available onePA status row, without extending
the strict top-level shape. Both parsers reject malformed, duplicate, unsupported
or contradictory coverage. Domain constructors copy and freeze both metadata
maps. Browse pagination retains coverage and rejects a changed coverage map
within the same snapshot; a fresh read may replace it.

## Checks

- Seven new parser/domain/controller tests cover known/unknown coverage,
  malformed and contradictory wire data, immutable copies, v1/v2 omission,
  pagination continuity and fresh complete replacement.
- Seventeen new widget tests cover English and Chinese, four current surfaces,
  empty/nonempty results, refreshed complete/unknown state, existing source
  unavailability and reachable empty recovery actions, plus legacy Browse.
- Six focused test files passed together: **77 tests**. The final render/widget
  file was then rerun after strengthening the Home fixture and recovery-action
  checks: **17 passed**, included within the 77 rather than additional tests.
- Scoped Dart analysis reported **No issues found**; `git diff --check` passed.

Focused suite:

```sh
/home/miku/fvm/versions/3.47.2/bin/flutter test --no-pub --concurrency=2 \
  test/features/event_source_coverage_test.dart \
  test/features/event_source_coverage_ui_test.dart \
  test/features/event_recommendation_source_status_test.dart \
  test/features/event_batches_test.dart \
  test/features/event_browse_test.dart \
  test/features/event_recommendations_page_test.dart
```

## Rendering evidence and limits

The sixteen PNGs in [after/](after/) are actual Flutter widget renders at
320x640 logical pixels, 2x text, and 2x image capture resolution. The matrix is
`{home,standalone,for-you,browse}` × `{en,zh}` × `{empty,items}`. Each was visually
inspected. Text wraps without Flutter overflow, and the notice is readable.
Captures scroll to the coverage notice; content outside the viewport is
intentionally not shown. At enlarged text, the existing long English empty
heading and recovery controls require scrolling.

The Home images render the real recommendation section in a focused scrollable
host; they do not represent a full Home shell screenshot. All data is synthetic,
with repository/provider boundaries overridden. This is not a connected-service,
APK, TalkBack or physical-phone acceptance record. It does not establish live
Food/Dance availability. No APK was built by this validation task.

Rendering is opt-in through `ENMORI_QUERY_COVERAGE_PREVIEW`, so normal test runs
do not rewrite the tracked images. The captured run used the pinned Flutter
Roboto/MaterialIcons fonts and local SourceHanSansCN:

```sh
ENMORI_QUERY_COVERAGE_PREVIEW=docs/evidence/2026-11-17-interest-discovery/query-degradation/after \
ENMORI_CAPTURE_FONT=/home/miku/fvm/versions/3.47.2/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf \
ENMORI_CAPTURE_ICONS=/home/miku/fvm/versions/3.47.2/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf \
ENMORI_CAPTURE_CJK=/usr/share/fonts/adobe-source-han-sans/SourceHanSansCN-Regular.otf \
/home/miku/fvm/versions/3.47.2/bin/flutter test --no-pub --concurrency=2 \
  test/features/event_source_coverage_ui_test.dart
```

The earlier v76 screenshots remain intact in the parent evidence directory.
