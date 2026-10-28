# Event, recommendation profile and friend discovery v3

Authority: [LI 28 October decision](../docs/decisions/2026-10-28-li-event-profile-discovery.md). Normative wire shapes are in [OpenAPI](openapi.json). Earlier v1/v2 and presentation contracts remain historical; see the decision for the narrow supersession scope.

## Identity and public content

Ticketmaster stable identifiers remain unchanged. onePA uses `pa_` browse IDs and `pa_event_` stable IDs derived from source identity, never title. Cards carry summary/decision metadata; detail may carry 30,000 characters and up to twelve named sections of 12,000 characters. Optional source fields do not change old required Event fields. Unavailable full-detail acquisition is different from a source supplying no description. Official details and booking links are distinct only when verified against the selected occurrence. Opening either does not mutate participation.

The current classroom acquisition is bounded: onePA follows the publicly linked event sitemap, examines the first 100 links in batches of 20, with four HTTP reads at a time. Ticketmaster keeps its existing API batch limits. Combined batches allow at most 40 rows. Five-minute memory reuse/coalescing and timeouts apply; no copied durable content library. A failed provider produces an explicit source status while the other remains available. This is not a complete Singapore catalogue. Browser failures, access challenges and sign-in-only prices/vacancies are never converted to successful or free/available results.

## Private recommendation profile

`GET/PUT /v1/me/recommendation-profile` authenticates the current owner and returns `Cache-Control: no-store`. PUT replaces all nine preference fields and requires `expectedRevision`; GET returns those fields plus `revision`. A missing stored projection reads as revision zero, all grants off, null birthday/home area. Existing Profile privacy and free-text region remain untouched. The nested account projection is deleted with its account. No birthday, coordinates or raw matching fields are added to discovery cards, AI input or logs.

Dates are strict civil dates. Future birthdays are rejected. Age advances on 1 March for 29 February birthdays in non-leap years. Event eligibility uses the Singapore event date; friendship age uses the current Singapore date. Missing DOB does not assert eligibility. Only explicit source restrictions/target ages are usable; no title/category demographic inference.

Area catalogue: bundled URA MP2025, published 27 February 2026, 55 planning areas. Code lookup and point-in-polygon share that version. Device foreground geolocation requires user opt-in and OS permission, has a 15-second request limit and five-minute reuse. Accuracy above 250 metres or sampled accuracy-circle points crossing an area boundary is considered unresolved. Raw coordinates never cross the Backend API. Activity context precedence is session manual selection, valid device location, synced home area, Singapore-wide. Manual override is cleared only explicitly or on account/session replacement; automatic location does not modify home area.

Unknown save results/conflicts retain the local draft and require owner readback. Reload saved settings or explicitly keep the draft against the reread revision. New accounts get optional guidance after existing onboarding; existing accounts get a completion entry. Skipping does not enable discovery or fill missing values.

## Discovery and ranking

`GET /v1/users/{username}/discovery-card` returns only username/display name when current eligibility, discovery and processing consent permit access. Existing avatar authorization remains separate. It does not permit private full-profile access. Friendship actions use their existing current-state checks. Default discovery is off. Both parties must consent to each optional matching factor; authorizing matching does not publish the underlying field. Existing relationship, blocks, pending requests, ignored accounts and availability exclusions remain.

Event formula `event_recommendation_v3`: interests 4 each; visible friend involvement 2 each, max 10; same area 2, else same broad region 1; explicit target-age match 1. Explicitly age-ineligible and known closed/cancelled/sold-out events do not enter personalized recommendations but can still be browsed. Friend v3: interests 4; common authorized events 2; same area 2 else broad region 1; shared affiliation 1; age within five years 1 only after another qualifying factor. Stable tie order and reasons are retained. No unauthorized/missing factor earns points, and failed reads remain failures.

Friend responses expose only the requesting user's `ownState`: disabled, incomplete, no_matches or ready. Home retains the top-two limit; all candidates remain accessible from Friends. Field/consent changes invalidate the affected client views and stale asynchronous responses. Cross-device changes are reread on entry/refresh; no realtime push system is introduced.

## Verification boundaries

Source tests, provider probes, running Backend, signed APK and physical-device/account UAT are separate. See the dated evidence record; an APK or successful source request alone does not establish the complete registration-to-booking journey.
