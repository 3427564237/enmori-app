# ENMORI Scrum Workflows

Read `team-policy.md` before using any workflow. Treat repository evidence and observed external state as facts; label drafts and suggested changes as proposals.

## Refine

1. Read the repository source-of-truth documents and identify open questions affecting each PBI.
2. Verify an evidence-backed source, testable acceptance criteria, scope boundary, dependencies, Points, task-hour estimates, owner, reviewer, relevant tests, and platform or device gates.
3. Classify each item as Ready or Not Ready. Give concrete reasons for every Not Ready result; do not invent missing requirements or silently settle conflicts.
4. Report refinement changes as a preview. Refinement does not approve the underlying requirement.

## Plan

1. Load the Ready backlog and the previous Sprint's available evidence. Report carryover separately and never select it automatically.
2. Draft one measurable Sprint Goal.
3. Rank candidates by PM priority, dependency-unblocking effect, value, and readiness. Do not use ranking to override an explicit PM priority.
4. Assign work directly within individual and total capacity, reviewer-separation, WIP, testing, and device rules.
5. Produce complete Sprint, GitHub Projects, and Notion previews using `output-formats.md`.
6. Stop and request exact PM approval for that preview immediately before any external write. Approval of an earlier or changed preview does not authorize the current write.

## Rebalance

1. Compare observed work state with the Sprint Goal, WIP, blockers, hours, dependencies, reviews, and iOS risk.
2. Identify drift without treating estimates as actuals or proposals as applied state.
3. Propose reassignment, splitting, dependency action, or Sprint-scope negotiation. Preserve the Goal where feasible and show the impact of every option.
4. Preview all assignment, status, scope, GitHub Projects, or Notion changes and obtain exact PM approval before applying them.

## Close

1. Validate each candidate Done item against the completion chain and required platform evidence.
2. Separate Done work from carryover. Return unfinished work to backlog consideration without automatically recommitting it.
3. Compare planned and actual hours, and report completed Points without converting Points into hours.
4. Draft the Sprint Review and Retrospective using `output-formats.md`, including actions, owners, and source updates still needed.
5. Preview any GitHub Projects or Notion closure changes and obtain exact PM approval before applying them.

## Stop conditions

Stop the affected operation and explain the resolution needed when any of these applies:

- an authoritative conflict or open question affects the scope;
- acceptance criteria, source, Points, or task-hour estimates are missing;
- an individual or Sprint plan exceeds approved capacity;
- owner and reviewer are the same person;
- the WIP limit would be violated;
- required iOS evidence is missing;
- a requested external-write connector is unavailable; or
- exact PM approval for the current preview is absent.

Block only the affected scope. Continue safe analysis or preview work elsewhere when possible. Never implement product work while executing these planning workflows.
