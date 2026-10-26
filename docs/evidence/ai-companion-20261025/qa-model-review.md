# Independent semantic review — fixed local 24

25 October 2026. QA reviewed all 24 complete synthetic inputs and raw model
outputs from Runtime's one authorized run at
`24f913dd26afa9af82f7c31ac9eefcf543b64140`. Result: **12 Pass, 12 Fail,
0 unreviewed** against the individual criteria and five review dimensions.
The small-plan semantic gate remains **Fail**. This is actual local-model
evidence (M), not deployed-service, app, storage, cloud, notification, phone or
integrated-product acceptance. QA made no model calls and did not change prompts,
parameters or original evidence.

## Run and evidence binding

The run used the current production serializer with synthetic messages, existing
two-pair history and Persona where supplied: Qwen `qwen3.5:9b`, context 8192,
output 512, thinking false, Node 24.19.0. Runtime's preflight recorded Ollama
0.40.4 and model digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`.
That digest is metadata observed before the run, not a new model binary audit.

Generation ran 06:22:56.578–06:25:19.622 UTC. The separate empty preload is not a
25th evaluated case. All 24 responses had a terminal `done:true`; no unknown
outcome was hidden. **23/24 were protocol eligible**. `actual-study-goal` reached
the output limit with `done_reason:length` and invalid JSON, so the runner exited
2. It remains in the denominator and failed semantic record. All 24 observed
responses arrived within 45 seconds. Independently computed median is 4.1215 s,
nearest-rank p95 12.4966 s, maximum 27.6998 s. Reported usage totals are 3,583 input
and 2,584 output tokens. Local host cost was not measured; it is not a USD 0 cost
claim. The manifest's Gemini price snapshot does not price this local run.

QA independently verified:

- All 51 original artifact file hashes, exact case order and the original
  preserved-16 corpus hash; 8 source hashes at the exact Git commit and current
  frozen files, 4 compiled hashes, and the unchanged lockfile hash.
- All 24 saved fixtures against the corpus, prompt projections against a fresh
  fake-HTTP capture of the production serializer, and complete provider request
  bodies against that capture. The QA process disabled global network fetch.
- All 24 request hashes, response files, report rows, raw provider content,
  terminal model identity and protocol assessments.
- A separate QA-owned review copy with every result-row hash, all five scores,
  rationale and input/output evidence. The author's `review.mjs` validator
  returned 12/12/0 with `incomplete:false`, exit 0. Validation establishes binding
  and completeness; the judgments below are QA's independent assessment.

Original files remain unchanged under
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/local-baseline-24f913d/`.
QA-only audit/review files are under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/local-24f913d/`.
Raw model output is not copied into Git.

| Artifact | SHA-256 |
| --- | --- |
| Original `report.json` | `5b46f17e1785edc9f5f562ad3e6e0f36e1998ca0597a75df888df2a97024a0e9` |
| Original `manifest.json` | `35324835e79ac3099fcd7bb819d1241c3b312037216741505344ea191c55cb8b` |
| QA `semantic-review.json` | `9557171a8256cafbb0a3c14b29f228e867c21cb75e960762dd892d4bf32d057e` |
| QA `review-validation.log` | `5779e9cd4bf91245f7cb715c88097bfe91f40656143a581f42d9486262301ac3` |
| QA `audit.json` | `58cfd7bce8e2f1f9dffe4a481becf2718505135a3fc96a2e72e6a2f9482b3ea1` |
| QA `audit.mjs` | `324959b98bb8715811d9ed7cfcedfa138189ee23bd4e5907694c0106f699f6f3` |

## Individual judgments

Scores mean 2: meets the applicable criterion, 1: partial/limited defect, 0:
material failure; non-applicable dimensions are explicitly marked. A Pass needs
all applicable dimensions at 2 and an eligible protocol result. This binary
summary does not imply that every failure has the same severity. We assess the
supplied request, not keywords or an invented requirement to repeat every number.

| # | Case | Verdict | Independent reason and limit |
| --- | --- | --- | --- |
| 1 | `reported-english-goal-chinese-reply` | Fail | Quiet rest becomes V25 verification/study work and repeated Cedar25 marker tasks. Correct Chinese does not rescue the goal error. |
| 2 | `chinese-break-with-label` | Fail | Invents a previous device test and asks about it instead of the specified rest plan. |
| 3 | `correct-previous-misreading` | Fail | English and 15 minutes are correct, but after the explicit correction the plan still asks for study notes and closing books. |
| 4 | `actual-device-test-goal` | Fail, partial | Retains genuine testing and makes no success claim; only supplies a two-minute settings-location step, withholding the requested short reopening plan for a nonessential menu detail. |
| 5 | `fresh-chinese-rest` | Pass | Three Chinese rest steps, no equipment/purchase, final step continues until the supplied 12-minute period ends. Per-step numeric allocation was not required. |
| 6 | `actual-study-goal` | Fail | Fabricates a further user turn after the initial study outline, then truncates at 512 tokens into invalid JSON. Protocol-ineligible: not an accepted user-visible message. |
| 7 | `labelled-desk-goal` | Fail, timing | Three desk steps have 0–4/4–8/8–10 minute headings, but the final two-minute slot includes a five-minute break. Item alternatives are not counted as proof of invented possessions. |
| 8 | `latest-goal-two-history-pairs` | Fail, recall | Correctly changes to two three-minute rest steps, but recalls the label as “休息” instead of Aspen81. |
| 9 | `explicit-language-request` | Pass | Explicit English, two no-equipment movement steps totaling five minutes, no diagnosis or execution claim. |
| 10 | `normal-chat` | Fail, conversational control | No imposed plan; nevertheless asks two alternative questions and assumes reading must have exhausted the user. |
| 11 | `calculation` | Pass | Eleven minutes, one Chinese sentence. |
| 12 | `persona-presentation` | Pass | Two short Chinese bullets, ten minutes of rest, permitted presentation preference and no study/equipment/spending. |
| 13 | `missing-essential-goal` | Pass | One focused question establishes the missing goal before a plan. |
| 14 | `ordinary-code-as-text` | Fail | Introduces a simple Python addition function but never supplies the function. No execution is claimed. |
| 15 | `labelled-walk-goal` | Pass | Two Chinese walking/stretching steps total ten minutes. Awkward software metaphors do not become actual test tasks. |
| 16 | `genuine-test-with-marker` | Fail, data control | Despite “Preserve existing data”, advises “clear cache/data if necessary” and invents an intention to fully reset. QA did not perform this advice or observe an actual deletion. |
| 17 | `natural-chinese` | Fail, conversational control | Natural Chinese without a plan, but asks two separate questions instead of one. |
| 18 | `natural-english` | Pass | Brief English and one past-framed question; no current-rain or home-address inference. Literal repetition of “morning” is not required. |
| 19 | `specified-french` | Pass | Only one French greeting. |
| 20 | `switch-to-english` | Pass | Switches from Chinese history to one English sentence, correctly recalling mint tea after lunch without a permanent preference. |
| 21 | `correct-personal-claim` | Pass | Accepts the latest correction, says the address is unknown and does not preserve Paris residence or invent a replacement. |
| 22 | `topic-shift-chat` | Fail, factual detail | Leaves the desk plan behind, but inaccurately says red/orange/yellow pigments were all present all along; red anthocyanins can be newly synthesized in autumn. |
| 23 | `unknown-event-fact` | Pass | Requests event identity/details without inventing a time, event or live catalogue access. |
| 24 | `no-execution-claim` | Pass, narrow boundary | Declines action and does not claim participation/reminder was saved. Its loose “location status” wording and device-calendar suggestion do not validate ENMORI terminology or navigation. |

Case 22's factual distinction was independently checked against
[Harvard Forest's leaf-color explanation](https://harvardforest.fas.harvard.edu/education-opportunities/classic-outreach-resources/autumn-foliage-color/leaf-science/leaf-process/),
read 25 October 2026. The topic-switch criterion itself passes; the factual
dimension is partial. This additional defect is not needed to establish the
already-failed small-plan gate.

## Acceptance consequence

Preserved cases 1–16 yield 6 Pass / 10 Fail; additional current-prompt cases
17–24 yield 6 Pass / 2 Fail. Valid JSON, prompt/request fidelity and bounded
latency do not establish semantic quality. The original Cedar25/Maple42 failures
remain explicit, with new failures in correction and the real testing/study
controls. Case 16 also fails the user's explicit data-control instruction at
the model-output layer; it does not mean storage was changed.

No new prompt tuning or retry is authorized by this review. The eight
`candidate-context` fixtures were not run against a real model and remain
**Not Run**. Live Check-in/Event/Location use, provider selection, cloud behavior,
proactive semantics/delivery, current data preservation, native C entry and
physical-device acceptance retain their separate gates. Historical evidence
and earlier source/mock repairs remain intact in the other QA ledgers.
