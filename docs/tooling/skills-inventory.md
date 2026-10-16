# Team Codex Skill Inventory

Every Skill listed as shared is committed under `.agents/skills/` and is available to all five ENMORI members from the cloned repository. Availability does not imply invocation or approval. Use [the routing and precedence rules](skill-routing.md); exact source commits, licences, modifications, and verification are in the root [`team-skills.lock`](../../team-skills.lock).

## Shared Skills

| Skill | Source class | Invocation | Team purpose |
| --- | --- | --- | --- |
| `enmori-backend-development` | Project-authored | Implicitly eligible | Assigned Backend/API implementation or review inside the approved TypeScript/Fastify/Firebase/Ports/OpenAPI boundary. |
| `enmori-scrum-planning` | Project-authored | Explicit only | PM-controlled refinement, assignment, Sprint Planning/rebalance, Review, Retro, closure, and named planning reports. |
| `domain-modeling` | Vendored | Explicit only | Confirmed terminology, existing glossary files (`CONTEXT.md` or `GLOSSARY.md`), and ADR work; metadata is conservatively explicit-only for all tasks. |
| `ui-ux-pro-max` | Vendored | Implicitly eligible | UI/UX, accessibility, interaction, visual, responsive, typography, and Flutter-specific guidance within approved UI authority. |
| `grill-with-docs` | Vendored | Explicit only | Deliberately requested plan/design stress testing with documentation support. |
| `grilling` | Vendored | Explicit only | Deliberately requested stress-test interview; dependency of `grill-with-docs`. |
| `dart-flutter-patterns` | Vendored | Implicitly eligible | Dart/Flutter patterns constrained by ENMORI's Riverpod/no-codegen/feature-first architecture and approved dependencies. |
| `dart-add-unit-test` | Vendored | Implicitly eligible | Pure Dart/Flutter logic unit tests, using fakes unless another test dependency is approved. |
| `flutter-add-widget-test` | Vendored | Implicitly eligible | Widget rendering, interaction, accessibility, and provider-boundary tests. |
| `flutter-add-integration-test` | Vendored | Implicitly eligible | Approved Android/iOS integration flows using Flutter 3.47.2/FVM `integration_test`; legacy Driver paths are conditional. |
| `flutter-build-responsive-layout` | Vendored | Implicitly eligible | Responsive layout work for approved targets and breakpoints. |
| `flutter-fix-layout-issues` | Vendored | Implicitly eligible | Evidence-led repair of observed overflow and constraint failures. |
| `flutter-dart-code-review` | Vendored | Implicitly eligible | Independent Flutter/Dart review against repository rules and the assigned Issue. |
| `systematic-debugging` | Vendored | Implicitly eligible | Root-cause investigation of bugs, test/build failures, performance problems, and unexpected behavior. |
| `figma` | Vendored | Implicitly eligible | Fetch Figma context/screenshots/variables/assets from a supplied source as design evidence. |
| `figma-implement-design` | Vendored | Implicitly eligible | Implement an already approved Figma surface after requirement/Q04 authority and exact node scope are established. |
| `brainstorming` | Vendored | Explicit only | Design genuinely new or changed behavior; do not reopen an already approved bounded design. |
| `writing-plans` | Vendored | Explicit only | Plan complex work from an approved specification; a plan does not grant implementation authority. |

Context7 is an MCP server, not a Skill. Its repository endpoint is declared in `.codex/config.toml`; each developer authenticates locally. Figma authentication is also local and must never be copied into the repository.

The 18 repository Skill names are unique within `.agents/skills/`. Codex can nevertheless list a repository Skill and a separately installed personal Skill with the same name; it does not merge them. For ENMORI work, verify the displayed path and select the repository copy under this checkout. A personal same-name copy is outside the lock and must not be treated as team evidence.

## Intentionally excluded

| Skill | Decision | Reason |
| --- | --- | --- |
| `flutter-apply-architecture-best-practices` | Not distributed | Its prescriptive MVVM/ChangeNotifier direction can conflict with the approved Riverpod architecture. |
| `requirements-engineering` | Not distributed | The installed source is iOS-oriented and overlaps ENMORI's authority-first requirements process. |
| `develop-web-game` | Not distributed | Unrelated to ENMORI delivery. |
| `jupyter-notebook` | Not distributed | No approved notebook-based delivery workflow. |
| `screenshot` | Not distributed | General/system utility rather than repository project expertise. |

Exclusion is scoped to this distribution decision and is not a claim that a Skill is generally unsafe. Reconsideration requires a separately reviewed source and bounded purpose.

## Rejected Backend candidates

| Candidate | Decision | Reason |
| --- | --- | --- |
| `Mindrally/skills` `fastify-typescript` | Do not install | It prescribes Prisma and JWT defaults that conflict with or exceed ENMORI's approved Firebase identity, Firestore adapter, and dependency decisions. |
| `alinaqi/maggy` `firebase` | Do not install | It promotes client Firestore, Cloud Functions, Google sign-in, and example schemas that conflict with or exceed ENMORI authority. |

The project-authored `enmori-backend-development` Skill replaces these candidates without adding a dependency, endpoint, DTO, Firestore schema/index, or deployment decision.

## Update rule

Do not refresh a vendored Skill from a moving branch. Review the complete upstream directory and licence, pin a new commit in `team-skills.lock`, reapply and record only necessary ENMORI modifications, then rerun the complete integrity and security checks. Do not copy local authentication or alter `.codex/config.toml` as part of a routine Skill update.

The seven-Skill refresh prepared on 2026-10-12 is distributed through [the team synchronization record](skill-update-2026-10-12.md). Teammates receive it by pulling the merged repository; no personal/global installation is required.
