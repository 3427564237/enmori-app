# Qwen 3.8 27B — interrupted model-only comparison

28 October 2026. [Machine-readable receipt](groq-qwen38-partial-assessment.json).

The freshly verified Groq Free Plan run dispatched **3 of at most 24** requests.
Two returned eligible responses; the third returned HTTP 429, so the one-shot
runner stopped without retry or fallback. **US$0; 99 total Groq calls consumed;
21 of this grant unused.** This is not a complete 24-case pass rate.

All three sent requests match baseline-medium except the model ID. Original
messages, medium reasoning, strict schema and 2048 completion ceiling were
retained. All eight source hashes still matched after stopping. The evaluator
passed 44 offline tests. No production prompt/model/service was changed.

Under the unchanged rubric, both assessable responses fail:

- Case 1 replaces rest with device verification and study, invents materials,
  and adds actions outside the requested three steps.
- Case 2 gives three five-minute rest steps, but claims the user just studied
  device-test records. The user reports finishing study but does not state what they studied.
  Assigning the device-record phrase as its subject is a borderline grounding
  weakness under the unchanged no-invented-personal-facts rubric. The core rest
  goal and time sum improve; this judgment is owner-assisted, not independent.
- Case 3 is unassessable because of 429; cases 4–24 were not sent.

The precise provider quota window causing 429 was not retained by this runner
and is unknown. Do not infer daily exhaustion, a model outage, or a bill.
The candidate is rejected on the observed semantic failures. Assessment is
owner-assisted, not independent QA. The original one-use grant file is claimed
and must not be reused; unused authorization is not permission to bypass 429.
