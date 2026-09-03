# R12 — Test strategy, controlled fixtures and traceability

- **Work package:** Issue #4 / R12
- **Owner:** JIN ZIHAN (`@chuxi12483468`)
- **Baseline commit:** `ce1a6e13955c9d1806758e453c7ded661da1e083`
- **Contract:** `S-PM-0903-RMVP01A-CONTRACT` / RMVP-01A R2
- **UAT baseline:** `UAT-B-0902-R2`
- **Review path:** SHI ZHENGQI independently reviews this artifact in R5B
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
| `RMVP-FX-INCOMPLETE` | Firebase identity exists and is authenticated; Product Account onboarding is absent/incomplete; no completion projection | R12-T03, R13 resume/cancel paths |
| `RMVP-FX-USERNAME` | Controlled invalid, unavailable, and conflicting canonical Username variants; no reason for unavailability exposed to the requester | R12-T05 |
| `RMVP-FX-ONBOARDED` | Active ordinary member with completed Product Account; owner AccountId is internal and distinct from Firebase UID | R12-T07–T10, R13, R14 |
| `RMVP-FX-NOTE` | Valid Note variants plus empty, Unicode-whitespace-only, 500-grapheme, 501-grapheme, internal-line-break, and undeclared-field inputs | R12-T08, `CORE-05.A` |
| `RMVP-FX-AUTH` | Missing, malformed, expired, revoked, disabled, and non-owner identity variants | R12-T06, R12-T09, R12-T11, `X-01` |
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
| R12-T05 | AC-01/02 / UC-02 errors | `RMVP-FX-USERNAME` | Exercise invalid, unavailable and conflicting Username variants; return respectively `USERNAME_INVALID`, privacy-safe `USERNAME_UNAVAILABLE`, or `ONBOARDING_CONFLICT`; create nothing new and disclose no protected reason | `Not Run` |
| R12-T06 | AC-07 / UC-01–02 / `X-01` | `RMVP-FX-AUTH` | Exercise missing/malformed/expired identity and Firebase registration failure; fail closed with `AUTH_REQUIRED` or safe auth validation, create no Product Account, and expose no trusted identity fields | `Not Run` |
| R12-T07 | AC-04 / UC-03 / `CORE-05.A` | `RMVP-FX-ONBOARDED` + `RMVP-FX-NOTE` | Submit a valid Note with no Mood, Weather, Activity or Approx Location; create exactly one owner Check-in with opaque ID and server UTC time; return the owner-safe projection | `Not Run` |
| R12-T08 | AC-06 / M19 | `RMVP-FX-NOTE` | Submit empty, Unicode-whitespace-only, over-limit and undeclared-field inputs; return `CHECKIN_INVALID`, create nothing, preserve internal whitespace/line breaks, and apply 1–500 Unicode grapheme validation | `Not Run` |
| R12-T09 | AC-07 / UC-03 | `RMVP-FX-AUTH` + `RMVP-FX-ONBOARDED` | Exercise revoked/disabled identity and incomplete onboarding; return `AUTH_FORBIDDEN` or `ONBOARDING_REQUIRED`, create nothing, and never trust client-selected owner fields | `Not Run` |
| R12-T10 | UC-03 alternative | `RMVP-FX-ONBOARDED` + `RMVP-FX-NOTE` | Retry a committed Check-in with the same key/input and then reuse that key with changed input; exact retry returns the original projection with no duplicate, changed input returns `IDEMPOTENCY_CONFLICT` with no new record | `Not Run` |
| R12-T11 | AC-05/07 / UC-04 / persistence proof | `RMVP-FX-CHECKIN` + `RMVP-FX-AUTH` | Same owner later reads the opaque ID and receives the same Note/server time; missing or non-owned IDs return indistinguishable `CHECKIN_UNAVAILABLE` with no content or ownership clue | `Not Run` |
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
| RMVP-01A R2 AC-01/02 | R12-T01/T02 | R13 onboarding execution; `CORE-01.A`/`CORE-02.A` |
| RMVP-01A R2 AC-03 | R12-T03/T04 | R13 resume/exact-retry execution |
| RMVP-01A R2 AC-04/05 | R12-T07/T10/T11 | R13 create-then-later-read; `CORE-05.A` persistence proof |
| RMVP-01A R2 AC-06 | R12-T08 | R13 validation; Android M19/M20 evidence |
| RMVP-01A R2 AC-07 | R12-T06/T09/T11 | R13 fail-closed identity/ownership; affected `X-01` |
| RMVP-01A R2 AC-08 | R12-T12 | R13 cancellation/dependency; R14 Android retry/late-response evidence |
| UAT-B-0902-R2 §5 | R12-T13 and §7 schema | R14 evidence collation and R15 gate input |

**Current disposition:** R12 design artifact prepared for SHI's independent R5B review. R13, R14 and R15 remain `Not Run` until their stated predecessors and evidence exist.
