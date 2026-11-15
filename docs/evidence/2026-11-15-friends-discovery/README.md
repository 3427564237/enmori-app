# Friends and Event discovery usability — 15 November 2026

Authority: [LI's bounded implementation instruction](../../decisions/2026-11-15-li-friends-discovery-usability.md). Base: v67 delivery commit `060672f8`. Work branch: `souma/friends-discovery-20261115`.

## Delivered source behavior

- Friends has My friends / Activity / Discover tabs. Discovery retains its descriptive heading and requests remain in the app bar.
- Existing private Special Care is presented consistently as Starred. A list-row star reads the current profile/friendship revision, performs one existing protected mutation, and freshly reads the list even after an uncertain mutation failure. No optimistic success or automatic write retry. Starring on a later ordinary page retains that page.
- Starred and submitted name-search results traverse all authorized continuation pages, including sparse/empty pages. Unfiltered browsing retains ordinary pagination. A stopped scan remains explicitly incomplete and can continue; failures clear results rather than reporting an empty success. Repeated cursors fail closed. Access/session replacement, backgrounding and disposal retire stale responses.
- Events now has For you / Browse tabs. Browse remains the existing initial destination. For you lazily uses the complete existing personalized recommendation endpoint, its ordering, reasons and detail/participation routes. Returning to Browse preserves its search/filter state. An empty recommendation has a Browse action.
- No new endpoint, database/index, dependency, tracking or backend production change was introduced. Existing APIs support this client increment.

## Recommendation diagnosis

The new `backend/test/event-recommendations/gaming-selection-diagnosis.test.ts` uses the real classification, personalized source adapter and recommendation application over isolated in-memory records.

1. Gaming alone ranks an actual Gaming candidate above a Music candidate when both share the same activity area. Only Gaming contributes a matched-interest reason.
2. Changing the stored selection to Music is freshly read and reverses the interest contribution/order. Old Gaming matches are not retained.
3. With no Gaming candidate in the source, the v3 formula still returns Music on **same-area points alone**. Removing that location signal, with no other matching signals, returns an empty list.

This reproduces LI's symptom without a stale interest save and establishes a concrete existing-rule cause. It does **not** establish the current live account's saved interests, source coverage or exact response. The existing Flutter regression `saving Interests returns Home with a fresh recommendation request` also passes. Strict interest-only eligibility versus separately displayed discovery remains a product choice requested in the chat; no new formula or weight is silently selected here.

## Verification

- `fvm flutter test --no-pub --reporter expanded`: **1769 passed** on the final implementation; Flutter 3.47.2.
- `fvm flutter analyze --no-pub --fatal-infos`: **No issues found**.
- Backend compiled using pinned Node **24.19.0** and the existing locked TypeScript installation. The Gaming diagnosis, v2/v3 personalized sources and recommendation-profile suites: **39 passed**.
- `git diff --check`: passed.
- New tests cover sparse full filtering, continuation failure/cycle, stop/resume, background invalidation, empty search + star filter, current-revision mutations, uncertain write readback, late pre-mutation access changes, same-page refresh, and distinct Event sources with preserved search at 320px.
- Updated existing navigation tests to locate the new tabs. The first full Flutter run retained one failure caused by an obsolete ChoiceChip locator; after updating that locator, the final full run passed. A first new-test run also caught a missing required fixture formula version, corrected before the final run.
- The initial package-manager build command encountered an ambient Node/pnpm version mismatch. It did not establish a backend result. Compilation and the 39 tests subsequently succeeded using the already-installed pinned Node and locked compiler directly, without installing or upgrading dependencies.

## Visual and runtime boundary

`previews/friends.png` is an actual Flutter raster of the changed page, rendered with the app theme/fonts and synthetic data. It was visually inspected. Existing 320px/2x-text layout and action checks pass. It is not a phone screenshot.

The signed **v68** candidate (`1.0.0-friends20261115`, `com.enmori.app.group`) was built from source commit `248b2b853a851841ae73a8989f15b3c9812073fd` and copied to `/home/miku/Downloads/ENMORI-friends-v68-release.apk`. Its package/version, non-debuggable flag and existing release certificate were verified. Hash and build receipt: [android-candidate.json](android-candidate.json). Test summary: [verification.json](verification.json).

The first `--no-pub` release attempt failed because a generated registrant still referenced the integration-test plugin after tests. Rebuilding with normal release tooling regenerated registration correctly and succeeded, with no source or dependency-lock changes.

`adb devices -l` reported no connected devices. No installation, real-account interest/relationship change, cloud deployment, notification send or AI call was performed. APK creation is not physical-device acceptance.
