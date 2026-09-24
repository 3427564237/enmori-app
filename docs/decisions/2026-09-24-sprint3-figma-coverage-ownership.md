# PM direction — Sprint 3 Figma coverage and vertical ownership

- **Source ID:** S-PM-0924-SPRINT3-COVERAGE
- **Status:** Confirmed planning direction by LI HOURUI; not a product-contract, `Ready`, implementation, or acceptance decision
- **Decision date:** 2026-09-24
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Sprint 3 target and team ownership only
- **Baseline:** remote `main` `432f5285966a6c2705473be21a2652ca2869520a`; [Q04-D inventory](../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md)
- **Execution handoff:** [Sprint 3 coverage and evidence map](../../ASTRA_HANDOFF_S2_VISUAL_GAP_PREP_20260923.md)

## Confirmed target and assignments

LI selects all 42 Figma Version 5 exported routes as Sprint 3's desired functional coverage. Every route must correspond to a reachable user-visible interface or material state and, where the action requires it, real authorized Flutter–Backend–persistence behavior. Canonical production pages may group multiple prototype routes. The target does not require pixel-identical Figma reproduction or React-source reuse.

LI assigns one vertical module per member, including its frontend, backend, necessary data, and owner tests:

| Owner | Module | Different reviewer |
|---|---|---|
| LI | Account, onboarding, own Profile, Settings, shared Home/router integration | DU |
| JIN | Friend lifecycle, Friend Recommendation, Friends Activity, and related Home content | SHI |
| SHI | Event detail, participation, external-registration return, and related Home content | ZHOU |
| DU | Check-in, Footprint, Calendar, and related Home content | LI |
| ZHOU | AI Conversation, Persona, and related Home content | JIN |

LI coordinates frequent combined-tree checks. JIN performs the cross-feature verification gate; LI independently reviews JIN's gate record and any JIN-authored evidence. Owners use the current approved Flutter, Backend, data, privacy, and review boundaries. This direction does not create a new architecture, endpoint, schema, dependency, or deployment decision.

## Authority and supersession boundary

Q04-D's existing disposition remains 37 `Release In Scope` routes and five `Prototype Evidence Only` routes: `verify`, `forgot-password`, `going-people`, `checkin-edit`, and `ai-safety`. LI's Sprint target requests their inclusion but does **not** approve their absent product, security, lifecycle, or privacy contracts. LI and each feature owner must resolve those contracts through separately attributed durable decisions before the affected behavior is `Ready`. Existing Q04-D local authority questions and retained deviation candidates remain open where applicable. Independently approved work should continue while a local decision is pending; the team must not report blocked behavior as complete.

This Sprint 3 selection does not retroactively alter Sprint 1 or Sprint 2 accepted increments, Q04-D's historical inventory decision, or [S-PM-0902-BR01](2026-09-02-backlog-refinement-priority.md)'s separate Week 9 mandatory Release-priority boundary for Friend Requests. It is not evidence that 42 routes have been implemented, tested, reviewed, merged, or accepted. The [separate planning-policy change](2026-09-24-sprint-planning-estimation-policy.md) removes planned-hour and Story Point rules prospectively; it does not make this target automatically feasible or `Ready`.

No product code, GitHub Issue/Project state, UAT, or Release status is changed by this decision record.
