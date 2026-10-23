# LI Home Event recommendations repair — 20 October 2026

Source: `3a885b1bcfdb5ab7266d0482675a552e614c3344`, branch `souma/li-zhou-runtime-20261020`, Draft #165. Authority: [LI takeover](../../../decisions/2026-10-20-li-home-events-repair.md). Subsequent documentation does not change APK production source.

## Findings and change

`EventRecommendationsController.clear()` previously converted both the five-minute expiry and page lifecycle invalidation into `AppFailureKind.serviceUnavailable`. Presentation converted that local invalidation into “This service is temporarily unavailable”. This is a demonstrated code defect independent of provider health. The final implementation uses an explicit local refresh-needed marker, removes old cards, and offers manual Refresh. Actual transport failures retain the separate error/Retry panel. There is no automatic retry loop or stale fallback.

The social Home previously contained Browse/Recommended activities entry buttons but no inline recommendations. The connected Home now uses the existing repository-backed Top 2 section with stable Event ID navigation. Successful empty and populated reads have a manual Refresh action. Existing interest matching, Q16 empty copy, manual browsing and separate all-results computation remain unchanged. Unwired presentation-only previews do not instantiate a repository consumer.

A single authenticated read using the existing dedicated synthetic account returned own interests 200 with **zero selected interests** and Home recommendations 200 with **zero items**. No account/interest/consent/business data changed and no model request or runtime restart occurred. This empty result is consistent with zero interest matches. Earlier real browse 200/18 and native v12 failures remain historical evidence; these reads do not prove the cause of every earlier failed Retry. No new provider outage or Backend fix is claimed.

## Concentrated checks

- The first new lifecycle test could not compile because the test incorrectly awaited a void binding callback; corrected the test syntax. This was not a demonstrated pre-fix behavior failure.
- One batch: `flutter test --no-pub test/features/event_recommendations_page_test.dart test/app/home_event_navigation_test.dart test/app/shared_uiux_test.dart test/app/controlled_demo_app_test.dart`: **22 passed / 1 failed**. All three new regression cases passed: lifecycle invalidation, five-minute expiry/empty recovery, inline social Home Top 2. Existing real request failure/Retry and route/session cases also passed.
- The remaining old composition test expected no Home recommendation request. Updated it to assert the actual authorized sequence `home → all → home`, preserving HTTPS/authentication, route, card, Back and no-error assertions. Re-ran only that case: **1/1 passed**. No repeated full suite and no addition of overlapping counts.
- Full `flutter analyze --no-pub`: no issues. Final Dart formatting and `git diff --check`: pass. One pre-existing long line in the touched composition test was formatted without behavior change.
- Logs are local under `build/li-uiux-review/home-events-*`; no sensitive response/configuration is committed.

## Limits

ADB reported no connected devices. This candidate has **not** been installed or checked on the phone. The lifecycle/expiry fix and inline cards are component-verified, not a new native acceptance claim. Real populated recommendation cards for a Music-selected account and the original transient native Retry failure remain to verify on a connected device; do not silently change this user's interests to manufacture recommendations. SHI retains participation/registration/next-batch implementation; JIN retains friend activity. No main merge or whole-app Done claim.
