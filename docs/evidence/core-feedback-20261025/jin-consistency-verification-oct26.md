# JIN verification receipt — 26 October 2026

Executable/product/test source: 0ba6e594690563cf2c78ed19d13e8839439111ea.
Tree: efb34033c6b28e2c31d1cbbede515cd6f48fb6b7.
Base: 4d81af2f3dc0f5d68d8346eb248b30ed93097f76.
The following evidence-only commit does not change these executable inputs.
The companion JSON records 42 final changed/lock inputs with Git blobs, byte and
LF-normalized SHA-256, and 40 local log hashes. Raw logs remain under
build/jin-v29-20261026-01; this receipt does not claim they were uploaded.

Repository Skills/routing were read from this checkout, including its reviewed
Skill sync 5ccc43122c442d63063ce41c6f6ff952152dea23. Applied: ENMORI Backend,
systematic-debugging, Dart/Flutter patterns, Dart unit and Flutter widget tests.
No Skill was installed. Node 24.19.0 and pinned Flutter 3.47.2 were used.
Dependency manifests/locks have no diff from the integration base.

## Final applicable executions

| Check / local log | Actual result and boundary |
|---|---|
| compile-contract.log | Strict TypeScript compilation exit0 into a fresh build output; final executable sources |
| final-affected-02.log | 62/62, exit0, fresh compile output: Event rank/transport/V2, Friend rank, social producer. After this run only the transport schema's missing explicit string type was corrected; its affected checks are below |
| contract-transport-final.log | 13/13, exit0, final normative OpenAPI/transport parity plus actual Fastify V2 response; overlaps transport cases in the 62 |
| sdk-final-03.log | 1/1, outer exit0: real isolated Auth signup/token verification, Firestore transaction and social/source/ignore/readback, reconstructed adapters. Provider Event rows remain synthetic; no actual Ticketmaster or model |
| flutter-batch-01.log | Earlier affected six-file batch 63/63, exit0. Later style/brace fixes and final new-test rerun are separately recorded; not claimed as a newly rerun final 63 |
| flutter-final-new-02.log | Final new client regression file 7/7, exit0: success/unknown save invalidation, pending mutation/same-UID replacement, V2 HTTP reason validation, truthful reason UI and real group progression/exhaustion |
| dart-analysis-scoped.log | Affected Dart paths and new test: no issues, exit0 |
| dart-format-final.log | Nine changed Dart files, 0 changes, exit0 |
| restart-01.log | Two new reconstructed-store cases pass, exit0; rolling budget and expiry after adapter restart. No daemon/process or real push restart |
| git diff --check | Source range and staged content passed; no dependency-manifest changes |

SDK run3 followed the final recommendation/transaction changes. The subsequent
transport-only string-type correction does not affect that SDK's repository
path. No old SDK total is transferred to this tree. New tests use hand-written
fixtures; widget NoSplash is test-local and does not alter the product theme.
The 62/13/63/7 and earlier focused runs overlap; they are not summed.

## Commands

Run from the repository root, using the existing Node/Dart/Flutter executables
(not an installer). Local TypeScript CLI resolved from the existing root runtime:

