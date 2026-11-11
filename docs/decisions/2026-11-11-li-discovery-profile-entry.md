# LI — complete discovery-to-profile navigation

Date: 11 November 2026 (Asia/Singapore). Authority: LI / PM, current immediate-demo task.

LI reported “为什么people you may know 界面看不了个人的主页” while requesting a working demo. Source inspection confirmed that the recommendation panel receives the existing profile-navigation callback but opens only a minimal Discovery Card, with no action connecting that card to the existing profile route.

Complete that existing navigation: add an explicit **View profile / 查看主页** action to an eligible Discovery Card. Return to the owning route before invoking its current-session guarded profile callback. Replaced identities, a disposed view, or an unavailable minimal card must not reuse the old navigation action. Continue fresh Backend authorization on the existing profile route; do not read full-profile fields into the discovery-card response.

The [28 October discovery contract](2026-10-28-li-event-profile-discovery.md) remains unchanged: discovery opt-in grants only a minimal card, not full-profile access. The new action is navigation intent, not an expanded visibility grant, and does not require a new API, DTO, storage field or dependency. Existing friendship actions and private/friends-only/public visibility rules remain authoritative.

This is a bounded UI integration repair within LI's current demo instruction. Source tests, APK installation, connected service and physical interaction remain separate evidence layers.
