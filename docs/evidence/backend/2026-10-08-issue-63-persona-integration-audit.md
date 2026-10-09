# Issue #63 — local self-check and integration audit

Date: 8 October 2026. This records the original owner self-check with independent
internal cross-checks, not JIN's formal implementation review or LI acceptance.
The initial audit changed no product code. The user then authorized the local
correction described below. No commit, push, PR/comment, merge, dependency change
or board transition was performed during that local phase. The later authorized
publication is described in the [integration review packet](2026-10-08-issue-63-persona-integration-review.md);
the submission PR records its exact committed head and reviewer-request status.

## Correction follow-up

The P2 finding below is **closed by local correction and regression execution**.
The [integration review packet](2026-10-08-issue-63-persona-integration-review.md)
records the scoped framework adapter, unchanged shared auth behavior, **348/348
Backend tests and 64/64 actual Emulator tests passed**, and refreshed merge
preflight against unchanged #61/#64 heads. Formal JIN review and LI acceptance
remain pending. The original finding and its evidence are retained below as the
supersession trail; its open status describes the pre-correction snapshot.

## Original audit conclusion (before correction)

No P0/P1 defect, demonstrated data corruption, foreign-owner access or architectural
incompatibility was found within the inspected Backend slice. One reproducible
**P2 HTTP contract defect remains open**. The current open My Friends and Check-in
history implementations also produce concrete text conflicts with the local
Persona change. Those require deliberate integration, not a redesigned Persona
data model. Future client, account provisioning and AI work remains explicitly
gated; the Backend cannot be treated as an already integrated product surface.

## Original finding: router-level errors escape the Persona contract

**P2 — handle malformed/overlong route parameters at the framework boundary.**

The [Persona authentication and error handler](../../../backend/src/personas/transport/register-routes.ts)
is installed on matched routes. The [Fastify construction](../../../backend/src/bootstrap/build-app.ts)
retains default router-level rejection handling. A URL rejected while matching
never reaches those route hooks. Reproduced with `app.inject` against compiled
local code, both with and without a synthetic Authorization header:

| Request suffix after `/v1/me/personas/` | Actual result | Auth / Persona operation calls |
| --- | --- | --- |
| `%` | 400, raw `FST_ERR_BAD_URL` envelope | 0 / 0 |
| `%E0%A4%A` | 400, raw `FST_ERR_BAD_URL` envelope | 0 / 0 |
| 1001 `a` characters | 414, raw `FST_ERR_MAX_PARAM_LENGTH` envelope | 0 / 0 |

All three responses lack the contracted `error.code/message/requestId` object;
framework messages also include the supplied path. Approved P01 requires safe
stable error mapping and authentication before Persona request validation. The
414 is not a Persona OpenAPI response. A client expecting that contract cannot
reliably classify these failures. No Application/Repository call occurred, so this
reproduction did not access protected data or demonstrate an authorization bypass.

The gap is inherited from the existing bootstrap defaults and exposed by the new
strict Persona path contract. Fix it within the guarded Persona composition:
handle router/framework rejections for the applicable Persona paths, authenticate
through the existing verifier, and return the approved safe mapping without raw
path/parser details. Preserve other routes' behavior. Add authenticated and
unauthenticated regression cases for malformed percent encoding, invalid encoded
UTF-8 and overlong IDs. Route-local validation alone cannot fix this early failure.
The installed Fastify version provides a `frameworkErrors` hook for these errors.

**Original status: reproduced, not fixed in the initial review.** The existing 344-test pass did
not cover this gap. The subsequent correction and reverification are recorded in
the follow-up above; the initial automated pass was not treated as proof that the
gap was absent.

## Existing-feature compatibility checks

- Rebuilt and reran `backend:verify` with the pinned pnpm `11.19.0`: **344/344 Pass**,
  zero failed/skipped/cancelled. Runtime and dependency pins were unchanged.
- Ran a listener-free combined `buildApp` probe with Persona, Profile/Settings,
  Event recommendations, Friend requests and Event Detail together with the base
  onboarding/Check-in/Interest routes. Eleven representative GET routes reached
  the intended safe stub result rather than collision or unregistered-route
  failure. This checks composition and route/error coexistence, not persistence.
- Ran a sequential shared in-memory store probe with real feature adapters:
  Persona create; Profile save; Settings save; Check-in create; Persona snapshot
  and original-create replay; Persona edit/activation/deletion. Account and
  Check-in records remained unchanged by Persona mutations, while unrelated
  account changes did not advance Persona state or close its create window.
- Read the Persona transaction/replay/integrity logic against approved P01–P03:
  ownership ordering, all-member validation, bounded reads, fifth-create replay,
  effective-mutation closure, precondition-before-no-op ordering, absent-target
  DELETE exception and permanent deletion remain consistent.
