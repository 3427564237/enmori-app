# Event, private recommendation profile and discovery: v42 verification

Date: 28 October 2026, Asia/Singapore. Author validation by LI's implementation session; not independent review, full UAT, Release or Done.

Authority: [approved decision](../../decisions/2026-10-28-li-event-profile-discovery.md). Contract: [v3 API and compatibility](../../../api/event-profile-discovery-v3.md). Machine-readable artifact/log bindings: [verification.json](verification.json).

## Delivered implementation

- Combined bounded onePA/Ticketmaster sources, stable source identities, independent provider failures, richer Home/list cards, full detail sections, important source conditions, map/calendar actions and verified official links. No automatic registration claim or participation mutation on external navigation.
- URA MP2025 standard planning areas, optional account-synced home area and private birthday, independent discovery/matching permissions, optional profile guidance, revision checks and unknown-result readback with draft preservation. Device-only foreground location respects consent, timeout, accuracy, boundary and fallback states.
- v3 deterministic Event/Friend scoring and reasons, explicit source age eligibility, private-profile minimal discovery cards, existing relationship exclusions, refreshing affected views and fencing late responses after account/profile changes.
- Installed-client representation negotiation. New clients request v3; old clients retain their supported shape while current authorization and privacy rules still apply.

## Source and executable identity

Base: `d811c233`. Feature: `b0a6f78f`; installed-client compatibility: `447ef003`; phone-discovered deadline/localized-price fix: `301cb9c5`.

The active backend is the isolated `service-447ef003c274` snapshot under the local v42 state directory. The final APK includes `301cb9c5`; that final change is Flutter-only. The existing service credentials, project, host endpoint, port binding and account data were retained. An initial pre-compatibility candidate was rolled back before switching to the compatible snapshot. The service change is a reversible WorkingDirectory override; it is not a cloud deployment.

Final APK: `build/group-delivery-v42/ENMORI-group-v42-release.apk`, 68,113,696 bytes, package `com.enmori.app.group`, versionCode 42, versionName `1.0.0-group20261028`.

SHA-256: `435b9358956f27b06354ad01158548bf253323b7263db0ec740c439a308e1e32`.

Signer SHA-256: `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`, matching the previous group package. Release/nondebuggable, same nine declared permissions, no background-location permission. The installed phone's base.apk hash was read independently and exactly matches the final deliverable. Upgrade preserved login and saved account data.

## Source validation

| Layer | Observed result | Limit |
| --- | --- | --- |
| Backend strict TypeScript and complete tests after compatibility | 1,606 passed, zero failed | Source/test execution, not provider or device acceptance |
| OpenAPI contract checks | Six passed | Included in broader backend validation; not additive |
| Flutter affected compatibility regression | 51 passed | Includes profile, Event browse/projection/recommendations and discovery/map consistency |
| Final phone-fix regression | 13 passed | Includes six profile/region/contract/time tests and card/participation widgets; overlaps earlier selections |
| Final Flutter analysis | No issues | Flutter 3.47.2, fatal infos |
| Signed release build | Passed | Normal pub regeneration was required after tests; the earlier no-pub generated integration-test registrant failure is not hidden |
| Full Flutter comparison | Baseline 1,502 pass / 69 fail; candidate 1,506 pass / 69 fail | 68 failures shared. One candidate-only stale browse-disclosure assertion was then fixed and passed in the 51-test selection; one baseline projection failure was fixed. No final full rerun or all-green claim |

Full-suite baseline was an untouched archive of the same starting revision. Existing AI/persona/router and related failures remain outside this feature acceptance; they are not relabelled as passes. Flutter analyze/tests/builds used the shared validation lock serially. Test counts from overlapping runs must not be added together.

## Real service and source observations

