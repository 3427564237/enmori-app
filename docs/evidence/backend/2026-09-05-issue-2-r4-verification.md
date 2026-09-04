# Issue #2 — R4 Transport/OpenAPI owner verification

- **Owner:** SHI ZHENGQI (`@GGGGHOST-CN`)
- **Branch:** `codex/issue-2-r4-transport-openapi`
- **Implementation commit:** `ad333bbcbb977aab89fbd6abf61cf56f6f39f67b`
- **Baseline:** `e5aa474` (`main`, merged toolchain decision PR #9)
- **Scope:** R4 Application/Domain/Ports, Fastify Transport, hand-maintained OpenAPI 3.1 contract, and owner tests

## Approved toolchain and paths

- Node.js `24.19.0`
- pnpm `11.19.0`
- TypeScript `7.0.2`
- Fastify `5.12.1`
- `@types/node` `24.13.3`
- Built-in `node:test`
- Transport: `backend/src/transport/`
- Bootstrap: `backend/src/bootstrap/build-app.ts`
- OpenAPI: `api/openapi.json`
- Owner tests: `backend/test/`

The project-level `package.json` and `pnpm-lock.yaml` pin the approved R4 dependencies. No Firebase adapter package, generator, additional schema library, endpoint, DTO field, Firestore schema, deployment configuration, or product behavior was added.

## Verification results

| Command | Result |
|---|---|
| `node --version` | Pass — `v24.19.0` |
| `pnpm --version` | Pass — `11.19.0` |
| `pnpm install --frozen-lockfile` | Pass — lockfile reproducible |
| `pnpm backend:verify` | Pass — strict TypeScript build and 34/34 `node:test` tests; 0 failed/skipped/todo |
| `fvm dart run tool/check_environment.dart` | Pass for required Flutter/Dart/Java/Android SDK checks; `adb` remains warning-only/unavailable |
| `fvm flutter analyze` | Pass — no issues |
| `fvm flutter test` | Pass — 15/15 tests |
| `git diff --cached --check` before commit | Pass |

Backend owner tests cover the exact four-route inventory, request mapping, approved 200/201 behavior, strict request fields, idempotency-key validation, Bearer authentication outcomes, every approved application failure mapping, privacy-safe not-found behavior, safe failure envelopes, public response projection, unknown dependency failure containment, OpenAPI alignment, and the exact Node.js runtime.

## Independent R5B review

SHI re-reviewed PR #7 at head `7d46b94bf525589950b98277a45152375b7d832b` and approved the R12 strategy/fixtures artifact in review `5116323167`. Both prior findings are closed: completed-account `ONBOARDING_CONFLICT` is distinct from `USERNAME_UNAVAILABLE`, and Firebase registration validation is distinct from protected-Backend `AUTH_REQUIRED`.

This review is design-artifact approval only. It is not execution evidence and does not start or pass R13, R14, R15, Android, controlled-backend integration, UAT, or release work.

## Current blockers and exclusions

- R4 implementation and local owner verification have no code or toolchain blocker.
- LI authorized publication of the four R4 commits on `codex/issue-2-r4-transport-openapi`, followed by a Draft PR to `main` with LI as the requested reviewer.
- `adb` is unavailable, so no Android device execution was performed.
- R9/R10 adapters/environment, R6/R7 client/device work, R13–R15, controlled-backend integration, Android evidence, Q04, UAT, and release status remain outside SHI's current implementation scope and are `Not Run` unless their owners record valid evidence.
