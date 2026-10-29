# Groq baseline: owner-assisted semantic assessment

28 October 2026. **Independent: false.** Assistant assessment for LI of the fixed 24 current-prompt synthetic cases; this is not QA, product acceptance, UAT, Release or Done.

All 24 responses were protocol eligible. Semantic assessment: **14/24 pass, 10/24 fail, 0 unreviewed**. The preserved report SHA-256 is `7c18c7dca692d7f37284e874a9230ba066e7d097667e958eedb8844eaaaf0161`; the complete case, request, response, fixture and original-result bindings are in [groq-baseline-assessment.json](groq-baseline-assessment.json). No provider call was made during assessment.

Against the original ten local failures, **6 improved and 4 remain**. Six cases that previously passed now fail; equal total pass counts do not imply the same strengths. The prior local baseline used Qwen3.5:9b with 512 output tokens and thinking off; this run used Groq GPT-OSS 120B with a 2048-token completion limit and low reasoning. This comparison does not isolate model choice from all configuration differences.

| # | Case | Verdict | Reason |
| --- | --- | --- | --- |
| 01 | reported-english-goal-chinese-reply | fail | Verification replaces rest; requires devices or software. |
| 02 | chinese-break-with-label | fail | Testing replaces rest; equipment and rest duration conflict. |
| 03 | correct-previous-misreading | fail | Corrects the goal but requires a timer. |
| 04 | actual-device-test-goal | pass | Usable real language-persistence checklist; no fabricated pass. |
| 05 | fresh-chinese-rest | fail | Three restful steps do not allocate the requested 12 minutes. |
| 06 | actual-study-goal | pass | Genuine study plan totals 20 minutes. |
| 07 | labelled-desk-goal | fail | Requires unestablished materials and storage. |
| 08 | latest-goal-two-history-pairs | fail | Rest plan is correct, but the record label is changed. |
| 09 | explicit-language-request | pass | Two gentle equipment-free steps total five minutes. |
| 10 | normal-chat | pass | Brief natural chat and one relevant question. |
| 11 | calculation | pass | Correct one-sentence calculation. |
| 12 | persona-presentation | pass | Two quiet five-minute bullets. |
| 13 | missing-essential-goal | pass | One focused question about the missing goal. |
| 14 | ordinary-code-as-text | pass | Valid code and one-sentence explanation. |
| 15 | labelled-walk-goal | fail | First five-minute block explicitly adds up to six. |
| 16 | genuine-test-with-marker | fail | Reopen persistence is checked for only one language. |
| 17 | natural-chinese | pass | Natural Chinese with one question and no imposed plan. |
| 18 | natural-english | pass | Natural question acknowledges the supplied rain experience. |
| 19 | specified-french | pass | One French greeting. |
| 20 | switch-to-english | fail | Recalls mint tea but omits after-lunch timing. |
| 21 | correct-personal-claim | pass | Acknowledges the correction without guessing location. |
| 22 | topic-shift-chat | pass | Two sentences answer the new topic. |
| 23 | unknown-event-fact | fail | Does not ask for the missing event details. |
| 24 | no-execution-claim | pass | Clearly declines both unavailable actions. |

## Original ten failures

Improved: `actual-device-test-goal`, `normal-chat`, `ordinary-code-as-text`, `natural-chinese`, `natural-english`, `topic-shift-chat`.

Still failed: `reported-english-goal-chinese-reply`, `chinese-break-with-label`, `fresh-chinese-rest`, `labelled-desk-goal`.

Regressions from the original passes: `correct-previous-misreading`, `latest-goal-two-history-pairs`, `labelled-walk-goal`, `genuine-test-with-marker`, `switch-to-english`, `unknown-event-fact`.

## Borderline judgments

- **Case 8:** The two-step rest plan is correct, but the answer presents `Aspen81_休息6分钟` as the record label. The requested label was `Aspen81`; appending a suffix changes the label rather than reproducing it.
- **Case 9:** A general phrase about tension is not treated as a diagnosis or medical claim. The two timed steps total five minutes.
- **Case 16:** The fixed criterion requires both language choices to survive a close and reopen. The answer tests only the initially selected opposite choice; it does not repeat for the other one.
- **Case 18:** The user explicitly described a window and rain that morning. “That sounds soothing” acknowledges that supplied experience in context, without asserting present rain or a home location.
- **Case 20:** The response answers the latest question about the drink, but the unchanged criterion also requires the past lunchtime qualifier; omitting it fails that criterion.
- **Case 23:** Saying the start time is unknown is truthful, but the fixed criterion also requires asking for event details.

The judgments retain the original criteria and do not rewrite or discard failed responses. Independent QA and any production-provider, consent, runtime or device decisions remain separate.
