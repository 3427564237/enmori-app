# Isolated Persona management

This slice implements Issue #63's approved Backend-only P01–P03 contract. The
[pinned contract](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md)
and [LI's recorded selection](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md)
control its behavior. This directory does not implement AI execution or client recovery.

## Composition and ownership

`OwnPersonas` depends on `PersonaRepository`; its Domain and Application have no
Fastify or Firebase dependency. `FirestorePersonaRepository` composes the existing
`FirestoreGateway` and `Clock`. Each operation resolves the current trusted UID
binding and completed Account inside its transaction before accessing Persona data.

`buildApp` registers the six methods only when `isolatedSlices.personas` is
explicitly supplied with an environment accepted by the existing controlled
Emulator guard. Ordinary and controlled-demo runtimes omit that dependency.
There are no implicit HEAD methods for the Persona GET routes.

Malformed encoded URLs and overlong addressed IDs are rejected by Fastify before
route hooks. This isolated composition installs a scoped framework-error adapter
that awaits the existing authentication helper and emits the approved safe error
envelope. It neither calls Persona persistence nor changes unrelated routes or
unsupported methods; ordinary composition has no such adapter.

The [actual Emulator suite](../../emulator-test/personas.integration.test.ts)
validates its real child-process environment before initializing Firebase and
passes that same environment to `buildApp`. Use the existing
`pnpm backend:verify:emulator` runner/configuration. Auth and Firestore must both
point to loopback Emulators in the guarded `demo-` project and isolated credential
profile; missing or invalid isolation fails closed. There is no cloud fallback.

Only isolated fixtures create synthetic bindings, completed Accounts and
`persona_state/current`. Business requests do not initialize, repair or reset
them. Fixtures settle requests and end sessions before targeted cleanup; each
scenario uses fresh Account partitions.

## Persistence and recovery

The owner state contains sorted live IDs, its monotonic revision and an optional
Active ID. Each of at most five live records contains only the four editable
fields, creation/update timestamps and target revision. Reads validate every live
member; an addressed orphan fails closed. No collection scan or retained receipt
is used. A transaction attempt performs at most eight logical gets for a complete
set, or nine when it must check a non-member target/candidate. SDK retries are
separate attempts, so these are not billing or elapsed-time bounds.

The create ID is SHA-256 of the approved JSON tuple containing the owner Account,
expected owner revision and canonical key. An unchanged latest creation replays
with 200; its changed input conflicts with 409. Any later effective owner mutation
closes that command's recovery window with 412. Current same-value edits and
already-Active confirmations do not advance versions. Live-target preconditions
are checked before no-ops. Validated absent-target DELETE returns bodyless 204
even with stale supplied versions. Permanent deletion retains the advanced owner
revision and clears Active without choosing a replacement.

## Verification

`pnpm backend:verify` exercises Domain/Application, the in-memory Port contract,
HTTP/OpenAPI agreement and Backend regressions. `pnpm backend:verify:emulator`
also runs the shared Port cases and actual Auth/Firestore transaction, race and
failure-injection cases. See the [local evidence packet](../../../docs/evidence/backend/2026-10-08-issue-63-persona-backend-local.md)
for executed results and scope limits. P08, Flutter/Android and AI integration
remain outside this Backend delivery.
