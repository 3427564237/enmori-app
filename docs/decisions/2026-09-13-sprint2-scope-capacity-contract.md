# Sprint 2 scope, capacity and minimum delivery contract

- **Source ID:** S-PM-0913-SPRINT2
- **Status:** Confirmed by LI HOURUI in Sprint Planning; recorded following the instruction to implement the proposed plan
- **Decision owner:** LI HOURUI, ENMORI PM
- **Sprint:** 2026-09-14 through 2026-09-27, Asia/Singapore; primary execution 2026-09-14 through 2026-09-25
- **Plan:** [Sprint 2 execution plan](../planning/2026-09-13-sprint2-plan.md)
- **Baseline:** `31bdb78574ca04f50d42954816ad33d709f89ca4`, the merged Sprint 1 closeout

## Confirmation and authority

LI selected “Event main flow plus independent AI/Friend modules” rather than a complete AI Conversation or history Sprint. LI then explicitly accepted the minimum contract, 0–10 own interests, synthetic Event data over a real Backend/Firestore flow, internal-only AI/Friend components, and 104h including 10h buffer. LI subsequently requested implementation of the proposed plan, including its assignments and estimates.

This is a PM decision within project scope, not Sponsor approval, implementation evidence, independent review, or Release acceptance. It preserves S-PM-0901-SCOPE Week 9 priorities and the approved architecture, Q03 formulas, Q17 allowlists, Q12 catalogue lifecycle, Q16 empty states, Q14 retention and Q31 runtime rules.

## Bounded changes and supersession trail

| Earlier source/boundary | Sprint 2 decision | Unchanged boundary |
|---|---|---|
| Team policy: 20h/member, 100h/Sprint | LI 21h, SHI 21h, JIN 20h, DU 20h, ZHOU 22h; 104h total for Sprint 2 only | All review, coordination, evidence, rework and buffer count; no permanent capacity change |
| S-PM-0903-RMVP01A-STAFF / STAFF-REV: Sprint 1 78h, task-based balance | New independently owned Sprint 2 PBIs and direct reviewer mapping | Historical allocation and review results remain intact; no self-review |
| Earlier Sprint 2 theme/refinement candidates | Event user flow plus two bounded internal components | Release Must priority is not equivalent to delivery or Ready evidence |
| S-PM-0902-Q12 leaves user Interest cardinality and physical API mapping undecided | 0–10 distinct controlled interests and minimum interfaces below | Typed IDs, active/inactive rules, authorization and catalogue rules remain controlling |
| RMVP-01A excludes interests and recommendations | Add them only in Sprint 2 | No retroactive expansion of the completed Sprint 1 scope |

