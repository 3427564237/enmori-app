# R13 Cross Boundary Execution Evidence

- **Work package:** Issue #4 / R13
- **Executor:** JIN ZIHAN (`@chuxi12483468`)
- **Execution timestamp:** 2026-09-06 22:20:50 +08:00 (SGT)
- **Build commit:** `3411c57298419b634a14088142111b5964c5973b` on `main`
- **Controlled project:** `demo-enmori-rmvp01a` (non-real Firebase Emulator project)
- **Endpoints:** Auth `127.0.0.1:9099`; Firestore `127.0.0.1:8080`; loopback only
- **Fixture labels:** `RMVP-FX-NEW-ACCEPT`, `RMVP-FX-NEW-REJECT`, `RMVP-FX-INCOMPLETE`, `RMVP-FX-AUTH-REQUIRED`, `RMVP-FX-CHECKIN`, `RMVP-FX-NON-OWNER`, `RMVP-FX-DEPENDENCY`
- **Fixture reset contract:** Auth and Firestore state reset before each scenario and after the suite; no production data, credentials, tokens or real personal content are persisted in evidence.

## Predecessor verification

| Predecessor | Merged or reviewed reference | Entry result |
|---|---|---|
| R1 | PR #8 / `015d69d` on `main` | Available |
| R4 | PR #12 / `fcaff75` on `main` | Available |
| R9 | PR #10 / `d8ea465` on `main` | Available; SHI boundary approved |
| R10 | PR #16 / merge `3411c572`; reviewed head `66f06a3` | Available; SHI R5A approved |
| R12 | PR #7 / SHI R5B approval | Available; design/review only |

## Approved commands and observations

| Command | Observation | Result |
|---|---|---|
| `pnpm --config.ignore-scripts=true install --frozen-lockfile` | Lockfile and supply-chain policy verification completed with the pinned workspace dependencies. | `Pass` |
| `pnpm --config.ignore-scripts=true run backend:verify` | Executed with the bundled Node.js `24.19.0`; strict build and backend suite completed with 96/96 tests passing. | `Pass` (R10/R9 baseline only) |
| `pnpm --config.ignore-scripts=true run backend:verify:emulator` | Firebase CLI `15.29.0` stopped before starting Auth/Firestore Emulator because the executor exposed Java `17.0.10`; this CLI requires Java `21` or newer. | `Blocked` |

The emulator command did not reach the R13 test process. The installed host Node.js `24.15.0` was also unsuitable for the pinned runtime check; rerunning the non-emulator baseline with the bundled Node.js `24.19.0` produced the 96/96 result above. No Java 21 runtime or unapproved substitute was selected during this run.

## R13 scenario disposition

The valid controlled Emulator process was not established, so no R13 scenario received an execution result. The scenarios remain `Not Run`, with the run attempt recorded as `Blocked` by the executor Java prerequisite.

| Scenario group | Scope | Result |
|---|---|---|
| R13-T01/T07/T11 | Accept onboarding, Note-only create, exact retry and later owner read | `Not Run` |
| R13-T02/T10 | Reject/private onboarding and idempotency conflict | `Not Run` |
| R13-T05/T06/T09 | Identity, incomplete onboarding, validation and privacy-safe negative paths | `Not Run` |
| R13-T12 | Client cancellation and authoritative retry reconciliation | `Not Run` |

## Boundary and blocker

- No integration `Pass`, Android result, UAT result or release result is claimed.
- R14 remains `Not Run` pending completed R13 and LI-accepted DU R7 surface evidence; PR #14 remains `Changes Requested` under LI R3.
- R15 remains `Not Run` pending its complete component inputs.
- **Current technical blocker:** activate an approved Java 21+ runtime for Firebase CLI 15.29.0 on the executor, then rerun the same controlled command with the recorded project, loopback endpoints and fixture reset contract.

