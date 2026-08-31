# ENMORI Scrum Planning Skill Design

**Status:** Approved for implementation from the PM interview completed on 2026-08-31.

## Goal

Create a repository-scoped Codex Skill that helps the five-person ENMORI team refine, assign, preview, rebalance, and close two-week Sprints without inventing requirements or silently mutating GitHub Projects or Notion.

The Skill supports ENMORI's chosen Scrum-inspired workflow. It does not claim strict Scrum conformance, replace the PM, approve product requirements, select architecture, or grant standing permission to change external systems.

## Research basis

The design uses three kinds of evidence:

1. The [official 2020 Scrum Guide](https://scrumguides.org/scrum-guide.html) supplies the definitions of Sprint Goal, Sprint Planning, Product Backlog, Sprint Backlog, Developers, and Definition of Done.
2. [Paca](https://github.com/Paca-AI/paca), observed at approximately 1,775 GitHub stars on 2026-08-31 under Apache-2.0, provides useful Agent-Skill patterns: load project context, detect carryover, calibrate estimates from prior work, check capacity, preview a proposed Sprint, and require confirmation before applying it.
3. [OpenProject](https://github.com/opf/openproject), observed at approximately 15,978 GitHub stars on 2026-08-31 under GPL-3.0, demonstrates the value of separating task/board execution, planning, time tracking, meetings, and GitHub integration. It is a concept reference only.

No external Scrum Skill is vendored or copied. Searches of the high-star `obra/superpowers`, `anthropics/skills`, `addyosmani/agent-skills`, and `mattpocock/skills` repositories found no Scrum/Sprint-planning Skill. Repositories whose descriptions directly matched Scrum Agent Skills had only single-digit stars and are not used as authoritative sources.

ENMORI's confirmed team decisions override every generic or external practice below.

## Process identity

The team uses a Scrum-inspired hybrid process:

- the PM sets priority, Sprint Goal, scope boundary, dates, and direct task assignments;
- members may surface feasibility, dependency, or capacity conflicts;
- the PM retains final assignment authority;
- work is still refined, estimated, reviewed, tested, and inspected as a team;
- no generated plan becomes externally authoritative until the PM explicitly approves it.

The Skill must call this process `ENMORI Scrum-inspired planning`, not strict Scrum.

## Team and capacity

The two-week Sprint has a gross planned capacity of exactly 100 hours: five members at approximately 10 hours per week for two weeks. The PM declined a standard buffer. Meetings, PM work, review, testing, documentation, rework, and implementation all consume this same 100-hour ceiling.

| Member | Planning role and technical direction | Gross Sprint capacity |
| --- | --- | ---: |
| LI HOURUI | PM; direct assignment and scope acceptance; Flutter frontend and AI support | 20h |
| SHI ZHENGQI | DPM; PM backup and requirements review; backend | 20h |
| JIN ZIHAN | Testing lead; test strategy, automation, integration verification, and UAT evidence | 20h |
| ZHOU YAOYIN | AI and algorithm lead; Qwen/Ollama, AI evaluation, and approved backend integration boundaries | 20h |
| DU KUN | UI/UX and Flutter UI lead; sole current macOS/iOS-device validation capability | 20h |

These are default capability directions, not permanent task silos. Every Sprint is reassigned against its actual goal and ready backlog.

The Skill must:

- show planned hours per member and all-team total;
- reject a proposed plan above 20 hours for any member or above 100 hours overall unless the PM explicitly changes capacity for that Sprint;
- count non-coding work rather than treating it as free capacity;
- show a warning when the plan uses exactly 100 hours because there is no schedule buffer, but must not automatically reduce the approved capacity;
- preserve recorded actual hours for later calibration when that evidence is available.

## Estimation and decomposition

Each Product Backlog Item uses Story Points from `1, 2, 3, 5, 8`. Each implementation, test, documentation, review, or PM task also has an estimated-hour value used for assignment.

- A PBI above 8 Points is not Sprint-ready and must be split.
- Estimates consider complexity, uncertainty, test surface, integration points, device/tool constraints, and dependencies.
- Historical completed work may calibrate estimates but cannot silently override a current team estimate.
- A task without a source/requirement link, testable acceptance criteria, estimate, dependency status, owner, or reviewer is not Ready.

## Workflow states and WIP

GitHub Projects is the execution source of truth and uses:

```text
Backlog -> Ready -> In Progress -> In Review -> Done
                         \-> Blocked
```

- Each member may own at most one primary `In Progress` task at a time.
- A member may review other work while owning one primary task.
- `Blocked` requires a blocker description, blocking owner or external dependency, and next review point.
- Carryover never moves automatically into the next Sprint. The Skill reports it, returns it to backlog consideration, and asks the PM whether to re-estimate, split, reprioritize, or recommit it.

Notion is the documentation source for meeting notes, PM decisions, Sprint Review, Sprint Retrospective, and other governance records. Task status and assignment must not be duplicated as a second authoritative board in Notion.

## Assignment and review

The PM directly assigns every selected task. Every task has one owner and a different reviewer.

Default reviewer directions are:

- UI/Flutter: DU KUN or LI HOURUI;
- backend: SHI ZHENGQI, with a second technically appropriate team member where needed;
- AI/algorithm: ZHOU YAOYIN or LI HOURUI;
- testing artifacts: JIN ZIHAN, without making JIN the sole author of all tests;
- requirements and project governance: LI HOURUI and SHI ZHENGQI cross-review.

The PM may override the reviewer mapping for a Sprint, but the Skill must reject self-review.

Every implementation owner writes or updates the relevant unit, Widget, integration, or other focused tests for their work. JIN owns the overall test strategy, cross-feature/integration verification, and UAT evidence rather than becoming the team's only tester.

## Definition of Ready

A PBI may enter `Ready` only when it has:

- an evidence-backed requirement/source ID and affected scope;
- testable acceptance criteria;
- explicit out-of-scope boundaries where ambiguity is likely;
- no unresolved `OPEN_QUESTIONS.md` item that blocks the affected behavior;
- dependencies and blockers identified;
- an accepted `1, 2, 3, 5, 8` Story Point estimate;
- tasks with estimated hours;
- a PM-assigned owner and different reviewer;
- required platform/device gates identified.

The Skill may refine or report an unready PBI, but must not disguise it as Ready.

## Definition of Done and completion chain

A task or PBI reaches `Done` only after:

1. the owner completes the work and relevant self-tests;
2. the different reviewer approves it;
3. JIN completes the required quality gate for features needing integration/UAT verification;
4. analyzer, relevant automated tests, and required device/platform checks pass;
5. no unresolved high-priority review issue remains;
6. requirement traceability, documentation, and evidence are updated where required;
7. no secret, credential, machine-local path, signing material, or generated artifact is committed;
8. LI confirms the result remains within the approved Sprint scope;
9. the approved change is merged and the GitHub Project item becomes `Done`.

Low-risk documentation tasks may skip JIN's quality gate but still require a different reviewer. The Skill must never mark work Done merely because code exists or a PR was opened.

## iOS validation gate

DU KUN is the only current member with the required macOS/iOS device capability. Every iOS-dependent PBI must therefore:

- assign DU to the macOS/iOS device validation task;
- assign JIN to define or review the test scenarios and evidence requirements;
- use another technically appropriate member to review Flutter/iOS code so device access does not imply self-review;
- record device model, OS version, build/test command, result, and relevant screenshot, recording, or log in the GitHub Issue or PR;
- expose DU's availability as a dependency and single-point risk in the Sprint preview;
- remain outside `Done` until required evidence exists.

The Skill must not invent an iOS pass or treat Android/Linux evidence as equivalent.

## Sprint cadence

The default two-week cadence is:

- Day 1: Sprint Planning, Sprint Goal, direct assignment, capacity and dependency check;
- each working day: concise asynchronous Daily update;
- Day 5 or 6: mid-Sprint risk, blocker, WIP, and capacity check;
- Day 9: nonessential scope freeze, testing, review, and defect focus;
- Day 10: Sprint Review, Retrospective, actual-hours/estimate comparison, and carryover disposition.

Dates may adapt to the academic calendar, but changing the two-week duration for a particular Sprint requires the PM's explicit approval.

## Skill operating modes

One project Skill named `enmori-scrum-planning` supports four related modes:

1. **Refine:** inspect candidate PBIs for source authority, acceptance criteria, blockers, Points, tasks, hours, owner/reviewer, and platform gates.
2. **Plan:** propose a two-week Sprint Goal, select only Ready items, assign all work, check 100-hour/member limits, flag dependencies and iOS risk, then produce previews.
3. **Rebalance:** compare current state with the Sprint Goal, surface blockers/WIP/capacity drift, and propose PM-approved reassignment or scope negotiation without silently changing the board.
4. **Close:** verify the completion chain, report Done/carryover, compare estimate versus actual hours, and draft Review/Retrospective records.

The Skill must read `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SOURCE_MAP.md`, and `docs/OPEN_QUESTIONS.md` when they exist before planning affected product work. It reports authority conflicts rather than resolving them. The current documents must be corrected and accepted as a team baseline before the first live implementation Sprint is committed.

## Outputs

Every Plan or Rebalance run produces a human-reviewable preview containing:

- Sprint name, dates, and one Sprint Goal;
- selected and rejected PBIs with reasons;
- Story Points and task-hour totals;
- per-member assignment/capacity table;
- owner/reviewer matrix;
- dependency, blocker, WIP, and risk register;
- iOS validation gate where applicable;
- Definition of Ready and Done exceptions;
- proposed GitHub Projects changes;
- proposed Notion records;
- unresolved questions requiring PM action.

No tool-specific raw API payload is presented as the only review artifact.

## External mutation boundary

The Skill is discoverable automatically, but discovery does not authorize mutation.

- Reading repository files and available GitHub/Notion planning state is allowed when relevant connectors are available.
- The Skill prepares GitHub Projects and Notion change previews first.
- It must request explicit PM approval for that exact preview immediately before external writes.
- Approval for one preview or Sprint does not authorize a later run.
- It never changes requirements, architecture, product scope, issue assignments, status, Sprint membership, or Notion decisions silently.
- If GitHub or Notion connectors are absent, it produces local Markdown previews and does not invent successful synchronization.
- Credentials and connector authentication remain local and never enter the Skill or repository.

## Skill package structure

```text
.agents/skills/enmori-scrum-planning/
|-- SKILL.md
|-- agents/
|   `-- openai.yaml
`-- references/
    |-- team-policy.md
    |-- workflows.md
    `-- output-formats.md
```

- `SKILL.md` contains routing, required preflight, shared invariants, and mutation approval rules.
- `team-policy.md` owns names, capacity, role directions, estimation, WIP, reviewer, Done, and iOS policies.
- `workflows.md` owns Refine, Plan, Rebalance, and Close procedures.
- `output-formats.md` owns concise preview and Review/Retrospective formats.
- `agents/openai.yaml` supplies UI metadata with automatic discovery enabled and no hard MCP dependency.

No script, asset, external Skill copy, GitHub/Notion credential, or connector endpoint is required.

## Validation

Implementation is complete when:

- the bundled Skill validator passes;
- the Skill description routes only Sprint/backlog/capacity/assignment/review/retro requests;
- every reference is linked from `SKILL.md` and contains no duplicated conflicting policy;
- a 13-Point PBI is refused until split;
- a 101-hour plan or a member above 20 hours is rejected unless the PM explicitly changes that Sprint's capacity;
- owner and reviewer equality is rejected;
- a second primary In Progress task for the same owner is rejected;
- an iOS-dependent task without DU validation and required evidence is rejected;
- an open requirement conflict prevents Ready/commitment for the affected behavior;
- GitHub/Notion writes never occur before an exact preview and explicit PM approval;
- the project Skill inventory and lock identify the Skill as project-authored rather than falsely attributing external authorship;
- existing unrelated user documents remain unchanged unless separately approved.
