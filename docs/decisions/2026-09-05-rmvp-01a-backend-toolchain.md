# RMVP-01A Backend toolchain — 2026-09-05

- **Source ID:** S-PM-0905-RMVP01A-TOOLCHAIN
- **Status:** Approved by LI HOURUI
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Exact Backend package/runtime baseline for RMVP-01A tasks R4, R9 and R10 only
- **Builds on:** S-PM-0901-BACKEND, S-PM-0903-RMVP01A-CONTRACT and S-PM-0903-RMVP01A-START
- **Delivery input:** SHI ZHENGQI's bounded R4/R9 compatibility proposal on GitHub Issue #2

## Decision

RMVP-01A uses the following exact Backend toolchain:

| Concern | Approved selection |
|---|---|
| Node.js runtime | `24.19.0` |
| Package manager | `pnpm 11.19.0` |
| TypeScript | `7.0.2` |
| Fastify | `5.12.1` |
| Node.js type declarations | `@types/node 24.13.3` |
| Firebase Admin SDK | `firebase-admin 14.3.0` |
| Firebase Emulator CLI | `firebase-tools 15.29.0` |
| Test runner | built-in `node:test` |
| Request/response schemas | static Fastify JSON Schema at Transport only |
| Normative API contract | hand-maintained OpenAPI 3.1 JSON under `api/` |
| Schema/OpenAPI generation | no generator or additional schema library in this slice |

The repository must pin these selections in its manifest, package-manager declaration and single lockfile. TypeScript uses strict compiler settings. Fastify remains confined to Bootstrap and Transport. Firebase Admin and Firestore types remain confined to Infrastructure. Application/Domain define Ports and never import vendor or Infrastructure types.

## Evidence boundary

Only Backend results executed with Node.js `24.19.0` and the pinned lockfile qualify as RMVP-01A Backend compile, test, contract or Emulator evidence. Results from another Node.js major or patch may be recorded as an auxiliary compatibility observation only and must not be reported as the approved execution result.

Every claimed result must record the exact runtime, package-manager version, lockfile commit, command, controlled environment and reviewer path. Dependency installation or compilation alone does not prove Transport, Port, Firebase, Firestore, Emulator, Android, UAT or Release acceptance.

## Scope and exclusions

This decision removes the exact-package-manager, runtime-patch and schema/OpenAPI-tooling blockers for RMVP-01A R4, R9 and R10. It authorizes SHI and ZHOU to use only the selections above inside their already assigned Issue scopes.

It does **not** approve or change:

- any endpoint, request/response field, public error, authentication rule or idempotency behavior beyond S-PM-0903-RMVP01A-CONTRACT;
- any Firestore record, field, ID, index, transaction, migration, deletion or retention behavior beyond the approved bounded contract;
- any deployment product, host configuration, port, reverse proxy, certificate, container, process supervisor or public exposure;
- any Flutter dependency, UI behavior, product scope, later PBI or Sprint 2–4 commitment; or
- any additional Backend library, Fastify plugin, generator or dependency version.

If implementation requires an additional package or a different version, the affected work stops and submits a new bounded compatibility proposal. This decision is PM implementation authority, not Sponsor/Supervisor approval and not implementation or test evidence.
