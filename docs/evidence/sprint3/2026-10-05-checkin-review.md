# Check-in snapshot — DU review packet

Status: local implementation prepared; DU exact-head independent review Not Run.
Owner: LI. Required independent reviewer: DU. Existing PR: #50.
Code commit: `97d102d` on `souma/s3-checkin-snapshot-20261005`, based on PR #50 `497dc1661105f8212f7a0987655ff48aa1a7627e`.
Authority: [bounded PM approval](../../decisions/2026-10-05-li-blocker-implementation-approval.md). The original three-field restriction is retained there with its narrow supersession.

New Check-ins snapshot the Account default inside the existing create transaction. Note-only input, owner-only read, receipt fingerprint and 24-hour replay semantics remain. Creation, replay and owned read return the saved value; legacy omission stays an omission. Flutter displays Private, Friends-only or Public from the response. A disposed controller discards late create/read completion.

Review focus:
- `backend/src/check-ins/`, `backend/src/shared/infrastructure/firebase/firestore-records.ts` and CheckIn Transport/OpenAPI response schema.
- `lib/features/check_in/`, including optional strict parsing, legacy rendering and controller disposal guards.
- `backend/test/firestore-check-in-repository.contract.test.ts`; existing two Emulator suites' new snapshot assertions; `test/features/check_in_note_validation_test.dart` disposal regression.
- Additional real Emulator snapshot/concurrency and Android create/re-read evidence in the combined isolated test harness, summarized in [execution evidence](2026-10-05-blocker-execution.md).

Required conclusion: DU reviews the new exact PR #50 head after authorized publication. Record Approve/Changes Requested with exact SHA; local tests are not that conclusion. PR #42/#43 gates, real-device/cloud verification, merge, acceptance and UAT remain separate.
