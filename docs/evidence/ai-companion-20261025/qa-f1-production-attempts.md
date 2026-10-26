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

## Separate continuation authorization

Integration subsequently authorized a minimal harness repair and one bounded
continuation, retaining the original fixed input, production source, evidence
and job reservation. The continuation must bind the original result hash and
consume its own single-use claim. Across both attempts, the single empty preload
is already spent: no further preload is permitted; at most one generation and
one execute remain. A generation failure or unknown outcome stops the run
without retry. This authorizes no prompt/parameter change or F0 experiment.

At the first QA checkpoint, no continuation result was available. The subsequent
review below preserves the original harness failure and its consumed preload.

## Continuation: one fixed historical-record case passes

Production source remains `6bab96062e357b34fc2a7326678ee4b6bce515f2`. Execution
repository HEAD was `f58c3c3`; the exact controller/corrected-flow bytes were
subsequently committed in `149ba2671f159377d6a0856744dd8028af9f0474`. QA verified
both files against the pre-execution manifest hashes and verified that this
commit changes no `backend/src` or `api` files relative to `6bab960`. The
continuation controller verifies that the corrected flow differs from the frozen
original only by deleting `app.listeningOrigin=origin;`. Its generated runner
seeds the original cumulative counts, rejects a nonresident model instead of
preloading, and binds the original result/reservation. QA verified the exact
controller, generated-runner and manifest hashes, fixed input, original records
and both retained single-use claims. No production prompt, serializer, fixture
or parameter changed.

The continuation ran from `2026-10-25T08:55:08.628Z` to
`08:55:17.473Z`. The model was already resident. Across both attempts there was
**one empty preload, one generation and one execute**; the continuation made
**zero new preloads**. There was one generation reservation and one prepare.
The complete response was HTTP 200, matching `qwen3.5:9b`, `done:true` and
`done_reason:stop`. The recorded lane was settled, with no unknown outcome.

QA verified all 20 post-exit index entries. The continuation's pre-exit index
has the same logging-order issue as the first attempt: only `execution.log` is
stale because the child writes its summary after indexing. That original index
remains unchanged; the final post-exit index correctly binds the stable log,
nested index and every request/response/canonical artifact.

The serializer-observed request bytes exactly equal the dispatched request.
The request contains the production system prompt and one real current user
message, with exactly the approved selected Note/Mood/Activity/time quotation.
It contains no owner, Auth or Check-in ID. Prepare 201, explicit source review,
selection revision/keys and execute 200 all bind to the same operation/topic.
The complete raw model message equals both HTTP assistant text and stored A.
Canonical U/A IDs, sequences, accepted/reply linkage and the `source_use_v2`
receipt match; the receipt binds the selected source version without copying
the Note quotation. QA made no new model or Emulator call to check these files.

The complete model answer was:

> 根据您提供的附加签到记录：记录时间为 2026-10-23T06:00:00.000Z，原话内容是“2026年10月23日下午，我完成了20分钟散步，记下心情放松。”，当时记录的 Mood 为“放松”，Activity 为“散步”。

QA independently applied the original five criteria without changing them:

| Original criterion | Verdict and evidence |
| --- | --- |
| Chinese response answers the latest request | Pass: the Chinese answer addresses the attached record and all four requested fields. |
| Correct original UTC time | Pass: exact `2026-10-23T06:00:00.000Z`; no substitution of execution time or another day. |
| Faithful Note and stored Mood/Activity | Pass: exact Note quotation and both stored labels. The quoted first person remains the source's words. |
| Historical framing without assuming today's state | Pass: explicitly refers to what was recorded then; it asserts no current mood or repeated activity. |
| No extra facts/actions/IDs/location/weather | Pass: the full answer adds no action, diagnosis, attendance, source ID, location, weather, saving or scheduling claim. |

The bounded semantic result is **1 Pass / 0 Fail / 0 unreviewed output** for
this one fixed historical Check-in restatement. This is not a broad F1 semantic
acceptance rate or proof of multi-source/history/conflict/device behavior.
The original harness attempt remains **Not Run** for generation/semantics;
the old local24 **12 Pass / 12 Fail** and F0 **5 Pass / 3 Fail** remain unchanged.
The model reported 400 input tokens, 102 output tokens and 6.093 seconds total
model duration; these are not measured App interaction latency or device proof.

The continuation result records own-fixture cleanup, matching runtime/checkpoint
restoration and a settled lane; Context returned its service slots. QA reviewed
the recorded result and cleanup source rather than performing a new live
readback. Original failure/result/claims were preserved. No retry followed.

Private continuation artifacts are in `continuation-1/` under the original run
directory. The independent `qa-continuation-audit.json` and reviewed controller
copy are in the QA directory named above.

| Artifact | SHA-256 |
| --- | --- |
| Continuation manifest | `e20935ecf0680f8b1733d36265677816cab87a110c03fa7c3c6b6c53c1f5b72b` |
| Reviewed continuation controller | `074bab518522e3c1cf479f1e28527999466da76d070b6377f2d820542e8451a0` |
| Frozen execution runner | `10c7a26d6af4dec84d161a1ff120e849ddf703ebb15150e8e2e035ea97153259` |
| Post-exit artifact index | `e70e590aad4a634f228d0ceeb703a22d9948ea63fcb719e9438949b88256d76a` |
| Complete production model request | `401164e8e5a02e3126ff7b52ba04df22bf8e3f1887950c82d126819a65adb6dd` |
| Complete raw model response | `07a07161c12ad62a84f219d433bf61e06a34dbf46e80c9c432cd2b2f6fa300c2` |
| Canonical projection | `15e9f865e4d3bf346bdc758a32e22776e21cda45fb251b38856a6162811d85ac` |
| Continuation result | `9c739b8ad8bfa6ab37224ef8be7455b89d79bbe26c87a2dec68ed20776d472a5` |
| Independent continuation QA audit | `7d3b7279c6e5bd55358239781854f5622abc9051bb28bd86a104d5c73140a77b` |
