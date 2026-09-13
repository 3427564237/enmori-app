# Sprint 2 execution plan

- Authority: [S-PM-0913-SPRINT2](../decisions/2026-09-13-sprint2-scope-capacity-contract.md)
- Team: LI, SHI, JIN ZIHAN, DU KUN, ZHOU
- Sprint: 14–27 September 2026; primary execution: 14–25 September; Asia/Singapore
- Baseline: `31bdb78574ca04f50d42954816ad33d709f89ca4`
- Publication: [English work-package payloads](2026-09-13-sprint2-publication-preview.md); local preparation is not external publication or In Progress

## 1. Sprint 2 Goal

A member can continue from Check-in, maintain their own interests, and browse matching Event recommendations retrieved through the real Backend.

Sprint 1 is complete within its accepted scope: Issues #1–#6 and their Project items were Done at the planning checkpoint, with no open Issues or PRs. Deferred accessibility, the bounded 800x360 evidence and Pending historical provenance remain recorded; no automatic carry-over is scheduled. AI and Friend internal components are additional engineering outputs, not complete user features.

## 2. Capacity

| Member | Planned hours | Main PBIs | Integration | Review | Coordination/evidence | Buffer |
|---|---:|---:|---:|---:|---:|---:|
| LI | 21 | 16 | 0 | 2 | 1 | 2 |
| SHI | 21 | 16 | 0 | 2 | 1 | 2 |
| JIN | 20 | 12 | 3 | 2 | 1 | 2 |
| DU | 20 | 15 | 0 | 2 | 1 | 2 |
| ZHOU | 22 | 17 | 0 | 2 | 1 | 2 |
| **Total** | **104** | **76** | **3** | **10** | **5** | **10** |

Average: 20.8h/member/Sprint, approximately 10.4h/member/week. Sprint 1 planned 78h, so this plan adds 26h (33.3%); actual Sprint 1 time is unavailable and is not inferred. The former 100h capacity ceiling increases by 4% for this Sprint only, explicitly accepted by LI. ZHOU has slightly more time for runtime complexity. Estimates include owner verification. Story Points are relative estimates, not converted from hours.

## 3. Sprint 2 Scope

### Must

- Own Interest selection, save and later read, including empty and stale-version behavior.
- Persisted synthetic Event data and Q03 deterministic Backend recommendation.
- Flutter Home Top 2 and independently recomputed See All, loading/empty/error/retry states.
- A runnable Check-in → interests → Event flow without regression to Sprint 1 Auth/consent/Note behavior.
- Independently testable Friend ranking and bounded AI runtime components.
- Incremental integration, different-reviewer approval and one final Android smoke.

Use the linked minimum contract for the four new interfaces, collections, privacy, concurrency, synthetic data and module boundaries. Existing account and Check-in API behavior remains compatible.

### Should

ZHOU may run one real Qwen transport/parser smoke if an existing authorized host is available, within 2h released from ZHOU's buffer by LI. Do not install infrastructure or consume Event capacity. Missing host means Not Run; this is not Q31-E or product acceptance.

### Explicitly Deferred

AI product UI, independent AI consent management, Conversation persistence/deletion/expiry, Persona; production Friend candidates/UI, Add Friend, Friends Activity; Event Interested/Going/external registration/participant disclosure, real feeds, publication and Admin CRUD; Mood, Weather, location, Calendar/Footprint; iOS product work, major refactoring, new frameworks, performance projects and optional polish. Release Must priority is unchanged.

## 4. Sprint Backlog

IDs below are local planning IDs, not GitHub issue numbers. No supporting member is required for a main PBI. Review assignments are separate from implementation ownership. Emulator means Android or Firebase Emulator as applicable.

| PBI | Feature / user value and scope | Owner | Hours | SP | Dependencies | Physical Android | Emulator | Automated | Acceptance / verification |
|---|---|---|---:|---:|---|---|---|---|---|
| S2-01 | Own interests vertical slice: user controls recommendation inputs through UI, repository, API and persistence | LI | 16 | 5 | Recorded minimum contract; existing Auth/account mapping | No | Yes | Yes | Save/read 0–10 distinct controlled Tags; preserve/remove existing inactive references; reject invalid/new-inactive choices and stale revision safely; owner authorization; unit/widget/API/Firebase tests |
| S2-02 | Event recommendation Backend and synthetic records: persisted inputs produce meaningful results | SHI | 16 | 5 | Fixed Interest mapping and existing Backend; not LI UI | No | Yes | Yes | Active/published/upcoming positive matches only; Q03 total order; Home is first two of full ordering; empty is successful; safe failure; API/Firebase integration |
| S2-03 | Event Flutter flow: Check-in/Home → interests/Top 2 → See All | DU | 15 | 5 | Fixed S2-01/02 DTOs; their implementations for final integration | No | Yes | Yes | Preserve Backend order; title/time/reason; Q16 empty copy; explicit retry; fresh results after interest save; widget and Android Emulator flow |
| S2-04 | Friend ranking internal component: verified logic for later product integration | JIN | 12 | 3 | Q03/Q17; typed authorized fixtures only | No | No | Yes | Deduplicate authorized inputs; shared-interest/common-event formula; reject zero factor; all tie-breaks before Top 2; no prohibited fields; production eligibility not claimed |
| S2-05 | AI internal runtime component: reduce later bounded AI integration risk | ZHOU | 17 | 5 | Q31; injected clock/transport; no live host dependency | No | No | Yes | One generation/two queued; one non-terminal per user; 60/5/45 budgets; cancellation and late-output/resource-release tests; no auto retry; strict Q31 JSON parsing |
| S2-06 | Event cross-feature automated verification | JIN | 3 | — | Incremental S2-01/02/03 | No | Yes | Yes | Auth/onboarding → Note → interest save → Event → See All; empty and one dependency recovery; reuse owner evidence |
| S2-07 | Different-reviewer checks | Named per §5 | 10 | — | Incremental owner outputs | No | No | No | Five 2h allocations; explicit findings/disposition; no self-review |
| S2-08 | Coordination, decision record, evidence, Sprint Review and final smoke | Each member | 5 | — | Incremental delivery; integrated version for smoke | LI only | No | No | 1h/member; LI approximately 0.5h smoke plus 0.5h decision/coordination; others short review/evidence work |
| S2-09 | Bug/uncertainty buffer | Each member | 10 | — | Specific issue and LI allocation | As needed | As needed | As needed | 2h/member; no prefilled additional feature |
| **Total** | | | **104** | | | | | | |

