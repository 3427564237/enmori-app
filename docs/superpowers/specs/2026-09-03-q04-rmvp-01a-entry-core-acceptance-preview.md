# Q04 RMVP-01A entry/core visual acceptance — R1 preview

- **Preview ID:** Q04-RMVP01A-ENTRY-CORE-PREVIEW-0903-R1
- **Status:** Approved exactly by S-PM-0903-Q04-RMVP01A-R1; evidence gates remain Pending
- **Prepared:** 2026-09-03
- **Mode:** Q04 detailed visual/state acceptance for the bounded RMVP-01A slice only
- **Requirement contract:** [S-PM-0903-RMVP01A-CONTRACT](../../decisions/2026-09-03-rmvp-01a-contract-approval.md)
- **Q04 governance:** [S-PM-0902-Q04](../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md)
- **Exact approval:** [S-PM-0903-Q04-RMVP01A-R1](../../decisions/2026-09-03-q04-rmvp-01a-entry-core-acceptance.md)
- **Accepted inventory:** [Q04-D](2026-09-02-q04-d-inventory-content-acceptance-draft.md)
- **Version 5 matrix/evidence:** [Q04-C route/state matrix](../../evidence/ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md)

## 1. Approval boundary

This preview covers only the RMVP-01A projection of:

- M02 Account Registration;
- M06 Initial data-consent information;
- M07 the single paired Initial Choice;
- M08 Home shell entry;
- M19 Note-only Check-in Composer; and
- M20 Check-in saved and later-read-confirmed outcome.

It does not accept the complete versions of M08, M19 or M20 and does not approve Weather, Mood, Activity, Approx Location, Check-in edit/delete, Calendar, Footprint, Interest/Profile onboarding, password recovery, six-digit verification, AI, Recommendation, social exposure, Add Friend/Friend Request or iOS product implementation.

Approval of this preview would approve presentation/state direction only. It would not verify Version 5 provenance/captures, approve implementation, make any row `Accepted Evidence Complete` or `Visual Implementation Ready`, transition RMVP-01A to `Ready`, select a Sprint, or authorize GitHub Projects/Notion writes.

## 2. Evidence findings and clarification questions

| Question exposed by the evidence | Version 5 evidence | Controlling boundary | Recommended answer for exact approval |
|---|---|---|---|
| Is canonical Username an enforced onboarding input? | `register` visually contains an uncontrolled Username field, then the prototype hard-codes `new_scholar_24`; no canonical validation/unavailable/retry behavior is shown. | Q18-B and the approved RMVP-01A contract require canonical Username onboarding and privacy-safe failures. | Approve Q04-DEV-15. M02 must use the authoritative Username rules; the fixture is not accepted. |
| Are optional-processing consent and current Check-in visibility independent choices? | `data-consent` records Agree/Not Now and then `first-time-privacy` independently records Accept/Reject, allowing four combinations. | RMVP-01A authorizes one paired Initial Choice only: accept → accepted/Public; reject → rejected/Private. | Approve new Q04-DEV-23. M06 may explain the purposes, but only M07 presents the final paired choice; mixed combinations are impossible. |
| When may registration be called complete? | `verify` precedes `reg-complete`; the latter claims account creation before the prototype later traverses Profile, Interests, consent and privacy. | Firebase identity success is not Product Account completion. Recoverable incomplete onboarding remains controlling. | Approve new Q04-DEV-24. No completion claim appears until atomic Product Account onboarding commits or an exact retry recovers it. |
| What follows successful onboarding? | The prototype continues into unapproved Profile/Interest steps and then Home. | RMVP-01A excludes Profile/Interest onboarding and its approved behavioral flow opens the Note-only Composer after onboarding. | Route directly to M19 after the committed Initial Choice. M20 may return to the bounded M08 shell. |
| Is the Version 5 Terms/Privacy checkbox a mandatory Release rule? | `register` blocks submission until both are accepted. | No reviewed project authority in the current repository establishes that exact combined checkbox contract. Applicable non-waivable legal/platform obligations remain higher authority. | Do not accept the checkbox as an RMVP-01A requirement. Links may be presented, but any mandatory legal acceptance needs separately attributable authority and cannot be waived by this visual decision. |
| When may M20 claim independently confirmed persistence? | `checkin-success` renders local prototype state and offers Timeline navigation; no separate owner read exists. | RMVP-01A requires create success followed by a separate authenticated owner read. | Use a two-phase M20 state: committed create result, then later-read confirmation. Never label local-only state as independently confirmed. |

These are the bounded clarification questions answered by this preview. An approval accepts the recommended answers exactly; an amendment leaves only the affected row blocked.

