# Event Details correction, v43

28 October 2026. Implementation verification by LI's session. This receipt supersedes only the missing Ticketmaster supplementary content and missing independent information action recorded in [v42](../2026-10-28-event-profile-discovery/verification.md). It does not erase that earlier failure or establish full project UAT/Release/Done.

## Corrected behavior and causes

Implementation commits: `8cadc30` and `04f65cd`.

- Ordinary full Chromium public navigation renders the provider page after bootstrap. The earlier headless-shell reader rejected the initial HTTP response before real content existed and blocked a required embedded document as though it were top-level navigation. Top-level navigation remains restricted to allowed public event pages. No saved browser profile, credentials, CAPTCHA solving or fingerprint overrides are used.
- DOM text containing literal arrows/comparisons is preserved as readable text; the former sanitizer rejected the whole yung kai description because it contained `>>`.
- The independent official information action is before the full content and is available even if only one valid official URL exists. Distinct occurrence booking URLs retain a separate booking action. Information navigation neither writes participation nor asks whether registration succeeded.
- The browser discovers the matching information link and binds the source group plus exact occurrence backlink or date/time/venue. Unrelated promotional information links cannot start a second acquisition or replace the selected event.
- Browser rendering is bounded to twenty seconds after context setup. Only Event detail GET requests receive thirty seconds; ordinary reads and writes retain their original budgets. Cache and concurrent-request coalescing remain short-lived and in memory.

## Source checks

- Strict TypeScript compile passed; complete backend suite: **1,611 passed, zero failed** on the final implementation.
- Final focused Flutter suite: **54 passed** (detail request budget, information actions, backend repositories, browse and information UI). Earlier detail/participation selection: 29 passed; these overlap and are not additive.
- Final `flutter analyze --fatal-infos`: no issues.
- Expanded transport selection exposed the existing `stalled AI execution leaves waiting at its existing deadline` failure (expected timedOut, actual unavailable). Repeating it after restoring all three changed Dart files to the prior commit reproduced the same failure. It is not hidden as a passing full Flutter run; no unrelated AI behavior was changed.

## Real public-source observations

Actual provider acquisition, without fixtures, returned:

| Event | Description | Important sections | Official information and occurrence |
| --- | --- | --- | --- |
| Benson Boone | 1,365 characters, paragraphs preserved | Pricing, FAQ, admission, other information | `https://ticketmaster.sg/activity/detail/26sg_bensonboone`; exact booking occurrence `/ticket/area/26sg_bensonboone/3587` |
| yung kai | 655 normalized characters, formerly dropped completely | FAQ, exchange/refund, admission, ticket purchase instructions | `https://ticketmaster.sg/activity/detail/26sg_yungkai`; exact booking occurrence `/ticket/area/26sg_yungkai/3759` |

The cold acquisitions measured 10.566 and 11.134 seconds, supporting the timeout correction. The API occurrence start, source admission minimum and fee wording were retained; Benson starts at $128 and yung kai at $98, with the provider's additional booking fee statement.

A separate actual public reader probe of BTS returned 1,078 description characters, pricing/admission/FAQ/other sections and four dated sold-out occurrences. BTS was not found in the bounded API catalogue probe, so this is **not** evidence of BTS appearing in the app. Synthetic regression checks separately exercise exact multi-session binding.

## Runtime and device acceptance

The existing controlled desktop service uses the isolated `service-04f65cd` snapshot. Existing credentials, project, host endpoint, ports and account data are preserved. It needs the desktop display available for ordinary Chromium; service readiness alone does not prove provider content acquisition.

Final APK identity, service readiness receipt and physical-device observations are recorded below when verified. At receipt creation the phone was absent from both USB and ADB, and v43 physical acceptance remained pending. This is not a completed-device claim.

Final signed APK: `build/group-delivery-v43/ENMORI-group-v43-release.apk`, package `com.enmori.app.group`, versionCode 43. SHA-256: `5b39313f18dcc2e062de98d80fbc026b248959845caa889af514553acb9f5e3f`. Signer matches v42. Final build passed in 69.7 seconds. See [machine-readable receipt](verification.json) for exact source, artifact, log hashes and service state.

After switching to the final snapshot, the service reported owned runner, HTTPS identity gate and readiness true, with authentication and Firestore reads available, no pending/unknown AI operation and zero pending Event operations. This health receipt does not substitute for an authenticated Event detail journey on the phone.

## Actual public DTO replay through Flutter

An additional local offline replay captured the current public-source DTOs through `EventBrowse`, then ran them through the unchanged production `BackendActivityRepository`, `EventInformation` and `ParticipationEventPage`. Benson, yung kai and onePA's Teck Ghee Halloween event all passed at 320 logical pixels: complete source description was parsed and rendered, all named sections existed, the official information button was initially hit-testable and opened the exact information URL, and participation writes/registration confirmation remained absent. Three replay tests passed. Source capture used a synthetic account gate and the UI used mock HTTP/opener; this validates the actual public payload and UI boundaries, not real account authentication, OS handoff or physical-device acceptance. The replay stays local and does not commit copied provider content.

## Completed physical verification and onePA correction

