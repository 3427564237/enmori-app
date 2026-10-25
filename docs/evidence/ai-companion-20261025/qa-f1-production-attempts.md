# QA — bounded F1 real-model attempt ledger

25 October 2026. This ledger separates the first failed harness attempt from
any separately authorized continuation. Neither belongs to the five independent
[Root composition/Emulator groups](qa-composed-first-flow.md), which used a model
HTTP fake. QA performs artifact/source review here without repeating the model
or taking an Emulator slot.

## First attempt: stopped before prepare or generation

Production head: `6bab96062e357b34fc2a7326678ee4b6bce515f2`.
Context's frozen runner/evidence commit:
`f58c3c38510c005a6762face7ba7bc158c03215b`.

The fixed synthetic request concerns one historical Check-in dated
`2026-10-23T06:00:00.000Z`, its Chinese Note about twenty minutes of walking,
stored Mood `放松` and Activity `散步`. The real current user request asks for
a faithful Chinese restatement using the supplied UTC time and no inference
about today's state. These criteria were recorded before the attempt.

QA independently verified the empty preload's exact production request and
raw HTTP 200 response: matching `qwen3.5:9b`, `done:true`, empty response and
`done_reason:load`. The final result records **one empty preload, zero generation
reservations/POSTs, zero prepare and zero execute**. The source sequence supports
these counts: assigning `app.listeningOrigin` after private listener startup
throws before the prepare counter or request. There is no generated answer,
application HTTP acceptance or persisted assistant to review.

QA independently reproduced the getter-only property `TypeError` using the
same pinned Fastify dependency in an ES module. This diagnostic only constructed
and closed the app: zero listener starts, network fetches and model calls.
It establishes the harness error, not a production serializer/model defect.
The original result's `pending_independent_qa` semantic placeholder is resolved
by this ledger as **Not Run**, not a failed model response or a semantic Pass.

## Evidence integrity and cleanup limits

QA checked the frozen runner against the committed file, manifest/result/source
bindings, all 243 tracked TypeScript files against exact `6bab960`, and all 243
compiled files against QA's already independent `8b2e746` build. Every compiled
hash matched; no fresh build or service execution was necessary.

The original index has 11 entries with exactly one stale hash, `runner.log`:
the runner indexed it before writing its final stdout. Its other ten entries
match. The original index is preserved; all 15 supplemental index entries match,
including the stable log and original index. Manifest, preload, result and
source-binding bytes remain unchanged. The job-wide reservation still exists
and binds the original manifest; QA did not remove or reset it.

The recorded lane is settled with `pending:false,outcomeUnknown:false`.
QA inspected the completed cleanup result and exact cleanup code: own synthetic
documents/Auth identity removed, owner/Check-in absence read back by the runner,
runtime and source-sweep metadata restored under its ownership checks, private
listener closed and shared services preserved. QA did not independently reread
the live Emulator after the slot was returned. The scope is a verified recorded
cleanup path, not a second live cleanup run.

Private run directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/context-f1-production-6bab960-once/`.
Independent QA files are under the same base at
`qa-review/context-f1-production-6bab960/`.

| Artifact | SHA-256 |
| --- | --- |
| Original fixed manifest | `ac82b3f8504b5f8bd63dc177d669a568a112c1938b0c95d4d080e00d0a1b869a` |
| Production source/compiled binding | `afc5894df65466dc7003ff35ef5a28050320b882640a83b61ad009f3530912c8` |
| Frozen runner | `bf21a490cdf4e3590cefe3bbff3360cfe58a3d4825d900646cfa74a20900a015` |
| Empty preload raw response | `66250f90ae4be9f82ca596cc2fb57af168579da07cf2f3475367b4ca632ca0a9` |
| Original stopped result | `38b8fb5b899af28b296523bf8f4051dd11a674791e6279a0c5b1dd7d7345a859` |
| Supplemental artifact index | `70532284f800e36de8634f24df8468f192cb451ba2adaea5bbd89030f82e8556` |
| Independent `qa-audit.json` | `e8a465ef82ea1515b6ac7a56ad1a4930257edb0715158e271ac42b7acb927311` |
| Independent getter diagnostic log | `f06515e405ce134b14c8943a3bd179ec5136cbce9b1a66b9d21a81a90f83517f` |

## Separately authorized continuation, pending review

Integration subsequently authorized a minimal harness repair and one bounded
continuation, retaining the original fixed input, production source, evidence
and job reservation. The continuation must bind the original result hash and
consume its own single-use claim. Across both attempts, the single empty preload
is already spent: no further preload is permitted; at most one generation and
one execute remain. A generation failure or unknown outcome stops the run
without retry. This authorizes no prompt/parameter change or F0 experiment.

No continuation result was available at this checkpoint. Its eventual protocol,
canonical storage and semantic evidence must be reviewed separately; it cannot
rewrite this original harness failure as a passing attempt or discard its count.