Sprint 1 was accepted in [Issue #1](https://github.com/3427564237/enmori-app/issues/1#issuecomment-5653230699), following [SHI's review](https://github.com/3427564237/enmori-app/pull/23#pullrequestreview-5190645647). Its deferred/Pending rows remain as recorded. They are neither automatic Sprint 2 Must work nor a blanket exemption for new functionality.

## Minimum Interest and Event contract

Interest management follows completed onboarding and is not a new registration requirement. An empty selection is valid. Users read and modify only their own choices; identity comes from verified Auth and the existing account mapping, never a body-supplied owner.

| Interface | Approved boundary |
|---|---|
| `GET /v1/interest-tags` | Active controlled Tag IDs and display names for selection |
| `GET /v1/me/interests` | Own selected IDs, safe labels, lifecycle states and revision; missing selection reads as empty with revision 0 |
| `PUT /v1/me/interests` | `interestTagIds` and `expectedRevision`; return complete selection and resulting revision |
| `GET /v1/recommendations/events?view=home\|all` | One Backend-captured `asOf`; full eligible-set ordering; Home returns Top 2, All returns the complete eligible result set |

The Interest write validates revision, 0–10 distinct IDs, and active status for new assignments in one protected transaction boundary. Existing inactive references may be retained or removed, never newly assigned. A stale revision yields 412 and requires a fresh read; invalid interests yield 422. Existing Auth, onboarding and dependency errors and the error envelope are reused. No automatic overwrite is allowed.

The new collections are `interest_tags`, `account_interests`, and `events`. Own interests relate to the existing accountId. The existing `uid_` plus unpadded base64url UID mapping stays unchanged. Check-in visibility must not be used as Profile privacy. Do not broaden existing account/Check-in DTOs to expose these separate records.

Event records contain opaque identity, title, active/published status, start/end UTC instants and Interest Tag references. Recommendation responses contain `asOf`, `formulaVersion` and `items`; each item contains Event identity, title, start/end times, matched safe Interest labels and a deterministic reason code. Empty `items` is successful empty, not dependency failure. No recommendation history is persisted.

Q03 supplies eligibility (`startAt > asOf`, active, published, positive active-Tag match), score and total ordering: match count descending, start time ascending, then canonical Event ID ascending. Qwen, Check-in, location, popularity and Event Category never score. Home and See All recompute independently; no snapshot or pagination continuity is introduced.

Flutter reuses existing presentation/navigation conventions for an Interest editor, Home recommendation section and See All. It preserves Backend ordering and implements loading, Q16 empty copy, error and explicit retry. Check-in success can lead into this flow. No Interested/Going, registration URL, participant disclosure or new design system is included.

Normative OpenAPI and physical implementation must follow this approved boundary. Unspecified wire property names or record mechanics must not be misrepresented as already approved by an earlier source; the assigned owner records the concrete mapping with the affected contract work before shared integration.

## Data and environment boundary

SHI owns a small synthetic catalogue/Event fixture and controlled initialization in an isolated demonstration environment, plus separate Firebase Emulator verification. Data flows through real Backend/Firestore. This is not an integration with a real Event publisher. Initialization targets only named synthetic records, does not overwrite existing accounts, and does not authorize production access, general imports, or unrelated resets. No catalogue/Admin mutation API or Event publishing system is added.

## Internal Friend and AI components

**Friend component:** consume typed, already-purpose-authorized Interest/Event projections; deduplicate, compute `2 × shared interests + common Events`, exclude zero scores and apply Q03's full tie-break before Top 2. Its input precondition is explicit: it does not establish production discoverability, relationship eligibility, or source authorization. No public endpoint, real candidate reader or UI is delivered by this component.

**AI component:** internal scheduling, one generation/two queued requests, one non-terminal request per user, the approved 60s overall / 5s queue / 45s generation budgets, cancellation, exact resource release, no automatic retry and strict Q31 output parsing. Deterministic tests use an injected clock and transport. No public AI route, Conversation persistence, user entry point or model installation is included.

These components cannot be represented as complete AI Assistant, Friend Recommendation, or Q31-E acceptance. Loaded-model token measurement, semantic safety, current-authority revalidation, Conversation lifecycle and real-host evidence remain later integration obligations. An optional existing-host smoke is at most 2h from ZHOU's released buffer, not a main-flow dependency.

## Ownership, platform and completion

The linked plan assigns each major PBI one owner and a different reviewer. JIN and DU require no physical Android substitute operator for their PBIs. LI owns one final approximately 0.5h Android smoke within the explicit coordination/evidence allowance. No SHI/ZHOU device work is implicit.

Owner tests and different-reviewer approval remain required. JIN's cross-feature gate is limited to the Event Increment; SHI reviews JIN's own artifacts/results. Internal components can close independently of physical-device evidence. Normal merge, Issue/Project closure and LI scope acceptance remain observed actions, not consequences of writing this record.

No new infrastructure, dependency, architecture, full iOS product work or widening of retention/privacy authority is approved. GitHub/Notion publication is a separate external action using the exact prepared payload; this local record does not claim it occurred.
