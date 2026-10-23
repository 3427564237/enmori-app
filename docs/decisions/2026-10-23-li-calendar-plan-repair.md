# LI — calendar statistics and small-plan relevance repair

Authority: LI/PM's direct request in the Integration chat on 23 October 2026:
“把月历统计和 AI 小计划偏题的问题修好，先跳过真机验证，保留现有数据。”

This authorizes bounded source repairs and local verification of the two findings
in [the v25 device record](../evidence/sprint3/2026-10-23-li-group-v25-device.md).
It supersedes that record's diagnosis-only disposition for these defects and the
earlier module ownership restriction only as needed for Integration to repair them.
It does not change any product, data, privacy, or API contract.

- Calendar statistics retain the authenticated owner and exact civil-day ranges.
  Reuse the existing history index; no index deployment, migration or record edit.
- Small-plan replies should follow the user's actual goal and constraints, rather
  than turn contextual descriptions or labels into unrelated work. Preserve direct
  input, current permitted conversation history, Persona expression, explicit Send,
  cancellation and unknown-outcome handling. Do not add content rejection filters,
  automatic retries, private-context reads, or synthetic fallback answers.
- Use isolated fixtures and, where needed, fresh synthetic non-persistent local
  model probes. These are new diagnostics, never retries of historical operations.
  They do not read or write real account/chat records.
- Skip phone interaction, installation and device testing in this repair round.
  Preserve the installed v25, earlier device observations and original test records.
  Shared-service deployment/restart, dependency changes and main merges are outside
  this source-repair round; report their status separately.

Retain the earlier [core scope](2026-10-19-li-core-feature-delivery.md),
[local AI simplification](2026-10-19-li-ai-mvp-simplification.md),
[AI small-plan decision](2026-10-23-li-ai-product-round.md),
[Journal decision](2026-10-23-journal-product-round.md) and
[integration delegation](2026-10-23-li-product-round-integration.md).

## Follow-up after three unsuccessful prompt candidates

LI selected “继续诊断现有 9B 模型的配置和消息处理（推荐，保留数据）”
in this same repair conversation. Continue diagnosis of the existing local 9B
model's configuration and message handling, using isolated synthetic probes.
This resolves the debugging workflow's discussion checkpoint; it does not approve
changing the model, adding data sources, clearing records, restarting/deploying
shared services or resuming phone testing. Preserve all three failed prompt
candidates and their evidence. Adopt only changes supported by fresh results.
