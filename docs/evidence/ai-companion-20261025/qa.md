# QA / Evaluation — independent first checkpoint

Date: 25 October 2026, Asia/Singapore. QA workspace:
`/home/miku/.codex/worktrees/30e0/ENMORI`; branch
`souma/ai-companion-qa-20261025`; inspected product baseline
`b81d93ffd219011dbc0918daca5c82fd83e7ba4a`.

This is an independent audit and preparation checkpoint, not integrated-product
acceptance. No production implementation was authored by QA. The executable
tool below tests only a local hash comparison, not application behavior.

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
- `git diff --check` completed exit 0. No Flutter, Gradle, APK, model, emulator,
  cloud, notification or physical-device execution was performed.

## Coordination and next review boundaries

Priority counterexamples were sent directly to all five authorized peers and
Integration. Runtime is preparing independent-review-bound synthetic results;
Context/Proactive are preparing isolated proposals and deterministic tests; App
reported the existing unknown-outgoing label defect and owns its repair.
QA will review their exact commits and choose bounded tests independently.

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
