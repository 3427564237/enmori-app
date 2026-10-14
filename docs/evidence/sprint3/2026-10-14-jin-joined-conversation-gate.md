# JIN joined Conversation source and actual full SDK gate

14 October 2026 SGT. This supplements the [coordinator checkpoint](2026-10-14-jin-six-operation-coordinator.md)
and [controlled prompt handoff](2026-10-14-jin-controlled-prompt-handoff.md).
The former's blocked full-suite observation is historical. The new full invocation
below passed without skipping the Dart client or any other committed case.

## Exact source and ownership

- Actual source `96c0b70b3d5d7d8c806b6797f72f2b250f106b91`, tree
  `dec895957c63496268d69f8ca9593501d65e1f9a`.
- Four prompt/tokenizer/compiler-test/helper additions at
  `f8b4ae12004c7cfc0ad504113bdf5454e0f20cc1` extend published coordinator
  `85015b7e327c2b17fa5a8da7347f8392a99b9d17`. No new API/schema/dependency or
  shared Auth/Home/router change is introduced by this follow-up.
- `96c0b70` changes only the inherited SDK test's foreign absolute Dart path.
  JIN's integration adaptation uses the existing platform PATH executable and
  verifies exact Dart3.13.2 before sending synthetic Auth bytes over stdin.
  There is no download, alternate version, skipped assertion or product change.
  The original ZHOU #107 head stays `6c62bdf33748d15d25d10eb0a6c505030e04aaa5`.
- The candidate retains the actual #107 consumer/executor/target leases, JIN
  general readers/store/I/O coordinator and SHI-approved #101 Persona test delta.
  GitHub readback at this checkpoint reports #107 merged externally; that action
  was not performed by JIN. A merge is not relabelled as an independent review.
- This evidence publication changes documentation only. The [manifest](2026-10-14-jin-joined-conversation-gate-manifest.json)
  records exact new blobs, normalized working-file bindings, unchanged input
  inventories, result attribution and private local-log fingerprints.

## Actual checks and what they demonstrate

| Check and source | Actual result |
| --- | --- |
| `96c0b70` strict TypeScript compilation | Pass, exit0 |
| `96c0b70` full guarded Auth/Firestore Emulator | 129/129 Pass, fail/cancel/skip/todo0, outer exit0; 216129.6927ms test-run duration |
| `f8b4ae` full Backend unit/contract | 798/798 Pass, exit0; all src/unit-test/config/lock inputs identical at `96c0b70` |
| `6f549b7` default-concurrency Flutter | 540/540 Pass, exit0; all lib/test/integration_test/pubspec/Android inputs identical at `96c0b70` |
| `6f549b7` fatal-info analysis lib/test/integration_test | Pass, no issues; same inputs as above |
| New executable and full code/API/test/tool whitespace | Pass |
| Full inherited delta including raw evidence | Fail/exit2: retained analyzer transcript padding; not an all-file Pass |
| New Android/device and actual Qwen Application gate | Not Run |

Counts overlap prior focused cases and are not added. The later 798 and540 input
comparisons do not claim those commands were rerun at `96c0b70`. The129 execution
is an actual full invocation on that new source, not an inventory comparison.

The suite includes the actual Dart HTTP client through Fastify, Auth, N01
consumer/executor, SDK store, canonical history/outcome and complete own-fixture
deletion. A separate factory test uses JIN's general ordinary readers and actual
target-lease/I/O coordinator, observes canonical U/assistant persistence and
normal control retirement, then checks physical cleanup. It also retains real
transaction, authority, race, restart, expiry, source-sweep, checkpoint and
existing Account/Profile/Settings/Check-in/Interest/Event/Friend/Persona cases.
These separate fixtures are not one all-feature journey. The Dart fixture's
known-pair supplies do not replace general-reader evidence from the other cases.

Qwen, token/semantic gates and complete owned empty-Note inventory remain explicit
synthetic fixtures. The observed HTTP/store path proves actual isolated storage
integration, not real model semantics or nonempty operational Note authority.
No inaccessible real sources are fabricated as an authorized empty inventory.

The wrapper checks pinned Node24.19.0/Admin14.3.0/Firestore8.7.1/CLI15.29.0,
the cached Emulator1.22.0 JAR digest, loopback ports and isolated demo target.
The runtime audit observes the actual same validated SDK target with sslFalse.
Fixture assertions and SDK handle teardown passed. Worker and outer private
profiles were removed; all five required ports8080/9099/4400/4500/9150 were free.
This is not a claim of cleanup of unrelated data or a cloud configuration check.

Reproduce with existing locked dependencies, Java21.0.12, the verified Emulator
cache and already installed Dart3.13.2 on the controlled PATH:

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node tool/run_ai_store_emulators.mjs
```

No `--coordinator-only` or skip option was used in the129 run. Raw logs and any
temporary credentials remain private; published fingerprints are attributed
identifiers, not claims that reviewers downloaded/recomputed private artifacts.

## Retained failures and remaining gates

The earlier119/120 long Auth failure, Hub-start failure,17/18 premature retirement
observation, import/type failures, raw-log whitespace and #99 default-concurrency
504/1 remain in their source-bound histories. The successful unchanged reader
rerun and this later run do not explain the unobserved cause of the earlier long
delay. The #101 correction demonstrates the pre-dispatch test boundary and keeps
late201/412/key/body/GET/token/session assertions; it does not invent proof of
the historical #99 triggering event or deterministic global reliability.

SHI APPROVE5517245586 is for `f887524`, not this later source. SHI must review the
new JIN ordinary-reader/coordinator/restart/model-adapter/compiler/test delta;
LI separately reviews JIN evidence and bounded acceptance. ZHOU source follows
LI's review path. No owner-agent substitutes for those independent roles.

LI now owns a deployed controlled Linux Qwen host. The included compiler,
tokenizer helper and transport can be handed to that host with private absolute
paths/digests. Actual template/count identity, readiness and60/5/45 cancellation/
quarantine, independent Q31 semantic policy and joined real-model evidence remain
required. The local fake gates must not be used as production semantic policy.
Nonempty Note lineage/no-restore/nonreuse, process-wide shutdown settlement,
complete operational24h cleanup SLA and applicable current-source device checks
remain explicit obligations. Unrelated approved work can continue.

The conditional22:00 evidence estimate is for this delivered code/evidence
packet, not peer approval or whole-product completion. Keep Draft/Open; JIN does
not merge, close Issues, change Project states or enable ordinary/cloud/index/
provider runtime. No whole AI/42-route38-state/Sprint/UAT/Release or deadline
success is inferred.
