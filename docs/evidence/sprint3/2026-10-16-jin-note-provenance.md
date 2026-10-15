# JIN nonempty Note transaction/provenance increment

Actual checkpoint: **2026-10-16T00:35:34+08:00**. Owner execution: JIN. This is a new16October follow-up, not a retrospective15October23:59 completion. #127 remains unchanged at `a33132d9a8e0119688d1415e5700de5847d38f0a` with SHI review5536247422; that approval covers its limited refusal source, not this new implementation.

## Authority and source

- Existing [Remaining-A selection](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md), selected [N02/F03/C-A sections3–6](../../planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md), [JIN storage/cleanup assignment](../../decisions/2026-10-14-li-ai-acceleration-and-target.md), and [single-owner demo handoff](https://github.com/3427564237/enmori-app/blob/fd63434b1729adbd045950f24735bf75ad7bf47b/docs/decisions/2026-10-15-li-jin-single-owner-demo-integration.md). No repeated PM choice or new physical field is selected.
- Tested product **`f2404282f785dd0df08858679861828d63e2b6d8`**, tree **`bb56595f6676f027af89a11bbb31331a1473406e`**, parent #127 **`a33132d9a8e0119688d1415e5700de5847d38f0a`**. Ten product/test files change; final publication adds this report and [machine receipt](2026-10-16-jin-note-provenance.json) only. No inherited source review is repeated.
- All1,257 product inputs and corresponding APK-build copies are bound:76 exact/1,181 CRLF-equivalent source files. Receipt records individual ten-file blobs/hashes and complete local inventory fingerprint. Binary files match exactly. API35/schema45, route inventory, Firebase/index declarations and dependency locks are unchanged.

## Corrected behavior

The old store refused every nonempty dependency, persisted only `sources:[]`, and could not read a sourced canonical pair. The existing source sweep also held equal-generation sourced records rather than proving current source validity. This increment supplies all three boundaries together, only when the same isolated composition provides complete source-bound Note prerequisites for the exact database/gateway.

1. Each content transaction validates a maximum of five unique required Check-in IDs, current canonical owner/Note/time, actual SDK updateTime without rollback, and current owner/purpose/Persona/fence/epoch. Source reads occur in that same transaction before any write. The original request is checked synchronously before and after every awaited source read; a terminal original cannot proceed to a second source. Higher updateTime alone is not revocation because visibility may change. The explicitly verified producer remains responsible for immutable owner/Note/time and no restore/ID reuse.
2. The assistant and canonical provenance commit atomically with its user pair/effect/sequence: empty is exactly `{sources:[]}`; nonempty is exactly the selected sourceType/sourceId pairs plus purposeRevocationGeneration. Observed versions, source text, timestamps, Persona IDs and extra content are not retained in provenance. Existing unknown-outcome, same-U, SDK-attempt, terminal, expiry and retention rules remain.
3. Ordinary read/readback verifies sourced provenance under current Account generation and all needed sources. Confirmed revocation, including revoke→regrant, or one confirmed permanent required-source loss suppresses the entire assistant text immediately; the slot/sequence/role remain. Unknown/corrupt/missing metadata or rollback fails closed without treating an error as permission for permanent erasure. Unsourced history remains independently readable under the selected owner rules.
4. The existing full source sweeps use the same canonical validation and, on confirmed invalidation, atomically remove assistant text and **all** source pairs/stamp. createTime, appendBefore, pair/sequence and other presentation metadata are preserved. No partial-valid-source reply, reverse registry, restore, clock reset, new cleanup service or new index is introduced. Read suppression and physical sweep cleanup have separate evidence.

Omitted/mismatched producer prerequisites still refuse nonempty sources. The ongoing demo supplies only #127's exclusive empty fixture, existing create-only canonical writer, no runtime edit/delete/import/restore, and quiescent final owned deletion. This is not ordinary/real-account producer authority. The public UI banner now describes eligible test-account Notes instead of claiming they are always unavailable. The underlying Home/router/transport/session contracts are unchanged.

## Actual verification on this product

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Strict Backend compilation | Pass, exit0 | Node24.19.0/TypeScript7.0.2 |
| Full Backend | **918/918**, exit0 | Includes6 new source-contract tests; zero failed/cancelled/skipped/todo |
| Actual guarded Auth/Firestore/HTTP/Dart | **168/168**, outerexit0 | Actual SDK/database/network; synthetic identity/data and explicit model/compiler doubles |
| Operator | **16/16**, exit0 | Existing private control/hold seams, no real model/provider/device |
| Focused client | **2/2**, exit0 | Actual routed widgets using HTTP/Auth/platform doubles |
| Scoped analysis/format | Pass | Fatal-info two-file analysis; changed Dart file format0changes |
| APK build/signature | Pass | Buildexit0/v2signature; no installation or device run |
| Full Flutter/symlink-negative | **Not Run at this product** | #127's658Pass/1Fail OS1314 remains open, not a green or skipped gate |

The new real service case now creates a Check-in, observes idempotent read/history, sends a Note-bearing AI request, sees one captured Note at the model double, saves the assistant, independently verifies exact canonical provenance and rereads the pair. A visibility-only source update preserves it. Actual Settings reject→accept increments generation and immediately suppresses its text. The source-sweep cases independently prove keeping valid records, whole tombstone/all-pair deletion after permanent used-source loss, idempotence, original createTime retention and no erasure for corrupt authority. A direct real store case proves that absent prerequisites still reject; deleting a required source after U commit prevents borrowing/saving A, while earlier sourced history returns an unavailable projection. None of this is a new real-Qwen semantic/device result.

All168-suite fixture cleanup assertions passed. Worker/outer profiles were removed and ports8080/9099/4400/4500/9150 were free after outerexit0. Current LI service, model and phone were untouched. Same-original hold/manual cold-idle rules remain; an unresolved model/source/SDK operation is not force-cleaned. Tests with simulated current-authority changes are explicit owned fixtures, not permission to mutate a running demo or ordinary data.

Reproduction uses existing pinned dependencies and verified cached Emulator1.22.0 with the current controlled launcher:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test "backend/dist/test/**/*.test.js"
node tool/run_ai_store_emulators.mjs
node --test tool/controlled_phone_service.test.mjs
flutter test test/app/controlled_demo_app_test.dart --reporter expanded
dart analyze --fatal-infos lib/app/controlled_demo_app.dart test/app/controlled_demo_app_test.dart
dart format --output=none --set-exit-if-changed lib/app/controlled_demo_app.dart
```

Existing Java21, Dart3.13.2 and verified FIREBASE_EMULATORS_PATH are supplied to the guarded runner; no cloud fallback. Windows used the locked Dart/Flutter snapshot directly and existing offline packages. Final compiled helper was written before the final SDK launcher started; it was not replaced during that run. Raw logs remain local and their receipt fingerprints are JIN identifiers, not SHI/LI independently downloaded artifacts. Repeated runs are not additional distinct cases.

## APK and LI fixed-source execution handoff

- Local artifact **`enmori-controlled-note-demo-f240428-arm64.apk`**, **94,261,175bytes**, SHA256 **`87eb10617fcb69f34a7336fe8426100859e83cbe409627888112946a0d92ebff`**. Dedicated `com.enmori.app.personatest`, version1.0.0/code1, minSDK24/target36; v2 verified. Build targetandroid-arm64, with inherited native-plugin ABI entries retained. Not installed, not uploaded to Git.
- Build: existing `ENMORI_PERSONA_ANDROID_TEST=true`, pinned Java/Android SDK, then `flutter build apk --debug --target-platform android-arm64 --target lib/controlled_demo.dart --no-pub`. The exact source/config/stop/handoff entry remains [#127's fixed operator procedure](2026-10-15-jin-controlled-demo-integration.md#apk-and-fixed-source-hostphone-handoff), with this product/APK identity replacing only that candidate identity. No new credential/model/endpoint setup is requested.
- Use the existing private `demoFeatures:true` configuration and fresh owned empty session. First safely settle/stop the original preview and confirm cleanup/ports; preserve a hold. Verify dedicated package/signature and actual installed hash before its guarded private handoff. Do not uninstall ordinary ENMORI, blindly resend an unknown CONSUMED command or overwrite a held service. A Linux rebuild has its own actual APK fingerprint.
- After SHI's new-source review and LI's evidence disposition, LI can execute **Check-in→history→AI using that Note→saved pair/readback→revocation/cleanup** on the designated host/phone. New actual Qwen/native Auth/HTTPS/mobile persistence, original-operation cancellation, Event/provider/browser/disable-client-clear and owned-copy exercises remain **Not Run** here; no prior positive packet is transferred. Source-bound producer facts beyond this exclusive fixture remain separately required.

## Preserved history and remaining work

The first local implementation passed917 unit and168 SDK cases before the final per-await original guard and whole-source invalidation clarification. Those observations and helper/store hashes are retained separately; final918/168 are actual new executions. Initial local editor invocation used the wrong working directory, so a partial helper compile reported missing updateTime; the corrected complete edit compiled. The first APK offline restore was started before the copied project was complete and failed project-root detection; after copy completion the unchanged inputs restored/built. No product/data failure was converted into success by these tooling corrections. Flutter emitted inherited Kotlin-plugin migration warnings; dependencies were not changed.

#127's nonempty refusal remains truthful at its own source; the positive correction applies only to this new candidate and its tested synthetic composition. Its open Windows symlink-negative case, old#99 reliability and #126 actual consume failures are not closed by these results. No completed old component/contract review is repeated. SHI must review this new JIN code; LI separately reviews evidence and actual fixed-source acceptance. Full baseline/42-route38-state, ordinary/cloud/real-account deployment, real-provider enablement, API24/25/human accessibility/UAT/Release remain outside or unproved. No merge, Issue closure, Project promotion or rewritten deadline/Done claim.
