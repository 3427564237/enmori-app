# Runtime / Models — 25 October 2026

Status: bounded local evidence recorded below; free cloud research **Interrupted**
after one confirmed count and one reserved generation attempt with no response.
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

## Authorized local baseline — one fixed pass, 25 October

QA independently confirmed the local inputs unchanged at clean commit
`24f913dd26afa9af82f7c31ac9eefcf543b64140`; it also closed the cloud-only P2 using
13/13 cloud tests and its original three dispatch counterexamples. Those are
source/mock results, not cloud execution authorization.

Integration then assigned this chat the unique local slot. Read-only preflight
confirmed Ollama `0.40.4`, `qwen3.5:9b` digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`, no resident
model and no observed known evaluator process. The metadata read does not prove
the absence of arbitrary outside requests. One explicitly authorized empty
preload completed in **28.993 seconds**, with its original empty terminal
response preserved. No service restart/configuration change was made.

Exactly **24 current-prompt requests** ran serially from 06:22:56.578 to
06:25:19.622 UTC on the unchanged 8192/512/`think:false` baseline. Source and
compiled hashes were frozen and verified equal after all responses arrived.
There was no retry, parameter change, second pass, candidate-context request,
product conversation write or cloud request. The code/compiled bundle hash was
`4fd938cfd8fce925bd9db602a7c599b58f6e8f9fe1d4ce9c68e7c30471455283`.

| Observed layer | Result |
| --- | --- |
| Provider terminal response | 24/24 received with `done:true`; 0 unknown |
| Structural protocol and delivery eligibility | 23/24; all responses arrived within 45 seconds |
| Ineligible case | `actual-study-goal`: `done_reason:length`, incomplete JSON at the fixed output cap |
| Runner exit | 2, retaining the failure and all 24 raw rows |
| Request latency | median 4.121 s; nearest-rank p95 12.497 s; max 27.700 s |
| Independent semantics at handoff | All 24 unreviewed; full corpus handed to QA |
| Provider invoice/host cost | No cloud call; local host/electricity cost not measured |

Latency is the experiment's request/receive observation after preload, not an
application end-to-end, cold-start or physical-device measure. A known length
terminal response is distinct from an unknown transport outcome; the former
was retained as ineligible while the fixed batch continued. Historical small-plan
failures remain unresolved pending independent full-case review.

All requests, fixtures, raw responses, manifest, report and blank review template
are preserved under the owner-only private directory
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/local-baseline-24f913d/`.
Report SHA-256:
`5b46f17e1785edc9f5f562ad3e6e0f36e1998ca0597a75df888df2a97024a0e9`.
Manifest SHA-256:
`35324835e79ac3099fcd7bb819d1241c3b312037216741505344ea191c55cb8b`.
The parent's `local-baseline-{preflight,postflight,hashes}.json` records before/
after service metadata, all file hashes and the immutable run snapshot;
`local-preload-{intent,response,settlement}.json` separately records the one
preload. The unique slot was explicitly released to Integration after all
original responses were received. Independent QA receives every case and writes
its own review artifact without replacing these raw inputs or outputs.

## Independent semantic result — 12 Pass, 12 Fail

QA completed all 24 judgments at its commit
`925ba38732772d1a71c24f19d2b8c750d538fab5`, documented in
`docs/evidence/ai-companion-20261025/qa-model-review.md` on the QA branch. The
full result is **12 Pass / 12 Fail / 0 unreviewed**: preserved small-plan cases
**6 Pass / 10 Fail**, additional current-prompt cases **6 Pass / 2 Fail**.
This resolves the earlier handoff's unreviewed state; it does not supersede the
original failed examples or change the model's semantic gate from **Fail**.

The material failures include rest goals misread as testing/studying, persisting
an error after an explicit correction, a fabricated user turn before truncation,
an omitted requested code example, and suggesting clearing data despite the
explicit preservation instruction. No suggested action was actually executed.
The QA report also distinguishes narrower timing, recall, conversational and
factual defects rather than treating every failure as equally severe.

