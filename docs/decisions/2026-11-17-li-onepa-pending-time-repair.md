# LI: approve the per-request time check after shared onePA detail reads

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

After the [two approved onePA repairs](2026-11-17-li-onepa-identity-refusal-repair.md)
were implemented and regressed, an independent offline application-composition
check reproduced a separate shared-read defect. A request admitted at the event's
start time could join an earlier request and receive its still-future projection;
the synthetic Participation composition could save Going for that started event.
Three rejection expectations failed and three positive controls passed. No real
participation, provider or Firestore operation was performed for this diagnosis.

LI was given the concrete two-line proposal and instructed **“加入修复并回归”**.
Approve only the per-caller check in `OnePaBrowseSource.load`: after shared work
completes, return a row only when its `startAt > asOf` for that caller's existing
request time. This is the same eligibility check as the existing cache-hit path.

Reviewed unapplied patch SHA-256:
`cccdbd9bc84523cc00aa0ec9fc5a41b91a48073feb10a357d51cfd6b86825405`.
Add permanent regression coverage and repeat the affected/full backend checks.
Include this repair with the two earlier approved repairs in the concrete backend
candidate presented for deployment review.

No new clock observation, response-time eligibility rule, TTL, cancellation,
coalescing, cache publication, retry, budget, API, data model or dependency change
is approved. Existing decisions and the earlier repair's evidence remain intact.
This extends only the previously excluded per-request asOf boundary; it does not
approve every shared-pending/cache hypothesis or attribute historical 503s.

Deployment remains separately subject to LI confirmation. AI renewal and physical
phone operation remain deferred. Synthetic Going writes are never production
acceptance or evidence that an actual user's participation was changed.
