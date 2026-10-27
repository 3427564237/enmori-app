# PR190 R1/R2/R3 correction receipt — JIN, 27 October 2026 SGT

Product/test/contract commit: `b5ff56b6289bfaace8ac6f8e868660790a03f320`.
Tree: `dc4755eda19c4a90aa53d7e42dda8b82a13ea2f7`.
Parent/reviewed head: `c3a823f0baa003603e359a3bf2c7e521136aca66`.
Original PR development base remains `4d81af2f3dc0f5d68d8346eb248b30ed93097f76`;
target remains `souma/ai-companion-integration-20261025`.
This following evidence commit changes no executable input. The companion JSON
binds changed inputs, exercised test inputs and configuration to Git blobs and
byte/LF-normalized SHA-256. Local logs remain in
`build/jin-pr190-r1-r3-20261027-01/`; hashes do not imply raw-log upload.

Repository AGENTS/routing and the updated project Skills were used (existing
Skill sync `5ccc43122c442d63063ce41c6f6ff952152dea23`): systematic-debugging,
ENMORI Backend, Dart/Flutter patterns, unit and widget testing. No installation,
dependency/lock change, architecture change or new PM behavior was needed.

## Findings and corrections

- [R1](https://github.com/3427564237/enmori-app/pull/190#discussion_r4376640880):
  the Dart adapter now accepts the three existing generic region/affiliation
  reason forms when shared interests and common Event count are both zero.
  Empty/invented reasons and malformed DTO fields still fail closed. Ten cases
  bind actual FirestoreFriendRecommendations + Fastify HTTP serialization to the
  same synthetic JSON fixture consumed by the real Dart BackendApiClient/adapter
  for Home and All. This exercises the producer/consumer contract; Auth and
  Firestore are hand-written fixtures, not real services. V1 interest-only,
  combined profile reasons and mixed candidate responses are covered.
- [R2](https://github.com/3427564237/enmori-app/pull/190#discussion_r4376640885):
  Previous/Next require the mounted widget, captured group offset, valid target
  bound and identical current result/session state. The offset is assigned from
  the rendered value, not repeatedly incremented. ZHOU's repeated callbacks now
  retain the correct group without negative skip or empty overshoot. Additional
  tests reject a callback after a same-UID session change and after disposal.
- [R3](https://github.com/3427564237/enmori-app/pull/190#discussion_r4376640888):
  one ten-second timer starts at recommendationSnapshot entry and includes a
  shared-read wait and the complete traversal. Waiting is cancellation/deadline
  aware even if the underlying source ignores cancellation. A waiter cannot
  cancel the shared owner; expired traversal results cannot publish. Completion
  clears the timer. Five deterministic cases cover 6s+6s, caller cancellation,
  a stalled shared owner, late completion/recovery and source retirement.

## Actual JIN executions on this correction

Node 24.19.0; pinned Flutter 3.47.2 / Dart 3.13.2; existing tool/cache only.

| Final local log | Result and scope |
|---|---|
| compile-final.log | Fresh strict TypeScript compile into verified-compiled, exit0 |
| backend-final.log | Seven affected files, **70/70**, 0 skip, exit0 |
| flutter-final.log | Five affected files, **56/56**, exit0; includes 27 decoder and four callback cases |
| deadline-final.log | Unmodified ZHOU real-clock synthetic probe, **rejected at 10006ms**, exit0; firstReads=1, batchReads=1; no success/current result |
| analysis-final.log | Four affected Dart files, fatal-info analysis: no issues, exit0; startup was slow, later exited normally without forced cleanup |
| format-final.log | Four affected Dart files, zero changes, exit0 |
| git diff --check | Working/staged correction passed; dependency manifests/locks unchanged |

The real-clock timer result includes normal event-loop scheduling delay; it is
not a promise of hard real-time millisecond scheduling. The deterministic test
rejects at the 10000ms tick. No real provider/network service was contacted.

Run from the repository root. `out` below means
`build/jin-pr190-r1-r3-20261027-01/verified-compiled` (expand the path in commands):

```text
node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json --outDir build/jin-pr190-r1-r3-20261027-01/verified-compiled
node --test <out>/test/event-recommendations/aggregate-deadline.test.js <out>/test/friend-v2-wire-contract.test.js <out>/test/controlled-event-projection.test.js <out>/test/event-source-generation-regression.test.js <out>/test/event-recommendations/full-candidate-coverage.test.js <out>/test/event-recommendations/v2-personalization.test.js <out>/test/friend-recommendation-source.test.js
flutter test --no-pub --reporter expanded test/features/friend_v2_parser_test.dart test/features/friend_group_stale_callback_test.dart test/features/friend_ignore_flow_test.dart test/features/friend_discovery_activity_map_test.dart test/features/jin_recommendation_consistency_test.dart
node build/jin-pr190-r1-r3-20261027-01/aggregate-deadline-probe.mjs <out>
dart analyze --fatal-infos lib/features/friends/data/backend_friend_discovery_repository.dart lib/features/friends/presentation/friend_discovery_panel.dart test/features/friend_v2_parser_test.dart test/features/friend_group_stale_callback_test.dart
dart format --output=none --set-exit-if-changed lib/features/friends/data/backend_friend_discovery_repository.dart lib/features/friends/presentation/friend_discovery_panel.dart test/features/friend_v2_parser_test.dart test/features/friend_group_stale_callback_test.dart
git diff --check
```

The unchanged real-clock probe is available in ZHOU's PR190 review body and is
also retained locally with its hash. All synthetic servers use Fastify injection
or in-process fixtures; this run created no Emulator, private profile, listener,
device data or runtime needing cleanup. Normal test processes exited. Logs and
compiled outputs are retained; no prior build/evidence was overwritten.

## Preserved failure trail

- `red-flutter.log`: original ZHOU probes reproduced on the reviewed source,
  **1 Pass / 6 Fail**, exit1. These are the R1/R2 counterexamples, not six defects.
- `red-deadline.log`: original probe returned success/current after **12027ms**,
  exit1. This reproduces R3 before correction.
- `backend-affected.log`: first combined correction run **69 Pass / 1 Fail**.
  `baseline-generation-failure.log` reproduces that one failure on the original
  compiled source too. The legacy generation fixture reused a consumed Response
  for the newly required complete-ranking fetch and expected only two reads.
  It now supplies fresh NEW bytes for the third read, retaining the pending
  replacement/title/no-stale-detail assertions. No product fallback was added.
- `flutter-affected.log`: first combined run **55 Pass / 1 Fail**. The new
  same-UID test incorrectly expected automatic reload after the existing session
  clear. It now checks the cleared state, explicitly taps Reload, verifies the
  new first group, then invokes the old callback and verifies no movement.
- `new-backend.log` 15/15, `generation-final.log` 13/13,
  `flutter-group-final.log` 4/4 and `green-deadline.log` (10009ms rejection) are
  intermediate overlapping checks, not added to final counts. Compile-01/02,
  initial analysis and format logs also remain.
- The final analysis took longer than expected. A default-context process
  inventory lacked CIM access; the escalated read-only inventory identified only
  this command, which subsequently completed itself. No process was killed.
- The first receipt-generation attempt stopped before writing JSON because it
  assumed backend-local package files. The tracked manifest/lock are root
  `package.json` / `pnpm-lock.yaml`; the corrected collector verifies these.

## Attribution and gates

ZHOU's original 111 Backend / 63 Flutter results remain ZHOU's reviewed-head
evidence, not this correction's runs. Original JIN SDK/earlier source results are
also not relabeled. PR188 approval and unchanged components are not reopened.
ZHOU must re-review the new correction; LI retains evidence/final integration,
real accounts/providers/model/phone/APK and combined-tree verification.

Whole-library analysis is not established here: the existing locked
firebase_messaging cache gap remains as recorded in the prior receipt; no
dependency download/install was retried. Real SDK/Firestore, taxonomy/all-14
population, remote runtime, models, phone, APK, push/restart and LI combined tree
are **Not Run** for this correction. The separate small-plan semantic issue is
not changed or claimed solved. Draft/Open remains; no merge, task/Project
transition or UAT/Release/whole-application acceptance.
