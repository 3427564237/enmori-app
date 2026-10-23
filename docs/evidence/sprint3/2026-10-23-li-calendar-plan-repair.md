# Calendar statistics repair and small-plan diagnosis

Date: 2026-10-23, Asia/Singapore. Scope is the
[LI repair decision](../../decisions/2026-10-23-li-calendar-plan-repair.md),
following the [v25 device findings](2026-10-23-li-group-v25-device.md).

## Current disposition

- **Calendar: source repair complete; 14 relevant local checks pass.** The
  aggregate now orders `createdAt` descending, reusing the existing history
  index. Owner binding, civil-day bounds, transaction scope and count semantics
  are retained. No index change, migration or data edit is required by this patch.
- **AI plan relevance: unresolved.** Three initial prompt candidates and the
  subsequent authorized configuration/message-handling diagnostics did not
  produce a candidate that passed the complete synthetic model examples. All
  candidate product changes were withdrawn; the original transport remains.
  The new test protects complete
  message/history forwarding and a single unmodified model response; it does
  not assert that a real model understands the goal.
- **Final local verification: TypeScript build and 19/19 targeted tests pass.**
  No phone interaction, installation, APK build, account-record read/write,
  shared service restart, deployment, dependency change or index deployment was
  performed in this repair round. The installed v25 and earlier device evidence
  remain separate from this source result.

## Calendar cause and verification

The earlier device investigation demonstrated that the current count query
failed with Firestore `FAILED_PRECONDITION` / missing index, while the same
owner/day query with descending `createdAt` succeeded. The existing checked-in
index has `ownerAccountId ASC`, `createdAt DESC`, `__name__ DESC`.

The new regression uses the actual Firebase Admin SDK's query construction,
with a fake transaction and a synthetic owner. It checks query equality against
the indexed owner/range/descending aggregate and verifies the approved index is
still present in `firestore.indexes.json`. Both a bounded day and the nullable
upper bound fail before the product change and pass afterward. The test never
connects to Firestore or loads account credentials.

The 14 calendar/history checks also cover authorized owner scope, binding and
onboarding rejection, civil-day/DST/skipped-day ranges, malformed dates/zones,
history ordering, cursor authority/expiry and opaque cursor integrity. Real
Firestore and phone calendar acceptance were not repeated this round.

## AI diagnosis and retained failures

The existing small-plan review already sends the full goal and limits. Local
adapter inspection and the new forwarding test preserve the current message,
authorized history order, one inference, the original reply bytes and existing
resource limits. No hidden input extraction, keyword rejection, fallback reply
or automatic retry was introduced.

Fresh synthetic probes used the actual `LocalChatTransport` and local
`qwen3.5:9b`, with no Firebase client, app route, credentials or account IDs.
Each probe was independent of the earlier device operations. In the initial
prompt round, the model stayed
at `think:false`, 8192 context, 512 output-token cap and the existing sampling
defaults. A 45-second delivery deadline and the transport's unknown-outcome
handling were retained. No historical operation was resent.

| Experiment | Observation | Disposition |
| --- | --- | --- |
| Original transport, English goal requesting Chinese reply | Treated a device-test label as a task and asked which device to verify before supplying the rest plan. | Reproduced the reported relevance defect. |
| Original transport, Chinese goal | Added reflection on testing/study to a requested quiet break. | Reproduced background becoming a task. |
| Candidate 1: goal/constraints instructions in initial system message | Still included device checking. A second probe was not delivered; the first diagnostic harness did not retain the exact exception/provider body. Its cause is undetermined, not proven to be JSON failure. | Rejected; failure retained. |
| Candidate 2: more explicit goal selection and a general example in initial system message | English label case still proposed verification work; a correction still proposed reviewing study content. | Rejected. |
| Instruction-position controls | A synthetic prefix instruction was ignored in the initial system message, including short and leading-instruction controls, but followed in a user-message control and in a trailing system message. | Evidence of instruction-position sensitivity; not proof of an Ollama renderer defect. |
| Candidate 3: same goal guidance in a trailing system message | English correction returned to a break and recalled the marker. Chinese case still invented that the user studied the test marker; other cases did not consistently supply the requested timed plan. | Some improvement, but full case set failed; rejected and withdrawn. |

The final candidate's four cases were:

1. Original English small-plan request, test label and quiet 15-minute break,
   Chinese reply: rest was now the focus, but confirming the label became an
   unnecessary step.
2. Chinese small-plan request with a different test label: the model invented
   that the label was something the user had studied. **Relevance/factuality
   remained failed.**
3. English correction of the historical misreading: no device or study task,
   marker recalled; three steps were supplied without explicit time allocation.
4. Actual software-testing goal: remained on that subject, but only asked for
   more implementation details rather than providing the requested checklist.

All four candidate-3 provider requests completed with `done_reason:stop`,
non-empty JSON responses, `pending:false` and `outcomeUnknown:false`, in
2.6–5.0 seconds. Completion and transport validity do not establish semantic
acceptance. The earlier single non-delivery remains recorded separately.

