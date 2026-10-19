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
- Initial checkpoint: vivo connected/awake; candidate not yet installed. Subsequent successful installation is recorded below.
- Existing Ollama model tag visible; no loaded model and controlled service ports free at initial read-only check. No new generation invoked.
- Final production source through `654f49f`; evidence tail `fd3d958`; tests-only harness fix mapped from reviewed `f6a9ab5` to combined `a11cdfd7cd6d27b3e74b41c12ced29efed76cd1b`.
- Final combined strict Backend build and full Backend tests: **1008/1008**, zero failures/skips, exit0.
- Final combined full guarded Auth/Firestore/HTTP/Dart SDK: **176/176**, zero failures/skips, exit0; inner/outer profiles removed and required ports free. Models and provider are explicit doubles, not live-provider/model evidence.
- First combined full Flutter: **748 Pass /2 Fail**, exit1. The two stable harness failures (ambiguous Scrollable; lazy status outside built viewport) were independently reproduced and retained. Reviewed tests-only fix preserves controller status/draft/selection/focus/no-new-request/exact-Retry assertions; production code is unchanged.
- Final combined full Flutter on `a11cdfd`: **750/750**, exit0. Fatal-info analysis on combined production source: no issues. Tests-only fix independently analyzed without issues.
- Final combined operator: **25/25**, zero failures/skips, exit0. Python: **32 Pass /16 Skip** out of48, exit0; skipped root cases remain Not Run.
- Candidate APK built at source `a11cdfd7cd6d27b3e74b41c12ced29efed76cd1b`: `com.enmori.app.sponsordemo`, version1.0.0-sponsor20261019+1, 167460076bytes, SHA256 `afa2026164973bc1e8fb32ed4d51b1f0d336589b155188eb5d320e7f1547bc4b`. Signer SHA256 `0353f50d507f56ee2d8344e56b7b84d6afccdff31cab5a4ca8a69060a9979106`.
- Exact source archive SHA256 `2a3c0ba188895622dafb0faaf51c3ecfcd644c7ca30f146587932dda60983340`. Actual known Ticketmaster key and TLS private key absent from tracked source and every uncompressed APK member. No private runtime credentials were compiled in.
- Actual install attempt: **Fail**, `INSTALL_FAILED_ABORTED: User rejected permissions`; no automatic retry/bypass. Actual Android user0 verified; candidate absent there. Existing `com.enmori.app.personatest` remains present with unchanged APK bytes; no old-package clear/uninstall was performed. A default all-users package inspection separately encountered shell denial on another Android profile; the actual user0 checks were then performed explicitly.
- After explicit user confirmation, a second install of the exact same APK succeeded in Android user0; installed bytes match the candidate SHA256. Original rejected install receipt remains preserved. Existing personatest APK bytes remain unchanged. Candidate launched to private-handoff waiting screen; core journeys remain Not Run.
- Current independent host audit confirms UID960/GID960, locked password, nologin and restricted groups. Process-local capability controls verified Inh/Prm/Eff/Amb=0 and bounding=0xc0; no subordinate UID/GID delegation and actual host-root mapping denied. This is not a claim that every file capability is eliminated.
- Root synthetic diagnostic suite: **27/27**, zero skips, exit0. Installation reached its final health check and returned nonzero; original receipt and partial installed state retained, cause unresolved. No reinstallation/reset was performed. Follow-up bounded inspection matched installed helper/wrapper hashes; root and actual restricted UID each returned `CAPTURE_OK`, store failed=false, no failures. Remaining narrow verification then passed: actual restricted UID allow/deny/raw access boundaries, exactly one synthetic append and two identical reads with unchanged loggedAt. No diagnostic reset/reinstall was performed. System timer active. Actual desktop exit at08:59:19, system timer cleanup at09:00:00 Result=success/exit0, and new login at09:01:03 establish an actual invocation without the desktop session. Post-return root and restricted health both passed in the subsequent verification.
- Runtime snapshot installation was interrupted by the operator with Ctrl+C during a copied runtime file fsync, before writable service work/session construction or any business/model launch. Original empty receipt, stderr and root-owned partial snapshot are preserved; original installer is not rerun. A bounded missing-files-only recovery is being reviewed.
- Candidate distribution includes APK/source/checksums/receipt and acceptance/runbook/known limits. It is not a frozen accepted demo. Final actual runtime/configuration identity, scheduled cleanup, real source/model and both connected phone rounds remain Not Run/Blocked.

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
| Current UID/lock/nologin/groups/directories/effective privilege audit | Pass: independent current host audit and actual process/subordinate mapping checks; historical receipt absent |
| Reviewed capture immutable installation and actual restricted UID allow/deny/raw path | Pass: exact helper hashes, root/UID health and actual allow/deny/raw path boundaries; original installer final-health failure remains unexplained |
| Actual installed synthetic append/read, unchanged loggedAt | Pass: exactly one synthetic record, acknowledged append and two exact unchanged reads |
| Expiry/delete/fail-closed root synthetic suite | Pass: actual root 27/27; installed scheduled proof remains separate |
| Real scheduled cleanup and desktop-login independence | Pass: actual09:00 system invocation between08:59:19 logout and09:01:03 new login; Result success/exit0 |
| Current TLS/tokenizer/model manifest/context and exclusive ownership | Not Run |
| Candidate APK `com.enmori.app.sponsordemo` and existing-app preservation | Pass: same candidate installed/byte-verified after user authorization; first rejection retained; old APK bytes unchanged |
| APK SHA256/source/config receipt and reproducible source | Candidate files prepared; actual runtime config identity Not established |
| Runbook, startup/recovery, known failures, private credentials | Documents prepared; actual service-generated credentials not yet provisioned |

No main merge, remote publication, task closure, UAT/Release/Done or full-application acceptance is claimed.
