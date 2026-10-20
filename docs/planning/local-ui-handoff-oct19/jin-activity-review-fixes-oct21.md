# JIN #166 continuation — review corrections and Friend Activity

Continue the existing branch from #166 `0a806883d9b96dcdcb570dde7fe4055f51a8f6b7`;
actual original development base remains `927f77527b32d349aa08020f7de0e88402edb9c7`.
No rebase, reset, duplicate base package, SHI Event copy or LI router edit.
The target remains `souma/li-shi-du-integration-20261020`.

New review delta addresses SHI R1/R2/R3 on that exact previous head:

- Located Save captures the rendered controller epoch; Save/location removal,
  weather removal and location replacement propagate a current-session eligibility
  closure through the Repository to transport before/after token acquisition.
  Old dialogs capture the rendered epoch, not current authority at click time.
- Ignore/manual Restore capture the rendered epoch before any state or Repository
  mutation. Undo keeps its existing session/version protection and the same restore.
- Friends authorization is an injected inner Port; module composition lives under
  Bootstrap. Check-in decode and Weather display use owning public contracts.

New Activity scope is specified in [FA2](../../../api/friend-activity-display-contract.md).
Check-in Note/Mood display is after ranking; no score/AI expansion. Current
relationship/consent/source checks and stable-ID Detail reread are shared by Home
and See all. Interested/Going metadata/title callback fixtures are implemented;
actual EP1 timestamp/producer is explicitly not connected. See FA2's exact local
decision point; #167 source approval is already complete, not a blocker.

## LI's minimal integration patch

1. Update the module import to `backend/src/bootstrap/register-social-module.ts`.
   Retain the same store/clock/identity/cursor/weather instances. No environment,
   credential, deployment, new port or startup action is included.
2. When the producer is available, inject `activityEvents` satisfying both FA2
   operations. Do not use a fake empty adapter or infer participation time from
   EP1 `updatedAt`. Use SHI's same gated source, not a second provider client.
3. Insert `FriendActivityPanel(home:true,onOpenProfile:existingProfileCallback,
   onOpenEvent:existingStableEventCallback,onSeeAll:openActivityList)` into the
   existing Home slot. `onSeeAll` returns its navigation Future; the panel rereads
   after return. The list uses the same panel with `home:false`. The existing JIN
   `FriendModulePage` already forwards these slots; it does not replace Home/router.
4. Activity Detail is module-owned and passes only stable source identity; it
   reauthorizes through the same Repository. The host Event callback must retain
   current source checks. No private Note/coordinates are passed to the router.
5. Any direct new caller of `LocatedCheckInController.save` or Ignore/Restore must
   capture `expectedEpoch` at render. Do not fetch a new epoch in an old callback.
   Existing widgets already do this; Check-in mutation eligibility reaches HTTP.

## Review and execution boundary

SHI reviews the new corrections/activity composition, not unchanged #135–#158
or the old whole package again. LI independently accepts evidence and owns final
Home/router/real-account/source/APK/device acceptance. Local tests are fixtures
unless explicitly identified as isolated actual Auth/Firestore SDK execution.
No phone, live provider, real account, model, deployment, merge or task closure is
part of this delivery. Preserve original reviewer failures and local failed runs.
