# QA — final F1 App and shared entry

25 October 2026. Independent source and targeted Flutter review of Integration
`a20927c063b9ef20e38fa8fdac7b252f54c60bda`. Its eight App production/test files
are byte-identical to App `ee448278bce86766238f2b049b0822e21c5540ad`.
At the initial checkpoint, **18 distinct checks passed and one recovery
regression failed**. The subsequent focused repair at Integration `6b4ec58`
passes **2/2 recovery checks**, closing that P2 within the source/controller-test
scope described below. This is not integrated-product, real-service,
model-quality, notification or physical-device acceptance.

## Source and scope

QA read the complete selected-source controller and picker, the existing
conversation controller/page/state changes, the selected test doubles and
relevant test bodies, plus the final shared saved-detail route. The source
review follows the six boundaries previously recorded in
[the selected-context ledger](qa-f1-selected-context.md). The approved LI
decision and Context contract remain the requirements; current code and tests
are implementation evidence.

The private snapshot contains 412 original files. All production files are
unchanged during QA execution. Two test-only additions are declared separately:
Root's `9d50ac439ea1a179b12281bcbce83f709ba5837f` offstage finder repair plus
QA assertions in the shared router test, and a new private four-case QA test.
The other 411 original files remain byte-identical to the archive.

Observed source boundaries include original-token retention, a preparation
budget limited by elapsed monotonic time and both absolute deadlines, request
local selection/history keys, exact source rereads before and after preparation,
current session/route/revision checks, explicit confirmation followed by a
separate Send, and reuse of the existing original-operation recovery state.
Stored selections contain only permitted record fields. Source removal and
history exclusion do not delete stored Check-ins or messages.

## Independent targeted checks

Integration explicitly handed QA the exclusive Flutter window. The exact
archive used the existing pinned package configuration/graph and unchanged
lockfile, with `fvm flutter test --no-pub` under the shared nonblocking lock.
No package resolution, production edit, model/service/Emulator request,
notification operation, APK build or device action was performed.

QA selected 13 existing feature cases after reading their assertions and added
three independent deadline cases. These **16 checks passed**:

| Boundary | Distinguishing observations |
| --- | --- |
| Original token and deadlines | An accepted selection sends with the original prepare token after the auth double changes. Fourteen seconds spent waiting for that token leave only one second of the original budget. Independently earlier operation and selection absolute expiries each block stale confirmation and Send. Expiry causes no new token read, prepare, execute or ordinary fallback; a later review requires fresh confirmation. |
| Source count, time and history | Initially nothing is selected; five exact own IDs are accepted and a sixth is refused. Inclusive seven-day filtering excludes older/future records and preserves partial cursor failures as failures. Whole-pair exclusion obtains fresh keys; changed pair IDs/sequences cannot inherit exclusions or confirmation. |
| Confirmation and draft | Returning during pending preparation abandons its late result. Picker Back retains exact draft text/selection and choices. Confirm returns without executing. Only explicit Send executes, and a captured Send from the covered editor cannot dispatch. |
| Unknown operation | An execute conflict remains fenced through unresolved readback. A later authoritative saved-user result enables only the original-user Retry; no ordinary prepare/execute fallback occurs. The separate pending-execute recovery case failed at this head; its repaired-head result is recorded below. |
| Source change or loss | An edit during preparation retires review. Unknown exact-source read hides the body, preserves the explicit chosen ID and requires fresh review. Successful one-reply use clears choices rather than silently reusing them. |
| Session, revision and detail entry | Consent withdrawal and same-UID replacement retire selection and late prepare results. Captured Confirm/Exclude cannot approve a newer unseen revision. Explicit detail entry adds only its requested ID beside existing choices and keeps the draft. During unknown execution it performs no attach/read until authoritative no-effect plus another explicit tap; an old session's attachment cannot replay. |

These are source, repository-double and widget observations. QA did not rerun
App's 389-case author batch, the six pure presentation cases, or the Backend,
Emulator and model ledgers. Their counts are not combined with these results.

## Original P2 — selected execution can strand fresh review after recovery

App first reported this defect at `ee44827`; Product independently confirmed
its source cause. QA then reproduced it with a new private test on `a20927c`.
This is an executed red result, not just repetition of the author report.

Reproduction:

