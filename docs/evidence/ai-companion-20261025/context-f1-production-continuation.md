# F1 production chain — one authorized continuation

25 October 2026, 16:55 Asia/Singapore. Production source remains
`6bab96062e357b34fc2a7326678ee4b6bce515f2`; all 243 TypeScript files and their
243 compiled counterparts match the original frozen binding. The repository
head at execution was `f58c3c3`, which added only the earlier runner/evidence.
No production code, prompt, input, model or parameter changed.

Integration explicitly authorized a single continuation after verifying that
[the first runner failure](context-f1-production-once.md) had made zero generation,
prepare and execute attempts. The original manifest, job-wide reservation,
failure result and all raw artifacts remain unchanged. The only flow repair
removes the assignment to Fastify's getter-only `listeningOrigin`; the existing
getter supplies the listen URL. The continuation controller asserts this exact
one-deletion difference against the frozen failed source.

## Bound and actual path

The continuation manifest binds the original result SHA, original reservation
SHA, fixed input, source/compiled binding and repair diff. A separate job-wide
exclusive continuation reservation is single-use and cannot be reset by choosing
a new directory. Counts start from the original `preload:1,generation:0,execute:0`;
a nonresident model stops the continuation. No new preload is allowed.

A read-only residency check found the already loaded `qwen3.5:9b`. The actual
path was `createIsolatedConversationComposition` → production `simpleChatGates`
and `LocalChatTransport` with shared `LocalModelLane` → temporary loopback HTTP
prepare → explicit source-card review → one execute → actual Auth/Firestore
Emulators and canonical U/A/source receipt. The fixed synthetic Note, Mood,
Activity and original `2026-10-23T06:00:00.000Z` were used unchanged.

The fetch tap copied the exact serialized request and original Ollama response
bytes without changing either. Observed serializer bytes equal the dispatched
body. The sole generation returned matching `model`, `done:true`,
`done_reason:stop`, and 102 evaluated output tokens. HTTP execute returned 200;
two canonical messages and a `source_use_v2` receipt were saved. The parsed
model message equals the persisted assistant text exactly.

**Cumulative totals across the failure and continuation:** one empty preload,
one generation reservation/POST, one prepare and one execute. Zero generation
retries, new preloads, F0 cases, FCM calls or real-account reads. The continuation
exited 0. The original runner failure remains a separate stopped attempt; it is
not removed from the record or counted as a model result.

The original response says, in Chinese, that the record's UTC time was
`2026-10-23T06:00:00.000Z`, quotes the fixed Note, and states that the recorded
Mood was `放松` and Activity `散步`. This paragraph describes the output only.
The runner marks semantics `pending_independent_qa`; one successful protocol
and storage case does not establish general model quality or change earlier
F0 semantic failures.

## Evidence and cleanup

Private continuation directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/context-f1-production-6bab960-once/continuation-1/`.

| Artifact | SHA-256 |
| --- | --- |
| Continuation manifest | `e20935ecf0680f8b1733d36265677816cab87a110c03fa7c3c6b6c53c1f5b72b` |
| Production serialized request | `401164e8e5a02e3126ff7b52ba04df22bf8e3f1887950c82d126819a65adb6dd` |
| Raw Ollama response | `07a07161c12ad62a84f219d433bf61e06a34dbf46e80c9c432cd2b2f6fa300c2` |
| Canonical projection | `15e9f865e4d3bf346bdc758a32e22776e21cda45fb251b38856a6162811d85ac` |
| Cumulative result | `9c739b8ad8bfa6ab37224ef8be7455b89d79bbe26c87a2dec68ed20776d472a5` |
| Post-exit index, all 20 entries verified | `e70e590aad4a634f228d0ceeb703a22d9948ea63fcb719e9438949b88256d76a` |

The post-exit index binds the stable execution log as well as raw requests,
responses, review, HTTP projection, canonical projection and result. The earlier
index timing issue is retained in the original attempt and is not hidden.
Auth tokens/passwords and the operation key remain redacted or memory-only.

The model lane settled with `pending:false,outcomeUnknown:false`. Only this
synthetic owner's Auth UID and documents were removed. Matching runtime and
cleanup-checkpoint metadata were restored. The private listener closed; existing
services were not stopped and the project was not cleared. Both exclusive slots
were explicitly returned to Integration before documentation work.

This is one author production-serializer/local-model/HTTP/storage proof.
Independent semantic review is QA's next evidence layer. App/device, notification,
UAT, deployment and Release acceptance are not supplied by it. All original
limits are now consumed; this runner is not authorization for another run.