## 3. Proposed deviation approvals

### Q04-DEV-15 — canonical Username onboarding

Approve the retained candidate. M02 collects and submits canonical Username under Q18-B. It presents local format guidance, `USERNAME_INVALID`, privacy-safe `USERNAME_UNAVAILABLE`, pending and retry states. Username is not inferred from Email or DisplayName and the prototype's hard-coded value is fixture evidence only.

The same authority means a later M28 Profile surface must not expose production Username rename/edit during Week 9, but this preview does not otherwise accept or make M28 ready.

### Q04-DEV-23 — one paired Initial Choice

- **Observed conflict:** Version 5 implements data consent and privacy as independent choices and therefore permits combinations outside RMVP-01A.
- **Production resolution:** M06 is a purpose-and-consequence information state with one `Continue` action. M07 is the only decision state and exposes exactly two choices:
  - `Accept — Public`: optional processing becomes accepted and current Check-in visibility becomes Public;
  - `Reject — Private`: optional processing becomes rejected and current Check-in visibility becomes Private.
- **Boundary:** either choice permits continuation. No Friends-only or independent consent/privacy combination is available during this onboarding slice. Future Check-in social-exposure evaluation semantics remain deferred.
- **Authority:** S-PM-0903-RMVP01A-CONTRACT, preserving S-BR45/S-KD5 and Q04-DEV-09's purpose-specific allowlist correction.

### Q04-DEV-24 — no premature Product Account completion

- **Observed conflict:** Version 5 claims `Registration Complete` after a prototype six-digit verification fixture and before Product Account onboarding completes.
- **Production resolution:** Firebase identity success routes through onboarding-status resolution. If Product Account onboarding is required, the member remains in the M02/M06/M07 onboarding flow. A completion/success state is shown only after the Backend commits or exactly recovers Auth Binding, Username Reservation, Product Account and onboarding idempotency result.
- **Boundary:** the six-digit verification route, demo code, resend/expiry behavior, Profile Setup and Interest Setup remain outside RMVP-01A. A Firebase identity without a completed Product Account is shown as recoverable incomplete onboarding, never as a completed account.
- **Authority:** S-PM-0903-RMVP01A-CONTRACT, Q04-DEV-02 and the Q04-D M02 grouping.

Existing Q04-DEV-03, Q04-DEV-09, Q04-DEV-11 and Q04-DEV-12 remain applicable: use ENMORI naming, purpose-specific data-use copy, community rather than student-only framing, and no fixture/campus/catalogue values as production data. Existing Q04-DEV-21/22 remain unapproved for their broader surfaces and are not silently settled here.

## 4. Proposed detailed surface/state acceptance

### M02 — Account Registration and recoverable onboarding

Required visible controls and semantics:

- Email, Password, Confirm Password and canonical Username fields have persistent visible labels; Confirm Password is client-only error prevention and is never sent as a product field.
- Email copy is community-neutral. The Version 5 institutional/university-only restriction is not accepted.
- Username guidance states the approved 3–30-character lowercase ASCII, digit and underscore boundary without suggesting DisplayName or AccountId.
- Password managers and paste remain enabled. The evidence-only OTP route is not used.
- Submit disables against repeat activation while pending and exposes a labelled progress state.
- Field-level validation remains beside the affected field and is announced to assistive technology. Multiple invalid fields also expose an error summary linked to those fields.
- Authentication failure, Username invalid, Username unavailable, onboarding conflict and generic dependency unavailable remain distinct only where the approved public contract distinguishes them. The unavailable Username state never reveals why it is unavailable.
- Firebase identity success triggers onboarding-status resolution. Pending, service-unavailable, abandoned-screen and recoverable incomplete-onboarding states never claim Product Account completion.
- Exact retry reuses the same operation intent; the UI must not invite or present duplicate Account creation.

Accepted terminal transition: committed/recovered Product Account onboarding routes to M19. The M02 `reg-complete` material state may provide a brief success announcement but must not insert Profile or Interest onboarding.

### M06 — Initial Choice information

M06 explains, in purpose-specific language, that the two final choices jointly control the approved optional processing and current Check-in visibility. It must state that either choice allows continued use of the bounded core flow. It must not claim that Check-ins, region or event activity feed deterministic Recommendation ranking, and it must not promise generic/basic AI behavior outside the approved AI contracts.

The proposed visible content is:

- title: `Optional data use`;
- body: `This release does not perform optional AI or Recommendation processing in this setup flow. Your choice saves whether separately authorised optional features may use their approved data later. Reject keeps optional processing off. Either choice lets you continue.`; and
- supporting statement: `Check-in Notes are not used for Recommendation ranking. Approximate location is not a Recommendation or AI input.`

