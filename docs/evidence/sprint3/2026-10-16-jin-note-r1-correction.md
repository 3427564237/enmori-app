# JIN #128 R1: original guards through sourced pair reads

Actual owner checkpoint: **2026-10-16T01:15:33+08:00**. This is a focused correction to [SHI review5536837666](https://github.com/3427564237/enmori-app/pull/128#pullrequestreview-5536837666) / [R1 comment4285852304](https://github.com/3427564237/enmori-app/pull/128#discussion_r4285852304), not a new PM choice. The [original Note packet](2026-10-16-jin-note-provenance.md) and its failed reviewed source remain preserved.

## Exact source and repair

- Reviewed failing parent: `5229fefe5ee3bce5fa0962514de943b76a57abc0`. Tested correction product: **`27705999ebf3840f8d9b768a7714382d60632617`**, tree **`50cb02c2b619964cad352b991bf52edcb95aa6cc`**. Only two Backend implementation files and one new public-store regression file change. Final publication adds this report and [machine receipt](2026-10-16-jin-note-r1-correction.json) only.
- Existing Remaining-A/N02/F03/C-A authority and `OriginalWriteAuthority.current` govern this fix. The guard is now passed from `listOwnedMessages`, `readAcknowledgedPair`, `settleAcknowledgedAssistant` and `readOwnedOutcome` into `pair`, `inspectProvenance` and `inspectNoteSources`. Account/provenance/Note reads check the same original guard before dispatch and after settlement. Preceding binding, runtime/fence, metadata inventory, page and effect reads on those public paths also preserve it, so cancellation cannot begin the next private read before eventually returning `terminated`.
- Independent service-owned cleanup/retirement keeps its own existing authority; the maintenance source is unchanged and no expired original is used to authorize cleanup. Current-source validation, pair/provenance, revocation/loss suppression, physical sweep, same-U and unknown-effect/expiry behavior remain intact. No model reset, replacement lane, forced cleanup, public interface/schema/index/dependency or environment change.

## Reproduction and actual verification

The exact new test was first compiled against the original reviewed production source. Four live controls passed and twelve cancellation groups failed (**4 Pass/12 Fail, exit1**), independently reproducing R1. Those logs are retained. The corrected source passed the same **16/16, exit0**. The explicit pair-Account and pair-first-Note cases cover both reviewer-named public methods plus acknowledged settlement and ordinary operation readback. A per-method sweep also cancels at every observed preceding read settlement. Assertions separately require `terminated`, zero later read dispatch, zero writes and no response content; returning a final rejection alone cannot pass. Live controls retain the saved pair and the intended acknowledged-settlement write.

| Actual check | Result | Scope |
| --- | --- | --- |
| Locked strict Backend compile | Pass, exit0 | Node24.19.0 / TypeScript7.0.2 |
| Focused public-store regressions | **16/16**, exit0 | Handwritten gateway dispatch/settlement seams; included in934 |
| Full Backend | **934/934**, exit0 | Failed/cancelled/skipped/todo0 |
| Guarded Auth/Firestore/HTTP/Dart | **168/168**, outerexit0 | Actual SDK/database/network; synthetic identity/data and explicit model/compiler/provider doubles |
| Source/protected-contract/whitespace | Pass | All1260 versioned source files bound; API35/45 unchanged |
| Full Flutter / APK / model / phone | **Not Run for this correction** | No client/Android/tool changes; previous evidence remains source-attributed |

The actual SDK suite retains nonempty-Note save/provenance, history suppression, source-loss physical sweep and cleanup assertions. Worker and outer private profiles were removed; all five required ports8080/9099/4400/4500/9150 were verified free after outerexit0. No active LI preview/model/provider/device was operated. The source was frozen before the complete regression runs and was not replaced during SDK execution. Test counts overlap rather than add.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test backend/dist/test/ai-conversation/sourced-pair-cancellation.test.js
node --test "backend/dist/test/**/*.test.js"
node tool/run_ai_store_emulators.mjs
git diff --check 5229fefe5ee3bce5fa0962514de943b76a57abc0 27705999ebf3840f8d9b768a7714382d60632617
```

Use the existing pinned Admin14.3.0/Firestore8.7.1/CLI15.29.0/Emulator1.22.0, Java21 and Dart3.13.2 with the existing guarded launcher and verified cache. Restore the locked Flutter package configuration in this checkout with `flutter pub get --offline` before the Dart probe; do not let an isolated archive inherit an ancestor checkout's package resolution. No new service/configuration or cloud fallback. Raw logs remain local; the receipt fingerprints identify JIN evidence and are not claimed as independent reviewer downloads.

The first actual SDK invocation is retained as **167 Pass/1 Fail, outerexit1**, with both profiles removed and all five ports free. The failing Dart HTTP probe reported invalid non-content JSON. This archive lacked `.dart_tool/package_config.json`; a separate zero-token/no-argument invocation reproduced compilation against the ancestor checkout and missing current AI imports. Existing locked offline Flutter package restoration succeeded without versioned source/lock changes. The same zero-token probe then compiled and reached its expected missing-argument exit2, before any HTTP/token use. The unchanged complete SDK invocation was rerun and yielded the final168/168 above. This was a test-environment repair, not weakening the JSON assertion or skipping that client path. The preliminary read-only process inventory was also denied by the sandbox; the subsequent authorized read succeeded, without source/launcher changes.

## Corrected fixed-source handoff and retained limits

SHI should re-review only this R1 correction on the new published head; reviewer-owned thread resolution and LI bounded acceptance remain pending. The previous #128918/168 and SHI's own918/168 bind the old source. [LI #127659 and focused symlink1](https://github.com/3427564237/enmori-app/pull/127#pullrequestreview-5536495947) have cleared that earlier capable-environment gap; they are not moved onto this Backend correction. Old Windows658/1, #99 reliability and both #126 CONSUMED failures remain historical or unresolved as recorded.

Flutter/Android/operator/configuration inputs are byte-identical to the parent. The previously built dedicated APK remains SHA256`87eb10617fcb69f34a7336fe8426100859e83cbe409627888112946a0d92ebff`, built from`f2404282f785dd0df08858679861828d63e2b6d8`; it has not been rebuilt, installed or relabelled as a new actual-device result. LI's fixed-source execution should use the corrected Backend product above with that unchanged client and the existing private handoff/original-hold/manual cold-idle procedure, after applicable new-source review. Credentials/configuration remain private.

Actual Qwen+Note/native phone/private handoff/provider/browser/disable-client-clear/owned-copy acceptance is still separate and Not Run here. No repeated component approval, new PM selection, merge, Issue closure, Project/runtime promotion, deadline rewrite or whole-baseline/Sprint/UAT/Release/Done claim.
