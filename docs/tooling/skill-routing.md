# Codex Skill Routing

Repository Skills are reusable workflows, not requirements or implementation authority. Select the smallest sufficient set for the assigned task. Explicit invocation chooses a workflow but never raises its authority.

When Codex displays same-name repository and personal Skills, select the entry whose path is under this checkout's `.agents/skills/`. Codex does not merge same-name Skills, and a personal copy is outside ENMORI's provenance lock and routing authority.

## Authority order

Apply every Skill through this precedence:

1. applicable non-waivable law, privacy, security, accessibility, licence, and platform obligations;
2. applicable Sponsor/Supervisor and assessment authority;
3. confirmed PM decisions and approved project contracts within scope;
4. `AGENTS.md`;
5. the assigned GitHub Issue's approved scope, acceptance criteria, dependencies, and reviewer path;
6. project-authored ENMORI Skills;
7. stack-specific repository Skills;
8. general workflow Skills; and
9. examples, templates, and defaults inside a Skill.

If instructions conflict, use a more task-specific Skill only when it is compatible with every higher-precedence source. Otherwise stop only the affected work, name both instructions and their sources, and request resolution from the responsible authority. Do not infer a requirement or silently select a winner.

## Routing matrix

| Task type | Smallest applicable Skill | Implicit invocation | Required sources before action | Conflict handling |
| --- | --- | --- | --- | --- |
| Assigned Backend implementation or review under `backend/` or normative API contract work under `api/` | `enmori-backend-development` | Allowed | `AGENTS.md`, Backend decision and detailed design, applicable approved feature/data/privacy contracts, assigned Issue | Stop any unapproved endpoint, DTO, Firestore schema/index, dependency/version, or deployment choice; report the missing decision. |
| Dart/Flutter implementation pattern inside an already approved slice | `dart-flutter-patterns` | Allowed | `AGENTS.md`, `ARCHITECTURE.md`, applicable contract and assigned Issue | ENMORI's Riverpod/no-codegen/feature-first rules override BLoC, Provider, Freezed, Dio, or other examples. |
| Pure Dart or Flutter logic unit tests | `dart-add-unit-test` | Allowed | Target contract, current implementation boundary, assigned Issue | Use fakes by default; do not add Mockito/build_runner or another dependency without approval. |
| Widget rendering, interaction, accessibility, or provider-boundary tests | `flutter-add-widget-test` | Allowed | Approved UI behavior, architecture, assigned Issue | Do not change behavior merely for test convenience or infer behavior from a mockup. |
| Approved Android/iOS end-to-end flow or integration-test work | `flutter-add-integration-test` | Allowed | Approved flow, Flutter 3.47.2/FVM baseline, test/platform gates, assigned Issue | Prefer `integration_test` with `fvm flutter test`; legacy Driver/Test Lab paths require explicit applicable scope. |
| Responsive layout implementation | `flutter-build-responsive-layout` | Allowed | Approved target platforms, visual/interaction contract, accessibility obligations | Example breakpoints and desktop/tablet layouts are not requirements; stop Figma/contract conflicts. |
| Observed overflow or constraint failure | `flutter-fix-layout-issues` plus `systematic-debugging` only if root cause is not already established | Allowed | Reproduction/error evidence, approved visual behavior | Fix the demonstrated cause without unrelated layout redesign. |
| Independent Flutter/Dart PR review | `flutter-dart-code-review` | Allowed | Diff, assigned Issue, `AGENTS.md`, `ARCHITECTURE.md`, applicable tests/contracts | Report only evidence-backed deviations; generic checklist defaults cannot create requirements. |
| Bug, test failure, build failure, performance problem, or unexpected behavior | `systematic-debugging` | Allowed | Exact error/reproduction, recent diff, relevant contract | Establish root cause before a fix; after three failed fixes, stop and raise the architectural concern. |
| Fetch Figma design context, screenshot, variables, or assets from an explicitly supplied source | `figma` | Allowed | Figma source, applicable approved requirement/UI authority, assigned Issue when implementation is involved | Figma is evidence only; report authentication/tool absence and continue only independent work. |
| Implement an approved Figma node/surface | `figma-implement-design` and `figma`; add one Flutter layout/test Skill only when needed | Allowed | Approved surface/states, Q04 or later UI acceptance authority, exact node/link, assigned Issue | Do not copy prototype business/privacy/interaction behavior; stop and report source conflicts. |
| UI/UX design, accessibility, interaction, typography, color, or visual review within approved scope | `ui-ux-pro-max` | Allowed | Applicable UI/product authority and assigned Issue | Search results are recommendations; they cannot approve a new UI direction or external package. |
| Sprint refinement, planning, assignment, rebalance, Review, Retro, closure, or named planning report | `enmori-scrum-planning` | No; explicit `$enmori-scrum-planning` only | Team policy, source-of-truth docs, observed GitHub/Notion state where authorized, LI's task/approval | Preview first. LI is primary operator; SHI is read-only only when delegated; others need a named LI task; no external write without LI's exact approval. |
| Genuinely new or changed behavior requiring design | `brainstorming` | No; explicit `$brainstorming` only | Existing project context and competent design authority | Do not reopen an already approved bounded design; a design never grants implementation authority. |
| Complex implementation planning from an approved specification | `writing-plans` | No; explicit `$writing-plans` only | Approved specification, repository state, applicable implementation authority | A plan cannot broaden scope or authorize implementation/external writes. |
| Deliberate stress-test interview | `grilling`; add `grill-with-docs` only when document capture is explicitly requested | No; explicit invocation only | The plan/decision and its controlling sources | Findings are questions/proposals until a competent authority confirms them. |
| Terminology, `CONTEXT.md`, or ADR creation/editing | `domain-modeling` | No; explicit `$domain-modeling` only | Existing glossary/ADRs and applicable decision authority | Do not turn code behavior into a requirement or record an unconfirmed decision. |

The current `agents/openai.yaml` policy is unconditional, so `domain-modeling` is explicit-only even for genuine terminology/`CONTEXT.md`/ADR work. This is the conservative implementation of the design's “non-domain tasks must not invoke it” boundary.

## Common combinations

- A failing widget layout normally starts with `flutter-fix-layout-issues`; add `systematic-debugging` only when the cause still needs investigation and add `flutter-add-widget-test` when a regression test is part of the assigned scope.
- An approved Figma-to-Flutter task uses `figma` and `figma-implement-design`; add `ui-ux-pro-max` only for a distinct UX/accessibility question, not automatically.
- Backend feature work uses `enmori-backend-development`; it does not also load generic Flutter or planning Skills.
- Daily coding never invokes `enmori-scrum-planning`. Team members follow the assigned Issue and reviewer/test chain.
