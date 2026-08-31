# ENMORI Scrum Output Formats

Use these headings and fields unless a shorter subset is explicitly requested. Describe every proposed external change in plain language before showing a tool-specific payload.

## Sprint planning preview

- **Sprint identity and dates:** name, start, end, planning evidence timestamp.
- **Sprint Goal:** one measurable outcome.
- **Capacity:** each member's approved hours, allocated hours, remaining hours; team total and no-buffer warning when allocation is 100h.
- **Selected PBIs:** source, acceptance criteria summary, Points, task hours, owner, different reviewer, tests, dependencies, platform/device gates.
- **Rejected or deferred PBIs:** readiness or prioritization reason.
- **Member allocation:** implementation, PM, meeting, review, test, documentation, and rework work counted together.
- **Dependencies, blockers, and risks:** responsible party or dependency and next review point.
- **Ready/Done exceptions:** none, or explicit blocked scope and required decision.
- **GitHub Projects preview:** proposed issue, owner, reviewer, iteration, field, and status changes.
- **Notion preview:** proposed meeting, decision, Review, or Retro records; never duplicate authoritative task status.
- **Decisions required:** exact PM approvals or unresolved choices.

## Mid-Sprint rebalance preview

- **Goal health:** on track, at risk, or blocked, with evidence.
- **State and WIP snapshot:** observed status by owner and any limit violations.
- **Hours drift:** estimate, actual-to-date, remaining estimate, and capacity impact.
- **Blocker aging:** start date, owner/dependency, attempts, and next review point.
- **Proposed changes:** reassignment, split, status, dependency, or scope options.
- **Impact:** Goal, capacity, reviewer, testing, platform, and carryover effects.
- **External changes preview:** plain-language GitHub Projects and Notion changes, followed by any payload.
- **Approval boundary:** identify the exact preview awaiting PM approval; do not imply it has been applied.

## Sprint close report

- **Done evidence:** PBI, Points, actual hours, reviewer, tests, platform evidence, PM acceptance, merge, and final GitHub status.
- **Carryover options:** backlog reconsideration, split, re-estimate, or defer; no automatic recommitment.
- **Planned versus actual hours:** by member and work category, plus total.
- **Points completed:** report separately from hours.
- **Sprint Review outcomes:** Goal result, demonstrated increments, stakeholder feedback, and decisions.
- **Retrospective:** observations, evidence, agreed actions, owners, and target dates.
- **Source updates needed:** requirement, decision, traceability, open-question, or repository records.
- **External changes preview:** proposed GitHub Projects and Notion closure updates awaiting exact PM approval.

## Async Daily

| Member | Completed | Next | Blocker | Estimated-hours change | Help/review needed |
| --- | --- | --- | --- | ---: | --- |
| Name | Observed completion | Planned next action | None or concrete blocker | Delta and new estimate | Person or decision needed |

Flag WIP, capacity, dependency, reviewer, and device risks. An Async Daily reports and escalates; it does not silently change assignments, status, or Sprint scope.
