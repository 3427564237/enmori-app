# ZHOU — small-plan diagnosis and bounded LI verification handoff

Date: 26 October 2026 (UTC+8). Reviewed integration baseline:
`2cfbc8f2ea8b111ffa82cd6609c2090d28a08744`.

This is a source and existing-evidence review. No model request, service restart,
configuration change, phone operation, product-data read/write, prompt change or
new evaluation tool was performed for this record. No small-plan semantic repair
or acceptance is claimed.

## Applicable scope

- [Current Zhou work package](../../planning/2026-10-25-v29-next-round-team-prompt.md#zhou复杂-ai-陪伴闭环)
  requires a reproducible explanation and a minimal repair or concrete
  simplification choice, rather than unbounded prompt tuning.
- [23 October repair decision](../../decisions/2026-10-23-li-calendar-plan-repair.md)
  requires replies to follow the actual goal and constraints. It prohibits new
  content-rejection filters, automatic retries, private-context reads and
  synthetic fallback answers. Its follow-up preserves three unsuccessful prompt
  candidates and allows further diagnosis of the existing model/configuration
  and message handling; changes need fresh supporting results.
- [Small-plan product decision](../../decisions/2026-10-23-li-ai-product-round.md)
  defines a local goal/limits composer, review, application to the editable draft
  and explicit ordinary Send. It does not promise a successful model plan.
- [Local-chat simplification](../../decisions/2026-10-19-li-ai-mvp-simplification.md)
  and the later authorized source contracts retain existing request/result,
  consent, history, Persona and unknown-operation boundaries. The old finite
  routine-summary strategy is not the active ordinary-chat strategy.

## Preserved failure and reproducible conditions

The authoritative evidence for the previously observed model behavior is the
[independent 24-case semantic review](../ai-companion-20261025/qa-model-review.md),
bound to Runtime source `24f913dd26afa9af82f7c31ac9eefcf543b64140` and the
[original run record](../ai-companion-20261025/runtime.md#independent-semantic-result--12-pass-12-fail).
It remains **12 Pass / 12 Fail / 0 unreviewed**. The preserved first 16 cases are
6 Pass / 10 Fail; the additional eight ordinary-chat cases are 6 Pass / 2 Fail.
All 24 had matching terminal responses, but only 23 were protocol eligible.
These counts are historical, not a new execution on the reviewed baseline.

| Fixed case | Existing observed failure | Reproduction input/criterion |
| --- | --- | --- |
| `reported-english-goal-chinese-reply` | Rest becomes device-verification/study work; Cedar25 is treated as task content. | Original quiet-break goal, test label and requested Chinese/three steps. |
| `correct-previous-misreading` | After explicit correction, the response still asks for study notes and closing books. | Original earlier pair plus correction; preserve the requested English, marker, 15-minute rest and no-equipment/no-spending constraints. |
| `labelled-desk-goal` | A final two-minute slot contains a five-minute break. | Original ten-minute desk plan and unchanged timing criterion. |
| `actual-study-goal` | A further user turn is fabricated, then the response truncates at the fixed 512-token cap into invalid JSON. | Original real study goal; preserve the failed/ineligible result in the denominator. |
| `genuine-test-with-marker` | The model advises clearing cache/data despite an explicit preservation instruction. | Original actual language/reopening test, Willow57 and preserve-existing-data instruction. No suggested deletion was executed. |

Inputs and criteria are preserved in
[`preserved-small-plan-cases.json`](../../../tool/ai-companion-eval/fixtures/preserved-small-plan-cases.json).
The preserved corpus SHA-256 recorded by the existing tool is
`837d0a2076e86736e9e46f9d950ff0bcaaec1e1f10c825bf6aee9476e281311b`.
This review independently confirmed that hash from the baseline Git blob. The
Windows checkout uses `core.autocrlf=true`; its CRLF working-file bytes have a
different hash. That checkout conversion is not a changed corpus or permission
to update the expected historical hash. LI's byte-bound run must use the exact
canonical fixture bytes and record the actual hash before dispatch.

Raw original provider outputs are not in this Windows worktree and were not
read or copied during this review. The earlier evidence places them in LI's
owner-only host directory
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/local-baseline-24f913d/`.
Original report SHA-256:
`5b46f17e1785edc9f5f562ad3e6e0f36e1998ca0597a75df888df2a97024a0e9`.
Original manifest SHA-256:
`35324835e79ac3099fcd7bb819d1241c3b312037216741505344ea191c55cb8b`.
The independent review and its artifact bindings remain the source for those
judgments; this record does not recreate or replace the original raw evidence.

## Source trace and root-cause boundary

The active ordinary-chat path is
[`LocalChatTransport`](../../../backend/src/ai-runtime/infrastructure/local-chat-transport.ts)
through the shared
[`LocalModelLane`](../../../backend/src/ai-runtime/infrastructure/local-model-lane.ts).
It uses native `/api/chat`, `stream:false`, `think:false`, the existing 8192
context and 512 output settings, and the existing complete JSON response shape.

Source inspection confirms that the transport emits the supplied earlier pairs
in order as user/assistant turns, followed by the complete current user message.
It does not extract a test label as a separate goal, synthesize a further user
turn, substitute a fixed plan, or translate/rewrite direct input. Authorized
Check-ins are separately quoted dated data; selected-source and reply-association
projections do not become extra history pairs. Thus no source-level omission or
reordering was found in this serializer to explain the reviewed failures. This
does not prove every deployed request was delivered unchanged or identify an
internal model cause. The earlier QA's complete production-request capture is
separate historical execution evidence.

The previously observed label/goal confusion, failure to follow a correction and
inconsistent timing are model-output findings. The known `done_reason:length`
case establishes output truncation for that case, not the cause of the other
failures. Neither valid JSON nor a source/fake test proves semantic relevance.
There is no source-supported runtime fix to apply from this diagnosis alone.
Changing prompts, sampling, token limits, models or filters without a new
controlled comparison would not establish a repair.

The lane review also found the existing intended recovery boundary intact:

- A matching model `done:true` releases physical ownership. Unusable reply
  content can then fail the existing application parser without blocking the
  next independent consumer.
- HTTP/socket failure, malformed/missing terminal evidence or a different model
  leaves the lane pending with an unknown outcome. It does not authorize replay.
- Business cancellation/deadline revokes delivery but continues observation of
  the original physical response. Chat, Persona preview and follow-up share
  that lane; one consumer cannot release another's running invocation.

These are source-review conclusions supported by the existing
[`local-first-flow-transport.test.ts`](../../../backend/test/ai-runtime/local-first-flow-transport.test.ts)
and
[`selected-context-transport.test.ts`](../../../backend/test/ai-runtime/selected-context-transport.test.ts)
cases. This reviewer did not execute them or call a model. Any new test results
must be attributed separately in the final Zhou delivery evidence.

The [26 October runtime-recovery record](../../handoff/2026-10-26-v30-ai-runtime-recovery.md)
already records LI's confirmation that references off and on both reply. That
bounded confirmation does not resolve small-plan semantics; the two modes
should not be reclassified as currently broken on the basis of older failures.

## One bounded real-model verification packet for LI

Use the existing [evaluation workflow](../../../tool/ai-companion-eval/README.md),
without adding another runner or editing its fixed fixtures. The following is a
handoff procedure, not an instruction to use an expired slot or a record that a
new slot has already been assigned.

1. LI records the exact candidate source HEAD, compiled/source hashes, unchanged
   lockfile and approved Node 24.19.0, together with a specific exclusive local
   model slot. Check the current shared lane and previous physical operations;
   if any outcome is unknown, stop before dispatch rather than clearing it,
   restarting around it or replaying an old operation. Read back the existing
   model identity/configuration. Do not change parameters or models to obtain a
   pass. If a cold model needs an empty preload, explicitly include one in that
   slot and record its original terminal result separately.
2. Compile this exact candidate with the existing pinned dependencies. Confirm
   that the existing serializer/corpus capture tests pass; retain their result
   as source/protocol evidence only. On LI's controlled host, select a new
   owner-only output directory outside Git, as required by the existing runner.
   Do not reuse the old raw-output directory.
3. Run **one** serial pass over the existing 24 current-prompt cases, using the
   real newly assigned slot reference. This sends fresh synthetic diagnostics,
   not application operations or historical operation IDs:

   ```sh
   node tool/ai-companion-eval/run.mjs --provider local --authorization '<actual LI-assigned slot reference>' --out /absolute/owner-only-parent/new-zhou-local-run
   ```

   The existing runner makes at most 24 calls, applies its 45-second eligibility
   and 120-second receive boundaries, and stops on an unconfirmed outcome.
   Preserve that stop and any missing cases. Do not resume, retry a failed row,
   run the eight candidate-context cases, invoke cloud/Gemini or rotate prompts.
4. Preserve every request, response, manifest and report privately. Have an
   independent reviewer assess the complete original criteria in
   `review-template.json`, using the existing `review.mjs` binding validator.
   Report the full intended denominator, per-case verdicts and unreviewed or
   ineligible cases. Specifically compare the five failures above and the
   genuine-study/genuine-test controls; do not select only improved examples.
5. Attribute the result to this new source and slot. Keep the original 12/12,
   earlier prompt failures and later follow-up results separate. Even a complete
   new pass does not establish service storage/readback, automatic-today-to-model
   behavior, phone acceptance, UAT or Release. Ordinary application send → save
   → independent readback remains a separate LI verification packet and must not
   be inferred from this non-persistent runner.

## Concrete non-core simplification choices — proposed, not adopted

| Choice | Concrete scope and benefit | Tradeoff / boundary |
| --- | --- | --- |
| Retain the current helper as a draft aid while keeping semantics unverified | Keep goal/limits → review → editable composer → explicit Send; do not present source/widget success as proof of a good plan. This needs no model/runtime change. | Preserves the guided entry but does not fix the known model failures. A future product-copy change would need its own concrete review. |
| Temporarily remove only the small-plan shortcut and its helper entry | Users can still describe a plan in ordinary editable chat. This removes a non-core guided surface while avoiding a special-purpose quality expectation that the current model has not met. | Loses the goal/limits form and its review convenience. Existing drafts, saved messages/history, search, unknown-result recovery, ordinary chat and authorized automatic-today references must remain. No deletion of user data or replacement canned answer is implied. |

Neither option is implemented by this record. The first is the current behavior,
with accurate limits; the second is a concrete simplification for LI to select
if useful. No new prompt, output rewrite, model/configuration change, content
filter, automatic retry or fallback is proposed as a proven semantic repair.
