# LI Event disclosure and removal packet

Prepared 15 October2026 (SGT). **Page-copy proposal and an unexecuted operator exercise.** No product, Backend, configuration or active preview changes; no implemented-notice, provider-permission or removal-SLA claim.

## Controlling sources

Retain [AGENTS/source hierarchy](../../AGENTS.md), [selected EB01–EB06](../decisions/2026-10-15-li-real-event-contract-selection.md), [EB07 external opening](../decisions/2026-10-15-li-event-external-open-selection.md) and [reduced permission process](../decisions/2026-10-15-li-reduced-permission-process-and-followup.md). No new key request, human provider-contact or submission step. Existing [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) and [LI's recorded terms refresh](../evidence/sprint3/2026-10-15-li-baseline-candidate-delivery.md#li-provider-basis-refresh) remain the basis; this packet does not establish SG deep-link permission. LI separately refreshed the official Developer terms, Discovery documentation/FAQ and [SG terms](https://ticketmaster.sg/terms-of-use) on15October2026; the required visitor disclosure/removal terms and the SG deep-link condition remain. The refresh adds no human submission workflow or new activation authority.

Technical reference: [corrected #110 adapter 0b730c52](https://github.com/3427564237/enmori-app/blob/0b730c52fd62ddfc02bdc7166ab1a80374eb2681/backend/src/event-browse/infrastructure/ticketmaster-browse-source.ts), [#113 shared composition](https://github.com/3427564237/enmori-app/blob/e34f4a2bc40ddc9a4805ac90e31e1ab0215b4691/docs/evidence/sprint3/2026-10-15-jin-event-browse-isolated-join.md), [ActivityController](../../lib/features/event_browse/presentation/activity_controller.dart), [ActivityPage](../../lib/features/event_browse/presentation/activity_page.dart) and [native dispatch](../../android/app/src/main/kotlin/com/enmori/app/MainActivity.kt).

## Verified source boundaries

| Path | Supported statement |
| --- | --- |
| Phone → ENMORI | Protected reads send the Firebase token to ENMORI; verified identity and completed onboarding precede provider access. Auth/Account refusal must cause zero provider calls. |
| Backend → list | One HTTPS GET: SG, size20/page0, date ascending, current UTC start, no TBA/TBD/test events, and developer API key in the upstream query. |
| Backend → Detail | One GET of the validated occurrence ID, plus developer API key. Selected activity and timing are therefore observable to the provider. |
| Caller isolation | The adapter sets GET/redirect-error/no-store/signal, with no authored custom headers or body. It does not forward caller Auth, UID, profile, Check-in, Persona or AI content. Runtime/network standard headers and server connection information remain possible; no provider-log/retention guarantee follows. |
| Storage/lifetime | No catalogue/Firestore/cache/import/job/index in this slice; product responses are no-store. Mobile memory clears on whole-session replacement, disposal/background or five minutes from read initiation; return requires explicit Reload. Server disable alone does not immediately clear an already visible foreground view. |
| Browser/copy | Explicit launch passes only the validated source URL; no Auth token or registration callback is added. Browser/destination policies govern their network data, cookies and history. Copy can leave the URL on the OS clipboard; the view timer does not clear it. |

Reuse the [actual strict provider receipt](../evidence/sprint3/2026-10-15-li-activity-provider-source.json): two HTTP200 requests,18 eligible first-batch rows, matching Detail, disabled-source fetch count unchanged, raw content retained false/product writes0. This is adapter evidence, not a shared Auth/Account/provider-to-phone join. The intentionally live [AI/Persona/Settings preview](../evidence/sprint3/2026-10-15-li-controlled-connected-candidate.md) does not supply Event and must remain untouched.

## Page-local copy for SHI

Keep existing attribution, first-batch limitation and missing-field text. Proposed list footer:

> Source: Ticketmaster. Activity requests go through ENMORI's server. We send Ticketmaster our developer API key and the activity request, without forwarding your ENMORI sign-in token, profile, Check-ins, Personas or AI messages. Ticketmaster can receive server connection information; ENMORI cannot guarantee how the provider logs requests.

Proposed Detail explanation before the existing source actions:

> “View on Ticketmaster” opens the source page in your browser. Your browser connects directly to Ticketmaster; its privacy and cookie policies apply. Opening or copying a link does not register you or mark you as Going. A copied link can remain on your device's clipboard.

Optional shared lifetime sentence:

> This activity view stays in ENMORI's memory for at most five minutes and clears when the app goes into the background or you sign out. Reload to request current information.

These are reviewable strings, not already displayed. SHI owns this small page delta, ZHOU reviews it; existing LI/DU shared-composition ownership remains. No new route, checkbox, consent gate, dependency or business rule is proposed.

## LI/JIN disable/removal exercise

**Not Run.** JIN supplies the actual Event process-owned `enabled()` seam; LI operates it. Do not invent an environment-variable name, Admin API, denylist or deletion job.

1. Record exact source/process/gate and start time. Set that source gate false before further provider access. If Event is not yet composed, record absent/disabled rather than claim a removal exercise. Do not stop the unrelated AI preview. Any necessary shared-process stop must follow its existing drain/hold procedure.
2. Verify list and Detail refusal with zero new outbound fetches; also disable before releasing an already-started response and verify no content is returned. Reuse source-identical checks. A composed authorized route should give safe503/no-store; an intentionally unregistered route stays absent. Neither is successful empty data.
3. On each assigned Event client, background/sign out/dispose the surfaces; verify list/Detail clear, retained actions cannot open/copy old content, and explicit Reload remains unavailable. Inventory any operator-owned raw files, screenshots/exports/cache, clipboard and browser copies; remove only identified owned copies. Provider/browser data outside our control is not covered. No source catalogue exists to delete from Firestore.
4. Record gate-disabled/finished times, covered clients/copies and unresolved items. For a real notice, record its receipt and applicable24hour deadline and compare actual elapsed time. A drill is not a continuous SLA or global-erasure proof. Keep reads disabled pending LI's bounded disposition; do not silently re-enable or let a fresh source result override an actual removal request.

Minimum evidence: exact source/review references; actual rendered disclosure; disabled/in-flight fetch counts and safe route result; assigned-client clear/stale-action checks; owned-copy inventory; operator timestamps/result/limits. Keep adapter, synthetic widget, device and runtime results separately attributed. Public records exclude keys, full URLs, occurrence IDs/titles, private notice content and raw errors. No repeat approval of unchanged components is required.
