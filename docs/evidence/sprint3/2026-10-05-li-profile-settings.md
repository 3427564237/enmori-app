# LI own Profile/Settings implementation and owner evidence — 2026-10-05

Owner/executor: LI HOURUI. Issue: [#45](https://github.com/3427564237/enmori-app/issues/45). Assigned independent reviewer: DU KUN. Authority: [S-PM-1005-LI-PROFILE-SETTINGS](../../decisions/2026-10-05-li-profile-settings-approval.md) and the exact linked approved contract. This is a focused owner implementation/review packet, not whole-module or Sprint acceptance.

## Implemented behavior

The authenticated owner can edit an optional DisplayName and independent Private/Friends-only/Public Profile visibility, save and reread the canonical result, or leave without submitting. Settings offers separate Profile-visibility, future Check-in-default and optional-data-use sections. Check-in visibility and consent save together while retaining the owner's other choice. Device signout follows the installed Firebase SDK's observed session to Sign in; a failed signout shows a safe message and retains the session.

The actual controlled Backend composition root wires four approved owner operations, strict minimized DTOs, stable public errors and an Account-owned repository Port. Firestore transactions resolve the existing Auth Binding, reread the owner Account, protect separate resource revisions and preserve unrelated fields. Legacy reads project unset name/Private/version 0 without migration. Current Account reads accept Friends-only; initial onboarding Accept/Reject still derives the original Public/Private choice. No new public/other-user reader, dependency, collection, index, migration or infrastructure is added.

| Approved contract boundary | Source and owner verification |
|---|---|
| Name normalization, 1–50 scalar values, control/format/separator rejection, explicit null clearing | [Domain](../../../backend/src/account/domain/profile-values.ts), [unit/repository cases](../../../backend/test/account-preferences.test.ts), strict [Flutter response parser](../../../lib/features/account/data/backend_account_preferences_repository.dart) |
| Owner identity, undeclared fields, public errors and exact DTOs | [Transport](../../../backend/src/account/transport/register-routes.ts), [normative OpenAPI](../../../api/openapi.json), [injection/contract cases](../../../backend/test/account-preferences-transport.test.ts); no caller-selected AccountId |
| Legacy read-only state, separate revisions, atomic preservation and stale-write rejection | [Firestore adapter](../../../backend/src/account/infrastructure/firestore-account-preferences-repository.ts), unit cases and [real Emulator transaction cases](../../../backend/emulator-test/account-preferences.integration.test.ts) |
| Save followed by read, cancellation, failed/uncertain save, explicit reload, disposal/account change and signout | [Page/controller](../../../lib/features/account/presentation/account_preferences_page.dart), [focused widget cases](../../../test/app/account_preferences_flow_test.dart), actual Android flow below |
| Retained canonical Interests and independent Home/See All reads | Existing Profile regression cases and the extended [Android scenario](../../../integration_test/s3_own_profile_real_backend_test.dart) |

## Source and results

Product/Backend/API/runner/Android source is local commit `e6f72b9123e79045d7c1c0cc1cd58a8198275434`, over the published documentation approval `7e24396135ce41c94873da05f59af033c4035dee`. The later verification-only commit named in the [sanitized summary](li-profile-settings-20261005/result-sanitized.json) adds one widget case for a lost response after a possible commit; product/Backend/API/Android source stays identical to `e6f72b9`.

| Check | Observed result |
|---|---|
| Pinned Node strict Backend build and unit/Port/transport/contract suite | Pass, 286/286 |
| Real isolated Firebase Auth/Firestore Emulator suite | Pass, 28/28; including same-resource racing writes (200 + 412), independent-resource preservation, stale no-write and another owner unchanged |
| Flutter static analysis on final source/tests | Pass, no issues |
| Full Flutter unit/widget regression | Pass, 126/126 |
| Android integration through real Auth, HTTPS Fastify and Firestore Emulators | Pass, 1/1 complete scenario |
| Host-side final Firestore checks | Pass; retained Interests empty at revision 3, Profile revision 1 and Settings revision 5 with their independently chosen fields |
| Instrumented test APK | Built/installed; SHA-256 `de0678aa8e91a78828acaaa50b608eb2e3f9db31e6e6aa9b5e6bcbf5e063d915` |
| Whitespace/JSON/relative-link and staged scope checks | Pass; dependency/lock/platform files unchanged |
| New source/evidence DU review | Pending |

The eight added widget cases and five parser/API cases are included in the full count. They cover canonical reread/cancel, independent Settings choices, stale revision reload, validation correction, unconfirmed commit without automatic retry, failed reread without success, account replacement/late completion, failed/successful signout with one Auth subscription, and small-phone/2× text reachability. Small-phone coverage is widget evidence, not device accessibility acceptance. Backend safe vendor failures and malformed/corrupt records are covered separately. No error or race is claimed as device execution unless listed below.

## Android execution and reproduction

Target: existing `enmori_s2_api36` AVD, Android 16/API 36, x86_64; ADB `emulator-5554` reported `device` and completed boot before execution. Flutter 3.47.2/Dart 3.13.2; Node 24.19.0/pnpm 11.19.0. The existing [runner](../../../tool/run_s3_profile_emulators.mjs) starts only isolated Auth/Firestore project `demo-enmori-rmvp01a-r10`, seeds synthetic owner/Interest/Event fixtures and uses the real feature repositories/use cases and app router. It now additionally wires the real Account-preferences repository and use case.

The prior [Android evidence](2026-10-05-li-profile-android.md) explains the unchanged environment allowlist, ephemeral loopback HTTPS certificate/trust boundary and private temporary fixture cleanup. There is no TLS bypass, real cloud project, provider import, public listener or cloud credential. Complete logs remain machine-local under `/home/miku/.local/state/enmori/sprint3-li-20261005/` (`profile-settings-backend.log`, `profile-settings-emulator.log`, `profile-settings-analyze.log`, `profile-settings-full-tests.log`, `profile-settings-android.log`). Temporary fixture files and Auth/Firestore processes were cleaned up; the AVD started for this run was stopped after success.

With the existing locked dependencies and cached FVM SDK, put the approved Node 24.19.0 binary first in PATH, start the existing AVD and execute from the repository root:

```sh
pnpm backend:verify
pnpm backend:verify:emulator
fvm flutter analyze --no-pub
fvm flutter test --no-pub
node tool/run_s3_profile_emulators.mjs <emulator-serial>
git diff --check
```

Run the Backend Emulator suite and Android runner sequentially because they share the isolated Emulator ports. The Android scenario retains all prior Profile/Interest/Home assertions, then verifies:

1. Legacy Profile reads unset/Private/revision 0. Saving a whitespace-padded name and Friends-only visibility yields the trimmed canonical name at revision 1. Leaving a later unsaved name edit emits no Profile PUT and the displayed saved name remains canonical.
2. Settings saves Friends-only plus accepted consent; a consent-only save retains visibility. Later visibility-only saves cycle Public, Private and Friends-only while retaining rejected consent. The final protected read reports revision 5, Friends-only/rejected; Profile visibility remains unchanged.
3. Signout uses the real Firebase SDK and observed session. Sign in is displayed, the Settings route is gone and current Firebase user is absent. Signing back in with the synthetic fixture through the real login form restores Home and rereads the saved Profile.
4. Independently of Flutter's final assertions, the host Firestore adapter checks final Interests, Profile and Settings fields/revisions. Fixed safe result markers report Pass; no credential, identity, body, user content or vendor document is included in the published summary.

## Review handoff and remaining LI/PM work

The completed authorized PM preparation batch is recorded [separately](2026-10-05-li-pm-preparation-execution.md). PR #50's currently published head is `7e24396135ce41c94873da05f59af033c4035dee`; this new code/evidence packet remains local pending its specific publication confirmation. #50 stays Draft/Open over #43 `27b899fe93066298bd36d4d5dadf0f90a374a50d`, itself over #42 `479619e8d124f3342458506fc145dc4bfbe3f483`. No predecessor was merged or retargeted by this work.

The final live refresh found DU's [follow-up approval](https://github.com/3427564237/enmori-app/pull/50#pullrequestreview-5407782515) at `daca5e3a60696c411290451346a8ce8db9d1de20`, submitted 5 October 03:23:11 Asia/Singapore. It accepts the prior first-Profile Android test/runner/evidence delta over `acc6763`, without independently rerunning owner commands, and explicitly excludes predecessor #43, merge and Sprint acceptance. That historical test/evidence review is now satisfied; earlier Pending snapshots in the retained documents are superseded for this exact scope only.

DU should assess the new contract implementation and all related tests/evidence together, retaining the separate #43 predecessor disposition. The `acc6763b8b2cc53dc67b38a4a7c7a3fa7ff4ebf5` and `daca5e3` approvals cover their historical first-Profile/source/evidence scopes only. This owner packet cannot self-approve the new diff. Final combined-tree checks apply after the stacked predecessors are resolved.

Whole LI coverage remains incomplete where producer destinations or contracts are missing: DU Footprint/Calendar preparation (#48), JIN authorized Friend/Activity reader/destination, ZHOU Persona/AI preparation (#49), additional Profile fields and other-user lifecycle/block/disclosure contracts. Verify/recovery prototype states remain Pending. LI can review DU's preparation and JIN's combined gate only when those exact artifacts exist. #45/#44 remain Open; whole-module/Sprint acceptance, cloud/controlled-Demo, physical phone, iOS, UAT and Release are not established by these Emulator checks.
