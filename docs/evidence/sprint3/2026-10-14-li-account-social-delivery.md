# LI Account/forms and social composition — 14 October 2026

A second explicit offline entry now exercises existing registration/sign-in,
Username and initial-choice controllers before entering the social Home. Both
Accept/Public and Reject/Private reach Home, preserve the chosen sample Settings,
and support logout/sign-in reentry. Invalid or unavailable Username can be
corrected instead of leaving the user with only an identical failing retry.
The original retry remains available with its existing controller semantics.

## Authority and exact contribution

Assigned scope: [#85's published 14 October follow-up](https://github.com/3427564237/enmori-app/issues/85)
and the [immutable accelerated plan's LI package](https://github.com/3427564237/enmori-app/blob/948579ec82b2c5363ab2b3b2ea353ca652020f07/docs/planning/2026-10-14-li-ai-accelerated-delivery-plan.md).
The [social implementation release](../../decisions/2026-10-14-li-social-ui-increment-release.md),
[approved R2 onboarding contract](../../decisions/2026-09-03-rmvp-01a-contract-approval.md),
Q18-B and `ARCHITECTURE.md` retain their scope. The release permits explicitly
synthetic in-memory interaction; this delivery creates no real Auth identity,
Username reservation, consent producer or Firestore persistence.

Executable source **48112ccb71e80e9210e2a5a0e6efa193183ad6d5**, tree
**95d1c5e9ae89e8d1e58a2cf0d9d824dba1bf04d9**. Exact inherited #98 base
**1cc52800e7d51320d6b97c76b5b6e2ee3f9dcba0** remains unchanged for DU review.
A separate pinned PR base identifies only this six-file contribution; inherited
#98 owner evidence or pending review is not silently promoted to acceptance.
[Input blobs, logs, command outcomes and APK fingerprints](2026-10-14-li-account-social-source.json)
identify this source independently of JIN #99.

- `lib/social_account_harness.dart`: new explicitly selected entry.
- Social harness: optional account-setup composition, observed-session gate,
  incomplete-onboarding redirect and per-registration-route notice lifetime.
- New sample Auth Repository: discards form inputs, starts signed out, observes
  fresh sample sessions, cancels queued observations on logout/disposal and
  cannot produce a service ID token. No credentials are stored or logged.
- Sample Account Repository: required/completed state, existing canonical
  Username/reserved-name rules, initial Accept/Public vs Reject/Private and
  process-local exact replay/conflict protection. No global uniqueness,
  24-hour receipt retention, Auth Binding or cross-service atomicity is claimed.
- Existing `OnboardingPage`: adds Change Username after the existing
  `usernameInvalid`/`usernameUnavailable` failures. It abandons the failed UI
  command, reopens Username and requires the purpose/choice steps again.
  Repository/controller/public contract and existing exact Retry are retained.
- Eight new tests cover complete choices/reentry, observed-session-only routing,
  incomplete-setup deep-link rejection, same-UID dirty-leaf replacement, form
  validation, rejected-Username correction, replay/conflict and queued-logout
  invalidation. Existing tests continue to cover retained exit/save guards.

Ordinary Bootstrap/router, shared Backend/gateway/HTTP/API, dependencies and
other owners' feature files are unchanged. The one ordinary feature-file delta
is the bounded onboarding error-recovery action described above. Legacy
`social_offline_harness.dart` keeps its original pre-onboarded entry. The new
entry forces `backendBaseUri=null`, retains app-lifetime Auth observation and
recreates the router on a fresh observed session. Command success never grants
an authenticated route; a test deliberately withholds the session observation.

## Actual validation

| Check on this executable source | Result |
| --- | --- |
| Full Flutter, default concurrency | **525/525, exit0**; includes the eight new cases |
| Strict analysis `lib test integration_test` | No issues, exit0 |
| Non-writing format, seven affected/harness Dart files | Zero changes, exit0 |
| Product diff whitespace | Pass, exit0 |
| ARM64 debug APK from the new entry | Build exit0 |
| APK signature and manifest | v2 signature verifies; isolated package, debuggable, no testOnly attribute |

The new narrow320/1.5-text journey includes rejected Username, correction,
explicit Reject and Home. These widget checks are not physical phone or manual
accessibility results. Focused groups overlap the full525 and are not added.
No Backend suite or JIN #99 gate was rerun for this Flutter-only contribution.
#99's original default Flutter504/1 failure remains in its separate open
reliability disposition; this new525 result does not replace it.

Preserved red history: initial new pattern-matching syntax/missing test import;
focused17/2 exposed a registration Snackbar carrying onto choice/logout buttons;
route-scoped messaging removed that overlay. The next17/2 exposed the new
router's initial register location after logout; completed sample reentry now
starts at sign-in. The initial narrow recovery probe assumed lazy ListView
children were already built; scroll/pump helpers now reveal the actual controls.
A subsequent source-bound red probe showed the absent Change Username action;
its implementation passes the corrected narrow journey. Existing retries,
choice semantics, session predicates and exit assertions were not relaxed.
Inherited Kotlin/SDK XML/apksigner native-access warnings remain. Private raw
logs, including failed runs, are preserved under ignored `build/receipts/` and
fingerprinted in the manifest.

## Phone artifact and coverage delta

Local APK with Chinese instructions/checksum:
`build/distributions/account-social-offline-20261014/ENMORI-Account-Social-Offline-20261014-arm64.apk`
in the user's primary workspace. SHA256:
`234caaaca01b3ca18e521ea31558dd97cb625dcab3434a998870825748bb2bad`.
Package `com.enmori.app.personatest`, versionCode2001/version1.0.0,
ARM64/min24/target36. No binary or signing material is publicly committed.
No physical installation/run, new device/Emulator persistence gate, API24/25,
hardware Back, human accessibility, UAT or Release was performed this round.

The earlier [all42 inventory](2026-10-14-li-social-offline-coverage.md) remains
its immutable checkpoint. This source advances these rows only:

| Figma identifiers | This source's new executable coverage | Remaining boundary |
| --- | --- | --- |
| `login`, `register` | Existing email/password form widgets/controllers are joined into this explicitly labelled offline entry | No real identity creation/authentication; all invented form inputs exercise one sample identity |
| `reg-complete` | Observed sample-session transition into onboarding | Outcome only, no invented standalone success route or real account proof |
| `data-consent`, `first-time-privacy` | Username → purpose → explicit Accept/Public or Reject/Private → Home/Settings | Sample projection; no actual AI/recommendation permission producer |
| `less-personalised` | Reject permits entry and saves the sample rejected/private values | No real personalised/limited-ranking evidence or new dedicated terminal |

Full Profile fields, Interest onboarding, dedicated Calendar and Friend/Event/
real AI gaps remain as assigned. The latest plan assigns Calendar to DU; this
shared contribution does not take over DU's consumer. All five prototype-only
routes retain their prior contract holds. Inventory coverage is not a new
completed percentage. Scripted AI reads no Notes and does not prove real-purpose
consent, revocation, persistence or model behaviour; Event fixtures are samples.
All data resets with process restart. Existing sample Note visibility remains
Private even when the new initial choice sets current visibility Public.

## Review and reproduction

DU independently reviews this new LI code in one focused packet. LI has not
self-accepted it. #98's review remains separately pending at its unchanged head;
no duplicate old acceptance or unchanged gate is requested. At publication
checkpoint there is no new ZHOU/DU product delta beyond the previously published
sources to review. A later actual coherent runtime candidate retains the
applicable JIN execution/SHI independent code/LI evidence disposition path.
Keep Draft/Open and main/task/Project/runtime states; no merge, task closure,
whole-Sprint/UAT/Release completion or automatic phone installation follows.

```text
fvm flutter pub get --offline
fvm flutter test --no-pub --reporter expanded
fvm dart analyze --fatal-infos lib test integration_test
fvm dart format --output=none --set-exit-if-changed lib/social_account_harness.dart lib/harness/social lib/features/account/presentation/onboarding_page.dart test/harness/social/offline_account_setup_test.dart
ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub --split-per-abi --target-platform android-arm64 --target lib/social_account_harness.dart
```

Use invented email/password inputs only. The repository's locked toolchain and
existing dependencies suffice; no real environment or credentials are needed.
