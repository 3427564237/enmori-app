# JIN fixed-input repeat-store regression — 17 October 2026

Execution task [#84](https://github.com/3427564237/enmori-app/issues/84), parent [#44](https://github.com/3427564237/enmori-app/issues/44). This independent test increment follows [the confirmed parallel kickoff](../../decisions/2026-10-16-li-low-blocking-kickoff.md) while the frozen [unified candidate #135](https://github.com/3427564237/enmori-app/pull/135) is in review. It neither replaces that candidate/APK nor repeats the approved component reviews.

## Source and scope

- Tested source-only commit: **`8763e4c33a29f0b6f9178649e720e14ded270697`**; tree **`8c9d0ee0a562d13ab5b8b32ead6725eec59d4708`**.
- Parent: `dcdc3ba13f1a4bac192775b7a45f8e37bc4c680e`, #135's published evidence head. Only `backend/emulator-test/controlled-phone-service.integration.test.ts` changes: one added test, 86 lines. All other tracked inputs, including production, API, client, launcher, dependency and build configuration, are unchanged.
- No new APK is built for a test-only change. #135's APK remains bound to its original `b3c8a222` product source and original hash; it is not relabelled as this test source.
- N01's selected prepare/execute/read/delete contract comes from [conditional A](../../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md). The selected N02/F03/C-A source, atomic-pair and cleanup rules come from [remaining isolated A](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md). No contract, index, public DTO or processing purpose is added.

## Gap and actual new check

ZHOU's [#133 client baseline](2026-10-16-zhou-client-repeat-use.md) exercises the same fixed routine twice with handwritten HTTP/Auth fixtures. Existing SDK tests used different text with history after both sends, or a Persona switch between equal Chinese inputs; the actual Dart probe executes one send. None had the exact fixed-English five-request sequence. This is a verification gap, not a reproduced product defect or a diagnosis of the older real-model rejection.

The new test creates one synthetic Note through the existing Check-in HTTP endpoint, then runs **prepare A → execute A → GET history → prepare B → execute B**, sending `I read a book today.` both times. B is a fresh regular Send to the same conversation, with distinct operation/key. It verifies:

1. Model-attempt checkpoints 0 → 1 → 1 → 1 → 2; Reload does not generate. Both injected generations receive the identical complete permitted input and one original Note projection.
2. First Reload returns the first exact pair; final history returns both exact pairs, four distinct message IDs and sequences 1–4. Earlier DTO identity/time/content remains intact.
3. Exactly two canonical assistant source documents point to the original Note with purpose generation 0. Note content, createTime/updateTime and one-record inventory remain unchanged during the two rounds.
4. Explicit whole-conversation DELETE returns 204; its parent/messages/sources/effects and both operation fences are absent, while the original Note remains. Final owned service cleanup leaves no fixture Firestore collections or Auth users.

Auth, HTTP, Firestore, composition, the existing finite semantic gate and cleanup are actual implementations. Compiler/token counts and Qwen responses are explicit doubles. This neither exercises the actual two-round Dart client nor establishes real 9B/tokenizer success, phone usability, or the old rejection's cause. No product repair was invented after the passing regression.

## Actual execution

Pinned Node 24.19.0/TypeScript 7.0.2 and the existing locked SDK/Java/Dart/cache were used. The unchanged guarded launcher fixes synthetic project `demo-enmori-rmvp01a-r10`, loopback Auth/Firestore, exclusive port preflight and serialized gateway-bound tests. No existing demonstration/cloud service, real-user data, external provider or real model was contacted.

| Check | Result on this source |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass, exit 0 |
| `node tool/run_ai_store_emulators.mjs --phone-service-only` | **15/15**, outer exit 0 |
| `node tool/run_ai_store_emulators.mjs` | **169/169**, outer exit 0 |
| Frozen source and whitespace | 1288 tracked inputs byte-stable before/after; Git blobs exact or explicitly CRLF-equivalent; diff check passes |

The focused checks are included in the full SDK count, not added to it. Full execution validates cross-suite isolation after the new provenance/deletion journey. Both SDK invocations have zero failures, cancellations, skips and todos. Worker/outer profiles were removed and ports 8080/9099/4400/4500/9150 verified free. Local invocation logs/manifests are retained in `build/jin-repeat-store-20261017`; exact commands, times and SHA256 values are in the [machine receipt](2026-10-17-jin-repeat-store.json). Previous candidate logs/APKs remain at their original paths.

No full Backend unit, Flutter, operator/Python, APK build or device gate was rerun for this single SDK-test delta; prior counts are not transferred to this source. #135's Windows 675/1 symlink failure and its missing capable-environment/device evidence remain unresolved. Historical real-model failures and missing bad-candidate diagnosis remain retained. The expired demonstration service is not restored.

## Review and independent boundaries

New JIN test → SHI; JIN-authored evidence → LI. Both formal conclusions remain Pending. Internal checks and owner execution are not independent approval. #135's frozen composition review continues separately; no main merge, task/Project transition, whole-app/S3/UAT/Release/Done or deadline claim is made.

The parallel read-only Friend reconciliation found no demonstrated approved consumer omission: existing request/inbox/list/search consumers are present. [FS01–FS05](../../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md) and [the synthetic-profile boundary](../../decisions/2026-10-14-li-social-feedback-navigation.md) do not release real other-user eligibility/block/visibility/full projection. Real Profile/Recommendation/Activity producers and valid two-account/device execution remain localized dependencies. No Friend behavior was added or old consumer rebuilt.
