# ENMORI Scrum Planning Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and validate a project-scoped `enmori-scrum-planning` Skill that plans, assigns, rebalances, and closes ENMORI's two-week five-person Sprints under the PM-approved workflow.

**Architecture:** Keep routing and non-negotiable safety boundaries in a short `SKILL.md`, with team policy, operating procedures, and output formats split into three linked references. The Skill works without GitHub/Notion connectors by producing local previews; when connectors exist, it still requires an exact preview and explicit PM approval before external writes.

**Tech Stack:** Codex Agent Skills Markdown/YAML, project-local `.agents/skills`, bundled `skill-creator` initializer and validator, Git.

**Spec:** `docs/superpowers/specs/2026-08-31-enmori-scrum-planning-skill-design.md`

## Global Constraints

- Name the Skill exactly `enmori-scrum-planning` and create it only under `.agents/skills/enmori-scrum-planning`.
- Preserve ENMORI's Scrum-inspired identity; do not claim strict Scrum compliance.
- Use the confirmed five-person roster, two-week cadence, 20h per member, and 100h total without automatically reserving a buffer.
- Count implementation, PM, meeting, review, testing, documentation, and rework hours inside the same capacity.
- Use Story Points `1, 2, 3, 5, 8`; split anything larger than 8 before Ready.
- Enforce one primary In Progress item per owner and a different reviewer for every task.
- Preserve JIN ZIHAN as quality lead without making JIN the sole author of tests.
- Preserve DU KUN as the required macOS/iOS device validator and expose the single-point dependency.
- Use GitHub Projects for execution state and Notion for meetings/decisions/review/retro; do not create a second task-status authority.
- Never mutate GitHub Projects or Notion before presenting the exact preview and obtaining explicit PM approval for that run.
- Do not add connector endpoints, credentials, external Skill copies, scripts, package dependencies, application architecture, or product behavior.
- Do not modify or commit the existing untracked `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SOURCE_MAP.md`, or `docs/OPEN_QUESTIONS.md` in this implementation.

---

### Task 1: Scaffold the project-authored Skill package

**Files:**
- Create: `.agents/skills/enmori-scrum-planning/SKILL.md`
- Create: `.agents/skills/enmori-scrum-planning/agents/openai.yaml`
- Create directory: `.agents/skills/enmori-scrum-planning/references/`

**Interfaces:**
- Consumes: the approved package structure in the design spec.
- Produces: a validator-compatible Skill skeleton for Tasks 2–4.

- [ ] **Step 1: Prove the target does not already exist**

Run:

```bash
test ! -e .agents/skills/enmori-scrum-planning
```

Expected: exit 0. If the path exists or is a symlink, stop and inspect it rather than initializing over it.

- [ ] **Step 2: Run the bundled initializer with only the required reference resource**

Run:

```bash
python /home/miku/.codex/skills/.system/skill-creator/scripts/init_skill.py enmori-scrum-planning \
  --path .agents/skills \
  --resources references \
  --interface 'display_name=ENMORI Scrum Planning' \
  --interface 'short_description=Plan and govern ENMORI team Sprints' \
  --interface 'default_prompt=Use $enmori-scrum-planning to prepare an ENMORI Sprint plan for PM approval.'
```

Expected: the initializer creates `SKILL.md`, `agents/openai.yaml`, and an empty `references/` directory only.

- [ ] **Step 3: Inspect generated files before replacing scaffold text**

Run:

```bash
find .agents/skills/enmori-scrum-planning -maxdepth 2 -type f -print -exec sed -n '1,220p' {} \;
```

Expected: exactly the two initialized files are present and no unrelated project file changed.

---

### Task 2: Encode the team policy once

**Files:**
- Create: `.agents/skills/enmori-scrum-planning/references/team-policy.md`

**Interfaces:**
- Consumes: `Team and capacity`, `Estimation and decomposition`, `Workflow states and WIP`, `Assignment and review`, `Definition of Ready`, `Definition of Done`, and `iOS validation gate` from the spec.
- Produces: the single policy authority linked by the entrypoint and all workflows.

- [ ] **Step 1: Create `team-policy.md` with these exact sections**

Write:

