# ENMORI team Skill distribution and routing design

- **Status:** Approved by PM on 2026-09-03; implementation authorized from design commit `2771fb9`
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Repository-distributed Codex Skills, routing precedence, conflict handling, provenance, and a project-authored Backend development Skill
- **Does not authorize:** Product-scope changes, application dependencies, Backend endpoint/schema invention, Firebase deployment, credentials, GitHub/Notion status changes, or product implementation

## 1. Goal

Every ENMORI member who opens the cloned repository with Codex can discover the same project-relevant Skills. Codex selects only the smallest task-relevant set, follows one documented precedence model, and stops rather than allowing a generic Skill to override an approved project decision.

This design distributes team workflow knowledge through the repository. It does not require every member to invoke every Skill on every task, and it does not make Codex Skills application runtime dependencies.

## 2. Distribution boundary

Repository Skills live under `.agents/skills/` and are committed in full, including required scripts, references, assets, agent metadata, and applicable licence/attribution files. A root `team-skills.lock` records source repository, fixed source commit, vendored path, licence, local modification status, and verification result.

The repository will contain all Skills that are materially relevant to ENMORI delivery, not a literal mirror of LI HOURUI's personal Codex profile. System utilities and unrelated workflows remain personal/system scoped so the repository does not imply they are project requirements.

### 2.1 Retained shared Skills

| Skill | Team use |
| --- | --- |
| `domain-modeling` | Approved terminology, `CONTEXT.md`, and ADR work |
| `enmori-scrum-planning` | PM-controlled refinement, planning, assignment, rebalance, Review, and Retro previews |
| `grill-with-docs` | Explicitly requested document stress-testing |
| `grilling` | Required dependency for `grill-with-docs`; explicit use only |
| `ui-ux-pro-max` | UI/UX implementation and review within approved product/UI authority |

### 2.2 Newly shared existing Skills

| Skill | Team use |
| --- | --- |
| `dart-flutter-patterns` | Flutter/Dart implementation patterns constrained by the approved Riverpod and feature-first architecture |
| `dart-add-unit-test` | Dart unit tests for owner-authored logic |
| `flutter-add-widget-test` | Flutter widget rendering and interaction tests |
| `flutter-add-integration-test` | Integration-test work after its driver/setup advice is checked against Flutter 3.47.2 |
| `flutter-build-responsive-layout` | Approved Android responsive-layout implementation |
| `flutter-fix-layout-issues` | Diagnosis and repair of observed Flutter constraint/overflow failures |
| `flutter-dart-code-review` | Independent Flutter/Dart PR review |
| `systematic-debugging` | Evidence-first investigation of bugs, test failures, and unexpected behaviour |
| `figma` | Fetching design evidence from an explicitly supplied Figma source |
| `figma-implement-design` | Implementing an approved Figma node after requirement/Q04 authority is established |
| `brainstorming` | Explicit design of genuinely new or changed behaviour before implementation |
| `writing-plans` | Explicit implementation planning after an approved specification for complex work |

### 2.3 New project-authored Skill

Create `.agents/skills/enmori-backend-development/` as an ENMORI-specific Backend implementation and review Skill. Its controlling sources are `AGENTS.md`, `docs/decisions/2026-09-01-backend-architecture.md`, the detailed approved Backend design, applicable feature contracts, and the assigned GitHub Issue.

The Skill must encode, without broadening:

- TypeScript strict mode on the Node.js 24 LTS major line;
- one feature-first modular monolith under `backend/`;
- Fastify limited to Bootstrap/Transport;
- `Application/Domain defines Ports; Infrastructure implements Ports`;
- Firebase Authentication identity verification and Firebase Admin/Firestore Infrastructure adapters;
- no direct Flutter access to Firestore product data;
- versioned REST/JSON with normative OpenAPI under `api/`;
- unit tests with fakes, Port contract tests, Fastify injection tests, OpenAPI consistency, and isolated Firebase Emulator integration tests;
- fail-closed errors, log allowlists, credential protection, and controlled environment boundaries; and
- mandatory stop/report behaviour for unapproved endpoints, DTOs, Firestore schema/indexes, exact dependencies, deployment choices, or other open decisions.

No third-party Backend Skill is vendored in this change. Review found no matching OpenAI-curated or Firebase/Google-official Skill. The reviewed `Mindrally/skills` Fastify Skill prescribes Prisma and JWT, while the reviewed `alinaqi/maggy` Firebase Skill prescribes client Firestore access, Cloud Functions, Google sign-in, and example schemas. Those defaults conflict with or exceed ENMORI authority.

## 3. Skills intentionally not distributed

| Skill | Reason |
| --- | --- |
| `flutter-apply-architecture-best-practices` | Its prescriptive MVVM/ChangeNotifier direction can conflict with ENMORI's approved Riverpod architecture |
| `requirements-engineering` | The installed source is iOS-oriented and overlaps ENMORI's authority-first requirements process |
| `develop-web-game` | Unrelated to ENMORI |
| `jupyter-notebook` | No approved notebook-based delivery workflow |
| `screenshot` | System/general utility, not project expertise |

An excluded Skill may be reconsidered through a separately reviewed source and bounded purpose. Exclusion is not a claim that the Skill is generally unsafe.

## 4. Routing and precedence

Create `docs/tooling/skill-routing.md` and link it from `AGENTS.md`, `README.md`, and `docs/tooling/skills-inventory.md`.

