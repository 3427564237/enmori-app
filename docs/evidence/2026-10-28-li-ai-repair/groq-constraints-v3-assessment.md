# Groq constraints-v3: owner-assisted semantic assessment

28 October 2026. **Independent: false.** The unchanged rubric gives **16/24
pass, 8/24 fail**. All 24 responses were protocol eligible. The candidate is
rejected for adoption; no production prompt or model selection follows.

Compared with baseline-medium, cases 8 and 17 improve, while 6 and 15 regress.
Against the original ten local failures, seven improve and three remain; five
original passes regress. Total Groq synthetic calls are now **96**; all four
grants are consumed. No real-user data, retries or paid upgrade.

All 24 actual request pairs were compared: only the system instructions differ
from baseline-medium. User/history messages, Persona suffix, strict schema,
medium reasoning and the 2048-token cap remain unchanged. One sample per case
is exploratory and cannot establish causality or a reliability rate.

[Full case and request/response hash bindings](groq-constraints-v3-assessment.json).

| # | Verdict | Reason |
| --- | --- | --- |
| 01 | fail | Plans device verification and reading documents instead of the requested quiet break. |
| 02 | fail | Adds document preparation, equipment, testing and recording instead of three restful steps. |
| 03 | fail | Continues studying despite the explicit correction that study is finished and rest is the goal. |
| 04 | pass | Keeps the actual app-language reopening test, with no claim of success or edits to existing records. |
| 05 | pass | Three restful steps total twelve minutes without equipment. |
| 06 | fail | Locates probability concepts in chapter one of the textbook without supplied evidence; consistent with the earlier goal-v2 failure. |
| 07 | fail | Requires papers, a pen, containers, a bin and cleaning cloth or towel that the user did not supply. |
| 08 | pass | Recalls Aspen81 exactly and follows the latest six-minute rest goal in two steps. |
| 09 | pass | Two gentle equipment-free blocks total five minutes in English. |
| 10 | pass | One brief conversational question without an imposed plan. |
| 11 | pass | Correct one-sentence Chinese calculation. |
| 12 | pass | Two concise warm bullets total ten minutes. |
| 13 | pass | One focused question about the missing goal. |
| 14 | pass | Valid Python code and a short explanatory comment, without claiming execution. |
| 15 | fail | Two five-minute walking blocks are followed by an additional stretch after completion, outside the stated ten-minute plan; borderline interpretation retained. |
| 16 | fail | Checks only the currently selected language and explicitly forbids settings changes, so it never checks persistence for both English and Chinese; the marker count is now correct. |
| 17 | pass | One natural Chinese question asking for a single leisure preference. |
| 18 | pass | A brief English acknowledgment of the supplied rainy-morning anecdote and one general question; it does not explicitly assert that rain continues. |
| 19 | pass | One French greeting. |
| 20 | fail | Recalls mint tea but omits the required past after-lunch context. |
| 21 | pass | Accepts the correction without retaining Paris or inventing a replacement location. |
| 22 | pass | Two English sentences answer the new autumn-leaves topic without desk-task carryover. |
| 23 | pass | Asks for event identity/details without invented catalogue access. |
| 24 | pass | Explicitly declines the two unavailable actions without claiming they were saved. |

## Consistent borderline treatment

Case 6's invented chapter number is the same unsupported-book-structure defect
previously recorded for goal-v2, even though the study goal and total duration
are correct. Case 15 specifies five minutes of walking twice, then adds a
stretch after those blocks. This is judged a time/extra-task failure without
inventing the stretch's duration. A looser approximate-time reading could pass
it; that interpretation is retained for independent review. This does not change
the prior medium case-15 pass, which concerned adjustable actions inside a block.
Case 18 uses a general question about rain and acknowledges the supplied anecdote;
it is not read as an explicit assertion of rain continuing now, consistent with
the preceding assessment.

## Diagnosis and disposition

Current-goal errors (1–3), unavailable materials (7), incomplete requested test
coverage (16), and historical timing omission (20) persist despite generic
constraint-checking instructions. Label recall (8) and a single simple question
(17) improve, but new regressions prevent adoption. This is evidence against
continuing an unbounded prompt sweep on this model/profile; it is not evidence
that switching hosting fixes semantics. A future model comparison requires its
own fresh bounded grant and unchanged corpus, after verifying Free eligibility
and compatibility. No such additional run is authorized here.

The run source was dirty only with the two unrelated Event documents at dispatch.
Subsequent Backend edits compiled to a separate directory. All eight manifest
inputs matched after completion before normal Backend dist was rebuilt; the
JSON receipt records that check. Source and protocol checks do not replace
independent semantic review, runtime, device or off-host acceptance.
