# Runtime / Models — 25 October 2026

Status: isolated source/mock candidate; real model comparison **Not Run**.
Owner: Runtime chat `01a171a5-707c-77a2-8ddc-fbda24e4c089`.
Integration remains the decision and shared-composition owner. No push, PR,
main merge, production provider/configuration or data mutation is included.

## Authority and startup

Read LI's original attached request and
[the confirmed round authorization](../../decisions/2026-10-25-li-ai-companion-round.md),
repository guardrails/routing, both architecture records,
[19 October simplification](../../decisions/2026-10-19-li-ai-mvp-simplification.md),
[24 October repair](../../decisions/2026-10-24-li-ai-plan-model-repair.md),
[v26 phone evidence](../sprint3/2026-10-25-li-v26-phone-acceptance.md), and
[prior-round handoff](../../handoff/2026-10-23-product-round2.md).
The source authorization, not the dispatcher's paraphrase, permits within-roster
messages. Skills used: repository Backend development and systematic debugging.

Workspace `/home/miku/.codex/worktrees/45f3/ENMORI`; branch
`souma/ai-companion-runtime-20261025`; clean startup at
`b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.
The attachment tool initially returned an empty list; no second worktree was
created. Integration's recorded `turn_context` in the local roster confirms
development model `gpt-6-astra`, effort `max`, turn
`01a171a5-7ecb-7fe2-9b3f-50f0a8d2ee0d`. These are not application model settings.

## Existing runtime and failure audit

- `backend/src/bootstrap/retained-core-runtime.ts` selects `LocalChatTransport`
  with `simpleChat:true`. The existing real context reader uses
  `includeCheckIns:false` and Persona expression. Current user text and the same
  account/conversation's latest two complete pairs reach the model in order.
  Check-in note/Mood/weather/location and participation do not automatically
  enter this current chat path.
- The current prompt says to use supplied conversation, avoid invented facts,
  and treat Persona as presentation. It does not explicitly prioritize an
  instructed language over message language or explain latest correction versus
  an assistant's mistaken statement. This is an observed gap, not a confirmed
  cause or authorization for another production prompt experiment.
- `LocalChatTransport` still requests native `/api/chat`, `think:false`, 8192
  context, 512 output tokens, existing schema, no tools, no sampling overrides.
  SHA-256 remains `d50b31412a5754ace1b5e2023ee540d1f1054071854b2b12723ac39dbbf8434d`.
  Deadline cancellation withdraws delivery, while original receive continues;
  unknown completion leaves its lane occupied. The new evaluator does not
  replace this production settlement contract.
- Fresh read-only `/api/version`, `/api/tags`, `/api/ps` on 25 October observed
  Ollama `0.40.4`, installed `qwen3.5:9b`, digest
  `56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`,
  stored size 6,550,825,550 bytes, and no loaded Qwen baseline at that instant.
  No load/generate/download was requested. Integration separately owns service
  identity and global baseline verification.
- The preserved probe and 16-case file were reviewed read-only. The probe
  preserves requests/responses and stops on unknown outcomes but marks protocol
  validity, not semantic success. Its six-model allowlist is not reused. The
  copied fixture is byte-identical (SHA-256 in the tool README).
- The [58-request diagnosis](../sprint3/2026-10-23-li-calendar-plan-repair.md)
  and [16-request boundary comparison](../sprint3/2026-10-24-li-calendar-deploy-9b-diagnosis.md)
  remain failed at the relevant small-plan semantics. Existing tests establish
  message forwarding, not real interpretation. No fourth prompt fix or local
  replacement has been adopted. The older immutable-Note prerequisite cannot be
  reused as proof for today's editable Check-ins.

## Official Gemini evidence and recommendation

Checked **25 October 2026** against official pages, with Context7 used for REST
syntax and direct official-page verification for changing model/price/terms.
Recommendation for a bounded experiment: **one stable `gemini-3.8-flash`** against
the actual Qwen baseline. Stability, text support and available `low` thinking
make it a reasonable candidate; ENMORI answer quality remains unmeasured.

| Evidence | Verified fact / consequence |
| --- | --- |
| [Gemini 3.8 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), updated 22 October 2026 | `gemini-3.8-flash` is Stable; text output, structured output and low/medium/high thinking supported. `minimal` is unsupported. Use fixed model ID, record returned model version; no preview/automatic latest alias. |
| [Standard pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash) | Until 31 December 2026: USD $0.75 per million input tokens, $3.75 per million output including thinking. From 1 January 2027: $1.50/$7.50. Standard paid is the candidate; Contributor's data-sharing discount is excluded. |
| [Thinking documentation](https://ai.google.dev/gemini-api/docs/generate-content/thinking) | Use `thinkingLevel:low`; output cap includes thinking and visible output. Truncation/empty final answer at `MAX_TOKENS` is a failure, not a retry trigger. Count `thoughtsTokenCount` separately and include it in cost. |
| [REST structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) | `responseMimeType:application/json` and `responseJsonSchema` can express the existing two-field response. Schema validity alone cannot establish the requested semantics. Native `generateContent` avoids SDK continuation/retry behavior and new packages. |
| [Count tokens](https://ai.google.dev/api/tokens) and [generation API](https://ai.google.dev/api/generate-content#ServiceTier) | Count the whole `generateContentRequest`; explicit `serviceTier:standard` fixes the request tier. `store:false` controls optional request logging, not the terms' safety/legal retention. |
| [API key guidance](https://ai.google.dev/gemini-api/docs/api-key) | Production keys belong on the server, never in Flutter/Git. This delivery neither reads a key nor creates an account, billing setup or production client. |
| [Available regions](https://ai.google.dev/gemini-api/docs/available-regions) | Singapore is listed. The actual operator and intended end-user regions must still be confirmed; a Singapore timezone does not prove eligible location. |

The [Gemini Developer API Additional Terms](https://ai.google.dev/gemini-api/terms),
effective **23 March 2026**, require adult developers and prohibit clients
directed at or likely accessed by under-18s. EEA/Swiss/UK clients require Paid
Services. Unpaid inputs/outputs may improve products and receive human review;
sensitive/personal data must not be sent there. Standard Paid requests through
a billing-linked project are not used for product improvement, but limited
safety/legal logging and cross-country processing remain. Paid is not local
processing or zero retention. Medical-advice/clinical use is restricted; ENMORI's
companion must not infer diagnoses. These are adoption gates, not new project
requirements approved by this report.

The [31 August PM decision C8](../../decisions/2026-08-31-pm-requirements-decisions.md)
explicitly serves the broader community, not only students, and excludes
diagnosis/treatment/health advice. It does not impose an adult-only audience.
The [approved Profile/Settings package](../../planning/2026-10-05-li-profile-settings-contract-preview.md)
excludes age/DOB from its DTOs and leaves their purposes/contracts pending. The
reviewed onboarding/profile and PM scope records do not establish an 18+ audience
or age-verification mechanism. This does not prove the app targets minors;
Developer API eligibility is **unresolved**. Do not silently add DOB collection,
change the audience or represent current consent as cloud permission. Integration
must resolve intended audience/regions and applicable provider terms before
adoption; synthetic adult-operated research is a narrower separate decision.

## Concrete cloud-evaluation proposal — not executed or approved

Service: Gemini **Developer API Standard paid**, stable `gemini-3.8-flash`, text
only, one selected billing-linked project, no Contributor enrollment. Scope:
the checked-in 32 synthetic cases, two identical passes for consistency, at most
**64 generation requests** plus at most **64 token-count requests**, serial,
one candidate each. No real account/Check-in/Persona/location data, source IDs,
uploads, grounding, cache creation, tools, fallback or automatic retries.

Proposed per generation: verified input at most 8192 tokens, combined
thinking/output cap 2048, `thinkingLevel:low`, existing 2400-character response
validation, 45-second eligibility and 120-second receive bound. A preflight token
count over the cap stops the case without truncating personal text. Stop the
batch on unknown outcome, unexpected usage/pricing, or the reserved budget being
exhausted; do not refund an unknown request's reservation without evidence.

At the checked Standard rates, maximum token estimate per request is
`8192 × $0.75/M + 2048 × $3.75/M = $0.013824`;
32 requests = **$0.442368**, two passes = **$0.884736**. Request **USD $1.00 of
model-token spend for this experiment only**, with applicable tax/payment
conditions confirmed separately. This is a request-level estimate, not an
invoice, universal Cloud Billing cap or permission to purchase credits. Recheck
the price before any call; the planned January price change doubles this bound.
Record actual token metadata including thinking and reconcile available billing
evidence. Missing metrics stay unknown.

Decision needed from LI via Integration: whether to authorize this bounded
synthetic Standard experiment under eligible adult/operator/region conditions,
the chosen project/service and spend cap. Real-data cloud use, production
adoption, retention/consent copy, provider fallback and deployment remain outside
that decision. If no key/budget is supplied, the complete mock harness remains
usable. No credential is sought from local files.

## Delivered source and interfaces

- `backend/src/ai-runtime/ports/synthetic-evaluation.ts` defines experiment-only
  prompt, injected HTTP and observation types. It cannot authorize business
  operations or substitute for `GenerationTransport` completion.
- `backend/src/ai-runtime/infrastructure/synthetic-evaluation-adapters.ts`
  builds fixed native provider requests, bounds body receive, retains exact raw
  evidence and keeps response, failure, unknown, deadline and usage separate.
  HTTP is mandatory injection; no ambient fetch or credential lookup occurs.
- `tool/ai-companion-eval/` supplies the fixed 32-case corpus, exact current-prompt
  capture, offline mock runner, prepared local runner, raw artifact manifest,
  strict structural checks, usage cost calculation and independent review entry.
  The ordinary runner has no cloud execution mode. The mock intentionally includes HTTP
  rejection, provider block, token exhaustion, invalid JSON and lost connection.
- `backend/test/ai-runtime/synthetic-evaluation.test.ts` and the tool tests
  verify these boundaries with fakes. Existing production files are unchanged.

Context/Backend's proposed projection separates dated business facts, user
quotes and assistant suggestions. Model text has no owner/source IDs or trusted
navigation permission; source/version sidecars remain outside this adapter.
Runtime uses this distinction only in synthetic context fixtures. Unknown
source reads are not empty-success. The source layer must still enforce access,
withdrawal, freshness and permanent deletion before generation/delivery. Per QA,
Persona edit/switch remains a request-start snapshot; permanent Persona deletion
is the distinct invalidation case. No generic source-version rule overrides Q19.

## Verification and handoff

Approved runtime **Node 24.19.0**, existing TypeScript **7.0.2**, pnpm **11.19.0**
inventory from Integration's toolchain record; no install/update/prune was run.
Dependencies were read through a local symlink after matching lockfiles:
`27fcc951d38f289233cf8105e429dc0b3430575933e0f96239f0a3cd04b26c69`.
The shell default Node26/pnpm11.25 were observed but not used for claimed tests.

Executed with the exact pinned Node path from that record:

```text
node <pinned-tsc> --project backend/tsconfig.json
node --test backend/dist/test/ai-runtime/synthetic-evaluation.test.js backend/dist/test/simple-chat.test.js tool/ai-companion-eval/evaluation.test.mjs
node tool/ai-companion-eval/run.mjs --provider mock --out <private-runtime>/mock-initial
```

Initial compile passed. **18/18** targeted checks passed: 9 new adapter checks,
4 evaluator checks and 5 existing simple-chat regressions. Mock recorded all
32 cases, **0 real calls**, **0 semantic passes**. Raw mock artifacts, all inputs,
provider responses, manifest and review template are at
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/mock-initial/`;
build/test/stdout logs are in its parent. Mock metrics are not real performance.
The raw initial report SHA-256 is
`e6da3fac1c8348f17948c98c50dd4bd997a48dbdb0afaef6762188905f7d4b11`.
After pinning the preserved-corpus hash assertion, the four evaluator tests were
rerun and passed; this is the same four cases, not four additional scenarios.