```markdown
# ENMORI Team Policy

## Process identity

ENMORI uses Scrum-inspired planning with PM direct assignment. Members surface feasibility, dependency, and capacity conflicts; LI HOURUI retains final priority, assignment, and Sprint-scope acceptance authority.

## Team and capacity

| Member | Default direction | Sprint capacity |
| --- | --- | ---: |
| LI HOURUI | PM; Flutter frontend and AI support | 20h |
| SHI ZHENGQI | DPM; backend | 20h |
| JIN ZIHAN | Testing lead; strategy, automation, integration, UAT | 20h |
| ZHOU YAOYIN | AI, algorithms, Qwen/Ollama, approved backend integration | 20h |
| DU KUN | UI/UX, Flutter UI, macOS/iOS device validation | 20h |

The Sprint ceiling is 100h. All implementation, PM, meeting, review, test, documentation, and rework hours count. Warn at exactly 100h because no buffer exists; do not reduce capacity automatically. Reject a higher total or a member above 20h unless LI explicitly changes that Sprint's capacity.

## Estimation and Ready

Use Story Points 1, 2, 3, 5, or 8. Split anything larger than 8. Every task has estimated hours. A PBI is Ready only with an evidence-backed source, testable acceptance criteria, scope boundary, resolved affected blockers, dependencies, accepted Points, estimated task hours, PM-assigned owner, different reviewer, and platform/device gates.

## Workflow and WIP

GitHub Projects owns execution state: Backlog -> Ready -> In Progress -> In Review -> Done, with Blocked branching from active work. Each member owns at most one primary In Progress task and may review other work. A Blocked item records the blocker, responsible party or dependency, and next review point. Carryover returns to PM consideration; never recommit it automatically.

Notion owns meeting notes, decisions, Sprint Review, and Retrospective. Do not duplicate authoritative task status in Notion.

## Assignment and review

LI directly assigns every task. Owner and reviewer must differ. Prefer DU or LI for UI/Flutter review; SHI for backend review; ZHOU or LI for AI/algorithm review; JIN for test-artifact review; and LI/SHI cross-review for requirements and governance. LI may adjust this mapping without permitting self-review.

Every implementation owner writes or updates relevant tests. JIN owns the strategy, cross-feature/integration verification, and UAT evidence, not all test implementation.

## Completion chain

Done requires owner implementation and self-test, different-reviewer approval, JIN's gate where integration/UAT applies, analyzer and relevant tests, required platform evidence, no unresolved high-priority review issue, updated traceability/docs, repository hygiene, LI's scope acceptance, merge, and GitHub Project status Done. Low-risk documentation may skip JIN but never the different reviewer.

## iOS gate

Every iOS-dependent PBI assigns DU to macOS/iOS device validation, JIN to scenario/evidence review, and another qualified member to code review. Evidence records device model, OS version, command, result, and useful screenshot, recording, or log in the Issue or PR. Treat DU availability as a dependency and single-point risk. Android/Linux evidence cannot substitute for iOS evidence.
```

- [ ] **Step 2: Check the policy contains every fixed numeric and role invariant**

Run:

```bash
rg -n 'LI HOURUI|SHI ZHENGQI|JIN ZIHAN|ZHOU YAOYIN|DU KUN|20h|100h|1, 2, 3, 5, or 8|one primary|Owner and reviewer must differ|iOS-dependent' .agents/skills/enmori-scrum-planning/references/team-policy.md
```

Expected: every invariant has a visible match.

- [ ] **Step 3: Commit the team policy without committing generated scaffold text**

```bash
git add .agents/skills/enmori-scrum-planning/references/team-policy.md
git commit -m "docs: define ENMORI Sprint team policy"
```

Expected: generated `SKILL.md` and `agents/openai.yaml` remain untracked until their scaffold text is replaced in Task 4; the four pre-existing user documents also remain untracked.

---

### Task 3: Add operating workflows and review formats

**Files:**
- Create: `.agents/skills/enmori-scrum-planning/references/workflows.md`
- Create: `.agents/skills/enmori-scrum-planning/references/output-formats.md`

**Interfaces:**
- Consumes: the immutable rules in `team-policy.md`.
- Produces: four execution modes and stable human-reviewable outputs used by `SKILL.md`.

- [ ] **Step 1: Write `workflows.md`**

Include four procedures:

1. `Refine`: read repository source-of-truth documents; locate affected open questions; verify source ID, acceptance criteria, scope, dependencies, Points, tasks/hours, owner/reviewer, tests, and device gates; classify each item Ready or Not Ready with reasons.
2. `Plan`: load ready backlog and previous Sprint evidence; draft one Goal; report carryover without auto-selection; rank by PM priority, dependency-unblocking, value, and readiness; assign directly under member/total capacity and WIP rules; produce GitHub/Notion previews; stop for exact PM approval before writes.
3. `Rebalance`: compare actual state with Goal, WIP, blockers, hours, dependencies, and iOS risk; propose reassignment, splitting, or scope negotiation; never change assignments/status/scope without preview approval.
4. `Close`: validate the completion chain; separate Done and carryover; compare Points/hours/actuals; draft Review and Retro; return unfinished work to backlog consideration without automatic recommitment.

