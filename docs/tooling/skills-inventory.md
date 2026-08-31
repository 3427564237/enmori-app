# Skill Inventory

This inventory separates repository-required team tooling from personal Codex tooling. Installing a Skill does not approve any architecture, package, backend, state-management, feature, or UI decision.

## Shared in this repository

Exact sources and commits are recorded in `team-skills.lock`.

| Skill | Purpose | Status |
| --- | --- | --- |
| `grill-with-docs` | Stress-test project documents | Vendored; use on request |
| `grilling` | Required dependency of `grill-with-docs` | Vendored; use on request |
| `domain-modeling` | Domain terminology, `CONTEXT.md`, and ADR support | Vendored; use during approved documentation work |
| `ui-ux-pro-max` | UI/UX research and Flutter-specific guidance | Vendored; use only for UI/UX work |
| `enmori-scrum-planning` | ENMORI backlog refinement, direct assignment, capacity, review, iOS evidence, Review, and Retro | Project-authored; preview before PM-approved external writes |

Context7 is not a Skill. It is a required MCP server declared in `.codex/config.toml`; every developer authenticates locally.

## Personal Skills installed on the bootstrap machine

These are not vendored and are not automatically installed for teammates.

| Skill | Source commit | Review note |
| --- | --- | --- |
| `dart-add-unit-test` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Flutter/Dart test implementation |
| `flutter-add-widget-test` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Widget test implementation |
| `flutter-add-integration-test` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Re-check its Flutter Driver setup against the pinned SDK before applying |
| `flutter-apply-architecture-best-practices` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Prescribes MVVM/ChangeNotifier patterns; architecture still requires explicit project approval |
| `flutter-build-responsive-layout` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Responsive layout implementation |
| `flutter-fix-layout-issues` | `flutter/agent-plugins@864cf8797b190ddb81e4875db6dd6bab89641f62` | Layout diagnosis and repair |
| `dart-flutter-patterns` | `affaan-m/ECC@ce64e417fd420a0df98ed0aa00809eea5e74e127` | Advisory patterns; examples do not select project dependencies or state management |
| `flutter-dart-code-review` | `affaan-m/ECC@ce64e417fd420a0df98ed0aa00809eea5e74e127` | Review checklist; project requirements take precedence |
| `requirements-engineering` | `SwiftyJourney/requirements-engineering-skill@b0e91f2f3251819490e977f206ff4d26fba9b818` | Specification artifacts are useful, but its examples and handoff language are iOS-oriented |
| `brainstorming` | Existing local installation | Use before creative design work |

Restart Codex after installation so newly installed personal Skills are discovered reliably.

## Original candidate list: deferred or replaced

| Candidate | Decision | Reason |
| --- | --- | --- |
| `flutter-animating-apps` | Deferred | No verified current source in the reviewed Flutter Skills repository; animation work is not part of bootstrap |
| `project-context` | Not installed | Name is ambiguous; repository documents and `domain-modeling` provide a safer initial source-of-truth workflow |
| `software-architecture` | Not installed | Reviewed prominent candidate was not Flutter-specific and would overlap the Flutter architecture Skill |
| `data-modeling` | Deferred | Select only after backend and persistence scope are approved; `domain-modeling` covers terminology and ADR work now |
| `testing` | Not installed | Reviewed prominent candidate targeted a different test stack; the three Flutter/Dart test Skills cover current needs |
| `scrum-planning` | Replaced | A project-authored `enmori-scrum-planning` Skill implements the confirmed five-person workflow without relying on an unresolved generic source |
| `project-consistency-review` | Not installed | Source is unresolved; define the repository's source-of-truth documents before selecting this role |

## Selection rule

Invoke only the smallest set needed for a task. Project requirements and approved decisions override generic Skill recommendations. A Skill that suggests a new package, architecture, state-management system, backend, or UI direction must pause for explicit project approval before implementation.
