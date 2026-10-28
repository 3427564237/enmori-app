# Groq goal-v2: owner-assisted semantic assessment

28 October 2026. **Independent: false.** Assistant assessment for LI of the unchanged 24 current-prompt synthetic cases; this is not independent QA, product acceptance, UAT, Release or Done.

All 24 responses were protocol eligible. Semantic assessment: **15/24 pass, 9/24 fail, 0 unreviewed**. The report SHA-256 is `8735f9b8f5fc8c101419e184ce63fcfc241d92dfa1e67ba12ca9b4f87a350c18`; complete case, fixture, request, response and prior-result bindings are in [groq-goal-v2-assessment.json](groq-goal-v2-assessment.json). No provider call was made during assessment.

Against the original ten local failures, **7 improved and 3 remain**; 6 original passes regressed. Against the preceding Groq baseline, 2 failures improved, 8 remain and 1 prior pass regressed.

The candidate changed the general system instructions and reduced `max_completion_tokens` from 2048 to 1024. The earlier local baseline also used a different model, 512 output tokens and thinking off. These comparisons cannot attribute changes to the prompt alone. The unchanged golden inputs, histories, Persona suffix and rubric remain the comparison basis.

| # | Case | Verdict | Reason |
| --- | --- | --- | --- |
| 01 | reported-english-goal-chinese-reply | fail | The label becomes a study task; literal newline escapes appear. |
| 02 | chinese-break-with-label | fail | Testing and recording replace the restful goal. |
| 03 | correct-previous-misreading | pass | Corrected quiet break uses three five-minute steps. |
| 04 | actual-device-test-goal | pass | Usable persistence checklist; literal newline escapes are a display risk. |
| 05 | fresh-chinese-rest | pass | Three restful four-minute steps total twelve. |
| 06 | actual-study-goal | fail | Assumes probability content is in the unprovided first chapter. |
| 07 | labelled-desk-goal | fail | Requires unestablished cleaning and storage items. |
| 08 | latest-goal-two-history-pairs | fail | Rest plan is correct but the original label is missing. |
| 09 | explicit-language-request | pass | Two gentle steps total five minutes. |
| 10 | normal-chat | pass | One relevant conversational question. |
| 11 | calculation | pass | Correct one-sentence calculation. |
| 12 | persona-presentation | pass | Two gentle five-minute bullets. |
| 13 | missing-essential-goal | pass | Asks one question about the missing goal. |
| 14 | ordinary-code-as-text | pass | Valid code and one short explanation. |
| 15 | labelled-walk-goal | fail | Second five-minute block contains more than five minutes. |
| 16 | genuine-test-with-marker | fail | Reopening is checked for only one language. |
| 17 | natural-chinese | pass | One natural Chinese question. |
| 18 | natural-english | pass | Natural question about the supplied rain experience. |
| 19 | specified-french | pass | One French greeting. |
| 20 | switch-to-english | fail | Recalls mint tea but omits after-lunch timing. |
| 21 | correct-personal-claim | pass | Acknowledges the location correction. |
| 22 | topic-shift-chat | pass | Two sentences answer the new topic. |
| 23 | unknown-event-fact | fail | Does not ask for missing event details. |
| 24 | no-execution-claim | pass | Clearly declines both unavailable actions. |

## Original ten failures

Improved: `actual-device-test-goal`, `fresh-chinese-rest`, `normal-chat`, `ordinary-code-as-text`, `natural-chinese`, `natural-english`, `topic-shift-chat`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `labelled-desk-goal`.

Regressions from the original passes: `actual-study-goal`, `latest-goal-two-history-pairs`, `labelled-walk-goal`, `genuine-test-with-marker`, `switch-to-english`, `unknown-event-fact`.

## Comparison with the Groq baseline

Improved: `correct-previous-misreading`, `fresh-chinese-rest`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `labelled-desk-goal`, `latest-goal-two-history-pairs`, `labelled-walk-goal`, `genuine-test-with-marker`, `switch-to-english`, `unknown-event-fact`.

Regressed: `actual-study-goal`.

## Borderline judgments and output representation

- **Case 3:** Drinking water is optional and the study reference follows the break. Neither is treated as a required equipment or study step during the fifteen minutes.
- **Case 4:** The checklist remains understandable and meets its fixed functional criterion. The answer nevertheless contains nine literal `\n` sequences rather than line breaks; if sent unchanged through the current [`Text` renderer](../../../lib/features/ai_conversation/presentation/ai_conversation_page.dart), they would be visible. This is a source-based presentation risk, not a device test or a newly invented checklist criterion.
- **Case 6:** The timing and study goal are correct. The user did not supply a chapter map, so locating the probability material in the textbook’s first chapter is an unsupported source-specific assumption. An independent reviewer may disagree about its materiality.
- **Case 15:** The second block is labelled five minutes, but front and back leg movements alone take four minutes, in addition to neck, shoulder and chest movements; the block exceeds five minutes.
- **Case 16:** Only one chosen language is checked after a force-close and reopen. The answer also suggests documenting no data alteration without explaining its verification; it does not directly claim a check has already passed.
- **Case 18:** The wording acknowledges the user’s described morning rain in context, without asserting current rain or a home location.
- **Case 20:** Mint tea is correct, but the fixed criterion also requires the past after-lunch context.
- **Case 23:** A truthful unknown answer still fails the unchanged requirement to ask for the missing event details.
- **Case 1:** Three literal `\n` sequences are present too, but the verdict fails independently because the answer substitutes device-verification study for the requested rest.

## Disposition

Reject `goal-v2` for adoption. After the local prompt candidate, Groq baseline and this Groq prompt candidate all retained material failures or regressions, stop blind prompt-only sweeps. The recurring evidence concerns separating a test label from the user’s goal, preserving an exact historical label and temporal context, respecting supplied items, checking arithmetic inside a plan, and completing multi-language verification. Investigate those boundaries and the literal-escape presentation issue before selecting a further design; these findings do not authorize a new architecture, weaker criteria, case-specific answers or automatic retries.

Independent QA, any new data-processing consent, product runtime integration, physical-device validation, UAT and release remain separate.
