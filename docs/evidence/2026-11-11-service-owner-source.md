# Same-service OpenAI ownership — source and isolated SDK evidence

Authority: [approved implementation](../decisions/2026-11-11-li-teacher-stability-implementation.md), [exact restart proposal](../planning/2026-11-11-openai-service-restart-proposal.md), [implemented private contract](../../api/openai-service-owner-contract.md).

Implementation commits: `ea01b0e` and startup-bound correction `3f3ec2a`, on branch `souma/teacher-owner-20261111`. The branch includes credit dependency `fcbd5859` (cherry-pick of `668b1d3`); the owner commits themselves do not modify the four monetary Domain/Port/authority files. Both private configuration/composition hooks now use the credit agent's `decodeOpenAiDeploymentCostGrant` validator. Reuse the already integrated credit commit rather than cherry-picking it twice.

Node 24.19.0 and existing dependency symlink/lockfile were used. No dependency version, platform plan, cloud key, service configuration, paid model call, notification registration, real Firebase read/write, deployment or phone action was performed in this source task.

## Results on the final implementation

| Check | Result |
| --- | --- |
| TypeScript strict build | Passed |
| Complete Backend suite, including credit and owner integration | 1934 / 1934 passed; 0 skipped/cancelled |
| Azure config/lifecycle tests with module mocks | 9 / 9 passed |
| Owner Domain/Application/Infrastructure/clock targeted suite | 16 / 16 passed |
| Guarded real Firestore SDK owner suite | 6 / 6 passed |
| `git diff --check` | Passed |

Commands, with `/home/miku/.local/state/enmori-cloud-resume-20261105/sol-test-app-bundle/bin/node` as `node` below:

```sh
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test 'backend/dist/test/**/*.test.js'
node --experimental-test-module-mocks --test tool/azure_backend.test.mjs
node --test backend/dist/test/ai-runtime/renewable-service-owner.test.js
FIREBASE_EMULATORS_PATH=/home/miku/.cache/firebase/emulators \
  flock -n /tmp/enmori-cloud-emulator-validation.lock \
  node tool/run_cloud_quota_emulators.mjs --owner
```

The existing guarded runner uses isolated `demo-enmori-rmvp01a-r10`, loopback Auth 9099 / Firestore 8080 and a temporary isolated CLI profile. `--owner` adds only a focused suite selection. The external lock serialized SDK work with the credit agent. Tests guard the environment before SDK construction, restore the two matching coordination fixtures, and remove only their own synthetic account/binding rows. The runner exited zero and shut down its emulators. Afterward, the lock was reacquired and ports 8080, 9099, 4400, 4500 and 9150 had no listeners.

Local logs (not publication artifacts): `/tmp/enmori-service-owner-backend.log`, `/tmp/enmori-service-owner-azure.log`, `/tmp/enmori-service-owner-focused.log`, `/tmp/enmori-service-owner-emulator.log`.

## Covered boundaries and corrections

The fake tests prove submission-time 105-second deadlines, strict 15-second ACK acceptance, renewal single-flight, delayed/lost acknowledgements, no post-retirement revival, original epoch/version checks, exact private configuration, no implicit record creation/repair, and separate active-loss versus initial-unavailable behavior. Linux parsing and suspend-inclusive elapsed time are tested, including missing/backward/invalid values and wall-versus-monotonic divergence greater than 1,000 ms. The local Linux clock also reads actual `/proc/uptime` without network.

Occupied startup is explicitly limited to 135 seconds. The normal fixture observes at 0/30/60/90/120 seconds and ends closed at 135. A separate regression submits the final operation at 134 seconds and proves it ends locally at 135, rather than extending its own 15-second ACK deadline to 149. A late successful commit can still exist; it grants no local capability and is never replayed. On timeout, ordinary functionality stays available, cloud/Settings writes remain closed, and there is no automatic restart, continued polling or promised availability.

The SDK tests verify actual immutable `readTime` projection, atomic fence+owner acquisition, renewal without a fence increment, competing owners, lost acquisition/renewal ACKs, suspend-inclusive local expiry before durable server expiry, old Settings transactions blocked at their original epoch, and a committed-but-unacknowledged Settings withdrawal visible to the fresh owner. The contention test asserts at most one permitted owner rather than requiring a winner from an unknown/contended transaction.

The combined suites preserve the existing shared consent fence and provider-count/inference guards. A new F0 regression expires the actual `RenewableServiceOwner` after canonical publication while the fake FCM response remains pending: the old process cannot record a delivery result, the row remains dispatching, and fresh recovery classifies it unknown without another generation or send. The initial test fixture incorrectly rejected the fresh authorization read for that published row; correcting its authorization-only stub preserved the required no-generation/no-send assertion. No product behavior was loosened for this test.

Azure watcher tests inject timer, shutdown and process disposer: owner loss initiates disposal once and exits nonzero after at most 15 seconds even when the shutdown promise never settles. A late shutdown callback cannot exit twice or revive ownership. Ordinary manual shutdown cancels that loss watcher and retains its prior drain semantics. Loss notification is wired before runtime composition awaits, including startup retirement/maintenance. The 15-second best-effort disposal bound is a documented coordination/implementation choice within the approved proposal, not a separately invented PM quotation.

## Remaining evidence boundary

This is source plus isolated SDK evidence. It does not establish a live service-owner migration, measured Azure recovery time, two-month uptime, financial top-up, physical FCM delivery, phone UAT or Release. The root coordinator owns the separately reviewed stop/drain migration and zero-paid restart rehearsal. A source test cannot prove a remote generation physically stopped; all existing unknown financial holds and occurrence outcomes remain durable. Service ownership never refreshes money, balance verification, price evidence, per-account consent or user notification permission.
