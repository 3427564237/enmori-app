# PM decision — restricted local Backend operator

- Source ID: S-PM-1018-LI-RESTRICTED-BACKEND-OPERATOR.
- Authority: LI HOURUI / ENMORI PM, 18 October 2026, Asia/Singapore.
- Confirmation: human LI selected “批准该限定账号及权限方案（推荐）” for the concrete #153 proposal.
- Scope: one restricted local non-root identity and the minimum runtime-file access needed for the previously approved diagnostic landing. LI provisions the host; JIN retains implementation/access diagnosis; SHI retains new-code/composition review.

## Sources and supersession

Approve option B and the bounded access envelope in [JIN #153](https://github.com/3427564237/enmori-app/blob/cf5b2b1f6830569981b79dedb840c8fbffce102a/docs/evidence/sprint3/2026-10-18-jin-capture-operator-proposal.txt), exact documentation head `cf5b2b1f6830569981b79dedb840c8fbffce102a`. Continue [the capture landing decision](2026-10-18-li-diagnostic-capture-landing.md), Q14 and the original-host/incident history retained there. #150 executable `789dc4fe0cedf250cacbb6508becd83a65c6680c` is unchanged by this decision.

The new approval resolves only the proposal's pending identity/access choice. It does not reopen the already approved store/timer choice, replace independent review, or establish that an account or capture facility exists. Earlier statements that an eligible existing identity was not confirmed remain historical facts; they were not proof that every possible identity was absent.

## Approved identity and rights

1. LI may create one dedicated local system account with a unique nonzero UID and its own primary group, a locked password and a nologin shell. Actual name/UID and private paths are selected and recorded privately by LI, outside Git.
2. Grant no interactive login, SSH key/remote endpoint, administrator/privileged group, broad sudo or sudo-to-another-user right, service-management permission, polkit grant, capability or container identity. Preserve the distinction between LI's trusted host administrator and the restricted Backend process/reader.
3. The only privileged capture actions for the restricted account are the existing #150 exact `append`, `read` and `health` commands. Root/system retains installation, initialization, cleanup and system timer ownership. The existing reviewed installer alone provisions its bounded sudo rule; do not add a competing rule or broad NOPASSWD.
4. Provision only fresh private runtime/session/config/TLS material needed by the approved current service, with operator-owned 0700 directories/0600 private files where required by the actual ownership guards. Keep raw capture source/config/store inaccessible to the operator. Do not recursively change the old incident, old sessions, admin home, model storage or shared checkout.
5. Reuse existing pinned runtime/dependencies. If exact required files cannot be reached by this UID, LI may prepare a root-owned read/execute snapshot of only those approved files, verifying hashes/targets. No download, software migration, new Backend daemon, linger setting, new port or model permission is approved.

## Execution and verification

The account and its fresh empty private runtime directory may be prepared independently of capture activation. Capture helper/sudo-rule/system-unit installation still requires the applicable #150 new-source review and usable authorized host administrator access. Do not request a password in chat; LI authenticates privately through the existing local administrator path. Failure of `sudo -n` is not a conclusion that interactive sudo is unavailable.

Verify the actual new UID, locked password, nologin shell, sole approved group, private ownership/modes and effective rights. For a non-login account, execute fixed commands as that UID through LI's administrator; do not enable login or spoof `SUDO_UID`. Clear inherited admin credentials/agent sockets when later launching the approved runtime.

Retain #150's actual allow/deny/raw-path checks, synthetic installed writer/read probe and system cleanup after logout. Account creation alone proves none of these. Preserve partial failures; no forced recreation, recursive ownership repair, reset, old-source reconstruction, automatic model retry or new original-operation action is approved.

This decision does not itself create the account, install capture, start Backend/Auth/Ollama, launch a device or establish AI repair. No merge, Issue/Project transition or whole-app/Sprint/UAT/Release/Done acceptance is added.
