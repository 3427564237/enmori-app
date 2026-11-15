# Event regression investigation and return-flow repair

Authority: [LI's restoration scope](../../decisions/2026-11-15-li-event-regression-repair.md). This follows the initial v68 candidate and separately deployed interest-first backend; it does not replace their historical receipts.

## Actual account and entry-point diagnosis

The delegated Sol agent inspected the connected Android phone without changing its interests or participation. It was still running **v67**, not the uninstalled v68 candidate. The selected-interest screen showed Gaming alone. A separate bounded operator read confirmed one active Gaming selection; no account identifier or profile document is included here.

The same phone/account showed four PGL CS 2 Major Singapore 2026 occurrences, 10–13 December, across Home's first group and its remaining recommendation group. Every row displayed `Matches: Gaming`; the recommendation list reached its end. In contrast, the old Events/Browse surface explicitly displayed `Source order` and began with two Music rows. This establishes the actual entry-point distinction. The live account had no unmatched candidates in that result, so it does not establish live mixed-interest ordering; the previously recorded isolated mixed-candidate and deployed-module checks remain that evidence.

The new client initially opens Events → For you. Browse loads when selected and retains its existing source order, search and filters. This corrects the initial v68 Browse-first implementation, which could still be mistaken for personalized ranking.

## Official-site return failure and repair

On v67, the PGL detail's only official action opened its actual occurrence booking URL. Returning from Chrome produced no registration confirmation. The source code placed the return coordinator only on a separate bottom booking action; a sole/shared detail/booking URL instead used the uncoordinated top information action. Five-minute detail expiry also cleared the coordinator's URL.

The visible sole/shared official action now uses the existing return flow. Separate information-only links retain their existing behavior. Expired detail content is hidden and cannot launch a new external page, while an already-opened same-event/same-session flow survives expiry, a refreshed booking URL and movement below long content. Once that flow settles, the next deliberate launch uses the current URL. Event retargeting, account replacement and disposal still retire the old flow.

Isolated widget/domain tests verify explicit Yes saves Going exactly once, No does not write, ordinary opening/resume does not infer registration, and an asynchronous native handoff can finish after source expiry/refresh. Physical acceptance uses No and does not register, purchase or alter the user's real participation.

## Provider content: observed failure, not restored

At diagnosis, the reader and enrichment source were unchanged between the previous deployed backend commit `59464fd26bbff34b139fd338f47c04ae8aaf9fd8` and the interest-first deployment `fac7723338ecd0045c214d068d9f41567cc8aac7`.

Safe deployed-service logs recorded repeated `EVENT_READER_HOME_LINKS_TIMEOUT` and occasional `EVENT_READER_LAUNCH_UNAVAILABLE`. A normal ephemeral Chromium diagnostic in the actual Azure app environment received HTTP **403**, no body text, and no activity links from Ticketmaster's homepage. A further bounded diagnostic received the same **403** and no `#activityContent` from the known public PGL detail URL. Only three font requests per page were blocked by the existing resource policy; no main navigation or script was blocked by that policy. One intervening diagnostic could not launch Chromium within the existing ten-second launch timeout. The last diagnostic allowed twenty seconds for launch solely to collect evidence; no product timeout or deployment setting changed.

Using the same existing resource policy on the desktop, ordinary ephemeral Chromium rendered 240 homepage activity links. The actual compiled `PublicEventBrowser` then resolved the exact PGL booking URL to its linked detail page, read a **590-character** description and four occurrence rows, and verified that the page linked back to that exact booking URL. This separates cloud-source acquisition failure from removing the description renderer. The exact provider reason for the cloud 403 is not established.

That desktop read exposed an additional parser defect: the provider's actual PGL page declared its cover with `meta name="og:image"`, while the reader recognized only `property="og:image"`. The bounded backend repair supports both provider metadata spellings, preserves the existing property variant's precedence, and leaves URL allowlists and occurrence binding unchanged. Its new isolated regression failed before the fix. Repeating the actual compiled reader after the fix returned the same 590-character description, exact booking backlink and four occurrences, plus the official `static.ticketmaster.sg` cover.

The physical PGL card/detail retained its API-supplied cover, but Detail reported that official details could not be read. A Music sample had neither cover nor acquired description. Provider-acquired content is therefore **not restored by the client repair or parser fix alone while Azure receives 403**. No copied catalogue, new proxy/host, stored browser profile, fingerprint override, CAPTCHA handling or fabricated substitute content was introduced. The earlier approved omission of description excerpts on overview cards also remains in effect; full descriptions belong in Detail.

## Verification and delivery

- Twenty focused return-flow, retarget and Events-entry tests passed after reproducing the original failures.
- Static analysis passed with no issues. All **1774 Flutter tests** passed after updating the app-level browse journey to select the explicit Browse tab. Backend compilation and all **1945** tests passed, including the new cover variant regression. The signed-APK result is recorded with the v69 receipt.
- An intermediate full run exposed a test-only scrolling error after retaining an offscreen coordinator: the finder existed before layout. The test now scrolls to a hit-testable action and additionally verifies that the next launch uses the refreshed URL.
- The backend change is limited to official cover metadata parsing. The already deployed interest-first comparator and runtime configuration are retained. A backend delivery receipt distinguishes the local reader proof from cloud availability.
- [Physical screenshots and acceptance](phone-regression-acceptance.md) distinguish the old v67 observations from the installed candidate's outcome. Private account screens and device identifiers are excluded.
