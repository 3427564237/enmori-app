# Sprint 2 publication preview

**Local payload only.** No Issue, Project iteration, status, PR or Notion page has been created by this file. GitHub owns execution state. Do not publish source links until the reviewed decision/plan baseline is available on the team remote. Do not infer successful publication from this preview.

## Destinations and publication order

- Repository: `3427564237/enmori-app`.
- Project: [ENMORI Project #1](https://github.com/users/3427564237/projects/1).
- Iteration to create/select: `Sprint 2`, start `2026-09-14`, duration 14 days; working window ends `2026-09-25`.
- Create one coordination parent and five owner packages using the exact English titles/bodies below; then link returned Issue URLs to the parent and packages. S2 IDs are plan IDs, never guessed issue numbers.
- Proposed initial Project state: `Ready` once the shared approved baseline and work packages are available; no automatic In Progress, test Pass or Done. Preserve one-primary-PBI WIP.
- Parent 104h is a roll-up; sum the five child envelopes only for team effort. Do not add parent hours to child hours.
- Parent is a Sprint coordination item, not another estimated product PBI. Do not assign summed Story Points to it.
- No team mention, reminder, email or Notion write is included in this publication payload.
- Source record for every body: `docs/decisions/2026-09-13-sprint2-scope-capacity-contract.md`; execution plan: `docs/planning/2026-09-13-sprint2-plan.md`. When published, link to the reviewed immutable baseline rather than an unpublished file.

## Parent title

Sprint 2 — Own interests and integrated Event recommendations

## Parent body

### Goal

A member can continue from Check-in, maintain their own interests, and browse matching Event recommendations retrieved through the real Backend.

### Planning

- Sprint: 14–27 September 2026, Asia/Singapore; primary execution 14–25 September.
- PM: LI HOURUI (@3427564237).
- Total: 104h; LI 21h, SHI 21h, JIN 20h, DU 20h, ZHOU 22h.
- Included: 76h main PBIs, 3h cross-feature verification, 10h review, 5h coordination/evidence and 10h buffer.
- Source authority: S-PM-0913-SPRINT2 and the linked execution plan; preserve approved architecture, Q03/Q12/Q14/Q16/Q17/Q31.
- Initial evidence: Not Run. Source preparation is not implementation, UAT or Done.

### Included output

Own Interest save/read; synthetic Event records through real Backend/Firestore; deterministic Home Top 2 and See All with safe states; Check-in-to-Event navigation; independent Friend ranking and internal AI runtime components; owner tests, one Event integration gate and one final LI Android smoke.

The Event main flow must first integrate in Week 1. AI/Friend components do not expose product routes and do not claim complete recommendation eligibility or AI safety/lifecycle acceptance.

### Exclusions

Full AI Conversation/Persona, production Friend discovery, Add Friend/Friends Activity, Event Interested/Going/external registration/participants, Admin or Event publishing, real Event feeds, Mood/Weather/location/history, full iOS product work, refactors and new infrastructure. Keep Sprint 1 deferred/Pending evidence unchanged.

### Delivery and closure

Five owner packages use the exact allocations below. Owners implement their own tests. JIN owns only 3h of cross-feature Event verification; SHI reviews JIN's artifacts. LI owns one approximately 0.5h final Android smoke. JIN and DU require no proxy physical-device verification to complete their packages.

Close after bounded implementation/AC/tests, independent review, real Event integration, needed smoke, normal merge, consistent board state and LI Sprint-scope acceptance. No full Week 9 Release claim follows.

## LI package

**Title:** Sprint 2 / S2-01 — Own interests vertical slice — LI

**Assignee:** `3427564237` · **Reviewer:** DU KUN · **Main estimate:** 5 SP / 16h · **Total member envelope:** 21h

### User value and scope

Allow the authenticated, onboarded member to manage 0–10 distinct controlled Interest Tags and recover the saved selection. Own the Flutter editor, repository/controller, catalogue/own-interest API and persistence. Follow S-PM-0913-SPRINT2; do not expand registration or Profile fields.

### Acceptance and verification

- Empty selection is valid; valid choices survive a later Backend read.
- Active values can be newly assigned; existing inactive references can be preserved or removed but not newly assigned.
- Backend derives account ownership; another identity cannot read/write this member's selection.
- Transactional revision/Tag checks reject stale or invalid input safely; refresh is required on conflict.
- Relevant unit, widget, API and Firebase Emulator checks pass; existing Auth/Note behavior remains compatible.

Dependencies: recorded minimum contract and existing Auth/account mapping, not Event UI. Supporting member: none. Physical Android: No for S2-01; Emulator: Yes; automated: Yes.

Other budget: 2h review S2-03; 1h decision/coordination/evidence including approximately 0.5h final team Android smoke; 2h buffer. The smoke is separate from S2-01 acceptance and is not DU/JIN proxy testing. Initial implementation/evidence: Not Run.

## SHI package

**Title:** Sprint 2 / S2-02 — Persisted deterministic Event recommendations — SHI

**Assignee:** `GGGGHOST-CN` · **Reviewer:** ZHOU YAOYIN · **Main estimate:** 5 SP / 16h · **Total member envelope:** 21h

### User value and scope

Return useful Event matches from persisted Interest/Event records. Own the Backend recommendation use case/API, Event repository and bounded synthetic initialization for the isolated demonstration environment. Use the fixed Interest mapping; no waiting for LI's UI, no Admin publishing or production resets.

### Acceptance and verification

- Only active, published, future Events with at least one matching active Interest enter results.
- Q03 score and full tie-break ordering are deterministic; Home returns the first zero/one/two results; See All computes independently.
- Empty is successful and contains no fallback candidate or protected reason.
- Auth/onboarding/dependency failures use the safe contract; no Check-in, Category, location or popularity scoring.
- Fastify/API and Firebase Emulator tests prove persisted-input behavior; initialization cannot overwrite unrelated records or accounts.

Dependencies: fixed own-interest mapping and existing Backend. Supporting member: none. Physical Android: No; Firebase Emulator: Yes; automated: Yes.

Other budget: 2h review JIN's S2-04/S2-06; 1h coordination/evidence; 2h buffer. Initial implementation/evidence: Not Run.

## JIN package

**Title:** Sprint 2 / S2-04 and S2-06 — Friend ranking component and Event integration — JIN

**Assignee:** `chuxi12483468` · **Reviewer:** SHI ZHENGQI · **Main estimate:** 3 SP / 12h · **Total member envelope:** 20h

### User value and scope

Implement a reusable, verified Friend ranking component for later authorized product integration. Separately allocate 3h to cross-feature automated Event verification. The ranking component does not wait for Event implementation or device access.

### Acceptance and verification

- Inputs are explicitly typed, already-purpose-authorized Interest/Event projections; no live candidate reader or public endpoint.
- Deduplicate references; compute `2 × shared interests + common Events`; exclude zero factors; apply all approved ties before Top 2.
- Automated cases cover ties, duplicates, empty inputs, zero factor and prohibited-input boundaries. Do not claim production discoverability or relationship authorization.
- S2-06 separately verifies Auth/onboarding → Note → interests → Event → See All on Emulator, including empty and a dependency failure/recovery; reuse owner tests.
- SHI reviews both JIN-authored component and integration artifacts; JIN does not approve own results.

Dependencies: Q03/Q17 only for S2-04; actual S2-01/02/03 incremental delivery for S2-06. Supporting member: none. Physical Android: No; Emulator: No for ranking, Yes for S2-06; automated: Yes. No other member's physical-device result is required for closure.

Other budget: 3h S2-06; 2h review S2-05; 1h coordination/evidence; 2h buffer. Initial implementation/evidence: Not Run.

## DU package

**Title:** Sprint 2 / S2-03 — Integrated Event Flutter experience — DU

**Assignee:** `397781783dk-prog` · **Reviewer:** LI HOURUI · **Main estimate:** 5 SP / 15h · **Total member envelope:** 20h

### User value and scope

Connect Check-in/Home to own interests, Event Top 2 and See All using existing Flutter conventions. Own the client repository/state/UI and verification for recommendation consumption. No external registration, permissions, hardware-dependent behavior or new mock framework.

### Acceptance and verification

- Display Event title, times and deterministic matched-interest reason in Backend order.
- Home supports zero/one/two results; See All issues an independent computation.
- Loading, exact Q16 empty copy, safe error and explicit retry work; interest save leads to a new recommendation request.
- Start with fixed DTOs and existing fake techniques, then connect actual Backend endpoints in Week 1.
- Widget and Android Emulator verification proves the integrated path; fake-only screenshots are insufficient for final integration.

Dependencies: fixed S2-01/02 interfaces; their real implementations for final integration. Supporting member: none. Physical Android: No; Emulator: Yes; automated: Yes. No proxy physical-device validation is required to close this PBI.

Other budget: 2h review S2-01; 1h coordination/evidence; 2h buffer. Initial implementation/evidence: Not Run.

## ZHOU package

**Title:** Sprint 2 / S2-05 — Bounded internal AI runtime component — ZHOU

**Assignee:** `YaoyinZhou3922` · **Reviewer:** JIN ZIHAN · **Main estimate:** 5 SP / 17h · **Total member envelope:** 22h

### User value and scope

Provide the bounded, testable internal runtime foundation for later Check-in AI integration. Implement Q31 scheduling, time budgets, cancellation, resource release and strict output parsing with an injected clock/transport. Do not add a public endpoint, Conversation persistence or model installation.

### Acceptance and verification

- One active generation, at most two queued requests and one non-terminal request per user.
- One monotonic 60s overall deadline, 5s queue and 45s generation sub-budgets; no restarted deadline or automatic retry.
- Cancellation, queue expiry and late output cannot cause duplicate terminal results or leaked slots.
- Strict versioned Q31 JSON parsing; malformed, duplicate-key, wrong-schema and prohibited output are rejected without repair.
- Deterministic automated evidence passes with fake time/transport; no live model prerequisite.
- Do not claim model-token enforcement, semantic safety, authority revalidation, Conversation lifecycle or full Q31-E acceptance.

Dependencies: existing Q31 contract and Backend facilities only. Supporting member: none. Physical Android: No; Emulator: No; automated: Yes.

Other budget: 2h review S2-02; 1h coordination/evidence; 2h buffer. Optional existing-host smoke may consume at most that 2h buffer only after LI releases it; missing environment stays Not Run and does not block the component. Initial implementation/evidence: Not Run.
