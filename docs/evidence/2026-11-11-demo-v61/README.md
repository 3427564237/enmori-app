# Immediate demo v61 — 11 November 2026

Authority: [immediate demo](../../decisions/2026-11-11-li-immediate-demo.md), [minimal OpenAI draft preview](../../decisions/2026-11-11-li-openai-persona-preview.md), and [one synthetic live check](../../decisions/2026-11-11-li-synthetic-persona-live-check.md).

Implementation source: `a04251b0775e512bafdcafb75d026edc2caf499b`. This combines verified-account cloud admission, explicit OpenAI draft-preview markers and current consent gates, source-aware cover states, 90-second Event source / 110-second combined recommendation snapshot / 120-second Event and friend read budgets. No automatic retry, ranking, privacy, monetary-cap, or source-failure fallback change.

Final source verification: TypeScript build and all 1,839 Backend tests passed; 36 directed Flutter tests passed; complete Flutter analysis reported no issues. A sequential signed Android release build succeeded. No new dependencies were introduced.

APK: `build/demo-v61/ENMORI-demo-v61-release.apk`, SHA-256 `9482ff40bedeb6e044be9c57694e4ee6b91ca382ceb759ecc1db04557dec80a7`. Package `com.enmori.app.group`, versionCode 61, versionName `1.0.0-demo20261111`; original group certificate SHA-256 `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`. Build uses the existing approved explicit OpenAI/Sol client configuration. `adb install -r` succeeded; phone package readback confirmed v61 and 11 November 14:59:04 update time. No uninstall or data clear. Visual login retention, full phone journeys, dual-phone flows, iOS and UAT were not reverified.

Existing live ordinary-service evidence: a dedicated retained demo Admin logged in, passed the management capability check, listed tags, and created/renamed/deactivated/reactivated a new labelled demo tag (left inactive). Existing catalogue entries were not edited. Persona list/create/edit/activate/readback passed using this demo Admin. Credentials and sessions remain outside Git.

The new public ordinary friend account is `demo_friend_c780e580`, display name `Alex - Demo Friend`; common interests and affiliation were matched to user `3427564237` without changing the latter's profile. Its initial recommendation request failed on the older 45-second snapshot deadline. Deployment and subsequent recommendation evidence must be distinguished from these source checks. No friend request was sent automatically.

The source provided 6 real usable cover URLs out of 19 Event records; remaining Ticketmaster results used a source classification fallback, which is not presented as a real Event cover. Six real URLs returned images and decoded successfully. The client distinguishes missing source cover from actual image-load failure. See [cover evidence](../2026-11-11-event-cover-state.md).

onePA still failed in the earlier 90-second Azure diagnostic (91.733 seconds). Longer deadlines and successful Ticketmaster data do not establish onePA availability. Native proactive OpenAI consumers remain outside the approved cloud Conversation/Persona-preview composition.

## Final deployed service

The final package SHA-256 is `1a892ed75a27d71a5e51711e1a5fb858e027faa528c5bbfc7d9e79ba2a70fb41`; the exact entry set and every changed/unchanged entry were checked. The existing run-from-package selector was switched while the app and prior cloud/local writers were stopped. Platform logs accounted for all four observed app containers. No old package was deleted.

The cold startup probe took 315.172 seconds within the existing 600-second limit. Startup logs explicitly report Node 24.19.0, cloud configuration armed, Firebase reads successful, listening, and `aiAvailable:true`. Runtime fence moved once from 79 to 80. No repeat arm or restart occurred after successful claim. An unauthenticated live Profile request returned the expected 401 `AUTH_REQUIRED`.

Freshness was refreshed from LI's current balance report and the current official OpenAI pricing within the original US$3.40 cap/cycle. At refresh, spent US$0.1001847, reserved US$0.004096, 104 attempts and 102 reconciliations were unchanged. The old earlier credit expiry was retained; the current balance/price freshness window ends at 12 November 00:00 Singapore time. Grant freshness does not imply a billing page was independently observed.

## Final connected-service checks

The authorized single synthetic Persona preview returned HTTP 200 in 12.760 seconds and cost US$0.001042. The reply was coherent; business records remained unchanged. The temporary identity's consent was withdrawn and its precise synthetic records/Auth were removed, leaving monetary history intact. Earlier attempts, the US$3.40 cap and US$0.004096 unknown hold remained unchanged. See [complete live evidence](../2026-11-11-persona-live-check/README.md). This is one real preview sample, not phone UI, ordinary Conversation or proactive acceptance.

The retained demo friend's final-instance Profile and Discovery reads returned 200. Friends All returned 200/ready in 10.95 seconds and Home returned 200/ready in 11.47 seconds. Both contained one candidate: the main user, at index zero. This proves the real recommendation chain using the friend's token; it does not prove the reverse direction or the main user's physical Home top two. No automatic friend request or main-user profile change occurred.

The distributable APK is also copied to `/home/miku/Downloads/ENMORI-demo-v61-release.apk` with the same verified hash. Login files remain private, outside Git.

A final single live Event page-zero read on the deployed v61 service returned HTTP 200 in 91.937 seconds: Ticketmaster available (19 records, 6 provided covers), onePA unavailable (0 records). The source status was explicit; the response was not treated as proof of full source availability. See [final-event-list.json](final-event-list.json).
