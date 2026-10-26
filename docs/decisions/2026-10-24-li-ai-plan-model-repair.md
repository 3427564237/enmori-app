# LI — repair small-plan relevance, including local model alternatives

Authority: LI/PM directly requested in the Integration chat on 24 October 2026:
“继续把 AI 小计划偏题的问题修好，可以尝试其他模型，保留现有数据。”

This supersedes the existing-model-only restriction in the
[19 October AI simplification](2026-10-19-li-ai-mvp-simplification.md) and the
diagnosis-only/model-replacement stop in the
[24 October deployment decision](2026-10-24-li-calendar-deploy-9b-diagnosis.md)
only as necessary to repair the small-plan relevance defect.

- Compare suitable local models through the existing Ollama service. Download
  official model artifacts within the host's available resources; preserve the
  existing Qwen3.5:9b artifact and prior failed evidence for rollback/comparison.
- Adopt a local model/configuration repair only after the preserved Chinese and
  English failures, correction/history behavior, ordinary fresh goals, protocol
  validity and host latency/resource checks support it. Retain the existing API,
  authorized context projection, explicit Send and unknown-outcome handling.
- The requested repair includes bounded source/configuration changes and their
  necessary deployment to the existing controlled backend through its supervisor.
  Preserve the already deployed calendar repair and a rollback path. Do not
  silently include unrelated round-two changes or introduce a new service.
- Preserve existing account, Persona, Check-in, participation and conversation
  records. Use fresh synthetic non-persistent model fixtures first. Any final
  device/service check must not retry an old operation or rewrite old messages.
- Do not add a cloud provider, paid service, schema migration, broad context
  access, content-rejection filter, canned fallback answer or automatic retry.
  Keep 8192 context, 512 generation tokens and the current delivery deadline
  unless fresh evidence and an explicitly recorded scoped decision justify more.

Model choice and prompt/configuration details are implementation decisions within
this repair delegation, not a new business rule or model-quality guarantee.
No main merge, general release or data reset is authorized. Preserve the source,
runtime, synthetic evaluation and device evidence as distinct observations.

## Bounded implementation experiment

The non-thinking comparisons across Qwen and Gemma candidates did not pass the
preserved corpus. Gemma 4 with thinking enabled reached the 512-token limit in
12.246 seconds before producing a final answer. Under the repair's configuration
delegation, the next synthetic experiment allows up to 1536 combined reasoning
and output tokens for this candidate. This is an implementation experiment, not
a new PM business rule or an adoption claim. It keeps the 8192 context, original
45-second delivery deadline, 120-second physical receive limit and public
2400-character message contract. No production limit changes until the complete
corpus and measured latency justify the candidate profile.
