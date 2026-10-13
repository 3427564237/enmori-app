# LI shared History Android execution

13 October 2026, Asia/Singapore. LI owner execution on a human-authorized USB
device; this is not an independent reviewer run or the JIN combined gate.

## Exact final source and observations

Executable source `8b7698d7f6cbfa8c282b74ca52b0d66e06eda4a2`, over the initial
DU-reviewed #94 head `8189ac5383a6dd44c01329b38470bf548e489b39`. The only new
executable difference is the shared test fixture: its two HTTP-callback
assertions use `expectSync`, with a comment and an onboarding-state assertion
reason. All production, Android, Backend/API and integration-wrapper inputs
are unchanged. Original receipts remain in the earlier shared-entry record;
the [new source/receipt manifest](2026-10-13-li-history-shared-android-source.json)
binds this run separately.

- Flutter3.47.2/Dart3.13.2 full host suite: **489/489 Pass**, exit0.
- `flutter analyze --no-pub --fatal-infos`: **no issues**, exit0.
- Final USB integration run, **18:58:21–19:00:26 SGT**: **7/7 Pass**, exit0.
  Vivo V2405A, Android16/API36, physical1260×2800, font scale1.0.
- Actual Home→History→Back/reentry, pagination/reload/date selection,
  saved owner-read/return refresh, same-UID replacement, logout/reentry,
  failure/explicit Retry and unavailable-zone behavior passed. The two session
  variants are separate cases; these seven are not added to the host total.
- Test package `com.enmori.app.personatest` was absent before installation and
  after completion; its process and owned VM forwards are absent. Its installer
  checksum marker was removed. Ordinary `com.enmori.app` version metadata and
  lastUpdateTime equal the preflight checkpoint; no ordinary app was replaced,
  cleared or uninstalled.

Command: existing `ENMORI_PERSONA_ANDROID_TEST=true`, then
`fvm flutter test --no-pub --reporter expanded -v
integration_test/history_shared_router_flow_test.dart -d <authorized-device>`.
The APK was built by this driver with the existing debug-only suffix. The
human allowed the OEM installation confirmations. Device serials and VM
authentication URLs are omitted; raw diagnostic transcripts stay private in
the ignored `build/li94-device/` directory, with public hashes in the manifest.

## Failures retained and correction

The first exact-8189ac5 attempt installed successfully but never obtained the
VM connection; LI interrupted only its driver after investigation. Exit1,
**No tests ran** is retained, not promoted to Pass. Scoped diagnostic relaunch
of the owned test app with `--ez verbose-logging true` exposed the VM address.
During the final driver wait, LI reused that driver's original launch arguments
and added this one app-launch extra. No global logging property, credential,
service-auth protection, SDK, dependency or ordinary app configuration changed;
`persist.sys.log.ctrl` remains its original `no`.

The second exact-8189ac5 run connected but failed **0 Pass/7 Fail** before Home:
the MockClient callback's guarded `expect` overlapped live `WidgetTester.pump`.
An additional one-case diagnostic run with the onboarding-state reason also
failed and exposed the `Guarded function conflict` in the provider error.
The correction uses Flutter's synchronous callback assertion, retaining the
same GET and Authorization checks. No assertion, auth/router gate or product
behavior was removed or relaxed. The final source passed both host and actual
device checks; the failed runs remain separately source-bound.

## Remaining gates and incremental review

DU's APPROVE5501061622 applies to the original8189ac5 LI composition/router/test
source. It does not automatically approve this later fixture correction.
Request only the new one-file fixture/diagnostic delta and its evidence; the
unchanged production inputs and six accepted DU inputs need no repeat review.
JIN can prepare the changed-source candidate concurrently and execute its
applicable gate after the new-source review requirements are met. Keep each
owner execution and independent review attributed separately.

HTTP responses, Auth and the injected device zone/time/format values are
synthetic. This proves actual shared Flutter pages/router/repository mapping
on this Android device, **not** a real Auth→Backend→Firestore path, live model,
real device-zone channel, screenshot fidelity, human accessibility, API24/25,
whole History/M26/Sprint, UAT or Release. Those observations remain Not Run
here. Keep PR Draft/Open, main, Issue and Project states unchanged.
