# Human LI product choices — real AI persistence boundary

Status: decision brief only; no new human selection or implementation release.
Prepared13 October2026 SGT in response to “有什么我能做的工作了吗”.

This condenses the already reviewed
[#90 proposal at99583d6](https://github.com/3427564237/enmori-app/blob/99583d6bd601ba51c577d46901b3e07e389e6fd8/docs/planning/2026-10-12-zhou-real-ai-slice-closure-proposal.md).
Its exact old/new clauses remain the source; this summary grants no authority.
[#92 capability acceptance](../decisions/2026-10-12-li-ai-capability-slice-acceptance.md)
establishes observed SDK behavior, not these proposed rule amendments.

## What human LI can decide now

The immediate product decision concerns the first isolated synthetic-account/
Firestore/fake-Qwen adapter slice, not ordinary users or live-model enablement.
For each row, human LI may mark **accept / reject / discuss**. Leaving a row
unselected retains its stricter existing rule. These are four different effects;
accepting one never silently selects another.

| Item / exact proposal | Existing rule | Proposed change and user-visible consequence |
| --- | --- | --- |
| 1 — F01-B terminal ordering | Once local Cancel/disconnect/60-second terminal occurs first, no later remote assistant persistence. | Stop new work and original response immediately, but an already submitted database transaction can still save if it commits before the durable close barrier. That saved result may be discovered on a later authorized read. This changes the promise made by Cancel; it is not proof of zero late writes. |
| 2 — F01-B necessary SDK bytes | Transient processing content is request-only and released at terminal. | Permit only the already issued database I/O's necessary verified message bytes inside the SDK until that I/O settles, then release. Application cannot reuse/replay/cache/log content. Buffer destruction not observable to the app remains unknown. This is a distinct new processing purpose. |
| 3 — F01-C expiry edge | No physical append after expiry; expiry immediately denies access and cannot revive a conversation. | An already submitted pre-expiry transaction might create a late physical copy. It cannot be displayed, generate more work or extend retention; the entire expired conversation is cleaned within the original expiry+24-hour obligation. This permits a narrow physical-copy outcome while retaining immediate unavailability and no revival. |
| 4 — F01-D external Auth checkpoint | Trusted authority must still be valid exactly at the effect. | Recheck Firebase revoke/disable before each content transaction and reject known loss, while acknowledging an unobserved window between that check and remote commit. Firestore Account/consent/source checks stay transactional. This does not promise external Auth is atomically valid at commit. |

If strict local-terminal/no-late-effect semantics are retained, that dependent
real-write adapter remains held. The observed SDK cannot be made to satisfy it
merely by hiding late results, canceling a Promise or rerunning passing tests.
That hold does not pause approved History integration or accepted synthetic AI.

## What a reply does and does not settle

Before treating an accepted row as reusable authority, record the human's exact
choice and old/new scope under docs/decisions and check any applicable higher-
authority conflict. PM cannot waive law/privacy/platform or a conflicting
Sponsor/Supervisor rule. A row choice is not code acceptance or runtime enablement.

Separate N02 fields/indexes/control retention, F03 producer permission/snapshot/
revocation history, unknown recovery and complete cleanup still need their
applicable decisions/handoffs. No whole-adapter release follows from these four
answers. No fresh approval is needed for unchanged approved client code or
routine History/shared implementation, which remains agent/owner work.

Human reply format may be: `1 accept; 2 discuss; 3 reject; 4 discuss`.
No credentials, phone operations, testing scripts or repeat code approval are
needed to make these product choices.
