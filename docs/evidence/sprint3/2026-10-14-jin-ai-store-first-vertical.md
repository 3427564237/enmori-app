# JIN isolated AI store: first executable increment

Source: `375747005b3d02de0e2e82d62569a50032d97b55`, tree
`ad20f96dd061f83ddc57ef6f23fe1f1784cc32b9`, over #99
`e84b23cd82eeda039f2bef9fa455909e9f39cc87`. Initial interface publication was
`26e6f806134cd9758f4ac6311784519c1b4ab946`; both belong to Draft #105.

Authority: [LI acceleration and sole-writer allocation](https://github.com/3427564237/enmori-app/blob/948579ec82b2c5363ab2b3b2ea353ca652020f07/docs/planning/2026-10-14-li-ai-accelerated-delivery-plan.md),
selected N02/F01/F03/R-A/C-A. This is the first usable storage/control increment,
not a claim that the entire assigned package or six-operation product is ready.
SHI reviews new JIN code; LI reviews owner evidence and bounded disposition.

## Delivered code

- Vendor-free asynchronous store/control interface; original synchronous fake
  effect(commit) Port is unchanged. No dependencies, public API, ordinary
  Bootstrap, client or shared Home/router changes at this checkpoint.
- Actual Firestore single-attempt transactions for runtime epoch, initial open
  guard, close-before-initialize closed placeholder, first user/parent/effect,
  same-U Retry claim, atomic assistant/canonical pair/empty sources/effect,
  definite-ACK claim settlement and barrier-conditioned ordinary readback.
- Fresh external Auth before each content transaction and original guard after
  awaits; current binding/Account/consent/generation in the actual transaction.
  SDK exceptions return unresolved, never no_effect. No token, operation key,
  request body copy, prompt or replay result is persisted or logged.
- Full-precision service createTime and selected retention resolver; late or
  corrupt lineage cannot authorize read/write or extend the old expiry.
- Guarded isolated constructor and optional metadata/single-attempt gateway
  extension. Existing gateway callers retain their previous SDK retry behavior.

The verified vertical uses complete **synthetic empty-source/default-Persona
authority**, real Auth verification and real Firestore records. It does not
pretend that a missing producer is an authorized empty snapshot. Nonempty Note
dependencies are explicitly refused pending actual producer guarantees/current
transactional handoff. Used-Persona branch is not independently evidenced here.
The adapter is not registered in any runtime. ZHOU's new asynchronous Application
can consume this interface; no existing fake orchestration was silently wired.

## Actual verification

Node 24.19.0, TypeScript 7.0.2, Admin 14.3.0, Firestore 8.7.1,
Firebase CLI 15.29.0 and Emulator 1.22.0; existing pinned dependencies unchanged.
Commands run from this source with the pinned Node on PATH:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test "backend/dist/test/**/*.test.js"
node tool/run_ai_store_emulators.mjs
```

The Emulator launcher requires JAVA_HOME/Java21 and FIREBASE_EMULATORS_PATH
pointing at the existing verified cached JAR. It checks versions/cache digest,
five free ports, builds empty credential profiles, uses demo-enmori-rmvp01a-r10
and loopback Auth9099/Firestore8080, and audits the actual gateway SDK binding.
No cloud fallback, downloads, private account, model or phone action occurs.

| Current-source check | Actual result |
| --- | --- |
| Strict compile, final build03 | Pass / exit0 |
| Backend regression including five new boundary cases | 654/654 Pass / exit0; failed/cancelled/skipped/todo0 |
| Full actual guarded Auth/Firestore Emulator | 90/90 Pass / exit0; includes 14 new store cases, overlapping not additive |
| New-store actual gateway binding checks | 76 calls, actual same validated demo/loopback/SSL-false settings |
| New author-only product/device/model suites | Flutter/Android/model Not Run; none changed or enabled |

The 14 new actual cases cover user/assistant/ACK/readback with immutable metadata,
A→B→C protection, close before initialization, closed-fence refusal, foreign
owner, cancellation during fresh Auth, offline withdrawal/regrant generation,
explicit refusal of unproved Note authority, discarded ACK after actual commit,
concurrent Retry claim, tombstone occupancy, missing provenance/corrupt lineage,
expiry/deleting refusal and restart epoch denial.

The ACK-loss case discards the result **after an actual SDK commit** in a test
decorator. This is application-boundary acknowledgment uncertainty, not injected
wire-level server/network ACK loss. Concurrent Retry proves one actual claim;
it does not establish every possible barrier/transport race or model stop.

## Retained failures and cleanup

Run01 exited1 before test execution: Windows drive path supplied directly to
Node `--import` caused ERR_UNSUPPORTED_ESM_URL_SCHEME (nine file-loader failures,
zero functional scenarios executed). Both private profiles were removed and
five ports freed. Worker now uses pathToFileURL. Run02 is the unchanged store
implementation's actual 90/90 invocation; it does not erase run01.

Each new fixture tracks its own randomly partitioned owner/conversations/fences,
removes messages/sources/effects before parent, verifies absent documents and
children, removes its runtime singleton, binding/Account and Auth user, terminates
SDK and app. The wrapper verifies both profile removals and free ports after CLI
exit. These are test-owned fixture cleanup results, **not the product cleanup
runner**, a 24-hour SLA proof or a controlled-production deletion guarantee.
Private logs remain local; manifest fingerprints identify the retained files.

## Explicit next work and limits

Six HTTP/OpenAPI/guarded composition operations and ZHOU asynchronous integration
remain in progress and are not this checkpoint's source. Complete restart
settlement, control removal, whole-delete, expiry and two-direction source sweeps,
checkpoint ABA and actual combined gate remain unfinished. This adapter retains
controls until that follow-up; it is not enabled as a long-running service.
No no_effect receipt or arbitrary deleted-target recreation is introduced.

Real Note canonical writer/nonreuse facts hold their dependent actual source
transactions only. Real Qwen host/model/tokenizer and Q31 prerequisites still
hold real calls; D1-A adapter/preflight follows the usable persistence path.
The first usable-store target was 14 October21:00 SGT; this source is an early
bounded delivery, not an assurance of complete HTTP/cleanup/model by that time.
#101 Persona correction remains separately submitted for SHI review. #99's
original Flutter504/1 history and all previous evidence limits are retained.
No merge, Issue/Project transition, runtime/index/cloud/model enablement or
whole-module/42-route/38-state/Sprint/UAT/Release completion is claimed.
