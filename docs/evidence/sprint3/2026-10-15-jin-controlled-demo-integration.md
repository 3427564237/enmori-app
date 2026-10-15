# JIN controlled network demo integration — 15 October 2026

Checkpoint: 2026-10-15T23:37:22+08:00. Owner execution and report: JIN. This delivers a usable, explicitly limited candidate; it does not close the whole demo/baseline or the 23:59 target. SHI reviews this new code/composition; LI independently reviews evidence and performs the fixed-source host/phone acceptance. No owner-agent substitutes for either reviewer.

## Authority and exact source

- [Human-confirmed single-owner handoff](https://github.com/3427564237/enmori-app/blob/fd63434b1729adbd045950f24735bf75ad7bf47b/docs/decisions/2026-10-15-li-jin-single-owner-demo-integration.md), [#84 assignment](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6193357656).
- [PR #127](https://github.com/3427564237/enmori-app/pull/127), product `22a9cab51bfdc461b2bded928df8270bfc14e593`, tree `e7a67332815ab661e7badf08a074256215526452`. Eight product/test additions/modifications over DU-reviewed #126 `ed6ed9a31a6ed0921412377cfc4da824fd3870ef`. The final publication commit adds only this report and its [machine receipt](2026-10-15-jin-controlled-demo-integration.json).
- All 1,253 versioned source files bind to the product: 67 exact and 1,186 CRLF-equivalent working files; all corresponding ASCII APK-build inputs also bind. This is explicit text normalization, not a raw-byte identity claim. The local full inventory fingerprint and eight changed-file Git/working hashes are in the receipt. Binary payloads compare exactly.
- Normative API/inventory, dependency manifests/locks and Firebase configuration are byte-identical to #126: 35 operations / 45 schemas. Existing ordinary bootstrap and current LI preview remain untouched.

## Delivered connection and its limits

`lib/controlled_demo.dart` composes existing Home/router, Auth and HTTP Repositories on one caller-owned HTTPS connection. It provides Account/Profile/Settings, interests, My Friends/search, Check-in create/read, selected-date Footprint, Persona, AI and Activity entries. Same-session/token handling and disposal on connection replacement are tested. Registration is not exposed. There is no invented recommendation or participation adapter.

Only the explicit private `demoFeatures: true` option builds existing Check-in/interests/Friend/history services in the ongoing synthetic-owner service. Default behavior is unchanged. The sole owner starts in an exclusive empty Auth/Firestore fixture. Friend eligibility/list/inbox are initialized for that owner, with no invented peer/friendship. The only catalogue value is visibly labelled `Music fixture`. Activity construction retains its independent default-disabled private enable command and use/notice gates; this increment makes no provider call.

The new actual HTTP/SDK case proves: empty-Note AI with explicit model/compiler doubles; Check-in201 and identical replay200; independent saved read and UTC date history; genuine empty Friends/search; interest selection readback; forbidden saved edit/delete404; final own-data cleanup. Existing 165-case regressions retain their individual boundaries and are not an all-feature device journey.

**Demonstrated incomplete path:** `firestore-conversation-store.ts` explicitly refuses nonempty Note dependencies and only implements empty-source provenance. After saving a recent Check-in, actual AI execute returns503 before another model call or any new user/assistant content; history returns protected404 and the target/subcollections are independently absent. Original Note/data/updateTime remain unchanged. The initial attempted positive test failed and is retained. It was not fixed by stripping Notes, creating fake empty context, changing the store guard or calling the refusal a positive chain. Implementing complete nonempty-source transactional authority/provenance remains a JIN follow-up; corresponding complete producer facts remain local to that path.

The narrowly asserted source facts cover only this exclusive initially empty test fixture, the existing create-only canonical-UTC writer, no edit/delete/import/restore while running, and final owned deletion after quiescence. They are not ordinary/cloud producer guarantees or permission to wire an incomplete nonempty store. The on-screen banner states the saved-Check-in AI limitation, fixture catalogue/social context, host-gated Activity, unavailable recommendations/participation and ephemeral data lifetime.

## Actual verification

| Check | Actual result | Boundary |
| --- | --- | --- |
| Locked strict Backend compile | Pass, exit0 | Existing Node24.19.0 / TypeScript7.0.2 |
| Backend full regression | 912/912, exit0 | No failed/cancelled/skipped/todo |
| Operator | 16/16, exit0 | Reporting/hold/control seams; no real host/model/device |
| Actual guarded Auth/Firestore/HTTP/Dart | 165/165, outerexit0 | Real SDK/database/network; model/compiler/source fixtures explicitly doubled |
| New routed client | 2/2 | Auth/HTTP/platform doubles; included in full Flutter |
| Full Flutter | **658 Pass / 1 Fail, exit1** | Unchanged symlink negative case cannot create link: Windows OS1314, before consumer invocation |
| Fatal-info analysis | Pass | `lib test integration_test` on final APK source |
| Four changed Dart files format | Pass, zero changes | Non-writing check |
| Product new-delta whitespace | Pass | Base→product; no inherited blanket whitespace claim |
| Android debug APK | Build exit0; v2 verification Pass | Built only; installation/device/real model Not Run |

The failed Flutter case is `symlink handoffs are rejected and unlinked without consuming the target` in `test/harness/controlled_phone_service_configuration_test.dart`. It was neither skipped nor weakened. Linux/another appropriately capable environment must actually exercise it; prior-source results cannot certify this run. Two runs with the same658/1 result are not additional cases.

Actual SDK cleanup printed worker-profile removal, outer-profile removal and all required ports free (8080/9099/4400/4500/9150), with outerexit0. The new demo case independently observed zero Firestore collections after stop. Fresh owner partitions and existing Auth cleanup are retained. A pending original, retirement/checkpoint failure or uncertain cleanup remains held; no forced teardown/replacement is introduced. No existing LI Linux service/device was used or stopped.

Reproduction from the exact product, with existing locked dependencies and runtime paths:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test "backend/dist/test/**/*.test.js"
node --test tool/controlled_phone_service.test.mjs
node tool/run_ai_store_emulators.mjs
flutter test --reporter expanded
dart analyze --fatal-infos lib test integration_test
dart format --output=none --set-exit-if-changed lib/controlled_phone_harness.dart lib/controlled_demo.dart lib/app/controlled_demo_app.dart test/app/controlled_demo_app_test.dart
```

The Emulator runner uses the existing verified cached1.22.0 JAR, private empty profiles and identical validated loopback environment for actual Admin14.3.0/Firestore8.7.1/CLI15.29.0 children. Existing `FIREBASE_EMULATORS_PATH`, pinned Java and Dart are supplied locally. It never falls back to cloud. Local Flutter calls used the pinned Dart executable and Flutter snapshot directly. Raw logs remain private; SHA-256 identifiers in the receipt are owner-attributed, not reviewer downloads/recomputations.

## APK and fixed-source host/phone handoff

Artifact: `enmori-controlled-demo-22a9cab-arm64.apk`, **94,261,271 bytes**, SHA-256 **`97ea298c50b83ba53fefd9eeb3a409472b60e1f26d2c106f99732db35d18248b`**. Dedicated debug package `com.enmori.app.personatest`, activity `com.enmori.app.MainActivity`, version1.0.0/code1, minSDK24/target36; v2 signature verified. Build target is android-arm64; badging also lists armeabi-v7a/x86_64 bundled plugin libraries, so this is not a claim that every packaged native library is arm64-only. No APK or credentials were added to Git. The Windows artifact is supplied locally; a Linux rebuild has its own actual APK identity and must not inherit this hash.

Build from an ASCII checkout with the same locked SDK, existing Java/Android SDK, and `ENMORI_PERSONA_ANDROID_TEST=true`:

```text
flutter build apk --debug --target-platform android-arm64 --target lib/controlled_demo.dart --no-pub
```

1. Before replacing the preview, LI verifies its exact original has no pending model/source/SDK operation, requests the existing private stop and receives confirmed cleanup/operator exit/ports-free. A hold or unknown remains on that same original; do not kill it, force-clean, reinstall or allocate a replacement to manufacture progress. The present v3/service is untouched by this delivery.
2. On LI's existing controlled Linux host, compile the exact product. Retain existing pinned model/tokenizer/TLS/private binding fields; add only `"demoFeatures":true` to the private operator JSON. Use a fresh empty owner-only session directory (0700) and private file (0600). Never publish its values or put them in the APK. Optional existing Event key configuration does not enable Event. Start the existing entry:

   `node tool/controlled_phone_service.mjs --live-existing-host < /absolute/private/operator.json`

   The runner validates empty owned Auth/Firestore, pinned SDKs, ports and current model binding, then publishes private status/handoff. HTTP running does not imply permanently loaded model readiness. Use the accepted manual cold-idle procedure only after checking no pending original; no automatic warming, fallback/model download or reset was added.
3. Verify the dedicated APK identity/signature and local/installed `base.apk` hash. A signing conflict is a stop condition; no automatic uninstall/data reset, and no action on ordinary `com.enmori.app`. Install only when the prior owned preview has safely ended. Launch the dedicated package and use the existing guarded handoff:

   `python tool/li_controlled_phone_handoff.py --apk /absolute/candidate.apk --handoff /absolute/private/session/handoff.json --serial EXPLICIT_DESIGNATED_SERIAL`

   The file is the existing private session `handoff.json`; substitute its actual absolute path, never create a second handoff. Keep actual consume/READY/nonce status and owned reverse mappings. On failure retain category and cleanup uncertainty; do not blindly resend over an unknown consumed command. #126's two historical actual CONSUMED-command failures remain unresolved by this candidate.
4. New-source phone acceptance remains Not Run. Verify Account/Settings/interests/Persona on the single connection; if LI executes the already authorized real-model direction, test empty-Note AI first and attribute its exact source/model/session evidence separately. Then verify Check-in→Footprint same saved record, genuine empty Friends/search, and the disclosed post-Check-in AI503/no-new-content boundary. The latter is an incomplete positive feature, not a successful AI-with-Note scenario. Registration/recommendation/participation are outside the delivered connection.
5. Activity must remain disabled until its applicable provider/use/client/source gates and controlled enable instruction are satisfied. New actual list/Detail/native-browser return, disable/client-clear and owned-copy exercise remain Not Run here. Existing prior-source evidence is not transferred.
6. End the service through its private `stop` marker. Accept only same-original drain, stop admission/maintenance, fence/epoch retirement, owned Account/Persona/conversation/Auth deletion plus owner Check-in/idempotency and explicitly created fixture deletion, closed status and operator-exit/profile/port checks. The owned data lives only for this Emulator process; no restart/resume/export or long-term retention guarantee is introduced. Remove only run-owned phone reverse/private configuration when applicable and verify their absence. Never remove another operator's mapping or force a held model lane.

## Retained failures, review and feasibility

- Initial operator15/16 used an incorrect test assertion that scanned the intentionally private credential handoff as a public report. The corrected test verifies the credential is in the private handoff and absent from public observations; no credential is published here.
- First actual SDK164/165 exposed the existing nonempty-source503; focused13/14 then exposed the wrong empty-history200 expectation. Final165/165 retains protected404 and independent absence. No nonempty-source implementation fix or positive claim is implied.
- First APK build refused the non-ASCII checkout. The same bound inputs were copied to an owned ASCII build directory; no Android path guard or dependency changed. Earlier offline-cache permission and analyzer brace-style failures remain local; final restore/analysis/build succeeded.
- First source-receipt script named the wrong normative API path. Corrected `api/openapi.json` comparison and all1,253 source/build bindings pass. These are tooling failures, not hidden product passes.
- Old #99 Flutter failure and #126 consume failures retain their original unclosed attribution. No new test resolves them by implication.

The source was published in #127 before23:30SGT; this packet includes the actual APK and final bounded results. It meets the next reviewable-candidate handoff, not full ordinary-network baseline acceptance. SHI new-source review, LI final evidence/device disposition, the Windows symlink check, nonempty-Note AI transaction/provenance and actual new-source provider/phone/model/handoff exercises prevent a credible whole-baseline23:59 promise. The demonstrated missing nonempty-store path belongs to JIN; no generic wait for an already approved PM selection is asserted. API24/25, human accessibility and UAT/Release remain unproved. No deadline rewrite, main merge, Issue/Project transition, ordinary/cloud/provider enablement or whole42-route/38-state/Sprint/Done claim.