QA independently verified all 51 original artifact hashes, all source/compiled
bindings, and each complete request against the unchanged production serializer.
The private review is
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/local-24f913d/semantic-review.json`,
SHA-256 `9557171a8256cafbb0a3c14b29f228e867c21cb75e960762dd892d4bf32d057e`.
Runtime read back that hash and the independent QA commit, then ran the unchanged
review validator: **12/12/0, incomplete:false, exit 0**. This verifies binding
and completeness; the semantic judgments remain QA's, not author's self-grading.

No further model requests, prompt tuning or parameter changes follow from this
review. Candidate-context model cases, real cloud performance/cost, additional
private-data purposes and integrated/native/phone acceptance remain untested or
pending their separate contracts. The isolated source/mock candidate is available
for Integration's review; the current local model is not presented as meeting
the full companion quality criteria.

## Gemini configuration preparation — read-only, 25 October

The [first-flow decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md)
at `26af8c95da4fa00b76f841952d742d9da8c07e5c` approves the previously specified
USD 1 synthetic experiment, subject to execution conditions. It supersedes the
earlier unapproved-budget status only within that scope. Runtime read back LI's
direct Integration reply `01a171ce-c02b-7830-9971-728d347f7dcd`: the operator
self-reports age 18+ and Singapore and asks for configuration help. This is an
operator statement, not an adult-only product audience or age-verification
feature. Integration should retain it in the execution decision record.

Integration assigned only configuration inspection at this stage: no login or
account switching, billing linkage, API enablement, project/key creation, key
read, secret-file search or model request. Runtime fast-forwarded its clean
branch from `15a7665` to `26af8c9` as directed; the reviewed evaluation sources
and adapters are unchanged. No SDK installation or build was required.

| Read-only observation | Result and limit |
| --- | --- |
| Installed CLIs | `/usr/bin/gcloud` 590.0.0; `/home/miku/.local/bin/firebase` 15.29.0 |
| gcloud authenticated accounts | `gcloud auth list` returned `[]`; selected account/project projection returned `null` |
| Firebase login inventory | One existing operator account; email retained only in the private metadata record |
| Firebase-visible project | `enmori-rmvp-controlled`, number `11254388146`, display name `ENMORI RMVP Controlled`, `ACTIVE` |
| Other Google Cloud projects | Unconfirmed: Firebase lists only accessible Firebase projects |
| Billing accounts, project billing link, Gemini paid readiness/credits | Unconfirmed; no gcloud login was initiated and no token was transferred from Firebase |
| Contributor enrollment, Generative Language API state, key/project binding | Unconfirmed; no key surface was opened |

The Firebase `login:list` and `projects:list` calls succeeded, with output
restricted to account/project metadata. The allowed CLI purposes are documented
in the [Firebase CLI reference](https://firebase.google.com/docs/cli). The private
allowlisted observation record is
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/cloud-setup/metadata-observation.json`.
Its SHA-256 is
`0e577242086ded03ab867a4a9d6c16ff84904f0270047df9393e304ecd1f042c`.
No inference of missing billing is made from missing gcloud authentication.

### Smallest proposed next configuration steps

