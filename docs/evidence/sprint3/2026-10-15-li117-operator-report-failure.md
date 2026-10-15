# LI independent #117 report-I/O failure probe

Exact JIN head `b7aad4c3653af6979575a2840807b83a7118df5d`. Independent locked strict compilation and operator5/5 pass. A separate injected operator-seam probe demonstrates an uncovered exception path; zero actual model, listener, Firebase or device calls.

Running status publication fails, entering `runPhoneService` catch. `stopAndClean()` reports an unsettled original/hold. Held-status publication fails again at `tool/controlled_phone_service.mjs:223`, escaping the loop. The outer promise rejects while the simulated original is still pending and its listener is not closed. The CLI rejection handler at240–241 converts this into exit1. Subsequent Firebase CLI fixture teardown follows from the outer source control flow, not an actually executed outer CLI in this probe.

[Safe result](2026-10-15-li117-operator-report-failure.json). Reproduce after the normal locked compile with Node24.19.0: `node tool/li117_operator_report_failure_probe.mjs`. This historical counterexample expects the old source failure; its exit0 proves reproduction, not successful lifecycle preservation.

JIN retains implementation and SHI new-code review. Make report/handoff-removal I/O failure unable to terminate a still-held original process; retain the same fixture and retry safe close/reporting. Cover both running→held report failure and handoff-removal failure. Do not bypass model/SDK settlement, reset an epoch, add a replacement lane, or change public API/DTO. The ordinary app/APK lane and zero-generation preparation can proceed independently.

No new real generation should be attributed to #117 before this defect has a corrected source and applicable disposition. This finding does not reopen accepted #105/#112/#114/#115 components. No merge, runtime/Issue/Project or UAT/Release/Done action.
