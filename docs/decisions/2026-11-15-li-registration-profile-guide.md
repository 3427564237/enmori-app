# LI: optional nickname and avatar in registration guidance

Date: 15 November 2026 (Asia/Singapore). Authority: LI HOURUI, PM.

After confirming that registration requests a unique Username but has no nickname step, LI requested a more complete registration experience. LI selected: “完整分步引导：加入昵称和头像，资料仍可跳过，空昵称用用户名（推荐）”. The presented scope retained the current interests, region, birthday and privacy choices.

## Approved scope

Add a clear optional profile step after account creation and before the existing recommendation-settings and interest guidance. Explain that Username is the unique immutable identifier, while the optional editable nickname is the existing DisplayName. A blank nickname uses Username for display; it does not write Username into the optional stored field.

Let a new user set a nickname and optionally open the existing avatar editor, or continue without either. Use the existing Profile and Avatar APIs, validation, revision checks, session isolation and uncertain-save recovery. Preserve stored Profile visibility and all optional Profile details when saving only the nickname. Selecting or previewing an avatar is not a saved-success claim; existing explicit upload/save and avatar visibility notice remain required.

The recommendation-profile and interest steps remain available and optional under their existing contracts. Birthday, region, discovery, matching and optional processing permissions are not silently enabled or made mandatory. Existing accounts can continue using their current data and edit entry points; this change does not reset accounts or force an onboarding migration. Failure to save an optional profile must be explained, with an explicit way to continue or recover rather than falsely reporting success.

This is a bounded registration presentation/navigation amendment. It does not change Username uniqueness/immutability, make DisplayName required, alter privacy defaults, select new dependencies, add backend storage or grant access to private fields. Its missing-name behavior uses the separately approved [friend-list fallback amendment](2026-11-15-li-friend-list-name-fallback.md). Earlier [Own Profile/Settings approval](2026-10-05-li-profile-settings-approval.md), [frontend usability decision](2026-10-29-li-frontend-usability-profile.md) and [recommendation-profile/discovery contract](2026-10-28-li-event-profile-discovery.md) remain applicable.

## Acceptance

- A newly completed account reaches the optional Profile step before the existing subsequent guidance; route refresh must not skip it or open duplicate flows.
- Skip creates no Profile or Avatar write. Blank nickname continues with the existing Username display fallback.
- Saving a valid nickname preserves Profile visibility, optional details and existing avatar state; double taps do not issue duplicate saves. Invalid input stays editable, and uncertain writes are read back before any repeat.
- The existing avatar editor remains reachable, with explicit save, photo-picker cancellation and its current privacy notice. Returning continues the same registration flow.
- Signing out or replacing the observed session retires old reads/saves/navigation and never applies the prior account's draft to the next account.
- Narrow-screen, large-text, keyboard, back/skip and loading/failure behavior are verified. Source tests, signed APK and actual-device acceptance are recorded separately.

## Related input affordance correction

LI also reported that tapping the `Previous region` box did not open the keyboard. Inspection confirmed this was the existing read-only legacy-region field, retained under the 28 October recommendation-profile decision. Preserve that authority: show a nonempty saved legacy value as ordinary reference text, omit the empty box, and retain the existing Recommendation profile → Home area picker. This repairs the misleading editable appearance; it does not restore free-text region editing or change stored region data.
