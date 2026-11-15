# Optional registration profile guidance and legacy-region affordance

Authority: [LI's confirmed scope](../../decisions/2026-11-15-li-registration-profile-guide.md). Branch: `souma/registration-guide-20261115`, based on the latest v69 client and approved v71 backend fix. Backend delivery is [recorded separately](../2026-11-15-friend-name-fallback/README.md).

## Behavior

After account creation and the existing explicit initial processing choice, the app opens optional Profile → Recommendation preferences → Interests guidance. The Profile step exposes the existing nickname and explicit avatar editor, distinguishes the immutable Username, explains blank-name fallback, and permits skipping. Existing accounts are not reset or required to repeat setup. A stable setup route also resolves the prior redirect race that could bypass follow-up guidance.

Nickname saving uses the current Profile revision and retains existing visibility and optional details. Blank/unchanged names and explicit Skip cause no Profile/Avatar writes. Saves await a fresh read; unresolved writes preserve the draft and explain that leaving cannot cancel a potentially committed save. Session replacement and backgrounding retire stale navigation. Existing avatar preview/save/visibility behavior is reused. Recommendation and Interest choices remain optional, with no new default consent or discovery switch. Recommendation Save and continue waits for the post-save refresh; existing edit pages still use Save.

The reported `Previous region` input was intentionally read-only under the 28 October region contract but misleadingly focusable. In the connected profile page, a nonempty legacy region is now plain reference text and an empty legacy region has no box. Home area remains selectable through Recommendation profile. No region record or migration was changed.

## Verification

- Static analysis: no issues; dependency lockfiles unchanged.
- Final broad Flutter run: **1,792 tests passed**. The preceding 1,791-test run and 12 focused lifecycle/router tests also passed; these counts overlap and must not be added. The additional regression verifies delayed-refresh single flight before recommendation setup advances.
- New widget coverage includes blank Continue/Skip with no writes, trimmed nickname and privacy/detail preservation, real editable-text keyboard requests, validation, skip confirmation, pending-save exclusion, unknown save/failed readback, unreadable optional data, background/session replacement, avatar editor return, and narrow portrait/landscape screens with 2x text and keyboard insets.
- The actual app router was exercised from newly completed onboarding through all three optional steps and Home, with save, skip and unavailable-profile cases; initial Reject and default privacy/matching choices remained unchanged.
- Existing profile-region tests now verify a static legacy value, retained draft and no location/profile write when region selection is cancelled. A rendered empty-region case confirms the obsolete field is absent.
- Rendered actual widgets were visually inspected in English and Chinese. These use synthetic fixture data and locally loaded test fonts, not a device or connected registration session: [English](profile-en.png), [Chinese](profile-zh.png), [region correction](region-correction.png). Narrow/large-text behavior has widget evidence; Android physical-keyboard behavior is not claimed from a widget input-channel assertion.

## Delivery boundary

Signed release **v72**, `1.0.0-setup20261115`, was built from clean source `57a170a654ce359c15be3781602445c1c111511e`. The existing release client configuration, package `com.enmori.app.group`, companion selection and signing identity were retained. Package/version/non-debuggable status and the release certificate were verified. [APK receipt](android-v72-candidate.json) binds the SHA-256, source and final 1,792-test result. Installable artifact: `/home/miku/Downloads/ENMORI-setup-v72-release.apk`.

The first packaging attempt reused a test-generated plugin registrant and failed because the release excludes `integration_test`. After tests finished, the ordinary release build regenerated ignored plugin tooling and succeeded without any tracked source, lockfile or dependency change. Existing build-tool/plugin deprecation warnings were not treated as successful runtime evidence.

The phone was not connected at the packaging check, so no retained-data installation or physical-device acceptance is claimed. No real new account, nickname or avatar was created for testing.
