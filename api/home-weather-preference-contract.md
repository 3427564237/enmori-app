# Home weather preference — 2026-10-22

Authority: [LI UX priority decision](../docs/decisions/2026-10-22-li-ux-priority.md).

The existing owner-only `GET/PUT /v1/me/settings` adds optional boolean `homeWeatherAuto`. Missing stored/wire values mean false; present non-booleans are rejected. PUT omission preserves the current value for older clients. Explicit false revokes automatic Home lookup. Existing `expectedRevision`, owner checks and uncertain-save/reload behavior apply. This field is independent of `defaultCheckInLocation`, `defaultCheckInWeather`, field visibility and optional AI-processing consent.

Only-this-time does not write settings. Automatically-on-Home persists the preference using a confirmed Settings response before capturing one foreground approximate location; Android permission still applies. No precise point or identity is sent to Open-Meteo. The existing Backend weather route, 0.1-degree grid, settings revision, minimization, provider disclosure and mandatory attribution are unchanged. Check-in records/defaults are untouched.

Within one login session, completed conditions remain in RAM across routes; coordinates do not. Automatic attempts are spaced at least 15 minutes apart, triggered by a Home visit, including failed attempts. Explicit refresh is available. There is no timer/background fetch or shared/disk weather cache. Confirmed local revocation fences pending results and clears the cache; session replacement clears state. App backgrounding fences pending work while retaining completed conditions. Remote settings changes are read on the next Home visit and Backend still checks the supplied revision.

Integrate the Backend and updated APK together: earlier APKs use strict Settings response allowlists and may reject the added response field. Omission-preserving writes protect data; they do not claim old-reader compatibility.
