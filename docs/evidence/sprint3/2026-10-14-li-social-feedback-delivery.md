# LI phone UI feedback increment — 14 October 2026 SGT

The previous AI bottom item pushed a separate leaf with no bar; Home/Friends
cards could not open a person, and Me duplicated the friend-search entry. This
source makes AI a highlighted bottom-navigation destination, uses a clearer
chat and Note layout, opens minimum sample friend profiles with guarded return,
and keeps friend search/requests under Friends while removing the Me duplicate.

Authority: [human feedback and bounded implementation record](../../decisions/2026-10-14-li-social-feedback-navigation.md),
#85 and the existing social release. Real other-user full projections remain
Pending under the retained Profile/Settings/Add Friend contracts. This change
creates no real public Profile API or additional permitted fields.

Executable **9d9d13e1c6174b04e4c8bb478ed7783f78f276fc**, tree
**9c41f0898da71b3b0b4a0876f5d6174fb3e9a4f1**. Pinned review base is unchanged
#100 **ffb8e1122f48e5e9ccab5a53a4f3d2785e2c9156**; #98/#100 source/review
packets are preserved. [Exact inputs, command/log/image/APK fingerprints](2026-10-14-li-social-feedback-source.json)
attribute this new contribution separately from all prior gates.

## Delivered behaviour

- AI opens through `go`, retains the shared five-destination bar and highlights
  index3. The Home AI card uses the same destination. Selecting current AI is
  a no-op. Every exit tab goes through the existing page-owned `_navigate`;
  active work offers Stay or Request cancel and leave. Leave precedes navigation,
  and existing session/disposal/late-response/recovery fences remain intact.
- Optional social AI presentation supplies user/assistant bubbles, an empty
  state, fixed input, labelled Send and an action menu for result read/reload/
  earlier/delete. Menu actions recheck current session/state. Terminal private
  content remains hidden; unresolved-result/cancel/check-delete controls remain
  visible. Default feature/harness rendering remains unchanged.
- Optional social Check-in presentation adds a clear writing region, current
  sample visibility and one character count. Approved Note-only1–500 validation,
  creation-time visibility, pending/failure and explicit separate saved-read
  confirmation are retained. No Mood/photo/location or social Note read is added.
- Home/Friends cards open an explicitly synthetic identity profile with only
  existing DisplayName/Username and the derived name-initial avatar. Current
  friend removal and unknown Username show unavailable; Back pops or returns
  Home through the existing observed-session guard. No bio/contact/Interests/
  Notes/Events/Activity/friend graph is fabricated or exposed.
- Me removes its duplicate My friends shortcut. Friends retains existing
  DisplayName search and request actions, with clearer Search friends wording.

The new Account-entry → scripted AI check also revealed an inherited #100
wiring defect: that sample Auth denied every token read, so the existing wire
client stopped before the existing in-memory transport. The new observed-session
stub uses only the already accepted `synthetic-ai-token-` fixture prefix; it is
not a JWT/service credential. It rotates on a fresh same-UID observation and is
denied before observation, after logout and after disposal. Inputs are discarded;
remote Backend remains null. This restores the previously authorized local
scripted interaction, without enabling Firebase/Auth/provider/model access.
The earlier #100 tests covered scripted AI only through the pre-onboarded entry;
this missing consumer-chain coverage is corrected and disclosed here.

Only opt-in presentation hooks, shared offline composition, the sample Auth and
focused tests change. AI controller/Domain/reader/real asynchronous Application,
History/Calendar, ordinary Bootstrap/router, Backend/API/platform/dependencies
retain their prior bytes. LI's new visual delta does not compete with owners'
real feature implementation. No new readiness claim follows from these inputs.

## Actual verification and failure trail

| Check on the executable above | Result |
| --- | --- |
| Full Flutter, default concurrency | **537/537, exit0**, includes12 new cases |
| Fatal-info analysis of lib/test/integration_test | No issues, exit0 |
| Non-writing format of11 affected/harness Dart files | Zero changes, exit0 |
| Exact contribution whitespace | Pass, exit0 |
| New-entry ARM64 debug APK | Build exit0; v2 signature verifies |
| Manifest | Isolated `.personatest`, debuggable, min24/target36, no testOnly attribute |

