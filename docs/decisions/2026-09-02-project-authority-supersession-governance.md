# Project authority and supersession governance correction — 2026-09-02

- **Status:** Approved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-GOV
- **Scope:** Project-wide source authority, conflict handling, compatible specificity, and supersession governance
- **Corrects:** The former `AGENTS.md` wording that placed confirmed PM decisions in the same highest tier as explicit Sponsor/Supervisor decisions
- **Builds on:** [S-PM-0902-Q04](2026-09-02-ui-baseline-visual-acceptance-contract.md) and [`docs/SOURCE_MAP.md`](../SOURCE_MAP.md)

## Decision

The authority and conflict model already approved in Q04-B and recorded in `docs/SOURCE_MAP.md` is the canonical project-wide governance model. It applies to requirements, architecture, data, API, UI, implementation detail, verification, planning, and other project decisions, while every authority remains limited to its attributed role and scope.

The project-wide hierarchy is:

1. applicable non-waivable law, licence, privacy, security, accessibility, and platform obligations;
2. explicit formal Sponsor/Supervisor decisions and applicable formal project or assessment authority, within the attributed authority's scope;
3. confirmed PM-controlled project decisions and approved Business Rules/Requirements packages, within their stated scopes;
4. earlier formal requirements that a competent authority explicitly freezes or leaves unchanged;
5. reports, traceability matrices, UAT/acceptance records, UI specifications, diagrams, prototypes, exports, and other derivative records as supporting evidence only; and
6. current implementation behavior as implementation evidence only, never as proof of a requirement.

Q04 may extend the lower visual-evidence portion of this hierarchy with approved Q04 deviations, screen/state visual-acceptance decisions, the frozen Figma reference, and prototype evidence. Those visual tiers do not change the project-wide precedence above them.

## Sponsor/Supervisor and PM boundary

Sponsor/Supervisor authority is above PM-controlled project decisions within the Sponsor/Supervisor's applicable scope. An approved PM decision remains authoritative for delegated matters, implementation details, and project questions not settled by a higher applicable authority.

A PM decision must not be represented as a Sponsor/Supervisor decision and cannot silently override a conflicting Sponsor/Supervisor decision. If attribution, scope, applicability, or delegation is ambiguous, the affected behavior remains blocked pending an explicit resolution.

## Date, specificity, and conflict rules

A later document date alone never constitutes supersession at any tier.

Sources at the same tier may coexist when they are compatibly specific: the more specific source may govern its expressly narrower subject while the broader source continues elsewhere, provided the two rules can both be satisfied and the specific source comes from an authority competent for that subject. Compatible specificity is not permission to infer a contradiction away or to erase either source.

A same-tier conflict requires one of the following before the affected behavior can proceed:

- explicit competent supersession identifying the earlier rule and changed scope; or
- a new authoritative resolution identifying which rule governs and preserving the conflict trail.

Until then, report the conflict and block only the affected behavior. Every accepted supersession or resolution retains the old source, new source, deciding authority, affected scope, and prospective or retrospective effect.

## Correction and non-effects

This decision prospectively corrects the repository governance wording that previously placed explicit Sponsor/Supervisor decisions and confirmed PM decisions in one highest tier. It does not retroactively convert, invalidate, or reattribute an existing PM decision, Sponsor/Supervisor decision, formal requirement, implementation claim, or UAT result.

It does not resolve a substantive product conflict merely by changing the hierarchy. Every affected conflict must still be evaluated within authority, scope, compatible specificity, and explicit-supersession rules.

This is a confirmed PM project-governance correction. It is not a Sponsor/Supervisor decision and cannot govern outside PM authority, but it controls repository handling of sources unless a competent higher authority supplies a conflicting project-governance rule.
