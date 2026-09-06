# R13 Cross Boundary Execution Evidence

- **Work package:** Issue #4 / R13
- **Executor:** JIN ZIHAN (`@chuxi12483468`)
- **Execution timestamp:** 2026-09-06 22:36:26 +08:00 (SGT; command completed)
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
| `pnpm --config.ignore-scripts=true run backend:verify:emulator` | Executed with Temurin Java `21.0.12.1` and bundled Node.js `24.19.0`; Auth/Firestore Emulator started on loopback and the serial R10/R13 process completed with 11/11 tests passing. | `Pass` (R10 baseline + R13 execution) |

The earlier Java `17.0.10` attempt was blocked before emulator startup and remains recorded in the prior checkpoint history; after installing and explicitly selecting the approved Temurin Java 21 runtime, the same controlled command reached the test process. The serial test runner prevents R10/R13 fixture resets from racing. No production data, credentials or real personal content were used.

## R13 scenario disposition

The controlled Emulator process was established with the recorded identity and all assigned R13 scenarios completed. The table below records observed results from this run; R14 and R15 remain separate gates and are not inferred from these results.

| Scenario group | Scope | Result |
|---|---|---|
| R13-T01/T07/T11 | Accept onboarding, Note-only create, exact retry and later owner read | `Pass` |
| R13-T02/T10 | Reject/private onboarding and idempotency conflict | `Pass` |
| R13-T05/T06/T09 | Identity, incomplete onboarding, validation and privacy-safe negative paths | `Pass` |
| R13-T12 | Client cancellation and authoritative retry reconciliation | `Pass` |

## Boundary and blocker

- No Android result, UAT result, release result or overall-gate `Pass` is claimed from this R13 run.
- R14 remains `Not Run` pending completed R13 and LI-accepted DU R7 surface evidence; PR #14 remains `Changes Requested` under LI R3.
- R15 remains `Not Run` pending its complete component inputs.
- **Current technical blocker:** none for R13 execution. SHI R5B independent review of the R13 implementation/evidence is pending. R14 remains gated by completed R13 plus LI-accepted DU R7 surface evidence; R15 remains gated by its component inputs.
