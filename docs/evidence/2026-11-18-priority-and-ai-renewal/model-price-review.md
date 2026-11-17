# Approved model and current price review

Reviewed 18 November 2026, Asia/Singapore, against source `04f80272027f582c61c524c6cbec2a4dcb5b9578`. Evidence: local source and approved decisions, official public OpenAI documentation, and a fixed price-only projection of the retained ledger receipt. This reviewer made no model call, read no API credential, and changed no model, price, grant or production setting.

## Result

The approved `gpt-6.1-sol` configuration remains compatible with today's published Standard short-input prices. All four Sol rates in the retained ledger match the current public rates. That ledger's price evidence expired at **2026-11-17 16:00 UTC**; a numerical match does not extend it or install a new grant.

| Charge | USD per 1 million tokens | Integer nanoUSD per 1 million tokens |
| --- | ---: | ---: |
| Ordinary input | 2.00 | 2,000,000,000 |
| Cached input | 0.10 | 100,000,000 |
| Default 30-minute cache write | 2.50 | 2,500,000,000 |
| Output, including reasoning | 10.00 | 10,000,000,000 |

The ordinary, cached, cache-write and output rates above are the Standard short-input row; Batch, Flex, Fast and regional pricing must not be substituted. [Official pricing](https://developers.openai.com/api/docs/pricing).

The current request body explicitly selects `service_tier: default` and uses the global Responses endpoint. OpenAI maps that explicit tier to Standard pricing and performance. [Official Responses reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

The body does not opt into a cache lifetime. OpenAI documents a default 30-minute lifetime for this model family, whose write rate is 1.25 times ordinary input; an explicit 12-hour lifetime costs 2.5 times input. These are total write rates, not additional surcharges. No change to cache settings or the retained rate is needed for this review. [Official prompt-caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).

## Approved request and context boundaries

The [5 November decision](../../decisions/2026-11-05-li-sol-test-app-acceptance.md) selects Sol, low reasoning, `goal-grounding-v1`, nonstreaming structured Responses and `store:false`. The [current continuation decision](../../decisions/2026-11-18-li-onepa-priority-and-ai-continuation.md) does not select another model or a new real-model test.

`backend/src/bootstrap/openai-test-app-composition.ts:43` retains **8,192 input tokens, 2,048 output tokens and 131,072 request bytes**. The complete exact input is counted before dispatch. Output includes reasoning; it is not an additional allowance beyond 2,048. `openai-cloud-transport.ts:156` retains `background:false`, `default` tier and disabled truncation.

OpenAI publishes an API context window of 1,050,000 and maximum output of 128,000 for Sol. Prompts exceeding 272,000 input tokens use higher rates for the whole request. Those provider limits do not enlarge ENMORI's smaller active limits. The [budget contract](../../../api/openai-budget-contract.md) and `cloud-cost.ts:117` impose a separate 272,000-input ceiling, and the transport can impose a lower one. The active 8,192-input request remains below both thresholds. [Official Sol model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

## Access and renewal limits

Published prices and model listings do not establish this production project's current permission or quota. OpenAI explicitly distinguishes model access from usage tiers and rate limits; model visibility can differ between dashboard sessions and API keys. A current, same-organization/project/key-scope access observation remains an operator check. This review did not perform it or infer it from the reported purchase. [Official rate-limit and model-availability guidance](https://developers.openai.com/api/docs/guides/rate-limits#model-availability).

Today's price observation also does not guarantee unchanged prices through the requested two-calendar-month service period. The current purchased-credit decoder bounds both balance and price evidence to seven days. That project policy, provider credit expiry, the requested service period and the renewable runtime-owner lease are separate. Any explicit policy supersession and exact activation/cutoff belong in the approved renewal packet; this report selects none. See [funding and operator review](ai-renewal-review.md).

Private evidence: `model-price-evidence.json` in the operator's AI-renewal evidence directory records source URLs, observed prices, configuration hashes and the retained-receipt digest. It contains no credential, account identifier or conversation content. The retained receipt was independently checked against SHA-256 `8a5cb8f3573025497c2c7c99fd8fd27be54fa800aec5d9ca5df3b84309a7075f`; only its model/tier/rates and price timestamps were used here. No future-price, uninterrupted-service or successful-reply claim follows from these checks.

## Subsequent live model-visibility evidence

Root subsequently supplied a credential-scoped read at **2026-11-17 23:46:44–23:46:47 UTC**. Independent review of its fixed, content-free receipt confirms `GET /v1/models/gpt-6.1-sol` returned 200 with the expected model ID, using the live Azure configuration's key according to the operator receipt. It records zero generation, configuration writes and database writes. SHA-256 of `live-model-read-v2.json`: `a2a0d0753fb3bd9481890208ed46d0810cf0df2ef8f81689ed9e258762028b6b`.

The separate operator scope receipt records an active restricted key, a matching masked suffix and unchanged live settings; this reviewer checked its metadata, not the underlying credential or private billing UI. SHA-256 of `credential-scope-review.json`: `b00f458c0d6ce5add8e421c8df5daa7fa2879cda0a44145e5a51fac97e3889fe`.

These observations establish model visibility at that time and strengthen the production-key binding. They do not demonstrate a completed Responses generation, every permission of the restricted key, sufficient future funds or future model availability. The earlier public-document review remains a separate price/configuration observation. No real-model test was added.
