# LI reviewed-module mobile combination — 14 October 2026

Executable source `962d485e5225f49d6c89933c91562167e842c21d`, tree
`eda88e8dde7328b2fcf7146398e839b8cc74cf66`, over #104
`31b7adb0860b4b81e80086151cea79d9ed3f14e4`.
[Exact input/byte/log/APK receipt](2026-10-14-li-reviewed-modules-source.json).
The subsequent delivery-document commit does not change executable/test inputs.

Scope follows [bounded reviewed-component disposition](../../decisions/2026-10-14-li-reviewed-component-disposition.md)
and the existing LI shared-composition assignment. Import SHI #102 exact
`4190047a3cab78242b534077cc9b3dde81acc803` through cherry-pick `b873da1`;
import only ZHOU #103 exact `1af4d391546cbb456988da526f37109f86671638`
mobile lib/test delta over accepted #96. No #103 Backend code is imported here.
Independent old reviews remain attached to their own inputs: ZHOU5515428437
for #102, LI5516236916 for #103, DU5516043056 for #104. New combination needs DU.

## Resulting behavior

- Shared AI remains a bottom tab with #104's social renderer/navigation builder.
  Persona management is reachable from its new guarded header callback. Draft
  discard, busy exit confirmation and explicit unknown exit use #103's guard;
  both default/social renderers expose the callback and preserve cancellation,
  terminal hiding and current session checks. Returning keeps the AI tab selected.
- Shared Event list and detail explicitly set `syntheticPreview:true` and use
  the reviewed cards/notices. Home remains its existing labelled offline cards.
  No Interested marker, participant data or real-registration success is added.
- Import the explicit HTTP transport and separate AI/Persona harness/tests;
  the shared app still uses scripted AI, memory-only Persona and null Backend URI.
  Importing an adapter does not instantiate a real network composition.
- Account setup, Note-only save/confirmation, minimum clickable sample friend
  profiles and the removal of Me's duplicate My friends entry remain #104 scope.

## Actual verification and retained failures

On executable962d485, pinned Flutter3.47.2:

| Command/check | Result and attribution |
| --- | --- |
| `fvm flutter test --no-pub` | **571/571**, exit0, default concurrency; LI combination author run |
| `fvm flutter analyze --no-pub --fatal-infos` | Pass, no issues, exit0 |
| Non-writing `fvm dart format --output=none --set-exit-if-changed` on14 changed Dart files | Pass, zero changes |
| `git diff --check 31b7adb HEAD` | Pass |
| `ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub --split-per-abi --target-platform android-arm64 --target lib/social_account_harness.dart` | Debug ARM64 APK compile Pass |
| SDK36 `apksigner verify --verbose` / `aapt dump badging` | Signature v2 valid; isolated `com.enmori.app.personatest`, min24/target36, versionCode2001/version1.0.0, debuggable, ARM64 |

The full571 includes imported feature tests and two new shared-composition cases:
AI draft Keep/discard → Persona → Back with AI tab selected, and Event list/detail
synthetic-notice opt-in. Counts from old branches are not added to this run.

Initial 3-way mobile application reported two conflicting files: both authors
added optional AI-page fields/test-helper arguments. The resolution retains both
#104 social options and #103 Persona callback, then adds the callback to the
social header and wires its shared destination. No source was silently dropped.

Initial focused run70/1 and the subsequent in-progress full run570/1 failed only
the new Persona route assertion. The displayed page was correct; GoRouter's root
route-information URI stays `/ai-assistant` for a pushed imperative match. An
initial change to currentConfiguration.uri still failed. Inspection of the locked
GoRouter source established that currentConfiguration.last.matchedLocation is
the actual pushed location. That assertion now passes, with draft, destination,
Back and tab checks retained. The in-progress full run overlapped this test-only
correction and is not an immutable-source receipt. The final full571/0 was run
after executable962d485 was committed, with tracked source/locks unchanged.
No product guard was weakened to pass a test.

Raw outputs remain in local ignored
`build/receipts/li-reviewed-modules-20261014` and `/tmp/li-reviewed-modules-*.txt`;
fingerprints are in the source receipt. Initial failures are not rewritten.
Java native-access and existing Gradle plugin migration warnings did not fail
build/signature checks; no SDK/dependency/configuration change was introduced.

## Installable artifact and remaining work

Local artifact:
`/home/miku/Documents/ChatGPT/ENMORI/build/distributions/reviewed-modules-20261014/ENMORI-Reviewed-Modules-20261014-arm64.apk`.
SHA-256 `5c452d6aa836ad0daeedef2f08e6c19b995ae664c96b65d4168e70766079180e`,
121525450 bytes. Chinese README, SHA256SUMS and source-receipt.json are alongside.
No physical device installation was performed. This APK is a clearly labelled
offline sample; its scripted AI is not JIN's real Firestore vertical or real model.

The backend joining of JIN/ZHOU interfaces, six HTTP/OpenAPI operations, complete
cleanup/restart, DU Calendar and Note source guarantees, model preflight, changed-
source backend/Emulator gate, physical Back/background/API24–25/manual a11y/UAT/
Release remain separate. Author tests and compilation do not replace DU review
or those gates. Keep Draft/Open; no merge, Issue/Project/runtime transition or
whole-module/Sprint/Done claim.
