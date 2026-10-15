# LI controlled Event service/client candidate

15 October 2026 (SGT). LI receives JIN's delivered #124 and DU's completed reviews, independently verifies JIN's evidence, and supplies the next controlled Android client. This completes the presently executable construction/evidence handoff; actual new-source runtime and phone acceptance remain separate.

## Exact composition and received reviews

- DU formally approved exact LI #116 `ab17cae25ef045ef7bfb93a5c5e4f2f419d5f30e`, #118 `50f9ce03946baa4f80ac349e0c6669538fe84b75`, #119 `dcb94d925b8010e02d41f033e84ed3902ab08559` and #123 `760b1f7810c26f0d2a934a898d7c954b43fffd6b`. These old source reviews are received, not current waiting items. Their bounded source/evidence reviews do not independently rerun LI's old device/model suites.
- JIN #124 exact `5e08e5bb8e331c90159d682977608e2120056351` is delivered. The former missing-service-source wait is removed. Its new Backend review belongs to SHI. No previous #110/#113/#117/#121 component approval is repeated.
- Actual two-parent merge `e66f787` combines DU-approved LI #123 with that #124 without conflicts. Product **`0dcc05ce268767f88cf6c43ae4a4f276b94833a3`**, tree **`1b29bc11d6297a568bd4aa16c8421fef5c1101af`**, adds three LI client/test paths plus the [composition disposition](../../decisions/2026-10-15-li-controlled-event-client-composition.md). Backend/API/operator/dependency inputs remain byte-identical to #124; ordinary app and native platform code are unchanged. Later evidence commits do not alter these runtime inputs.

## Independent JIN evidence disposition

