# LI activity provider and assigned-device verification

15 October 2026, LI / PM. Delivery scope remains the runnable candidate/APK selected in [the baseline decision](../../decisions/2026-10-15-li-baseline-candidate-delivery.md), with [EB01–06](../../decisions/2026-10-15-li-real-event-contract-selection.md) and the [external-open amendment](../../decisions/2026-10-15-li-event-external-open-selection.md). These are three separately executed results, not a real provider-to-phone end-to-end result.

## Delivered observations

| Boundary | Actual result | Source |
| --- | --- | --- |
| Strict actual provider first batch / corresponding Detail | Pass: two GETs, both200;18 eligible occurrences; corresponding Detail identity matches; disable refuses another fetch | SHI #110 `0b730c52fd62ddfc02bdc7166ab1a80374eb2681`, seven exact extracted TS inputs, Node24.19.0/TS7.0.2 |
| Android native source action and router lifecycle | Pass,1/1: actual MethodChannel,9 rejected unsafe URLs, Home→list→Detail→explicit source action→Chrome→return→cleared Detail/list→explicit Reload; exactly4 synthetic GETs, zero writes | `e1e645d75c9d778ba05a0e00c5668644e8c6eaf3` |
| Offline candidate critical journey | Pass,1/1: actual IME, AI draft Keep/discard/Persona return, Check-in Save/Confirm, Footprint→same saved ID→Back, Me→settings→Back | `5aa0b69adb872fdb6e0ef3a41ba75c84b0d1ba7e`; this test file is unchanged in the later source |
| New shared stacked-route regressions | Agent13/13 file; parent independently1/1 new pending-action case, overlapping13 | pending opener cannot restore notices/content after background; covered list callback cannot stack another Detail |
| Scoped verification | Four Dart files: fatal-info analysis clean, format0changes; delta whitespace clean | logs hashed in the receipt |

The phone is vivo V2405A/API36. Device tests do not override viewport, text scale or keyboard insets. Activity UI/Auth/HTTP payloads are synthetic, including the source action to the public Ticketmaster homepage. Android Intent dispatch, Chrome foreground and lifecycle return are actual observations. The host inspected only package identity, selected no browser default and captured no screen/page contents; the human selected Chrome in the OS chooser. Browser page load/content and real occurrence content on the phone are not asserted.

The offline test made zero model calls. Its surrounding combined command was **1 passed /1 failed**: Offline passed; Activity initially failed. That aggregate is retained, not rewritten as2/2. The later corrected standalone Activity command passed1/1. Product `lib/`, Android and lockfile inputs remain unchanged from #116 `ab17cae25ef045ef7bfb93a5c5e4f2f419d5f30e`; integration entrypoints differ from the preview APK. The built Activity runner hash is recorded, but an installed runner hash was not captured before Flutter cleanup. No credential/real-account packet is attributed to this runner.

## Actual provider probe

The original exact adapter performs SG,size20,page0,date ascending, known future non-test filtering, one request/read, no retry/pagination,10s/1MiB and strict Unicode/UTC/locator/URL projection. Actual response bytes:118164 list,5763 Detail. All18 eligible summaries omit endAt; none omit location/category. Missing end remains visibly optional for browse/Detail and remains ineligible for the existing recommendations; no synthetic end or recommendation change follows.

The previously accepted private configuration was read with mode600 and `termsAccepted===true`; values were not printed/copied into Git. Raw provider content and identifiers were discarded; only counts/booleans/statuses were saved. Disabling the process-local adapter gate then refused a new firstBatch with no fetch. This is adapter-gate evidence, not proof of an ongoing service's removal SLA. No shared Backend, Auth/Account service, datastore, importer or model was started for the probe. A scratch extraction initially omitted three transitive type files; adding exact source dependencies fixed strict compilation, without source edits. [Provider receipt](2026-10-15-li-activity-provider-source.json).

