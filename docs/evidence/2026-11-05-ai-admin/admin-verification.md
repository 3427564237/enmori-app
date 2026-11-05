# Interest administration Backend verification — 5 November 2026

Recorded 2026-11-05T01:15:52Z in worktree `ai-admin-polish-20261105/ENMORI`.
Base HEAD: `f56e6cb37706d5916e0b5a35ecd36f3251d5b0e8` (AI-only snapshot); the Admin files below
were uncommitted working-tree changes when verified. The SHA-256 inventory fixes
this evidence to their bytes; a later integration commit is a separate record.

## Authority and scope

Implemented the [confirmed LI Interest extension](../../decisions/2026-11-05-li-ai-latency-admin-polish.md#confirmed-interest-management-extension)
and its [approved concrete proposal](../../planning/2026-11-05-interest-admin-completion-proposal.md),
preserving [C2](../../decisions/2026-08-31-pm-requirements-decisions.md),
[Q12](../../decisions/2026-09-02-interest-tag-event-category-contract.md), and the
[Backend architecture](../../decisions/2026-09-01-backend-architecture.md).
The implementation followed [AGENTS.md](../../../AGENTS.md),
[repository Skill routing](../../tooling/skill-routing.md), and the repository
[enmori-backend-development Skill](../../../.agents/skills/enmori-backend-development/SKILL.md).
The new [management contract](../../../api/interest-admin-management-contract.md)
and OpenAPI preserve the old capability response and existing create contract.
No Event Category, recommendation configuration, account action, role grant,
dependency, registry, migration or public capability flag was introduced.

GET includes active/inactive items. PATCH performs rename or deactivate/restore
with fresh Admin authority and expected-revision validation before no-op checks.
Rename checks complete catalogue/name reservations atomically; stable IDs and
existing references remain intact. The existing three runtime compositions
register management alongside creation, including `retained-core-runtime.ts`
used by the Azure entry point. This is source wiring evidence, not deployment.

## Execution and results

Used the existing pinned Node **24.19.0** binary and frozen installed dependency
tree: TypeScript **7.0.2**, Firebase Tools **15.29.0**,
Firebase Admin **14.3.0**, Fastify **5.12.1**.
The [toolchain decision](../../decisions/2026-09-05-rmvp-01a-backend-toolchain.md)
controls these choices. No install or dependency change was needed for this slice.
Commands were run from the worktree root, using `NODE24` below as notation for the
existing full binary path (not the system Node 26):

```sh
NODE24=/home/miku/.local/share/pnpm/store/v11/links/@/node/24.19.0/00cf8b7bd601ac85fa8bfdb2a328cdee2766a25aaf53b02afe1a55508b36b33e/node_modules/node/bin/node
"$NODE24" node_modules/typescript/bin/tsc --project backend/tsconfig.json
"$NODE24" --test 'backend/dist/test/interests/*.test.js'
"$NODE24" --test 'backend/dist/test/**/*.test.js'
FIREBASE_EMULATORS_PATH=/home/miku/.cache/firebase/emulators PATH="$(dirname "$NODE24"):$PATH" "$NODE24" tool/run_interest_admin_emulators.mjs
git diff --check
```

| Check | Final result | Local log |
| --- | --- | --- |
| Strict TypeScript compile | exit 0 | `admin-backend-build.log` (empty on success) |
| Interest focused suite | 34/34 pass, no skips | `admin-backend-focused.log` |
| Full Backend suite, including exact OpenAPI routes/schemas/statuses/errors | 1817/1817 pass, no skips | `admin-backend-full.log` |
| Real local Auth/Firestore Emulator integration | 6/6 pass, no skips; CLI exit 0 | `admin-emulator.log` |
| Whitespace/error check | `git diff --check` exit 0 | no output |

Logs are local ignored artifacts under `output/ai-admin-20261105/`; digests are
below. **The 34 focused cases are a subset of the 1817 full-suite cases**, not
additional coverage. The 6 emulator cases run separately. The management test
file contributes 15 source cases; the remaining focused cases are existing
Interest coverage.

The first full-suite run had **1815 pass / 2 fail / 1817 total**. It correctly
caught (1) missing GET/PATCH/DELETE entries in `ROUTE_INVENTORY`, despite their
presence in OpenAPI, and (2) the exact shared error/status assertion missing the
four approved new catalogue codes. Updated the static inventory and exact test
expectation, rebuilt, then reran the complete suite to the final 1817/1817 result.
The final run reused `admin-backend-full.log`; the initial raw log was not retained
separately. This paragraph preserves the observed failed-step chronology instead
of representing the initial run as green.

Emulator execution used demo project `demo-enmori-rmvp01a-r10`, local Auth 9099 and
Firestore 8080, existing emulator cache, a fresh sanitized temporary CLI profile,
and OpenJDK `25.0.5.0.3`. The harness checks free ports, strips real credential
configuration through the existing controlled-environment builder, and resets
only its guarded demo fixture dataset before each test and after the run.
Emulators shut down successfully. The existing firebase config warns that no
Firestore rules file is present; these are Backend Admin SDK transaction and
application-authorization tests, not client-security-rules acceptance.

The six cases cover equal-revision rename races, concurrent Unicode-name claims,
selection/deactivation races, restore/delete/selection races, retained Event
references plus independent absence read, and fresh real Emulator Admin-claim
removal/disabled-user denial. Source tests also cover invalid requests, unknown
schema/dependency failures, no-op preconditions, name reservations, current
permissions, no-store responses and independent readback.

## Delete gate and limits

Source inventory finds typed durable Interest IDs in
`account_interests/{accountId}.interestTagIds` and
`events/{eventId}.interestTagIds`. Existing selection creation validates the
catalogue item in its transaction. All retained Event rows count, including past,
inactive and unpublished entries. Current Check-in, AI and participation records
do not add typed durable Interest references; transient recommendations are not
a persistent reference registry.

This source inventory **does not prove the complete deployed database or every
historical producer**. Every connected runtime therefore omits
`VerifiedInterestReferenceInventory`: permanent DELETE remains **503**, and the
connected client must not expose a clickable permanent-delete action. The
concrete complete-scan checker is injected only into reset isolated tests. Its
revision/state check, complete reference scan, reservation removal and deletion
share one transaction; unknown shapes or failed scans close deletion. A future
real-data enablement requires deployed inventory proof and a new decision if a
registry, index or migration is needed. No such proof or enablement is claimed.

`/root/ux_audit` independently reviewed the local Backend diff, contract and tests
and reported no blocking defect; after the full suite passed, it was told about
the static inventory/error expectation correction. This is **local agent review,
not formal PR approval**. No live Admin write, privilege grant, live data mutation,
deployment, APK, phone, UAT, Release or Done claim belongs to this evidence.

## Exact implementation and test SHA-256 inventory

```text
1ee4921318a4c97eaeb2e92768c8355b8073759b1decc3332583b74bd66f72eb  api/interest-admin-capability-contract.md
4370a913ea0a4a006490689d6e860cde6dd9f11df4c587bb3d37578e1923965c  api/interest-admin-management-contract.md
cb195fe5c8c65eb435f5c4296f7addb79feb8a113c91dc53f884f392bd708a60  api/openapi.json
bb549a1b592ff31a7faff40ba4a9b6947ffb59ebda950c55588453a7b95872bb  backend/src/bootstrap/build-app.ts
4074cbc5d704df0753f911cc9f28591ec5112642e6b3edbae338c366688cdf49  backend/src/bootstrap/controlled-phone-service.ts
6cd36ab2bd28447daa490eb8a5419208a66b1e2d5fe45e71dede5adcd56ca3f0  backend/src/bootstrap/controlled-runtime.ts
7ff1929a2caa214d3e04389d0474e09f744caf050599e45ead2812f0d2b735e0  backend/src/bootstrap/retained-core-runtime.ts
02f9b7c452255859dabbc2d9f3a6ba68169a463c80559ab18a496d37f8f0a022  backend/src/interests/application/manage-interest-tags.ts
627c657e229e9beab2f495ab1bd1cb66154eb872b995ad4ea566e8706ad9569a  backend/src/interests/infrastructure/firestore-catalogue-writer.ts
050bc87ce159129094549b0eb926f758f8772343620267995920e3ebb4950949  backend/src/interests/infrastructure/firestore-interest-reference-inventory.ts
941e7de99d150a4f747fb0ad701efe5d3b06eef8e24a9113b78b99c8fc60a20a  backend/src/interests/ports/interest-admin.ts
994ded693ca634745cd024e0decf25304bdd39705f79eb617e70d992f600d16a  backend/src/interests/transport/admin-routes.ts
a2aa1a09c67e83aa697d0d144c893b25e29a36fbe94bb166e3cfa110cb61afca  backend/src/shared/application/app-failure.ts
c771894e87d07f73bb04a6a0c0b483e4c0d0713cbfc8a169466025677bbf31b3  backend/src/transport/route-inventory.ts
f3a05f419cc3a1e7c958ce0dfe12fdd6cadb38e10f89ec41fda1077942631a6a  backend/src/transport/schemas.ts
66a5389509a0c510de79169461c27569f4d11f5d30ed56ae7fcf8efc53089973  backend/test/interests/catalogue-management.test.ts
950a8d5fdf515a06b2dfde4b18ad0ff1a00e3edb66ae4f1009442c1bdfbb4f24  backend/test/shared/app-failure.test.ts
d6f034c42d58c1e34232fd0b47afe466140524754f71295a488577abcbb96e21  backend/emulator-test/interest-management.integration.test.ts
13230d93e7a0d1253cea15c2fc638ff89b17295c8e14c41bfafaaa0bc06b5135  tool/run_interest_admin_emulators.mjs
```

## Exact local log SHA-256 inventory

```text
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  output/ai-admin-20261105/admin-backend-build.log
259b80d4eaad9198b9eab9179980f5ef31618acaee27db57383f37d30cf04ffe  output/ai-admin-20261105/admin-backend-focused.log
e9f61e037af3288439ab929ee42400736124fd49f9bc29dde1c872bd6df68529  output/ai-admin-20261105/admin-backend-full.log
98f70aef0d4c57717126490a5d91909a4ae158357c661348752ce54aadcfb9f2  output/ai-admin-20261105/admin-emulator.log
```
