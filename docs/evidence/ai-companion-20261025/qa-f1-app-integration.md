# QA — final F1 App and shared entry

25 October 2026. Independent source and targeted Flutter review of Integration
`a20927c063b9ef20e38fa8fdac7b252f54c60bda`. Its eight App production/test files
are byte-identical to App `ee448278bce86766238f2b049b0822e21c5540ad`.
At this checkpoint, **18 distinct checks pass and one recovery regression
fails**. F1 remains open pending that repair; this is not integrated-product,
real-service, model-quality, notification or physical-device acceptance.

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
| Unknown operation | An execute conflict remains fenced through unresolved readback. A later authoritative saved-user result enables only the original-user Retry; no ordinary prepare/execute fallback occurs. The separate pending-execute recovery defect below remains open. |
| Source change or loss | An edit during preparation retires review. Unknown exact-source read hides the body, preserves the explicit chosen ID and requires fresh review. Successful one-reply use clears choices rather than silently reusing them. |
| Session, revision and detail entry | Consent withdrawal and same-UID replacement retire selection and late prepare results. Captured Confirm/Exclude cannot approve a newer unseen revision. Explicit detail entry adds only its requested ID beside existing choices and keeps the draft. During unknown execution it performs no attach/read until authoritative no-effect plus another explicit tap; an old session's attachment cannot replay. |

These are source, repository-double and widget observations. QA did not rerun
App's 389-case author batch, the six pure presentation cases, or the Backend,
Emulator and model ledgers. Their counts are not combined with these results.

## P2 open — selected execution can strand fresh review after recovery

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
QA has not yet executed a repaired head. Integration requested that the
candidate not be built before this issue is resolved.

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
replace only those fixture verdicts. The distinct current outcome is **18 Pass /
1 Fail**, not 21 independent cases or a completely green F1 gate.

## Evidence and handoff

Private directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/root-a20927c/`.
The source manifest, command/result JSON, versioned test overlays and full logs
preserve the exact inputs and failure history.

| Artifact | SHA-256 |
| --- | --- |
| `qa-f1-targeted-baseline.log` | `9fe331a441e7d9bad34bd2f4598ce3601f6780cb41efce4196466734e854c7f9` |
| `qa-f1-shared-entry-v2.log` | `5293eac0b4733acdbdc88d86067cff332f37859ec5bbac9d146c1cf54eba88fe` |
| Private `qa_f1_deadlines_recovery_test.dart` | `fbe6d675017e01ce63cc98c5392744593ec4f431b85e4b4e24e90dd5a6eee351` |
| First shared QA overlay | `661ab1ec26e85271496afb794db3ec06918e34a13e8c6e18b33ce5e3ac3a93da` |
| Final shared QA overlay | `c773d9806b252f2ffb13ab7f15c78655aa958d2cb1431a9e2d66e485900ed1c5` |

QA returned the Flutter window to Integration immediately after the two shared
checks and reported the open defect to Integration, App and Product. A repaired
frozen head needs only source-difference review and focused execution of the
original failing counterexample and any materially different recovery branch.

Integration separately reported clean full analysis and 1,348 passes / 62
failures in the complete historical Flutter directory. Its remaining fixture
and regression classification is owned by Integration/App; it is neither
overridden by this focused result nor independently certified here. All prior
semantic, service and physical-device evidence retains its original scope.
