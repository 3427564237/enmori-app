# JIN #166 review corrections and authorized Activity — 21 October 2026 SGT

Executable source: `77781dc374e745f491a33b17f2874d6c46740a5a`.
Tree: `bfb55bd7ea32d80877a2290c61032792a48f2208`.
Previous reviewed head: `0a806883d9b96dcdcb570dde7fe4055f51a8f6b7`.
Original development base: `927f77527b32d349aa08020f7de0e88402edb9c7`.
Target: `souma/li-shi-du-integration-20261020`, observed `900ca6f`.
All previous commits/failures remain; no rebase, reset, main merge or module copy.

## Changes and review ownership

SHI's exact-head REQUEST_CHANGES and three findings were read before correction:
[R1](https://github.com/3427564237/enmori-app/pull/166#discussion_r4325137565),
[R2](https://github.com/3427564237/enmori-app/pull/166#discussion_r4325137573),
[R3](https://github.com/3427564237/enmori-app/pull/166#discussion_r4325137578).
These remain SHI's findings; author fixes/test success do not resolve the formal gate.

- Save/replace/remove use rendered session epochs and transport eligibility before
  and after token acquisition. Normal controls still dispatch exactly once.
- Manual Ignore/Restore retain rendered authority; same-UID replacement cannot
  adopt old visible actions. Undo still shares the versioned restore path.
- New cross-feature consumers use injected SocialAuthority/CheckInProjectionDecoder
  contracts and the public Weather builder. Social registration moved to Bootstrap.
- FA2 adds post-ranking authorized Note/Mood and Event-title display, shared
  Home/See all reading and source-bound Detail. Existing metadata ranking is unchanged.

[FA2 contract](../../../../api/friend-activity-display-contract.md) and
[LI integration steps](../../../planning/local-ui-handoff-oct19/jin-activity-review-fixes-oct21.md)
retain the actual unconnected Event producer/time boundary. #167 was independently
approved at `db1b7249`; its old R1/R2 review wait is resolved. P05 field implementation
is already delegated to SHI, not a new PM approval wait. After the executable freeze,
only documentation clarifies that ownership; code/OpenAPI JSON/tests stay identical.

## Frozen-source actual execution

Windows; Node 24.19.0; pinned Flutter 3.47.2/Dart from the existing FVM SDK;
Java 21.0.12.101; existing Firebase CLI/emulator caches. No dependency/SDK install.
Commands below ran in the isolated JIN checkout, not LI's runtime or original
`enmori-app-jin-active` checkout. Paths shown are repo-relative; exact file/blob
and local raw-log hashes are in [receipt.json](receipt.json).

| Check | Actual outcome | Scope |
| --- | --- | --- |
| `node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json` | exit 0 | Strict compilation, including new SDK test |
| `node --test backend/dist/test/{friend-activity,friend-activity-display,friend-ignore,friend-recommendation-source,social-profile,friend-ignore-contract}.test.js backend/dist/test/contract/openapi.test.js` (explicit paths, no shell brace expansion) | 58/58, zero skip, exit 0 | New Activity and affected authority/composition/contracts; handwritten gateway/Fastify injection |
| `flutter test --no-pub --no-test-assets --reporter expanded test/features/{jin_rendered_session_regression,friend_activity_display,located_check_in_flow,friend_ignore_flow,social_profile_flow,friend_discovery_activity_map}_test.dart` (explicit paths) | 60/60, exit 0 | Includes 14 session/dispatch cases and 13 display/navigation cases, not added again to the 60 |
| `dart analyze --fatal-infos <25 changed Dart files>` | clean, exit 0 | New and changed source/test files |
| `dart format --output=none --set-exit-if-changed <same 25 files>` | 25/0 changed, exit 0 | No inherited whole-router formatting claim |
| `node tool/run_social_weather_emulators.mjs --friend-activity` | 6/6, outer exit 0 | Five child checks plus their parent; actual isolated Auth/Firestore SDK with Fastify injection |
| `git diff --check HEAD^ HEAD` at executable source | exit 0 | Source delta whitespace |

New SDK checks create two synthetic Auth users and real isolated Firestore records,
read from the other actor, edit through Admin SDK then independently sign in/read,
tighten visibility, delete a record, withdraw consent and end friendship. Source
identities and minimal display are freshly checked; no precise location is returned.
This is **not** a product Check-in POST flow, real-account or Event/provider result.
The same runtime's backend authorization is tested; emulator permissive rules are
not evidence of client Security Rules enforcement. No ordinary runtime was started.

Owned cleanup actually confirmed: 11 document paths and 2 Auth users absent;
owned temporary profile removed; loopback ports 8080/9099/4400/4500/9150 free.
The prior local Firestore log was copied before the runner produced a new one.
Before/after manifests compare all **1,589** tracked bytes, HEAD and tree exactly.
The two manifest files have equal SHA256
`3a7edb7c28a0c85db739826150c4c869d9e0d5456369c7035abeeb7be34ac974`.

## Retained development failures and attribution

- Original SHI report: three positive controls/three regression failures, separately
  authored; the original supplied probe is retained locally. JIN's checked-in
  regression adapts the explicit epoch API and inspects request contents only on
  positive controls, after checking rejected dispatch counts. It also adds visible
  Ignore and three delayed-token mutation pairs. No SHI run is relabeled as JIN's.
- An initial local probe invocation produced no test output and was interrupted
  during tool startup. It is Not Run, not an independently reproduced old failure.
- `compile-01/02` reported constructor-callsite migration errors; fixed explicit
  injections compiled. `compile-05` exposed a missing test-fixture closing brace;
  subsequent compile and the frozen compile passed. Those logs remain.
- `flutter-fix-01`: **33 Pass / 2 Fail**. The new guard revealed a missing auth
  subscription at the Save widget (equal empty state could suppress repaint), and
  an older widget fixture supplied no authenticated session. The widget now watches
  Auth; the fixture explicitly supplies it. The affected three-file rerun passed
  23/23; it is not a relabeled 35/35 run.
- `flutter-activity-01`: **16 Pass / 4 reported Fail**. Two entries are compiler/load
  effects from awaiting a void test lifecycle method; two are the new Ignore probe's
  incorrect plain-text finder instead of `Ignore @alpha`. Product logic was not
  weakened to satisfy these fixtures.
- `flutter-activity-02`: **26 Pass / 1 Fail**. The paused test binding did not paint a
  frame, so the test still inspected the previous rendered tree. It now checks the
  inactive frame, then pauses/resumes. The product additionally suppresses reads
  while inactive, and the affected Activity suite passed 13/13. Frozen 60/60 is a
  separate invocation on the final executable tree.
- Analysis logs retain declaration ordering, generic Result inference and brace
  diagnostics. Final fatal-info analysis is clean. Earlier shell wrappers which
  printed an analyzer error without propagating its exit are not counted as Pass.
- Old #166 source results (including 43/2, UTC correction 7+1, SDK6, 154/119/5) retain
  their original versions. No old result is transferred to `77781dc`.

Raw logs/manifests remain in local ignored `build/jin-review-activity/` and
`build/jin-social/activity-77781dc-{before,after}.json`; hashes are published,
not a claim that those raw files were uploaded. No private config, credential,
real-user content or APK is included.

## Remaining execution and ownership

- SHI: review only this #166 correction/Activity delta; supply the current authorized
  participation metadata/actual selection time and gated Event-title producer within
  P05. EP1 preference `updatedAt` is not silently substituted. JIN owns adaptation.
- LI: final shared Home/router/bootstrap, combined source/APK, real source/account
  and device acceptance. Home All cannot claim operational success while a permitted
  Event producer is absent; independent Check-in category is available.
- Existing disclosed gaps remain: permanent-account-deletion executor, map cache/
  quota acceptance, real weather/precise-location revocation/device/iOS and actual
  Event/time integration. No new model or original failed-operation replay.

No credible real-source/device completion ETA follows from these local checks.
The delivered source/gate is the current checkpoint; next is SHI's focused review
and producer contract receipt, then JIN adaptation/LI composition. Draft/Open remains;
no merge, release, Issue/Project closure or whole-app acceptance.
