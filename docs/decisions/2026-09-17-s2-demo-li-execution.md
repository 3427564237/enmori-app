# S2 Demo one-time LI execution authorization

- Source ID: S-PM-0917-S2DEMO-EXECUTOR
- Status: Confirmed by LI HOURUI in the 2026-09-17 task conversation
- Decision owner: LI HOURUI, project owner / PM
- Scope: One execution of the reviewed S2 Demo initializer on LI's private machine

LI explicitly approved executing the fixed initializer locally and handing the
non-sensitive result to SHI and DU. The machines are not shared. LI's existing
personal ADC stays on LI's machine and is not transferred to either teammate.

This supersedes only the assignment of SHI as executor for this one initialization
in S-PM-0916-S2DEMO-TARGET, recorded in
`2026-09-16-s2-demo-target-confirmation.md` at PR #37 head
`b7759b129d5225c4a0b45fd8934d496cd171bde0`. SHI remains the implementation owner.
All other target, manifest, privacy and execution constraints remain unchanged.

Use PR #33 reviewed head `7585542cc4d07817768fc4a0a74d110b2f79084e`, approved by
ZHOU, and its unchanged `pnpm backend:initialize:s2-demo` command. The sole target
is `enmori-rmvp-controlled` in controlled-demo mode. The fixed manifest is
`s2-event-demo-v1`, canonical SHA-256
`d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`.

Only the six previously approved paths may be created. Read all six before any
write in one transaction; retain identical records and abort without writes on
any difference. No overwrite, delete, reset, IAM change, new key, deployment or
credential sharing is authorized. Record actual UTC times and bounded outcome.

This one-time initialization does not provide credentials for SHI's subsequent
Backend runtime. Android integration, smoke, UAT, Release and Done remain separate.
Retain the prior target and manifest decisions and their supersession history.