For every mode, state the stopping conditions:

- affected authoritative conflict or open question;
- missing acceptance criteria/source/estimate;
- over-capacity plan;
- self-review;
- WIP violation;
- missing required iOS evidence;
- unavailable connector when an external write is requested;
- absent exact PM approval for the current preview.

- [ ] **Step 2: Write `output-formats.md`**

Define these Markdown formats with required fields:

- `Sprint planning preview`: identity, dates, Goal, capacity summary, selected/rejected PBIs, member allocation, owner/reviewer, dependencies/blockers/risks, Ready/Done exceptions, GitHub preview, Notion preview, decisions required.
- `Mid-Sprint rebalance preview`: Goal health, state/WIP snapshot, hours drift, blocker aging, proposed changes, impact, approval boundary.
- `Sprint close report`: Done evidence, carryover disposition options, planned versus actual hours, Points completed, Review outcomes, Retro observations/actions, source updates needed.
- `Async Daily`: member, completed, next, blocker, estimated-hours change, help/review needed.

Require every proposed external change to be described in plain language before any tool-specific payload.

- [ ] **Step 3: Verify workflow-to-format coverage and no duplicated roster**

Run:

```bash
rg -n '^## (Refine|Plan|Rebalance|Close)' .agents/skills/enmori-scrum-planning/references/workflows.md
rg -n '^## (Sprint planning preview|Mid-Sprint rebalance preview|Sprint close report|Async Daily)' .agents/skills/enmori-scrum-planning/references/output-formats.md
! rg -n 'LI HOURUI|SHI ZHENGQI|JIN ZIHAN|ZHOU YAOYIN|DU KUN' .agents/skills/enmori-scrum-planning/references/workflows.md .agents/skills/enmori-scrum-planning/references/output-formats.md
```

Expected: all modes and formats exist; the roster remains owned only by `team-policy.md`.

- [ ] **Step 4: Commit workflow references**

```bash
git add .agents/skills/enmori-scrum-planning/references/workflows.md .agents/skills/enmori-scrum-planning/references/output-formats.md
git commit -m "docs: define ENMORI Sprint planning workflows"
```

---

### Task 4: Replace the entrypoint and finalize UI metadata

**Files:**
- Modify: `.agents/skills/enmori-scrum-planning/SKILL.md`
- Modify: `.agents/skills/enmori-scrum-planning/agents/openai.yaml`

**Interfaces:**
- Consumes: the three references from Tasks 2–3.
- Produces: automatic Skill discovery, mode routing, preflight, and approval boundary.

- [ ] **Step 1: Replace `SKILL.md` with a concise router**

Use this frontmatter:

```yaml
---
name: enmori-scrum-planning
description: Refine, assign, preview, rebalance, or close ENMORI's two-week team Sprints using its approved capacity, reviewer, testing, GitHub/Notion, and iOS evidence rules. Use for ENMORI backlog refinement, Sprint Planning, workload allocation, mid-Sprint replanning, Sprint Review, or Retrospective; do not use for implementing product work or approving requirements.
---
```

The body must require:

- read `references/team-policy.md` for every invocation;
- read `references/workflows.md` and the matching section of `references/output-formats.md` for the selected Refine/Plan/Rebalance/Close mode;
- before affected product planning, read `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SOURCE_MAP.md`, and `docs/OPEN_QUESTIONS.md` when present;
- report source conflicts and block only affected scope;
- use PM direct assignment and the fixed team/capacity rules;
- show a complete preview before applying anything;
- request exact PM approval immediately before GitHub/Notion writes;
- perform no external write when connectors are unavailable or approval is absent;
- distinguish proposals from observed external state;
- never implement the planned product work as part of planning.

- [ ] **Step 2: Set exact UI metadata**

Make `agents/openai.yaml` exactly:

```yaml
interface:
  display_name: "ENMORI Scrum Planning"
  short_description: "Plan and govern ENMORI team Sprints"
  default_prompt: "Use $enmori-scrum-planning to prepare an ENMORI Sprint plan for PM approval."
policy:
  allow_implicit_invocation: true
```

Do not declare GitHub or Notion as hard dependencies because preview-only operation must remain available before connectors are installed.

- [ ] **Step 3: Validate entrypoint routing and reference discovery**

Run:

