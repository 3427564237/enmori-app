# Issue #63 — implementation integration review packet

Date: 8 October 2026. Status: prepared for authorized Draft PR publication and
JIN review. The user subsequently authorized uploading the implementation to await
review, superseding the earlier local-only instruction for submission. Historical
local-only execution records below and in the linked evidence remain unchanged.
JIN's independent implementation review and LI's scoped acceptance are pending.
This packet is supporting evidence, not a new decision or approval. Publication
does not authorize a merge, board transition or the next implementation phase.

## Review target and approved boundary

- Task: [Issue #63](https://github.com/3427564237/enmori-app/issues/63), ZHOU implementation, JIN independent implementation review, LI scoped acceptance and shared integration.
- Controlling candidate: [P01–P03 and Backend isolation at `55fa4a7`](https://github.com/3427564237/enmori-app/blob/55fa4a7ab77b32b08d300d391ebee4293ad6f963/docs/planning/2026-10-07-zhou-persona-first-contract-delta.md).
- Durable approval: [S-PM-1008-LI-PERSONA-BACKEND-FIRST at `b5f3dbe`](https://github.com/3427564237/enmori-app/blob/b5f3dbef6d5a04d35c30369efe2b9a4a66075a22/docs/decisions/2026-10-08-li-persona-backend-first-approval.md).
- Local branch: `codex/issue-63-persona-backend`; base `55fa4a7ab77b32b08d300d391ebee4293ad6f963`; recorded main baseline `f46a903cb5b339365ac2024004b32b7b96b99e7c`.
- Implementation review head: the publication PR body and GitHub head metadata record the actual committed SHA. This file is prepared before that commit; no self-referential commit SHA is asserted here. The candidate review does not approve these product changes.
- Main-based PR ancestry includes the candidate document inherited unchanged from #60 at `55fa4a7`. This preserves the approved source; #60 remains separate and its merge is not a prerequisite for Issue #63.

The deliverable is the six Persona Backend operations, normative OpenAPI, strict
input/error mapping, inner-layer Ports, transactional owner state and create
recovery, plus guarded isolated composition and required Backend evidence. P08,
Flutter/shared client/Home/router, Android surface acceptance, AI/Conversation,
real-account provisioning and demo/production enablement remain outside this
delivery. Existing dependency and lockfile pins remain unchanged.

## Change and verification to review

The Persona implementation supplies bounded owner-private CRUD and explicit
activation with coherent revisions, permanent deletion and state-conditioned
create recovery. Its self-check found that malformed encoded URLs and overlong
Persona path parameters were rejected by Fastify before the route authentication
and error hooks. They exposed framework error envelopes and supplied path text
instead of the approved safe error response.

The correction handles that early framework boundary only when the guarded Persona
slice is registered. It awaits the existing identity verifier before returning a
safe approved failure with a request ID. No Persona operation runs for rejected
requests. Other routes, unsupported methods and ordinary/demo exclusion retain
their prior behavior. The shared authentication helper's return annotation now
describes its existing asynchronous implementation; its runtime logic is unchanged.

The new `personas/transport/framework-errors.ts` adapter handles only the pinned
framework's bad-URL and overlong-parameter errors for addressed GET/PUT/DELETE
Persona requests. It preserves raw path boundaries while recognizing encoded
static segments, consumes verifier promise rejection, and retains default
framework responses outside this scope. No route, public schema or dependency was
added by the correction.

| Verification | Recorded result and limit |
| --- | --- |
| Initial Backend implementation checks | Historical **344/344 Pass**; details in the [local implementation evidence](2026-10-08-issue-63-persona-backend-local.md). These cases did not establish complete malformed-URL coverage. |
| Initial actual Auth/Firestore Emulator checks | Historical **63/63 Pass**, including 26 Persona cases; same evidence records bounded reads and SDK retries. |
| Malformed-URL correction and regression checks | **Pass.** Four new transport cases cover malformed percent/UTF-8, overlong IDs, encoded static segments, encoded separators, raw absolute targets without dot-segment repair, all auth outcomes, delayed/throwing verification, safe envelopes, zero Persona calls and unchanged unrelated/disabled routes. Two targeted tests reproduced the original defect before the fix. |
| Full Backend regression after correction | **Pass: `backend:verify`, 348/348**, zero failed/skipped/cancelled, with pinned Node 24.19.0 and pnpm 11.19.0. |
| Actual Emulator regression after correction | **Pass: `backend:verify:emulator`, 64/64**, zero failed/skipped/cancelled. Includes 27 Persona cases; the new case checks malformed URLs through actual Auth with no Persona transaction. Uses the unchanged guarded Auth/Firestore runner; both Emulators shut down normally. |
| Combined tree with #61 and #64 | **Not Run.** Pairwise source/preflight inspection is not a merged build or combined-feature Emulator test. |
| Independent JIN review / LI acceptance | **Pending / Pending.** The publication workflow requests JIN review; actual request status is recorded on the PR. No implementation approval is asserted by this packet. |

The [self-check and integration audit](2026-10-08-issue-63-persona-integration-audit.md)
retains the original reproduction and compatibility findings. The correction's
new results above are actual reruns after the correction, distinct from the
historical passes. Final Persona instrumentation recorded 208 transaction calls,
217 SDK callback attempts, 9 retried calls, at most 9 logical gets per attempt and
zero collection scans. The new URL test made zero Persona transaction calls;
retries remain separate attempts, not a billing/runtime bound.

## Repeat self-check — 8 October, 17:04 Asia/Shanghai

At the user's request, reran both pinned commands against the unchanged local
implementation: `backend:verify` **348/348 Pass** and `backend:verify:emulator`
**64/64 Pass**, zero failed/skipped/cancelled in either run. The real Emulator run
included the corrected URL/auth boundary and ended with both services stopped.
Persona instrumentation recorded 208 calls, 215 SDK attempts, 7 retried calls,
maximum 9 logical gets per attempt and zero collection scans; natural retry
counts differ from the prior run without changing the per-attempt bound.

Checked that 130 source/test/contract/build/configuration files remained unchanged
during verification. Whitespace, local evidence links, approved change scope and
unstaged state checks passed. Independent internal read-only reinspection found
no new actionable issue. No product/test code was changed by this repeat run;
only this evidence entry was added. No commit or upload occurred. Actual combined
#61/#64 execution and formal JIN/LI review remain pending as recorded below.

The tested 130-file source/test/contract/build/configuration manifest has SHA-256
`6b722dd35f79bef6555f06ace0df77dc95910f29f919df954c51ac7e2dd3da19`.
Each sorted manifest line contains the repository-relative path, one space and
the lowercase SHA-256 of that file; lines are joined by LF without a trailing
newline. The set is all `.ts` files under `backend/src`, `backend/test` and
`backend/emulator-test`, plus `api/openapi.json`, `backend/tsconfig.json`,
`backend/scripts/run-emulator-tests.mjs`, `package.json`, `pnpm-lock.yaml` and
`firebase.json`. Publication preparation only updates evidence wording; verify
this manifest remains unchanged before committing the tested implementation.

## Shared-file integration constraints

The preflight inspected the following immutable implementation snapshots. They
are comparison inputs, not dependencies silently merged into this change:

| Input | Exact head | Merge base used in the prior pairwise preflight |
| --- | --- | --- |
| [My Friends #61](https://github.com/3427564237/enmori-app/pull/61) | `5bdbcf8d61e0d84ba13e2146167db48704a1e7ae` | `f2d01a129ab4d409c5acb8027481f32b7afec7fe` |
| [Check-in history #64](https://github.com/3427564237/enmori-app/pull/64) | `32b443b022878859aba0641a1847f1e3bb1fd855` | `f46a903cb5b339365ac2024004b32b7b96b99e7c` |

Read-only remote checks after the correction confirmed main and both comparison
heads above remained unchanged. Repeated pairwise `git merge-file -p --diff3`
preflight using temporary files and the corrected local source. Results remained:
#61 OpenAPI 2 conflicting hunks and route inventory 1; #64 OpenAPI 1 and
`build-app.ts` 1. Other overlapping files merged textually without conflicts. The
index and working tree were not merged. Refresh this preflight if any comparison
head changes; these counts do not prove a future combined build.

| Shared file or boundary | Required resolution |
| --- | --- |
| `api/openapi.json` | Retain the union of the six Persona operations, `GET /v1/me/friends` and `GET /v1/me/check-ins`, their feature-specific schemas and approved errors. Preserve Persona create's separate canonical UUID header and 200/201 outcomes, DELETE's body and empty 204 response, and the older commands' existing key syntax. Do not overwrite one complete JSON file with another. |
| `backend/src/bootstrap/build-app.ts` | Keep the actual isolated-environment guard before Fastify construction. Retain Persona's explicit `isolatedSlices.personas` dependency and registration, plus its narrowly scoped framework-error correction. Preserve My Friends' `/v1/me/friends` validation mapping in the existing isolated Friend slice. Retain #64's optional `listOwnCheckInsForDate` dependency and `/v1/me/check-ins` query-error mapping through its own approved base/controlled-runtime path. Do not move all features into a single environment branch. |
| `backend/src/transport/route-inventory.ts` | Retain every method/path once. Persona's six entries and My Friends carry `isolated-emulator`; Check-in history retains its independently approved classification. Reconcile success statuses and key requirements with OpenAPI and actual registration. |
| `backend/src/transport/schemas.ts` and error catalogue | Keep all five Persona failure codes and #64's strict Check-in history query/response schemas, including its bounded page and cursor handling. Preserve the existing failure codes/messages and older-route behavior. A clean textual merge still needs schema/error regression checks. |
| `backend/src/transport/authenticate.ts` | Preserve the existing verification behavior and its explicit Promise return type, which permits the framework adapter to await the same helper. This correction changes the annotation only; avoid introducing a second authentication implementation. Neither comparison branch currently changes this file. |
| Adjacent registration/composition files | Preserve #61's My Friends registration in `register-isolated-slices.ts` and #64's optional history registration in `register-routes.ts` and its controlled-runtime construction. Persona must remain absent from ordinary and controlled-demo runtime. |
| Package, lockfile, Firebase configuration and index | #64 owns its Temporal dependency and Firestore index/configuration changes. Do not add those to the standalone Persona change. When a combined target is authorized, keep them traceable to #64 and validate the combined manifest, lockfile and approved index with that feature's tests. |

The inspected snapshots have no demonstrated duplicate method/path, colliding
storage path or direct mutation of Persona owner state by these other features.
This finding is limited to inspected code; concurrency and behavior in a combined
runtime still require execution. No actual merge or dependency change is included
in preparation of this packet.

## Reviewer checks and acceptance sequence

1. **JIN: source and scope.** Review the eventual implementation head against the immutable candidate and PM selection. Verify that no client, AI, real-account provisioning, deployment, dependency or new requirement is included. Review the new product code independently of the earlier candidate approval.
2. **JIN: HTTP correction.** Check malformed encoding and overlong IDs at the framework boundary; identity-verification failures retain their approved priority, authenticated invalid requests use the approved safe error envelope, and all rejected requests make zero Persona calls. Check near-prefix/unrelated paths and ordinary composition so the correction cannot widen Persona registration or rewrite unrelated failures. Check responses and logs for supplied-path, token and content leakage.
3. **JIN: state and recovery.** Verify authority/integrity ordering, at-most-five live items, full-snapshot coherence, 8/9 logical gets per attempt, one create commit and replay, fifth-create replay before capacity, normalized conflict, effective-mutation closure, no-op preservation, absent-target DELETE exception, overflow and missing/corrupt/orphan failure. Review actual Emulator evidence separately from fake/transport evidence.
4. **JIN and integration owner: shared files.** Resolve the union constraints above in the eventual combined tree, then run TypeScript, complete Backend tests, route/OpenAPI/error agreement, ordinary/demo exclusion and invalid-isolation checks. Run relevant actual Emulator regressions for Persona, My Friends and Check-in history against the combined target; record its exact heads and commands. Earlier pairwise probes do not replace this step.
5. **LI: bounded acceptance.** After the required Backend checks and JIN's exact-head review, accept only the approved Backend scope. Keep PC11–PC13 and client PC14 Not Run/out of scope. Later Flutter transport/session integration, account lifecycle/provisioning and AI snapshot/deletion checks require their own approved tasks; do not infer completion from this Backend packet.

These are review instructions for the existing approved scope. The latest user
instruction authorizes committing, pushing, publishing a Draft PR and requesting
JIN review. Actual publication and reviewer-request outcomes belong to the PR
record. Merge and issue/board status changes are not part of this submission.

The bounded Backend increment is implemented and verified for review on 8 October.
The 11 October target is unchanged. This submission does not establish feasibility
or completion of all six ZHOU product routes, the 42 routes / 38 states, Persona
Flutter surfaces, M26/M27 or AI integration.

## English PR text prepared for publication

Before publication, identify the final implementation head, verify that the tested
source is unchanged and refresh comparison heads. Use the actual publication PR
body for the final head, submission details and formal review status.

Title: `Implement isolated Persona Backend management and safe URL failures (#63)`

Body:

> Implements Issue #63's approved P01–P03 Backend-only scope: six owner Persona operations, normative OpenAPI, strict validation, revisioned transactional persistence and state-conditioned create recovery. The operations are registered only in the existing guarded Auth/Firestore Emulator composition.
>
> The HTTP correction handles malformed/overlong Persona URLs rejected before route hooks, so they follow the approved authentication and safe error boundary without exposing raw paths or invoking Persona operations. Regression coverage includes delayed/throwing verification, encoded and raw absolute targets, and preservation of unrelated routes and disabled composition.
>
> Validation: TypeScript build, 348/348 Backend tests and 64/64 actual Auth/Firestore Emulator tests passed after the correction, with no failures or skips. The local implementation evidence and integration packet preserve the tested source manifest, pinned toolchain, correction evidence, pinned #61/#64 comparisons and shared-file merge constraints. The three-feature merged build has not been run.
>
> P08/Flutter/shared client/Home/router, Android surface acceptance, AI/Conversation and real-account or demo/production enablement are outside this delivery. No dependency change is part of Persona. JIN's independent review of the implementation head and LI's scoped acceptance remain required.
