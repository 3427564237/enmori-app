# Backend product round: reboot lock recovery

Scope: implementation repair under the current Backend task and [existing retained-data decision](../../decisions/2026-10-19-li-local-dependencies-first.md). The [v24 checkpoint](2026-10-23-li-group-v24.md) records an old-boot process lock preventing startup; its intermittent initial Settings-read failure is a separate, unresolved finding. Integration confirmed ownership of the affected launcher tools in this round. No new product decision is introduced.

## Consumer and contract

The existing `run_real_account_local.mjs` entry serves App/Profile/Settings, Social/Events, Journal and AI. Its `wx` lock creation previously rejected any leftover lock after reboot. An isolated regression reproduced `EEXIST` with a valid previous-boot record before the fix.

Implemented: the Node entry alone acquires process ownership before Firebase composition or listening; Python start delegates to it. A valid private process lock from a different Linux boot can be recovered. The unchanged lock metadata is `{pid, startTicks, bootId}`; only operational ownership is inspected. Current-boot, malformed, linked, unknown-owner or unsafe-permission records fail closed. Missing PID alone does not authorize recovery.

One exclusive hard link retains the old lock as `real-account.lock.recovered-<old-boot-id>`. It elects one reclaimer for that old boot and is never removed automatically. The original inode/content are checked before unlink; replacement creation remains exclusive. An interrupted claim requires operator inspection, not a retry that clears state. Shutdown checks inode/content before deleting its own lock. No process signalling is added.

API request/response fields, authentication, permissions, consent, time zones, pagination, business data, indexes and migrations are unchanged. Older valid lock records remain readable. Missing/invalid fields prevent recovery. Flutter requires no wiring change. No business data, private configuration, credentials or AI operation fence is read, modified or cleared by the helper. No model call, deployment, restart policy, dependency or port is added.

## Module compatibility checked

All four consumers confirmed reuse of existing contracts in this round:

| Consumer | Existing API boundary | Backend change needed |
| --- | --- | --- |
| App draft recovery | Profile/Settings revision save and explicit readback | None |
| Social saved plans | Own participation cursor pages; existing detail and revision mutation | None |
| Journal month review / selected map point | Owner month counts/date pages and authorized single social record | None |
| AI Small plan / Persona preview | User-reviewed text through existing prepare/execute/result/history; separate preview | None |

No new interface is proposed or awaiting approval. The launcher repair is implemented; runtime acceptance is pending Integration.

## Verification and handoff

- Node **24.19.0**, `node --test tool/real_account_lock.test.mjs`: **28/28** pass after adding the interrupted-claim and delayed-contender regressions. The earlier reproduction failed on the previous-boot test as expected.
- `python3 -m unittest discover -s tool -p test_real_account_local.py`: **1/1** pass. Mocked child launch preserves the existing lock and delegates acquisition to Node.
- `node --check tool/run_real_account_local.mjs`, `node --check tool/real_account_lock.mjs`, `git diff --check`: pass.
- Tests use temporary directories and synthetic old-boot metadata. Two eight-process contention cases prove one winner for fresh and previous-boot starts. Tests also retain synthetic business/fence files unchanged, reject malformed/unsafe locks, preserve interrupted claims, and prevent late recovery or shutdown from deleting a replacement.
- No Backend/API TypeScript changed, so no unrelated build/full suite or Emulator run was required. Firebase, Ollama, shared service restart, actual reboot and device startup/readback: **Not Run**. The source fix does not resolve the separate intermittent Settings-read incident.

Integration takes the complete commit and existing launcher path; no config migration is required. Review the new helper plus launcher/Python wiring together. Any authorized runtime switch should retain the existing configuration and business/fence evidence, verify one runner and current ownership metadata, then check identity-gated readiness and consumer readback. This delivery does not perform that switch.

Implementation references: [Node 24 exclusive file flags](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags), [Linux process start-time identity](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html).