M06 has one primary `Continue` action and no independent Agree/Not Now state mutation. Back navigation returns without committing the Initial Choice.

### M07 — paired Initial Choice

M07 presents the title `Choose your initial settings` and the statement `Accept saves optional processing as accepted and current Check-in visibility as Public. Reject saves optional processing as rejected and current Check-in visibility as Private. Either choice lets you continue.` The two visible actions are exactly `Accept — Public` and `Reject — Private`, with equal operability and clear consequences. Neither choice is preselected. The buttons expose accessible names containing both the consent and visibility consequence. While submission is pending, both are disabled and the chosen branch is announced. Failure retains the choice and offers Retry without claiming onboarding completion.

Reject is not styled or worded as an error, warning or degraded access. It routes to the same bounded post-onboarding flow after successful commit.

### M19 — Note-only Check-in Composer

- The only product input is a labelled multiline Note field.
- Mood, Weather, Activity, Approx Location and visibility controls are not rendered as enabled, disabled or teaser functionality in this slice.
- Leading/trailing Unicode whitespace is ignored for validation; internal whitespace and line breaks are preserved.
- The field accepts 1–500 Unicode grapheme clusters after trimming and shows a counter calculated using the same grapheme rule.
- Empty/whitespace-only and over-limit input produce inline validation and create nothing.
- `Save Check-in` has a 48×48dp minimum target, disables while pending, exposes progress, and prevents duplicate activation.
- `CHECKIN_INVALID`, authentication/onboarding failure, idempotency conflict and generic service-unavailable outcomes follow the approved safe distinctions. No error claims success or fabricates a saved record.
- Leaving while pending prevents a late response from updating the abandoned screen; later retry/read reconciles any authoritative server commit.

Successful create routes to M20 with only the returned opaque Check-in reference, Note and server `createdAt` projection needed by the next state.

### M20 — committed and later-read-confirmed outcome

M20 has these material states:

1. `Create committed`: show the returned Note and time derived from server `createdAt`; do not use client current time. Announce `Check-in saved`.
2. `Confirming`: perform the separate authenticated owner read, show labelled progress and prevent repeated confirmation requests.
3. `Confirmed`: when the read returns the same Note and server time, announce `Saved Check-in confirmed` and expose `Return Home`.
4. `Confirmation unavailable`: do not present cached/local content as confirmed. State `We couldn't confirm this Check-in yet.` and expose `Retry confirmation`; missing and non-owned resources use the same `CHECKIN_UNAVAILABLE` presentation.

The displayed time includes an explicit timezone or a clearly labelled local conversion derived from `createdAt`; evidence retains the source UTC value. Timeline/Footprint, Weather, Mood, Location, social visibility badges and new feature navigation are outside this state.

### M08 — bounded Home shell entry

M08 is reached from M20 only through `Return Home` or on a later completed-account entry. For this preview, acceptance covers only:

- a stable ENMORI ordinary-member shell;
- a clear Check-in action that opens M19.

Weather, Event Recommendation, Friend Recommendation and Friends Activity contents remain outside this bounded M08 acceptance. Fixed fixture names, counts, Weather or recommendation cards cannot be required to satisfy RMVP-01A.

## 5. Proposed public copy catalogue

| Surface/state | Exact visible copy | Action boundary |
|---|---|---|
| M02 Username guidance | `Use 3–30 lowercase letters, numbers or underscores. Start and end with a letter or number; do not use consecutive underscores.` | Local guidance; Backend remains authoritative. |
| M02 `USERNAME_INVALID` | `Enter a valid Username using the format shown.` | Focus/link to Username field; no Product Account created. |
| M02 `USERNAME_UNAVAILABLE` | `This Username is unavailable.` | Cause is never disclosed; retain other input. |
| M02 Firebase existing-email state | `This email is already registered. Sign in instead or use another email.` | No second identity or Product Account is claimed. |
| M02 recoverable incomplete onboarding | `Finish setting up your ENMORI account.` | Resume status/Username/Initial Choice; do not return to prototype Profile/Interest steps. |
| M02 `ONBOARDING_CONFLICT` | `Account setup could not be completed with these details.` | Do not loop an unchanged automatic retry or claim completion. |
| Protected `AUTH_REQUIRED` | `Your session has expired. Sign in again.` | Route to email/password sign-in only. |
| Protected `AUTH_FORBIDDEN` | `This account cannot continue.` | No protected content or status detail is exposed. |
| Generic `SERVICE_UNAVAILABLE` | `This service is temporarily unavailable. Try again.` | Retry is explicit; no success is shown. |
| M19 empty/whitespace Note | `Enter a Note before saving.` | Inline Note error; create nothing. |
| M19 over-limit Note | `Keep the Note within 500 characters.` | Count uses Unicode grapheme clusters; create nothing. |
| M19 `IDEMPOTENCY_CONFLICT` | `This Check-in attempt changed after it was submitted. Start a new attempt.` | No duplicate success; a new action uses a new operation intent. |
| M20 create committed | `Check-in saved.` | This follows the authoritative create response. |
| M20 later read pending | `Confirming your saved Check-in…` | No independently confirmed label yet. |
| M20 later read success | `Saved Check-in confirmed.` | Show only the read Note and server-derived time. |
| M20 `CHECKIN_UNAVAILABLE` | `This Check-in is unavailable.` | Missing and non-owned remain indistinguishable. |
| M20 confirmation service failure | `We couldn't confirm this Check-in yet.` | Expose `Retry confirmation`; do not label local content confirmed. |

