# QA / Evaluation — independent evidence index

Date: 25 October 2026, Asia/Singapore. QA workspace:
`/home/miku/.codex/worktrees/30e0/ENMORI`; branch
`souma/ai-companion-qa-20261025`; inspected product baseline
`b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.

This is an independent audit, not integrated-product acceptance. The initial
baseline checkpoint is preserved below. Subsequent exact-head source reviews,
executed checks and unresolved findings are in [qa-review.md](qa-review.md).
No production implementation was authored by QA.

Latest independent first-flow checks: [approved prototype and visibility repair](qa-approved-prototype.md)
and [shared local lane / old serializer compatibility](qa-runtime-first-flow.md).
These add browser and fake-transport evidence only; integrated F0/F1a, real
Firestore, notification and device acceptance remain separate gates.

The subsequent [Context F0 source/isolated Emulator review](qa-context-first-flow-emulator.md)
adds 10 independent actual Admin/Auth Emulator groups and four separate timestamp
fake tests. It does not establish production Firestore, complete worker/HTTP
composition, notification delivery or device acceptance.

The [first actual F0 semantic review](qa-f0-semantic-review.md) is **1 Pass /
7 Fail / 0 unreviewed**, despite eight protocol-eligible outputs. Its semantic
gate remains Fail. It is separate from the unchanged local24 12/12 result.

The [single F0 prompt comparison](qa-f0-semantic-comparison.md) is **5 Pass /
3 Fail / 0 unreviewed** on the same eight cases and unchanged criteria. The
original 1/7 is preserved separately; F0 semantic acceptance remains Fail.

The [Delivery recovery review](qa-delivery-recovery.md) closes the independently
reproduced reservation leak at `ca50765` using the original actual-class fake
counterexample, 24 targeted regressions and a separate unknown-physical-outcome
check. Earlier 25 route/loopback sender cases are separately recorded. The
[composed App review](qa-app-first-flow.md) adds eight independent widget/route
checks at `92c6342`, including the two prerequisite-read recovery cases. These
are not notification or device acceptance.

The [selected-context review](qa-f1-selected-context.md) preserves the original
`362d8cb` history-exclusion recovery gap and its `26dd48c` source/fake closure.
At the latter head, 21 selected-reply and five prepared-selection checks passed
independently. HTTP/UI/Emulator composition remains a separate gate.

The subsequent [actual composed first-flow audit](qa-composed-first-flow.md)
passed five independent groups at `d992ea9` using real bootstrap factories,
HTTP handlers and isolated Auth/Firestore Emulator, with four fake model calls
and no real model or FCM call. It also records nine focused source/fake tests,
24 unchanged old request captures and the four-test `8b2e746` delegation repair.
Synthetic data was cleaned and the Emulator slot returned. UI, real-model,
notification and physical-device gates remain distinct.

The [free-eight cloud interruption audit](qa-cloud-interruption.md) verifies
the remaining files at `0c436bd`: one confirmed count response, one consumed
generation reservation, actual generation dispatch 0..1 unknown, no generated
output and seven cases unreached. It cannot be scored and was not retried.

The [bounded F1 real-model attempt ledger](qa-f1-production-attempts.md) preserves
the first `6bab960` harness failure: one completed empty preload, zero generation,
prepare or execute. QA verified the recorded artifacts and independently
reproduced the getter error without network/listener/model activity. F1 real-model
semantics were Not Run for that first attempt. The separate authorized continuation
now has one actual HTTP/canonical/model output independently graded **1 Pass** on
the original five criteria for one historical Check-in restatement. Cumulative
preload/generation/execute are each one; the original failure and all other
semantic ledgers remain unchanged. This is not broad F1 or device acceptance.

The [selected-context ledger](qa-f1-selected-context.md) also records the later
`d1dece9` HTTP history correction: legal late retries can produce interleaved
user sequences while assistant sequences stay ascending. Exact-head strict
compilation and four focused HTTP tests passed independently with fetch blocked.
The same ledger records an independent **source-only** review of client Domain
`090e996` and selected wire `a7a288f`: no actionable finding, with compilation,
the eight new wire tests and final F1 UI execution not claimed by QA.

Latest checkpoints: [local24 semantic review](qa-model-review.md) and
[approved C source/widget review](qa-c-entry-review.md), with
[proposed F0/F1 contract consistency](qa-contract-review.md). Local24 is
**12 Pass / 12 Fail / 0 unreviewed**; the small-plan gate remains Fail despite
23 protocol-eligible responses. The earlier Context/Runtime candidate findings
have independently checked fixes in the
[repair and prototype ledger](qa-review-followup.md). LI chose entry C; that
scope does not approve new context/cloud/proactive capabilities. C's exact App
head `442a340` has **16/16 independent widget checks passed**; runtime/device
gates remain separate. The later Admin sender-retry finding and its corrected
Delivery `b8b8532` / Context `98447a9` proposal are preserved in the contract
ledger; actual transport behavior remains unverified.

Subsequent authority checkpoint: QA directly verified LI's new replies and the
durable [first-flow scope record](qa-approved-scope.md) at `26af8c9`. F0/F1a/D1
implementation and the conditioned synthetic cloud research are now authorized
within that record; historical Proposed labels are retained. Real deployment,
data writes, registrations, sends and phone operations remain separately gated.

First implementation checkpoints: [F0 interface and acceptance cases](qa-f0-first-flow.md)
after the normal `ce6782c` merge, and [v27 artifact readback](qa-v27-artifact.md).
The actual v27 hash/signature/metadata match its manifest; no device operation was
performed. F0 shared identity/model-lane and sender cases remain at source review
with integrated execution Not Run.

The [shared dependency/failure and native civil-time review](qa-shared-native-review.md)
is bound to `c5357a7` / `1a1f96b`. All 131 existing lock entries are unchanged;
new native time conversion explicitly returns unavailable below API 26. This
checkpoint is source review, with no independent native execution by QA.

## Authority and baseline readback

Read the original LI request directly at
`/home/miku/.codex/attachments/864a1a99-27a3-4629-baf8-80baf2346364/已粘贴的文本.txt`,
the round decision/handoff, repository guardrails/routing, client/backend
architecture, 19/24 October AI decisions, Q14/Q19, EP1, preserved v26 evidence
and the second product-round handoff. The original human authorization permits
this roster to exchange tasks/interfaces/reviews/results. It does not approve
product A/B/C, broader production data use, a cloud provider/budget, notification
infrastructure, new persistence/API contracts or new device writes.

| Check independently performed | Observation |
| --- | --- |
| Initial `pwd`, HEAD, branch and status | Exact new worktree; detached clean `b81d93f`, then assigned QA branch created. Existing worktree attached; no second checkout created. |
| `git merge-base --is-ancestor` for `1cc55bf...` and `40ec21d...` | Both exit 0. Diff from v26 product to baseline contains documentation only. |
| Six preserved-input SHA-256 comparisons | Every original reference file and saved copy matches `source-manifest.json`; four copied baseline documents also match. Reference worktree unchanged by QA. |
| Seven role configuration records | Every exact roster `turnId` matches actual rollout `turn_context` model/effort. QA is `gpt-6-astra` / `max`, turn `01a171a5-919c-7321-9d22-7f5a5b653b74`. Other roles match their requested Astra/Sol `max` values. |
| Shared service read-only state | `enmori-group.service` active/running; configured checkout `/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI` has clean HEAD `7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`. No restart or generation. |
| Integration configuration report | Startup/configuration and preservation claims have supporting readback and explicitly exclude product, cloud, delivery and phone acceptance. |

Initial path-discovery attempts looked for `backend/package.json` and newer
evidence in the older deployed checkout; both returned file-not-found. The
actual manifest is repository-root `package.json`, and preserved evidence is in
the new baseline. Those failed reads changed no files or service state.

## Current behavior and retained historical evidence

Baseline `backend/src/ai-runtime/infrastructure/local-chat-transport.ts` requires
empty `checkIns`, sends only projected Persona/current message/approved history,
uses loopback Ollama, and has no cloud fallback. Its unknown provider outcome
keeps the single lane occupied instead of replaying. Source inspection establishes
these boundaries, not a fresh runtime or semantic result.

The application checkpoint revalidates original/fresh authority, source context
and exact history before work continues. Existing context-reader source still
contains immutable-Note prerequisites for the older source-bound path; the
19 October decision explicitly forbids falsely declaring editable Notes
immutable. Broader source context requires the proposed current-version contract
and explicit composition, not toggling old prerequisites true.

EP1 uses `none`, `interested`, `going`; it has no attended fact. Missing source
display does not erase participation, and unknown mutation results first read
instead of automatically replaying. These distinctions are in the QA cases.

The v26 signed native evidence remains at product `1cc55bf...` and its named APK.
It records 88 existing documents unchanged and one intentional synthetic addition
within its historical scope. It is not today's inventory. Earlier-message
pagination, visible-user comparison, cross-account/cross-network, TalkBack, iOS
and full UAT were not established by that run. QA did not operate that phone.

### Independent read of retained synthetic model output

Read `/home/miku/.local/state/enmori-calendar-deploy-9b-20261024/boundary-goals.json`
directly, SHA-256
`50acbc4bd3dd9eca3f61a059ab0c6991f7d2996a1e611e27cb1cfb026a50a8ee`.
The four native-schema inputs and complete raw outputs were inspected, alongside
the original 16-case corpus preserved with SHA-256
`837d0a2076e86736e9e46f9d950ff0bcaaec1e1f10c825bf6aee9476e281311b`.
No model was called in this QA run.

| Historical case | Independent observation | Bounded verdict |
| --- | --- | --- |
| `reported-english-goal-chinese-reply` | Output asks readiness for V25 device verification and focuses the break on the marker. Native elapsed 4051 ms. | Fail: label becomes work; rest goal not followed. |
| `chinese-break-with-label` | Output assumes Maple42 testing happened and asks the user to recall moments from it. Native elapsed 8920 ms. | Fail: unsupported personal history and task carryover despite valid JSON. |
| `correct-previous-misreading` | English reply recalls Cedar25 and gives three rest steps totalling 15 minutes. Native elapsed 2916 ms. | This historical control meets the supplied criterion; it does not rescue the failed original cases. |
| `actual-device-test-goal` | Output supplies a language/reopen checklist without claiming completion or modifying data. Native elapsed 10699 ms. | This historical control follows the actual testing goal; not a new app/device result. |

The two failures were provider-complete, `pending:false`, `outcomeUnknown:false`.
This demonstrates why transport completion, schema correctness and selected good
replies cannot establish semantic acceptance. The 58 earlier probes and 16
boundary comparisons stay intact; later local-model experiments are not presumed
successful. New candidate evaluation requires its own full raw evidence.

## Delivered QA artifacts and actual checks

- [Acceptance matrix](qa-matrix.md): all eleven mandatory outcomes mapped to
  concrete counterexamples, required layers and Pass/Fail/Not Run rules. It also
  covers Persona deletion/snapshot semantics and proactive retention risk.
- `tool/ai-companion-qa/compare_scope.py`: dependency-free, read-only comparison
  of complete same-scope private hash manifests. It emits aggregate differences,
  catches equal-count replacement/content changes, rejects incomplete evidence,
  and accepts only explicitly enumerated exact additions. It cannot certify the
  collector's completeness or authorize a write.
- Command `python3 -m unittest discover -s tool/ai-companion-qa -p 'test_*.py' -v`
  completed with **12/12 tests passed**, exit 0. This verifies the QA comparator
  against preservation/unknown-evidence counterexamples only.
- At this initial checkpoint, `git diff --check` completed exit 0. No Flutter,
  Gradle, APK, model, emulator, cloud, notification or physical-device execution
  had been performed. Later source/widget execution is separately recorded in
  [the review ledger](qa-review.md).

## Coordination and next review boundaries

Priority counterexamples were sent directly to all five authorized peers and
Integration. App and Proactive now have bounded independent source results.
Context's exclusion-through-history counterexample and Runtime's evidence-path,
unknown-envelope and later cloud dispatch findings remain preserved as failures
at their original heads. Their revised-head closure is recorded separately in
[the follow-up ledger](qa-review-followup.md).

Product decision text at `22e8bea4bf71fc2404d357b64a695985202a9633` was read.
Its C recommendation is explicitly unselected; it retains conversation storage
and deletion/search capabilities and identifies Q19 source-display and Q14
retention changes as pending. No implementation acceptance follows from that
text. Phone prototype and cross-module interface review remain Not Run until
their exact artifacts arrive.

No push, PR, Issue mutation, main merge, deployment, credentials access, real-data
capture/write or device action was performed. Data-use, provider spending,
source UI, proactive storage/delivery and retention choices go through the one
Integration decision packet. Independent available work continues meanwhile.
