# LI Account preferences session repair

17 October 2026 SGT. Owner LI; independent reviewer DU. This is the bounded Account/Profile/Settings repair under the [approved owner contract](../../decisions/2026-10-05-li-profile-settings-approval.md) and [confirmed independent module allocation](../../decisions/2026-10-16-li-low-blocking-kickoff.md). It supplies existing feature widgets to JIN without changing shared composition.

## Reproduced problem and correction

On the ordinary app's Profile editor or Settings page, observe a replacement authenticated session with the same subject. The old controller watched only the subject string, so it did not invalidate an acquired read/save. The stateful form also retained private drafts and local privacy/data-use choices, even when the new canonical resource had the same revision. A delayed old save could show `Profile saved.` in the replacement session; a delayed read could replace its snapshot. A pending signout could retain the old form's busy state and later feedback.

The controller now watches the existing app-owned Auth observation and invalidates its existing operation fence on replacement. The form's local state is keyed by that observation and view, so private drafts and signout callbacks are disposed at the same boundary. An authenticated replacement rereads its own resource. The Firebase adapter already distinguishes authentication changes from token/profile refresh; that adapter is unchanged. Normal edits and explicit save/reread, invalid-input retention, uncertain-save reload and no automatic mutation retry remain intact.

The first reproduction had the existing eight cases Pass and four new cases Fail. The intermediate fix passed those twelve. The final reproduction added the signout case and strengthened late-result assertions: original production files had **8 Pass / 5 Fail, exit 1**. All five regressions then pass in the complete corrected run. Both red runs, the intermediate green and final full run are retained locally, with hashes in the [receipt](2026-10-17-li-account-session-repair.json).

## Source and actual verification

- Source-only integration unit: `11e06b4b961e495fd76c9dc3e8a61a76fead5480`; tree `5142a6bdae116774b4556531f91facda901a07b5`.
- Base: PM kickoff `dd1994af69d861253356571d59317c549c879914`, carrying reviewed #130 `9cf30134a522009f410485c6352df757ed0ab23d`.
- Exactly three source/test paths: the preferences controller, preferences page and existing Account flow test. Shared router/bootstrap/harness, Backend/API, runtime tools, platforms, dependencies and lock inputs match the base.
- Actual pinned Flutter 3.47.2 / Dart 3.13.2 full default-concurrency Flutter suite: **664/664 Pass, exit 0**, including five new cases. This includes the existing small-phone/2x-text Settings case and existing invalid, uncertain, signout and changed-account flows.
- Fatal-info analysis over `lib test integration_test`: no issues, exit 0. Non-writing format: three files / zero changes. Delta whitespace: Pass. Changed working inputs match the committed blobs in the receipt.

No Backend/store/model/provider or actual Firebase authentication was invoked. The whole root suite here belongs to this source; it does not transfer a full gate to SHI #132, ZHOU #133 or a future combined candidate. No APK was built solely for this local feature repair. Actual Android/iOS, TalkBack and real Backend/session journeys remain Not Run; DU review and the applicable JIN candidate gate remain separate.

## Consume and cross-verify

JIN can cherry-pick the single source-only commit above into his identified candidate. It supplies the existing Account feature interface; there is no competing router, runtime or broader integration branch. DU reviews the two production files, five regressions and this source-bound evidence together.

Under the existing device allocation, SHI can cross-check on that available identified candidate: open Edit profile, type an unsaved draft, end the session through the existing supported action, sign in again, and reopen Profile/Settings. Confirm fresh canonical values, no old draft/success/error feedback and no implicit write; then explicitly save and reread. Record immutable candidate/APK/hash and actual outcome. Immediate same-subject replacement and deterministic delayed read/save/signout callbacks are fixture checks here; do not manufacture a live race or equate ordinary phone actions with those injected schedules. Use an existing authorized handoff only, retain actual commit uncertainty, and serialize conflicting shared-state journeys. No expired demonstration restoration or new credentials are prerequisites for this code packet.

## Separate completed LI review

LI independently reviewed ZHOU #133 exact `e9d9fe9aa2481e6301e121829cd9fc6a339b58d9` and submitted [APPROVED 5552512965](https://github.com/3427564237/enmori-app/pull/133#pullrequestreview-5552512965). Actual affected tests 250/250, scoped fatal-info analysis, two-file non-writing format and whitespace checks passed with a clean working tree. Product inputs matched #130; inherited approved #131 tooling was excluded from new review. The cancellation fixture correctly separates pre-cancel canonical persistence from delayed HTTP delivery. Author private raw logs were not fetched; LI's own logs are hashed in this receipt.

#133's source-only `449f67459a02a8621f1212f82251da62bf1cc2b6` and already ZHOU-approved SHI #132 source-only `6ac1018929c200e2e684b25bef7ded4ddbf3a798` are available to JIN independently. Neither is inherited by this Account branch. They do not prove real repeated 9B success, settle the older second-round rejection or replace a new unified gate. No merge, Issue/Project transition, PM self-acceptance or whole application/Sprint/UAT/Release/Done assertion follows from this packet.
