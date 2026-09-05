# R12 — Test strategy, controlled fixtures and traceability

- **Work package:** Issue #4 / R12
- **Owner:** JIN ZIHAN (`@chuxi12483468`)
- **Baseline commit:** `ce1a6e13955c9d1806758e453c7ded661da1e083`
- **Contract:** `S-PM-0903-RMVP01A-CONTRACT` / RMVP-01A R2
- **UAT baseline:** `UAT-B-0902-R2`
- **Review path:** SHI ZHENGQI independently reviewed this artifact in R5B; approved on 2026-09-04 against commit `7d46b94`
- **Execution state:** Design prepared; all execution results remain `Not Run`

## 1. Purpose and boundary

This record defines the smallest repeatable test strategy and fixture contract for the approved RMVP-01A slice: Firebase email/password entry, the paired Initial Choice, canonical Username onboarding, one Note-only Check-in, and an authenticated later read. It covers the R12 responsibilities for both Initial Choice branches, exact retries/conflicts, validation, ownership and failure behavior.

It does not add product behavior, endpoints, DTO fields, persistence fields, dependencies, or platform scope. It does not claim that an implementation, integration run, Android run, UAT case, or release gate has passed. R13 cannot use these fixtures until the implementation and controlled dependencies named by its predecessors exist.

## 2. Test-layer strategy

| Layer | Responsibility | R12 design output | Pass requires |
|---|---|---|---|
| Pure/unit | Username/Note boundary checks, Initial Choice projection, stable error mapping, idempotency input comparison | Deterministic input/output cases in §4 | Approved contract result with no hidden product fields |
| Widget/state | Accept/Reject operability, pending/disabled duplicate submit, validation, cancellation and abandoned-screen protection | State assertions in §4 and §5 | Approved Q04 states and accessible announcements; no late result on an abandoned screen |
| Cross-boundary integration (R13) | Authenticated onboarding, create, exact retry/conflict and later owner read through the approved ports/edge | Preconditions and scenario IDs in §6 | R1/R4/R9/R10 outputs plus this R12 record; controlled environment identity recorded |
| Android UAT/evidence (R14) | User-visible Android `.A` anchors and sanitized capture package | Evidence schema and case mapping in §7 | Named device/build/time/fixture and complete numbered evidence |
| Overall gate (R15) | Different-reviewer gate over non-JIN implementation/review outputs | Explicit exclusion and gate rules in §8 | Applicable predecessors, SHI R5B, and LI terminal R16 review; no JIN self-approval |

The result vocabulary is the accepted baseline vocabulary: `Not Run`, `Pass`, `Fail`, `Blocked`, and `Not Applicable`. `Pass` is only valid when every expected step and required evidence field is observed in the required environment. A code review, unit test, or earlier platform run cannot be substituted for the required Android or controlled-host evidence.

## 3. Controlled fixture contract

The profiles below are execution-local projections of the approved baseline fixtures. They are synthetic test state, not product defaults or schema decisions. A fixture reset must be repeatable and must identify the isolated Backend/Firebase environment without including credentials or real-user data.