The catalogue does not authorize a support/contact workflow, password recovery, email verification, offline success, Timeline/Footprint navigation or any error distinction absent from the approved contract.

## 6. Proposed shared-pattern acceptance for this slice

### SP-01 — form validation and protected submission

Accepted for M02 and M19 only when visible labels, inline errors, a linked multi-error summary, retained input, announced errors, pending state, disabled duplicate submit, safe cancellation and exact retry behavior above are satisfied.

### SP-05 — successful mutation/outcome feedback

Accepted for the M02 terminal transition and M20 only when success follows an authoritative committed/recovered response. Local state, navigation, a timer or animation is never success evidence.

### SP-06 — consent/privacy purpose choice

Accepted for M06/M07 only under Q04-DEV-23: purpose-specific information, two non-preselected paired choices, equal continuation, pending/failure/retry behavior, and no dark-pattern treatment of Reject.

SP-02 and SP-12 are not globally approved by this preview. No collection UI or modal/bottom-sheet is required by the bounded states. Any implementation that adds an overlay inherits the still-pending SP-12 gate.

## 7. Proposed Android responsive/accessibility acceptance

The bounded surfaces must satisfy all of the following before implementation evidence can pass:

- Android touch targets are at least 48×48dp with visible pressed and disabled feedback.
- Body text and meaningful text have at least 4.5:1 contrast; meaningful control boundaries and non-text state indicators have at least 3:1 contrast. Color is never the only error, pending, selection or success signal.
- Screen-reader traversal follows visual order. Fields expose label, value, hint, required/invalid state and error association; buttons expose name, role and disabled/pending state.
- Android Back/cancel never commits a choice or displays a late response on an abandoned screen.
- Password managers and paste are allowed; no cognitive-function-only authentication step is introduced.
- Safe areas, system bars and the on-screen keyboard do not obscure focused fields, errors or the primary action.
- At 360×800 logical pixels portrait and 800×360 landscape, at text scales 1.0 and 2.0, there is no clipped required content, overlapping action, hidden focused field or horizontal scrolling. Content may scroll vertically.
- Layout may use wider adaptive gutters at larger widths but may not introduce a materially different product flow.
- Motion is not required to convey state; any decorative motion respects the platform reduced-motion setting.

This preview does not add a dark-mode requirement or tablet product scope. If either is later required, it needs its own accepted visual evidence rather than inference from the light phone baseline.

## 8. Evidence required after approval

Even after exact PM approval, the six rows remain not visually ready until the repository contains:

1. verified Version 5 provenance/digest trail and source-to-route mapping;
2. reference captures for each relevant Version 5 route/state, including the conflicting states retained as evidence;
3. approved-production reference representations for all required states absent from Version 5;
4. responsive captures at the approved logical viewports/text scales;
5. Android semantic/accessibility evidence for labels, focus order, errors, pending/disabled state and touch targets;
6. traceability from M02/M06/M07/M08/M19/M20 through Q04-DEV-15/23/24, SP-01/05/06, RMVP tests and UAT anchors; and
7. independent review showing that Q04-DEV-21/22 and excluded features were not silently implemented.

The exact physical Android device, OS, build identity, executor, execution window and evidence location remain a separate RMVP-01A Ready gate.

## 9. Ready effect if approved

Exact approval would:

- approve Q04-DEV-15, Q04-DEV-23 and Q04-DEV-24;
- approve the bounded detailed state specifications above;
- approve SP-01, SP-05 and SP-06 only for this RMVP-01A projection; and
- resolve the affected-surface authority/content portion of the RMVP-01A Q04 gate.

It would not complete the Q04 evidence, responsive execution or accessibility evidence gates. RMVP-01A would remain `Not Ready`, and production `Ready` would remain empty.