- Running service reports owned runner, identity gate, readiness, auth-admin read and Firestore read healthy; Event source enabled. No pending or unknown AI operation was replayed. Anonymous reads of the new owner profile, discovery card and Event browse remained 401 with no-store at local and public boundaries.
- A combined live source probe returned 37 records in 10.466 seconds with both providers available. The Ticketmaster sample was Benson Boone at The Star Theatre, with an actual provider cover and no API summary.
- Normal Chromium access to Ticketmaster supplementary pages returned HTTP 403. The enrichment path is implemented/tested, but live full Ticketmaster description and sections remain unavailable. The API and original official occurrence URL remain usable. No access challenge was bypassed and no missing description was invented.
- onePA supplied full description, organizer, venue, dates and deadline for the observed public sample. Its page requires login for vacancies/pricing and has no supplied cover; the app shows these limitations rather than free/available assertions.
- During phone search, a later onePA source request failed while Ticketmaster stayed usable. The UI explicitly reported that provider failure. A healthy first batch does not prove all subsequent public-source reads reliable or a complete Singapore catalogue.

## Physical phone observations

Device: vivo X200 Pro. Existing group account, upgraded from v40 to final v42 without sign-out or reset. Device identifiers and account personal data are excluded from this repository record.

1. Home and Events showed the saved standard area after final APK replacement. The user-selected private profile was saved through the actual phone UI once; independent owner-only Firestore readback confirmed the requested birthday matches, home area DT, revision 1, discovery enabled, region/age match grants enabled, and interests/affiliation/automatic-activity-location grants unchanged/off. The actual birthday is deliberately absent from this record.
2. Both provider statuses, the onePA card introduction, date/time, venue, login-required pricing and local deadline appeared. The app detail displayed the full paragraph and organizer/conditions section. The deadline was verified in SGT after the final UI correction.
3. The onePA official action opened Chrome on exactly the same event and date, showing its login-only pricing/vacancy message. No provider login, reservation or payment was performed.
4. Returning showed the existing explicit participation question. Selecting No preserved all visible detail text, node bounds/scroll position and unselected participation state exactly against the pre-navigation UI snapshot. Opening the site did not mark Going.
5. Searching Benson displayed Ticketmaster's real cover, title, date, venue and honest missing-summary message while onePA failure remained explicit. Its detail displayed the cover, SGT start, API on-sale status, unavailable price/end-time/address and the explicit failed-supplementary-detail message. The official action opened the API's exact occurrence URL, `/ticket/area/26sg_bensonboone/3587`. Phone Chrome successfully rendered the seat-selection page with the same title, 2 November 20:00 and The Star Theatre. Its prices/booking-fee note remain unavailable to the server-side supplementary reader; phone browser success is not server acquisition success. No section, seat, login or payment was selected.

Local screenshots stay in the ignored APK delivery directory. Temporary UI XML containing owner fields is removed after validation; no token, birthday, raw coordinates, account UID, username or device serial is committed here.

## Requested teammate audit

Only the two usernames provided by the human and their direct relationship/ignore records were read. Private receipts are mode 0600 in the local v42 state directory; no account preferences were changed.

- Both accounts exist in the controlled project, completed onboarding, and have initialized/eligible social records. Missing social initialization is therefore not the observed cause.
- Neither had the new recommendation profile or independent discovery opt-in. Both retained private legacy profiles. One had four interests and processing consent; the other had no interests and processing consent declined. Neither had a standard area/birthday projection.
- The audited pair had no friendship, block, active pending request, ignore or shared interests. Their real-account discovery appearance was not manufactured by switching consent on for them.

## Remaining acceptance boundaries

Live Ticketmaster full details are blocked by the observed source response, and onePA request reliability remains variable. Full Flutter is not green. Two ordinary new accounts mutually opting in, actual new-registration interruption/retry, real multi-device conflict/save, successful OS geolocation, and the entire real catalogue's multi-session/sold-out/cancelled/age edge-case matrix were not all executed on physical devices. Source fixtures cover these relevant rules but do not replace those journeys. No full-plan completion, independent approval, main merge or public release is claimed.