| Profile | Required state | Used by |
|---|---|---|
| `RMVP-FX-NEW-ACCEPT` | New ordinary member; valid unregistered email/password; available canonical Username; no Product Account | R12-T01, R13 accept path, `CORE-01.A` |
| `RMVP-FX-NEW-REJECT` | Same as `RMVP-FX-NEW-ACCEPT`, independently reset; Initial Choice is `reject` | R12-T02, R13 reject path, `CORE-02.A` |
| `RMVP-FX-INCOMPLETE` | Firebase identity exists and is authenticated; Product Account onboarding is absent/incomplete; no completion projection | R12-T03, R12-T09B, R13 resume/cancel paths |
| `RMVP-FX-USERNAME-INVALID` | Username values that fail the approved Q18-B canonical validation; no reservation or Product Account mutation | R12-T05A |
| `RMVP-FX-USERNAME-UNAVAILABLE` | A valid canonical Username already reserved by another account; the reason is not exposed to the requester | R12-T05B |
| `RMVP-FX-ONBOARDING-CONFLICT` | Auth Principal is already bound to a different completed onboarding input; the completed account remains authoritative | R12-T05C |
| `RMVP-FX-ONBOARDED` | Active ordinary member with completed Product Account; owner AccountId is internal and distinct from Firebase UID | R12-T07–T10, R13, R14 |
| `RMVP-FX-NOTE` | Valid Note variants plus empty, Unicode-whitespace-only, 500-grapheme, 501-grapheme, internal-line-break, and undeclared-field inputs | R12-T08, `CORE-05.A` |
| `RMVP-FX-FIREBASE-REGISTRATION` | Synthetic invalid Firebase credentials for a registration attempt; no Product Account exists | R12-T06A |
| `RMVP-FX-AUTH-REQUIRED` | Missing, malformed, or expired token on a protected Backend operation | R12-T06B, `X-01` |
| `RMVP-FX-AUTH-FORBIDDEN` | Revoked or disabled identity variants on a protected Backend operation | R12-T09A |
| `RMVP-FX-NON-OWNER` | Authenticated member and a Check-in owned by a different AccountId | R12-T11, `X-01` |
| `RMVP-FX-CHECKIN` | One owner Check-in with opaque ID, normalized Note and server UTC `createdAt`; separate non-owned and missing IDs | R12-T11, R13 later-read path |
| `RMVP-FX-DEPENDENCY` | Controlled Backend/Firebase/Firestore unavailable responses, network loss, pending cancellation and late-response timing controls | R12-T12, R13/R14 failure evidence |

Fixture rules:

1. Generate fresh synthetic email addresses, passwords, opaque IDs and idempotency keys per run; never store them in source control or evidence.
2. Every create command uses a base64url `Idempotency-Key` of 22–64 characters. The raw key is not logged and is never used as a persistence path.
3. Use the same key and byte-equivalent approved input for an exact retry. Reuse the key with changed input only for the conflict case.
4. Freeze the fixture version and reset identity before each scenario. Record fixture version and reset result in the evidence record.
5. Do not use production data, real personal content, Firebase service-account files, tokens, or client-selected owner/timestamp fields.

## 4. R12 scenario catalogue

All rows below start as `Not Run`. The expected outcome is the contract oracle for later execution; it is not an observed result.

