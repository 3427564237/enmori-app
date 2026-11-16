# Recommendation return and activity-card polish

Authority: [LI's continuation of items 3 and 4](../../decisions/2026-11-17-li-recommendation-card-polish.md). Branch: `souma/recommendation-card-polish-20261117`. Integration base: `88ed3b11`, preserving the completed Profile/Home density change and v74 friend-profile source `282a3f68`.

## Delivered changes

- A delayed detail-return regression reproduced Home's scroll offset falling from 914dp to 472dp when two recommendation cards were replaced by short loading copy. The Home presentation now retains **only the prior content height and placeholder count** while the existing fresh request runs. It does not retain card data or permit old participation actions. The Next group header remains in place but is disabled while loading.
- Placeholder geometry is scoped to the current subject and cleared on viewport width, text-scale or locale changes. Small slots use a compact progress indicator. Taller slots distribute loading feedback through the available height so a user at a lower scroll position does not see blank cards.
- Event overview cards prioritize the title, time and venue. Same-Singapore-day start/end times share one date and SGT label; cross-day ranges retain both dates. Source, price and category wrap together. Sold-out/cancelled/other nonavailable states and registration deadlines stay visible. Unknown end times remain explicit.
- A missing cover no longer inserts a prominent “No cover provided” row in overview cards. Available covers retain the same protected image reader; detail still distinguishes a missing cover from a failed image request. The existing omission of overview descriptions remains unchanged.
- Existing Interested/Going actions, selection semantics, ignore options, source attribution, ranking, Top 2 limit, required fresh reads, five-minute expiry and owner/access fences are preserved.

## Rendered evidence

All PNGs are actual production Flutter widgets rendered with **synthetic repositories and fixture callbacks**, not physical-device screenshots or service evidence. `before-cards` shows the old card presentation after the return-geometry fix had already been applied; it is a card comparison, not a baseline for loading behavior. The return defect is recorded by the failing test and its measured offsets.

The full Home fixture supplies only the callbacks needed by this test. Disabled unrelated Home shortcuts in its full-screen captures are fixture configuration, not changes to product availability. The single-card captures isolate the production `ConnectedRecommendationCard` raster directly, without image editing. Provider names and event text are synthetic display fixtures; no real event was fetched or marked Interested/Going.

| View | Before cards | Final cards |
| --- | --- | --- |
| English, 375 × 812 | [Before](before-cards/cards-en-phone.png) | [After](after/cards-en-phone.png) |
| Chinese, 375 × 812 | [Before](before-cards/cards-zh-phone.png) | [After](after/cards-zh-phone.png) |
| 320 × 640, 2x text | [Before](before-cards/cards-en-large-text.png) | [After](after/cards-en-large-text.png) |
| 812 × 375, 2x text | [Before](before-cards/cards-en-landscape.png) | [After](after/cards-en-landscape.png) |
| Tablet dark theme | [Before](before-cards/cards-zh-tablet-dark.png) | [After](after/cards-zh-tablet-dark.png) |

Additional views: [isolated Chinese card](after/single-card-zh-phone.png), [loading at retained position](after/refresh-en-phone.png), [large-text loading](after/refresh-zh-large-text.png). The dark theme is an injected Material theme for component compatibility testing, not a newly added app setting. Captures use Roboto, Material Icons, Playfair Display and a test-only CJK fallback.

## Verification and boundaries

Targeted checks cover delayed actual route return at 1x/2x text, required read count, scroll offset and extent, stale-result fencing, empty/error/expiry states, retry, ignored cards, independent detail/participation actions, Singapore midnight boundaries and 12/24-hour display. Render checks cover both languages, portrait, landscape, reduced motion and an injected dark theme.

Visual review found that the first centered loading design could leave a large-text viewport between its progress indicators. Distributed feedback and an explicit viewport-visibility assertion address that case. The old Browse assertion requiring a missing-cover row was updated to the newly approved overview presentation; the detail missing-cover checks remain.

Final command results, source/raster hashes and Android packaging evidence are recorded alongside this file. Overlapping test counts must not be added. No backend, dependency, service, real account data, remote publication or full-UAT claim is part of this UI increment. No phone was connected during these checks.

Final source verification: **1,840 Flutter tests passed**, the separate captured-font targeted run passed **40 tests**, static analysis found **no issues**, and `git diff --check` passed. The [verification receipt](verification.json) includes 8 baseline card screens and 24 final screens/card rasters. Dependencies are unchanged.

## Signed Android candidate

[v75 packaging receipt](android-v75-candidate.json): source `7db5ae5be6e4225cac09131dd79190377bb25883`, package `com.enmori.app.group`, version `1.0.0-ui20261117` / 75. The release APK is `/home/miku/Downloads/ENMORI-ui-v75-release.apk`. Package/version, non-debuggable status and the existing group signing certificate were verified. The standard Flutter release build completed with exit 0 and did not change the dependency files.

The candidate includes both 17 November UI increments and the v74 friend-profile fix. No phone was connected at the final packaging check; the APK has not been installed or physically accepted in this round.
