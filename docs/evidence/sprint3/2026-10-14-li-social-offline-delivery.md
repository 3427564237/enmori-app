# LI social offline phone increment — 14 October 2026 SGT

The previous phone APK exposed a synthetic Home/AI harness and backend-dependent
dead ends. This increment adds an explicit synthetic social entry with usable
memory-backed Profile/Settings/Interests, Friends and requests, Note/history,
Event read/detail and Persona flows, retaining the existing controllers and
approved Repository interfaces. Home/cards, labelled bottom navigation and own
Profile implement the user's confirmed direction. Detailed forms retain their
approved save/confirmation/dirty-exit behaviour; leaf pages use Back, avoiding
bottom-tab bypass of those checks.

Executable source: `303d052257f3ee7f02dc8c6772efc0f4015c6a58`, tree
`6b7540ce983830d9b78ef3df462222fad560d70b`. Base: the existing local offline
candidate `2406bc88abf227c665e3b7e3e8a4d37c1ed1325c`, combining accepted #94/#96.
It remains distinct from JIN's accepted #97. All new code is in a separate
`lib/harness/social` and entry; ordinary Bootstrap/router/backend/dependencies
are unchanged. Explicit `backendBaseUri=null` prevents ambient backend fallback.

[Source, APK and log fingerprints](2026-10-14-li-social-offline-source.json)
and [the complete42-route mapping](2026-10-14-li-social-offline-coverage.md)
retain exact scope/attribution. 42/42 is inventory coverage, not functional
completion; the five prototype-only and all other specific gaps remain.

## Actual owner validation

- Full Flutter517/517, exit0; includes12 new tests, not an additional total.
- Strict analysis of `lib test integration_test`: no issues, exit0.
- Non-writing format: six new Dart files, zero changes, exit0.
- Android ARM64 developer-signed APK build exit0; signature verifies; package
  `com.enmori.app.personatest`, min24/target36, versionCode2001, not testOnly.
- New widget flows exercise Profile save/readback, Note create/explicit confirm/
  History/saved return, request acceptance/list update, Persona create/explicit
  Back, scripted AI exit and synthetic logout/reentry with no credentials.
- Negative tests protect stale writes, duplicate effects, missing records,
  ended Persona sessions and bounded date-bound snapshot pagination.
- Actual widget raster captures at390x844 are in ignored build receipts.
  Home/Friends/Profile narrow320x640/1.5-text tests pass. These are not physical
  phone, all leaf-layout or human-accessibility execution.

The initial parser/type/style failures and focused red history remain in local
receipts. Artwork wrapping and Profile header overflow were fixed; tap helpers
wait for scroll layout. Existing explicit Note confirmation and Persona Back
were preserved after correcting mistaken test expectations. A capture-only
font-loader wait was interrupted with exit130 and fixed using real async;
no product assertion, state gate or requirement was relaxed. Existing Kotlin/
SDK XML and apksigner native-access warnings remain; no upgrade hides them.

## Artifact and exact limitations

Local artifact:
`build/distributions/social-offline-20261014/ENMORI-Social-Offline-20261014-arm64.apk`
in the user's primary workspace. Chinese instructions, checksum and build
receipt accompany it. No binary, signing credential or runtime fixture data
is committed/publicly uploaded. At build checkpoint adb listed no device;
no phone installation/execution is claimed. It can update the prior isolated
internal package; ordinary `com.enmori.app` is not targeted.

All sample data is process-local and resets after a full restart. Event links
are `.invalid` examples; copying one is not a real registration flow. AI uses
the unchanged scripted transport, reads no Notes and is not a real model or
purpose-authorisation/cleanup proof. Persona edits exercise the existing UI/
session state, not a real model-style effect. Synthetic Settings/preferences
are not real consent producer/store integration. No fake normal-page success
or unrestricted real-account behaviour is introduced.

DU independently reviews the new LI contribution. A later coherent actual
runtime candidate retains JIN execution/SHI composition/LI evidence review.
This owner delivery does not self-accept new shared code, replace #97 evidence,
merge main, close Issues, change the board or finish Sprint/UAT/Release. Review
one focused packet and continue independent next pages during that review.

Reproduce with the existing locked environment:

```text
fvm flutter test --no-pub --reporter expanded
fvm dart analyze --fatal-infos lib test integration_test
fvm dart format --output=none --set-exit-if-changed lib/social_offline_harness.dart lib/harness/social test/harness/social
ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub --split-per-abi --target-platform android-arm64 --target lib/social_offline_harness.dart
```

The source receipt describes optional widget-image environment variables;
fonts are existing local capture tooling, not application dependencies. Never
add new dependencies or enable a real backend/model to reproduce this entry.
