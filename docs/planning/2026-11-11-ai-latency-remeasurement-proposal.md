# Bounded AI latency remeasurement after the 11 November source repair

Status: proposal; no paid call or grant refresh authorized by this file.

## Concrete candidate

The current repair overlaps independent Firestore reads within the existing authorized transaction. It preserves all external Auth, cloud-consent, source/history, budget, epoch, write-acknowledgment and delivery checkpoints. No model, prompt, architecture, API, database schema, dependency, region or timeout changes are proposed here. Keep `gpt-6.1-sol`, low reasoning, `goal-grounding-v1`, structured nonstreaming Responses and `store:false`.

Before execution, pin the repaired source commit and deployment package hash, with passing full Backend tests, full Flutter tests and static analysis recorded. The experiment measures the actual repaired request path; it must not infer the 15-second result from unit tests or historical results.

## Requested authorization and inputs

1. Permit at most **three synthetic paid requests**, sequentially, with a maximum reserved bound of **US$0.04096 per request / US$0.12288 total**, charged inside the **original US$3.40 grant and original credit cycle**. No allowance increase, replacement cycle, new model or automatic billing.
2. Verify the current provider balance, credit expiry and official current pricing. The last historical balance/pricing evidence expired at 00:00 Singapore time on 6 November; it cannot authorize a new call on 11 November. A verified evidence refresh must retain the original grant identity, cap, credit expiry, attempts, charges and unknown holds. If the fresh evidence cannot be obtained, do not arm or dispatch.
3. Permit a dedicated temporary **non-Admin synthetic identity**, if the prior synthetic identity has been deleted, to accept the existing OpenAI disclosure and run only the fixed prompt below. Do not mint tokens for a real user or use their conversation/history/Check-ins. Clean up the test identity and its known test-owned records after reconciliation; keep any unresolved financial hold intact.

Fixed prompt: “我今天学习了一阵子，现在想休息五分钟。请给我一个简单、不需要任何物品的放松建议。”

## Execution and stopping rules

- Terra performs operation and acceptance; root retains diagnosis and code ownership.
- Stop and drain the existing Azure and local writers before a one-use expected-fence claim. Verify exclusive owner and the exact candidate before any paid request. No automatic takeover or blind retry.
- Check live remaining credit, expiry, rate and cost reservation before each request. If an operation times out or returns an unknown result, stop dispatching, preserve its original identity/hold, and reconcile via the existing readback path.
- Report preparation, execute and full-response times separately, plus provider usage/accounting timing where available. Three successful samples do not establish p95, reliability, phone acceptance or Release/UAT. The complete-reply target remains 15 seconds.
- After the bounded trial, withdraw the temporary test consent, drain/disarm cloud generation and restore the ordinary Azure/local service state. Verify rollback and record only redacted timing/count/status evidence in Git.

This extra approval is required by the explicit no-paid-dispatch scope in [the prior follow-up decision](../decisions/2026-11-05-li-followup-runtime-admin-validation.md), and the freshness / original-cap / exclusive-owner conditions in [the bounded Sol decision](../decisions/2026-11-05-li-sol-test-app-acceptance.md). The user's ordinary repair request remains sufficient for source fixes, tests and read-only diagnostics, which continue independently.