1. Choose an own record, keep a draft, review, confirm and explicitly Send.
2. Hold the selected execute response pending, invalidate content access for
   background, cancel the original attempt and resume.
3. Preserve the selected ID and draft; source body remains hidden. An unresolved
   readback still prohibits a new preparation or Send.
4. Read the original operation again and receive authoritative `noEffect`.
   Conversation `canSend` becomes true, with one execute and two readbacks.
5. Explicitly request fresh review. The selected prepare count remains one,
   although a second preparation should now be admitted. No review appears.

At `ai_selected_sources_providers.dart:180`, the content-access listener changes
the local epoch and clears review/display state without clearing `_sending`.
The old Send await returns at line 666 on the epoch mismatch, before line 667
can clear that flag. `review()` subsequently rejects the action through its
`_sending` guard even after authoritative no-effect has released the original
operation fence. This is a recovery availability failure; the counterexample
did not produce a duplicate execute or unauthorized source use.

The failing assertion expected two selected preparations but observed one.
The repair must release the retired local sending state while preserving the
original operation guard, choices, draft and explicit review/confirmation/Send.
At that initial checkpoint, QA had not executed a repaired head. Integration
requested that the candidate not be built before this issue was resolved.

## Shared route checks and retained fixture failures

Root's original two route tests used a visible-only `AiConversationPage` finder.
The page is correctly covered when its picker opens. QA reviewed and applied
the exact test-only `9d50ac4` correction; production remains at `a20927c`.

QA additionally checked the actual visible picker, the exact selected own ID,
no automatic review/confirmation, zero non-GET requests, original exact-session
rejection and inert covered-detail callbacks. The first QA overlay also assumed
that the selected record's body would remain in the record list. Both checks
failed at that added assertion because the existing shared HTTP fixture returns
503 for every history-list GET. `loadRecent()` correctly leaves the body
unverified and records those failed reads; the chosen ID and picker remain.

The original failed overlay and log are retained. Without changing production
or weakening the original route/session/no-write assertions, the second QA
overlay explicitly checks all eight failed day partitions, hidden body,
preserved exact ID and the unknown notice. Only these two tests were rerun:
**2/2 passed**. They establish the detail entry with a failing list dependency,
not a successful real history fetch.

The first batch was **16 Pass / 3 Fail** across 19 cases: one genuine recovery
defect and two incompatible QA fixture assertions. The subsequent two passes
replace only those fixture verdicts. The distinct outcome at that checkpoint
was **18 Pass / 1 Fail**, not 21 independent cases or a completely green F1 gate.

## Evidence and handoff

