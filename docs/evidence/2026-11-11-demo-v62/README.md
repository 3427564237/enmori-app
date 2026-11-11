# Demo v62 — discovery profile and Friend Activity follow-up

Implementation source: `ff119fa6cbc103c025385b4f68b00f50e910c25d`.

LI reported that People You May Know did not open personal profiles and asked whether Check-in updates and Interested selections are visible to friends. Authority is recorded in the [profile-entry decision](../../decisions/2026-11-11-li-discovery-profile-entry.md) and [existing-source preparation decision](../../decisions/2026-11-11-li-friend-activity-source-preparation.md).

## Resulting behavior

An eligible Discovery Card now offers **View profile / 查看主页**. It returns to the owning route before invoking the existing guarded profile callback. The minimal-card response remains minimal; full-profile reads still receive their own current Backend authorization. Unavailable cards and stale actions from replaced sessions cannot open an old identity's profile.

Friend Activity All/Event reads prepare the existing shared public Event snapshot outside personal-data transactions, after viewer/consent preflight. They then reread identity, consent, friendships, visibility, records and current source generation. Home recommendations and Activity share one source flight. Check-in-only reads remain independent of Event availability. All/Event client waits are bounded at 120 seconds; genuine source failure and unavailable current titles still fail closed.

Existing activity semantics are unchanged: accepted friendships, both accounts' relevant optional-processing consent, visible publisher profile and visible item/participation fields are required. New Check-ins appear; editing updates the existing item without changing its creation time or creating an edit event. Interested/Going reflects the current selection; cancellation removes it. The window is seven days, Home shows at most two items, and another device must refresh/reenter/resume. There is no cross-device realtime push.

## Verification

- TypeScript compilation and all 1,852 Backend tests passed.
- 39 directed Flutter tests and complete Flutter analysis passed, including Home/All discovery navigation, parent-route availability after closing the card, replacement-session rejection, unavailable-card behavior, friend read budgets and existing Persona preview behavior.
- Backend regression coverage includes cold source preparation outside transactions, concurrent recommendations/Activity using exactly one source batch, consent/privacy/friendship/block changes during preparation, generation invalidation and Check-in-only independence.
- Signed Android release build succeeded. APK SHA-256: `39d524879d694686a008918557eaa831052f5d498c8b0e1d07f40f2c6801938b`. Original package `com.enmori.app.group`, versionCode 62, versionName `1.0.0-demo20261111`, original group certificate.
- `adb install -r` succeeded on the connected phone; package readback confirmed v62 and 11 November 15:42:34 update time. No uninstall/data clear. Phone UI gestures and dual-device action visibility were not physically reverified.
- Shareable APK: `/home/miku/Downloads/ENMORI-demo-v62-release.apk`.

The earlier [one real Persona preview](../2026-11-11-persona-live-check/README.md), [administrator/cover evidence](../2026-11-11-demo-v61/README.md), and [friend account recommendation evidence](../2026-11-11-friend-demo/verification.md) remain applicable within their stated scopes. No additional paid test was authorized or run for v62. onePA remained unavailable in the last real source read; proactive OpenAI is outside this composition. This is not full UAT or Release acceptance.

## Final connected-service result

The final package SHA-256 is `82b37db208110403eb7efe53e989fea6415224ded6caee2b818d999b38b817dc`; all 8,519 archive entries were verified before activation. The previous instance was stopped and platform termination accounted for all five observed app containers. A new claim was captured from the live ledger while stopped, preserving the original grant, all 105 attempts, 103 reconciliations, US$0.1012267 spent and US$0.004096 unknown hold. Only the existing CONFIG claim changed; the key and other settings were retained.

Startup completed in 258.115 seconds. The final process explicitly logged armed configuration, successful Firebase reads, listening and `aiAvailable:true`. The unauthenticated Profile request returned the expected 401.

Using the retained demo friend's own token, three simultaneous cold reads all returned HTTP 200: Friends Home 104.620 seconds (one recommendation), Activity Home All 99.096 seconds (empty), and Activity All All 99.108 seconds (empty). They did not cancel one another and stayed within 120 seconds. The subsequent Check-in-only read returned 200 in 1.323 seconds (empty). No extra Event page-zero refresh or product-data mutation was performed during this check. See [sanitized results](concurrent-live-reads.json).

The demo friend still has no accepted friendship. These empty Activity results establish live routing and concurrent cold-source recovery, not a positive physical two-account Check-in/participation visibility result. The visibility and update semantics above are backed by contract and the passing source tests.
