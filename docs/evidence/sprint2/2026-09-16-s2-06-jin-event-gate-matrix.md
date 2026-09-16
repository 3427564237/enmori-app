# S2-06 Event gate matrix — preparation, 2026-09-16

- Owner / executor: JIN ZIHAN; independent reviewer of actual results: SHI ZHENGQI.
- Assigned scope: Issue #29, 3h Event cross-feature automated verification.
- Preparation base: `d7832066df1bb8f915d7732458cb24b78cc807ec`.
- Matrix preparation: Complete. Integrated test implementation/execution: Not Run.
- Entry condition: DU's controlled integrated handoff, as required by
  [LI's assignment](https://github.com/3427564237/enmori-app/issues/29#issuecomment-5695973160).

S2-04 is merged and accepted; S2-05 independent review is complete. This record
does not reopen either component or claim S2-06 execution. Issue #29 stays open.

## Sources and observed dependencies

| Input | Source observed when preparing this matrix | Effect on execution |
| --- | --- | --- |
| Sprint 2 scope | [S-PM-0913-SPRINT2](https://github.com/3427564237/enmori-app/blob/3a110132b01f2dee3605351ce123aa90a3376ccb/docs/decisions/2026-09-13-sprint2-scope-capacity-contract.md) and Issue #29 | Auth/onboarding → Note → interests → Event → independent See All, successful empty, one safe dependency recovery |
| S2-01 | PR #32 at `e36e73507bc5675985e4105ca943eaf7ebbd29a0` | Available owner code/evidence; not an integrated execution head |
| S2-02 | PR #33 at `db40a4d234b0a9ce715467fb394bd4d6a1dc8476` | Available Event contract, owner tests and fixed manifest |
| S2-03 | PR #34 at `e4683b20791464393f2bb587513a6f46edb73612`; [DU runbook](https://github.com/3427564237/enmori-app/blob/e4683b20791464393f2bb587513a6f46edb73612/docs/evidence/sprint2/2026-09-16-s2-03-emulator-integration-runbook.md) | Real integrated handoff has not been published; execution Not Run |
| Demo target | [S-PM-0916-S2DEMO-TARGET](https://github.com/3427564237/enmori-app/blob/a0727d2502d8e669feafb17ba57050906a4439c8/docs/decisions/2026-09-16-s2-demo-target-confirmation.md) | Target confirmation is resolved; it is no longer the blocker |
| Initialization/runtime | [LI's SHI handoff instruction](https://github.com/3427564237/enmori-app/issues/28#issuecomment-5695960653) | Await SHI implementation, independent review, actual create-only execution and runtime handoff |
| Integrated client | [LI's DU handoff instruction](https://github.com/3427564237/enmori-app/issues/30#issuecomment-5696014913) | Await DU source integration, actual Emulator flow and handoff; preserve Interest and Event composition and fresh request after save |

These are preparation snapshots. Before execution replace them with the exact
integrated app and Backend identities actually handed over. Do not infer
integration from separate approved PRs or copy the older runbook's resolved
target blocker into the current result.

## Required handoff before execution

1. DU supplies the integrated app commit, Backend commit, relevant predecessor
   heads and LI's disposition on the actual integration increment, with a
   reproducible launch/test path. Interest and Event routes/composition coexist.
2. SHI's initialization evidence names the approved manifest version/digest and
   created/unchanged outcome; conflict or missing access means no successful
   handoff. Reuse that evidence; JIN does not run an initializer or modify IAM.
3. DU identifies Android Emulator model/API, exact SDKs, runtime environment
   class and the existing private configuration mechanism. Record APK digest
   when using a prebuilt APK; otherwise record the test-built app's source.
4. The handoff identifies the synthetic account setup for real Auth/onboarding
   and Note operations, initial Interest selection, and permitted fixture use.
   If a supplied account is already onboarded, it cannot by itself satisfy the
   new-onboarding assertion; record that row Not Run until a suitable fixture
   is provided. Do not delete/recreate accounts to manufacture a fresh state.
5. DU supplies the existing approved method for one bounded dependency failure
   and restoration, plus a way to distinguish Home and All requests. Do not stop
   a shared service, reset data or introduce a new mock framework.

Android Emulator is the execution device. Firebase Emulator and the controlled
Demo are separate Backend environment classes. Record which class DU actually
hands over, without silently substituting the other. Automated Firebase tests
remain restricted to their isolated test environment. In particular, LI's
`s2_interest_real_backend_test.dart` explicitly calls `useAuthEmulator`; it must
not be run unchanged against the controlled Demo. Environment or contract
mismatches must be resolved in the handoff before execution.

## Automated assertion matrix

Each result starts **Not Run**. A row becomes Pass only with assertions and
sanitized output tied to the actual execution head. Screenshots/semantics support
UI observations but do not alone prove persistence or independent requests.

| ID | Setup and actions | Required automated assertions | Evidence to retain | Result |
| --- | --- | --- | --- | --- |
| S2-06-01 | Use the handed-over synthetic identity; authenticate and complete onboarding through the real app/Backend path using the existing Initial Choice contract | Authenticated session drives routing; onboarding completes and a subsequent protected read confirms it; no fake Auth/session emission | Assertion output, safe route/result summary; reuse owner Auth/choice negative cases | Not Run |
| S2-06-02 | Create a fixed synthetic Note, then perform its owned later read through the Backend | Create succeeds; later read returns the synthetic Note; transition into the Interest/Home flow works without recreating onboarding | Assertion output and redacted UI evidence; no account, Note body or document ID in logs | Not Run |
| S2-06-03 | Save Community and Music on the handed-over synthetic account, leave and reopen the editor | Save succeeds; a new own-Interest read matches the selection and returned revision; no local-only success | Save/read assertion sequence and safe UI labels | Not Run |
| S2-06-04 | Return to Home after the successful save | A new `view=home` request occurs after save; Home shows at most two entries in that response's Backend order, with title/time/matched-Interest reason | Request assertion output plus Home screenshot/semantics | Not Run |
| S2-06-05 | Open See All after Home has loaded | A separate `view=all` request reaches the Backend and returns its own `asOf`/items; All displays its own response in Backend order, not a reused Home list | Distinct request observations, assertion output, All screenshot/semantics | Not Run |
| S2-06-06 | Save an empty own-Interest selection using the existing UI, then load Home and All independently | Both requests succeed with empty items; show `No event recommendations right now` and `Update your interests or check again later.`; no stale events, fallback candidates or dependency-error state | Successful-response/empty assertions and empty-state UI evidence | Not Run |
| S2-06-07 | Restore the nonempty selection; apply only the handed-over bounded dependency-failure method and request recommendations | Safe error and explicit Retry appear; dependency failure is not presented as successful empty; no vendor text/token/stack leak and no hidden retry loop | Safe error category and assertion output; failure method identified without private configuration | Not Run |
| S2-06-08 | Restore the dependency, then invoke the visible Retry action | A new request succeeds and replaces the error state with the valid result; retained saved interests remain available | Recovery/request assertions and resolved UI evidence | Not Run |

For S2-06-05, different `asOf` values are not required: rapid independent calls
can share a timestamp. Prove two requests and separate computation from the
integrated request path; a second screenshot is insufficient. Home and All are
independent, so equality across changed inputs/time is not an acceptance rule.

### Fixed fixture expectations

Reuse [manifest `s2-event-demo-v1`](https://github.com/3427564237/enmori-app/blob/db40a4d234b0a9ce715467fb394bd4d6a1dc8476/backend/fixtures/s2-event-demo-manifest.v1.json),
canonical SHA-256 `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`.
When its four Events are the complete matching fixture set and all are still
future at the actual server `asOf`, selecting Community and Music yields:

1. `s2_demo_community_music` — 2 matches;
2. `s2_demo_community_early` — 1 match, earliest start among single matches;
3. `s2_demo_music_early` — 1 match;
4. `s2_demo_community_late` — 1 match.

Home takes the first two; All contains the four in that order. With empty own
interests the expected result is empty. Recheck the handed-over fixture inventory
and actual time; do not delete other records or change the manifest to force
these expectations. If additional matching data exists, derive the expectation
from the approved complete fixture inventory or report the fixture mismatch.

## Reuse and bounded execution

- Reuse [LI's S2-01 evidence](https://github.com/3427564237/enmori-app/blob/e36e73507bc5675985e4105ca943eaf7ebbd29a0/docs/evidence/sprint2/2026-09-14-s2-01-li-implementation.md)
  for component/API revision, cardinality, account isolation and catalogue cases.
  Its old results and physical-phone empty case are not JIN's integrated run.
- Reuse [the S2-01 real Backend test](https://github.com/3427564237/enmori-app/blob/e36e73507bc5675985e4105ca943eaf7ebbd29a0/integration_test/s2_interest_real_backend_test.dart)
  for applicable save/later-read assertions only, respecting its Firebase
  Emulator requirement. The current main `rmvp01a_client_flow_test.dart` uses
  fake repositories and cannot establish this real cross-feature gate.
- Reuse [SHI's S2-02 owner evidence](https://github.com/3427564237/enmori-app/blob/db40a4d234b0a9ce715467fb394bd4d6a1dc8476/docs/evidence/sprint2/2026-09-15-s2-02-shi-persisted-slice.md)
  for ranking, transport and isolated Firebase component contracts.
- Reuse DU's actual integrated harness and evidence once delivered. Add only
  missing cross-feature assertions with existing `integration_test`, real
  repositories and approved seams. Current preparation adds no executable test.
  Record the selected test file and exact `fvm flutter test` command only once
  they exist and the environment matches; do not invent a runnable command now.
- Use pinned Flutter 3.47.2/FVM and the approved Backend toolchain. Analyze
  changed test code and run the relevant integrated cases; avoid redoing all
  unchanged owner tests merely to increase evidence volume.

Plan the 3h allocation as 0.5h preparation/handoff reconciliation, 1.5h focused
automation/execution, and 1h evidence and defect/retest recording. These are
estimates, not claimed time spent. If a prerequisite is absent or a product
defect blocks a row, record it and route the concrete finding to its owner;
do not absorb new product/infrastructure work into this gate.

## Results handoff template

Actual execution record must contain:

- JIN executor, UTC/SGT window, integrated app/Backend/test SHAs and source delta
  relative to the reused owner evidence;
- Android Emulator model/API, SDK/runtime versions, environment class and
  manifest version/digest; private connection/identity configuration stays local;
- exact sanitized commands, exit outcomes and assertion counts;
- per-row Pass/Fail/Not Run, evidence path and defect/retest disposition;
- separate Home/All request proof and dependency failure/restoration proof;
- SHI's independent review of the actual result commit, followed by LI's scope
  acceptance and separate Issue/Project reconciliation.

Do not retain credentials, tokens, private endpoints, device serials, account
identifiers or raw personal payloads in evidence. Restrict request observations
to the allowed operational metadata and test assertions over approved synthetic
fixtures; do not enable unrestricted network/body logging.

At preparation time: initialization/runtime handoff and DU's controlled
integrated handoff are pending; all eight execution rows remain **Not Run**.
No physical-device proxy work, UAT, Release or Issue/Project completion is claimed.
