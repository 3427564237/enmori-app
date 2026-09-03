# Repository Guardrails

## Source of truth

For any affected requirement, use this hierarchy and preserve the supersession trail:

1. Applicable non-waivable law, licence, privacy, security, accessibility, and platform obligations.
2. Explicit formal Sponsor/Supervisor decisions and applicable formal project or assessment authority, each controlling only within the attributed role's stated scope.
3. Confirmed PM-controlled project decisions and approved Business Rules and Requirements packages within their stated scopes. PM decisions are authoritative for delegated, implementation-detail, and otherwise-undecided project matters, but cannot silently override a conflicting Sponsor/Supervisor decision.
4. Earlier formal requirements that a competent authority explicitly freezes or leaves unchanged.
5. Traceability matrices, UAT records, UI exports, diagrams, reports, prototypes, and other derivative records as supporting evidence only.
6. Current implementation behavior as implementation evidence only, never proof of a requirement.

A later document date alone never establishes supersession. Same-tier sources coexist where compatible specificity allows both to apply. A same-tier conflict requires explicit competent supersession or a new authoritative resolution; otherwise report the conflict and stop work only on the affected behavior. Every resolution must retain the old source, the new source, and the scope of change.

## Required conduct

- Do not invent, infer, or broaden requirements because they appear reasonable.
- Do not silently alter a confirmed business rule or erase its change history.
- Report contradictions, missing authority, and ambiguous terminology before implementation.
- Do not make a major architecture, backend, data-model, dependency, or infrastructure decision without explicit approval.
- Persist a confirmed PM decision under `docs/decisions/` before treating it as a reusable source; a chat reference alone is not a durable project record.
- Do not commit secrets, credentials, tokens, private keys, service-account files, or sensitive configuration.

## Codex Skill authority and routing

Use [the repository Skill routing rules](docs/tooling/skill-routing.md) and only the smallest sufficient Skill set for the assigned task. Repository availability does not imply invocation, and invoking a Skill does not approve implementation, dependencies, architecture, product behavior, external writes, or a readiness claim.

Apply Skill advice in this order:

1. applicable non-waivable law, privacy, security, accessibility, licence, and platform obligations;
2. applicable Sponsor/Supervisor and assessment authority;
3. confirmed PM decisions and approved project contracts within scope;
4. this `AGENTS.md`;
5. the assigned GitHub Issue's approved scope, acceptance criteria, dependencies, and reviewer path;
6. project-authored ENMORI Skills;
7. stack-specific repository Skills;
8. general workflow Skills; and
9. examples, templates, and defaults inside any Skill.

Explicit invocation selects a workflow but never raises its authority. If instructions conflict, follow the more task-specific Skill only when it remains compatible with every higher-precedence source. Otherwise stop only the affected work, identify the conflicting instructions and sources, and obtain a competent resolution; do not choose silently.
