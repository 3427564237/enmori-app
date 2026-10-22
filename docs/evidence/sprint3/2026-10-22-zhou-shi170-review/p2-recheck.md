# ZHOU exact-head P2 re-review and remaining-source receipts

22 October 2026, Asia/Shanghai. This supplements the [original b39ec5e review](review.md), without deleting its failed counterexamples or request-changes history.

## SHI #170: repaired and approved

- Exact reviewed head: `ba533475ead63e0e7a3e5f39c1ad12df4c5a8fc2`; product `8f821f9b67087610ee2e7976c5c898d778deef65`, tree `b1cefde5f96fab013facbc23c06f9dc83b49fb7e`.
- Since `b39ec5e`: one producer source file, one new focused test file and one evidence document. No cache, DTO, schema, dependency, storage, client, host or device change.
- [ZHOU APPROVE5613539307](https://github.com/3427564237/enmori-app/pull/170#pullrequestreview-5613539307); [original P2 confirmation4347839530](https://github.com/3427564237/enmori-app/pull/170#discussion_r4347839530). Original reviewer-owned thread `PRRT_kwDOUMZtlc6vFsYv` is resolved by ZHOU.

The final awaited participation read now precedes the synchronous specific-ID peek and readiness check. Missing current source throws unavailable for a still-authorized matching row. Actual privacy denial, missing/deleted/cancelled/reselected participation remains omission; no await separates the final source checks and return. The same-page replacement case tests missing specific content while readiness remains true, so this is more than moving the readiness check.

Independently executed on the exact `ba53347` checkout:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/social-event-display-race.test.js backend/dist/test/social-event-source.test.js backend/dist/test/friend-activity.test.js backend/dist/test/friend-activity-display.test.js
node --test --test-reporter=tap build/zhou_pr170_producer_race_probe.mjs
```

Strict compile passed. Four affected Backend files **36/36 Pass**, zero skip/cancel. The original reviewer producer probe, with unchanged bytes and assertions (SHA256 `339884ab9129bc3da63aa286c7e6f4b4d20b86fbf550c3d2bdfc25daae00a53c`), now **5/5 Pass**, versus the original2Pass/3Fail. Both controls and the three source-loss counterexamples pass. These invocations are reported separately rather than added to author counts. No product edits followed these runs. Original83 window/cache/other cases and unchanged Flutter/storage/Emulator/provider/model/device evidence were reused at their original sources, not rerun or relabelled current.

Raw reviewer logs are local, with SHA receipts in [the recheck manifest](p2-recheck.json). Empty compile stdout produced no log file. The author's earlier failures and fixture corrections remain in his exact-head evidence; they are not overwritten by this review.

## Canonical-ID compatibility: fixed and integrated separately

JIN [#173](https://github.com/3427564237/enmori-app/pull/173) head `6050aa68887f5c7794b65d8f178d49f009892546`, product `bbf3ce3e69dc762d1739db510497af33dfff5d9f`, repairs the existing Backend adapter, Transport/OpenAPI and Dart consumer. The original mapper and EP1 validation remain unchanged. The exact approved `tm_event_<64 lowercase hex>` form and existing non-tm stable IDs are accepted; opaque locators, malformed length, uppercase and trailing characters remain rejected. No substitute mapping/title/time was introduced.

[DU APPROVE5613395493](https://github.com/3427564237/enmori-app/pull/173#pullrequestreview-5613395493) covers that exact head. LI's formal #173 disposition was not present in the checked review list; do not extend this progress check into ZHOU approval of the whole JIN package.

LI [#165](https://github.com/3427564237/enmori-app/pull/165) checked head `1a2b1e235bca52cd0a794a2a0cbd729bc58b2cfd`, now evidence-only update `724fe7a68add709681bbbd1763cdc4b8c20a2686`, product/test `9b9c4e9a58a009b7c0ed411732bae5650927e681`, contains both the SHI await repair and JIN canonical-ID correction. The intervening change is only one integration evidence document; product blobs are unchanged. The producer blob equals SHI's repaired source; the canonical Transport blob equals JIN's source. LI's [combined-tree receipt](https://github.com/3427564237/enmori-app/blob/724fe7a68add709681bbbd1763cdc4b8c20a2686/docs/evidence/sprint3/2026-10-22-li-team-integration.md) records strict compile/analyze and Backend37/37 / Flutter24/24, including the normal later-page canonical-ID actual-Fastify path. These are LI-executed synthetic results, not ZHOU reruns or real provider/device acceptance. Its checkpoint's older pending-review statements are superseded only by the actual subsequent ZHOU/DU approvals.

## Historical LI Bootstrap request: current-source review completed

The [original PM request](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6306898040) named LI5529f7b and later real-account composition. The two original files are `backend/src/bootstrap/build-app.ts` and `backend/src/bootstrap/retained-core-runtime.ts`. After the new priority work, ZHOU completed the remaining bounded source check on actual current LI head `724fe7a`, checking the evidence-only delta since `1a2b1e2`; it was not treated as an Admin prerequisite or as automatic approval of every LI change. [Formal scoped COMMENT5613582549](https://github.com/3427564237/enmori-app/pull/165#pullrequestreview-5613582549) records no blocker without blanket PR approval or self-approval of ZHOU-authored Admin lines.

The current code has one Browse registration (`eventParticipation` versus standalone `eventBrowse` if/else); one controlled source gate supplies browse/recommendation/detail/participation and synchronous social peek/readiness. Fresh ignored filtering and recommendation consent checks remain. Real-account entry is explicitly selected, rejects supplied and ambient Emulator bindings, and retains the isolated environment guard. Disable clears the projection and fences/drains pending work; normal close disposes SDK resources without deleting Auth/Firestore business facts. Owner-support initialization is create-only under the existing remote decision, not a reset of existing records.

The two Bootstrap files and the direct gate/registration/environment seams listed in the manifest equal LI's tested `9b9c4e9` blobs. No new scoped source blocker was found. Existing LI37/24 and earlier checkpoints are reused only with attribution and source equality. This is a **source-only compatibility conclusion**, without independent new execution of the composed runtime, host/configuration access, restart/recovery operation, real source/account, APK/signing, phone, full UI or whole-product approval.

## Other ZHOU assignments checked

Admin [#171](https://github.com/3427564237/enmori-app/pull/171) head `2252a44b9a30b821075859eefd7990f34a28b031` has [JIN permission approval5612007775](https://github.com/3427564237/enmori-app/pull/171#pullrequestreview-5612007775) and [LI function/source integration approval5612750586](https://github.com/3427564237/enmori-app/pull/171#pullrequestreview-5612750586); no new corrective feedback for ZHOU. Its GitHub description was reconciled without changing its code/head.

The current assigned open Issues63/68/78 have accepted historical component/P08/report scopes; Issue83 has no new concrete defect assignment. Original #164 requested-change history was explicitly corrected in LI's composition and must not be duplicated. Only #170 was an active formal review request in the initial search. No further newly assigned, independently actionable ZHOU implementation was found after this review and the bounded historical Bootstrap check. Real Admin grants/intended creation, host/device and final release acceptance remain LI-owned; #173's full review path remains DU/LI. No main merge, task/board closure, deployment or whole-project Done claim.
