# LI activity composition and baseline candidate delivery

15 October 2026, Asia/Singapore. Author LI. Tested source **3cc115a1173bdbd2917c2eeea22e0c8d38143634**, base **936a1bd71ff1734371b43c723905da333eb7411e** on the reviewed #106 composition. [Human delivery scope and Calendar source handoff](../../decisions/2026-10-15-li-baseline-candidate-delivery.md). This is a source/APK delivery with review Pending; it is not a live-service or whole-Sprint acceptance.

## Usable increment

Consumed the seven Flutter source/test blobs from SHI #110 **82fbd0ac94a4731ff8d12617309705a2c5353baf**, verified byte-identical. Added independent `/activities` and `/activities/:browseId` composition, a separate Home entry, observed-session/onboarding guards, same-subject stack invalidation and locator-only navigation. Home Top2 and `/events` recommendations retain their existing contract. The ordinary router's explicit activity flag defaults false. The offline social APK includes the new navigation and clearly reports its absent Backend; it cannot present that failure as an empty/live success.

Added an actual Dart MethodChannel and Android handler for explicit source actions, with native HTTPS/host/credential/fragment/port/control/secret-query revalidation, foreground check and browser selector. The unchanged source URL is dispatched only after the current-authority callback, with no intervening Dart await. The Android handler performs synchronous validation/dispatch; it cannot rerun a Dart closure after the channel message has crossed the boundary. Android errors, missing capability or no browser are safe failures; the existing copy action remains available. There is no WebView, new dependency, automatic action, purchase/Going/registration receipt or new data write. iOS remains deferred and has no new native implementation.

The source follows the Android [Intent API](https://developer.android.com/reference/android/content/Intent) for the browser selector. Compilation verifies API references; mock MethodChannel success is not actual OS/browser execution. Neither this source delivery nor key presence enables real provider content.

## Actual LI verification

Pinned Flutter **3.47.2**, Dart **3.13.2**, existing lock/cache; no install or dependency change.

| Check | Actual result |
| --- | --- |
| `flutter test --no-pub --reporter expanded` | **595/595**, default concurrency, exit0 |
| Three activity/opener/feature suites | **23/23**, exit0, included in595 |
| New offline service-failure navigation case | Included in595; no false empty/live result |
| `flutter analyze --no-pub --fatal-infos` | No issues, exit0 |
| Non-writing Dart format on10 own changed files | 0 changes, exit0 |
| Diff whitespace check | Pass |
| Isolated ARM64 debug APK build | Pass,85.2s Gradle step, exit0 |
| APK signature/badging | v2 verified; `com.enmori.app.personatest`, min24/target36 |
| Unchanged inherited SHI blobs | 7/7 identical |
| Physical install/run, actual external browser | **Not Run**; adb inventory empty |
| New Backend, Emulator, live provider/model | **Not Run** for this candidate |

Reproduce with `/home/miku/fvm/versions/3.47.2/bin/flutter` and the above arguments. Build command:

```sh
ENMORI_PERSONA_ANDROID_TEST=true /home/miku/fvm/versions/3.47.2/bin/flutter build apk --debug --no-pub --split-per-abi --target-platform android-arm64 --target lib/social_account_harness.dart
```

The focused cases exercise every nonauthenticated router gate, same-subject replacement/stale callback, list→Detail→Back with no implicit reload, independent recommendation reads, explicit failed opener/copy fallback, background clearing and explicit Reload. Native guard/missing capability/errors/unsafe URL inputs are checked through a mocked channel. This does not establish actual installed intent resolution, remote operation or device accessibility.

Failures retained: first new test compilation missed the enum import and awaited a void lifecycle API; fixed without product behavior changes. Next two focused invocations exposed active five-minute timers in the externally owned test container: the first fixture cleanup edit covered only one of the two affected cases. Explicitly unmounting/disposing both fixtures fixed them; controller lifetime/expiry rules were unchanged. Final focused23/23 and full595/595 pass. Raw first-failure and successful logs remain locally alongside their hashes in the [source receipt](2026-10-15-li-baseline-candidate-source.json). Gradle native-access/plugin/SDK-XML warnings remain visible; no upgrade was attempted.

## Installable artifact

Local delivery directory: `/home/miku/Documents/ChatGPT/ENMORI/build/distributions/baseline-candidate-20261015/`. APK `ENMORI-Baseline-Candidate-20261015-arm64.apk`, **121547291 bytes**, SHA256 **ed289aa60c3387923497937f25c55f563034b391c410b1d833d2433455616009**. Chinese installation/verification instructions, `SHA256SUMS`, source receipt and9 raw logs accompany it outside Git. Package isolation prevents replacing ordinary `com.enmori.app`. The APK retains synthetic Account/social/History/Persona and scripted AI; it is not a real-account/model/store flow. No phone was installed or altered.

## Current concrete handoff

- **DU → LI new code review**: one focused new shared/native delta against pinned base936a1bd; seven SHI blobs are identified separately. Do not self-accept LI's code or repeat unchanged #106 component reviews.
- **ZHOU → SHI #109/#110 review**: exact11082fbd0a remains Pending at this checkpoint; this candidate is a parallel composition for review, not a substitute approval.
- **JIN → selected actual Event composition**: integrate SHI Backend route/schema fragment and completed-owner seam in JIN's sole-writer Bootstrap/OpenAPI/inventory. Flutter constructors/providers and native override now exist; source is no longer missing from LI.
- **DU → Calendar source**: start from immutable #106a0ceb62 or remote reviewed-product branch936a1bd, preserving dirty local files. The concrete selected-date scope is received; no whole-month/map/ID-registry expansion is needed. DU's bounded18:00SGT estimate is retained.
- **JIN + SHI → AI restart R1**: #10571dfa602 remains Changes Requested at the source last checked. SHI reviews the new correction once; LI verifies its source-bound evidence.
- **ZHOU + JIN → real Qwen positive packet**: #108c106044 remains reviewed; the observed `AI_REPLY_REJECTED` is not a successful response. Preserve strict semantic rejection and no fabricated fallback.

The above PR heads/reviews were refreshed during this run. No new AI correction or Calendar executable packet was available; absence of a new published head does not prove absent local work. No changes to other owners' feature code, Backend/API/lockfiles, remote main, Issue/Project status or deployed runtime.

## LI provider-basis refresh

Refreshed the official [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) on15October; page last-update label remains27June2023. The terms describe a conditional API licence, owner-requested removal within24hours, visitor-data disclosure, reasonable service caching limits and restrictions on replicating the essential Ticketmaster experience. No separate provider-contact requirement is inferred from this page. Existing human account/terms acceptance and bounded API evidence remain distinct from app readiness. Current selected transient/no-store design is consistent with minimizing retention, but actual visitor disclosure, removal/disable operation, strict live projection and integrated runtime still need evidence before real activation. This refresh does not ask LI to contact the provider or block approved isolated code.

The candidate/APK portion is delivered; DU review and actual Backend/provider/device joins remain open. Preserve the full42/38-state target and15October23:59SGT requirement without calling this all-module, Sprint, UAT or Release completion.
