# LI History shared-entry increment

13 October 2026, Asia/Singapore. Owner LI; independent new-LI-code reviewer DU;
changed-source combination executor JIN, gate evidence reviewer LI.

## Exact contribution

Executable source **447c037** over accepted #87 **9a4931d**. This is a new stacked
candidate, not a rewrite of #87/#91 or a merge into main. Accepted DU #89
**6ef6978** supplies six byte-identical inputs: Android MainActivity, Check-in
providers, HistoryDevicePort, History controller/page and four controller tests.
Their accepted review/evidence remain attributed to DU/LI at the old source.

New LI work is `IsolatedHistoryHomeApp`, the app-owned positional builder adapter,
router saved-read return refresh, seven actual-page shared tests and their device
wrapper. The explicit harness receives its controlled Auth and Backend client,
wires the real BackendAccount/CheckIn repositories in one ProviderScope, and
binds the accepted real History page. The harness caller owns isolated setup and
teardown. No main/bootstrap/default provider or ordinary enablement changes.
Existing synthetic AI harness remains separate and unchanged.

Home→Footprint uses actual page/controller and repository request mapping;
saved IDs go to the existing owner-read route. On pop, the current observed
session and mounted original History route are rechecked, then its selected
date is freshly reloaded. Logout/same-UID session replacement clears the owned
stack and ignores old results; new navigation preserves the existing guards.

## Actual validation on the final source

- Flutter3.47.2/Dart3.13.2 `fvm flutter test --no-pub --reporter expanded`:
  **489/489 Pass**, outer exit0. Includes seven new shared cases and four copied
  DU controller cases; these counts are not additive to the total.
- `fvm flutter analyze --no-pub --fatal-infos`: **no issues**, exit0.
- Non-writing format across nine affected Dart files: **0 changes**, exit0.
  Exact base/head diff whitespace passes. **6/6** DU input Git blobs match #89.
- `ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub
  --target integration_test/history_shared_router_flow_test.dart`: Pass, exit0.
  AAPT confirms **com.enmori.app.personatest**, minSdk/dependencies unchanged.
  APK SHA256 `30bf975e8eb6156d5b5f26341f5c3c6df9975c5760c4bd5bc72b788ed8675a6d`.
  Existing Kotlin-plugin/SDK-XML environment warnings are retained in the log;
  no package/version change is attempted for those warnings.

The seven shared cases cover actual Home/page/Back/reentry, captured-zone query,
Next replacement/Reload/date change, saved owner-read and fresh return, same-UID
replacement, logout, explicit Retry after dependency failure, and unavailable
device zone before any History request (two session variants form seven tests).
HTTP and device values in these tests are explicitly synthetic; real Repository
mapping is exercised, but **no real Backend/store/device execution is claimed**.

Final local transcript SHA256 values:

| Receipt | SHA256 |
| --- | --- |
| Full Flutter | b080203be6b1c63183412c596945a0510c30040ca084031b3f39efc18c3408fe |
| Analysis | f55b896b92cba8035e92d192387113cad34eabef3a998104952e1580e208c547 |
| Final APK build | 02955ac1f4d4fded530b1dcdd7b44fbfd7961d634c0189de6dd2e0bb8ff51f24 |

Retained local receipts are under `/tmp/enmori-li-20261013/`; final source
bindings are in [the manifest](2026-10-13-li-history-shared-source.json).

## Failures, evidence limits and next responsibility

Initial new tests failed: a nested test ProviderScope left the router observing
the outer default auth; fixture responses omitted required nextCursor:null;
const-canonical session objects did not represent a new session; the test
assumed an exact HTTP count when session rebuild can issue an obsolete read
before route disposal. Final fixtures use one scope, actual wire shape and
distinct observed sessions; assertions prove late data is discarded and cannot
start additional reads. No product contract was relaxed. Intermediate suites
and analysis failures (mounted-context/braces) stay failures in retained logs.
Final source passes all checks; initial APK is not promoted to final evidence.

`adb devices -l` showed no attached target. Device execution, shared real
Auth→Backend→Firestore→Android, API24/25 and human accessibility remain **Not Run**.
This wrapper is ready for an assigned dedicated target and does not install or
clear any ordinary app. The standalone DU device evidence is not relabeled as
shared-source evidence. Backend implementation/input files are unchanged from
#87; old 543 results are not claimed as a new run. JIN owns the new combined gate.

DU reviews the new app composition/router/tests once; six unchanged accepted
DU inputs and old AI need no repeat implementation review. JIN may prepare the
new candidate concurrently, executing/accepting it under applicable review gates.
Until those observations arrive this is **owner-delivered, awaiting review**,
not self-accepted. Keep Draft/Open, main and board unchanged, no full
History/M26/Sprint/UAT/Release completion or replacement deadline.
