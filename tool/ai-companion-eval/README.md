# Synthetic companion evaluation

This is an isolated evaluation tool, not the ENMORI production provider. It has
no account, Firestore, application-route or credential reads. The default runner
uses an in-memory fake. No cloud runner/key discovery is enabled. Source and
mock evidence cannot establish model quality, service readiness or device UAT.

Use the repository's existing Node **24.19.0** and TypeScript **7.0.2**, with the
unchanged lockfile. Build in this worktree first:

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test backend/dist/test/ai-runtime/synthetic-evaluation.test.js tool/ai-companion-eval/evaluation.test.mjs
node tool/ai-companion-eval/run.mjs --provider mock --out /absolute/owner-only-directory/new-mock-run
```

The output parent must exist, belong to the caller and have mode `0700`. It must
resolve without a symlink. The new run directory must not exist and must be
outside the repository. Each request/response file is created exclusively, with
mode `0600`. Run manifests include source and compiled hashes, HEAD/dirty state,
corpus hashes, exact request bodies without authentication, configuration and
runtime version. Interrupted runs retain request intent files; do not resume or
retry an uncertain request. The synthetic raw artifacts are not service logs.

## Corpus and profiles

There are 32 fixed cases. The first 16 are a byte-for-byte copy of the preserved
small-plan corpus, SHA-256
`837d0a2076e86736e9e46f9d950ff0bcaaec1e1f10c825bf6aee9476e281311b`.
Original inputs and historical failures are unchanged. Eight further current
chat cases cover natural Chinese/English, explicit French, language switching,
latest correction, topic switching, missing facts and unsupported actions.

Those **24 current-prompt** cases obtain their system/history/user messages from
the unchanged `LocalChatTransport` through fake HTTP. A regression compares the
entire reconstructed Ollama request with that captured request. The **8 candidate
context** cases use a separately labelled prompt with synthetic facts, dated
quotes and assistant suggestions. They cover historical mood/location, intent
versus attendance, midnight/time zone, withdrawal, unavailable records,
correction and quoted prompt injection. They are a proposed semantic evaluation
surface, not a new context API or proof of permission/version enforcement.

| Profile | Fixed settings | Evidence limitation |
| --- | --- | --- |
| Local baseline | `qwen3.5:9b`, 8192 context, 512 output, `think:false`, current JSON schema and inherited sampling defaults | Current-prompt track only; model digest and host scheduling require readback before a real run |
| Gemini candidate | Stable `gemini-3.8-flash`, Standard `generateContent`, `thinkingLevel:low`, 2048 combined thinking/output tokens, one candidate, JSON schema | Prepared adapter only; no cloud key/read/send; different output budget is explicit and does not prove speed parity |

No tools, search, maps grounding, file upload, cache creation, system-permission
override, hidden repair call, automatic retry or provider fallback is requested.
An experiment response is not a `GenerationTransport` settlement: an unknown
network result means stop this run, not “the model stopped.” Production adapters
must preserve the existing quarantined-lane lifecycle separately.

The local runner exists for a later Integration-assigned slot:

```sh
node tool/ai-companion-eval/run.mjs --provider local --authorization 'specific Integration slot reference' --out /absolute/owner-only-directory/new-local-run
```

The reference documents authorization; it does not manufacture it. Do not run
this command merely because it is executable. It attempts at most 24 serial
current-prompt cases, waits for each original response and stops on unconfirmed
outcome. It does not preload or download a model. A separate empty preload, if
needed, must be included explicitly in the assigned slot. Delivery eligibility
expires at 45 seconds; physical receive is bounded at 120 seconds. No late text
is delivered to a product. This tool never saves a product conversation.

## Independent semantic review

`report.json` separates observed provider outcome, raw text, structural protocol,
deadline eligibility, usage and cost. Missing usage/cost is `null`/absent, not
zero. `thinkingTokens` contributes to cloud cost; a token-price estimate is not
an invoice. Local host/electricity cost is not measured. Mock usage and latency
are fabricated and explicitly not real model evidence.

`review-template.json` starts with every case `unreviewed`. QA reviews the full
fixture, criteria, dated context and raw response, then fills reviewer identity,
independence, rationale, exact supporting/counterexample quotations and scores:

- `relevance`: requested goal and constraints, including plan duration/steps.
- `language`: requested language and natural, understandable phrasing.
- `correctionAndTopic`: latest correction and topic boundary, no recycled errors.
- `factsAndTime`: supported facts, source times, intent/attendance distinctions.
- `userControl`: no invented execution, coercive interaction or forged source link.

Scores are 0 (fails), 1 (material weakness), 2 (meets this case), or
`not-applicable`. A pass needs 2 on every applicable dimension, eligible complete
output, and evidence. Unsupported personal/attendance/execution facts fail their
case even if the reply is fluent. The validator binds exact report and result
hashes, rejects missing/duplicate cases and rejects all mock passes. It does not
decide semantics or verify that a reviewer is independent; that is the QA process.

```sh
node tool/ai-companion-eval/review.mjs /absolute/run/report.json /absolute/qa/review.json
```

Report numerator, intended denominator, unreviewed/missing cases and per-track
results. A clean protocol or good isolated reply never erases the old small-plan
failures. No real-model result has been produced by this initial delivery.