QA is the independent source/semantic reviewer; exact delivery SHA and raw report
hash are supplied directly after commit. Integration requested source/corpus
review before scheduling the proposed local 24-case baseline; **no real model
generation, shared-service restart, real cloud request, APK or phone work ran**.
Old small-plan status remains **Fail/unresolved**, and all production/provider,
data-use, audience and cost decisions above remain pending within their scope.

## Follow-up: reviewed execution guards

Integration explicitly requested the isolated cloud runner before presenting
the specific spending decision. `cloud-run.mjs` now defaults to **dry**, with a
zero-network mock route and an explicitly disabled-until-authorized cloud route.
`cloud-budget.mjs` and `cloud-runner.mjs` enforce fixed service/model/corpus,
same-day price confirmation, expiry, approved source bundle, at most two passes,
64 native token counts/generations, 8192/2048 token limits and a USD $1 ceiling.
The proposed authorization template has status `proposed`, unconfirmed project/
eligibility and no expiry; it cannot enable a call. No real key was read.

Reservations and request intent are fsynced before dispatch. Unknown outcomes
never refund a reservation, retry, continue or switch provider. Each decision
reference has a single-use host ledger to prevent a second run resetting its
spend. Provider host and `serviceTier:standard` are fixed; redirects are errors,
`store:false` is explicit, and keys stay in the server environment/header.
Credential echoes are redacted before artifacts are saved. Paid status, eligible
operator/region and key-to-project association still require actual operator
evidence; the authorization record cannot prove them itself.

