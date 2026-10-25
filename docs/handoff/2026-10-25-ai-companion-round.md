# AI companion round — common baseline and ownership

Integration: `01a1719f-a6aa-75e0-9ad4-f3724777fa95`,
branch `souma/ai-companion-integration-20261025`.
Authority: [LI's bounded round request](../decisions/2026-10-25-li-ai-companion-round.md).
The local launch roster and exact prompts are under
`/home/miku/.local/state/enmori-ai-companion-20261025/`.

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
