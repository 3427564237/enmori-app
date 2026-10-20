# LI bounded acceptance — four isolated AI capability experiments

- Source ID: S-PM-1012-LI-AI-CAPABILITY-SLICE-ACCEPTANCE.
- Authority: LI/PM, 12 October 2026, Asia/Singapore.
- Scope: only the four experiments in the
  [capability-only release](2026-10-12-li-real-ai-capability-verification-only.md).
- Accepted #92 head: `029437c5939bfb50643254a7a976bf7fc70c8c12`, tree
  `23b48472e744c1ace2a11f5992e25452b0f9a832`.
- Executed owner tool: `2a64f705a61505e34976f86fff41e74b2c65b843`, tree
  `f83b230bdfccad55e3ea678566118c94fb00b916`; final addition is evidence only.
- Base: #90 `99583d6bd601ba51c577d46901b3e07e389e6fd8`; proposal and accepted
  #88 source are unchanged. Exactly five new MJS tools and two evidence files.

## Completed review and evidence assessment

[JIN independent APPROVE 5493056107](https://github.com/3427564237/enmori-app/pull/92#pullrequestreview-5493056107)
was submitted at23:46:33 SGT on the exact accepted head. JIN inspected the new
tool/evidence, ran the four experiments independently at23:43:50–23:44:15,
strict build, five syntax checks and five additional negative guard/preflight
probes. Cleanup was separately checked by23:45:36. No blocking finding in scope.

[LI independent APPROVE 5493078408](https://github.com/3427564237/enmori-app/pull/92#pullrequestreview-5493078408)
binds the same exact head. LI inspected all five tools and guarded
launcher/worker, confirmed all five Git blob IDs/SHA256 values, unchanged product
payload, evidence-only final delta and diff whitespace exit0. LI independently
ran strict existing Backend build and five syntax checks, plus the direct
negative guard (expected exit1 before SDK initialization).

LI independently executed the published launcher: four experiments,
suite/CLI/outer exit0. Pinned Node24.19.0, Tools15.29.0, Admin14.3.0,
Firestore8.7.1, existing checksum-verified Emulator1.22.0; no install/upgrade.
The guarded loopback/demo instance began empty, used fresh isolated profiles
and disposable synthetic fixture namespaces, and touched no product paths.

| Experiment | Accepted observation and limit |
| --- | --- |
| Fixed historical readTime | Owner, JIN and LI observe original documents/query/repeated document across acknowledged fixture mutation for server-readTime and Backend-UTC anchors; current reads confirm mutation, no latest fallback. This is locked Emulator evidence, not F03 producer permission or cloud certification. |
| Immutable metadata | createTime/identity remain unchanged after update; sampled metadata has microsecond and submillisecond precision. Actual physical commit instant and controllable1ns server commits remain unproved. |
| Marker and durable barrier | Local marker alone does not cancel SDK writes; two serial barrier orders are observed. Callback-held case precedes RPC dispatch. No strict F01, actual wire-at-marker, arbitrary concurrent barrier or lost-ACK proof. |
| Actual conflict/retry | Counts and successful commits vary by real schedule; callback attempts and durable counters are separately checked. maxAttempts1 does not prove cancellation of an outstanding write. |

Preserve distinct schedules: owner maxAttempts1 callbacks[1,1]/one commit,
maxAttempts3[2,1]/two commits/one retry; JIN maxAttempts1[1,1]/zero commits/two
ABORTED10 outcomes, maxAttempts3[2,2]/two commits/two retries; LI maxAttempts1
[1,1]/one commit/ABORTED10, maxAttempts3[1,2]/two commits/one retry. These are
compatible empirical observations, not fixed required counts.

LI's actual readback reports17 owned fixture documents removed, final Firestore
collections0/Auth users0/no further page, SDK shutdown, worker/CLI profile
removal and required ports8080/9099/4400/4500 free. Temporary dependency cache
link removed; cache target and tracked checkout unchanged. Observed cleanup is
not a general ambiguity-recovery or deletion SLA guarantee. Owner/JIN/LI runs
and failures retain separate attribution; no raw owner log download is claimed.

LI ignored local evidence SHA256:

| Artifact | Fingerprint |
| --- | --- |
| capability-run.log | 3b1474d143b3d7d44312318054a8dd30237e1a090ef54f9abd78581fce404fa7 |
| backend-build.log | cfd4efe2c5da044de08dd3278802521cb1429c31402b6422fba1bbfdba865516 |
| negative-guard.log | 7c6a425b5ccc021887911b917160c3feeb7b93380a671904ff7b55c4c72d6fbc |

## Acceptance and supersession

Accept the released Slice A test/tool and its bounded evidence. This completes
ZHOU owner delivery → JIN independent new-source review → LI assessment for
this immutable scope before the23:59 target. Retain the original incomplete-
module, run01 resolution and run02 CLI-child guard failures; no successful run
erases them. Supersede only the pending-review/LI-assessment status for this
exact #92 source, not the underlying proposal or product rules.

**Strict F01-A remains controlling and unproved.** F01-B/C/D, N02 records/indexes/
control retention, F03 producer purpose/generation, R-A unknown exit, C-A cleanup
and product slicesB/C/D/E remain unselected. No actual Conversation adapter,
product reader/persistence, model, device, cloud or lost-ACK recovery acceptance.
Those gaps do not reopen accepted #88 or shared #87/#91 scope.

Keep Draft/Open; no merge, task closure, board promotion, ordinary/provider/model
enablement, whole M26/Sprint/UAT/Release/Done or overall percentage. The earlier
22:00 reviewed-contribution target is not claimed met.