The current local Ollama reported version `0.40.4`, model digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`,
and sampling defaults `temperature:1`, `top_k:20`, `top_p:0.95`,
`presence_penalty:1.5`. Stored defaults were only read, not changed. The
[official Qwen model card](https://huggingface.co/Qwen/Qwen3.5-9B#best-practices)
lists a different general-task non-thinking sampling profile; it informed the
subsequent synthetic comparison below, not an accepted fix. The
[Ollama 0.40.4 renderer source](https://github.com/ollama/ollama/blob/v0.40.4/model/renderers/qwen35.go)
supports initial and later system messages, so a successful trailing-message
control alone does not justify changing provider infrastructure.

After three failed fixes, the repository's
[debugging workflow](../../../.agents/skills/systematic-debugging/SKILL.md)
requires discussion of the approach before another fix. LI selected continued
diagnosis with the existing model. That decision is recorded in the repair
decision, and the authorized follow-up is below.

## Authorized follow-up: existing 9B configuration and message handling

These were isolated per-request diagnostics through an injected HTTP boundary,
not running-service configuration changes. They kept the same model weights,
8192 context, one request at a time, current-message/history content and
45-second delivery deadline. The explicitly noted 1024-token probe changed only
that synthetic request's limit; the product still uses 512. None of these
experimental settings, draft strings or provider fields was adopted.

| Comparison | Evidence and result |
| --- | --- |
| Model-card general non-thinking profile (`temperature:0.7`, `top_p:0.8`) | Corrected English reply followed the break goal; original English request still scheduled device checks, and Chinese text still inferred study of the test label. |
| Deterministic sampling (`temperature:0`, `presence_penalty:0`) | Corrected reply improved, but the original English case still became device verification and Chinese text still inferred learning the label. |
| Native thinking, 512-token cap | Provider completed at `done_reason:length` with 512 tokens and empty final content in 18.6 seconds. This was token exhaustion, not an unresolved operation or delivery timeout. |
| Native thinking, synthetic 1024-token cap | First two outputs still included unrelated work or materials; the correction reached 1024 tokens with no final content in 36.7 seconds. Raising capacity did not establish a fix. |
| Stronger editable-draft wording, with default and deterministic sampling | Chinese goal improved; English wording still associated the break with device validation or turned the marker into work. Draft changes existed only in synthetic fixtures, not Flutter sources. |
| Goal guidance plus deterministic sampling; explicit ambiguity/clarification guidance | Chinese and correction cases improved, but the original English case still combined verification with rest. The instruction to clarify did not reliably prevent this. |
| Provider-only intent/quoted-activity fields | Sometimes selected the desired break, but still scheduled thinking about the test marker or selected the verification label as the goal. These experimental envelopes would need adapter work before use; no provider/API/data contract was changed. |
| Plain JSON output mode instead of schema-constrained JSON | Original label cases and the correction still included device work or reviewing notes. Output-mode selection did not resolve relevance. |

Across both rounds, the private harness recorded **58 fresh synthetic inference
requests**: 55 returned non-empty JSON to the diagnostic harness and three were
not delivered. Two non-deliveries are confirmed token-limit exhaustion above;
the initial one remains undetermined. All 58 ended with the adapter reporting
`pending:false`, `outcomeUnknown:false`. No original operation was retried or
replaced, and no inference result was saved into an account conversation.

The English fixture placed “V25 device verification” in the same free-text goal
section as the explicit wish for a quiet break. This helps explain why the model
combined activities, but it does not excuse the unsupported Chinese inferences
or incorrect follow-up. The conclusion is bounded: the tested configurations and
message approaches are insufficient to claim this defect fixed. It is not proof
that every possible use of this model fails, or that another model must be used.

The calendar source patch is independently reviewable. Further AI product work
needs a clearly supported approach; a goal-confirmation interaction or model
replacement was not silently introduced. The current product prompt, sampling,
output format, native thinking setting and generation cap remain unchanged.

## Reproduction and artifact identity

Base checkout: `8b5fdac9212fad78ab869fcc22df5a4ee49ecc5e` on
`souma/product-integration-20261023`, plus the calendar patch and tests.

- Calendar adapter SHA-256 after repair:
  `37e0b75ede529b4825c11874084dde696c234c9898db904cdeaba4d47c480068`.
- AI adapter SHA-256 after withdrawing candidates, identical to original:
  `d50b31412a5754ace1b5e2023ee540d1f1054071854b2b12723ac39dbbf8434d`.
- Verification used existing Node `24.19.0` and the existing pinned TypeScript
  dependencies. Local compilation outputs are isolated in this checkout.
- Test targets: `check-ins/calendar-index.test`, `check-in-calendar.test`,
  `check-ins/check-in-history.test`, `simple-chat.test`.
- The new AI forwarding test is a deterministic fake-provider boundary test.
  Real-model probes are manual diagnostics, not part of the ordinary test suite.

Private local synthetic diagnostic records, all failed candidates, harness and
test output are retained under
`~/.local/state/enmori-calendar-plan-repair-20261023/`. The final test output is
`local-tests-final-reverted.txt`; model records retain `before`, `after`,
`after-2`, `after-3`, instruction-position controls and every follow-up comparison.
`probe-summary.json` records counts and settled states. Original v25 device
records are untouched. No real account content or credentials are included here.
