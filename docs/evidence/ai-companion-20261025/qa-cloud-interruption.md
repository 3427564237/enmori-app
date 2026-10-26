# QA — interrupted free-eight cloud evidence

25 October 2026. Independent artifact/source audit for Runtime
`0c436bddc147bf7a0a761b37af3f533ac34b595d`. This is an incomplete run with
**no generated response to evaluate**, not a semantic Pass or Fail result.
QA made no provider request, read no credential value and did not resume the run.

## Authority and bounded outcome

Integration's durable free-only decision, including LI's explicit no-Contributor
enrollment assertion at `eb50e4098e4193eede7e078283aa95287c6f1702`, superseded
only the earlier paid execution choice. The authorized run was the named eight
synthetic cases once, at most eight count and eight generation requests, zero
new spending and no retry/model switch/paid fallback. QA read that exact durable
decision. The operator's Free/billing-disabled/restricted-key observations are
bound into the authorization; QA did not repeat those account UI checks or
infer API credit from a subscription.

| Evidence | Bounded finding |
| --- | --- |
| First count response | One persisted HTTP 200 response, 189 counted input tokens, 203.991245 ms. Decoded fields match the persisted raw body. |
| First generation intent | One durable reservation with a request hash matching the complete serialized request. The runner persists it before pacing and calling generation. It is not proof the provider received a generation request. |
| Actual generation dispatch | **0..1 unknown**. No durable dispatch marker or generated response closes the uncertainty. The reservation remains consumed. |
| Generated output and later cases | Zero saved generated responses; seven cases never reached. No final runner report or stop file exists. Semantic scoring is unavailable. |
| Interruption | Runtime's operator record reports exit 143. Its separate command-lifecycle extract reports 85.469 seconds, before the source's 120-second receive-abort deadline. The sender, process layer and cause of the signal remain unknown. |
| Cost and usage | Zero-dollar authorization/recorded Free and disabled-billing state are not an invoice or measured charge. Generation tokens and latency are unknown. |

The 45-second delivery eligibility limit is distinct from the 120-second receive
abort. The reviewed signal handler revokes through an AbortController; the
runner does not establish the origin of the reported SIGTERM. The operator
record and lifecycle extract are post-run diagnostic evidence, not a replacement
runner report or a confirmed provider timeout.

The single-use claim stays consumed and retained. Missing response evidence does
not authorize replay, a new grant/key, another provider or a second run. This
does not change the separate local24 or F0 semantic ledgers.

## Independent verification

QA verified all six artifact-index entries, the five original artifact hashes
listed by the interruption record, the 22 source/compiled bundle entries and
the bundle digest. Tracked bytes were checked against the exact Git head; the
corresponding compiled files were checked against their manifested bytes.
QA also verified the fixed eight-case selection, empty initial report rows,
count/raw-body consistency, complete generation-request hash, absence of output
and final report files, and recorded zero-spend/no-Contributor/billing-disabled
authorization fields. No private key was opened.

Source inspection of `tool/ai-companion-eval/cloud-runner.mjs` at this head
confirmed the order: persist count response; reserve generation; persist
generation intent; await pacing; await generation; persist generated response.
Neither confirmed zero dispatch nor one completed generation can be derived
from the remaining files. Do not label this **0 Pass / 8 Fail**, eight reviewed
outputs, a successful eight-case run or a model semantic failure.

Private original run:
`/home/miku/.local/state/enmori-ai-companion-20261025/runtime/gemini-free8-0c436bd/`.
Separate operator diagnostic: `runtime/gemini-free8-interruption-audit/`.
Independent audit: `qa-review/cloud-interruption-0c436bd/qa-audit.json` under
the same private base. Credential values and project configuration are not
copied into the repository.

| Artifact | SHA-256 |
| --- | --- |
| Artifact index | `651b2df04805f58e6f9b89cdf0b83ab058e783af30f6d0fc8a2b09de14aa1a29` |
| Source bundle | `8f3e405cb0fbed69c15eeb3cfe74483ad87c7f6334387b2dcf40d6b30fbb957f` |
| Initial cloud manifest | `066060c0106541f7dd6c8ef35b3e3a20b9d010939868923374e069f771b9c13b` |
| Source manifest | `6b1e57e0745e22f74583231edc47d0a1b5a87261ea57ae834d615196ed46e86a` |
| First count response | `6315d38cd06cd430c70d512279936fc19380770837cc27cb12fd71a511d03ba0` |
| First generation intent | `da92341548669de78c8c92c455df97ae83bd2ba4e20df34d2e54cc06ec6515f5` |
| Operator interruption record | `91b4d9bb91627db8cb5aa42dc5d83f65a33ee736641d876867938676449c0bbd` |
| Operator command-lifecycle extract | `4c422946abb97a094525976d9edc04816e09de7a33a58115b09021ca173a58f2` |
| Independent QA audit | `ba864ea791202f886e44d3c78bc262f47cd277a697b5f51e8321ece71d3d4a07` |