The official [terms](https://developer.ticketmaster.com/support/terms-of-use/) and [Discovery documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) were refreshed. Existing visitor disclosure and operational removal/disable readiness remain requirements for product activation; this probe does not establish that readiness or require a new provider-contact workflow.

## Retained test failures and corrections

- First device attempt ended incomplete; the next was stopped during connection/startup investigation. Fixed-stage diagnostics subsequently demonstrated that the test waited for an unresolved startup spinner. It now waits for observed Auth before switching its synthetic gate.
- Home controls require lazy-list scrolling on the assigned viewport. Explicit read-state/frame waits distinguish transport results from absent widgets; no implicit retry was added.
- Real-device diagnostics identified **FlutterError → TestAsyncUtils.guardSync → expect inside MockClient callback**. The callback ran while a tester action was guarded. All method/query/body/Auth assertions were moved intact into the test body after completed reads. The real repository/client/parser remain in use; host-only success and the earlier device failures are retained. No product parser fix or fake-repository substitution occurred.
- Offline's initial broad Note finder matched both the edit field and the saved receipt. Assertions now select the saved receipt itself and preserve exact Note-count/ID checks. Actual IME and business assertions remain.
- The no-DDS diagnostic attempt also hit an SDK golden-comparator stream error. Final Activity uses normal DDS; no SDK, package or version was changed.

## Cleanup incident and prevention

The ordinary `com.enmori.app` was present before this session and absent after the tests. **It must not be reported unchanged.** Only later verbose traces were retained and show dedicated-package uninstalls; no direct ordinary-package uninstall trace survives the first nonverbose run. SDK source inspection explains a matching failure mechanism: IntegrationTestTestDevice caches its package before building; without a prebuilt `app-debug.apk`, AndroidApk falls back to the ordinary namespace, while startApp later builds the suffixed package; default teardown uninstalls the cached package. The first non-split APK birth time is15:18, during this session. Attribution to that mechanism is an evidence-based inference, not a recovered command trace.

LI informed the human immediately after the discrepancy was found. The human confirmed **“只是旧测试版，没有重要本地数据”**. No data recovery or ordinary-package restoration is claimed. The available ordinary APK cannot be proved identical to the removed installation, so it was not silently reinstalled.

[The guarded runner](../../../tool/run_baseline_device_flow.py) now prebuilds the exact target and validates badging plus the pinned Flutter SDK’s actual `AndroidApk.fromApk` parser before any device test. Its read-only SDK helper binds the same aapt, exact dedicated package and launcher; parser failure cannot fall back to the ordinary namespace. It passes `--no-uninstall` to disable teardown uninstall. Independent review identified the original badging-only check as insufficient because SDK install retry can still uninstall an existing package. The strengthened guard has9/9 injected command cases, plus actual read-only SDK-parser observations; doubles are not another physical run. SDK installation may replace the verified owned test package after a conflict. The wrapper issues no data-clear or global-setting command. Future execution must use this guarded recipe.

The original UX APK was restored successfully, cold-launched, and its pulled installed APK matches the delivered SHA256 `f458ea31909689e85a21a2429125e7886a65cdeaafcef3646ea3112e8be01009`,121547384bytes. ADB reverses are empty; nine run-owned Flutter forwards were removed and the forward list is empty. It remains offline/synthetic. [Device/source/cleanup receipt](2026-10-15-li-activity-and-offline-device-source.json).

## Reproduce and remaining delivery

```sh
python tool/run_baseline_device_flow.py --flutter /path/to/flutter --aapt /path/to/android/build-tools/aapt --device ASSIGNED_DEVICE --flow combined
```

After the explicit handoff, observe the assigned browser/chooser and foreground only `com.enmori.app.personatest/com.enmori.app.MainActivity` to verify return. A browser chooser requires a human selection; do not automate unrelated UI. The local evidence bundle contains the exact package-only observer used, safe run logs, probe script and hash receipts. No repeated model generation, full unchanged suite or new ordinary APK build was needed.

ZHOU's exact #110 and #115 approvals are now received (5529591108/5529591324); they are no longer review blockers. DU's #116 and this new focused packet retain separate review. JIN's ongoing phone-facing service/config/readiness/lifetime handoff remains needed for the ordinary network APK. Real provider→shared service→phone Detail/native browser, visitor disclosure/removal operation and applicable real-account/nonempty-Note gates remain separately unverified. No merge, Issue/Project promotion, full baseline/UAT/Release/Done claim follows.
