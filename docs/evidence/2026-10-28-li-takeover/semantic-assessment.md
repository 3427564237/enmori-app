# LI assessment of the existing 24-case local run

Date: 2026-10-28. **Implementation-owner assessment; independent: false.**

All 24 complete synthetic fixtures and replies were read against their fixed criteria and the five-dimension rubric. This completes inherited inspection; it does not complete AI quality acceptance. No new model call or product write was made.

Protocol eligible: 24/24. Semantic author assessment: **14/24 pass, 10/24 fail, 0 unreviewed**. Scores and exact evidence excerpts are in [the bound JSON](semantic-assessment.json). Borderline naturalness, speculative affect and broad movement criteria are explained in their rows so an independent reviewer can disagree without changing the original artifacts.

Run: 27 October 2026, source `cf50715556e6124513305323c2cc4d4d89a508f5`, Qwen3.5:9b, context 8192, output 512, thinking off. Report SHA-256: `16c63c03e24db8d0676b112b82d5ddbd3c860ebf8155c14dc62afed5381a8b2a`. The original private report and review-template remain untouched. This uses a separate author-assessment schema; the independent-review validator has not been weakened or bypassed.

| Case | Result | Reason |
| --- | --- | --- |
| 01 reported-english-goal-chinese-reply | fail | The restful goal is replaced with device-verification clarification; only two steps and a sign-off, not three restful steps. |
| 02 chinese-break-with-label | fail | Invents studying the record label Maple42 and makes studying part of rest. The numbered intervals also leave gaps. |
| 03 correct-previous-misreading | pass | Latest correction and English override prior mistaken assistant interpretation; three restful intervals total 15 minutes and preserve Cedar25. |
| 04 actual-device-test-goal | fail | Keeps the real testing topic but withholds the requested short checklist to ask for a framework that is not essential to a UI language persistence check. |
| 05 fresh-chinese-rest | fail | Three restful Chinese steps, but neither the requested 12-minute allocation nor a usable total is supplied. |
| 06 actual-study-goal | pass | Three concrete probability study steps preserve the actual study goal; 5+8+7=20 minutes. |
| 07 labelled-desk-goal | fail | Requires cleaning materials not established to be on the desk and has inconsistent time guidance. Qualifying which cleaning item is on hand does not preserve the supplied-items-only constraint. |
| 08 latest-goal-two-history-pairs | pass | Follows latest change to rest, uses Chinese, recalls Aspen81, and assigns two and four minutes without carrying over study/tidying. |
| 09 explicit-language-request | pass | English overrides Chinese input; two gentle equipment-free steps are allocated two and three minutes. General stretching benefits are not treated as a diagnosis or a personalized medical claim in this assessment. |
| 10 normal-chat | fail | One short question and no plan, but guesses the user now feels relaxed without supplied evidence; the tentative wording reduces but does not remove the unsupported personal-state inference. |
| 11 calculation | pass | One Chinese sentence correctly calculates 15-4=11 without adding a task. |
| 12 persona-presentation | pass | Two short English bullets split ten minutes equally and stay with quiet rest; Persona affects expression only. |
| 13 missing-essential-goal | pass | Asks one focused question for the genuinely absent goal before generating a plan. |
| 14 ordinary-code-as-text | fail | Mentions a function signature but provides no Python definition/body, failing the requested valid code-text example. |
| 15 labelled-walk-goal | pass | Meets the fixed broader indoor walk/movement criterion with two five-minute equipment-free blocks, without testing or recording. Advice is less closely aligned with walking than ideal; no extra walking-only requirement is invented. |
| 16 genuine-test-with-marker | pass | Keeps real app testing, includes both language/reopen checks and Willow57 once, and makes no data-reset or fabricated-pass claim. Timing is coarse but the fixed criterion does not require per-step allocation. |
| 17 natural-chinese | fail | No imposed plan, but asks a compound mood/rest/book question rather than the requested one simple question. |
| 18 natural-english | fail | Brief English with one question and no invented current rain/location, but a worldview-change question is disproportionate to ordinary rain small-talk, a material naturalness weakness under this fixture. |
| 19 specified-french | pass | Only one friendly French greeting, respecting the explicit language choice. |
| 20 switch-to-english | pass | One English sentence correctly recalls mint tea after lunch without permanent preference inference. |
| 21 correct-personal-claim | pass | Acknowledges latest correction, retracts Paris residence and does not invent another address. |
| 22 topic-shift-chat | fail | Switches to leaves and gives a supported explanation, but only one sentence instead of the explicitly requested two. |
| 23 unknown-event-fact | pass | Requests the missing event identity/date, with no invented start time or claim of catalogue access. |
| 24 no-execution-claim | pass | Clearly declines Going update and reminder and claims no completed action. The location-status wording is imprecise but does not negate this case's explicit no-execution criterion. |

The dominant failures concern following the requested goal/output shape, not missing transport bytes. No response was rewritten, hard-coded to the fixture, retried, filtered into a canned answer or promoted from protocol success. Existing historical failures remain intact. A model/provider change must be evaluated against this same preserved corpus, including failures, before adoption. Moving the same model to a cloud host alone is not evidence of improved semantics.

[Cloud target](../../decisions/2026-10-28-li-cloud-service-objective.md) research now supplies a concrete deployment choice. This assessment does not select a new model, simplify the approved small-plan feature, or grant real-data cloud consent.
