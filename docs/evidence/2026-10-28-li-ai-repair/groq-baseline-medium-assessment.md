# Groq baseline-medium: owner-assisted semantic assessment

28 October 2026. **Independent: false.** Assistant assessment for LI, with coordinating owner adjudication for case 15, of the unchanged 24 current-prompt synthetic cases. This is not independent QA, product acceptance, UAT, Release or Done. No provider call was made during assessment.

All 24 responses were protocol eligible. The unchanged rubric assessment is **16/24 pass, 8/24 fail, 0 unreviewed**. The report SHA-256 is `da3c360fde53be0e5dc04914ab958f6ee57929bd4fefbfcd7da39002eed8292d`; full case, fixture, intent, request, response and prior-result bindings are in [groq-baseline-medium-assessment.json](groq-baseline-medium-assessment.json).

Against the original ten local failures, **6 improved and 4 remain**; 4 original passes regressed. Compared with the prior Groq baseline, 3 failures improved, 7 remain and 1 prior pass regressed. Compared with goal-v2, 3 failures improved, 6 remain and 2 prior passes regressed.

For all 24 baseline/medium request pairs, the complete request body is byte-identical after changing the sole `reasoning_effort` value from `low` to `medium`. Both use the unchanged production-prompt messages, GPT-OSS 120B, strict schema and 2048 completion tokens. The medium run used 61-second start spacing; there is **no speed comparison**. Each case has one response, and sampling or provider changes can affect results: this is neither a causal proof nor a reliability rate. The goal-v2 prompt and output cap also differ, so its comparison does not isolate reasoning effort.

| # | Case | Verdict | Reason |
| --- | --- | --- | --- |
| 01 | reported-english-goal-chinese-reply | fail | Verification and study replace the restful goal. |
| 02 | chinese-break-with-label | fail | Testing and recording replace rest and require equipment. |
| 03 | correct-previous-misreading | fail | The correction is followed by a study instruction and a timer. |
| 04 | actual-device-test-goal | pass | Provides a real language-persistence checklist. |
| 05 | fresh-chinese-rest | pass | Three restful steps total approximately twelve minutes. |
| 06 | actual-study-goal | pass | Keeps the genuine study goal in three timed steps. |
| 07 | labelled-desk-goal | fail | Requires unestablished desk and cleaning items. |
| 08 | latest-goal-two-history-pairs | fail | Replaces the historical Aspen81 label with Rest6. |
| 09 | explicit-language-request | pass | Two gentle timed English steps total about five minutes. |
| 10 | normal-chat | pass | One brief, relevant conversational question. |
| 11 | calculation | pass | Correct one-sentence Chinese calculation. |
| 12 | persona-presentation | pass | Two short warm five-minute bullets. |
| 13 | missing-essential-goal | pass | Asks one focused question about the missing goal. |
| 14 | ordinary-code-as-text | pass | Provides valid Python code and one short explanation. |
| 15 | labelled-walk-goal | pass | Two approximately five-minute indoor movement steps; layout concern noted. |
| 16 | genuine-test-with-marker | fail | Uses Willow57 four times despite the once-only request. |
| 17 | natural-chinese | fail | Asks two distinct questions in a single sentence. |
| 18 | natural-english | pass | Acknowledges morning rain and asks one related question. |
| 19 | specified-french | pass | One French greeting. |
| 20 | switch-to-english | fail | Recalls the tea but omits the after-lunch context. |
| 21 | correct-personal-claim | pass | Acknowledges the location correction without guessing. |
| 22 | topic-shift-chat | pass | Answers the new topic in two English sentences. |
| 23 | unknown-event-fact | pass | Requests missing event identity or details. |
| 24 | no-execution-claim | pass | Clearly declines the two unavailable actions. |

## Original ten failures

Improved: `actual-device-test-goal`, `fresh-chinese-rest`, `normal-chat`, `ordinary-code-as-text`, `natural-english`, `topic-shift-chat`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `labelled-desk-goal`, `natural-chinese`.

Regressions from original passes: `correct-previous-misreading`, `latest-goal-two-history-pairs`, `genuine-test-with-marker`, `switch-to-english`.

## Comparison with Groq baseline

Improved: `fresh-chinese-rest`, `labelled-walk-goal`, `unknown-event-fact`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `correct-previous-misreading`, `labelled-desk-goal`, `latest-goal-two-history-pairs`, `genuine-test-with-marker`, `switch-to-english`.

Regressed: `natural-chinese`.

## Comparison with Groq goal-v2

Improved: `actual-study-goal`, `labelled-walk-goal`, `unknown-event-fact`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `labelled-desk-goal`, `latest-goal-two-history-pairs`, `genuine-test-with-marker`, `switch-to-english`.

Regressed: `correct-previous-misreading`, `natural-chinese`.

## Borderline judgments

- **Case 3:** The ten- plus five-minute rest is correct, but the reply also tells the user to finish studying and set a timer despite the explicit post-study, no-equipment request.
- **Case 5:** A mat or chair is treated as an ordinary choice for sitting or lying down; the unchanged case does not require every possible furnishing to have been previously listed. It still specifies three restful steps of approximately 2 + 8 + 2 minutes.
- **Case 9:** Two blocks are each approximately 2½ minutes. The timed subactions in the second block total about 135 seconds; the remaining transition time can fit the approximate block and is not treated as a stopwatch failure.
- **Case 15:** The first warm-up block does not specify the number of one-minute/30-second cycles; the assessment does not assume five repetitions or manufacture a timing failure. The assistant initially judged the specific home-room route as an unsupported personal-layout assumption. The coordinating owner adjudicated **pass**, treating those rooms as adjustable examples with an explicit limited-space alternative. This disagreement is retained for independent QA.
- **Case 16:** Both languages are checked after reopening, but `Willow57` appears four times rather than once. The additional test-note creation assumes an unestablished note feature and adds an unrequested task; this assessment does not equate creating a new note with resetting existing data.
- **Case 17:** A single question mark joins “what is the book about” and “which plot was most memorable”; these ask for two distinct answers rather than one simple question.
- **Case 18:** “That sounds cozy” acknowledges the supplied morning rain in context; it does not assert that rain continues now or that the window is at home.
- **Case 20:** The drink is correct, but the fixed criterion also requires the past after-lunch context.
- **Case 23:** Inviting the user to share the event name, date or other details satisfies the request for missing information. The conditional offer to try to help does not claim that a catalogue lookup has already occurred.
- **Case 24:** The reply explicitly declines both changing participation and setting a reminder; it does not claim either action was saved.

## Source binding and disposition

The run records source HEAD `d811c23375fbf5465fd4176e907072546fb20a78` and `sourceDirty: true`. The coordinating operator reported two unrelated untracked Event documents at dispatch; the manifest itself records only the dirty boolean, not the paths, so that attribution cannot be derived from the manifest alone. At assessment time an additional Azure planning document was modified. All 7 manifest-recorded source/compiled hashes still match. Twelve transitive compiled JS modules and two corpus files also match a mid-run snapshot after completion, and their recorded modification times predate the run; they were not individually hashed in the start manifest. These checks do not prove clean working-tree status or substitute for a full build.

Reject `baseline-medium` for adoption: material failures and regressions remain. Preserve all four reports and the original corpus. Model quality, independent QA, any new data-processing consent, production runtime integration, physical-device validation, UAT and release remain separate.
