# Friend profile repair

Authority: [16 November LI instruction](../../decisions/2026-11-16-li-friend-profile-repair.md). Base: v73 delivery `dbde9e4a`; branch: `souma/friend-profile-repair-20261116`.

## Behavior and reproduced cause

Friends Activity's nested Check-in detail reused its parent route's Profile callback. Home composition checked that parent route's `isCurrent`; once the detail was open, it was false. The callback returned without navigation and the activity panel reloaded, matching the reported symptom. The initial regression run passed direct Home/All entries and failed both nested entries. The callback now receives the actual originating context, and the panel retains current-route, foreground, epoch and authenticated-session fences.

Six tests exercise the actual `GroupHomeSocial`, `FriendModulePage` and `ConnectedSocialProfile`/`SocialProfilePage` components: Home, See all, Friends → Activity, and the nested Check-in detail from each. View Profile opens the profile and Back returns to the originating activity. Synthetic repositories supply data; this is not phone or network evidence.

The profile uses the existing theme for a larger identity/biography card, authorized affiliation/region, labelled interests and an inline Event section. Event cards show current authorized titles and distinct Interested/Going text and icons, then open the stable Event ID through the existing detail route. The old participation page remains available. Starred friend and confirmed Remove friend retain their existing behavior below the content.

The inline section calls the existing username participation repository, not the seven-day ranked Activity feed. Permission unavailable, an empty final page, a sparse page with continuation, a failed page and source-title unavailability retain distinct behavior. No new fields, API, dependency or backend changes were made.

Profile navigation clears the current projection before leaving and freshly reads after returning within the same observed session, including when a content mutation occurred while away. A targeted regression reproduced a blank return after invalidation before the return guard was corrected. Participation reads and retained callbacks are fenced against content-access changes, backgrounding, replaced sessions, changed pages, refreshed results and disposal.

## Rendered UI

These images render production widgets with synthetic repositories and fixture data. They are not screenshots from a phone or real friend accounts. Roboto, Material Icons, the bundled Playfair Display and a local CJK fallback are loaded for inspection; the CJK fallback is test-only. The preview exercises the same inline and full-participation composition as the app.

| View | English | Chinese |
| --- | --- | --- |
| Profile, 375 × 812 | [Profile](previews/profile-en-phone.png) | [资料](previews/profile-zh-phone.png) |
| Events, 375 × 812 | [Events](previews/events-en-phone.png) | [活动](previews/events-zh-phone.png) |
| Profile, 320 × 640, 2× text | [Narrow](previews/profile-en-narrow-large.png) | [大字](previews/profile-zh-narrow-large.png) |
| Events, 320 × 640, 2× text | [Narrow events](previews/events-en-narrow-large.png) | [大字活动](previews/events-zh-narrow-large.png) |
| Events, 812 × 375, 2× text | [Landscape](previews/events-en-landscape.png) | [横屏](previews/events-zh-landscape.png) |
| Events, 1024 × 768, dark theme | [Dark](previews/events-en-tablet-dark.png) | [深色](previews/events-zh-tablet-dark.png) |

Viewport tests use reduced motion and assert layout exceptions, shared event content, status labels and reachability of the existing relationship action. Dark-theme fixture rendering is not a claim that the app has gained a new theme setting. There is no complete screen-reader or platform accessibility audit.

## Verification and delivery

Final command results, source hashes and preview hashes are recorded in `verification.json`. The initial failing reproduction is retained by log hash and local path. Overlapping test counts are not additive. APK packaging and any phone installation are recorded separately from source verification.

No account settings, privacy, participation, interests or real service data were changed for this work. There was no backend deployment. ADB initially reported no connected device; physical-device, live-account and iOS acceptance remain unverified until separately evidenced.

## Installation-first instruction

During the final full-suite run LI instructed: “不要过测试了，先帮我安装”. Further tests were stopped immediately. The first full-suite process had ended with signal/exit 143 after 1,589 passing tests, and the rerun was explicitly cancelled; neither is reported as a complete passing run. The six real-component navigation tests, thirteen presentation/privacy tests, separate captured-font run and clean static analysis had already passed. The user then connected and authorized the original vivo phone for a retained-data install. APK identity/signature checks are packaging safeguards, not a resumed test suite.
