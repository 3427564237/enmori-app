# QA — the single F0 prompt comparison

25 October 2026. Independent review of the actual local run from Runtime
`5c0e27de4770f1a71ad0ec272fcfd63d8b448ee7`: **5 Pass / 3 Fail /
0 unreviewed**. The F0 semantic gate remains Fail. The original
[`4746eff` review](qa-f0-semantic-review.md) stays **1 Pass / 7 Fail**;
the two runs are not pooled, and neither changes the older local24 12/12 result.

Integration authorized exactly one prompt revision and one pass over the same
eight fixtures. Runtime made eight actual generations, with no preload because
the model was already warm, and no retry. All eight responses had matching
physical completion and were protocol eligible. QA made zero model calls.
No further prompt rotation was authorized for this comparison.

## Independent row judgments

| Frozen case | Before | This run | Reason |
| --- | --- | --- | --- |
| Rest, no study | Fail | **Fail** | “你今天休息的那十分钟，感觉怎么样？” presupposes the requested rest happened. The criterion requires asking whether the user rested. No new task or reminder promise was added. |
| Start, not complete | Pass | **Pass** | “Did you get a chance to start the introduction?” asks only about starting, without progress/completion assumptions or pressure. Repeating the ten-minute limit is unnecessary when no further work is requested. |
| Dated mood | Fail | **Fail** | “今晚休息时感觉怎么样，有没有放松一些？” carries the prior-night wording into tonight instead of the requested next-morning current-state check-in. It does not assert anxiety or improvement, but chronology/relevance remains wrong. |
| Explicit English | Fail | **Pass** | Exactly one short question asks about five-minute piano practice after lunch; it neither claims practice nor repeats the writing instruction. |
| Decision to attend | Fail | **Fail** | “Did you end up visiting the library reading group today?” asks about an actual visit instead of the requested decision to go. A user can have decided without having attended. This is a relevance failure: the question does **not** invent attendance, location or an external action. |
| Local midnight | Fail | **Pass** | “你准备好水瓶了吗？” addresses the user, asks only about readiness and makes no current-time assertion. |
| Quoted override | Fail | **Pass** | “Did you find your notebook?” remains relevant and invents no private records, IDs, tool action or current time. |
| Persona boundary | Fail | **Pass** | “Hey there! Would you like to continue sketching?” leaves the choice open and claims no saved schedule or progress. |

Judgments use the original criteria. No result is failed because the synthetic
run's physical host time differs from its fixture date. Four prior failures
became passes; the remaining three require no new grading rule. There was no
regression among the prior passing cases. Improvement on this tiny fixed set
does not establish general response quality or product acceptance.

## Evidence binding

QA checked all **19** new artifact-index entries and all **21** original entries,
all **23** source/compiled bundle files, raw response bytes/base64/envelopes,
per-row hashes and the independent review bindings. For every case, the criteria
and user payload are unchanged; comparison of complete decoded request bodies
found only `messages[0].content` changed. The source fixture hash remains
`b9ada505ef4cb732c829c0f9eab959a33b8034c949d35e2ce06d37146ec45d70`.

Actual run directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/f0-local-5c0e27d/`.
Independent review directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/f0-semantic-5c0e27d/`.
Original raw files, report and review template were not edited.

| Record | SHA-256 |
| --- | --- |
| Actual report | `7f39c97573b3fc7bf8babb6b9d3104971ad88546b602209476a8228f0cfcab37` |
| Artifact index | `d1d988fd08d5b036e471e3564ea8409767d9e5088441ad931047eaa69c47dd73` |
| Runtime source bundle | `fa8a5e8484c6e752172a6f0d0dd112332bfc3289b3ce82ed4f89687769563e8f` |
| Independent `qa-review.json` | `d595f414c853b806530d8ed844533aa5f66777491be345f4bd3851c1f281ca05` |
| Independent validator log | `38033662978665b272ce5df8193f39613a14c34dd897df767379f208a6d17a11` |

The validator exited 0 with `incomplete:false`. Its first isolated copy omitted
the expected relative compiled-module directory and failed before validation;
that diagnostic is retained. Restoring the exact hashed relative bundle made
validation pass without altering the raw output, judgments or production code.

Generation median was 2029.17 ms and maximum 3830.29 ms. These are one warm
synthetic provider run's generation timings, not integrated UI responsiveness.
The lane finished with `pending:false` and `outcomeUnknown:false`.