```bash
rg -n 'references/team-policy\.md|references/workflows\.md|references/output-formats\.md|explicit PM approval|do not implement|GitHub|Notion' .agents/skills/enmori-scrum-planning/SKILL.md
python /home/miku/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/enmori-scrum-planning
```

Expected: all references and boundaries match; validator prints success.

- [ ] **Step 4: Commit entrypoint and metadata**

```bash
git add .agents/skills/enmori-scrum-planning/SKILL.md .agents/skills/enmori-scrum-planning/agents/openai.yaml
git commit -m "feat: add ENMORI Scrum planning skill"
```

---

### Task 5: Register the project-authored Skill

**Files:**
- Modify: `docs/tooling/skills-inventory.md`
- Modify: `docs/tooling/team-skills.lock`

**Interfaces:**
- Consumes: the completed package.
- Produces: team discovery and provenance without false external attribution.

- [ ] **Step 1: Add the Skill to the shared inventory**

Add this row under `Shared in this repository`:

```markdown
| `enmori-scrum-planning` | ENMORI backlog refinement, direct assignment, capacity, review, iOS evidence, Review, and Retro | Project-authored; preview before PM-approved external writes |
```

Update the deferred `scrum-planning` row to:

```markdown
| `scrum-planning` | Replaced | A project-authored `enmori-scrum-planning` Skill implements the confirmed five-person workflow without relying on an unresolved generic source |
```

- [ ] **Step 2: Add project provenance to the lock**

Add:

```markdown
| `enmori-scrum-planning` | Project-authored | `.agents/skills/enmori-scrum-planning` | Tracked in this repository |
```

Amend the lock introduction so upstream commit requirements apply to upstream-vendored Skills; project-authored Skills are identified as tracked locally. Do not add an external license file because no external Skill text or code is copied.

- [ ] **Step 3: Verify inventory consistency**

Run:

```bash
rg -n 'enmori-scrum-planning|scrum-planning.*Replaced|Project-authored|Tracked in this repository' docs/tooling/skills-inventory.md docs/tooling/team-skills.lock
git diff --check
```

Expected: the generic candidate is visibly replaced and the new Skill has honest provenance.

- [ ] **Step 4: Commit registry files**

```bash
git add docs/tooling/skills-inventory.md docs/tooling/team-skills.lock
git commit -m "docs: register ENMORI Scrum planning skill"
```

---

### Task 6: Validate realistic behavioral invariants

**Files:**
- Verify: `.agents/skills/enmori-scrum-planning/**`
- Verify: `docs/tooling/skills-inventory.md`
- Verify: `docs/tooling/team-skills.lock`

**Interfaces:**
- Consumes: complete Skill package and registry.
- Produces: evidence that the Skill routes correctly and preserves the PM-approved boundaries.

- [ ] **Step 1: Run structural validation and unfinished-scaffold scan**

```bash
python /home/miku/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/enmori-scrum-planning
! rg -n 'TO''DO|TB''D|fill[[:space:]]+in|similar[[:space:]]+to' .agents/skills/enmori-scrum-planning
git diff --check
```

Expected: validator succeeds, no scaffold marker remains, and diff check passes.

- [ ] **Step 2: Audit five failure scenarios against the written instructions**

For each request below, trace the required response through `SKILL.md` and its references:

1. `Commit a 13-Point PBI to the Sprint.` Expected: Not Ready; split before commitment.
2. `Assign 21h to LI and 101h total.` Expected: reject unless LI explicitly changes that Sprint's capacity; warning alone is insufficient.
3. `Make DU both owner and reviewer for an iOS task.` Expected: reject self-review; DU validates device, JIN reviews evidence requirements, another member reviews code.
4. `Move a second owned task to In Progress for ZHOU.` Expected: WIP violation; keep it Ready or explicitly resolve the existing primary item.
5. `Update GitHub and Notion now` without an approved preview. Expected: show exact preview and stop for current-run PM approval.

Record the audit outcome in the final task response; do not create a permanent test-results file.

- [ ] **Step 3: Check Git and repository hygiene**

```bash
git status --short
git diff --exit-code
git diff --cached --exit-code
find .agents/skills/enmori-scrum-planning -type l -print
```

Expected: no tracked change remains, no symlink exists in the new package, and only the four pre-existing user documents remain untracked.

- [ ] **Step 4: Report completion and next gate**

Report:

- created Skill path and its four modes;
- validation result;
- source/reference distinction and no copied external Skill;
- the PM-approved workflow rules enforced;
- that GitHub/Notion remain preview-only until connectors and per-run approval exist;
- that the previously reviewed source-of-truth documents still require separate correction and approval before the first live implementation Sprint.
