# SHI Activity display explanation and disclosure increment

15 October2026 SGT. Owner SHI; reviewer ZHOU. Based on accepted #110 `0b730c52fd62ddfc02bdc7166ab1a80374eb2681` and its unchanged reviewed feature. Implements the [explicit LI page-local handoff](../../decisions/2026-10-15-li-activity-disclosure-implementation-handoff.md), not a new interface/consent/provider choice. Exact source head is bound in the new Draft PR description after publication.

## What the user sees

| Surface | Display / action |
| --- | --- |
| Activity list | `Browse activities`; existing `Source: Ticketmaster` and first-batch/not-full-catalogue message remain. Each supplied card shows title, exact returned UTC start and end or `End time unavailable.` Selecting forwards only the browse locator to Detail. This increment does not localize timestamps or change sorting/filtering/pagination. |
| List footer | Adds LI's exact data-flow paragraph below the current Reload/Retry control. It remains available during loading, genuine empty and failure states; it is not an empty-success or provider-availability claim. Long copy can be reached by scrolling. |
| Detail | Title, `Starts: …`, optional end/location/category or explicit unavailable labels; description remains unavailable under the approved minimized projection. Adds LI's exact browser/copy explanation **before** the existing primary `View on Ticketmaster` and auxiliary `Copy source link` controls. No action launches automatically. |
| Shared footer | Adds LI's exact optional five-minute/background/signout/Reload sentence to both pages. Existing controller clears at five minutes from read initiation, not five additional minutes after response. It does not clear OS clipboard/browser copies. |
| State / failure | Existing loading/empty/safe failure/Retry and explicit Reload semantics remain. Auth/session/background/disposal/age invalidation and late-result suppression are unchanged. Notice rendering issues no new read. Link open/copy does not register or mark Going. |

## Exact added copy

List footer:

> Source: Ticketmaster. Activity requests pass through ENMORI to Ticketmaster. Your ENMORI sign-in token, profile, Check-ins, Personas and AI messages are not shared with Ticketmaster. Ticketmaster receives the activity request and server connection information.

Detail explanation:

> “View on Ticketmaster” opens the source page in your browser. Your browser connects directly to Ticketmaster; its privacy and cookie policies apply. Opening or copying a link does not register you or mark you as Going. A copied link can remain on your device's clipboard.

Shared lifetime:

> This activity view stays in ENMORI's memory for at most five minutes and clears when the app goes into the background or you sign out. Reload to request current information.

These strings are taken verbatim from [LI's packet at dcb94d9](https://github.com/3427564237/enmori-app/blob/dcb94d925b8010e02d41f033e84ed3902ab08559/docs/planning/2026-10-15-li-event-disclosure-and-removal-packet.md), not a quoted provider licence or new privacy guarantee. The existing adapter sends only the selected fixed search or validated source ID and private developer key; it does not forward caller token/profile/Check-in/Persona/AI fields. Standard server connection information may still be observable. Browser and OS copies retain the packet's distinct lifetime limits.

## Actual SHI checks

Pinned Flutter3.47.2/Dart3.13.2; existing dependencies, no install/lockfile change. Only `activity_page.dart` and its focused test file change product/test behavior; the controller, Backend, API, providers, shared app/router/platform and active preview are untouched.

- Pinned Flutter `test --no-pub --reporter expanded test/features/event_browse_test.dart`: **10/10 Pass**, no failures. Eight inherited feature cases retained plus two disclosure cases.
- New cases verify exact list footer in valid empty and safe failure states, no hidden extra reads, Detail notice before source action, zero automatic launches/exact URL transfer, and list/Detail scrolling at320×640 with2× text. Existing copy-fallback, session/background/five-minute and stale-result assertions remain.
- Pinned Dart `analyze --fatal-infos lib/features/event_browse test/features/event_browse_test.dart`: Pass, no issues.
- Non-writing format and `git diff --check`: Pass.

Early fixture runs retained **9/10**, **9/10** and **8/10** failures: a scroll had not yet produced a layout frame, and long disclosure paragraphs put sibling controls/text outside ListView's lazy build cache or retained scroll position. The fixture now actually scrolls/builds the requested control, pumps layout before hit testing and restores a consistent initial position; it does not suppress missed taps, skip tests, shorten copy, change business behavior or weaken action/lifetime assertions. Final10/10 follows those test-only interaction corrections.

No repeated full unchanged Flutter/Backend/Emulator suite, APK build, real provider/model/service/Android/browser operation. These are synthetic widget/source checks, not new human accessibility or device acceptance. Prior accepted adapter/SDK/native/provider results retain their own source/operator attribution.

## Integration / next gates

ZHOU reviews only this small new feature delta. LI consumes the exact changed page in the shared connected candidate, retains existing router/native opener and verifies the newly rendered notice at the actual integrated head/device. JIN's separately default-disabled Event service join does not block this fixture delivery. SHI does not alter either owner's branch or live preview.

The packet's provider-use conditions and source-disable/in-flight-zero-fetch/client-clear/owned-copy inventory/removal exercise remain LI/JIN's actual execution gates. Displayed text does not authorize real activation, remove a foreground/clipboard/browser copy, prove global erasure or a24h SLA. No new human key/contact/consent/install is requested. Keep Draft/Open; no merge, Issue/Project/runtime change or Event/Sprint/UAT/Release/Done claim.17:30SGT was the SHI source delivery forecast;21:00/23:59 team targets are not accepted completion inferred from this page change.