```text
node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json
node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json --outDir build/jin-v29-20261026-01/compiled-final
node --test build/jin-v29-20261026-01/compiled-final/test/event-recommendations/transport.test.js build/jin-v29-20261026-01/compiled-final/test/event-recommendations/v2-personalization.test.js build/jin-v29-20261026-01/compiled-final/test/event-recommendations/rank-events.test.js build/jin-v29-20261026-01/compiled-final/test/friend-recommendations/friend-ranking.test.js build/jin-v29-20261026-01/compiled-final/test/social-event-source.test.js
node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json --outDir build/jin-v29-20261026-01/compiled-contract
node --test build/jin-v29-20261026-01/compiled-contract/test/contract/openapi.test.js build/jin-v29-20261026-01/compiled-contract/test/event-recommendations/transport.test.js
node backend/scripts/run-jin-recommendation-sdk.mjs
node --test --test-name-pattern restart backend/dist/test/proactive/firestore-first-flow-store.test.js
flutter test --no-pub test/features/jin_recommendation_consistency_test.dart test/features/event_recommendations_page_test.dart test/features/backend_repositories_test.dart test/features/interest_editor_session_test.dart test/features/interest_editor_controller_test.dart test/features/friend_discovery_activity_map_test.dart --reporter expanded
flutter test --no-pub test/features/jin_recommendation_consistency_test.dart --reporter expanded
dart analyze --fatal-infos lib/app/event_recommendation_card.dart lib/features/event_recommendations lib/features/interests/presentation/interest_editor_controller.dart lib/features/friends/presentation/friend_discovery_panel.dart test/features/jin_recommendation_consistency_test.dart
dart format --output=none --set-exit-if-changed <nine changed Dart files>
git diff --check
```

SDK environment selected the existing Java21 and cached Emulator jar. The runner
preflights exactly five loopback ports; both outer and worker enforce isolated
demo project/credential profiles. Auth/Firestore synthetic records are removed,
owned profile removed and five ports verified free. Run3 debug logs are retained
in build/jin-recommendation-sdk-logs-HivSTu; no private runtime was contacted.

## Failure and repair trail

- red-coverage.log: 0/1, real first-page-only candidate defect reproduced.
- red-client.log: 0/2, real late Event completion after mutation/session change.
- compile-02.log: optional-candidate narrowing error, corrected before execution.
- new-backend-01.log: 17 Pass/5 Fail; invalid synthetic privacy spelling corrected.
  new-backend-02.log: 19/2; unfriend fixture incorrectly retained listRefs, fixed.
  new-backend-03.log: 21/21. These are different/overlapping fixture iterations.
- backend-batch-01.log: 156 Pass/1 Fail. The new complete-source path unnecessarily
  fetched a nonpaged source twice; fixed by retaining that complete first batch.
  backend-affected-02.log and -03.log: each 30/30, overlapping focused reruns.
- final-affected-01.log: 58/58. One supplied legacy compiled-path argument did not
  correspond to a current source file; no coverage is claimed for that argument.
  The final 62 above uses explicit current source files and fresh output.
- strict-compile-final-02.log: two static errors in the new final-source guard/
  test assertion, corrected; strict-compile-final-03.log and fresh builds exit0.
- contract-source-final.log: 14 Pass/1 Fail: OpenAPI had explicit string type
  where the runtime reason schema only had an enum. Added the type; final 13/13.
- sdk-final-02.log: Emulator hub startup timed out, outer exit1; owned profile
  removed, five ports free. A subsequent authorized local run using the existing
  cached tools passed (sdk-final-03.log). Timeout cause is not proven to be a
  product defect; it is retained rather than counted as a pass.
- flutter-final-new.log: no test output; startup command hung in the restricted
  invocation. Its exact PID/parent/command was verified and only that owned
  starter was stopped (exit -1). Existing-SDK-cache-enabled --no-pub run2: 7/7.

## Remaining execution limitations

Whole-lib Dart analysis (dart-analysis.log) exited3: 13 existing missing
firebase_messaging import/type errors plus 8 new brace-style infos. The new infos
were fixed; affected-scope analysis passed. The baseline locked
firebase_messaging 16.7.0 is absent from the local cache. Offline locked pub get
failed (pub-offline.log), and automatic approval rejected online locked pub get
as dependency installation beyond the no-install constraint. No alternate
download/install was attempted and no manifest/lock was changed. Full-library
analysis is therefore **not green**; it is not implied by the scoped result.

Real taxonomy/all-14 live coverage, real account/provider/remote runtime,
model semantics, phone/APK, push delivery, background OS restart and combined
LI-source tree remain Not Run. No old review or historical result is reopened or
relabeled. ZHOU reviews this new contribution; LI retains final integration and
real verification. This receipt is not merge/UAT/Release/Sprint acceptance.