S2-05 excludes model-token measurement, semantic safety acceptance, current-authority revalidation and Conversation lifecycle. S2-04 excludes live source authorization/discoverability. Those omissions are component boundaries, never permission to expose an incomplete production route.

## 5. Member Ownership

| Member | Main responsibility | PBIs | Total | Review duty | Blocking risk |
|---|---|---|---:|---|---|
| LI | Own-interest full slice; PM; one final smoke | S2-01, shares of 07–09 | 21h | S2-03 | Fix contract once; avoid becoming all-PBI reviewer |
| SHI | Event Backend and own fixture/environment verification | S2-02, shares of 07–09 | 21h | S2-04 and S2-06 | Seed own synthetic records; no wait for Interest UI |
| JIN | Independent Friend component; 3h Event gate | S2-04/06, shares of 07–09 | 20h | S2-05 | Main component closes without Event/device handoff |
| DU | Full Event client flow and Emulator tests | S2-03, shares of 07–09 | 20h | S2-01 | Fixed DTOs and existing fakes first; real API in Week 1 |
| ZHOU | Bounded AI component | S2-05, shares of 07–09 | 22h | S2-02 | Fake transport/clock acceptance; no host prerequisite |

Reviewers of the main PBIs are DU → S2-01, ZHOU → S2-02, LI → S2-03, SHI → S2-04/06, JIN → S2-05. No review-of-review chain is introduced. Every member can begin independent main work, with at most one primary In Progress PBI. JIN is not responsible for writing all tests.

## 6. Dependency Check

The recorded minimum contract enables S2-01, S2-02 and S2-03 to start in parallel. SHI uses the fixed account-interest mapping and synthetic records, not LI's editor, for Backend verification. DU uses existing fake techniques against fixed DTOs and integrates real endpoints in Week 1. S2-01/02 converge into S2-03 and S2-06; S2-04/05 remain independent. There is no four-owner sequential development chain.

## 7. Device Check

JIN and DU need no other member to execute physical Android acceptance for their PBIs. Their primary work closes on automated/Emulator evidence. No newly scoped hardware permissions, external-app return behavior or unreliable Emulator-only hardware path is included. LI's approximately 0.5h final team smoke is explicitly budgeted in S2-08; SHI and ZHOU have no hidden Android work. Device findings become scoped defects, preferably reproducible in automation, followed only by affected-path revalidation.

## 8. Two-Week Execution

### Week 1

Record approved decisions and prepare owner work packages. Fix the minimum shared API/data mapping. Start all five main PBIs. LI supplies Interest save/read; SHI supplies persisted Event results; DU wires real endpoints before the end of Week 1. Demonstrate interest save → Backend ranking → Flutter results at least once in Week 1. Review increments as they arrive. JIN and ZHOU independently implement and verify their components.

### Week 2

Close owner ACs, persistence/empty/error/order cases and JIN's 3h cross-feature checks. Fix concrete defects and obtain independent dispositions. Do not defer first integration or core implementation to the last two days. Cut out-of-component AI/Friend expansion immediately.

### Sprint End

Use the primary execution period's close for one Android smoke, short Review, evidence and normal merge/closure/LI acceptance. Show the Event product chain and clearly separate internal-module demonstrations. September 26–27 is not a planned development catch-up period.

## 9. Critical Path

| Risk / dependency | Impact | Mitigation | Owner |
|---|---|---|---|
| Interest API/mapping churn | Three members rework | Record and fix shared mapping before concurrent integration | LI |
| Event data exists only in client fakes | No runnable real Increment | SHI owns synthetic initialization and persistence proof | SHI |
| Client connects only in Week 2 | Late failures | Fixed DTO tests followed by real API in Week 1 | DU |
| AI scope growth or unavailable host | Capacity loss | Internal component Must; live smoke Should only | ZHOU |
| Device/integration burden recentralizes | Sprint 1 handoff loop returns | Owner tests, JIN 3h gate, LI one budgeted smoke | JIN |

## 10. Definition of Done

Implementation and bounded AC complete; required analyzer/type/unit/widget/API/Emulator checks pass; Event chain uses real Backend/Firestore; no known main-flow-blocking bug; Auth/authorization/privacy/concurrency preserved; owner self-test and different-reviewer approval; applicable Event integration gate; only explicitly needed device evidence; normal merge and Issue/Project closure with LI scope acceptance. Record versions, commands/environment and Pass/Fail/Blocked/Not Run without raw private content.

Internal Friend/AI components close against their own ACs without full product integration or proxy device testing. Sprint completion is not full Week 9 Release completion. Writing this plan does not claim implementation, verification, publication, merge or Done.
