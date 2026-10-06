# Synthetic Event Detail — ZHOU review packet

Status: local implementation prepared; ZHOU exact-head independent review Not Run.
Owner: SHI. Required independent reviewer: ZHOU. Codex implementation was prepared on LI's explicit instruction; no owner/reviewer impersonation.
Authority: [bounded PM approval](../../decisions/2026-10-05-li-blocker-implementation-approval.md). Implementation head and run results: [execution evidence](2026-10-05-blocker-execution.md).

Authenticated/onboarded Detail reads only isolated `event_details/{eventId}`. Required and optional fields, Unicode-scalar limits, exact approved HTTPS fixture address, nanosecond-safe UTC/end ordering, availability and expiry are validated. Missing, withdrawn, expired and invalid records produce uniform EVENT_UNAVAILABLE. Internal fields never enter the public DTO. Optional omissions display Not provided; the link supports copy. Home and See All read the same Detail through Backend. Existing six-field recommendation records, formula, request separation and ordering are unchanged.

Review focus:
- `backend/src/event-detail/`, Event route/OpenAPI and guarded isolated composition.
- `lib/features/event_detail/`, conditional Home/See All callbacks, parsing/retry/copy, late result and account-switch handling.
- Shared tests in the isolated-slices, real Emulator, widget and Android harnesses; existing recommendation tests remain in the full regression run.
- Missing-end Detail is direct-interface-only and never added to recommendations or a new browsing list.

Required conclusion: ZHOU records Approve/Changes Requested on the published exact head for the Event scope and shared wiring. #47's closed preparation acceptance does not accept this implementation. No actual provider/import, taxonomy, participation or Going behavior is enabled. Merge, real source approval, Sprint acceptance and UAT remain separate.
