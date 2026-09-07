# Issue #6 R11 Transport/Application-to-Infrastructure boundary review — 2026-09-07

## Scope and disposition

- Reviewer/task owner: ZHOU YAOYIN (`@YaoyinZhou3922`), R11 only
- Assigned review subject: SHI-owned Transport/Application dependency and
  failure mapping against the accepted R9 adapter boundary
- Accepted R4 source head: `f1bfd37c7776d5128d742bdbebe7851ab37e5608`
- Accepted R4 squash merge on `main`:
  `fcaff75349f15b298412cd105273708b6d87e913`
- Accepted R9 source head: `48e8b3b5bda42fc1f051937cf0fe85329a10002e`
- Accepted R9 squash merge on `main`:
  `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`
- R10 merge identity observed before review:
  `3411c57298419b634a14088142111b5964c5973b`
- Exact review checkout: `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`
- Disposition: **Accepted for the assigned R11 component-review scope; no
  findings in SHI's reviewed boundary**

The approved source-head and squash-merge trees match for `backend/`, `api/`,
`package.json` and `pnpm-lock.yaml`. The R4 squash merge is an ancestor of the
R9 squash merge. R10 is recorded only to identify the current accepted `main`
preflight; its environment implementation is outside this R11 review.

This disposition is not an independent approval of ZHOU-authored R9
Infrastructure implementation. SHI's exact-head R9 review and approval remain
the independent R9 authority. R11 records only the distinct cross-boundary
review assigned to ZHOU and consumed by R15.

## Reviewed boundary

The review was limited to these interactions:

1. Transport depends on SHI-owned Application use-case interfaces and the
   inner `IdentityVerifier` Port; it does not import R9 Infrastructure or
   Firebase/Firestore provider types.
2. Application and Domain depend on inner Ports. They do not import
   Infrastructure, Fastify, Firebase Admin or Firestore types.
3. R9 adapters satisfy the R4-defined `IdentityVerifier`,
   `OnboardingRepository`, `CheckInRepository`, `Clock` and
   `OpaqueIdGenerator` boundaries. Strict TypeScript compilation verifies the
   accepted shapes at the reviewed commit.
4. Firebase identity failures are normalized at the Infrastructure adapter to
   `invalid`, `forbidden` or `dependency_unavailable`. Firestore exceptions,
   invalid persisted projections and unknown repository failures are contained
   as `dependency_unavailable`; provider exceptions and messages do not enter
   the Port result.
5. SHI-owned Application maps repository `dependency_unavailable` results to
   `SERVICE_UNAVAILABLE`. Authentication Transport maps `invalid` to
   `AUTH_REQUIRED`, `forbidden` to `AUTH_FORBIDDEN`, and
   `dependency_unavailable` to `SERVICE_UNAVAILABLE`.
6. Transport maps stable `AppFailure` values through the approved catalogue to
   safe HTTP envelopes. `SERVICE_UNAVAILABLE` maps to HTTP 503, and the global
   handler contains unknown exceptions as the same safe failure without
   returning raw provider messages or stack traces.

No reverse inner-layer dependency on Infrastructure or provider types was
found. No conflicting or missing failure case was found in the assigned
SHI-owned boundary. The R4 `buildApp` entry accepts injected
`R4RouteDependencies`; R11 does not add runtime wiring or expand R13's later
cross-boundary execution responsibility.

## Independent reproduction

The exact R4/R9 checkout was created from the accepted R9 squash merge and
verified with lifecycle scripts disabled:

```powershell
git worktree add --detach D:\3851-r11-exact d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0
node --version
pnpm --version
pnpm --config.ignore-scripts=true install --frozen-lockfile
pnpm --config.ignore-scripts=true run backend:verify
node --test backend/dist/test/transport/routes.test.js backend/dist/test/onboarding/onboarding-use-cases.test.js backend/dist/test/check-ins/check-in-use-cases.test.js backend/dist/test/firebase-identity-verifier.contract.test.js backend/dist/test/firestore-onboarding-repository.contract.test.js backend/dist/test/firestore-check-in-repository.contract.test.js
git diff --check fcaff75349f15b298412cd105273708b6d87e913 d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0
git status --short
```

The dependency-direction scan covered Application, Domain and Ports for imports
of `infrastructure`, `firebase-admin` and `fastify`, and covered Transport and
Bootstrap for imports of `infrastructure` and `firebase-admin`. Both scans
returned no matches. A separate failure-path scan confirmed every stable
`dependency_unavailable` mapping and its focused tests.

## Results

| Check | Result |
|---|---|
| Node.js | `v24.19.0` |
| pnpm | `11.19.0` |
| Lifecycle-disabled frozen install | Pass |
| Strict TypeScript build | Pass |
| Complete recursive accepted R4+R9 Backend suite | **76/76 Pass**, 0 failed/skipped/todo |
| Focused Transport/Application/identity/repository suite | **47/47 Pass**, 0 failed/skipped/todo |
| Inner-layer dependency scan | Pass — no Infrastructure/provider/framework import found |
| Transport/Bootstrap provider-boundary scan | Pass — no Infrastructure/Firebase import found |
| R4-to-R9 merge ancestry | Pass |
| Approved-head versus squash-merge reviewed-path comparison | Pass for R4 and R9 |
| `git diff --check` over accepted R4→R9 boundary | Pass |
| Exact review worktree status | Clean |

## Findings and exclusions

- Findings in assigned R11 scope: **None**.
- R11 acceptance is limited to SHI's Transport/Application-to-Infrastructure
  dependency and stable failure mapping against the accepted R9 Port boundary.
- This record does not approve or re-approve ZHOU-authored R9 implementation,
  R10 environment behavior, or any endpoint, DTO, Firestore field/index,
  dependency, deployment, TTL, scheduler, cleanup mechanism or product
  behavior.
- R13, Android/Q04/accessibility, UAT, Release and Done are not executed or
  claimed by this review.
- Issue #6 and project status remain under PM/JIN disposition; this evidence
  does not close the Issue or mark the Increment Done.
