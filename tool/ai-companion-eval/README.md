# Synthetic companion evaluation

This is an isolated evaluation tool, not the ENMORI production provider. It has
no account, Firestore, application-route or credential reads. The default runner
uses an in-memory fake. The separate cloud runner defaults to dry mode. Source and
mock evidence cannot establish model quality, service readiness or device UAT.

Use the repository's existing Node **24.19.0** and TypeScript **7.0.2**, with the
unchanged lockfile. Build in this worktree first:

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test backend/dist/test/ai-runtime/synthetic-evaluation.test.js 'tool/ai-companion-eval/*.test.mjs'
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
| Gemini candidate | Stable `gemini-3.8-flash`, Standard `generateContent`, `thinkingLevel:low`, 2048 combined thinking/output tokens, one candidate, JSON schema | Guarded isolated runner; real execution not authorized/run; different output budget is explicit and does not prove speed parity |

No tools, search, maps grounding, file upload, cache creation, system-permission
override, hidden repair call, automatic retry or provider fallback is requested.
An experiment response is not a `GenerationTransport` settlement: an unknown
network result means stop this run, not “the model stopped.” Production adapters
must preserve the existing quarantined-lane lifecycle separately.

### Groq Free Plan comparison (28 October 2026)

`groq-evaluation.mjs` is another isolated adapter, not a production transport.
It accepts only the fixed 24 current-prompt cases. `baseline` keeps their exact
golden messages and uses GPT-OSS 120B with 2048 completion tokens;
`goal-v2` substitutes only the general system instructions, retains the original
Persona suffix and user/history text, and uses 1024 completion tokens. Both use
low reasoning. The separately authorized `baseline-medium` profile preserves
every `baseline` request property and message, including its 2048 completion
ceiling, except that `reasoning_effort` is `medium`. All three use strict JSON
Schema and non-streaming requests. Refusal, truncation, malformed output,
missing terminal state and late delivery cannot pass.

`groq-run.mjs` requires a private key file, private fresh LI authorization and
an exclusive output directory outside the repository. The authorization names
the exact profile, corpus hash, 24-request ceiling, zero-dollar Free Plan,
verified time, expiry and unique approval reference. It is consumed once; a
crashed or uncertain run is never automatically resumed. Each intent is saved
before dispatch; raw provider errors and authentication headers are not logged.
The fixed endpoint rejects redirects and has no paid fallback.
`baseline-medium` additionally requires a new grant with its own exact profile
and scope, `reasoningEffort: "medium"`, and a new approval reference; previous
baseline and goal-v2 grants do not authorize it. Keep Groq grants under the same
private parent directory and shared `claims/` ledger: its one-use reference
check is path-scoped, so moving a grant to evade that ledger is prohibited.

```sh
node --test tool/ai-companion-eval/groq-evaluation.test.mjs tool/ai-companion-eval/evaluation.test.mjs
node tool/ai-companion-eval/groq-run.mjs --profile goal-v2 --key-file /private/key --authorization /private/grant.json --out /private/new-run
```

This command is not a grant to make calls. Use only a separately authorized,
account-verified pass. Keep its source/corpus frozen until the report is saved.
The separately authorized baseline-medium pass later completed 24 calls with
16/24 owner-assessed semantic passes and was rejected; see its
[assessment](../../docs/evidence/2026-10-28-li-ai-repair/groq-baseline-medium-assessment.md).
That consumed grant is not reusable. All three Groq runs remain synthetic and
none selects a production provider/model.

The baseline and goal-v2 profiles retain 30.1-second start spacing; baseline-medium
requires at least 61 seconds. Its conservative per-request check reserves the
whole request's UTF-8 byte count plus 2048 completion tokens plus 512 wrapper
tokens within the previously observed 8000 TPM. This is an estimate, not proof
of tokenization, free eligibility or rate-limit availability. Recheck provider
and account limits before a separately authorized run. Unknown results, 429 and
usage over the reservation stop the run without retry. `completion_tokens`
already includes reasoning; do not add `thinkingTokens` again. Missing usage is
never zero.

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
Malformed success envelopes or missing terminal markers are unconfirmed and
stop the run. A local run with missing/ineligible cases exits with code 2 while
retaining all evidence; code 0 still makes no semantic acceptance claim.

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
failures. The initial delivery contained mock evidence only.