New checks cover all four AI exit destinations, current-tab no-op, terminal
content hiding,320x640/2x-text keyboard input reachability, menu deletion Keep/
confirm, Account-entry scripted request/reply, minimum-profile navigation and
removal/unknown failures, guarded no-stack return, retained friend search,
Me entry removal, Note save vs explicit confirmation and the sample token fence.
Focused/raster cases overlap the537 and are not added to it. The final new
source rechecks followed the analysis-style and profile-return corrections.

Preserved initial failures: the narrow keyboard probe initially selected multiple
Scrollables; it now targets the actual conversation scrollable. A missing test
import and invalid `const Semantics` caused compilation failures and were fixed.
The Account-entry scripted-send probe then reproduced `unavailable` against the
old sample Auth before the synthetic-only fix. Strict analysis flagged a missing
brace in the new menu guard; the corrected source passes. The initial visual
inspection showed oversized routine action buttons; those moved into the menu.
Profile return was made explicit even with no retained stack. Existing assertions
were retained; the old observed-session token assertion now checks a non-JWT
sample stub, with denial before observation/after logout/disposal verified.
All local failed logs are retained and hashed, alongside inherited Android
Kotlin/SDK XML/apksigner native-access warnings.

UI Skill active-destination guidance was applicable. No verified keyboard-specific
match was returned by its targeted stack search; this layout uses the existing
Flutter SafeArea/Scaffold and a bounded short-viewport scroll fallback, verified
by the actual narrow/keyboard tests instead of claiming a database recommendation.

## Actual widget previews and phone artifact

These images are Flutter test rasters from the current actual widgets and fully
synthetic fixtures at390x844/pixelRatio2. Capture uses installed Inter aliased for
Roboto plus the locked SDK MaterialIcons; this is not Android-font equivalence,
physical phone photography or human accessibility proof.

- [AI empty state](2026-10-14-li-social-feedback-ui/ai-empty.png)
- [AI messages and bottom bar](2026-10-14-li-social-feedback-ui/ai-chat.png)
- [Check-in editor](2026-10-14-li-social-feedback-ui/check-in.png)
- [Minimum sample friend profile](2026-10-14-li-social-feedback-ui/friend-profile.png)

Local APK, Chinese instructions, images and checksum are in the primary workspace:
`build/distributions/social-feedback-20261014/ENMORI-Social-Feedback-20261014-arm64.apk`.
SHA256 **b61701908b0f101998cdbb7b8c0e8cfd3fbd5e59cf24f7dec7e7889b60d4acc6**.
Package `com.enmori.app.personatest`, ARM64, versionCode2001/version1.0.0,
min24/target36. No APK/signing material/private raw logs are publicly uploaded.
Physical installation/run, new real Backend/Emulator/model gate, API24/25,
hardware Back/manual accessibility and UAT/Release are Not Run this round.

This remains a labelled process-local sample with scripted AI that reads no
Notes. Current sample visibility/consent is not actual F03 authority/revocation
proof, and friend profiles are not a completed real full projection. All42/38
inventory and retained Calendar/Friend/Event/real-AI/prototype-only gaps remain.

DU independently reviews one concentrated new LI packet. #98/#100 pending
reviews remain tied to their original heads. LI does not self-accept this source,
merge, close Issues, promote Project or claim Sprint/UAT/Release completion.

```text
fvm flutter test --no-pub --reporter expanded
fvm dart analyze --fatal-infos lib test integration_test
fvm dart format --output=none --set-exit-if-changed lib/features/ai_conversation/presentation/ai_conversation_page.dart lib/features/check_in/presentation/check_in_page.dart lib/harness/social test/features/ai_conversation/ai_conversation_page_test.dart test/harness/social
ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub --split-per-abi --target-platform android-arm64 --target lib/social_account_harness.dart
```

Optional raster variables are ENMORI_CAPTURE_SOCIAL_FEEDBACK, ENMORI_CAPTURE_FONT
and ENMORI_CAPTURE_ICONS, used only by the targeted new phone-layout test. No new
package, environment, credentials or ordinary runtime is needed to reproduce.