1. Integration arranges user-mediated Google authorization for the confirmed
   existing operator account, retaining the account choice explicitly. The
   optional `gcloud auth login <confirmed-account> --no-activate` path avoids
   changing the active account; it is prepared, not executed. Do not update ADC
   or extract Firebase tokens. See [gcloud auth login](https://docs.cloud.google.com/sdk/gcloud/reference/auth/login).
2. With that authorized session, read all accessible Cloud projects and billing
   accounts, then the selected project's billing metadata and enabled services.
   The known controlled Firebase project is an **inspection candidate**, not an
   automatically selected Gemini project. Prefer an existing suitable research
   project if one is actually discovered. A new project or a change to the
   controlled project's billing needs its specific project/account decision.
3. Confirm the selected project's paid plan/usable balance and no Contributor
   enrollment. Google's current [billing guide](https://ai.google.dev/gemini-api/docs/billing)
   allows Postpay or may require a minimum USD 5 prepayment. That payment is
   separate from the approved USD 1 model-token allowance; no recharge or new
   billing account is currently authorized. Existing billing linkage alone does
   not establish usable Prepay credit. AI Studio spend caps can lag by about ten
   minutes, so the local reservation guard remains necessary.
4. After the concrete setup scope is confirmed, enable only the required service
   and prepare a server-side credential tied to that project. Current
   [key documentation](https://ai.google.dev/gemini-api/docs/api-key) says new AI
   Studio keys default to authorization keys bound to a service account; creation
   can also require API enablement and IAM binding. These are real configuration
   actions. New-user Terms acceptance can create a default project/key, so the
   read-only stage has not entered that onboarding flow. Never reuse a Firebase
   client key or place a Gemini secret in chat, Git, Flutter or command arguments.
5. Read back the chosen configuration, reconfirm the reviewed source/corpus and
   same-day prices, and prepare the private one-use authorization record with
   actual project/eligibility evidence and expiry. Only then can Integration
   assign execution of the already approved fixed experiment. No smoke-generation
   call or hidden extra run is part of setup.

The post-login metadata commands are prepared below, **not executed**. Replace
the account placeholder only with the human-confirmed account; do not change
global default project/account settings. Permission errors remain unknown and
must not trigger automatic API enablement or broader roles.

```sh
gcloud projects list --account='<confirmed-account>' --format='json(projectId,name,projectNumber,lifecycleState)'
gcloud billing accounts list --account='<confirmed-account>' --format='json(name,displayName,open)'
gcloud billing projects describe enmori-rmvp-controlled --account='<confirmed-account>' --format='json(projectId,billingEnabled,billingAccountName)'
gcloud services list --enabled --project=enmori-rmvp-controlled --account='<confirmed-account>' --filter='config.name=generativelanguage.googleapis.com' --format='json(config.name,state)'
```

The billing reads are defined by Google's
[account listing](https://docs.cloud.google.com/sdk/gcloud/reference/billing/accounts/list)
and [project billing description](https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/describe)
references; project and service inventory use
[projects list](https://docs.cloud.google.com/sdk/gcloud/reference/projects/list)
and [services list](https://docs.cloud.google.com/sdk/gcloud/reference/services/list).
This completes the assigned read-only preparation. Setup, usable
paid credentials and real cloud evaluation remain incomplete; the next user
interaction is account authorization, followed by a project/payment choice only
if the resulting metadata requires one.

### Follow-up: existing browser session and concrete Console blocker

Integration persisted the operator statement at `61478e0507e439fb0d0998c2fca26fbaa3ddbe15`
and explicitly assigned Runtime the sole browser operator for a read-only visit
to the existing project's Cloud Console billing page. This extends the earlier
CLI-only inspection; it does not authorize accepting terms or changing resources.

The existing Chrome profile was available. A direct visit to
`https://console.cloud.google.com/billing/linkedaccount?project=enmori-rmvp-controlled`
resolved to the same URL with `&pli=1`, browser `3`, tab `356358120`. The current
Google session already identified the same operator as the Firebase session,
and the visible region was Singapore. No login, account choice or account switch
was performed.

Cloud Console displayed its first-use welcome/Terms dialog. The service-terms
checkbox and marketing-email checkbox were both unchecked; **Agree and continue**
was disabled. Billing binding was not visible behind this gate and remains
**Unknown**, not unlinked. The separate Gemini Cloud Assist setup affordance
was not used. No Terms/API key/AI Studio onboarding, billing or resource mutation
was submitted.

The tab is marked for user handoff. The immediate browser path needs the human
to read and decide whether to complete that Google Cloud Terms confirmation;
gcloud login is now an optional later CLI route, not the first observed blocker.
After user confirmation, the authorized operator can read the same project's
billing metadata without initiating setup/payment. A screenshot is retained at
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/cloud-setup/console-terms-blocker.png`.
It contains operator account information and stays outside Git. The full tab/URL
and observed gate were delivered to Integration; no repeated UI attempts or
credential inspection followed.

### Follow-up: Terms cleared, existing project imported, paid-upgrade gate

After LI's direct `ok` and Integration's bounded readback assignment, the Terms
dialog was no longer present. The same project's linked-account URL resolved
to a specific Cloud Billing account (private metadata retains the complete ID;
suffix `25F80B`). Its overview said **free trial**, SGD383.45 remaining credit,
90 days, expiring 2027-01-24. These are Cloud Billing facts, not evidence of a
usable Gemini paid plan. The earlier unknown link state is superseded only by
this observed link and trial status.

The same existing account could open AI Studio without a new Terms screen.
Initially only the already-imported Default Gemini Project appeared, on free
tier. An existing key was masked; its value was not opened or copied. The
Gemini Billing page for the linked account showed **SGD0 eligible GCP credits**,
unknown tier, and **prepayment required**. An initial read-only setup dialog
offered only the Default project or import/create, and was cancelled.

Integration then explicitly authorized importing only the existing
`enmori-rmvp-controlled` project under LI's request to complete remaining setup.
The import dialog identified exactly that project, and the resulting project
row confirmed **free trial / prepayment required**, SGD0.00 monthly spend and a
Create API key action. This project-list import is the only submitted change.

Opening that row's billing activation entry reached a concrete review page:
continuing agrees to upgrade the existing free-trial Cloud Billing account to
paid. It also states that remaining USD300 welcome credits exclude Gemini API.
**Continue was not clicked.** The actual minimum prepayment is still behind
this upgrade step and remains unknown. No paid upgrade, payment, new project,
key creation, API enablement or billing-link change was performed. No model call
was made. Integration received the exact gate for LI's decision; the approved
USD1 model-token budget cannot be substituted for this account-level change.

Private evidence is under the existing `runtime/cloud-setup/` directory:
`console-linked-trial.png`, `studio-prepay-required.png`,
`studio-enmori-imported.png`, `studio-paid-upgrade-gate.png` and
`after-terms-observation.json`. The record contains the allowlisted metadata and
screenshot hashes, never key material. Browser 3/tab 356358123 stays on the
unsubmitted upgrade confirmation for handoff. This is a configuration checkpoint,
not permission to run the cloud evaluation.

## F0 local adapter and shared physical model lane — source candidate

Authority: LI's first-flow decision, shared `FirstFlowModelInput` /
`GenerationTransport` Port at `42b0b2a4e1151b43e9608f953c9a986c2c078394`, and
its fresh-actor/read-model correction `ff00e7c`. Both were merged without
overwriting Runtime's cloud setup evidence. Integration explicitly assigned F0
first, shared physical ownership with existing Chat/Persona preview, and eight
synthetic cases for independent QA before a separately assigned model slot.

`LocalFirstFlowTransport` accepts only the Port's dated `quotedRequest`,
`inputKind:proactive_followup`, absolute due instant, IANA zone and optional
current Persona projection. It copies the allowed fields, preserves quote text,
and rejects malformed or additional identity/authority/context fields before
dispatch. The quote uses the existing 2400 Unicode-code-point user-message
ceiling. Application/Store still own fresh actor, source, due/quiet, consent,
expiry and Persona permission checks; shape validation supplies no authority.

The model sees an explicitly labelled historical quote and follow-up instruction,
not a newly persisted user message. The adapter owns no store, source reader,
tool or sender. It returns the provider's raw message bytes without output
repair, second generation or semantic acceptance. Current Persona is expression
data only. F0 uses exactly local `qwen3.5:9b`, 8192 context, 512 output,
`think:false`, existing schema format and 30-minute keep-alive; no cloud fallback.

One injected `LocalModelLane` owns physical pending/unknown state across Chat,
Persona preview, F0 and empty preload. The existing controlled envelope receiver
was extracted as a shared helper with its 1 MiB, strict UTF-8, depth and duplicate
key checks unchanged. Delivery abort/deadline does not stop receiving the
original local response. Only a matching model and complete `done:true` envelope
release physical ownership. Late completion is withheld from delivery.
HTTP errors, socket/reader loss, partial/invalid/duplicate envelopes and wrong
model remain pending/quarantined; there is no reset, retry or fallback API.

This corrects a demonstrated old `LocalChatTransport` mismatch: HTTP503 had set
`done=true` and freed the lane, although the shared Port requires physical
stoppage evidence. Integration explicitly confirmed the correction. The old
test now expects quarantine, with additional cross-consumer fakes. A matching
terminal envelope with unusable content still releases the stopped model and
rejects delivery, rather than confusing output rejection with unknown execution.

### Composition handoff

Integration owns bootstrap, routes and application composition. The required
construction is:

```ts
const lane = new LocalModelLane('qwen3.5:9b');
const chatTransport = new LocalChatTransport(lane);
const firstFlowModel = new LocalFirstFlowTransport(lane);
// PreviewPersona receives chatTransport and () => lane.state.pending.
```

Both adapters expose the same `{pending,outcomeUnknown}` state. The worker uses
the existing `RequestBudget` and must withdraw delivery within its approved
deadline even when physical generation remains unresolved. Status/shutdown must
observe this shared lane. The old `LocalChatTransport(model,http?)` overload
remains for existing isolated callers/fakes; composition must explicitly pass
the single shared instance, never create one per feature. This commit does not
wire bootstrap or claim that the deployed application already uses F0.

### Source validation and unrun evaluation cases

Pinned Node 24.19.0 / TypeScript 7.0.2 build passed. The focused run passed
**56/56** tests across `local-first-flow-transport`, `controlled-ollama-transport`,
`simple-chat`, Persona preview, original evaluation and F0 fixture tests. Tests
cover shared admission, preload, invalid projection, cancellation/clock expiry,
late physical completion, known invalid output, eleven unknown-result cases,
and preview cancellation while F0 waits. All HTTP functions were injected fakes.

Before refactoring, the 24 current-prompt requests were captured through the
unchanged production serializer; its source bytes matched `24f913d`. The golden
records include complete URL/method/redirect/cache/headers and serialized body.
All 24 compare byte-for-byte after this change, including history, Persona,
prompt, schema and settings. Golden fixture SHA-256:
`b6a8673446a1a36cc5921e097ecacbf06aa752450227e9eddbab6ad7049027ee`.
The approved original 32-case corpus hash is unchanged.

Eight separate F0 cases are prepared in
`tool/ai-companion-eval/fixtures/f0-cases.json`, with a fake-only serializer helper.
They cover rest-versus-study relevance, starting-versus-completing, dated mood,
explicit language, unknown attendance, local-midnight dates, quoted instruction
injection and Persona authority boundaries. Fixture SHA-256:
`b9ada505ef4cb732c829c0f9eab959a33b8034c949d35e2ce06d37146ec45d70`.
QA pre-read the eight cases and found no case error blocking a freeze. Its
requested common criterion now distinguishes due time from actual dispatch time;
refusal alone cannot pass the notebook/Persona relevance checks. Final independent
review will bind the committed source. There are **no actual F0 outputs or
semantic verdicts**. No new preload, local model run, cloud call,
real account write or notification send occurred. F1a remains for the next
exact Context input contract. The previous local 12 Pass / 12 Fail semantic
result remains unchanged.
## F0 executable exact-eight entry point

`tool/ai-companion-eval/f0-run.mjs` defaults to `dry`: it hashes the executable
bundle, compiled adapters and unchanged eight-case corpus without network calls.
`--mode mock --out <new-private-path> --preload 1` exercises the same production
`LocalModelLane` and `LocalFirstFlowTransport` using injected fake HTTP.

Real execution requires `--mode local --allow-local true --out <new-private-path>
--authorization <private-json> --authorization-sha256 <exact-file-sha256>
--preload 0|1`, clean HEAD, pinned Node 24.19.0, an unexpired Integration slot
grant bound to HEAD/bundle/corpus, and an exclusive single-use slot claim. The
grant contains `schemaVersion=f0_local_authorization_v1`, `status=approved`,
`approvedBy=Integration`, `scope=enmori-f0-exact8-20261025`, `slotReference`,
`hostReadbackReference`, `sourceHead`, `sourceBundleSha256`, `corpusSha256`,
`model=qwen3.5:9b`, `maxGenerationRequests=8`, `maxEmptyPreloads=0|1`, `expiresAt`.
Authorization and executable hashes are rechecked after durable intent capture
at each actual HTTP boundary. A consumed grant cannot resume or retry.

The run uses one production lane: at most one empty preload, counted separately,
then each frozen F0 case once sequentially (8192 context / 512 output / think=false).
Delivery expires at 45 seconds; receipt continues up to 120 seconds. The harness
captures bounded raw response bytes and their hash before passing identical bytes
through the production receiver. Unknown physical outcomes stop the entire batch
without releasing/resetting the lane. Known complete but malformed, length-ended
or late output stays raw and ineligible; it is not repaired or repeated.

Private request/response artifacts, manifest, report and a hash-bound blank review
template are saved exclusively outside Git. The CLI prints only outcome/count/
timing metadata. Final harness/corpus/private-output checks passed 22/22, including
eight sequential cases, preload count, unknown/duplicate/invalid UTF-8/lost/large/
stalled responses, expiry/cancellation during capture, late completion, and grant
binding and response-artifact failure. The mock CLI completed one fake preload
plus eight fake generations with zero provider calls. These are harness/source
checks, not actual model or semantic evidence.
Independent QA separately confirmed the e2f092e adapter's 18/18 focused cases,
old production serializer byte identity for all 24 legacy requests, and the eight
F0 input projections. Root then assigned the sole local slot, conditional on this
CLI's completed self-check. Actual run evidence follows separately when available.

## F0 actual single pass at 4746eff

Root assigned the sole Ollama slot after independent e2f092e QA and CLI self-check.
Execution used clean `4746efffc2ae6e85f681a694af6a129175e2298b`, bundle
`98d9eefc71d54ff3fb2cc8d90f36471635d7f645007621ab6f379ed6d8d0b4aa`,
and the unchanged F0 corpus `b9ada505ef4cb732c829c0f9eab959a33b8034c949d35e2ce06d37146ec45d70`.
Host readback confirmed Ollama 0.40.4 and qwen3.5:9b digest
`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`.

There was exactly one empty preload (27.481 s), followed by eight sequential
generations, one per frozen case, with no retry or output repair. All nine
physical responses matched the model and `done:true`; all eight generation
outputs were protocol eligible within 45 seconds. Generation median was 3.468 s,
p95/max 4.442 s. The shared lane finished `pending=false/outcomeUnknown=false`.
These are protocol/timing observations; independent semantic QA was requested
and is not inferred from them. No product storage or notification delivery ran.

The private directory `~/.local/state/enmori-ai-companion-20261025/runtime/f0-local-4746eff`
has 22 exclusive files, including raw vendor bytes/text, request bodies, timing,
source manifest, report, artifact hashes and a blank bound review template.
Report SHA256: `593958fb878c0dc7ffe03fcd21a429a422199b1ad8d2b15f318f58a65c2382e4`.
Artifact-manifest SHA256: `180c619cd6e2bf4e7988e9a6762253e15933fda9ddc801640a8bbc2d23dfe908`.
The earlier 24-case local result and its independent 12 Pass / 12 Fail remain
separate; this F0 run does not replace that evidence.

## Free-only cloud supersession and bounded preparation

LI's direct “先用免费档……不要付费” instruction supersedes the earlier USD 1 paid
permission. Root preserved the history and recorded the selected existing Default
Gemini Project and eight-case scope in decision commit `15c9f32`,
`docs/decisions/2026-10-25-li-gemini-free-only.md`. No upgrade, recharge, paid
fallback, new project, API enabling, IAM grant or new credential was performed.

Read-only account evidence: Default Gemini Project `gen-lang-client-0930184174`
is labelled Free in AI Studio; Cloud Billing explicitly says no billing account
is linked; the Gemini API is enabled. Gemini 3.8 Flash displays 5 RPM / 250K TPM /
20 RPD. This is not proof of unused daily quota. The existing February 8 key is
restricted to the single Gemini API, with no application restriction and no
listed bound account. Its value was not displayed/copied and call eligibility
is unverified. Cloud Console's auth-key notice and the documented compatibility
of API-restricted standard keys require retaining that uncertainty; no new
service account or permission is inferred. ENMORI now displays Tier 1 / No
credits; the actor behind that change is unknown and its billing stays untouched.

Private allowlisted observation SHA256:
`eb81ece03e0601f50da44c81dce57a7f08365b2e3bba77d249ccdbe8d6989b8e`.
Credential-metadata SHA256 (no credential bytes):
`016068d48e813b6d5f32d0c6e7cbf490c5f44c5ebee07d725bbd0a848348810f`.
[Google's AI plan documentation](https://ai.google.dev/gemini-api/docs/google-ai-plans)
separates Pro's AI Studio web benefits from direct API billing and Google One
credits. [Pricing](https://ai.google.dev/gemini-api/docs/pricing) lists a free
Standard Gemini 3.8 Flash tier; [API-key guidance](https://ai.google.dev/gemini-api/docs/api-key)
describes restricted standard-key compatibility. Free requests remain synthetic-only.

The existing cloud runner now has a distinct free authorization schema, fixed
project/key API restriction, recent evidence hashes, protected server key-file
hash, source/corpus/subset hashes, exactly one pass and zero USD. Real paid mode
is rejected before any credential read or HTTP. Historical paid fake tests remain
as regression evidence, not permission. The default CLI is dry/zero-call. Real
free mode additionally requires `--mode free --allow-cloud true --passes 1
--max-usd 0 --authorization <private-file> --authorization-sha256 <hash>
--key-file <private-file> --out <new-private-directory>`, clean source and a
single-use authorization. Source, grant and key-file bindings are checked again
at each dispatch. The credential itself only enters the fixed API request header.

`free-cloud-scope.mjs` names eight unchanged cases from the original 32: the
reported-English/rest case, actual-study-goal, normal-chat, switch-to-english,
correct-personal-claim, past-mood-time, intent-not-attendance, and
quoted-instruction-not-authority. They cover five current-prompt and three
candidate-context cases, not the full 32-by-two evaluation or production F1a.
The runner permits at most eight counts plus eight generations. Both request
types share a minimum 15.1-second start interval (at most four per rolling minute);
waiting happens before provider timing and is followed by a new expiry/cancel/
source check. A 429, 402, authorization failure or unknown outcome stops without
retry, model substitution or paid fallback. Zero spend authorization is not an invoice.

Cloud regression/free tests: 19/19 passed. The private `mock-free` CLI completed
eight fake counts/eight fake generations, zero real calls, zero reserved USD.
Actual free execution is still **Not Run**: no key value has been read, no live
grant issued and Root's runner review/execution conditions remain outstanding.

## F0 independent semantic result and F1a serializer closure

QA independently reviewed every frozen F0 request/raw response and validated the
report and source hashes: **1 Pass / 7 Fail**, with only `f0-start-not-complete`
passing. The failures are old scheduling-request acknowledgement instead of an
actual follow-up, copied writing instructions, wrong first-person attribution,
an unsupported current-time claim, and a claimed saved reminder. Protocol 8/8
does not supersede these failures. QA's private review SHA256 is
`71016a62c02add8d8555606c892e8c7b237cc88e97577c3032a432a18ac074e1`;
`review.mjs` validation passed. Original raw/report/template files remain intact.

Following Root's explicit priority, Runtime merged Context `362d8cb` without
conflicts and adapted `LocalChatTransport` / `simpleChatGates` to its exact F1a
Port. Only `contextMode=selected_checkins_v1` admits supplied Check-ins; the
unselected legacy path still rejects them. The projection copies only source
`occurredAt`, canonical `noteText`, normalized `moodLabel`/`activityLabel`, plus
the separately allowed dated `replyToAssistant` AI quotation. Empty selected
sources and reply-only association work without fabricating a user/assistant
history pair. Current real user text and already authorized history retain order.
Canonical content validation reuses Check-in domain rules (including Mood-only
empty Note); it does not rewrite malformed data or authorize a source read.

Source IDs, versions, selection/account/topic keys, Weather and location fields
are rejected rather than silently accepted. Newly copied JSON cannot invoke an
inherited source `toJSON` hook to introduce private fields. Context/history/
permission/expiry checks remain Application/Store responsibilities. Prompt text
labels historical data and AI quotation, current language/correction priority,
unknown current state and absent action authority; that wording is not proof of
model compliance. No model output repair, new remote provider or source lookup.

Pinned strict TypeScript build and 49 focused checks passed: six new F1a adapter
cases, legacy Chat, shared-lane F0, Persona preview and evaluation harness. All
24 old production HTTP request bodies remain byte-identical to the frozen golden;
the original 32-case corpus and preserved 16-case source are unchanged. Evaluation
bundle manifests now also bind the imported canonical Check-in and shared helper
compiled files. These are fake HTTP/source tests only. No actual F1a model, store,
notification or device acceptance is claimed; Root owns final composition checks.

## One F0 message-act prompt candidate, no new actual run

After the 1 Pass / 7 Fail result, Root authorized at most one reviewable prompt
comparison candidate. Runtime read all eight raw outputs and QA rationales.
The common demonstrated failure was treating the historical request as something
to acknowledge/rebook, with related speaker, time and writing-instruction errors.

Only F0's system prompt changes. It now asks for the follow-up question itself,
explicitly maps historical `I/my/我` to the receiving user, applies rather than
repeats writing instructions, denies present-time inference/day-part greetings
from historical metadata, and forbids claimed/future reminder actions. One small
generic fern-watering example illustrates the message-act transformation; it
does not use any frozen fixture's topic or hardcode eight answers. This is a
bounded hypothesis, not demonstrated model improvement or a new output filter.

Offline comparison against all eight actual 4746eff request artifacts confirmed
that only `messages[0].content` changes: URL, full remaining HTTP body, minimized
user JSON projection, model, context/output budget, think and decoding settings
are identical. Old prompt SHA256:
`87f6b051a8b9bf61410cf1ba96f8035fc0ee3612c3cb10f653bbda1719dd89f6`.
Candidate prompt SHA256:
`fae3f317a5bac02a13f47994083991982b0fd040178517ee7de4dca6849f934e`.
Private eight-case comparison SHA256:
`4dec4afc4e053617fb8ea54d2fad655e6467fdfe2957b00dbdf5627401288366`.

Pinned strict build and 49 focused source/fake checks passed, including the F0
lane and exact-eight harness, six F1a projections and all 24 frozen legacy chat
request bodies. Original F0 eight-case and cloud 32/16 fixtures remain unchanged.
Candidate actual model calls: **0**. Root must review the diff and separately
decide a single fixed-eight comparison slot. The failed baseline remains failed;
there is no permission for repeated prompt rotation or indefinite tuning.

## Authorized second F0 comparison at 5c0e27d

After reading the actual candidate diff, Root assigned one final fixed-eight
comparison slot. The invocation used clean `5c0e27de4770f1a71ad0ec272fcfd63d8b448ee7`,
bundle `fa8a5e8484c6e752172a6f0d0dd112332bfc3289b3ce82ed4f89687769563e8f`,
the same corpus and criteria, and a new private authorization/single-use claim.
Read-only host verification found the same Ollama 0.40.4 / qwen3.5:9b digest and
an already resident 8192-context model; therefore **zero preload** was used.

Exactly eight generation attempts completed, once each, without retry or output
repair. All eight had matching `done:true` and eligible protocol responses.
Generation median was 2.029 s, p95/max 3.830 s. The shared lane finished
`pending=false/outcomeUnknown=false`. This is protocol/timing evidence only;
independent QA was asked to compare the two ledgers under the unchanged criteria.
No third prompt round is authorized, regardless of this candidate's result.

The new private `runtime/f0-local-5c0e27d` directory has 20 exclusive files.
Report SHA256: `7f39c97573b3fc7bf8babb6b9d3104971ad88546b602209476a8228f0cfcab37`.
Artifact-manifest SHA256: `d1d988fd08d5b036e471e3564ea8409767d9e5088441ad931047eaa69c47dd73`.
The separate two-run metadata comparison SHA256 is
`37442a216318a75c7d46969ea355235814eb3535325d7d4c61df3943174d0c2c`.
All 21 baseline artifact hashes were rechecked unchanged; baseline semantic
**1 Pass / 7 Fail** remains recorded. No product store, push or device action ran.

## Final F0 semantic ledger and free-cloud prerequisite still missing

Independent QA completed the second ledger: **5 Pass / 3 Fail / 0 unreviewed**,
validated against all 19 new and 21 baseline artifacts, 23 bundle files, original
criteria and identical non-system request content. Runtime also verified the
review hash and ran `review.mjs`: exit 0, `incomplete=false`. New review SHA256:
`d595f414c853b806530d8ed844533aa5f66777491be345f4bd3851c1f281ca05`.

The remaining failures are precise: rest presupposes the ten-minute rest already
happened; mood carries the previous night's quotation into “tonight” instead of
asking the requested next-morning current feeling; attendance asks about actual
visiting instead of the requested decision to go. The last response does not
assert attendance: its failure is relevance to the decision, not an invented
attendance fact. Cases 2/4/6/7/8 pass. These results do not merge into the earlier
1/7 ledger or establish a general quality pass. Root accepted the source as an
improved candidate, kept the quality gate open and ended local prompt/model
experimentation for this round. No more local generation is authorized.

Root independently reviewed the free CLI/runner/grant/ledger/fixed URLs/pacing,
passed its 19 guard/mock tests, and conditionally authorized the single free run
using only the existing restricted Default project key. Runtime refreshed the UI:
Default remains Free, Cloud Billing explicitly has no linked account, and the
existing key remains restricted to one Gemini API in that project. The refreshed
Gemini 3.8 Flash display remains 5 RPM / 250K TPM / 20 RPD. A 28-day peak-usage
display is not proof of remaining daily quota.

One required fact remains **unconfirmed**: Contributor enrollment. Project
details and User Settings did not expose enrollment status. Default's Logs
settings explicitly show both GenerateContent and Interactions request storage
disabled, with billing setup required for logging, but storage settings are not
Contributor enrollment. [Google's policy](https://ai.google.dev/gemini-api/docs/logs-policy)
describes Contributor as an invited, per-project opt-in; absence of a visible
invitation is not evidence of non-enrollment. Root was asked for an existing
operator statement or direct confirmation of that specific fact.

The private missing-prerequisite record SHA256 is
`2a0c4f914c3881cab1611010e254935a1ca62cf98df72b70246c82ecdbbd555e`.
No actual free grant was issued, credential value read/copied, new credential/SA/
IAM/API enablement performed, or cloud count/generation dispatched. Both cloud
call counts remain **0**. The bounded first count may establish whether the old
restricted standard key works only after all required facts are established;
there is no separate availability probe, paid fallback or permission to infer
the missing Contributor value.

## Authorized free run: operator assertion resolved, execution interrupted

Root decision `eb50e4098e4193eede7e078283aa95287c6f1702` records LI's exact
project-specific assertion, “没有接受或加入该计划”. Together with the previously
recorded adult / Singapore statements, this satisfies the operator assertion
conditions. It is not UI proof of Contributor status. Runtime freshly reloaded
the selected project's Free tier, no linked Cloud Billing account, single Gemini
API restriction on the existing February 8 key, and 5 RPM / 250K TPM / 20 RPD
limits. The existing key was read only into an owner-only 0600 file outside Git;
its value was not printed, placed in a command argument or clipboard, or committed.
No new key, service account, IAM/API/billing change or payment was performed.

Root had independently reviewed the runner and its 19 guard/mock checks, then
authorized exactly one fixed-eight free pass. The actual invocation used clean
`0c436bddc147bf7a0a761b37af3f533ac34b595d`, bundle
`8f3e405cb0fbed69c15eeb3cfe74483ad87c7f6334387b2dcf40d6b30fbb957f`,
selection `7c01a0def120672264174b25de162ad8b4b142b6b2caa067d6d34d59aefa9d4c`,
and the unchanged 32-case source corpus. Grant SHA256:
`f88af0f67bc455a8e355c307c0f665453ccc0147a89f02c42091e6d4b79d1841`.
Bound preflight evidence SHA256:
`7e311cff2934b77d3f5e63271e70314cade6c2c6f340b263340eafb408afae13`.
The grant permits at most eight counts and eight generations, one pass, 15.1-second
spacing across both request types, and zero USD. Its single-use claim remains consumed.

Observed execution: the first case's count returned HTTP 200, **189 input tokens**,
in **203.991 ms**. Exactly one generation intent/reservation was then persisted.
No generation response, runner `report.json`, or runner `stop.json` was written.
The command execution ended with exit **143**, consistent with SIGTERM, and no
matching runner remained at the bounded readback. Count success establishes that
the existing key worked for that count; it does not establish generation success.

The precise ledger is **one confirmed count + one consumed generation-attempt
reservation / unknown outcome**, zero observed generated responses, and seven
cases never reached. This runner does not durably distinguish intent from the
actual HTTP dispatch boundary; the first generation's network dispatch therefore
has evidence bounds 0–1, not a confirmed response or quality failure. Generation
latency, token usage and semantic quality are unknown. No retry, replacement key,
new grant, model swap, paid fallback or continued evaluation was performed.

The private `runtime/gemini-free8-0c436bd` directory contains the five original
write-ahead/source/count artifacts plus an explicitly labelled operator interruption
record and an artifact hash manifest (seven files). The operator record does not
pretend to be a runner final report. Interruption record SHA256:
`91b4d9bb91627db8cb5aa42dc5d83f65a33ee736641d876867938676449c0bbd`.
Artifact-manifest SHA256:
`651b2df04805f58e6f9b89cdf0b83ab058e783af30f6d0fc8a2b09de14aa1a29`.
QA was asked to audit these bindings and the uncertainty classification; there
is no model text available for a cloud semantic assessment.

## Bounded interruption diagnosis

Only this chat's execution lifecycle, the named runner source and existing private
artifacts were inspected; no further provider call or unrelated process diagnosis
was performed. The own-chat lifecycle record identifies
`exec-8c604b34-8231-4a65-8e18-129d7209aede`, tool session `28275`, source
`unified_exec_startup`: start **2026-10-25 16:23:08.307 +08:00**, completion
**16:24:33.776 +08:00**, duration **85.469 s**, status failed, exit 143.
The later `write_stdin` read returned that already completed status.

The submitted launch chain was exec shell → Python `subprocess.run` → pinned Node
`cloud-run.mjs`, with no submitted shell timeout or kill command. The runner's
45-second delivery limit only affects eligibility; its 120-second receive abort
cannot have expired before an 85.469-second command lifetime. Its signal handlers
only revoke delivery through an AbortController, no inspected source sends a
process signal, and handled failures use exit 2. Thus this is not evidence of a
runner-generated receive watchdog termination. The tool exposes the command-level
exit but no bound individual shell/Python/Node OS PIDs or signal-sender record;
the originating layer and reason remain unknown. Root stated it performed no
termination, restart or service operation, and no concurrent model request.

The separate private diagnostic `runtime/gemini-free8-interruption-audit/command-lifecycle.json`
has SHA256 `4c422946abb97a094525976d9edc04816e09de7a33a58115b09021ca173a58f2`.
The original evaluation artifacts and claim are preserved. The zero-USD grant,
zero monetary reservation and observed billing-disabled Free state are distinct
from an invoice or numeric balance measurement; no charge, generation-token total,
eight-case completion, model semantic failure or cloud adoption is claimed.
