# LI — repair the ten failed AI cases and configure Azure first

Date: 2026-10-28 (SGT). Authority: LI / PM.

LI instructed: “继续把那10条 AI 失败修好。云端优先用 Azure 已注册，可以开一个6.1 terra max子agent或对话来操控浏览器帮我配置好，ai选择GroqCloud 或Ollama Cloud，评估一下迁移难度，免费优先”.

Continue the [24-case assessment](../evidence/2026-10-28-li-takeover/semantic-assessment.md)
and the [cloud objective](2026-10-28-li-cloud-service-objective.md). Preserve the
original failed outputs and unchanged corpus. General prompt/model repair and
bounded synthetic verification are authorized by this instruction and the
[existing repair delegation](2026-10-24-li-ai-plan-model-repair.md); no hard-coded
fixture answer, fabricated semantic pass or weakened output/privacy check.

Azure is the preferred Backend host and LI reports registration complete. A
GPT-6.1 Terra / max subagent may operate the browser for account verification and
authorized configuration. Compare GroqCloud and Ollama Cloud as AI candidates,
prioritizing actual free-plan eligibility and compatibility. Read-only account
checks and reversible free configuration proceed; account registration is not
proof of a student subscription, quota or free inference. No paid upgrade,
unbounded billing or public credential exposure is authorized.

This narrows the previous deployment-choice uncertainty to Azure preferred plus
these two AI candidates. Specific resources, model, data-processing consent and
cost must still be concretely verified before adoption; local-only consent does
not silently authorize a new processor for private records. Synthetic candidate
work uses no real account or Firestore data. The personal-host deployment stays
available until a verified cloud replacement exists.

For local repair start with one general instruction-following prompt candidate
on the fixed 24 current-prompt cases: at most 24 serial generations, no retry,
8192 context / 512 output / thinking off, original delivery and physical receive
limits. Isolate its service slot and restore the existing unmodified service
after confirmed settlement. A second candidate requires inspecting this first
result and recording the concrete change; do not repeat blind prompt sweeps.

## Candidate disposition and Groq synthetic grant

The first local candidate completed 24 terminal responses. Unchanged-rubric owner
assessment: 15 pass / 9 fail, including three regressions. It is rejected and the
production prompt is restored; the failed experiment remains in commit
`012ae1ed` and `docs/evidence/2026-10-28-li-ai-repair/`.

LI completed Groq login and then explicitly completed creation of the requested
seven-day `enmori-synthetic-eval-20261028` key after being told it would be stored
only in a private local file and used for at most 24 synthetic cases. Browser
readback confirms Free Current Plan and GPT-OSS 120B limits of 30 RPM, 1,000 RPD,
8,000 TPM and 200,000 TPD. This authorizes one isolated, serial, no-retry pass of
the unchanged 24 current-prompt fixtures with `openai/gpt-oss-120b`, strict JSON
schema, non-streaming, low reasoning, no returned reasoning and at most 2,048
completion tokens including reasoning. Starts are spaced at least 30.1 seconds;
input plus output reservation remains below 4,000 tokens per call. Stop the run
on unknown, ineligible, over-limit or missing usage. No private account data,
tools, payment method, upgrade or production adoption is included.

Azure Education Hub shows US$100 of US$100 remaining and expiry 2027-10-28.
The older Sponsorships portal returned no active Sponsorship; Education Hub is
the applicable direct account balance evidence, not the generic offer page.

## One-time service ownership recovery

After being given the concrete same-boot dead-process lock recovery proposal,
LI replied: “使用灵活的方式自行决定，不需要死守规则”. This authorizes that
specific operational recovery: preserve the original lock and diagnostic
evidence, establish that its process and the service are stopped, archive the
lock, then start the original service once. It does not waive account privacy,
unknown-operation fences or authorize replaying an AI request. The standing
automatic lock guard is unchanged.

Read-only diagnosis found the configured first two DNS servers unresponsive,
while existing later resolvers worked. A process-scoped
`RES_OPTIONS=timeout:1 attempts:1` made the existing Firebase Auth and binding
reads succeed. Apply this reversible setting only to the original user service;
do not replace system DNS, change the model's delivery limits or migrate data.

## Second Groq pass

After the first Groq pass exposed remaining goal/label errors, LI explicitly
approved “允许再验证 24 条” in response to a proposal of one additional fixed
24-case synthetic pass, Free Plan only, US$0, no real-user data. Use profile
`goal-v2`: general goal/constraint instructions from
`tool/ai-companion-eval/goal-prompt-candidate.mjs`, preserving the original user
messages, history, Persona suffix and rubric. The output ceiling is reduced to
1,024 combined completion/reasoning tokens for the requested brief answers;
truncation remains failure. This parameter difference is part of the candidate,
not a speed comparison or a pure prompt-only experiment.

