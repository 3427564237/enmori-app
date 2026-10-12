# Issue #83 / Draft #88 — JIN review corrections

Owner: ZHOU `@YaoyinZhou3922`. Date: 12 October 2026, SGT (UTC+08:00). Final owner checks completed at approximately **19:14 SGT**. This is correction and owner verification evidence; JIN re-review and LI bounded acceptance remain pending.

## Review and exact source

[JIN's Changes Requested review](https://github.com/3427564237/enmori-app/pull/88#pullrequestreview-5489746491) reviewed published head `a58bdb5ddce44029e1b83dffc53c7f659c235d99`. It identified [R1: Retry after an observed reply/tombstone](https://github.com/3427564237/enmori-app/pull/88#discussion_r4247218953) and [R2: accepting a different saved user identity](https://github.com/3427564237/enmori-app/pull/88#discussion_r4247218962). These are two protocol defects, not seven separate defects inferred from overlapping failed probes.

Corrected implementation commit: **`2b4290b470a026e20b73e09dce10cae46af2f147`**, tree **`876549d84effa0e04fea9539b6a2425527b57b42`**, parent `a58bdb5ddce44029e1b83dffc53c7f659c235d99`, on the existing `codex/issue-83-ai-client` branch. This correction changes only the controller and adds one regression test file. A subsequent evidence-only commit contains this record, the [manifest](2026-10-12-issue-88-correction-source-manifest.json) and transcripts. The PR and handoff comment bind the final published head; this document does not claim its own containing commit in advance.

The [original #83 handoff](2026-10-12-issue-83-ai-client-handoff.md), original 418-test checkpoint and source manifest remain unchanged as historical evidence. The selected N01/N05/N06 authority, builder handoff and held real-adapter work remain the same. This correction adds no requirement, public DTO, endpoint, schema, dependency, runtime enablement or recovery receipt.

## Corrected behavior

- **R1:** Merging newly observed potentially relevant assistant content or a tombstone synchronously clears the saved user's Retry eligibility and retains unknown protection. An older `user_saved` read started before that evidence cannot reopen Retry. Paging/overlapping user rows cannot restore it. An explicit accepted execute/readback pair continues to prohibit Retry even if a later read contradicts it or the assistant becomes unavailable. Complete row/sequence integrity failure also invalidates older reads before clearing the display, so clearing content cannot erase this fence.
- Public history rows do not carry the server's `replyToUserMessageId`; sequence adjacency is not treated as ownership. Explicit execute/`assistant_saved` pairs establish known ownership. History-only ambiguity requires a **new applicable authoritative outcome read**; the selected server contract still requires that read and every Retry dispatch to check all pending effects and the canonical accepted-assistant pointer. Older unrelated history and a known assistant belonging to another saved user do not consume the current Retry target. Independent new Send remains independent.
- **R2:** Each Retry retains the original saved user's ID, sequence and persistence timestamp as attempt metadata. Execute success must match those values before finishing the attempt, releasing protection or merging either returned row. Different ID, sequence or timestamp leaves unknown and preserves the original user row. Known accepted pairs cannot reassign an assistant to another user or accept a second different assistant for the same user. A readback with a contradictory known user ID is rejected before message merging.
- Valid same-user Retry still displays one original user row and one assistant, ordered by sequence, preserving the original timestamp. Blocked Retry tests verify that **neither prepare nor execute** is dispatched. Route/session/cancellation fencing and the existing wait windows are unchanged.

## Actual verification

Existing pinned Flutter 3.47.2 / Dart 3.13.2 were used. All final source/input working-file bytes were snapshotted before the full run and remained unchanged through the build and source commit. The manifest records 25 source/input Git blobs and local SHA-256 values. Published transcripts use UTF-8 without BOM, LF, no trailing horizontal whitespace and one final newline; raw and published hashes are recorded separately.

| Check | Observed result |
| --- | --- |
| Initial 14-test development checkpoint against the old production controller | **3 Pass / 11 Fail**; [failure transcript](transcripts/issue88-correction/review-regressions-before.txt). This predates the final 25-test file and is not represented as its complete run. |
| Three additional clearing/pair-integrity probes before the final defensive patch | **0 Pass / 3 Fail**; [failure transcript](transcripts/issue88-correction/additional-boundaries-before.txt). This was an intermediate correction checkpoint, not the final source. |
| Final actual wire/controller regression file | **25/25 Pass**; [transcript](transcripts/issue88-correction/review-regressions-final.txt) |
| `fvm flutter test --no-pub --reporter expanded` | **443/443 Pass** = earlier 418 + 25 new regression tests; [full transcript](transcripts/issue88-correction/flutter-full.txt). The 25 and component runs are included, not additional totals. |
| `fvm flutter analyze --no-pub` | **Pass, no issues**; [transcript](transcripts/issue88-correction/flutter-analyze.txt) |
| Non-writing Dart format / working and staged whitespace checks | **18 Dart files, 0 changed; Pass**; [transcript](transcripts/issue88-correction/format-diff-check.txt) |
| Corrected Android synthetic harness APK build | **Pass**; [transcript](transcripts/issue88-correction/android-build-final.txt). Existing toolchain/plugin warnings are retained. |
| Actual Android device interaction, real Backend/store/context/model and shared #87 composition | **Not Run** in this correction packet |

Reproduce the selected regressions:

```powershell
fvm flutter test --no-pub --reporter expanded test/features/ai_conversation/ai_conversation_review_regression_test.dart
```

The controlled HTTP response fixtures traverse the **actual `AiWireRepository` and actual controller**, rather than replacing them with a fake Domain repository. They prove client mapping/state behavior under these inputs; they do not prove real storage, model termination, server consistency or device receipt.

Rebuilt executable:

```powershell
fvm flutter build apk --debug --no-pub --target lib/ai_conversation_harness.dart --android-project-arg=kotlin.incremental=false --android-project-arg=kotlin.compiler.execution.strategy=in-process
```

Local APK: `build/app/outputs/flutter-apk/app-debug.apk`; SHA-256 **`dc317645e1a467c8f6e4a8562ec1a6e7517ecf7824d706327a13c207a6f269c3`**. This uses the already documented process-only compiler workaround, with no toolchain/dependency/configuration change. It replaces the previous source's local executable; the old APK hash remains in the historical handoff. The synthetic label and ordinary-composition-disabled boundary remain visible. Use `fvm flutter run --no-pub --target lib/ai_conversation_harness.dart -d <available-device-id>` for later device execution; that execution has not been recorded here.

## Review and delivery gates

The correction is submitted on the same Draft #88 for **JIN re-review**, followed by **LI bounded acceptance** and the builder's changed-source composition validation. Owner checks and internal source inspection do not satisfy those gates. No review thread is unilaterally resolved and no acceptance is inferred from test counts.

The original accepted #79/#86 component and its exact source remain separate. F01/F03/N02, permanent-unknown recovery, complete invalidated-source cleanup, actual store/context/model, E01–E04 and whole M26/Android persistence gates remain held or unselected as recorded in the original handoff; this correction does not unlock them. The Back/Settings page builder and LI-owned #85/#87 shared entry handoff are unchanged. No merge, Issue closure, Project transition, ordinary enablement or Sprint/UAT/Release/Done claim is made. Actual publication, re-review and acceptance times belong in their subsequent GitHub records; the 20:30 / 22:00 / 23:59 SGT targets are not completion claims.
