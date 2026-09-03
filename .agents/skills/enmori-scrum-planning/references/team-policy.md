# ENMORI Team Policy

## Process identity

ENMORI uses Scrum-inspired planning with PM direct assignment. Members surface feasibility, dependency, and capacity conflicts; LI HOURUI retains final priority, assignment, and Sprint-scope acceptance authority.

## Skill operators and invocation

All five members retain this Skill so its team rules and output formats are shared, but invocation is explicit-only and daily coding does not invoke it.

- LI HOURUI is the primary operator and may use it for refinement, assignment, Sprint Planning, rebalance, Review, Retrospective, and closure within applicable authority.
- SHI ZHENGQI may use it only when LI delegates a specific read-only analysis or preview. That delegation does not authorize an external write or planning decision.
- JIN ZIHAN, ZHOU YAOYIN, and DU KUN may use it only when LI explicitly names a planning or reporting task for them.
- No member may self-assign, reprioritize, expand Sprint scope, change external state, or write GitHub/Notion planning state without LI's exact approval of the current preview.
- During ordinary coding, follow the assigned Issue, reviewer chain, `AGENTS.md`, and only the applicable implementation/test Skills.

## Team and capacity

| Member | Default direction | Sprint capacity |
| --- | --- | ---: |
| LI HOURUI | PM; Flutter frontend and AI support | 20h |
| SHI ZHENGQI | DPM; backend | 20h |
| JIN ZIHAN | Testing lead; strategy, automation, integration, UAT | 20h |
| ZHOU YAOYIN | AI, algorithms, Qwen/Ollama, approved backend integration | 20h |
| DU KUN | UI/UX, Flutter UI, macOS/iOS device validation | 20h |

The Sprint ceiling is 100h. All implementation, PM, meeting, review, test, documentation, and rework hours count. Warn at exactly 100h because no buffer exists; do not reduce capacity automatically. Reject a higher total or a member above 20h unless LI explicitly changes that Sprint's capacity.

Where one approved PBI contains legitimate, non-duplicative work that can be decomposed across all five members, keep proposed member workload approximately balanced. Balance does not require artificial equality and must not invent or broaden scope, assign work outside competence, duplicate evidence, permit self-review, or weaken dependency/platform gates. Record an evidence-based reason and obtain explicit PM acceptance for any material imbalance. This prospective rule is introduced by S-PM-0903-RMVP01A-STAFF-REV; it was not part of the earlier policy.

## Estimation and Ready

Use Story Points 1, 2, 3, 5, or 8. Split anything larger than 8. Every task has estimated hours. A PBI is Ready only with an evidence-backed source, testable acceptance criteria, scope boundary, resolved affected blockers, dependencies, accepted Points, estimated task hours, PM-assigned owner, different reviewer, and platform/device gates.

## Workflow and WIP

GitHub Projects owns execution state: Backlog -> Ready -> In Progress -> In Review -> Done, with Blocked branching from active work. Each member owns at most one primary In Progress task and may review other work. A Blocked item records the blocker, responsible party or dependency, and next review point. Carryover returns to PM consideration; never recommit it automatically.

Notion owns meeting notes, decisions, Sprint Review, and Retrospective. Do not duplicate authoritative task status in Notion.

## Assignment and review

LI directly assigns every task. Owner and reviewer must differ. Prefer DU or LI for UI/Flutter review; SHI for backend review; ZHOU or LI for AI/algorithm review; JIN for test-artifact review; and LI/SHI cross-review for requirements and governance. LI may adjust this mapping without permitting self-review.

Every implementation owner writes or updates relevant tests. JIN owns the strategy, cross-feature/integration verification, and UAT evidence, not all test implementation.

## Completion chain

Done requires owner implementation and self-test, different-reviewer approval, JIN's gate where integration/UAT applies, analyzer and relevant tests, required platform evidence, no unresolved high-priority review issue, updated traceability/docs, repository hygiene, LI's scope acceptance, merge, and GitHub Project status Done. Low-risk documentation may skip JIN but never the different reviewer.

## iOS gate

Every iOS-dependent PBI assigns DU to macOS/iOS device validation, JIN to scenario/evidence review, and another qualified member to code review. Evidence records device model, OS version, command, result, and useful screenshot, recording, or log in the Issue or PR. Treat DU availability as a dependency and single-point risk. Android/Linux evidence cannot substitute for iOS evidence.