| ID | Contract trace | Fixture | Scenario and exact oracle | Initial result |
|---|---|---|---|---|
| R12-T01 | AC-01 / UC-02 / `CORE-01.A` | `RMVP-FX-NEW-ACCEPT` | Submit valid Username + `accept`; one onboarding commit returns `accepted` + `public`, marks onboarding complete and exposes no AccountId/Firebase UID | `Not Run` |
| R12-T02 | AC-02 / UC-02 / `CORE-02.A` | `RMVP-FX-NEW-REJECT` | Submit valid Username + `reject`; one commit returns `rejected` + `private`, marks onboarding complete, and performs no rejected optional processing | `Not Run` |
| R12-T03 | AC-03 / UC-01–02 | `RMVP-FX-INCOMPLETE` | Re-enter after Firebase identity creation but incomplete Product Account; route to resumable onboarding, never claim completed account, and permit the same intent to be retried | `Not Run` |
| R12-T04 | AC-03 / UC-02 alternative | `RMVP-FX-INCOMPLETE` or committed onboarding reset | Repeat the same onboarding request with the same owner, key and input; return the original safe projection and create no duplicate binding, reservation, account, or idempotency result | `Not Run` |
| R12-T05A | AC-01/02 / UC-02 error | `RMVP-FX-USERNAME-INVALID` | Submit one invalid canonical Username with otherwise valid authenticated onboarding input; return exactly `USERNAME_INVALID`, create no Product Account/Username Reservation, and retain no success state | `Not Run` |
| R12-T05B | AC-01/02 / UC-02 error | `RMVP-FX-USERNAME-UNAVAILABLE` | Submit one valid canonical Username already reserved by another account; return exactly privacy-safe `USERNAME_UNAVAILABLE`, disclose no reservation/owner reason, and create no new records | `Not Run` |
| R12-T05C | AC-01/02 / UC-02 error | `RMVP-FX-ONBOARDING-CONFLICT` | Submit onboarding input from an Auth Principal already bound to a different completed onboarding input; return exactly `ONBOARDING_CONFLICT`, preserve the completed account, and create no new records | `Not Run` |
| R12-T06A | UC-01 error | `RMVP-FX-FIREBASE-REGISTRATION` | Submit invalid Firebase registration credentials; show the approved safe Firebase-authentication validation state, create no Firebase identity or Product Account, and do not route to completed onboarding | `Not Run` |
| R12-T06B | AC-07 / UC-02 / `X-01` | `RMVP-FX-AUTH-REQUIRED` | Send one protected Backend operation with a missing, malformed, or expired identity; return exactly `AUTH_REQUIRED`, fail closed, mutate nothing, and expose no protected content or trusted identity field | `Not Run` |
| R12-T07 | AC-04 / UC-03 / `CORE-05.A` | `RMVP-FX-ONBOARDED` + `RMVP-FX-NOTE` | Submit a valid Note with no Mood, Weather, Activity or Approx Location; create exactly one owner Check-in with opaque ID and server UTC time; return the owner-safe projection | `Not Run` |
| R12-T08 | AC-06 / M19 | `RMVP-FX-NOTE` | Submit empty, Unicode-whitespace-only, over-limit and undeclared-field inputs; return `CHECKIN_INVALID`, create nothing, preserve internal whitespace/line breaks, and apply 1–500 Unicode grapheme validation | `Not Run` |
| R12-T09A | AC-07 / UC-03 | `RMVP-FX-AUTH-FORBIDDEN` + `RMVP-FX-ONBOARDED` | Send a protected create operation with a revoked or disabled identity; return exactly `AUTH_FORBIDDEN`, create nothing, and never trust client-selected owner fields | `Not Run` |
| R12-T09B | AC-07 / UC-03 | `RMVP-FX-INCOMPLETE` | Send a protected create operation for an authenticated member without completed onboarding; return exactly `ONBOARDING_REQUIRED`, create nothing, and do not expose or infer a Product Account | `Not Run` |
| R12-T10 | UC-03 alternative | `RMVP-FX-ONBOARDED` + `RMVP-FX-NOTE` | Retry a committed Check-in with the same key/input and then reuse that key with changed input; exact retry returns the original projection with no duplicate, changed input returns `IDEMPOTENCY_CONFLICT` with no new record | `Not Run` |
| R12-T11 | AC-05/07 / UC-04 / persistence proof | `RMVP-FX-CHECKIN` + `RMVP-FX-NON-OWNER` | Same owner later reads the opaque ID and receives the same Note/server time; missing or non-owned IDs return indistinguishable `CHECKIN_UNAVAILABLE` with no content or ownership clue | `Not Run` |
| R12-T12 | AC-08 / UC-01–04 / `X-04` | `RMVP-FX-DEPENDENCY` | During pending onboarding/create/read, inject controlled dependency loss and leave the screen; show only generic unavailable/retry, never fabricate success, and ignore a late response on the abandoned screen; reconcile any committed result only by explicit retry/read | `Not Run` |
| R12-T13 | UAT evidence rule / `ENV-05` | All applicable profiles | Verify the evidence packet contains complete identity/build/device/time/environment/fixture/steps/result/reviewer fields and no secrets, tokens, prohibited content or uncontrolled real-user data | `Not Run` |

