# App F1a and Check-in entry independent Product review

25 October 2026 · Product / UX · source inspection only, no Flutter execution.

App checkpoint: `ee448278bce86766238f2b049b0822e21c5540ad`, parent
`af2a79c994a1f80be520dd0d434026656e374650` (Root's pure review panel as an App
cherry-pick). Product read its nine changed files from an immutable Git archive.
Shared entry checkpoint: `a20927c063b9ef20e38fa8fdac7b252f54c60bda`, including
App cherry-pick `721a253`; Product separately read the four shared implementation
files and two added route cases. Source locations below refer to these exact
checkpoints, not a moving worker checkout.

Authority remains [LI's first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md),
[the interaction specification](interaction-spec.md), and the approved
[history-exclusion handoff](history-exclusion-handoff.md). The repository
Flutter/Dart review checklist supplies a workflow, not new requirements.

Current disposition: the P2 below is **Closed within source, repository-double
and widget scope** following the independent fixed-head checks recorded at the
end of this review. Its original failure and intermediate pending dispositions
remain historical evidence; this is not full integrated or device acceptance.

## P2 — invalidated pending Send can leave selection permanently busy

**Open at `ee44827` and its `a20927c` integration.** App reported this during its
post-freeze self-review. Product independently confirmed the source path; Product
has not executed an old-head widget counterexample.

1. `ai_selected_sources_providers.dart:637–646` sets both `_sending` and
   `_recoveringSelected` when the explicit selected Send is admitted.
2. At `180–191`, a foreground/source-access change replaces `_epoch`, clears
   displayed records and pending review, and clears `_busy`, but retains
   `_sending`.
3. The original Send await at `664–667` returns early when that epoch changes,
   before clearing `_sending`. Original-operation readback reporting no-effect
   or user-saved does not enter the success-only listener at `162–168`.
4. `review()` at `535–537`, confirmation at `598–606` and `canSend` at
   `623–634` therefore continue to reject the selection even after the original
   operation authoritatively permits a fresh Send or the exact saved-user Retry.

Counterexample: explicitly send a reviewed selection; while execute is pending,
background/cancel and resume, or invalidate source access; use the original
operation GET and receive no-effect; then attempt a fresh review with the
preserved draft and selected IDs. The stale local sending flag blocks recovery.
Accepted assistant-saved readback can clear it, but that does not repair the
no-effect/user-saved paths.

The repair must release the obsolete local sending display state while keeping
the original unknown-operation barrier, exact selected IDs, matching draft and
recovery identity. Background/resume, cancellation or source invalidation must
not itself reprepare, resend, clear the original operation or manufacture a
no-effect result. App is preparing a separate increment; the original head and
finding remain recorded. Integration and QA received the source anchors and
the focused recovery counterexample.

## Other inspected boundaries

No additional blocking source finding was identified in this bounded review.
That conclusion does not close the P2 above or claim independent execution.

| Boundary | Observed implementation and exact source anchors |
| --- | --- |
| Explicit bounded selection | `ai_selected_sources_providers.dart:18–46,224–255,345–486` projects only ID, Note, recorded Mood/Activity, original time and revision into RAM. Defaults are empty, the sixth choice is rejected, and eligibility is inclusive now minus seven days through now. Eight UTC date first pages cover the rolling window; more pages require an explicit cursor action. Failed dates/cursors remain partial/unknown, with existing rows retained. |
| Fresh source review | The same file at `488–595` rereads the exact selected owned IDs before and after preparation. Missing/unknown reads remove their retained body but preserve the selected ID for recheck/removal. A changed Note, recorded tag, timestamp or revision invalidates confirmation. Prepare sends source IDs, not client quotations or invented authority. |
| Private preparation and expiry | `ai_conversation_providers.dart:377–553` keeps token and operation ticket private. Public selection state receives sanitized metadata. Remaining time is the minimum of the original monotonic 15-second budget and both absolute expiries. Send uses the original token/ticket, validates the current revision/key membership and does not prepare again or refresh credentials. Expiry retires confirmation and keys. |
| Explicit history exclusion | `ai_selected_sources_providers.dart:527–595,688–697` captures only the explicitly displayed complete pairs, prepares afresh, and maps that intent to fresh keys only when user/assistant IDs and sequences still match. A changed set clears exclusion and confirmation. An ordinary refresh does not inherit exclusion. The App submits only current keys; the server owns dependency closure and no-backfill enforcement. |
| Confirm and Send | `ai_selected_sources_page.dart:128–180` binds Confirm/Exclude/Refresh to the displayed revision and current route/session. Confirm returns to the draft; it never executes. Composer `_submit` uses the current editor lease and selected controller's current readiness. Only the separate Send/Retry action transfers the prepared selection to execution. |
| Original-operation recovery | `ai_conversation_providers.dart:556–763,945–1025` transfers selected execution into the existing dispatch/cancel/readback machinery. Conflict or unknown does not grant another Send; original GET can establish no-effect, exact saved U for Retry, or accepted assistant pair. `ai_selected_sources_providers.dart:151–168,637–684` retains selection through reserved-topic/no-effect identity changes. The P2 above is the remaining local busy-state defect in this path. |
| Draft and privacy fences | `ai_conversation_providers.dart:801–808` clears only a draft still matching the accepted selected submission. The source controller separately retires bodies/review on content invalidation and clears selection on auth/consent loss or an explicit new topic. Page editor ownership preserves the current `TextEditingValue` across stacked AI pages and rejects a covered page's captured Send. |
| Explicit detail entry | At `a20927c`, `SavedCheckInPage._referenceInAi` rechecks the current exact saved record, foreground and top route. `AiCheckInNavigation` carries an ephemeral ID plus the exact authenticated session; the shared route rejects absent/foreign session extras. Composition supplies the current AI session key. Destination `_openReferences` in App rereads that owned ID without replacing existing choices, draft or topic. During an unresolved operation, attachment waits for safe original readback and another explicit tap; an old same-UID session stamp cannot replay it. |

The picker displays current Note as quotation and labels Mood/Activity as
recorded. Location, coordinates, weather, private provenance and opaque keys are
not rendered as reference facts. Saved source cards remain separate from this
one-reply selection. Successful accepted execution clears the local selection;
there is no later automatic source reuse in this reviewed path.

## Evidence and remaining gates

Product read the 25 new F1 controller/page cases, including narrow English and
Chinese at 320px and 2x text, stale callbacks, exact original-token use, time
boundaries, source edit/authorization failure, partial cursors, fresh history
keys, unknown/user-saved/no-effect recovery, detail intent and stacked-page
draft ownership. Their visibility helpers require a reachable hit-test target;
these are meaningful authored scenarios, not Product-executed results.

App's final author log was read and its SHA-256 verified:
`002babf00e62b0f9222f5b34fc67b1d21dda8e2c284ac32d9de5211a0648e816`
at `/home/miku/.local/state/enmori-ai-companion-20261025/app-f1-final.log`.
It contains **389/389** passing AI/proactive cases and clean four-directory
analysis in 11.8 seconds. App records that two final formatting-only braces
followed the test run; analysis then passed. The original four failures and
intermediate 15/19/385 checkpoints remain in App's evidence and are not added
together or relabelled as new independent checks. Those 389 do not cover the
subsequently identified P2 counterexample or prove Root's full integrated suite.

Product ran no Flutter, service or model request and did not occupy the shared
validation window. Root owns integrated source/widget execution; QA owns its
independent frozen-head counterexamples. Shared routing, backend/model quality,
D1 notification delivery, APK/device, UAT, Release and Done remain separate
evidence layers. This review changes no model-quality result and grants no
deployment, cloud-data or physical-device acceptance.

### Independent QA execution — original a20927c

Product subsequently read QA's frozen evidence commit
`982df029cab78514ce4c099e665ed2edcb9a96f1`, file
`docs/evidence/ai-companion-20261025/qa-f1-app-integration.md`, and verified both
reported log hashes under QA's `qa-review/root-a20927c/` local directory.
Production stayed at `a20927c`; the record declares its test-only overlays.

QA independently executed the pending-execute/background/cancel/resume counterexample
above. Unresolved original readback kept the barrier; a subsequent authoritative
no-effect made conversation `canSend` true, but explicit review still left the
selected prepare count at one instead of two. **The P2 remains Open.** This is
now independently reproduced widget evidence, attributed to QA, not Product
execution. No duplicate execute or unauthorized source use was observed in that
counterexample.

The initial batch was **16 Pass / 3 Fail**: 13 selected feature cases plus three
independent deadline cases passed; the genuine P2 and two QA-added route-body
assertions failed. The route fixture intentionally returned 503 for all eight
date-list GETs, so those added body assertions did not match its expected unknown
state. QA retained that first overlay/log and changed only those assertions to
require the visible picker, selected exact ID, hidden unverified body, eight
failed partitions and unknown notice. Existing no-write, exact-session and
covered-callback checks remained. The two focused route reruns passed **2/2**.
The distinct result is **18 Pass / 1 Fail**, not 21 cases or a green F1 gate.

Verified SHA-256 values: original `qa-f1-targeted-baseline.log`
`9fe331a441e7d9bad34bd2f4598ce3601f6780cb41efce4196466734e854c7f9`;
corrected `qa-f1-shared-entry-v2.log`
`5293eac0b4733acdbdc88d86067cff332f37859ec5bbac9d146c1cf54eba88fe`.
These cases are not added to App's 389, Root's six panel cases, or integrated
historical-suite results. QA returned the exclusive Flutter window to Root;
the repaired head still needs the original failing counterexample rerun.

### Focused source repair — 9bc571c

Product independently inspected all three files of
`9bc571c38eeb9472b8f37128244b64862186f319`, parent `ee44827`.
**The reported local-state cause is addressed in source; independent repaired-head
widget closure is pending.** The original executed failure and counts above
remain unchanged.

The only production behavior change is `_sending = false` in the content-access
retirement listener. Its two comments explain why the old await cannot clear a
new epoch's view state. `_recoveringSelected`, original operation identity,
unknown-result guard, draft and selected IDs are unchanged. `review()` still
requires the conversation's `canSend` or `canRetry`; an unresolved original
operation cannot acquire a new preparation merely because the local display flag
was released. The existing epoch check still rejects the old Send continuation.

Product read both added cases: foreground source mutation and background/resume,
each with a pending selected execute, explicit original Cancel, blocked review
while unknown, authoritative no-effect, a fresh unconfirmed review, an inert late
old response and another explicit confirm/Send. Product verified the author log
`app-f1-access-recovery.log`, SHA-256
`da1f2e8c92d9c926e8d91a92afe80a73fb51230f72c28851641b06fee4eff55e`, containing
**2/2** passes and clean two-file analysis in 3.8 seconds. App did not rerun its
389-case batch for this increment; these two cases are not added to that count.

Product sent the source disposition to Integration and QA, including the
original failing no-effect counterexample and the distinct saved-U Retry terminal
path for focused independent verification. Product ran no Flutter. App's separate
legacy-fixture maintenance is outside this three-file repair and this review;
neither it nor Root's full-suite status is certified by the focused source fix.

### Independent P2 closure — exact 6b4ec58

QA froze the closure in `dc1704117ea00b77a031d046d8850d7e46583bbf`, parent
`982df029`. Product read its three QA-document changes, including the complete
repair disposition in `qa-f1-app-integration.md`, before recording this closure.

QA independently reran the original no-effect counterexample and added the
saved-user recovery branch on Root
`6b4ec589c49fc7edf43a4654421c757d2435c9e5`. Product verified that the four relevant
F1 production files match App `9bc571c`, and the later Root
`8d5a7240e7a69fbc3d0ae6249e525f37973d33df` has no `lib/` difference from that QA
head. Product also checked all 412 original files against QA's frozen manifest:
zero mismatches. The additional QA tests are private overlays, not production
changes. Product did not run Flutter.

The first fixed-head run ended **0 Pass / 2 Fail** because the private fixtures
disposed their provider containers after the widget binding checked pending
timers. Product read both before/after diffs: only `addTearDown(r.dispose)` was
replaced by `try/finally` with explicit dispose and pump; business assertions
were unchanged. QA retained that failed log. Product verified the corrected
original counterexample file is byte-identical on old and repaired snapshots.
It fails again on original `a20927c` at the same second-prepare assertion and
passes on `6b4ec58`; the fixed-head pair is **2/2 Pass**.

- Original no-effect path: unresolved original GET still blocks new work;
  authoritative no-effect retains draft and choices, then admits a new review
  with confirmation false, no automatic execute and no ordinary fallback.
- Saved-U path: unresolved readback remains fenced; authoritative user-saved
  enables only Retry, and the fresh selected preparation names that same U.
  A late old execute response cannot replace the new review or draft. Ordinary
  send/retry calls cannot bypass held selected preparation. Explicit confirmation
  and selected Send leave exactly the original user message, no ordinary
  preparation/execution, and clear the accepted matching draft and selection.

Verified logs under `/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/`:

| Artifact | SHA-256 |
| --- | --- |
| `root-6b4ec58/qa-f1-recovery.log` — retained fixture failure | `9ae0a389ac32c433fd8e302b2e3b51f16805bd084534ee6de449719325485c19` |
| `root-a20927c/qa-f1-recovery-red-v2.log` — same corrected old-head counterexample | `38e7f7ff6ce55b9d977394e7d84afd0af0a8753c41ccafd256ee5489d24d6530` |
| `root-6b4ec58/qa-f1-recovery-green-v2.log` — both repaired-head paths | `172e1f74a985d0daec90064806ac136bd94b00562f89f5111fe28218f5c53f61` |

**P2 Closed within source/repository-double/widget scope.** QA returned the
exclusive Flutter window immediately. The earlier 18 passing checks remain at
their original head; they were not repeated or renamed as 20 newly executed
checks on the repair. App's 389 batch, its two repair cases, separate harness and
historical fixture work, Root's complete suite, model/service and physical-device
acceptance retain their own evidence and unresolved gates.