The later, separately authorized one-pass local baseline is recorded in
[`runtime.md`](../../docs/evidence/ai-companion-20261025/runtime.md), with the
exact source snapshot and complete private artifact hashes. Its structural and
timing observations do not establish semantic acceptance or cloud performance.

## Guarded cloud candidate (disabled by default)

Integration requested this runnable candidate before asking LI for the concrete
cloud decision. Implementing it does **not** supply that authorization. The
committed `authorization-proposed.json` deliberately fails every execution gate
that still awaits a decision. Do not change its status or eligibility claims
merely to make a command run.

```sh
node tool/ai-companion-eval/cloud-run.mjs
node tool/ai-companion-eval/cloud-run.mjs --mode mock --passes 2 --max-usd 1 --out /absolute/owner-only-directory/new-cloud-mock
```

Dry mode reads no environment key and makes no request. It prints exact corpus
and source/compiled bundle hashes for the decision. Mock mode uses only injected
memory responses, takes no cloud authorization and never reads a key. It runs
the same fixed 32 cases in at most two passes, with unique pass/case identities.
No CLI option accepts an arbitrary corpus or actual user record.

Only after LI's specific decision is durably recorded and QA reviews the exact
bundle may the operator prepare a private authorization JSON using the proposal:

- status `approved`, `approvedBy:LI`, exact decision reference and fixed scope;
- selected billing-linked Standard paid project, eligibility and key-to-project
  verification, Contributor enrollment false; these require actual evidence,
  not just setting the file's booleans;
- exact corpus and source/compiled bundle hashes from reviewed dry output;
- at most two passes, 64 count attempts and 64 generation attempts, 8192 input
  and 2048 combined output tokens, and at most USD $1 model-token spend;
- valid UTC expiry and same-day rechecked prices (this snapshot expires with
  31 December 2026; a later price requires review/code update).

The key is supplied only as server environment
`ENMORI_SYNTHETIC_GEMINI_API_KEY`, outside Git/arguments/authorization JSON. No
dotenv, account-file search, purchase, project creation or credential discovery
is implemented. The prepared, **not run**, command is:

```sh
node tool/ai-companion-eval/cloud-run.mjs --mode cloud --allow-cloud true --authorization /absolute/private/approved.json --passes 2 --max-usd 1 --out /absolute/owner-only-directory/new-cloud-run
```

The operator must first ensure the existing owner-only parent
`~/.local/state/enmori-ai-companion-20261025/runtime/` is available. The runner
consumes each decision reference once in its `cloud-authorizations/` ledger.
Reusing a grant with another output folder fails; interrupted/failed grants stay
claimed. There is no auto-resume, reset or refund. A new authorization must
explicitly account for the previous unknown results/reservations.

Before each generation, a native
[`countTokens`](https://ai.google.dev/api/tokens) call includes the full generated
request, including system/history/configuration. Oversize, invalid or unknown
counts stop without generation. The maximum $0.013824 reservation is written
and fsynced before dispatch, with one exclusive intent artifact per attempt.
No reservation is released, including after unknown or failed outcomes. The
overall maximum is $0.884736 for 64 attempts at the documented rates. A ledger
reservation is not proof of billing or provider execution.

Native requests pin the HTTPS host, model and `serviceTier:standard`, set
`store:false`, and disallow redirects. This does not bypass Google's safety/legal
retention, prove paid project status or promise zero retention. The request has
no tools/caches/files/continuations; no alternate model/provider is attempted.
Unknown status, missing model revision/usage, exceeded observed token limits,
expired authorization, cancellation or evidence-write failure stops the batch.
Authorization and cancellation are checked again at the actual HTTP boundary,
after the durable intent write. A blocked dispatch is recorded as not started;
its reservation remains consumed. Count requests combine external cancellation
with the receive timeout. SIGINT/SIGTERM prevent another request while an
already-dispatched generation retains its bounded original receive.

Raw responses are preserved up to the 1 MiB receive bound; any exact credential
echo is redacted and labelled before any artifact is written. No headers or key
are recorded. Truncated/unknown bodies remain failures, with their available
prefix preserved. Complete reports and independent review templates retain all
attempted cases; real cloud latency/cost remains Not Run until a separately authorized
evaluation actually occurs.