The phone was reconnected and upgraded with `adb install -r`. Its installed versionCode is 43 and its independently read installed APK SHA-256 exactly matches the delivery artifact. Login and existing profile settings remained intact. An initial startup showed a temporary-service message; one explicit retry opened Home. Device DNS/network and anonymous backend reachability were checked; no cold-start reliability claim is made from this recovery.

Physical observations on the actual account and service:

1. Benson's in-app page displayed its full 1,365-character source description, cover, local time and venue, pricing/fee FAQ, admission restrictions and purchase information. The independent information button appeared at the top. Chrome opened the exact `/activity/detail/26sg_bensonboone` page, rather than the occurrence's seat-selection page. Back returned to identical visible text and bounds with no registration confirmation.
2. yung kai displayed all 655 normalized description characters, including the previously rejected arrows, and source pricing/conditions. Chrome opened `/activity/detail/26sg_yungkai`. Returning preserved the visible text and bounds exactly.
3. onePA's `Karaoke Club @ Punggol 21 CC (December 2026)` displayed its 1,685-character description, schedule, rules, address/organizer and source conditions. The single official information action opened the exact provider event URL; the website showed its login-required pricing/vacancy message. Returning preserved text/bounds exactly. Interested and Going remained unselected before and after; no duplicate booking button or registration-success question appeared. No booking, provider login, payment or participation write was made.

The onePA check exposed an additional live acquisition problem. Plain requests intermittently returned browser-verification documents. Three attempted adjustments to the original per-detail batch were unsuccessful and were never deployed. Inspection then confirmed the public search listing already supplied source IDs, dates, venues and summaries. Commit `c21fddd` uses that normal rendered listing, bounded to fifty records/five pages, retaining exact observed DOM links and the existing publication/privacy filters. Full content is fetched only when opening a detail; ordinary complete public responses remain the fast path, with bounded browser rendering when needed. This supersedes the old first-100-sitemap list acquisition; the bounded sitemap resolver remains for saved identities. A hundred-record list probe took 18.753 seconds; the fifty-record combined first batch took 10.676 seconds, with both providers available. The live detail probe returned the full onePA paragraph and three information sections.

After strict compilation and **1,620 passing tests** (1,619 backend plus the controlled source-configuration test), the existing service switched to `service-c21fddd`; readiness, identity and Firestore gates passed again and anonymous owner-profile access remained 401. The same v43 APK was retained because this correction changes Backend/source composition only. The onePA physical journey above ran against this final service.

Screenshots and hashes are referenced in the JSON receipt; screenshots remain in the ignored delivery folder. A native test back navigation briefly left the app for the phone's clock, and a subsequent click may have touched an alarm toggle. This was disclosed immediately; the human said to leave it off, and no further alarm changes were made. No unrelated notifications, account fields, device identifier, raw birthday or UI XML is committed.

Remaining boundaries: this is scoped Event Details/information-navigation acceptance, not full-plan UAT, independent review or Release. Provider availability can still fail honestly. Ticketmaster cold list cards may still lack an API introduction until detail content has been acquired; no claim that every catalogue card now always has a summary is made. The startup retry and pre-existing full Flutter failures remain recorded.

### Acceptance reopened after cold recheck

A subsequent fresh Benson detail on `service-c21fddd` showed the explicit supplementary-read failure, despite the earlier successful device journeys. Those successes are retained as observations, not accepted as sufficient reliability evidence. A temporary `service-c21fddd-diagnostics` snapshot adds only allowlisted dependency/error-category diagnostics to locate the failing browser stage. The issue remains under investigation until a verified correction and renewed device checks supersede this entry.

### Cold identity fallback correction

Commit `229d333` fixes a deterministic composition defect: when the short-lived stable-ID lookup was absent after restart/expiry, the fallback returned a matching list summary directly as Event detail, bypassing full source acquisition. The fallback now resolves only the exact identity from the list and then calls the guarded detail path. Removed events and failed reads do not become summary-only success. A new regression failed before the change (missing full description), then passed together with the generation/invalidation checks. Strict compilation and the full backend/configuration suite passed: **1,621 tests, zero failures**.

Three independent fresh browser probes returned Benson content in 9.306, 9.833 and 8.849 seconds; these did not establish the cause of the original phone failure. The composition regression proves the fallback defect, while the exact original failure had no retained stage diagnostic and cannot be retrospectively attributed with certainty. A live-provider probe through the full controlled composition with a synthetic owner and a fresh source instance returned 1,365 description characters and the correct information URL in 20.598 seconds. It is provider/composition evidence, not authenticated device evidence. The service now uses `service-229d333`, retaining safe allowlisted dependency/error-stage diagnostics without raw vendor messages or account content.

Renewed authenticated phone checks on `service-229d333` passed using the unchanged installed v43 APK. From the previously failing Benson screen, a refresh against the freshly restarted service displayed all 1,365 description characters, prices/fees and source age conditions. The top action opened the exact `/activity/detail/26sg_bensonboone` URL; returning preserved all visible text and bounds. The onePA sample was then opened on the same final service: all 1,685 description characters including schedule and rules were present, the official action opened its exact event page, and returning preserved text and bounds. This closes the scoped Event Details/navigation recheck; it does not claim an exhaustive provider catalogue or eliminate arbitrary upstream outages.

Final onePA participation controls remained unselected. Temporary USB stay-awake was restored to the original value after verification; the phone was left on the onePA detail page. Final service health/identity gates passed with no pending Event operations.