QA found the initial outside-repository check accepted a child named `..raw`.
It now tests path segments and canonical parents, with internal-prefix/root/
descendant/sibling/ancestor-symlink and exclusive-file regressions. This was an
isolated tooling defect; no private source data entered Git. Separately, author
review reproduced a malformed HTTP-200 envelope releasing the evaluation loop;
the preserved red log demonstrates that failure. Such envelopes and absent
terminal markers now remain unconfirmed and stop the run. No production file
changed for either fix.

The follow-up build passed and the expanded focused set passed **31/31**:
10 adapter, 4 evaluator, 2 path, 10 cloud guard and 5 existing simple-chat cases.
This replaces the initial 18-case count, not an additional 31 product proofs.
The cloud tests cover all 64 serial mock attempts, reservation-before-dispatch,
lost responses, token/count/usage failures, cancellation, disk-write failure,
one-use grants, wrong host, credential redaction and default/denied CLI modes.
Logs: `build-cloud-candidate.log`, `tests-cloud-candidate.log` and the original
`malformed-envelope-red.log` under the private runtime directory.
After the final credential-file guard, the same 10 cloud and 2 path checks were
rerun: **12/12**, recorded in `tests-cloud-final.log` (not 12 new scenarios).
Final ordinary mock records 32 cases, report SHA-256
`664a641f6754f49b62d02edb7d1cc599689c05b1632e5d7202b90c7f66627c40`;
the two-pass cloud mock records 64 cases, 64 simulated count/generation pairs,
$0.884736 simulated reservation and **0 actual cloud calls**, report SHA-256
`168b786564967b1aeff9d3f4868600378325f0b6d6039daa70e9bd63f46ea3b2`.
Their directories are `runtime/mock-final/` and `runtime/cloud-mock-final/`
under the same owner-only state root. All semantic judgments remain unreviewed.
The dry-run approved-source candidate bundle hash is
`c2de685480c70eda878cc1247a0da88c81f86568d1d6e66009fd071e282e808f`;
corpus hash is `1f216f2d8a4facafaac55eb9567c2136864999cc68c6759e831a81693ff0912a`.
These runs record their pre-commit dirty state honestly and include exact
source/compiled hashes; they are not presented as runs from a later commit.
Real cloud/local generation remains **Not Run** pending QA and Integration's
specific execution decision; source/mock success does not alter semantic status.