- The earlier actual Emulator **63/63 Pass**, including 26 Persona cases, remains
  the prior execution evidence in the [implementation packet](2026-10-08-issue-63-persona-backend-local.md).
  No product/test code changed in this audit, so the Emulator suite was not rerun.
  The two new probes do not establish combined-feature Emulator concurrency or
  integration with the unmerged branches below.

## Concrete merge preflight against open implementations

Read-only remote checks confirmed main remained
`f46a903cb5b339365ac2024004b32b7b96b99e7c`. The current heads were verified directly:

- [PR #61, My Friends](https://github.com/3427564237/enmori-app/pull/61): `5bdbcf8d61e0d84ba13e2146167db48704a1e7ae`.
- [PR #64, Check-in history](https://github.com/3427564237/enmori-app/pull/64): `32b443b022878859aba0641a1847f1e3bb1fd855`.

Downloaded only the referenced Git objects. For overlapping files, ran three-way
`git merge-file -p --diff3` in temporary files using the actual merge base, current
local Persona file and the other head. Neither the working tree nor index was
merged. The per-file results are:

| Other branch | Overlapping file | Conflicting hunks |
| --- | --- | ---: |
| #61 | `api/openapi.json` | 2 |
| #61 | `backend/src/bootstrap/build-app.ts` | 0 |
| #61 | `backend/src/transport/route-inventory.ts` | 1 |
| #64 | `api/openapi.json` | 1 |
| #64 | `backend/src/bootstrap/build-app.ts` | 1 |
| #64 | `backend/src/transport/route-inventory.ts` | 0 |
| #64 | `backend/src/transport/schemas.ts` | 0 |

PR #61's merge base was `f2d01a129ab4d409c5acb8027481f32b7afec7fe`;
PR #64's was current main. This is a pairwise text/semantic preflight at the stated
heads, not a three-feature merged build or guarantee about future commits.

Resolution must preserve both sides' additions:

- Keep Persona's environment guard before Fastify construction and its six
  operations inside explicit isolated composition. Keep My Friends in the existing
  isolated Friend registration. Retain Check-in history's independently approved
  optional base/controlled-runtime composition; do not move all three into one
  environment branch.
- Retain the union of public paths, response schemas and route inventory: six
  Persona operations, My Friends and Check-in history. Preserve the Persona UUID
  create header separately from older commands' key syntax.
- Preserve the five Persona failure codes, the other features' query/error mapping
  and all old routes. A conflict-free textual hunk still needs semantic review.
- PR #64's Temporal package and Firestore index belong to that feature's approved
  change. Do not copy them into the standalone Persona task; once integrated,
  verify the combined manifest/lockfile and relevant tests as one target.
- Rebuild and run route/OpenAPI/error and ordinary/demo exclusion checks after
  resolving the actual combined tree, followed by relevant Emulator regressions.

No conflicting storage paths, public schema names or duplicate method/path pairs
were found among these implementations. Their new code does not mutate Persona
owner state. No current-main rebase is necessary solely to acquire newer main
commits, because none were observed.

## Required handoff before later product integration

| Integration | Existing evidence and practical consequence | Required next scope |
| --- | --- | --- |
| Flutter transport | [BackendApiClient](../../../lib/core/network/backend_api_client.dart) has no DELETE helper, loses successful status, rejects a bodyless response, does not map the five Persona failures and provides only one timeout result. Direct attachment can report failure after a successful delete or misclassify recovery. | Approved P08 or separate client task: exact 200/201/204 handling, DELETE body, error mappings and late completion observation; retain older callers' behavior. |
| Session state | Current auth provider exposes UID; UID alone cannot distinguish signout/signin as the same user. | P08 session-instance/owner/command/attempt identities, disposal separate from command settlement, and non-regressing shared `stateRevision`. |
| Real account / demo enablement | Onboarding does not initialize Persona state; Persona reads intentionally fail closed if it is absent. Normal/demo composition intentionally omits routes. | Explicit provisioning/lifecycle and enablement decision; no business-request repair or state reset. |
| AI / Conversation | The management API does not implement request-start immutable model projection or deletion revalidation. AI runtime `prepare` occurs after lane acquisition, potentially after queueing. | P04–P07/Q19 integration: capture the approved projection at request start and recheck deletion before persistence/delivery; do not first read Active in delayed `prepare` or send an entire management DTO to the model. |
| Account migration / deletion | Create recovery relies on a monotonic owner state; Account/Profile/Settings revisions are separate. Structurally valid external rollback is outside the approved detection guarantee. | Preserve owner identity/revision continuity; approve lifecycle work separately before resetting, reusing or migrating partitions. |

These are already scoped future requirements, not additional Persona Backend
defects or permission to implement withheld behavior. Preserve the current
Backend model, correct the open P2, then integrate shared files deliberately and
obtain the required independent review at the eventual submitted head.
