# LI — bounded Sol test-app acceptance with one deferred synthetic case

Date: 2026-11-05 (Asia/Singapore). Authority: LI / PM.

After reviewing the [minimal-repair results](../evidence/2026-11-04-openai-goal-repair/README.md),
LI stated: “我觉得可以暂时跳过这个，因为我正常输入的话不会输入这些”.
In context this defers the artificial verification-label/rest-goal case
`reported-english-goal-chinese-reply` as a blocking test-app acceptance criterion.
It does not assert that the model correctly handled that input or waive general
goal following, corrections, genuine device-testing requests or factual grounding.

This explicitly supersedes the all-24-pass test-app gate in the
[2 November recovery decision](2026-11-02-li-cloud-ai-backend-resume.md) and
[4 November minimal-repair decision](2026-11-04-li-luna-first-minimal-goal-repair.md)
only for this one named case and only for the bounded test-app trial.
Keep the original input, rubric, response and failed judgment unchanged. Report
the observed result as 23/24, with one deferred nonblocking failure; report the
remaining blocking set separately as 23/23. Do not relabel the excluded failure
as a pass, silently remove it from the corpus, or claim general Release/UAT.

## Candidate and scope

Select `gpt-6.1-sol`, low reasoning, explicit `goal-grounding-v1`, nonstreaming
structured Responses and `store:false`. Its independently reviewed report
`f63c8dd806a5554b9f7db014559c92db04c7bee15d07fd1ffe71607a22268250`
passes every other case without prior-pass regressions. No new model evaluation
or prompt sweep is needed to implement the waiver.

Luna is not selected: its unsupplied-paper and internal-time-arithmetic failures
remain blocking. Neither is within LI's explanation about artificial labels.

Continue the already approved test-app integration. Plain Conversation may open
after its consent, budget, exclusive-owner, exact-request token-bound and
compatibility checks pass. Persona generation and proactive scheduling remain
closed to OpenAI until their separate authorization and withdrawal checks pass.
Existing ordinary Backend and Firebase data are retained. The client must bind
both request processing and its disclosure to OpenAI and require explicit new
acceptance. Old Groq acceptance or an unmarked legacy request never authorizes
OpenAI dispatch. Synthetic automatic tests remain separate from user-initiated
real-data acceptance.

## Preserved operational limits

The original US$3.40 cap, original credit cycle and all attempts remain in force.
At the last verified read there were 98 attempts, 96 settlements,
US$0.0872567 spent and US$0.004096 held. Today's balance, expiry and prices must
be verified before any new calls. A freshness refresh within the same cycle may
update verified evidence only through an explicit reviewed operator step; it
must retain the same grant identity, original cap, cycle and credit expiry,
all counters and attempts, charges and unknown holds. It cannot replenish
allowance or enable automatic renewal. Unknown state closes generation.

Use the existing Japan East service and its managed identity/WIF/HTTPS; there is
no new regional trial. Before arming cloud startup, confirm the old Azure and
local processes are stopped and drained. A one-use expected-fence claim must
not automatically take over another process. Every Settings writer in an armed
service uses the same consent fence. Monetary expiry/exhaustion closes AI while
ordinary operations continue. An unconfirmed ownership claim cannot authorize
Settings writes concurrent with a possible old cloud owner.

Preserve rollback, same-signature upgrade and user data. Deliver source,
synthetic/cloud, APK and phone evidence separately. A deferred quality case does
not waive privacy, authentication, budget, ownership or physical-device checks.
