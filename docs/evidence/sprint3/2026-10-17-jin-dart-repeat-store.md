# JIN actual Dart repeat-store combination — 17 October 2026

Execution task [#84](https://github.com/3427564237/enmori-app/issues/84), parent [#44](https://github.com/3427564237/enmori-app/issues/44). This test-only increment follows the [confirmed parallel kickoff](../../decisions/2026-10-16-li-low-blocking-kickoff.md). It adds a previously unexecuted client/storage combination while device and real-model prerequisites remain separate.

## Completed review reconciliation

Read back the current unchanged heads and formal receipts before starting this increment:

| Existing packet | SHI assigned review | LI independent evidence path |
| --- | --- | --- |
| #135 `dcdc3ba13f1a4bac192775b7a45f8e37bc4c680e` | [APPROVED 5557362538](https://github.com/3427564237/enmori-app/pull/135#pullrequestreview-5557362538) | [Completed, COMMENTED 5556605959](https://github.com/3427564237/enmori-app/pull/135#pullrequestreview-5556605959) |
| #136 `0219cee3034dae2c90ac1fc3f209b6506aaad45a` | [APPROVED 5557363644](https://github.com/3427564237/enmori-app/pull/136#pullrequestreview-5557363644) | [Completed, COMMENTED 5556615895](https://github.com/3427564237/enmori-app/pull/136#pullrequestreview-5556615895) |

No new blocking feedback was present. These later receipts supersede only the old Pending observations in the historical author packets. Both old PR heads remain frozen; no unchanged component is submitted for another review. LI's separate Linux Flutter **676/676** on #135's exact executable inputs resolves its capable-environment wait. The original Windows **675 Pass / 1 Fail (OS1314)** stays failed in history. LI's #136 SDK **169/169** and SHI's focused **15/15** remain their own executions, not new results on this tree. Neither completed review establishes device/runtime acceptance.

## Source and approved boundary

- Tested source-only commit: **`520132837d8e905e848c0cfb9b219b686d7ee124`**.
- Tree: **`3601c74593041145549ce77b3066430f9ce65fd4`**; parent: **`0219cee3034dae2c90ac1fc3f209b6506aaad45a`**.
- Exactly three source paths change, 462 added lines: one case in `backend/emulator-test/controlled-phone-service.integration.test.ts`, a test-only child host in `backend/emulator-test/support/dart-repeat-store-probe.ts`, and `test/support/ai_repeat_store_probe.dart`.
- Production, API, existing client implementation, runtime launchers, dependencies and build configuration are unchanged. This is no new runnable candidate or APK. #135's existing APK stays bound to `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e` and its original hash.
- [N01 conditional A](../../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md) supplies the existing prepare/execute/history/delete operations; [remaining isolated A](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md) supplies the selected N02/F03/C-A source, canonical-pair and cleanup boundaries. No API, schema, dependency, product behavior or model policy is added.

## What the new test establishes

#133's repeated-use tests use handwritten HTTP/Auth fixtures. #136 exercises actual storage using a Node HTTP client. The earlier actual Dart SDK probe covers one send through test-only ordinary readers. This case crosses the actual **Dart `AiWireRepository` / `HttpAiWireTransport` → controlled HTTP/Auth → existing production composition/readers → Firestore** for two fresh same-input sends.

The host creates one synthetic Note through the existing HTTP endpoint. The actual Dart child runs **prepare A → execute A → ordinary history A → prepare B → execute B → ordinary history B → DELETE** with `I read a book today.` both times. It checks one conversation, distinct B operation/key, exact first and second DTO pairs including timestamps, four distinct message IDs, sequence/role order and unchanged user text. Both generations see the same complete permitted input and the original Note; generation/compiler/token counts are explicit doubles and the existing finite semantic gate is retained.

After the second history check, the child emits only `{"checkpoint":"beforeDelete"}`. While the child waits, the host independently reads real SDK records: four canonical rows, settled user/assistant links, two assistant-keyed provenance documents referencing the one original Note, and unchanged Note data/createTime/updateTime. A fixed non-content acknowledgement permits the child's actual DELETE. The host then checks absence of the conversation/messages/sources/effects and operation fences, while the Note remains. Final owned service cleanup verifies no fixture Firestore collections or Auth users remain.

The child accepts a token only through stdin, requires the existing isolated test project/profile and numeric loopback URI, suppresses content/IDs/keys, and uses the existing 15-second ordinary / 75-second execute / 90-second attempt budgets. Failure uses the original ticket for cancellation and deletes only A's newly created conversation; unresolved cleanup stays explicit. Raw child stdout/stderr are not forwarded by the host. The 300-second watchdog bounds child lifetime only. SDK checkpoint queries are awaited to settlement; an unresolved read is not a completed cleanup claim, and no separate aggregate SDK deadline is asserted. Mid-flight child/SDK timeout and checkpoint-rejection fault injection were **Not Run** in this packet.

This establishes a real Dart wire/storage combination, not a Flutter Controller/Page/UI interaction, real 9B/tokenizer result, phone journey, or explanation for the historical second-round model rejection. No product repair was inferred from a passing test.

## Actual execution and failures

Existing pinned Node 24.19.0, TypeScript 7.0.2, Dart 3.13.2, Java 21 and checksum-verified emulator cache were used. No installation or global configuration change. The unchanged guarded launcher enforces the fixed synthetic project, loopback Auth/Firestore, exclusive port preflight and serialized gateway-bound tests.

| Check | Result bound to this source |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass, exit 0 |
| `node tool/run_ai_store_emulators.mjs --phone-service-only` | **16/16 Pass**, outer exit 0; zero failed/cancelled/skipped/todo |
| Scoped Dart format / analyze | Pass, exit 0; final format 1 file / 0 changed; exact helper SHA256 matches frozen source |
| Negative configuration smoke checks | **3/3 expected blocked** before token/network: non-test mode, non-loopback URI, absent stdin token |
| Source and whitespace | **1,292** tracked inputs stable before/after; Git blobs exact or explicitly CRLF-equivalent; diff check passes |

The 16-case run includes the 15 existing cases in the affected service suite; it is not added to old 169/169 counts. Full SDK, full Backend/Flutter, operator/Python and APK gates were **Not Run on this source** because the change adds a bounded test combination and no product behavior. Previous passes are not transferred to it. Worker/outer profiles were removed and all five fixed ports were verified free. Exact commands, source manifests, compiled-file binding, times and SHA256 values are in the [machine receipt](2026-10-17-jin-dart-repeat-store.json); raw local logs remain under `build/jin-dart-repeat-store-20261017`.

Two auxiliary-runner failures remain recorded: the first local negative-check script used an incorrect relative import and exited before Dart ran; its corrected copy then observed sandboxed Dart status **3221225480 / 0xC0000008**, not the expected exit 2. The identical corrected runner passed all three cases with normal authorized process permissions. The original scripts and failure receipt remain; no product change or test assertion relaxation was used. The actual 16-case SDK invocation had no failure. All previous source-bound failures remain historical evidence.

## Remaining work and review

New JIN contribution → **SHI, Pending**; this new execution-evidence packet → **LI, Pending**. Internal helper checks are not formal different-person review. #135/#136's completed reviews are not reopened.

The existing #135 APK is available locally, but no approved LI/SHI-readable artifact destination has been identified; the user was asked for that receiving location without credentials. The existing phone-handoff utility transfers private runtime configuration after APK installation and does not distribute the APK. Valid current runtime/private configuration, real repeated 9B, coordinated Android execution and applicable iOS evidence remain separate. LI/SHI's own latest receipts report zero connected devices; this packet does not claim a new device inventory. Real two-account Friend prerequisites and Event/browser/source-disable/client-clear/owned-copy checks remain scoped dependencies. No arbitrary upload service, Release, new deployment, expired demo restoration or new credentials are introduced.

Keep Draft/Open. No main merge, Issue/Project transition, full-application/S3/UAT/Release/Done or deadline commitment follows from these results.
