# LI — v26 update and bounded phone acceptance

On 25 October 2026 (Asia/Singapore), LI directly requested:

> 按这个清单继续，先把 v26 覆盖安装到我的手机，保留现有数据，再验证新增功能和中英文切换重启后的保留情况，AI 小计划偏题先跳过。

This resumes physical-device work for the signed v26 candidate described in
[the v26 delivery record](../evidence/sprint3/2026-10-24-li-group-v26.md).
It supersedes that candidate's skipped-install/device gate only within this
bounded acceptance run. It does not change the candidate's product source.

- Verify the connected phone, installed package, candidate hash and matching
  signer before a normal same-package replacement install. Do not uninstall,
  clear application data, reset an account or change credentials.
- Preserve a private before/after baseline of existing account, Check-in,
  Persona, participation and conversation data. Existing records must remain
  unchanged. The accepted checklist includes creating one clearly marked new
  private test Check-in from an old record's new-draft flow; verify copied values
  before replacing its note with synthetic test text and explicitly saving it.
- Verify Home's today entries, the new-draft flow, visible participation
  comparison and chat-history lookup where existing authorized data permits.
  Do not create friendships, change others' data or broaden sharing to fabricate
  a test fixture. Record unavailable coverage honestly.
- Verify Chinese and English after application process termination and a fresh
  launch, with a short calendar/history regression. Restore the initial language.
- AI small-plan relevance is deferred. Do not continue model downloads, prompt
  tuning, generation probes or retry historical AI operations in this run.
- Use the existing backend and installed model configuration. No general runtime
  deployment, main merge, publication or full UAT/Release claim is included.

Keep source, package, physical UI observations and data readbacks distinct. Raw
screenshots, identifiers and account contents remain in owner-only local evidence.
