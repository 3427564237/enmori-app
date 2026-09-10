# Sponsor Decision — RMVP-01A current-stage accessibility evidence deferral

- **Source ID:** S-SPONSOR-0910-RMVP01A-A11Y-DEFER
- **Status:** Confirmed Sponsor decision
- **Decision date:** 2026-09-10
- **Decision authority:** ENMORI Project Sponsor
- **Relayed and recorded by:** LI HOURUI, ENMORI PM
- **Applies to:** Current RMVP-01A Sprint/Increment closure only
- **Original direction relayed by LI:** “TalkBack and similar accessibility work can be treated as future work and skipped for the current stage.”

## Decision

For the current RMVP-01A Sprint/Increment closure, the remaining accessibility-specific execution and evidence are deferred to future work. They are no longer blockers to closing this current stage.

The deferred evidence includes:

- human audible swipe-by-swipe TalkBack traversal;
- remaining screen-reader focus-order, label, announcement and semantic evidence;
- accessibility-specific error-association and pending/disabled-state announcement evidence;
- remaining touch-target accessibility evidence; and
- accessibility-specific enlarged-text execution evidence, including the outstanding text-scale 2.0 evidence.

Each unexecuted deferred item remains recorded as **`Not Run — Deferred by S-SPONSOR-0910-RMVP01A-A11Y-DEFER`**. This decision does not convert any unexecuted result to `Pass` or `Not Applicable`.

## Current-stage boundary

This decision changes only the current-stage closure gate. It does not defer or waive:

- the approved RMVP-01A product behavior and privacy/security contract;
- the exact M02/M06/M07/M08/M19/M20 state, copy and interaction semantics;
- functional Android evidence for registration, both Initial Choice branches, Note-only Check-in creation and later owner read;
- the remaining functional bounded-UAT rows and privacy-safe negative paths;
- non-accessibility Q04 provenance, traceability and responsive evidence at the ordinary text scale where still applicable;
- independent review, defect/retest recording, PM scope acceptance or repository hygiene; or
- any applicable non-waivable law, platform rule, accessibility obligation or formal assessment requirement.

If a competent legal, platform, Sponsor/Supervisor or assessment authority later identifies an accessibility item as non-deferrable for this stage, that higher applicable obligation controls and the affected closure must stop pending resolution.

## Supersession and retained trail

Within the current RMVP-01A Sprint/Increment closure scope, this Sponsor decision supersedes only the parts of the following PM-controlled records that made the remaining accessibility execution/evidence a mandatory current-stage Done condition:

- `S-PM-0903-Q04-RMVP01A-R1`;
- `S-PM-0903-RMVP01A-START`;
- the derivative RMVP-01A delivery-publication Done/quality wording; and
- derivative GitHub Issue/Project reminders that treated the deferred accessibility evidence as a current blocker.

Those earlier records remain preserved. Their approved accessibility baseline, existing implementation, tests and evidence become retained inputs for the future accessibility work item; they are not deleted, weakened or retroactively reclassified.

## Operational consequences

1. DU and JIN must not be chased for current-stage TalkBack or other deferred accessibility-only evidence.
2. The current focused UAT closure must exclude deferred accessibility items while keeping them visible as `Not Run — Deferred`.
3. Existing accessibility behavior, semantics, tests and evidence must not be removed or regressed merely because the remaining evidence is deferred.
4. A future backlog item must define scope, estimate, owner, reviewer, execution environment and acceptance evidence before the deferred work starts.
5. This decision alone does not mark RMVP-01A, Q04, UAT, Release or the GitHub Project `Done`; all remaining non-deferred gates still require their own evidence and disposition.

## Attribution boundary

This is recorded as a Sponsor decision because LI HOURUI explicitly attributed the direction to the Sponsor on 2026-09-10. LI is the relay and repository recorder, not the decision authority. No broader Sponsor decision, accessibility exemption, Release acceptance or retrospective evidence claim is inferred beyond the exact scope above.
