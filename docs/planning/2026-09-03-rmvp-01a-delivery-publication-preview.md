# RMVP-01A delivery publication preview — 2026-09-03

- **Preview ID:** RMVP01A-PUBLISH-PREVIEW-0903-R1
- **Status:** Proposed; awaiting exact destinations/accounts and PM approval immediately before external writes
- **Authority:** S-PM-0903-RMVP01A-START
- **Product coding:** Held; no work item moves to `In Progress` from this preview
- **Proposed Sprint dates:** 2026-09-04 through 2026-09-17, Asia/Singapore; subject to PM confirmation

## Sprint Goal

Deliver a runnable Android vertical Increment in which a new ordinary member registers with Firebase email/password, completes onboarding Username and either approved Initial Choice branch, creates one valid Note-only Check-in, sees a safe success result, and can later read the persisted Check-in through the controlled Backend.

## Capacity

| Member | Sprint capacity | RMVP-01A allocation | Unallocated reserve |
|---|---:|---:|---:|
| LI HOURUI | 20h | 16h | 4h |
| SHI ZHENGQI | 20h | 16h | 4h |
| DU KUN | 20h | 15h | 5h |
| ZHOU YAOYIN | 20h | 15h | 5h |
| JIN ZIHAN | 20h | 16h | 4h |
| **Team** | **100h** | **78h** | **22h** |

The 22h reserve is unassigned capacity for ordinary meetings, coordination, defects and uncertainty. It does not authorize another PBI or expand RMVP-01A.

## Selected PBI

- **PBI:** RMVP-01A — Authenticated entry and first persisted Check-in
- **Priority:** Week 9 Release MVP first vertical slice
- **Status on publication:** `Ready`
- **Estimate:** `8 SP`; not derived from task hours
- **Task hours:** 78h
- **PBI owner:** LI HOURUI
- **Different overall reviewer:** JIN ZIHAN
- **Platform:** Android product implementation/evidence for Week 9; complete iOS product implementation deferred
- **Acceptance source:** RMVP-01A R2 contract, UAT-B-0902-R2 and bounded Q04 R1 acceptance
- **Done conditions:** owner tests, independent component reviews, controlled Backend/Firebase Emulator evidence, Android evidence, bounded Q04/accessibility evidence, JIN gate, LI terminal review, traceability, merge and PM scope acceptance

## Git baseline publication preview

The repository currently has no configured Git remote. `docs/SOURCE_MAP.md` identifies `https://github.com/3427564237/nexus-five-project-records` as the source repository, but this does not by itself prove that it is the intended development remote.

After the PM confirms the target repository:

1. run the repository integrity/link/whitespace checks and `git diff --check`;
2. create one stable documentation/planning baseline commit containing the already approved records and no product implementation;
3. add the confirmed remote only if it is still absent;
4. inspect remote refs and history before pushing;
5. push without force only when histories are compatible; otherwise stop and report the divergence; and
6. record the observed remote branch/commit URL in the kickoff page.

No remote creation, force push, history replacement or credential change is proposed.

## GitHub Projects preview

Use one parent PBI and five compact member work packages. R1–R16 remain traceability IDs/checklist entries rather than sixteen separate management issues.

### Parent PBI

**Title:** `RMVP-01A — Authenticated entry and first persisted Check-in`

**Fields:**

- Status: `Ready`
- Priority: `Must / first vertical slice`
- Points: `8`
- Planned hours: `78`
- Owner: LI HOURUI
- Overall reviewer: JIN ZIHAN
- Iteration: proposed 2026-09-04 through 2026-09-17
- Platform: Android Week 9; iOS product deferred

**Body summary:** Sprint Goal, links to the approved R2 contract/Q04/UAT/START decision, exact scope exclusions, five child work packages, review topology and Done conditions. Every test/UAT result begins `Not Run`.

### Member work packages

| Proposed issue | Named owner | Hours | Included approved task IDs | Different review/evidence path | Initial status |
|---|---|---:|---|---|---|
| Flutter entry, onboarding and Check-in integration | LI HOURUI | 16h | R1, R2, R3, R16 | DU reviews R1; SHI reviews R2; LI reviews only SHI/DU/JIN outputs, never own artifacts | Ready |
| Backend contract and cross-artifact review | SHI ZHENGQI | 16h | R4, R5A, R5B | LI reviews R4 contract conformance; SHI independently reviews JIN R12–R14 artifacts | Ready |
| Bounded Android UI and device evidence | DU KUN | 15h | R6, R7, R8 | LI reviews DU UI/device output; DU independently reviews LI Flutter integration | Ready |
| Firebase/Firestore infrastructure and controlled environment | ZHOU YAOYIN | 15h | R9, R10, R11 | SHI reviews infrastructure/environment; ZHOU reviews SHI-to-infrastructure boundary only | Ready |
| Test strategy, integration/UAT evidence and overall gate | JIN ZIHAN | 16h | R12, R13, R14, R15 | SHI independently reviews every JIN artifact/result; LI terminally reviews R15 | Ready |

Each issue links to the parent PBI and lists its internal predecessors. No issue becomes `In Progress` until the shared baseline and kickoff page are published and LI confirms the team briefing.

## Notion kickoff/decision page preview

Create one new page in the team's confirmed project/wiki or decision-log parent.

- **Title:** `RMVP-01A Delivery Kickoff — Authenticated entry and first persisted Check-in`
- **Date:** 2026-09-03
- **Status:** Accepted / Ready for team kickoff
- **Domain:** Product / Operations
- **Owner/decider:** LI HOURUI
- **Audience:** all five ENMORI members

### Page content

1. **Why now:** requirements are sufficiently bounded; further micro-approval is replaced by in-Sprint engineering judgment and Done evidence.
2. **Sprint Goal:** the exact runnable Android vertical outcome above.
3. **Included/excluded scope:** the approved RMVP-01A boundary and explicit exclusions.
4. **Who does what:** the five compact work packages, hours and review relationships.
5. **How work moves:** GitHub is authoritative for `Ready → In Progress → In Review → Done`; one primary In Progress issue per member.
6. **Quality agreement:** owner tests, different reviewer, JIN gate where applicable, controlled emulator data, no secrets, Android/Q04/accessibility evidence and LI acceptance.
7. **Links:** stable Git commit, GitHub Project, parent PBI, five work packages, R2 contract, Q04 decision and UAT baseline.
8. **Kickoff confirmation:** each member acknowledges their issue, dependencies and reviewer before moving it to `In Progress`.

Notion does not copy live issue status, defect lists or task checklists from GitHub.

## Deferred/rejected work

Mood, Weather, Activity, Approx Location, AI, Recommendation, Add Friend/Friend Request, deletion propagation, Calendar, Footprint and complete iOS product implementation remain outside this Sprint. No spare capacity may be used to add them without a separate scope change.

## Required publication inputs

External publication cannot safely proceed until the PM supplies or confirms:

1. the intended GitHub development repository URL — specifically whether `https://github.com/3427564237/nexus-five-project-records` is the correct target;
2. the GitHub usernames for LI HOURUI, SHI ZHENGQI, DU KUN, ZHOU YAOYIN and JIN ZIHAN;
3. the target GitHub Project, or authorization to create one in the confirmed repository/organization;
4. the target Notion parent page/database URL and a connected Notion app for this session; and
5. the proposed 2026-09-04 through 2026-09-17 Sprint dates, or corrected dates.

After those values are inserted, the updated exact payload requires one final PM approval immediately before GitHub/Notion writes. A changed destination, assignment, date or issue body requires a refreshed preview.
