# Issue #63 — local Persona Backend evidence

Date: 8 October 2026. Status: local implementation and required Backend checks
passed; independent implementation review and LI acceptance remain pending.
Nothing in this packet asserts Flutter, Android, AI, Sprint, UAT or Release acceptance.
This document retains the local execution snapshot. The later user-authorized
publication is described in the [integration review packet](2026-10-08-issue-63-persona-integration-review.md);
the submission PR records its exact committed head and reviewer-request status.

Follow-up on 8 October: the [self-check and integration audit](2026-10-08-issue-63-persona-integration-audit.md)
found a P2 router-level error-mapping gap outside the initial cases. A subsequently
authorized local correction closed that finding: the new [integration review packet](2026-10-08-issue-63-persona-integration-review.md)
records **348/348 Backend and 64/64 actual Emulator tests passed** after the fix,
including four new transport cases and one actual-Auth URL case. The earlier
344/63 results below remain the initial execution snapshot, not the corrected run.
No formal implementation review or acceptance is implied; at that local execution
snapshot, all code remained local and uncommitted.

## Authority and source identity

- Bounded task: [Issue #63](https://github.com/3427564237/enmori-app/issues/63), ZHOU implementation; JIN independent implementation review; LI scoped acceptance.
- Controlling candidate: [P01–P03 and Backend isolation](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md), exact head `55fa4a7ab77b32b08d300d391ebee4293ad6f963`.
- Durable PM selection: [S-PM-1008-LI-PERSONA-BACKEND-FIRST](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md), publication commit `b5f3dbef6d5a04d35c30369efe2b9a4a66075a22`. P08/client scope is withheld.
- [JIN's candidate review](https://github.com/3427564237/enmori-app/pull/60#pullrequestreview-5444262472) applies to that documentation head, not this new implementation.
- Local branch: `codex/issue-63-persona-backend`, based on candidate head `55fa4a7ab77b32b08d300d391ebee4293ad6f963`; its main baseline is `f46a903cb5b339365ac2024004b32b7b96b99e7c`.
- At execution, tested source was the **uncommitted working tree**, not an implementation commit. The then-current user instruction requested local development without upload; no commit, push, PR, remote comment, merge or board transition was performed during that phase. The later authorized submission must identify its actual implementation head and obtain JIN review of that head.

The approved candidate and earlier decisions were preserved. This evidence resolves
their historical Not Run observations only for the Backend checks executed below;
it does not rewrite their prior status or broaden their authority.

## Delivered code

- [Persona slice](../../../backend/src/personas/README.md): Domain/Application/Port, transactional Firestore adapter and six HTTP operations.
- [OpenAPI](../../../api/openapi.json), route inventory and the five approved error mappings.
- [Composition](../../../backend/src/bootstrap/build-app.ts): Persona registration requires explicit guarded isolated dependencies. Ordinary and controlled-demo runtimes omit the slice.
- [Core checks](../../../backend/test/personas/core.test.ts), [shared Port contract](../../../backend/test/support/persona-repository-contract.ts), [HTTP/contract checks](../../../backend/test/personas/transport.test.ts) and [actual Emulator checks](../../../backend/emulator-test/personas.integration.test.ts).

Behavior includes at most five owner-private live Personas, strict four-field
input, sole explicit activation, permanent deletion, coherent revisioned reads,
optimistic mutation preconditions and state-conditioned create recovery. No-op
edits/confirmations preserve recovery; effective later mutations close it. Requests
never provision or repair owner state, and the adapter retains no receipt or
deleted Persona content.

## Environment and executed commands

Windows; Node `24.19.0`; pnpm `11.19.0`; TypeScript `7.0.2`;
Fastify `5.12.1`; Firebase Admin `14.3.0`; Firebase CLI `15.29.0`;
OpenJDK `25.0.4.1`; cached Firestore Emulator `1.22.0`.
The manifest and lockfile pins were unchanged. The default pnpm wrapper reported
`11.25.0` and was rejected by the existing engine constraint; commands below used
the exact pinned pnpm via `pnpm dlx pnpm@11.19.0 -C <worktree> ...` from outside
the repository. No engine constraint was relaxed.

| Command under pinned pnpm | Actual result |
| --- | --- |
| `--config.ignore-scripts=true install --frozen-lockfile --offline` | Pass; reused the approved cached lockfile packages; no dependency or lockfile change |
| `backend:verify` | Pass; TypeScript build and **344/344 tests**, zero failed/skipped/cancelled; includes 22 Persona core/Port cases and 9 Persona transport/contract cases |
| `backend:verify:emulator` | Pass; TypeScript build and **63/63 actual Emulator tests**, zero failed/skipped/cancelled; includes 18 dedicated Persona cases and the same 8 Port cases against real persistence |
| `git diff --check` | Pass |

The existing `firebase.json` and `backend/scripts/run-emulator-tests.mjs` were used
unchanged. Auth listened only on `127.0.0.1:9099`, Firestore on `127.0.0.1:8080`,
project `demo-enmori-rmvp01a-r10`. The runner filters environment variables and
creates an isolated credential profile. The Persona suite validates the actual
child environment before Firebase initialization and passes the same environment
to composition. It uses synthetic Auth users, trusted bindings, completed Accounts
and explicitly initialized owner states; no real account or cloud fallback is used.
The CLI shut down both Emulators after the successful run.

Initial verification exposed TypeScript annotation/inference errors and two test
fixture mistakes: a negative-version fixture also generated an invalid key, and
a broad path substring mistook an Account ID prefix for a Persona collection.
Those were corrected; the complete affected suites were rerun to the passing
results above. Tests were not skipped or weakened to accept incorrect behavior.

## Acceptance mapping

| Case | Local result and executed evidence |
| --- | --- |
| PC01 | Pass: actual absent/malformed/expired/disabled/revoked identity, current binding/completed Account ordering, foreign owner/Admin isolation; invalid authority performs no Persona reads |
| PC02 | Pass: exact body/query/path/key shapes without coercion; scalar/Unicode/name/enumeration/version limits; strict activation ID errors; 4096/4097 UTF-8 body edge; HTTP/OpenAPI agreement |
| PC03 | Pass: initialized empty versus missing/corrupt state, absent members/invalid Active/orphans; actual reads concurrent with create/edit/activation/deletion produce coherent snapshots |
| PC04 | Pass: fifth/sixth capacity, actual competing different creates, same-key owner isolation |
| PC05 | Pass: actual identical concurrent commands commit once then replay; normalized equivalent input replays, changed input conflicts; fifth-create recovery precedes capacity |
| PC06 | Pass: injected pre-commit failure rolls back state/live data; injected loss of a successful SDK completion recovers by replay or rejects after intervening mutation |
| PC07 | Pass: each subsequent effective mutation closes original recovery; no-op at owner revision 11 preserves it; restoring fields does not restore an old revision; deleted content cannot be recreated by an old command |
| PC08 | Pass: inactive creation, sole explicit activation, delete Active without replacement, validated absent-target repeated DELETE 204 despite stale supplied versions |
| PC09 | Pass: live-target preconditions precede no-ops; actual competing edits have one winner; no-op timestamps/versions remain unchanged |
| PC10 | Pass: owner/target safe-integer bounds, collision/orphan priority, no request initialization/repair, fresh fixture partitions, measured read ceilings and separate SDK retries |
| PC14 Backend | Pass: existing Auth/Profile/Settings/Check-in/Interest/Event/Friend regressions; all six methods directly return unregistered-route 404 in ordinary composition without Persona calls; controlled runtime omits isolated slices; invalid isolation is rejected before app construction; retained environment guards, safe errors and minimal persisted records |
| PC11–PC13 and PC14 client | **Not Run / outside this approved delivery**: shared Flutter client, session/page recovery, widgets, Home/router and actual Android acceptance |

PC06 uses deterministic exceptions around **real Emulator transactions** before
commit and after SDK commit completion. It is not a physical TCP-drop test or a
claim about an unimplemented client's timeout behavior.

Final Persona Emulator instrumentation recorded **208 transaction calls, 216 SDK
callback attempts, 8 calls retried, maximum 9 logical gets per attempt, 0 collection
scans**. Dedicated full-set and addressed-miss/capacity checks observed exactly
8 and 9 gets respectively. An injected SDK `ABORTED` response also exercised the
actual SDK retry loop. These counts exclude fixture inspection/cleanup and identity
verification; they bound logical adapter gets per attempt, not total requests,
billing, network activity or execution time. Race retry counts may vary by run.

Every new Persona fixture uses fresh owner partitions. It drains issued transport
operations, closes the app and deletes synthetic Auth users before scoped cleanup.
Runtime logging remains disabled; Persona production code emits no content logs.
Test diagnostics contain aggregate counters only. Persistence checks verify exact
live fields, content-free owner state, no added idempotency receipt, and permanent
removal of the deleted row. Existing Emulator configuration uses Admin SDK access;
these results do not establish production Firestore Security Rules acceptance.

## Remaining work and boundaries

The local Backend increment is ready for a later authorized submission and JIN's
independent exact-head review. LI's scoped acceptance follows applicable review
gates. No upload is performed by this work.

P08, Flutter/shared-client/Home/router, Android, M26 Conversation, M27 safety,
provider/data permissions, real imports, cloud/model calls, model installation and
AI producer integration remain outside scope and are not marked passed. No Demo
source, environment file, database, chat record or runtime binary was imported from
`D:\Ai chat`. Existing dependencies, Firebase configuration and Flutter files were
left unchanged.

The 11 October boundary is unchanged. This verified Backend increment does not
establish completion or feasibility of all six ZHOU product routes, M23–M25 UI, or
the overall 42-route/38-state target. No new delivery estimate is asserted.
