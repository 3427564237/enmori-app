# ZHOU — end waiting after unwrapped request failures

19 October 2026, SGT. Workspace `D:/3851`; branch `codex/zhou-demo-request-failure-20261019`.

## Report, authority and scope

The user reports that the phone APK shows no error and keeps waiting after Send or Save. This host currently sees Windows/Chrome/Edge only, with no Android device. The phone's installed APK identity, affected page and actual exception are unconfirmed. This packet fixes a reproduced source defect; it does not establish that the phone's actual fault is TLS or that the whole demonstration is restored.

The existing [functional reliability priority](../../decisions/2026-10-18-li-functionality-and-reliability-priority.md) and [complete journey direction](../../decisions/2026-10-18-li-complete-user-journey-delivery.md) authorize demonstrated ordinary action/reliability corrections. `ARCHITECTURE.md`, “Result and error boundary”, requires vendor exceptions to remain inside Data and become stable `AppFailure` results. No new requirement or decision is introduced.

Base is LI-approved [#156](https://github.com/3427564237/enmori-app/pull/156), `01e0f1714ae804d143ca00cb52c5a1e29794581d`. JIN [#158](https://github.com/3427564237/enmori-app/pull/158), exact `78757646953ccf80f47180f9443d81a055844615`, has the identical original `backend_api_client.dart` blob `e7e9d2aa427219438f25c9503393e2588cf647c0`. This is an independently applicable delta for the existing candidate, not a replacement composition.

## Demonstrated cause and correction

The ordinary `BackendApiClient._send` normalized timeouts, `http.ClientException` and malformed JSON only. Native TLS `HandshakeException`, token-channel failures and response-stream errors can escape those catches. The installed `http` 1.6.0 `IOClient` wraps `SocketException`/`HttpException`, not every native exception. `BackendCheckInRepository.create` then exits exceptionally while `CheckInController` remains `CommandPending`; the actual composer continues displaying its saving state.

Only five production lines change: the final `on Object` normalizes the remaining errors to the existing safe `serviceUnavailable` result. Specific existing classifications and timeout budgets remain ahead of it. The original note remains editable after failure, the existing failure panel appears, and deliberate subsequent Save retains its existing idempotency key. A transport failure does not prove that the Backend has not committed the write.

There is no automatic resend, TLS bypass, shared-client closure, timeout increase, Backend/API/schema/dependency change or router/bootstrap change. Persona's existing specialized late-completion handling is unchanged. AI already has a bounded waiting path: the positive-control test reaches its existing 75-second timed-out state with Check result available and no extra Execute. That control passes on the original source too; it is not a claimed new AI fix.

## Actual verification

Tested source: `faf00b89c73bdab0f5d66c97798cd8d559cf267f`, tree `26e902a71e8b12aa85d0800bd72503d091015296`. The later evidence commit adds only this document and its JSON receipt.

| Execution | Result |
| --- | --- |
| Exact #156 archive plus the final new test | **2 pass / 4 fail**, exit 1 |
| Final new test on corrected source | **6/6 pass**, exit 0 |
| Final affected repository/controller/page/router/harness set | **268/268 pass**, exit 0; includes those six |
| Both changed Dart files | Fatal-info analysis clean; non-writing format 2/0; whitespace pass |

The four baseline failures are token-channel exception, real package `IOClient` TLS exception, response-body TLS exception and the actual Check-in composer remaining pending. The two positive controls are unchanged malformed-response classification and the AI deadline. The saving widget test uses the real page, controller, repository and shared client, checks retained note and enabled Save, then explicitly recovers with the same nonempty idempotency key. TLS is injected through `HttpClient.openUrl`; no network socket, real service, database or model is used. Auth, HTTP responses and persisted-looking rows are synthetic test-memory fixtures.

All 1,304 original archive blobs match the base, allowing only configured CRLF checkout conversion in 1,237 files. The final test is the only added archive input and matches current bytes. Existing generated package metadata is reused without a dependency update. The [receipt](2026-10-19-zhou-demo-request-failure.json) binds inputs, commands and log hashes. A local independent read-only review found no actionable issue; it is not LI's formal review.

Retained investigation history: an initial fixture used the wrong composer class name; the first saving regression used `pumpAndSettle`, which timed out on the demonstrated perpetual spinner. The final baseline uses finite pumps and explicitly observes `CommandPending`. One test-helper braces lint was then corrected. These intermediate runs are not counted as the final 268 or relabelled as phone results.

## Reproduction and handoff

Local logs are under `build/zhou-demo-request-failure-20261019/`. Exact affected test paths are in the receipt. Core commands:

```powershell
fvm flutter test --no-pub --reporter expanded test/features/backend_transport_failure_test.dart
# Repeat in the exact base export with only that final new test added: 2 pass / 4 fail.
fvm dart analyze --fatal-infos lib/core/network/backend_api_client.dart test/features/backend_transport_failure_test.dart
fvm dart format --output=none --set-exit-if-changed lib/core/network/backend_api_client.dart test/features/backend_transport_failure_test.dart
git diff --check HEAD^ HEAD
```

LI reviews the new shared Flutter client delta. JIN retains the existing candidate integration and exact APK/source/package/version/signer identity; the current #158 build does not contain this later correction. Device verification must use an identified updated candidate and a valid existing approved service. For an ambiguous write, check existing saved state before deliberate recovery; do not infer non-commit or repeat a real model operation to manufacture a result.

Initial local APK inspection found 15 October build files, but this does not identify the user's installed APK. The ordinary, offline fixture and controlled connected entrypoints differ; no guarded module is enabled by changing the default entrypoint here. Current phone reproduction/install/log collection, actual AI Send/Persona Save outcome, continuous 9B/service availability and real persistence remain **Not Run**. No new APK is built or installed in this packet. No service/model activation, old-operation replay, private handoff access, merge, Issue closure, Project transition or whole-app readiness claim is made. Only those device/service-dependent checks remain blocked; the client correction is delivered independently.