## 5. Client state assertions for later widget/integration execution

- Accept and Reject are equally operable, neither is preselected, and each accessible name includes its consent and visibility consequence.
- While a submission is pending, both choice actions and duplicate submit controls are disabled; the selected branch is announced.
- Field validation remains beside the affected field, with an error summary linked to invalid fields; submitted values are retained where the approved state requires retry.
- Cancellation or Android Back while pending produces no success/error on the abandoned surface. A late response cannot mutate that surface.
- M20 distinguishes `Create committed`, `Confirming`, `Confirmed`, and `Confirmation unavailable`. Cached/local content is never labelled independently confirmed.
- The confirmed read displays only the returned Note and server-derived `createdAt` projection, with an explicit timezone or clearly labelled local conversion.

## 6. R13 entry and stop criteria

R13 may begin only when the following predecessor outputs are present and linkable: R1 Flutter integration, R4 approved Backend contract/application path, R9 Infrastructure adapters, R10 reproducible controlled environment, and this R12 design. SHI's R5B independent review must review the R12 artifact/result; R13 results remain separate from owner-focused tests.

Stop the affected scenario and record `Blocked` when the build, fixture reset, controlled environment, dependency injection control, or required predecessor output is absent. Record `Fail` only after a valid run observes a contract violation. Keep `Not Run` when no valid execution was attempted. Never convert an implementation, unit test, screenshot, or historical UAT row into an integration or Android Pass.

## 7. R14 evidence and traceability schema

Each Android evidence row must retain: UAT ID (`CORE-01.A`, `CORE-02.A`, `CORE-05.A`, or affected `X-01` as applicable), build commit and artifact identifier, Android device model/OS, application ID, execution timestamp with timezone, tester, controlled environment identifier, fixture version/reset and `asOf` where relevant, numbered steps and observed output, sanitized screenshot/recording/log reference, result vocabulary value, defect/blocker/retest references, and SHI/LI review fields. Evidence must explicitly state that no credential, token, private content, prohibited log field or uncontrolled real-user data is present.

The approved R2 baseline requires all 45 mandatory Android/shared base cases to have valid evidence before its Week 9 Android gate can pass. This R12 record does not execute or mark any of those cases.

## 8. R15 gate boundary

R15 is a different-reviewer gate over applicable LI/SHI/DU/ZHOU implementation and component-review outputs. It excludes this author's R12–R14 artifacts/results and SHI's R5B review packet from JIN's approval scope. LI performs the terminal independent R16 review. Therefore this document cannot be used as evidence that R15 or the Release gate passed.

## 9. Traceability index

| Approved source | R12 coverage | Later evidence consumer |
|---|---|---|
| RMVP-01A R2 AC-01/02 | R12-T01/T02/T05A/T05B/T05C | R13 onboarding execution; `CORE-01.A`/`CORE-02.A` |
| RMVP-01A R2 AC-03 | R12-T03/T04 | R13 resume/exact-retry execution |
| RMVP-01A R2 AC-04/05 | R12-T07/T10/T11 | R13 create-then-later-read; `CORE-05.A` persistence proof |
| RMVP-01A R2 AC-06 | R12-T08 | R13 validation; Android M19/M20 evidence |
| RMVP-01A R2 AC-07 | R12-T06B/T09A/T09B/T11 | R13 fail-closed identity/ownership; affected `X-01` |
| RMVP-01A R2 AC-08 | R12-T12 | R13 cancellation/dependency; R14 Android retry/late-response evidence |
| UAT-B-0902-R2 §5 | R12-T13 and §7 schema | R14 evidence collation and R15 gate input |

## 10. Execution checklist and notification order

This checklist is a coordination aid, not execution evidence. An unchecked item is not inferred from a branch, issue assignment, repository access, or an earlier environment check.

### R13 entry checklist — all required before execution