LI posted the exact-head [evidence COMMENT5532530949](https://github.com/3427564237/enmori-app/pull/124#pullrequestreview-5532530949). Independent source checks bind both actual #117/#113 merge parents, eight new-delta Git blobs with explicit LF/CRLF owner-receipt handling, seven corrected producer bindings to #110 `0b730c52`, and unchanged #113 OpenAPI bytes (**35 operations/45 schemas**). There is no new source finding in that bounded check.

Actual LI execution on the combined, source-identical Backend: locked Node24.19.0 / TypeScript7.0.2 strict build, full Backend **912/912**, operator **15/15**, all exit0 with zero fail/cancel/skip/todo. Reviewed default-disabled construction, private-key isolation, consume-before-control, fail-closed command failures, stop precedence, pending-result invalidation and tracked-original drain/hold. Provider/model/compiler behavior in these tests uses explicit doubles. Unit/injection checks do not start another service or Emulator.

JIN's actual guarded Auth/Firestore/HTTP/Dart **164/164** and profile/port teardown remain JIN-attributed and are not called a fresh LI rerun. JIN's first163/164/exit1 is retained: the new test incorrectly expected409 for an already-bound corrupt Account, correctly returned as503. Its corrected source preserves503 and separately tests a genuinely unbound409, with no provider invocation. LI does not relax the product rule or infer success from an unavailable response.

The current preview owns the fixed Emulator ports. LI did not run a competing suite, stop/reset that preview or fabricate new-service cleanup. This evidence COMMENT is LI's assigned independent disposition; it does not replace SHI's new Backend review or activate the provider.

## LI client contribution and actual checks

The dedicated next entrypoint opts into client Activity navigation. Older constructor defaults and existing callers preserve the original AI/Persona/Settings-only scope. Reuse one observed Auth source, same caller-owned HTTPS client and existing strict BackendActivityRepository. The original nine-field one-use handoff is unchanged; the provider key and private source enable command never enter the app. A visible Browse activities action uses the AI page's existing `navigationBarBuilder` and its established departure handler, preserving draft/pending-operation protection. The feature page and native opener are unchanged.

Only observed authenticated sessions can enter. List selection requires the same whole-session observation, current route and valid locator. Covered-list callbacks cannot stack another Detail or issue an extra read. Replacement observations clear content and invalidate old callbacks; after explicit Reload, the fresh callback can open the new result. Background/return retains explicit Reload and removes old content. Service-disabled503 remains a visible failure, not empty data. Constructing the client performs zero Event reads.

Actual final LI **657/657 Flutter Pass** with default concurrency, global fatal-info analysis clean, formatting/delta whitespace Pass. Two new launcher composition cases are included in657, not additive. They use explicit local Auth/HTTP/connection doubles and cover supplied Authorization/HTTPS, disabled/available source responses, list→Detail/Back, covered callback suppression, same-subject replacement plus explicit Reload, and background clearing. No actual provider/native browser/Emulator/model/device result is inferred.

Retained LI failures: the first local owner-hash check mistakenly compared CRLF receipt hashes directly to LF Git bytes, then passed after explicit declared text binding and Git object verification. An additional same-subject Reload probe exposed a real new-client bug: the callback captured only the entry-time Auth observation. That focused run was **4 passed/1 failed**. A Consumer now supplies a fresh callback when the whole observation changes while the controller still requires explicit Reload; retained old callbacks stay invalid. The exact probe then passed5/5 and final complete657 passed. A first pre-correction v5 build is superseded and was never delivered/installed. Final v5 is rebuilt from `0dcc05c`. The first full657 success before this added assertion is kept as earlier, weaker evidence, not the defect's resolution.

## Built Android artifact

`build/distributions/li-event-candidate-20261015/enmori-controlled-event-v5-arm64.apk`: **103,095,492 bytes**, SHA256 **7f2530c9d64a7a0bd39181369d189b6f0062a302da1fa1621242377c7ab17c90**. Dedicated package `com.enmori.app.personatest`, version5, entrypoint `lib/controlled_phone_harness.dart`; pinned Flutter3.47.2 actual SDK package/launcher parser Pass. Build retains the existing Firebase/Kotlin compatibility warning without an unsolicited dependency upgrade.

This is a built/parser-verified connected-source candidate, **not installed or runtime-proven**. It cannot obtain real Event data from the existing #117-only preview. Current installed v3 and the original owned private service are untouched; latest read-only status remains running/accepting, modelAttempts0/modelPending0/compilerPending0/activeCalls0/nonTerminal0, no quarantine/hold. HTTP status does not prove model residency. No ADB install/uninstall/handoff, provider key access/enable command or model action occurred in this packet.

[Machine receipt](2026-10-15-li-event-service-candidate.json) binds483 selected tracked source/test/platform/tool/API/dependency inputs, exact product/tree, final APK and local log hashes. This is this packet's selected set, not ZHOU's different483-input manifest or JIN's1144-input Windows inventory.

## Next gates and executable work

At this packet's source refresh, SHI has not yet submitted #124's required new Backend disposition. DU reviews only this new LI client/test composition, not already-approved #116/#118/#119/#123. These are the remaining source gates, rather than a claim that JIN has not delivered.

After applicable source/client/use gates, LI can perform a controlled transition from the settled original using its existing explicit stop and all three cleanup receipts, then start the exact new source with the existing private handoff. Do not bypass an unsettled original, reset its data as a repair, launch competing fixed-port Emulators or label the old service as the new one. Actual guarded SDK/new-source Linux private command/HTTPS/provider/phone/browser and the [source-disable/client-clear/owned-copy removal exercise](../../planning/2026-10-15-li-event-disclosure-and-removal-packet.md) are **Not Run by LI here**. Existing use/link conditions and the already-received #121 manual cold-idle procedure remain; no new key/permission submission, model-residency policy or keep-alive change is requested.

Keep Draft/Open. No main merge, Issue/Project transition, provider activation, global erasure/SLA, whole-baseline/42-route/38-state/Sprint/UAT/Release/Done claim follows. Existing21:00/23:59 targets remain targets, not unverified completion or peer commitments.