Private directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/root-a20927c/`.
The source manifest, command/result JSON, versioned test overlays and full logs
preserve the exact inputs and failure history.

| Artifact | SHA-256 |
| --- | --- |
| `qa-f1-targeted-baseline.log` | `9fe331a441e7d9bad34bd2f4598ce3601f6780cb41efce4196466734e854c7f9` |
| `qa-f1-shared-entry-v2.log` | `5293eac0b4733acdbdc88d86067cff332f37859ec5bbac9d146c1cf54eba88fe` |
| Initial private test, preserved as `qa_f1_deadlines_recovery.v1.dart` | `fbe6d675017e01ce63cc98c5392744593ec4f431b85e4b4e24e90dd5a6eee351` |
| First shared QA overlay | `661ab1ec26e85271496afb794db3ec06918e34a13e8c6e18b33ce5e3ac3a93da` |
| Final shared QA overlay | `c773d9806b252f2ffb13ab7f15c78655aa958d2cb1431a9e2d66e485900ed1c5` |

QA returned the Flutter window to Integration immediately after the two shared
checks and reported the open defect to Integration, App and Product. That handoff requested
only source-difference review and focused execution of the original failing
counterexample and any materially different recovery branch on a repaired head.

Integration separately reported clean full analysis and 1,348 passes / 62
failures in the complete historical Flutter directory. Its remaining fixture
and regression classification is owned by Integration/App; it is neither
overridden by this focused result nor independently certified here. All prior
semantic, service and physical-device evidence retains its original scope.

## P2 closure — exact repair and independent red/green recovery

App froze `9bc571c38eeb9472b8f37128244b64862186f319`, parent `ee44827`.
QA read all three changed files. Production adds only `_sending = false` and
two explanatory comment lines to the content-access listener. It does not
change `_recoveringSelected`, original-operation state, source eligibility,
the epoch rejection of late results, or the `canSend`/`canRetry` review guard.
App's two new tests and analysis are author evidence; their log SHA-256
`da1f2e8c92d9c926e8d91a92afe80a73fb51230f72c28851641b06fee4eff55e`
was verified, not added to QA's result counts.

Integration cherry-picked that repair as
`6b4ec589c49fc7edf43a4654421c757d2435c9e5`. QA archived this exact head and
verified that its only production difference from `a20927c` is the same
three-line change, byte-identical to App. Root subsequently advanced to
`8d5a7240e7a69fbc3d0ae6249e525f37973d33df`; QA verified that `lib/` has no
difference from `6b4ec58`. The later harness-fixture/doc changes were not
included in this recovery run or counted as QA execution.

Integration explicitly authorized one short exclusive window for the original
no-effect counterexample and one materially different saved-user outcome.
The first run reached the end of both cases without a business assertion
failure, but **both tests failed** Flutter's pending-timer invariant. QA's
private fixtures used `addTearDown` to dispose the provider container, which
runs too late for that invariant. The fresh no-effect review retains its valid
15-second preparation timer; the fixtures also left a zero-duration Riverpod
scheduler timer. The failed log and both initial test sources are preserved.

QA changed only fixture cleanup to `try/finally`, explicit disposal and a pump
before the widget-test invariant check. Every business assertion is unchanged.
The same corrected no-effect test bytes were then used on both production
heads, preserving a direct comparison:

| Head and case | Independent result |
| --- | --- |
| Original `a20927c`, corrected-cleanup no-effect case | **Fail** again at the original expected-two/actual-one preparation assertion. The cleanup correction does not hide the product regression. |
| Repaired `6b4ec58`, same no-effect case | **Pass**. Unknown readback still blocks preparation; authoritative no-effect permits a fresh unconfirmed review. Choices/draft remain, execute remains one and no ordinary fallback occurs. |
| Repaired `6b4ec58`, access retirement followed by `userSaved` | **Pass**. Unknown still blocks review/send. Authoritative original-user readback permits Retry, not a new input; preparation uses the saved user's exact ID. A late old execute response cannot replace the fresh review. Ordinary Send/Retry cannot bypass the pending selected preparation. Only explicit confirmation and selected Retry produce the second execute; the resulting in-memory transcript has exactly one user row with the original ID, then clears matching draft/choices on success. |

The final repaired-head batch is **2/2 passed**, exit 0. The original
counterexample's business assertions now pass; its source hash differs only
because the necessary fixture cleanup is explicit. Neither the initial
pending-timer failures nor the original product failures are erased. All 412
original archived files at `6b4ec58`, including every production file, remained
unchanged; QA added only its two private test files and reused the pinned
toolchain configuration/graph and lockfile without package resolution.

New private evidence is under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/root-6b4ec58/`.
The corrected red comparison remains under the original `root-a20927c/`.

| Artifact | SHA-256 |
| --- | --- |
| Initial repaired-head run, `qa-f1-recovery.log` | `9ae0a389ac32c433fd8e302b2e3b51f16805bd084534ee6de449719325485c19` |
| Corrected-cleanup original-head red, `qa-f1-recovery-red-v2.log` | `38e7f7ff6ce55b9d977394e7d84afd0af0a8753c41ccafd256ee5489d24d6530` |
| Final repaired-head two-case green, `qa-f1-recovery-green-v2.log` | `172e1f74a985d0daec90064806ac136bd94b00562f89f5111fe28218f5c53f61` |
| Corrected no-effect test, identical on both heads | `59cc6537d0931c351747f6275b143dd0a31a2ce156122d67b696ad413f2130bd` |
| Saved-user recovery test | `dd76cf4b4cbdaaa44ecd38a6e8aae07773d8603c42ceccd953a78db1a8c64ec2` |

P2 is closed for this source/controller/widget-harness scope. QA immediately
returned the Flutter window and reported both results and the retained failure
history to Integration, App and Product. The earlier 18 checks were not rerun
or counted as new fixed-head executions. Full-directory historical failures,
final integration, APK, real service/model, native delivery and device
acceptance remain separate; no additional work in those layers was performed
by QA in this window.
