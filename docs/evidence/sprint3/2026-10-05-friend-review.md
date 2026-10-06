# Isolated Friend request chain — SHI review packet

Status: local implementation prepared; SHI exact-head independent review Not Run.
Owner: JIN. Required independent reviewer: SHI. Codex implementation was prepared on LI's explicit instruction; no owner/reviewer impersonation.
Authority: [bounded PM approval](../../decisions/2026-10-05-li-blocker-implementation-approval.md). Implementation head and run results: [execution evidence](2026-10-05-blocker-execution.md).

Five authenticated endpoints support exact lookup, send, bounded recipient inbox, accept and decline. Target projection uses actual DisplayName and Q18 relative state. Synthetic eligibility and explicit per-pair block fixtures are required. Pair mutation and reference cleanup share one transaction; a fresh random request reference cannot be confused with an earlier declined/expired request. Expiry is exactly 30 days; no request history, public lifecycle operation or replay receipts. Isolated lookup/send limits are 30/10 per 60 seconds with uniform target-unavailable output.

Review focus:
- `backend/src/friends/`; pair/reference atomicity, reverse concurrent send, recipient authorization, expiry and fixture block/delete races.
- `backend/src/transport/register-isolated-slices.ts`, guarded `build-app.ts`, bounded gateway query and OpenAPI. Controlled-demo is not wired; missing synthetic authority is unavailable.
- `lib/features/friends/`, conditional route entry, bodyless POST support, account-change/disposal guards and screen recovery. The Android chain exposed existing SignInController pending state surviving a router/auth transition; `lib/features/auth/presentation/sign_in_controller.dart` now resets on subject changes and discards disposed completion, with two focused lifecycle regressions in `test/features/sign_in_lifecycle_test.dart`.
- `backend/test/isolated-slices.test.ts`, `backend/emulator-test/blocker-slices.integration.test.ts`, `test/features/blocker_slices_test.dart` and `integration_test/s3_blocker_real_backend_test.dart`.

Required conclusion: SHI records Approve/Changes Requested on the published exact head for the Friend scope and shared wiring. #46's closed preparation acceptance does not accept this implementation. Real-user qualification/operational activation, merge, Sprint acceptance and UAT remain separate.
