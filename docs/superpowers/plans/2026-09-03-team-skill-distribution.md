# ENMORI Team Skill Distribution Implementation Plan

> **For agentic workers:** Execute this plan inline against the approved design. Do not delegate, reopen brainstorming, or seek another design approval; the PM authorization attached to this task already selects inline execution.

**Goal:** Distribute the approved ENMORI Codex Skills through the repository, add a bounded Backend Skill, document deterministic routing and provenance, verify the package, and create one implementation commit.

**Architecture:** Vendor complete reviewed Skill directories under `.agents/skills/`, retain upstream licences, and pin each upstream commit in a root `team-skills.lock`. Repository guardrails and one routing document define authority and invocation policy; Skill-local compatibility notices prevent generic examples from selecting unapproved architecture or exposing credentials.

**Tech Stack:** Markdown, YAML Skill metadata, Bash/Node.js helper scripts, Git, Codex Skill validator.

**Spec:** `docs/superpowers/specs/2026-09-03-team-skill-distribution-design.md`

## Global Constraints

- Do not modify Flutter product behavior, Backend implementation, application dependencies, approved architecture, GitHub Projects, or Notion.
- Do not copy credentials, OAuth state, service-account material, machine-specific paths, or local Codex configuration.
- Preserve complete required upstream directories and applicable licences; record all local changes against fixed source commits.
- Skill advice never outranks law/platform obligations, formal authority, confirmed PM decisions, `AGENTS.md`, or the assigned approved Issue.
- Use the smallest sufficient Skill set and stop only affected work when instructions conflict.
- Create only the final implementation commit `chore: share team development skills`; do not push.

---

### Task 1: Vendor and harden the approved upstream Skills

**Files:**
- Create: `.agents/skills/{dart-flutter-patterns,dart-add-unit-test,flutter-add-widget-test,flutter-add-integration-test,flutter-build-responsive-layout,flutter-fix-layout-issues,flutter-dart-code-review,systematic-debugging,figma,figma-implement-design,brainstorming,writing-plans}/**`
- Create: `.agents/skills/_licenses/{flutter-agent-plugins-LICENSE,affaan-m-ecc-LICENSE,obra-superpowers-LICENSE}`
- Modify: selected vendored `SKILL.md`, `agents/openai.yaml`, references, and scripts only for ENMORI authority, explicit invocation, missing-dependency, credential, or automatic-network compatibility.

**Interfaces:**
- Consumes: exact installed Skill directories reviewed against their public upstream commits.
- Produces: complete repository-local Skill directories with resolvable relative companions and recorded local modifications.

- [x] **Step 1: Copy each reviewed directory without omitting companions**

Run a source-to-destination copy for the twelve approved names and copy the BSD-3-Clause and MIT upstream licence texts into `_licenses`; retain each Figma Skill's bundled Apache-2.0 `LICENSE.txt`.

- [x] **Step 2: Apply bounded compatibility changes**

Add ENMORI authority notices where generic Flutter/Figma examples could choose packages, architecture, interaction behavior, logging, or test setup. Set `policy.allow_implicit_invocation: false` for `brainstorming` and `writing-plans`; replace token-printing advice with a non-disclosing presence check; remove the brainstorming companion's automatic remote image request while keeping the local server files.

- [x] **Step 3: Verify copied structure and script syntax**

Run:

```bash
python /home/miku/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/<each-vendored-skill>
bash -n .agents/skills/brainstorming/scripts/start-server.sh
bash -n .agents/skills/brainstorming/scripts/stop-server.sh
bash -n .agents/skills/systematic-debugging/find-polluter.sh
node --check .agents/skills/brainstorming/scripts/server.cjs
node --check .agents/skills/brainstorming/scripts/helper.js
```

Expected: every command exits 0; no excluded Skill directory exists.

### Task 2: Create the ENMORI Backend development Skill

**Files:**
- Create: `.agents/skills/enmori-backend-development/SKILL.md`
- Create: `.agents/skills/enmori-backend-development/agents/openai.yaml`

**Interfaces:**
- Consumes: `AGENTS.md`, `docs/decisions/2026-09-01-backend-architecture.md`, `docs/superpowers/specs/2026-09-01-backend-architecture-design.md`, approved feature contracts, and the assigned GitHub Issue.
- Produces: an implicitly eligible implementation/review workflow that cannot invent endpoints, DTOs, Firestore design, dependency versions, or deployment choices.

- [x] **Step 1: Initialize the Skill with the bundled Skill creator**

Run:

```bash
python /home/miku/.codex/skills/.system/skill-creator/scripts/init_skill.py enmori-backend-development --path .agents/skills
```

Expected: only `SKILL.md` and `agents/openai.yaml` are scaffolded.

- [x] **Step 2: Replace scaffold text with the approved Backend boundary**

Encode TypeScript strict/Node 24, feature-first modular monolith, Ports dependency direction, Fastify/Firebase isolation, REST/OpenAPI, required test layers, fail-closed/log allowlist/secret rules, and mandatory stop conditions. Do not name a new endpoint, DTO field, Firestore collection/index, exact package version, package manager, or deployment product.

