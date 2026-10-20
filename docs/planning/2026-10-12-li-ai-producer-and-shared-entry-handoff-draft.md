# LI producer and shared AI entry handoff draft

12 October 2026, Asia/Singapore. Status: source-bound preparation under [conditional human A](../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md); no final producer/schema/UI integration contract or new code release. ZHOU integrates only approved consumers, LI owns Account/shared entry, DU owns Check-in producer; JIN reviews the closure packet, DU reviews later LI shared code.

## Existing authority supplied by LI

Use verified Firebase identity and the existing Backend UID→Account binding, not a body/header owner selector. Approved Account/onboarding supplies completed state. [Existing Profile/Settings approval](../decisions/2026-10-05-li-profile-settings-approval.md) and [contract](2026-10-05-li-profile-settings-contract-preview.md) supply current `optionalProcessingConsent` and `settingsRevision`, independently from Profile/Check-in visibility. None supplies a blanket AI capability, source-deletion lifecycle or trusted new producer version. Do not invent fields or equate fixture Friend eligibility with real AI authority.

The selected first purpose is exactly `checkin_conversation`. Current-input-only fallback, Mood/Activity/Weather, social read and ordinary/real-account enabling are not selected. The candidate's required source-consent relationship remains subject to exact closure; accepted Settings alone cannot prove it.

| Boundary to close | Source and required observable handoff | Explicit unresolved portion |
| --- | --- | --- |
| Start identity/account/purpose | Verified owner binding, current valid completed Account, exact purpose's permit decision, authorized/denied/unavailable separately | Exact eligibility/source authority and shared consistent read/acceptance ordering under F03 |
| Consent and version | Existing current Settings value/revision; rejection is fail-closed for selected purpose, dependency failure is not legitimate rejection/default | How the version joins the coherent start view, current commit/delivery and saved-history revalidation; withdrawal propagation without storing a new field by inference |
| Active Persona | ZHOU accepted owner set; lawful no Active→default; Q19 four-field request-only projection, used-Persona deletion check | Cross-producer coherence; edit/switch preserve original snapshot while used deletion blocks future effects |
| Note-only Check-in | DU confirms `createdAt→occurredAt`, `note→noteText`, canonical timestamps, permitted source identity and lawful empty set | Actual source-specific permission/deletion/version and complete discovery/cleanup handoff; own-history API is not AI authority |
| Selection | Q17 unique asOf; filter current unconsented/deleted/unauthorized/future/out-of-window before newest-five selection, `[asOf−7 days, asOf]`, stable opaque-ID tie | Exact query/index/read bound and version protocol; no copying date/20-row history DTO or storing Note in provenance |
| In-flight and saved output | Current commit/sink authority; whole dependent assistant unavailable when any required source becomes invalid | Physical event/cleanup guarantee, offline discovery and complete residual deletion, not simply a watch callback |

These rows state the existing constraints and information needed from the final contract. They neither fill missing producer authority nor select a new revocation/data model.

## Shared Home/router handoff preparation

Selected M26 uses existing `ai-assistant` / `ai-limited` mapping and NS35–NS37; these are not a new route-count numerator. ZHOU supplies concrete feature builder/session/callback/state requirements from selected N06; LI resolves existing Home entry visibility/limited-state behavior, Back target, Settings destination and route-stack/session disposal against that contract. Route guard never replaces Backend purpose authority.

Before shared implementation, the closure packet must name actual builder paths, initial-state contract, same-UID new-session/late-reply handling, signed-out behavior, existing Home/Settings entry points and applicable Android state/semantics evidence. Do not fabricate a runnable destination or change unrelated Home recommendations. Existing Persona wiring and its accepted gate are reused only where source is unchanged; AI detached completion is not inferred from Persona create behavior.

No shared file changed here. LI's later bounded Home/router implementation remains subject to the concrete released contract and DU independent review. This draft can be refined together with ZHOU/DU's focused closure packet rather than imposing repeated reviews of accepted work.

## DU report receipt and independent Calendar work

[DU's five-mapping report](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6118783136) is received. Existing Note-only create/success are baseline; #64 supplies bounded owner-history API/Repository, not Timeline/Calendar pages or Android acceptance; saved edit remains pending authority. Report receipt does not authorize AI source access or map/location.

DU can supply the already proposed concise selected-date/time-zone/list/loading/empty/error/deletion UI/consumer delta as documentation. LI then makes its own concrete UI/consumer selection before implementation. This preparation is independent of completing live AI/Event or a whole-module gate; do not repeat the five-mapping report or invent an implementation ETA before scope is known. No new Calendar/location/edit behavior is selected by the AI conditional A.
