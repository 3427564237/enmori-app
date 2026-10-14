# LI feedback — AI tab, record presentation and friend entry clarity

- Source ID: S-PM-1014-LI-SOCIAL-FEEDBACK-NAVIGATION.
- Authority: human LI HOURUI / PM, 14 October 2026 SGT.
- Scope: the next isolated offline phone UI increment under #85.
- Prior sources: [social UI release](2026-10-14-li-social-ui-increment-release.md),
  [own Profile/Settings approval](2026-10-05-li-profile-settings-approval.md),
  [Add Friend minimum projection](2026-09-02-add-friend-identity-matching-contract.md).

Human feedback:

> ai 聊天和 checkin界面有些简陋
> 而且ai聊天界面是进入了一个新界面而不是底栏切换到ai聊天界面
> 主页和朋友界面的具体好友无法点击进入他人主页
> Me里面的my friend 界面意义不明

The explicit navigation correction makes AI a bottom-navigation destination in
the isolated social entry. This supersedes only AI's leaf-only/push presentation
in #98/#100; it does not supersede pending-operation confirmation, cancellation,
session ownership, recovery, expiry/deletion or no-background-resume rules.
Switching away from AI passes through its existing guarded leave operation;
selecting its already-current tab performs no leave or request. Back returns
Home through the same guard. Real client/Backend contracts remain unchanged.

Human requests clearer AI/Check-in presentation. Bounded implementation choices
retain the existing warm-white/indigo direction: distinct user/assistant bubbles,
an empty state and keyboard-safe pinned input; a more spacious Note editor with
current visibility context and clearly separate save/read-confirmation states.
No Mood/photo/location fields, message purposes or retention are added.

To resolve the reported duplicate entry, remove the Me → My Friends shortcut;
Friends remains the primary friend destination and retains existing search and
request operations. This is a UI implementation choice within the existing
scope, not a fabricated explicit user selection of a new Friend contract.

Home/Friends cards may open an explicitly synthetic identity-profile destination
using only the already available Username/DisplayName and their derived initial
avatar. A missing/currently unavailable friend fails closed. No Interests,
Notes/Events, contact data, Activity, friend graph or extra Profile fields are
inferred. The user asks for navigation; this does not resolve the existing
real other-user eligibility/block/visibility/full-projection contracts. Those
affected real-data behaviours remain Pending, localized to that projection.

All new runtime effects stay in the explicit offline composition. LI owns this
shared UI contribution. Minimal opt-in presentation hooks to existing AI/Note
pages plus the existing friend-search view support that composition; controller, reader, real asynchronous
Application and Backend ownership remain with their assigned owners. This is
not a competing rewrite of ZHOU's AI or DU's History/Calendar work.

The new source-bound Account-entry → scripted AI probe exposes a #100 wiring
defect: its sample Auth rejects every token read, so the unchanged wire client
cannot reach the existing synthetic transport. Fix the authorized offline
interaction with an observed-session-scoped, non-JWT `synthetic-ai-token-`
stub accepted only by that existing in-memory fixture. Before observation or
after logout/disposal, token reads remain denied; a fresh same-UID observation
replaces the stub. Invented form inputs remain discarded and remote Backend
composition remains explicitly null. This adds no real Auth identity/token,
SDK/provider access, credential acquisition or production authorization.

Preserve #98/#100 exact sources and pending DU reviews; use a separate review
delta for this change. DU reviews new LI code, and new owner tests/APK are not
self-acceptance or real-service/device proof. Keep Draft/Open and main/task/
Project/runtime states; no merge or Sprint/UAT/Release completion follows.
