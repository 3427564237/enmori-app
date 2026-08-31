# Repository Guardrails

## Source of truth

For any affected requirement, use this hierarchy and preserve the supersession trail:

1. The latest dated, explicit Sponsor/Supervisor decision or confirmed PM decision record, each controlling only within the deciding role's stated scope. A PM decision must not be represented as an earlier Sponsor/Supervisor approval.
2. The latest formal Business Rules and Requirements package for that scope, but only where it explicitly adds to or supersedes an earlier package.
3. Earlier frozen formal requirements that have not been superseded.
4. Traceability matrices, UAT records, UI exports, diagrams, reports, and current code as supporting evidence only.

If sources at the same or different levels conflict, do not choose silently. Report the conflict and stop work on the affected behavior until it is resolved.

## Required conduct

- Do not invent, infer, or broaden requirements because they appear reasonable.
- Do not silently alter a confirmed business rule or erase its change history.
- Report contradictions, missing authority, and ambiguous terminology before implementation.
- Do not make a major architecture, backend, data-model, dependency, or infrastructure decision without explicit approval.
- Persist a confirmed PM decision under `docs/decisions/` before treating it as a reusable source; a chat reference alone is not a durable project record.
- Do not commit secrets, credentials, tokens, private keys, service-account files, or sensitive configuration.