All Skill advice uses this precedence:

1. non-waivable legal, privacy, security, accessibility, licence, and platform obligations;
2. applicable Sponsor/Supervisor and assessment authority;
3. confirmed PM decisions and approved project contracts within scope;
4. `AGENTS.md` repository guardrails;
5. the assigned GitHub Issue's approved scope, acceptance criteria, dependencies, and reviewer path;
6. project-authored ENMORI Skills;
7. stack-specific vendored Skills;
8. general workflow Skills; and
9. examples, templates, and defaults inside any Skill.

Explicit invocation selects a workflow but never raises its authority. If two Skills conflict, use the more task-specific Skill only when it is compatible with every higher-precedence source. Otherwise stop only the affected work, identify both instructions, and ask the responsible authority to resolve the conflict.

Codex must use the smallest sufficient Skill set. Availability does not mean invocation, and invocation does not approve a package, architecture, schema, feature, UI decision, or external write.

## 5. Invocation policy

### 5.1 Implicitly eligible

The following may activate when their descriptions match: `enmori-backend-development`, `dart-flutter-patterns`, Dart/Flutter test Skills, responsive-layout and layout-repair Skills, `flutter-dart-code-review`, `systematic-debugging`, `ui-ux-pro-max`, `figma`, and `figma-implement-design`.

Implicit activation remains bounded by the assigned Issue and the precedence rules. Figma is evidence, not independent product authority.

### 5.2 Explicit only

Set `allow_implicit_invocation: false` for:

- `enmori-scrum-planning`;
- `brainstorming`;
- `writing-plans`;
- `grill-with-docs`;
- `grilling`; and
- `domain-modeling` when the task does not explicitly concern terminology, `CONTEXT.md`, or an ADR.

These workflows can reshape plans, ask for new decisions, or create governance artifacts. They require deliberate invocation so ordinary implementation does not reopen approved scope.

## 6. `enmori-scrum-planning` team boundary

All members receive the Skill because its policy and output formats are part of the shared repository. LI HOURUI is its primary operator.

- LI may use it to refine, assign, plan, rebalance, and close a Sprint.
- SHI ZHENGQI as DPM may use it to prepare an explicitly requested read-only analysis or preview.
- Other members may use it only when LI asks for a named planning/reporting task.
- No member may use it to self-assign, reprioritize, expand Sprint scope, move external status, or write GitHub/Notion planning state without LI's exact approval.
- Daily coding does not invoke it. Members follow their Issue, reviewer chain, `AGENTS.md`, and the applicable implementation/test Skills.

## 7. Provenance and licence handling

Before vendoring an existing personal Skill:

1. read every file in its source directory and all directly referenced companions;
2. identify the upstream repository and fixed commit already recorded by the current installation where available;
3. retain the complete required directory, not only `SKILL.md`;
4. retain or add the applicable licence and attribution;
5. mark any ENMORI metadata modification;
6. scan for destructive commands, credential collection, hidden network calls, incompatible agents/tools, and architecture-changing defaults; and
7. verify YAML/frontmatter, relative paths, scripts, routing metadata, and repository discovery after copying.

No MCP credential or authenticated state is copied. `.codex/config.toml` may declare a shared endpoint, but every member authenticates locally.

## 8. Documentation changes

Implementation updates:

- `AGENTS.md`: add Skill authority, minimum-set, conflict, and routing-link rules;
- `README.md`: explain clone-time discovery and per-developer authentication;
- `docs/tooling/skills-inventory.md`: replace the personal/shared split with the final shared inventory and exclusions;
- `docs/tooling/skill-routing.md`: provide a task-to-Skill matrix and invocation examples;
- `team-skills.lock`: record exact provenance, commits, licences, modifications, and verification;
- vendored `agents/openai.yaml` files: disable implicit invocation only where required above; and
- licence/attribution files under `.agents/skills/_licenses/` as required.

## 9. Verification and acceptance

The change is complete only when:

- every intended shared Skill directory exists and every required companion resolves;
- no excluded Skill was accidentally copied;
- no vendored file contains credentials or machine-specific paths;
- duplicate Skill names and invocation policies are reported;
- `AGENTS.md`, routing, inventory, and lock records agree exactly;
- the Backend Skill contains no unapproved endpoint, DTO, Firestore schema/index, dependency, or deployment choice;
- a clean Codex session opened at the repository root discovers the shared Skills;
- repository integrity, link, licence, YAML/frontmatter, and whitespace checks pass; and
- the final commit contains only Skill distribution, routing, provenance, and supporting documentation changes.

## 10. Risks and controls

- **Context pressure:** The repository exposes more Skill descriptions. Control: concise descriptions, smallest-set routing, and explicit-only policy for governance workflows.
- **Architecture drift:** Generic examples may recommend conflicting libraries or patterns. Control: precedence rules, exclusions, and the project-authored Backend Skill.
- **Workflow ceremony:** `brainstorming` and `writing-plans` can interrupt bounded Issue execution. Control: explicit-only invocation and routing by task type.
- **Tool availability:** Figma/MCP-dependent Skills may be selected without an authenticated connector. Control: report the missing tool and continue only with work that does not require it.
- **Upstream drift:** Team members could receive different behaviour if sources float. Control: vendor complete content and pin source commits in `team-skills.lock`.
