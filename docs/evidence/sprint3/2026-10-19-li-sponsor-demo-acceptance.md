# Sponsor demo acceptance — 19 October 2026

Authority: [S-PM-1019-LI-SPONSOR-DEMO-LOCAL-TAKEOVER](../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md).

This is an execution ledger. Component results below do not establish final APK/device acceptance. Every outstanding row stays Not Run or Blocked until observed on the final candidate.

## Source and environment

- Reviewed inputs: #158 `78757646953ccf80f47180f9443d81a055844615`; #150 `c2c923c08bbbf0f1bda9a54697b7c5ba0c4c0cc3`.
- Clean local merge `157778c`; confirmed PM decision baseline `97b169f`.
- Fixed Node24.19.0/TypeScript7.0.2 and Flutter3.47.2/Dart3.13.2; existing locked dependencies only.
- Initial baseline strict TypeScript: Pass. Affected diagnostics/transport/operator tests: 76/76, fail0/skip0, exit0.
- Unprivileged diagnostic Python: 11 Pass /16 Skip, exit0. Real root-storage/parser and installed UID checks are not established by this run.
- Original host audit failure retained: prior-provision-receipt/FileNotFoundError. V2 inventories missing history and independently checks current identity/permissions; no historical receipt is reconstructed.
- Actual vivo connection/awake observed; no new APK installed at this ledger checkpoint.
- Existing Ollama model tag visible; no loaded model and controlled service ports free at initial read-only check. No new generation invoked.
- Actual private config identity, final source/APK/SHA256, installation, scheduled cleanup and device results: Pending.

## Required final same-candidate journeys

| Journey | First round | Second round | Evidence / limitation |
| --- | --- | --- | --- |
| In-app registration, privacy, interest save, reentry, logout/login | Not Run | Not Run | Final source/APK/runtime pending |
| Real browse + interest recommendations, Detail, external opening, return, Reload | Not Run | Not Run | Final source/API/device pending |
| Optional end time, cache expiry, stable occurrence ID, source error | Not Run | Not Run | Fixtures are component evidence only |
| Primary search/request, secondary accept, primary friend readback | Not Run | Not Run | Two exact verified Firebase identities required |
| Save Note, date Footprint, Detail, return, persistence | Not Run | Not Run | Final actual controlled storage required |
| History paging, failed page preserves cursor, same-cursor retry | Not Run | Not Run | Sufficient owned records and controlled failure required |
| Persona, three continuous real9B sends with prior context | Not Run | Not Run | No new model request before prerequisites |
| Leave/reopen AI, read messages, send again | Not Run | Not Run | Same account/conversation canonical storage required |
| Source authority change, full-budget rejection, ordinary input/draft recovery | Not Run | Not Run | Final combined behavior required |
| Cancellation last, original operation settlement retained | Not Run | Not Run | Never blind resend or reset unknown result |
| Full connected rehearsal incl relogin/reentry/reuse | Not Run | Not Run | No whole-app acceptance before every core row passes |

## Host and delivery gates

| Gate | Status |
| --- | --- |
| Current UID/lock/nologin/groups/directories/effective privilege audit | Blocked: human local sudo authentication pending |
| Reviewed capture immutable installation and actual restricted UID allow/deny/raw path | Not Run |
| Actual installed synthetic append/read, unchanged loggedAt | Not Run |
| Expiry/delete/fail-closed root synthetic suite | Not Run |
| Real scheduled cleanup and desktop-login independence | Not Run |
| Current TLS/tokenizer/model manifest/context and exclusive ownership | Not Run |
| Final same APK `com.enmori.app.sponsordemo` and existing-app preservation | Not Run |
| APK SHA256/source/config receipt and reproducible source | Not Run |
| Final runbook, startup/recovery, known failures, private credentials file | In preparation |

No main merge, remote publication, task closure, UAT/Release/Done or full-application acceptance is claimed.
