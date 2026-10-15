# JIN six-operation coordinator and maintenance delivery

14 October 2026 SGT. SHI reviews JIN code/composition; LI reviews JIN evidence
and bounded disposition. LI reviews ZHOU's new #107 code. Keep Draft/Open.
This is a usable isolated implementation, not an ordinary-runtime release or
a claim that every combined-source gate has passed.

## Immutable source

- Candidate `6f549b7d7a99a26219c061191b92cd89a4e37554`, tree
  `e5d2b3c47fb9197cb1c0d90c33d85b89828bbe31`.
- Actual two-parent join `e594cb7df997f66e8cc93bff25ec5dd334fe6a5d`
  combines JIN readers `e14c360d83399581d057773eca05e302613f7b9d` and
  ZHOU #107 `6c62bdf33748d15d25d10eb0a6c505030e04aaa5` without editing ZHOU source.
- New coordinator/composition `2d7f6b170d108b0a64a018b1756112529005e8a7`;
  focused-run wrapper `a3e2143d8c8898c3a71f89d15b723bea35d05cbb`;
  actual-retirement observation correction `4cb507d6efcfca329baf4dc234ecbd914c15a1cf`.
- Final candidate also merges unchanged #101
  `65c31c097df492e9cf01e4a57fb3230b97031c1b`, reviewed by
  [SHI5515778188](https://github.com/3427564237/enmori-app/pull/101#pullrequestreview-5515778188).
  Only its test correction and evidence enter that last merge. #99's original
  504/1 invocation and unproved historical triggering cause remain recorded.
- This supplement's publication commit changes evidence only. Exact changed-file
  blobs, normalized working bindings, input identity comparisons and local log
  fingerprints are in the [manifest](2026-10-14-jin-six-operation-coordinator-manifest.json).

## Concrete implementation and handoff

`createIsolatedConversationComposition` is the explicit Bootstrap factory for
the actual six-operation consumer, original-token executor, fixed/current SDK
readers, real bridge/acknowledged pair, ordinary readers and cleanup. It validates
the actual isolated SDK binding, confirms a new epoch, retires previous controls,
constructs the consumer, and runs startup maintenance before exposing operations.
Hourly maintenance stays in the same Backend lifecycle. Ordinary `main` does not
call this factory; there is no default fake model, semantic gate or Note authority.
The returned `operations` supplies `buildApp`'s existing isolated conversation seam.

`ConversationIoQuiescence` combines ZHOU's actual closed/idle target lease with
JIN's content-free tracking of actual bridge promises and complete read-only SDK
transactions. It holds both admissions through cleanup, waits pending I/O, and
never invokes work on an unknown/stale lease. `close()`/Abort/model quarantine
alone is not settlement. The request-local tracked bridge revokes new effects
synchronously, awaits late initialization/content operations, and retires only
its closed settled control. Duplicate confirmed close cannot recreate a retired
guard. Unknown close is retained as unresolved; no automatic effect retry occurs.

The factory's explicit stop method closes new prepare/execute admission and stops
periodic work. It is not a claim that arbitrary remote generation or every live
HTTP request has terminated. Actual listener ownership/settlement remains with
the enclosing process and its shutdown evidence.

General ordinary suppliers use actual ownership, immutable original-U checks,
all-pending/canonical-pair protection, source/expiry checks, sequence-DESC limit20
queries and ascending wire presentation. Readback derives the canonical effect;
absent rows cannot invent `no_effect`. Whole deletion removes bounded child pages,
all target controls, progress and finally the parent, with cleanup-generation ABA
protection. It does not return204 on unknown settlement.

Source sweeps cover complete canonical message/source collection-group paths,
page25 continuation, tombstone content/provenance removal, current revocation and
orphan cleanup. Unknown/rollback/unproved source authority is reported incomplete.
Absent-parent orphan cleanup continues other targets in the same run. Checkpoint
CAS compares full phase/path/time/failure identity as well as revision. Expired
checkpoints restart with their failure retained; restart controls paginate across
closed and open previous-epoch rows. These cases do not prove a production24h SLA.

The selected index declarations are added to the existing isolated configuration,
preserving prior indexes. No index is deployed. Emulator query execution is not
cloud-index provisioning evidence.

`ControlledOllamaTransport` supplies actual HTTP preflight and generation logic:
explicit controlled endpoint, pinned binary/model/tokenizer identity, loaded9B
and context8192 checks, complete compiler-bound input count<=4096, output<=512,
raw output handoff to the existing parser and no redirect/public fallback.
Ambiguous termination stays quarantined; socket abort never proves model stop.
Nine injected-HTTP cases cover its implementation only.

LI's [new host direction and deployment](https://github.com/3427564237/enmori-app/blob/d381cdf73405844d3a0056291bfc33ea2aeb076d/docs/evidence/sprint3/2026-10-14-li-real-host-deployment.md)
supersede the earlier absent-host/install restriction for that controlled Linux
host. LI now has actual host/model/matching-tokenizer observations. JIN does not
repeat that setup request or relabel LI's operator generation as this application's
gate. `CompletePromptCompiler` must bind full framing to the actual host tokenizer;
real semantic checks and actual joined60/5/45/Q31 cases remain required. The
factory accepts explicit transport/policy suppliers and never enables a permissive
production semantic gate. Runtime/model files and credentials remain outside Git.

## Actual JIN checks

Pinned Node24.19.0, TypeScript7.0.2, Admin14.3.0, Firestore8.7.1, CLI15.29.0,
Emulator1.22.0, Java21.0.12, Flutter3.47.2/Dart3.13.2. No dependency change.

| Source/check | Actual result |
| --- | --- |
| Coordinator `2d7f6b` strict build/full Backend | Pass790/790, exit0; exact src/unit-test/lock inputs unchanged through final candidate |
| Coordinator focused fake-Port cases | Pass7/7; overlap790 |
| Corrected `4cb507d` strict compile | Pass, exit0 |
| `4cb507d` actual guarded coordinator/maintenance Emulator | Pass18/18, outer exit0; exact Backend/tool inputs unchanged through final candidate |
| Final `6f549b7` default-concurrent Flutter | Pass540/540, exit0 |
| Final `6f549b7` fatal-info analysis lib/test/integration_test | Pass, no issues |
| Final code/API/tests/tools whitespace delta | Pass |
| Full delta including inherited raw evidence | Fail: #107 analyzer transcript line1 trailing padding retained; not a product-code failure |
| Full joined Emulator including ZHOU Dart CLI child | Blocked/Not Run at this checkpoint: foreign hardcoded SDK executable path, precise owner correction requested |
| New Android/device and real-model application gate | Not Run |

The actual18-case group includes a new real Auth->Fastify six-operation->ZHOU
consumer/executor->JIN general store/reader/coordinator journey. It observes the
actual HTTP sink, original user createTime, canonical pair/pending removal,
normal guard retirement, ordinary readback/history, unused-preparation Cancel,
whole physical deletion and cleanup generation/progress. Qwen and policy gates
are explicitly fake; the complete owned Note inventory is verified empty.
This is Fastify injection with real Auth/Firestore, not a new Android journey or
the pending cross-machine Dart socket test. Earlier real-store/page/sweep cases
overlap these totals and are not added.

Owned fixture children/parents/controls/metadata/Auth users and SDK handles were
removed. Both private runner profiles were removed and required loopback ports
released. No cloud fallback, ordinary data, model call or real Note inventory was
used. The runtime-binding audit observes the same validated SDK target.

Reproduction from the pinned source, existing locked dependencies and controlled
environment (the existing wrapper validates versions/cache/loopback isolation):

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test --test-reporter=spec 'backend/dist/test/**/*.test.js'
node tool/run_ai_store_emulators.mjs --coordinator-only
flutter test --reporter expanded
dart analyze --fatal-infos lib test integration_test
```

Omitting `--coordinator-only` requests the full suite. It is not represented as
passed here; no skip flag is inserted to conceal the Dart prerequisite.

## Retained failures and separate earlier observations

- First coordinator SDK run at `a3e2143`:17/18, exit1. The test assumed that an
  empty tracker instant after HTTP acceptance implied retirement had begun.
  HTTP completion legitimately precedes the later terminal close. `4cb507d`
  waits the actual retirement observer with a bounded failure, then checks
  settlement and absence. No product timing or assertion outcome was weakened.
- Readers `e14c360`: first full run119/120, exit1; legacy Auth revoked-identity
  case took7349390.9945ms and returned invalid instead of forbidden. The elapsed
  interval is compatible with token expiry but the underlying delay/error cause
  was not independently captured; do not call that hypothesis proven. Second
  attempt failed Hub4400 startup before cases, exit2. Third unchanged source
  full run120/120, outer exit0, with all cleanup passed. Earlier failures remain.
- Supplier raw-header type compilation and coordinator import-path compilation
  failures are retained; both were corrected before their passing builds.
- Intermediate f887711/111, c9f711/114, ef100720/115 and e14Backend720 results
  belong to their exact inputs. They are not extra distinct cases or the final
  full Emulator result. Qwen9 uses injected HTTP, not LI's actual model host.
- Existing #99 Flutter, previous single-attempt SDK races, loader/import,
  whitespace and device/uninstall histories remain on their original sources.

## Remaining precise work

ZHOU owns the portable pinned-Dart fixture change; LI reviews #107. JIN then runs
the complete new source, including actual socket/client and applicable device
checks. SHI's new composition review and LI's evidence disposition remain open.
The current code is published for those reviews without claiming acceptance.

JIN/LI still need actual host-bound full prompt/token measurement and semantic
policy integration, readiness/cancel/quarantine/adversarial evidence and the real
model join. Nonempty real Note lineage/deletion/nonreuse facts remain local to
their dependent reader/store/cleanup paths; no missing fact is fabricated.
Provider, ordinary/cloud/index/runtime enablement, full-source operational SLA,
API24/25, human accessibility and whole module/42-route38-state/Sprint/UAT/Release
remain outside this result. No merge, Issue/Project transition or deadline rewrite.
