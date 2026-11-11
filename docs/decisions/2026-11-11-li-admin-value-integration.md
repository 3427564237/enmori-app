# LI — valuable Admin capabilities and integration

Date: 11 November 2026, Asia/Singapore.
Source: LI's request in this task, “先完成并入这几个最有价值的功能”, following the capability inventory and recommendations.

## Confirmed direction

Complete and integrate the highest-priority Admin capabilities discussed in this task. The delivery scope is interpreted as (1) a read-only runtime-status panel, (2) Event Category management, and (3) limited administrator operation records. Recommendation configuration and account-action workflows were explicitly recommended for later and are not included.

The initial request authorized the work and integration direction. Concrete physical choices were then collected in the [implementation contract proposal](../planning/2026-11-11-admin-value-contract-proposal.md) and approved as recorded below. Neither approval claims deployment or release acceptance.

## Retained authority and exact change trail

- Retain [C2](2026-08-31-pm-requirements-decisions.md): bounded Admin catalogue management; no direct account punishment, moderation, or self-assigned privileges.
- Retain [Q12](2026-09-02-interest-tag-event-category-contract.md), including independent typed IDs, name uniqueness, non-cascading lifecycle, optimistic concurrency, and reference-protected deletion.
- Retain the [5 November Interest extension](2026-11-05-li-ai-latency-admin-polish.md) and its connected-runtime deletion gate.
- The latest request selects limited operation records as a product direction after the prior answer disclosed Q12-D's audit-history exclusion. Preserve that old exclusion in its original source; the later confirmation below selects the exact exception and retention policy. Do not treat this direction as approval of unlimited catalogue history or ordinary-user surveillance.
- Keep Q14's existing configuration/account-request retention rules unchanged. The separately approved catalogue-audit purpose below does not borrow or change those lifetimes.

## Confirmed physical contract

LI reviewed the linked concrete contract and selected **“按此方案实现并入（推荐）”** in this task on 11 November. This approves that proposal's exact routes, DTOs, storage, passive status semantics, Event association extension, 30-day atomic operation records and local integration target. It supersedes Q12-D's catalogue-audit exclusion only for the proposal's bounded records; all other Q12 and Q14 rules remain unchanged. No repeat approval of those choices is required. Preserve the proposal text as the reviewed contract; implementation evidence and any subsequent change belong in separate records.

## Working baseline

Prepare on `souma/admin-value-20261111`, isolated from the dirty main checkout and based on `souma/demo-ready-20261111` at `a5491dde0eec9173f113151a8fa9a2dee10dd3b0`. The latter has untracked v61 evidence owned by the existing demo work; do not overwrite or include it without inspection.

Source implementation, verification, local integration, built APK, deployed Backend and phone acceptance must remain distinct. No completed implementation or acceptance is claimed by this decision record. Existing accounts, catalogue records, phone login and private credentials are preserved.
