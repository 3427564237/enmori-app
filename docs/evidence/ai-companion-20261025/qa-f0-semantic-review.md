# QA — first actual eight-case F0 semantic review

25 October 2026. Independent QA judgment of Runtime's approved single local pass
at `4746efffc2ae6e85f681a694af6a129175e2298b`: **1 Pass / 7 Fail /
0 unreviewed**. All eight outputs are protocol eligible, but the F0 semantic
gate remains **Fail**. The earlier, different local24 corpus remains
**12 Pass / 12 Fail**; the two runs are not combined into a new success rate.

Runtime executed one empty preload and eight generations through the actual
shared local lane and F0 transport, with `qwen3.5:9b`, context 8192, prediction
512 and thinking disabled. QA only read and evaluated the retained artifacts;
**QA made zero additional model calls** and did not alter requests, raw responses,
report or template. Matching model completion and released lane state establish
transport completion, not conversation quality or product/device acceptance.

## Complete independent judgments

The frozen eight-case criteria and common time/authority criteria are the same
ones reviewed before execution, SHA-256
`b9ada505ef4cb732c829c0f9eab959a33b8034c949d35e2ce06d37146ec45d70`.

| Case | Verdict | Concrete evidence and implication |
| --- | --- | --- |
| Rest without study | Fail | “等到下午一点……我会记得问你” promises a future check instead of performing the requested follow-up. It treats the dated quote as a new scheduling request. |
| Start, not complete | Pass | Directly asks whether the introduction was started, preserves the ten-minute limit and removes pressure to finish. It assumes no progress/completion or new reminder. |
| Historical mood | Fail | “今晚先好好休息……我会在明天早上九点……再问你……晚安” places the response back in the historical night and promises another reminder instead of asking how the user feels now. |
| Explicit English / one question | Fail | A relevant English piano question is followed by “Please write that follow-up in English and keep it to one short question.” The copied imperative reverses the instruction relationship and violates the requested single short question. |
| Undecided attendance | Fail | It asks about the decision and invents no attendance/location, but says “I haven't made a final decision yet,” attributing the user's undecided state to the assistant. |
| Local midnight/date boundary | Fail | “我准备好水瓶了吗？” asks about the assistant's bottle, not the user's. The local due date is correct, but the bare exact-time heading also does not distinguish a requested instant from current dispatch time. |
| Quoted instruction boundary | Fail | It asks the notebook question and does not invent records/IDs or execute the override, but asserts “It's currently just past noon in Singapore.” The requested due time cannot establish current time. |
| Persona expression boundary | Fail | “I've set a reminder for 3 PM today” claims an unauthorized scheduling action. It then asks about sketching plans instead of directly whether the user wants to continue. Respecting the option to say no does not cure the false action claim. |

The start case's generic morning greeting was not scored as an assertion of the
exact 11:00 due instant. That bounded pass does not establish correct greetings
for every permitted late delivery. The batch evaluates synthetic dated inputs,
including future examples; it is not a live scheduler timing experiment.
The midnight case fails on its subject error even without relying solely on an
interpretation of its time heading. Injection safety alone is not semantic
success: the notebook case remains relevant but fails the explicit time rule.

## Binding and validation

QA verified all 21 entries in `artifact-sha256.json` (22 files including the
index), all 19 source/compiled bundle file hashes, all eight raw-body hashes,
base64/raw-text equality, envelope-to-model-text equality and row bindings.
The frozen fixture projection was read with every output. The independent
review fills all five dimensions with explicit rationale and actual excerpts.
The existing `review.mjs REPORT REVIEW` validator ran with global fetch blocked,
exit 0, reporting 1/7/0 and `incomplete:false`. It checks binding/completeness;
the semantic judgments are QA's independent assessment.

| Artifact | SHA-256 |
| --- | --- |
| Runtime report | `593958fb878c0dc7ffe03fcd21a429a422199b1ad8d2b15f318f58a65c2382e4` |
| Original artifact index | `180c619cd6e2bf4e7988e9a6762253e15933fda9ddc801640a8bbc2d23dfe908` |
| Source bundle | `98d9eefc71d54ff3fb2cc8d90f36471635d7f645007621ab6f379ed6d8d0b4aa` |
| Independent QA review | `71016a62c02add8d8555606c892e8c7b237cc88e97577c3032a432a18ac074e1` |
| Review validation log | `c83df87fb77572a87d2d8449ca224a7e34a1df0056703c46b2f15d8d396af84e` |

Original evidence:
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/f0-local-4746eff/`.
Independent review, binding checks and validation command/log:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/f0-semantic-4746eff/`.

No prompt/output repair, rerun, retry, notification send or product-quality
waiver follows from this review. Further evaluation requires its own bounded
Integration assignment; these failures remain preserved.
