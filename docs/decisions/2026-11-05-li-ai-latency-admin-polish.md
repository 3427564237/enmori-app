# LI — AI response time, Admin and observed usability repairs

Date: 5 November 2026 (Asia/Singapore). Authority: LI / PM, this task.

LI requested: “优化AI回应时长以及完善管理员部分，如有其他uiux或功能问题一起解决”.
This authorizes investigation and bounded implementation of AI latency,
existing Admin and other demonstrated UI/functional defects. It extends the
[4 November frontend-only increment](2026-11-04-li-nonai-admin-insights.md)
to include AI/Backend performance repairs. It does not remove the approved
architecture, authentication, consent, source closure, budget, unknown-result,
reference-lifecycle or independent acceptance requirements.

The working candidate combines the latest Admin/insights source `69f05699`
and Sol test-app source `eef20ee5` in an isolated worktree. Existing work and
the original main checkout are retained. The [bounded Sol acceptance](2026-11-05-li-sol-test-app-acceptance.md)
and its one deferred quality case remain unchanged. The existing full-reply
15-second target is not waived by this request. Serial same-stage independent
reads may be optimized only with equivalent fresh authorization, ordering of
failures, cancellation and late-result rejection. No new model, prompt, timeout,
residency policy, cloud allowance or infrastructure is selected by this record.

For Admin, retain [C2](2026-08-31-pm-requirements-decisions.md),
[Q12](2026-09-02-interest-tag-event-category-contract.md) and the existing
[single-create capability](../../api/interest-admin-capability-contract.md).
Repair the existing functions directly. A concrete contract proposal will
separately identify the missing management API/data consistency decisions;
this request is not recorded as approval of an unseen endpoint, migration,
reference inventory or role grant. No nonfunctional Admin controls may imply
that absent Backend behavior exists.

Use isolated test data for regression and rendering checks. Preserve existing
phone login/data if building or installing a compatible update. Report source,
controlled timing, deployed service, APK and physical-device evidence separately.
No team messages, external publication, main merge, account/data mutation or
Release/UAT acceptance is implied.

## Confirmed Interest management extension

LI reviewed the [concrete Interest administration proposal](../planning/2026-11-05-interest-admin-completion-proposal.md)
and selected “按方案完成兴趣管理（推荐）” in this task. This approves that
proposal's exact management GET/PATCH/DELETE contracts, existing Firebase
storage reuse, fresh Admin checks, revision protection, name reservations,
readback/recovery UI and reference-inventory gate. It supersedes the prior
single-create implementation boundary only for the Interest lifecycle slice.
If complete reference safety cannot be established without a new registry,
index or migration, deliver the other operations and keep deletion closed as
specified in the approved proposal. No Event Category/configuration/account
request schema, real Admin grant or real catalogue mutation is approved here.
