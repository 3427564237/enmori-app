# LI controlled S2 Demo initialization evidence

## Authority and exact implementation

LI approved one-time local execution under
[S-PM-0917-S2DEMO-EXECUTOR](../../decisions/2026-09-17-s2-demo-li-execution.md).
The prior target and fixed-manifest constraints remain unchanged.

- PR #33 head: `7585542cc4d07817768fc4a0a74d110b2f79084e`.
- ZHOU approval for that exact head was rechecked immediately before execution.
- Clean detached checkout: `ENMORI-s2-init-li-20260917`.
- Node.js `24.19.0`; pnpm `11.19.0`.
- Target: `enmori-rmvp-controlled`; environment: `controlled-demo`.
- Manifest: `s2-event-demo-v1`; six fixed documents.
- Canonical SHA-256: `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`.

## Execution and verification

Dependencies were restored from the existing local cache with the frozen lockfile.
The first install reported blocked dependency install scripts. A frozen offline
install with `--ignore-scripts` then succeeded; no build-script approval or
dependency/lockfile change was made. TypeScript compilation passed.

Executed the unchanged package command `pnpm backend:initialize:s2-demo`, using
process-local `ENMORI_ENVIRONMENT=controlled-demo` and
`ENMORI_FIREBASE_PROJECT_ID=enmori-rmvp-controlled`. The reviewed initializer's
target, forbidden override and manifest checks passed. Existing local ADC was
used without login, key creation, credential transfer, IAM or deployment changes.

- UTC start: `2026-09-16T17:22:15.275Z`.
- UTC finish: `2026-09-16T17:22:15.864Z`.
- Singapore date/time: 2026-09-17 01:22:15.
- Initializer result: **created**; document count: **6**; process exit: **0**.
- At `2026-09-16T17:22:34.238Z`, a separate read-only check found all six records
  present and all six exactly equal to their approved manifest data.
- The reviewed source and lockfile remained unchanged; execution checkout clean.

The pre-execution read-only check had found all six paths absent. The transaction
used only the reviewed create-only implementation. No overwrite, reset or delete
operation was performed. No unrelated records were queried by the verification.

## Non-sensitive SHI / DU handoff

LI completed the approved one-time S2 Demo initialization on reviewed PR #33 head
`7585542cc4d07817768fc4a0a74d110b2f79084e`. The result is **created** and a separate
read-only verification confirms all six records exactly match the fixed manifest.
The earlier **Not Run / NO_ADC_FOUND** result remains valid historical evidence
for SHI's earlier attempt, but no longer describes the current initialization state.

LI's personal ADC remains local and is not shared. This result resolves the
missing Demo-data prerequisite only. It does not provision credentials for SHI's
Backend runtime or establish DU's runtime/API reachability. Android integration,
S2-06, final smoke, UAT, Release and Done remain separate. Keep PR #33 Draft and
Issue #28 open. This evidence does not authorize merge or closure.

This record publishes LI-controlled execution evidence for SHI and DU. The
read-only verification is an operator check, not an independent reviewer rerun.