## Follow-up: dispatch-time authorization and cancellation

Independent QA reproduced a cloud-only P2 on `ff39304`: a cancellation/expiry
during count-intent persistence, or expiry during generation-intent persistence,
could pass the earlier guard and still dispatch. The original QA script/log at
`qa-review/runtime-ff39304/cloud-dispatch-counterexample.{mjs,log}` remain intact
under the private round state. Three new regression groups were first run red
(`runtime/tests-cloud-dispatch-red.log`), including external cancellation of an
in-flight token count.

The HTTP wrapper now revalidates the full grant, external cancellation and
receive signal synchronously immediately before counting/dispatching the call.
A local dispatch denial is recorded as `not-started`, distinct from an unknown
request already sent. Count requests combine external cancellation and timeout;
an already-dispatched generation still receives its original response within
the existing physical bound. Reservations are retained in both cases.

The three original QA counterexamples now show zero forbidden dispatches
(`runtime/cloud-dispatch-counterexample-fixed.log`). All **34/34** focused tests
pass (`runtime/tests-dispatch-final.log`): the prior 31 plus three new regression
groups. No backend adapter, local runner, corpus or compiled file changed for
this follow-up, and no real provider request was used to verify it.

Integration subsequently assigned the unique local 24-case current-prompt slot,
including at most one empty preload if needed, with no retries/provider changes
and an immediate stop on unknown outcome. This supersedes only the earlier
local-execution scheduling hold. Execution will use a clean committed snapshot
and frozen source/compiled hashes. Cloud execution/budget remains unapproved;
local results will be recorded separately after the batch and independently
reviewed. LI's separate entry-C decision at Integration commit `2bb638b` changes
only presentation/navigation and supplies no cloud or additional data authority.
