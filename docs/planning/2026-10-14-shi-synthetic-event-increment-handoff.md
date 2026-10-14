# SHI synthetic Event UI — first source and concentrated contract delta

Date: 14 October 2026, Asia/Singapore. Owner SHI; independent reviewer ZHOU. This is module-owned UI delivery and a proposal for only the unresolved behavior below, not PM acceptance or permission to implement participation.

## Already released and implemented

Sources: S-PM-1014-LI-QWEN-EVENT-SELECTION and S-PM-1014-LI-AI-ACCELERATION at `948579ec82b2c5363ab2b3b2ea353ca652020f07`, and S-PM-1014-LI-SOCIAL-UI-INCREMENT-RELEASE in #98. Human LI selected labelled synthetic Event interaction because no provider rights/access basis is available. That gate holds actual provider acquisition, not this UI work.

Input: #98 `1cc52800e7d51320d6b97c76b5b6e2ee3f9dcba0`. This focused branch does not approve #98 or transfer its tests to the new source. Shared Home/router/offline shell remain single-writer LI; Backend gateway/Transport/API/Bootstrap remain single-writer JIN.

Module changes:

- `EventRecommendationsSection` and `EventRecommendationsPage`: card icon, explicit detail affordance only when the existing callback exists, unchanged Backend ordering/Home Top2/See All request/empty copy and error mapping.
- `EventDetailPage`: time information card, existing detail/retry/copy-link behavior retained.
- All three accept optional `syntheticPreview: true` for explicit isolated composition. The notice remains visible during loading, empty and error states; no real organiser/registration/participation success is claimed. Default false does not falsely relabel ordinary data.
- New focused Widget coverage: explicit labelling, rank/ID callback, Top2/See All, empty, safe error/retry, detail pending/success/unavailable, default behavior and 320x640/1.5-text scrollability. No new package, API, schema or data source.

LI handoff: when composing the existing synthetic source, pass `syntheticPreview: true` to the Home section, See All page and detail page. SHI intentionally did not edit shared callers. This constructor handoff needs no new business decision; LI can consume the module source through the assigned review/integration path. Feature flags alone do not supply a synthetic Repository or authorize ordinary runtime.

## One proposed unresolved behavior package — not implemented

The new assignment explicitly requires an exact delta before own participation, participant projection or external-return behavior is invented. Submit the following single minimal candidate for LI disposition:

| Existing constraint | Proposed bounded synthetic increment | Explicit exclusions |
| --- | --- | --- |
| No approved participation write/read contract; synthetic delivery selected | Permit only a process-local **own Interested / remove Interested** marker for a fixed synthetic Event and current synthetic session. Display it explicitly as a preview marker, not registration. Scope the state to that fixture/session; clear it at session replacement/logout/process restart. Repeat setting the same value is a no-op. | No Backend endpoint/schema/index, durable store, registration, Going status, real identity, or Friend common-Event producer claim |
| Participant disclosure/permission filtering not established by examples | Keep Interested people and Going people identity projections unavailable; do not fabricate names, counts or social permission success. | No participant DTO, inferred consent/filter policy or real-account exposure |
| Current detail supports copied source text, not a registration/return protocol | Retain copy-link only for clearly labelled synthetic example URLs. On returning to list/detail use existing read/controller/session safeguards; no claimed external completion or registration-status update. | No external launch, provider request, WebView/new dependency, return token, success receipt or pending-registration storage |

Requested decision: approve or amend this one synthetic own-marker/return package. Until then, only that mutation/projection/return extension is blocked; approved read/list/detail/empty/error work continues. This candidate does not select any real API/physical contract. If later real participation is desired, the exact trusted identity, authorized fields/filtering, persistence/write/idempotency and external-registration semantics need their own competent contract.

## Delivery and next action

First local source is available on `codex/shi-synthetic-event-ui-20261014`; source/tests/evidence are a concentrated packet. Public Draft/source delivery target: 14 October17:30 SGT, conditional on action-time publication confirmation; this is an owner estimate, not completed publication. First usable module increment target remains21:00 today; overall requested15 October23:59 is a target, not all42/Sprint/UAT/Release completion. Installed APK/Android execution is Not Run on this increment until actual device work; ZHOU review and LI integration are Pending.

JIN's new immutable AI packets remain SHI's separate independent review duty. Do not repeat completed #99 review; later transport/transactions/cleanup/composition will be reviewed as actual code arrives. Provider permissions are LI/external-authority work if real Event acquisition resumes, not a credential wait for this synthetic increment.