- [x] **R1** — LI's Flutter entry/onboarding/Check-in integration and owner-focused tests are available at commit `5e7dd22` / PR #8, merged to `main`. Owner-reported analyze, full tests and debug APK are `Pass`; device integration remains `Not Run`.
- [x] **R4** — SHI's approved Backend Application/Domain/Transport implementation and owner-focused tests are available via PR #12, merged to `main` as `fcaff75349f15b298412cd105273708b6d87e913`. The reported owner-focused suite is 39/39 `Pass`.
- [ ] **R9** — ZHOU's Firebase Auth/Firestore infrastructure adapters and contract tests are available at commit `3e80567501278d0d299048129a8284d324818adb` / Draft PR #10 (76/76 contract tests reported `Pass`), but SHI's independent review is `Changes Requested`: the adapter persists an unapproved `checkInId` field inside `check_ins/{checkInId}`. This gate stays unchecked until the focused correction and re-review are complete.
- [ ] **R10** — ZHOU's reproducible controlled Backend/Firebase environment and sanitized configuration evidence are not available. R10 remains `Not Run` and cannot start until R9 is stable after review.
- [x] **R12 design** — this strategy, fixture and traceability artifact is committed at `cad65f1`.
- [x] **R5B review** — SHI's independent re-review approved the R12 artifact on 2026-09-04 against `7d46b94`; approval is design/review evidence only, not execution evidence.
- [ ] **Controlled run identity** — build commit, isolated environment, fixture reset and executor are recorded before any R13 result is assigned.

R9's focused correction and SHI boundary re-review, R10 controlled-environment evidence, and the controlled run identity remain separate unchecked R13 gates. R7's device/emulator blocker separately prevents R14. R13 cannot start while any required R13 item is missing, even though R1 and R4 are now merged and the R9 implementation/test output is available.

### R14 readiness watch

- [ ] **R7 Android device/UAT evidence** — `Not Run`; the scheduled checkpoint had no ADB-visible supported device or emulator. A concrete device/emulator is required before Android evidence can begin.

### Execution order after the checklist is complete

1. Verify each checked predecessor from its linked commit/PR and confirm that the controlled environment and fixture reset are reproducible.
2. Notify LI in Issue #4 that the R13 entry checklist is complete. Do not send this notification while any item above is unchecked.
3. Run only the approved R13 cross-boundary scenarios. Keep every unexecuted scenario `Not Run`; assign `Pass`, `Fail` or `Blocked` only from complete evidence under §7.
4. Start R14 only after R7 and R13 outputs exist, then collate the Android `.A` evidence and defect/retest ledger.
5. Start R15 only after applicable R1–R11 implementation and component-review outputs exist. Exclude R12–R14 and R5B from JIN's own gate, then leave R16 for LI's terminal review.

### LI notification template (do not post until all prerequisites are verified)

```text
Issue #4 R13 entry check: R1/R4/R9/R10 predecessor outputs and SHI R5B review are linked and verified. Controlled environment and fixture reset are identified. Requesting LI confirmation to begin R13; R13/R14/R15 remain Not Run until their own evidence exists.
```

**Current disposition:** R12 strategy/fixtures/traceability is approved by SHI's R5B re-review on 2026-09-04 against `7d46b94` (PR #7). R1 (`5e7dd22` / PR #8) and R4 (`fcaff75349f15b298412cd105273708b6d87e913` / PR #12) are merged to `main`. R9 (`3e80567501278d0d299048129a8284d324818adb` / PR #10) has 76/76 reported contract tests but remains blocked by SHI's unapproved persisted `checkInId` finding; R10 controlled-environment evidence is absent; and R7 has no ADB-visible supported device or emulator. This closes the R12 review only; it is not execution evidence and does not authorize or claim R13, R14, R15, Android, controlled-backend integration, UAT or release completion. R13, R14 and R15 remain `Not Run`, and the LI notification is intentionally not posted until every remaining R13 entry item is verified.