- [x] **Step 3: Validate the Skill**

Run:

```bash
python /home/miku/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/enmori-backend-development
```

Expected: validation exits 0 and a content scan finds every mandatory constraint and no deferred implementation choice.

### Task 3: Enforce routing and Scrum invocation policy

**Files:**
- Modify: `AGENTS.md`
- Modify: `.agents/skills/domain-modeling/agents/openai.yaml`
- Modify: `.agents/skills/enmori-scrum-planning/agents/openai.yaml`
- Modify: `.agents/skills/enmori-scrum-planning/references/team-policy.md`
- Modify: `.agents/skills/grilling/agents/openai.yaml`
- Verify: `.agents/skills/grill-with-docs/agents/openai.yaml`
- Create: `docs/tooling/skill-routing.md`

**Interfaces:**
- Consumes: the nine-level approved precedence and LI HOURUI's PM authority.
- Produces: one route matrix, explicit-only metadata, and member-specific Scrum boundaries.

- [x] **Step 1: Add repository-level Skill guardrails**

Link the routing document from `AGENTS.md`; state the nine-level precedence, smallest-set rule, no authority uplift from explicit invocation, and affected-scope stop/report behavior.

- [x] **Step 2: Set explicit-only policies**

Set `policy.allow_implicit_invocation: false` for `enmori-scrum-planning`, `brainstorming`, `writing-plans`, `grill-with-docs`, `grilling`, and `domain-modeling`. Document that the metadata schema is unconditional, so members explicitly invoke `domain-modeling` even for terminology/`CONTEXT.md`/ADR work.

- [x] **Step 3: Record the Scrum member boundary**

State that LI is primary operator; SHI may produce only LI-delegated read-only analysis/previews; other members invoke only for a planning/reporting task explicitly named by LI; nobody self-assigns, reprioritizes, expands Sprint scope, changes external state, or writes GitHub/Notion without LI's exact approval.

- [x] **Step 4: Create the routing matrix**

Include task type, smallest applicable Skill, implicit eligibility, prerequisite sources, and conflict action for Backend, Flutter patterns/tests/layout/review/debugging, Figma/UI, Scrum, planning/brainstorming, grilling, and domain modeling.

### Task 4: Consolidate inventory, provenance, and onboarding

**Files:**
- Modify: `README.md`
- Replace: `docs/tooling/skills-inventory.md`
- Create: `team-skills.lock`
- Delete: `docs/tooling/team-skills.lock`
- Modify: `docs/superpowers/specs/2026-09-03-team-skill-distribution-design.md`

**Interfaces:**
- Consumes: actual repository directories, verified source repositories/commits/licences, and local-diff audit results.
- Produces: one root lock source, exact final inventory/exclusions, clone-time discovery instructions, and corrected approved design status.

- [x] **Step 1: Update onboarding and design status**

Explain clone-time project Skill discovery, smallest-set routing, local-only Figma/Context7 authentication, restart requirements, and no credential sharing. Change the approved design status line so it no longer says PM review is pending.

- [x] **Step 2: Replace the inventory with the final state**

List all shared Skills by project-authored or fixed upstream source, invocation mode, purpose, and exclusions. Record rejection of the two conflicting Backend candidates and the five intentionally excluded Skills.

- [x] **Step 3: Create the root lock and remove the superseded lock**

For every shared Skill record source repository, exact commit or project-authored status, upstream path, vendored path, licence, local modifications, and verification. Make `team-skills.lock` the sole lock location and remove the old `docs/tooling/team-skills.lock`.

### Task 5: Run repository-wide acceptance checks and commit

**Files:**
- Verify: all paths changed by Tasks 1-4.
- Commit: exactly the approved Skill distribution, routing, provenance, plan, and documentation changes.

**Interfaces:**
- Consumes: final working tree.
- Produces: verified commit `chore: share team development skills` and a clean post-commit worktree.

- [x] **Step 1: Validate metadata, references, licences, and lock agreement**

Run all Skill validators, parse YAML/frontmatter, resolve every relative Markdown/file reference, verify explicit/implicit policies, compare directory names with inventory/routing/lock, and verify every upstream licence and commit.

- [x] **Step 2: Run security and repository checks**

Scan vendored content for credential values, home-directory paths, token-printing commands, unapproved Backend choices, destructive commands, and automatic network calls; review documented, opt-in exceptions. Run repository link/integrity checks where present plus `git diff --check`.

- [x] **Step 3: Review the exact diff and create the implementation commit**

Run:

```bash
git status --short
git diff --stat
git diff --check
git diff -- . ':(exclude)lib/**' ':(exclude)backend/**' ':(exclude)api/**'
git add AGENTS.md README.md docs .agents/skills team-skills.lock
git commit -m "chore: share team development skills"
```

Expected: the diff contains no product implementation, dependency, local config, credential, or external-state change; commit succeeds and no push is performed.