The first pass's 4,000-token reservation wording above described an estimate,
not a proven server token limit. Both passes use at least 30.1 seconds between
starts. Candidate whole-request UTF-8 byte estimates plus 1,024 output and 512
wrapper allowance have adjacent-pair maximum 7,534; that is still an estimate,
not a tokenizer or rate-limit guarantee. Actual usage is recorded and checked;
429, unknown outcomes, missing usage and ineligible output stop the run without
retry or upgrade. Free-plan eligibility is verified again before dispatch.

## Azure resource-provider registration

Read-only Cloud Shell checks returned `NotRegistered` for both
`Microsoft.Compute` and `Microsoft.Network`. LI then explicitly approved:
“允许启用这两项并继续配置”, after being told registration enables these official
providers and may add their Microsoft applications, but does not itself create
a billed VM or open public ports. Register these two providers only and verify
their states before treating SKU/quota results as provisioning evidence.

Both providers subsequently read back `Registered`. East Asia quota returned
0/6 regional vCPUs and 0/10 `standardBasv2Family` vCPUs. No VM, public endpoint,
production cloud credential or paid-plan upgrade was created. Quota is not
capacity or an adoption decision.

## Evaluation disposition

The original ten failures remain preserved. The local instruction candidate
passed 15/24 with three regressions and was reverted. Groq baseline passed
14/24; `goal-v2` passed 15/24, with seven original failures improved, three
remaining and six original passes regressed. All assessments are explicitly
non-independent. Neither Groq profile is adopted; the two authorized 24-case
Groq passes are exhausted. The original production prompt, model and local
processing boundary remain in force while the recurring failures are diagnosed.

The isolated `baseline-medium` profile is prepared for review, not authorized
for execution: it changes only baseline `reasoning_effort` from `low` to
`medium`, keeps the original 24 inputs and 2,048 completion ceiling, uses at
least 61 seconds between starts, and requires a new specific grant. Its
preparation neither extends the exhausted 48-call grant nor adopts Groq for
real-user data. The [diagnosis and exact proposal](../planning/2026-10-28-ai-semantic-repair-next-step.md)
remain separate from a successful semantic result.

## Third Groq pass: single-variable reasoning comparison

After the prepared profile and 38/38 source tests were reported, LI explicitly
approved “允许这 24 条单变量验证”. This grants one additional pass of at most
24 unchanged synthetic cases using `baseline-medium`: original baseline
messages, GPT-OSS 120B, strict schema, 2,048 completion tokens and only
`reasoning_effort` changed from `low` to `medium`. Keep Groq Free Plan, US$0,
no real-user data, at least 61 seconds between starts and no automatic retry.
Recheck account eligibility before dispatch. Ineligible, truncated, unknown,
rate-limited or missing/over-bound usage stops the run. This supersedes only the
previous absence of a grant for this one profile/pass; the first two consumed
grants, rejected profiles and production adoption boundary are unchanged.

The pass completed 24 protocol-eligible responses without retry. Owner-assisted
assessment is 16 pass / eight fail: six original failures improved, four
remaining and four original passes regressed. The grant is consumed, bringing
the total to 72 synthetic Groq calls. Reject this candidate too; do not adopt a
new processor or weaken the corpus based on protocol eligibility or the larger
pass count. The [final assessment](../evidence/2026-10-28-li-ai-repair/groq-baseline-medium-assessment.md)
preserves all failure evidence and the borderline case-15 judgment.

## Fourth Groq pass: targeted system-instruction comparison

LI requested continued quality repair and real cloud integration, retaining
Groq Free Plan and deferring the replacement APK until off-host phone validation.
After the eight remaining failures were grouped and the concrete
`constraints-v3` profile passed 41 offline tests, LI explicitly replied
“允许这 24 次对照验证” to a new maximum of 24 synthetic calls. Reference:
`call_3833006e82c747b0bcc97d51a7917b36`.

Compare against `baseline-medium`: same GPT-OSS 120B, medium reasoning,
2048 completion tokens, strict schema, original 24 cases and exact user/history
messages and Persona suffix. Only system instructions change, addressing latest
goal/correction precedence, exact historical facts, available materials and
whole-answer count/time limits. No case identifiers or expected answers enter
the generic instructions. This is exploratory, not a guaranteed repair.

The existing runner's serial 61-second spacing, 45-second delivery/120-second
receive bounds, no retry/fallback/resume, fresh one-use private grant and stop
conditions remain. Groq Free Plan and the 30 RPM / 1000 RPD / 8000 TPM / 200000
TPD account limits were rechecked in the console before dispatch. US$0 maximum;
no real-user data, paid upgrade or adoption of a failed model. Earlier 72 calls
remain consumed; this adds only this one 24-call grant. Production prompt and
processing boundary remain unchanged pending evidence and integration.

The fourth pass completed 24 protocol-eligible responses. Under the unchanged
rubric, `constraints-v3` remains 16/24: seven original failures improve, three
remain, and five original passes regress. Compared with baseline-medium,
label recall and one-question adherence improve, while unsupported chapter
content and an extra post-plan action regress. The candidate is rejected.
All four grants are consumed: **96 synthetic Groq calls**, no further grant.
[Assessment](../evidence/2026-10-28-li-ai-repair/groq-constraints-v3-assessment.md).
