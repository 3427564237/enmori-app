# R13 Cross Boundary Execution Evidence

- **Work package:** Issue #4 / R13
- **Executor:** JIN ZIHAN (`@chuxi12483468`)
- **Execution timestamp:** 2026-09-07 02:16:36 +08:00 (SGT; corrected command set completed)
- **Tested code head:** `d26a829f9d2ff5c228b2c1727c64c304925b8f03` (the R13 test/fixture code that produced 11/11)
- **Merge base:** `ce1a6e13955c9d1806758e453c7ded661da1e083` (`main` before the R13 changes)
- **R10 baseline merge:** `3411c57298419b634a14088142111b5964c5973b` (PR #16)
- **Controlled project:** `demo-enmori-rmvp01a-r10` (non-real Firebase Emulator project; matches the pinned runner)
- **Endpoints:** Auth `127.0.0.1:9099`; Firestore `127.0.0.1:8080`; loopback only
- **Fixture labels:** `RMVP-FX-NEW-ACCEPT`, `RMVP-FX-NEW-REJECT`, `RMVP-FX-INCOMPLETE`, `RMVP-FX-AUTH-REQUIRED`, `RMVP-FX-CHECKIN`, `RMVP-FX-NON-OWNER`, `RMVP-FX-DEPENDENCY`
- **Fixture version:** `R13-FX-v2` — run-scoped synthetic fixture generator in the tested code head; emails, UIDs, passwords and 22–64 character base64url idempotency keys are generated at runtime and are not committed or recorded.
- **Fixture reset result:** Auth and Firestore reset passed before every scenario and after the suite; the temporary controlled profile was cleaned up with no `enmori-r10-profile-*` directory remaining.
- **Data boundary:** No production data, credentials, tokens or real personal content are persisted in evidence.

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
| `pnpm --config.ignore-scripts=true install --frozen-lockfile` | Lockfile commit `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`; frozen install completed with pnpm `11.19.0`. | `Pass` |
| `pnpm --config.ignore-scripts=true run backend:verify` | Node.js `24.19.0`; strict compile and backend suite completed with 96/96 tests passing. | `Pass` (R10/R9 baseline only) |
| `pnpm --config.ignore-scripts=true run backend:verify:emulator` | Firebase CLI package `15.29.0`, Java `21.0.12.1`, Node.js `24.19.0`; Auth/Firestore Emulator started on loopback and the serial R10/R13 process completed with 11/11 tests passing. | `Pass` (R10 baseline + R13 execution) |

The earlier Java `17.0.10` attempt was blocked before emulator startup and remains recorded in the prior checkpoint history. The corrected run explicitly selected the installed Java 21 runtime and the pinned `demo-enmori-rmvp01a-r10` project. The serial test runner prevents R10/R13 fixture resets from racing.

## R13 scenario disposition

The controlled Emulator process was established with the corrected identity and all four assigned R13 test groups completed. The table below records only the exact R12 oracles exercised by those tests; unexecuted R12 subcases remain `Not Run`. R14 and R15 remain separate gates and are not inferred from these results.

| R13 test | Exact R12 oracle(s) exercised | R13 result |
|---|---|---|
| Accept onboarding, Note-only create, exact retry, changed-Note conflict and later owner read | `R12-T01`, `R12-T07`, `R12-T10` (Check-in exact retry + changed Note), `R12-T11` owner read | `Pass` |
| Reject/private onboarding with exact retry and changed onboarding input | `R12-T02`, `R12-T04` | `Pass` |
| Missing/malformed identity, invalid Username, incomplete onboarding, non-owner/missing privacy-safe read | `R12-T05A`, `R12-T06B` (missing/malformed branch only), `R12-T09B`, `R12-T11` non-owner/missing branch | `Pass` |
| Client cancellation and authoritative retry reconciliation | `R12-T12` | `Pass` |

The following approved R12 subcases were not exercised by this R13 run and remain `Not Run`: `R12-T05B`, `R12-T05C`, `R12-T06A`, the expired-identity branch of `R12-T06B`, `R12-T08`, `R12-T09A`, and all other catalogue rows not listed above. The R12 catalogue's initial-result column is unchanged.

## Boundary and blocker

- No Android result, UAT result, release result or overall-gate `Pass` is claimed from this R13 run.
- R14 remains `Not Run` pending completed R13 and LI-accepted DU R7 surface evidence; PR #14 remains `Changes Requested` under LI R3.
- R15 remains `Not Run` pending its complete component inputs.
- **Current technical blocker:** none for R13 execution. SHI R5B independent review of the R13 implementation/evidence is pending. R14 remains gated by completed R13 plus LI-accepted DU R7 surface evidence; R15 remains gated by its component inputs.
