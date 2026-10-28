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
