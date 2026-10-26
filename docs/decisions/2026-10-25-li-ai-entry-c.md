# LI — select C for the AI main entry

Date: 25 October 2026, Asia/Singapore.
Source: LI's direct answer in Integration chat
`01a1719f-a6aa-75e0-9ad4-f3724777fa95` to the concrete A/B/C choice after the
phone prototype was provided:

> C：连续主入口＋历史／新话题（推荐）

The question expressly scoped the choice to the entry form, with existing
conversation containers, history, current-conversation search, new topic and
whole-conversation deletion retained. New data purposes, cloud budget and real
notifications were expressly left for their concrete contracts.

## Approved scope

Select C from [the compared options](../design/ai-companion-20261025/product-choices.md):
one continuous daily AI entry, with accessible History, current-conversation
search and an explicit New topic action. Implement this presentation/navigation
increment through the existing approved conversation and authority boundaries.
Reuse existing conversation containers; do not merge, copy, migrate or delete
their stored contents. Preserve existing whole-conversation deletion and
retention semantics. This is continuous access, not permanent memory or an
authorization to include all history in model requests.

Resume only currently authorized conversation state. Account changes,
unavailable/deleted/expired content and unresolved operation outcomes must keep
their existing guards. Reading or navigating does not send a message. Preserve
the current session's single-draft semantics and explicit discard confirmation
for cross-conversation navigation; per-topic/cross-device draft storage is not
newly approved. A new topic follows the existing new-conversation boundary.

The approved design direction is described by the proposal at Product commit
`12ca9b721a7ead633d9adc3804717e1ae2269373`; its synthetic future-function controls
do not become implementation authority merely because they appear in the
prototype. The later screenshot-only `f625e24e1b9c86accf841ead3693eb502e0b185c`
aligns the reference-panel image with that source.

## Supersession and exclusions

This resolves only P1 / A-B-C choice in the
[round authorization](2026-10-25-li-ai-companion-round.md) and product comparison.
Earlier statements that C was unselected remain historical. The source
comparison, prototype and previous decisions are retained.

P2–P7's new source display/navigation projection, extra private-context use,
proactive origin/storage/delivery/unread/retention, cloud provider/budget,
cross-conversation search, stored titles and additional preference persistence
remain pending where they lack an approved contract. No location processing,
long-term inferred profile, FCM registration/send, deployment, cloud charge,
APK installation or real-data write is authorized by this entry-form choice.

Routine local implementation, focused tests and independent review of C within
these existing contracts may proceed without re-asking LI to choose C. Shared
router/theme/storage/composition changes remain Integration-coordinated.
