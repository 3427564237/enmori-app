# LI — Profile density and Home introduction refinement

Date: 17 November 2026 (Asia/Singapore). Authority: LI / PM in the current UI chat.

After the four-item next-step review, LI approved only items 1 and 2: “那就先做第1、2项，改完给我看实际界面效果，并检查有没有新的布局和交互问题。”

## Confirmed scope

1. Compact Profile's existing identity/details card and History/Footprint shortcuts. Present existing profile, discovery, privacy and Persona destinations as readable list rows. Keep the Interest heading and its contextual edit action together; retain all existing content, available destinations, audience explanation, avatar access and guarded return/readback behavior.
2. Reduce Home's title/date and surrounding spacing. Consolidate repetitive empty/error weather status into a concise local status while keeping the optional weather controls, truthful cause, consent, approximate-location disclosure and required attribution/licence/modification notices when weather is displayed. Keep the Check-in action stable through asynchronous profile/weather/day changes.

Produce actual Flutter-rendered interface evidence and relevant layout/interaction regression checks, distinguishing synthetic repository fixtures from physical-device observations. The phone is not connected at the initial check.

## Preserved authority and supersession

- [21 October UI decision](2026-10-21-li-product-ui-redesign-and-defaults.md): deep green/Playfair branding, existing five destinations and separate privacy controls remain. This decision refines only the two approved surfaces' density and action presentation.
- [22 October Home-weather decision](2026-10-22-li-ux-priority.md) and [Q13](2026-09-02-production-weather-contract.md): consent, coordinates, provider access, refresh interval, lifetime and required visible source/licence notices remain unchanged. Compact error copy applies only to Home, not saved Check-ins or their weather feedback.
- [15 November Home layout decision](2026-11-15-li-home-layout-refinement.md): greeting/weather grouping, stable Check-in target, contextual Interest editing, compact day summary and activity-area placement remain. This increment supersedes the large circular Profile action presentation and the introduction's prior size/spacing, not their underlying behavior.

Items 3 (recommendation loading/return diagnosis) and 4 (activity-card density) remain proposals. No new API, caching policy, backend, data field, dependency, infrastructure, deployment or full-UAT claim is authorized by this two-item approval.
