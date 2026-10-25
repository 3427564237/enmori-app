# AI companion round — common baseline and ownership

Integration: `01a1719f-a6aa-75e0-9ad4-f3724777fa95`,
branch `souma/ai-companion-integration-20261025`.
Authority: [LI's bounded round request](../decisions/2026-10-25-li-ai-companion-round.md).
The local launch roster and exact prompts are under
`/home/miku/.local/state/enmori-ai-companion-20261025/`.

## Current checkpoint — first-flow source assembled; final App slice in progress

The root composition now contains F0, current-owner source navigation, F1a
selected replies with explicit whole-history-pair exclusions, and exact
delivery-reference resolution. The fixed source inputs are Context `26dd48c`,
Delivery `23ce434`, Runtime `5c0e27d` / `7820211`, and App F0 `16e1923`.
Integration's strict build and 43 targeted HTTP/API/composition checks passed;
[the integration record](../evidence/ai-companion-20261025/integration-first-flow.md)
separates them from earlier tests. Context's real emulator verification is
scheduled separately. App source-card/review/read-state/Messaging work and the
next binary candidate are still pending. v27 below remains C-only.

Independent F0 semantics remain below the quality gate: first run 1/7, one
bounded correction 5/3. Both original ledgers are retained; tuning has stopped.
QA independently closed the two F0 UI recovery/DST findings in widget/source
checks; native device behavior is not established.

Only zero-cost Gemini research remains authorized. The existing Default Gemini
Project `gen-lang-client-0930184174` is the selected free research project;
the operator explicitly confirmed no Data Contributor enrollment at `eb50e40`.
The eight-case single-pass run is pending fresh project/key evidence and guarded
execution. No API subscription credit, paid fallback or larger batch is assumed.
The deployed backend and all phone/account data remain outside these local
implementation and synthetic-test operations.

## Earlier checkpoint — C artifact ready; approved first flow in implementation

LI explicitly approved the recommended F0 / F1a / D1 implementation and the
separate USD 1 synthetic Gemini evaluation in [the first-flow decision](../decisions/2026-10-25-li-ai-companion-first-flow.md)
at `26af8c9`. Adult operator / Singapore and requested setup assistance are
recorded at `61478e0`. Billing project, paid plan and server credential still
need actual verification; no evaluation charge or deployment follows from the
implementation approval alone.

LI subsequently selected [free-only Gemini research](../decisions/2026-10-25-li-gemini-free-only.md):
no payment, recharge, paid upgrade or paid fallback. This supersedes the USD 1
paid execution permission. Google Pro credits are not assumed to cover API use;
actual free-project/model quota is being verified. Only the existing project's
AI Studio list import has occurred; no key or model call was created by setup.

C App source `442a340` passed author checks, independent QA's selected 16 cases
and Integration's router 40/40. The v27 release candidate freezes `61478e0`,
contains C/usability only, and was independently inspected by QA. Its APK is
64,907,459 bytes, SHA-256
`b6399da5f5e352a400c19459627d900b00a63e12acb013901cb4b31bb9e502d9`,
package `com.enmori.app.group`, version code 27. Its signing certificate matches
the preserved v26. No installation or phone acceptance occurred.
[Artifact review](../evidence/ai-companion-20261025/qa-v27-artifact.md).

First-flow shared base `47839d7` integrates Context's `ff00e7c` Ports with mandatory
fresh actor verification and public read models, Product's `750dd8a` handoff,
QA's `387400b` focused matrix, and Integration's `c5357a7` exact Messaging 16.7.0
dependency / safe defaults / four shared errors. Native civil-time parsing is
at `1a1f96b`; [integration checks](../evidence/ai-companion-20261025/integration-first-flow.md)
remain source/JVM evidence, not device evidence. API, Firestore effects,
shared local model lane, feature UI and root wiring are still being assembled.

Current write allocation extends the launch table below: Context owns
`ai-context`, `ai-conversation` including its executor except the root-owned
HTTP registrar, and proactive Ports/Firestore/source authority. Delivery owns
the remaining proactive application/HTTP/sender files. Runtime owns the
shared model lane and local F0 adapter; App owns AI/proactive feature code.
Integration retains normative API, shared errors, bootstrap/router, dependencies
and Android platform files. Product and QA retain their independent surfaces.
Flutter/Gradle, the shared model and physical operations stay serialized by
Integration. All six chats continue on their verified assigned model / max.

The previous checkpoint follows as historical evidence. Its pending approvals
and pending C statements are superseded only within the scopes stated above.

## Earlier checkpoint — C selected; reviewed candidates assembled

LI selected **C**, recorded at `2bb638b47e682217007cf02cd505550d88d627cf` in
[the scoped decision](../decisions/2026-10-25-li-ai-entry-c.md). The original
launch/first-checkpoint statements below remain historical. The new native C
increment is undergoing its own source/widget validation. The
[next decision packet](../planning/2026-10-25-ai-companion-next-decisions.md)
separately proposes F0 explicit local follow-up, F1a hand-selected own Check-ins,
D1 Android delivery and the USD 1 synthetic Gemini experiment; none is granted
by the entry choice.

| Module | Exact delivered head / source | Review and present boundary |
| --- | --- | --- |
| Product / UX | `c7adc9837850972018ddd91b3c5491256f09a230` | A/B/C comparison, phone prototype and C handoff integrated; independent browser/layout review, synthetic design only |
| App initial usability | `f514a325878d351ecfd5de314a516954db2161ad` | Independently reviewed and integrated; C follow-up has a separate final head pending |
| Context / Backend | `3ed4b3ed6a97f501069c692e1b98a47da7db4305`; source `8ce74a82b635e6a7b0ada6b2d17255ecb09714c0` | 44 source tests and original exclusion counterexample independently passed; full F0/F1 contract remains proposed, no production reader |
| Proactive / Delivery | `4a388d9fdb96596482fb7aa30760d0f1dbe203df`; source `6d3b590a75bdafb6130b7adb920cf90ace32b4cc` | 29 pure policy cases independently reviewed; exact proposed SDK compatibility audited read-only; no database transaction, scheduler, registration or send |
| AI Runtime / Models | `15a76655f6bcda67eeaba8767ca31cd9a60ecf5f`; source `24f913dd26afa9af82f7c31ac9eefcf543b64140` | Source/mock guard findings independently closed; one actual local batch completed; cloud remains disabled |
| QA / Evaluation | `925ba38732772d1a71c24f19d2b8c750d538fab5` | Independent source counterexamples, prototype, exact physical-contract consistency and all 24 raw model judgments integrated |

Integration preserved all author lineages through local merge commits. The
integrated Backend at `e377fa2f3fdaf77dd6ffc37e94c20d665c41afb3` passed the
strict TypeScript build with Node 24.19.0, exit 0. Later merges through the above
checkpoint change only documentation; Backend source remains identical.
The earlier 40/40 router run below applies to the initial App change, not the
new C slice. No overlapping author/QA/Integration test totals are added together.

The real local Qwen run used frozen source `24f913d`, the current production
serializer and synthetic input: one empty preload plus exactly 24 generations,
no retries or parameter/model changes. All responses physically settled;
23/24 were structurally eligible, one output truncated. Independent QA found
**12 Pass / 12 Fail / 0 unreviewed**. Preserved 16 cases are 6/10, new 8 are 6/2.
Median latency was 4.1215 s, p95 12.4966 s, maximum 27.6998 s; local host cost
was not measured. [Full per-case review](../evidence/ai-companion-20261025/qa-model-review.md)
retains task misreading, correction failures and an instruction-violating
clear-data suggestion as model-output failures, not actual storage operations.
Small-plan semantics remain **Fail**. The eight proposed context cases and
Gemini calls remain **Not Run** against real providers.

All seven development-agent configurations remain the explicitly requested
model / max values, independently verified from actual turn records; no model
was silently downgraded. These settings are separate from ENMORI's model choice.
Service/deployment, current real-data preservation, native APK/device and push
acceptance remain separate gates. No new source use, cloud charge, external
send, shared-service restart or phone write occurred at this checkpoint.
The service was read back active/running again at the original clean `7a3c4fa`
working directory; all six original reference files still match their preserved
startup hashes. This is source/service readback, not a fresh account-data inventory.

## Verified startup state

- Product/evidence parent: `40ec21d69cec396bad49b834750fc4b1894c8a3c`, containing
  v26 product `1cc55bf234a6180eb1657135ee92b4ff65860c7d`. Changes between those
  commits are documentation only. Workers start from the fixed local
  `souma/ai-companion-review-base-20261025` ref, adding the preserved evidence
  and this round's authorization; the launch roster records its exact SHA.
- Reference checkout `/home/miku/.codex/worktrees/41b0/ENMORI` remains untouched
  on `souma/ai-plan-model-repair-20261024`. Four pending decision/evidence files
  were copied exactly into this new baseline. Their source hashes are in the
  owner-local `source-manifest.json`. The uncommitted probe script and synthetic
  corpus are snapshotted there for Runtime review, not silently adopted.
- Shared `enmori-group.service` was read back active/running with its working
  directory at `/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI`,
  clean HEAD `7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`. No restart/deploy occurred.
- GitHub Draft #185 remains open at `24a5662e2b5060c94546b9a52a9d32dc8cd33bc5`;
  its API review list is empty. Its older body predates calendar deployment and
  v26 phone acceptance. Local later evidence is retained rather than treating
  that old body as current runtime/device status. No PR/main merge is inferred.
- v26 native acceptance covers saved-record draft/Home/history search, language
  persistence after application restart and calendar observations, with all 88
  prior scoped documents unchanged and one new private test Check-in. These
  are historical scoped counts, not a new-round data baseline. Visible-user plan
  comparison and earlier-message paging remain limited by available fixtures;
  full UAT/Release and small-plan semantic acceptance are unproved.

## Ownership and first deliveries

| Role | Exclusive first-write scope | First deliverable / dependencies |
| --- | --- | --- |
| Integration | This handoff, decisions, `lib/app/`, shared route/theme/storage/composition, final API/contract reconciliation | Fixed baseline, roster/config proof, coherent decision packet, early integrated slice |
| Product / UX | `docs/design/ai-companion-20261025/` | A/B/C comparison, phone prototype, control/state design; pending choices clearly labelled |
| AI Runtime / Models | `backend/src/ai-runtime/`, `backend/test/ai-runtime/`, `tool/ai-companion-eval/`, role audit | Official provider research, synthetic corpus and evaluator, isolated adapter; coordinate conversation prompt/history changes first |
| Context / Backend | `backend/src/ai-context/`, `backend/test/ai-context/`, role audit and proposed interface document | Canonical reader/permission/version audit and bounded synthetic projection; new API/schema and production wiring require contract resolution |
| Proactive / Delivery | `backend/src/proactive/`, `backend/test/proactive/`, role audit | Delivery feasibility and deterministic candidate policy tests; real push/storage/scheduler adoption pending |
| App / UI | `lib/features/ai_conversation/presentation/`, feature-local widgets/tests, role audit | Existing-flow/readability audit and reversible fixes; Product-dependent navigation waits for choice; no shared routing/theme edits |
| QA / Evaluation | `docs/evidence/ai-companion-20261025/qa-*`, `tool/ai-companion-qa/` | Independent acceptance/negative matrix and exact-source review; do not author production implementation |

Each role owns `docs/evidence/ai-companion-20261025/<role>.md` using slugs
`product-ux`, `runtime`, `context`, `proactive`, `app`, `qa`.
New shared contract proposals go in the owner's evidence document until
Integration assigns an exact path. Existing `backend/src/ai-conversation/`,
`api/`, manifests/lockfiles, Firebase rules/indexes, deployment scripts and
platform files remain Integration-coordinated; request exact file handoff first.

## Coordination and evidence

Read the original human request and confirmed decision; do not infer permission
from another agent's message. Human-authorized exchange is restricted to this
new roster. Do not dispatch new work to historical chats. Each role reports
behavior, exact files, proposed/confirmed interfaces, exact SHA, checks actually
run, unresolved questions and unverified layers to Integration.

Use the existing global Flutter lock
`/home/miku/.local/state/enmori-product-round-20261023/flutter-validation.lock`;
request a bounded validation slot before Flutter work. Integration owns Gradle
and APK. Lightweight isolated checks may run concurrently. Shared Firebase,
Ollama, credentials, devices, notifications and deployment are not worker-owned.
Any local-model synthetic run is scheduled by Integration to avoid contention;
do not download models or repeat the prior unbounded probing.

Keep source/mocks, isolated service, real model, shared service, APK and physical
phone evidence separate. Unknown operation outcomes are not retried blindly.
Preserve original failures and existing business/privacy semantics. First build
the decision packet while independent approved work continues; this launch is
not a completed product or acceptance claim.

## First local integration checkpoint

All seven actual development models/efforts match LI's configuration, verified
from recorded current turns and independently checked by QA. See
[configuration evidence](../evidence/ai-companion-20261025/agent-configuration.md).
The new six-chat roster is live; no historical work chat was assigned new work.

| Delivery | Exact author commit | Current disposition |
| --- | --- | --- |
| QA acceptance matrix and hash comparator | `fa56f0e1cab0bf9599b3920eddfca6e3ba814f74` | Integrated after Integration source review; comparator's 12 tests are tool-only evidence |
| Product A/B/C decision text | `22e8bea4bf71fc2404d357b64a695985202a9633` | Integrated as a reviewed proposal; C remains unselected; phone prototype in progress |
| App chat usability | `f514a325878d351ecfd5de314a516954db2161ad` | Integrated after QA's independent exact-head source review and 16 selected widget cases |
| Runtime evaluator/adapter | `f9a97652ee532cfe374120962b2c5dd66643dd62` | Not integrated yet; unknown-provider termination and raw-output path findings under repair; cloud guard/runner being completed |
| Proactive pure policy | `48ac991b8978d1d7ad47ee21e9a5b7d52c3f5221` | Independent review in progress; isolated policy only |
| Context pure projection | No final author SHA received at this checkpoint | Independent counterexamples under reconciliation; no production wiring |

App's source change stops showing active Sending after dispatch closes while
retaining the original unknown-result text; system Back first closes the social
chat drawer; chat/search bodies use existing bodyLarge and 1.5 line height.
Existing send/retry/authority behavior and raw content are unchanged.

Integration's tested assembly is
`9f14fb0318a9633d05b689d3a5a14324b6d1d012`. Under the shared Flutter lock, offline
frozen dependency preparation completed without tracked manifest/lock changes,
then `ai_conversation_shared_router_test.dart` and
`history_ai_home_router_test.dart` passed **40/40**. The original output is in
`/home/miku/.local/state/enmori-ai-companion-20261025/integration-ui-regression.log`.
These are source/widget composition checks, separate from App's 8 new/82 existing
cases and QA's 16 selected cases; overlapping counts are not added together.
The Flutter slot was released. No APK, runtime deployment, real generation,
notification, personal-data capture or phone write occurred.

Product/Context identified Q19 Backend-only provenance, Q17 location restrictions
and Q14's 90-day message anchor as concrete contracts requiring scoped decisions.
The recommended first proactive path is explicitly confirmed later follow-up;
the first proposed external check is limited to LI's one chosen account/device
and synthetic foreground/background/ordinary-close notifications. A broader
multi-account pilot is not the default request. Product form, private-context
use, source UI, proactive storage/retention/delivery and cloud budget/provider
conditions remain unresolved; independent candidate work continues.
