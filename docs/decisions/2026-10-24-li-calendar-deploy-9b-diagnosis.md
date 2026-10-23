# LI — deploy the calendar repair and resume existing 9B diagnosis

Authority: LI/PM's direct request in the Integration chat on 24 October 2026:
“把月历修复部署到现有后端，再继续诊断现有 9B 模型的小计划偏题问题，保留现有数据，暂时跳过真机验证。”

This supersedes the no-deployment restriction in the
[calendar repair decision](2026-10-23-li-calendar-plan-repair.md) and the
deployment/model-diagnosis stop in the
[second-round decision](2026-10-23-li-product-round2.md) only for this work:

- Deploy the established descending-order calendar count repair to the existing
  controlled backend, using its existing supervisor, environment and dependencies.
  A necessary graceful restart is authorized. Retain a rollback copy and verify
  service health and the real read-only calendar path.
- Continue bounded diagnosis of the existing Qwen3.5:9b configuration and message
  handling with fresh synthetic, non-persistent requests. Preserve the previous
  58 probes and all failed candidates. Compare evidence before proposing changes;
  do not resume an unbounded sequence of prompt edits.
- Preserve existing accounts, Check-ins, Personas, conversations and unresolved
  operations. No schema/index migration, data reset, historical-operation retry,
  replacement model, cloud provider or new dependency is selected.
- Skip phone interaction, installation and physical-device validation. The v26
  APK and its previous evidence remain separate. No main merge or unrelated
  second-round feature deployment is included.

The original privacy, authorization, current-message/history/Persona projection,
explicit Send, cancellation and unknown-outcome contracts remain unchanged.
Read-only deployment checks and source tests are not physical-phone acceptance.

## Connected-phone follow-up

After the deployment report, LI stated “手机已接入”. Resume the previously
requested bounded phone verification against the newly deployed calendar repair
and the existing installed app, including English/Chinese selection across app
process restarts. This replaces the temporary phone-testing pause only for these
checks. Preserve app/account data and restore the original interface language.
No new installation is necessary for this backend-only repair. No new account
record, AI conversation, historical-operation retry or whole-phone reboot is
selected by this follow-up.
