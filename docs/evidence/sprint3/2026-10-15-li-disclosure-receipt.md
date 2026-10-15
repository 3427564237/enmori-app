# LI receipt of Activity disclosure and cold-idle procedure

15 October 2026, 18:28 SGT. LI receives the reviewed Activity increment into a separate candidate based on #122 `5e78b7361a9b18aedec9da5352a44945580e1f77` / tree `13138d681a7f70968e290f727e3e3cec972ce9c7`. Existing #119 `dcb94d9`, its installed connected v3 APK and the intentionally live preview are preserved. This candidate adds no runtime policy or new shared implementation.

## Received work and LI disposition

- SHI #120 exact `49d9b7d8df1b3d6819139473c1f67c91938266e7` has ZHOU [APPROVE5531488284](https://github.com/3427564237/enmori-app/pull/120#pullrequestreview-5531488284). ZHOU #122 combines its four feature/test/handoff files with #119. LI independently fetched the original feature and checked all four Git blobs match. The page is received without another review of unchanged components.
- JIN #121 exact `3304141098225dce4564d1c1c1940f15141bf317` has SHI [APPROVE5531134407](https://github.com/3427564237/enmori-app/pull/121#pullrequestreview-5531134407). LI receives its [existing manual, fail-closed procedure](https://github.com/3427564237/enmori-app/blob/3304141098225dce4564d1c1c1940f15141bf317/docs/evidence/sprint3/2026-10-15-jin-cold-idle-readiness-disposition.md). HTTP/startup readiness does not establish current residency; cold refusal can follow saved U. Preserve the original operation, outcome/readback/retry rules and quiet-original checks. Existing authorized zero-content manual recovery remains available; no new recovery run was needed or performed here. The metadata proposal stays a future proposal, with no automatic warming, policy or production change.
- Backend/API, shared app/router, controlled phone entrypoint/harness, Android, tooling and dependency/lock inputs are byte-identical to #119. This receipt is not a new source acceptance of LI's own #119 delta; DU's independent review remains separate.

## LI verification and artifact

Pinned Flutter 3.47.2 / Dart 3.13.2. Existing local dependencies were resolved offline; no tracked dependency or lock change. Actual focused tests **61/61 Pass**, exit 0: Activity feature, shared route, native-channel opener, controlled phone launcher and private configuration. The combined checks cover exact disclosure, 320px/2x reachability, default-disabled routing, Auth gates, list/Detail/Back, session/background/stale callback clearing and existing private-handoff composition. Auth/HTTP/repository/channel are explicit doubles. Scoped fatal-info analysis and delta whitespace pass.

The new [fixture render probe](fixtures/li_disclosure_render_20261015_test.dart) separately passes **1/1**, with clean fatal-info analysis. It reuses the accepted synthetic feature fixtures, loads the pinned SDK's local Roboto font and produces four readable 320x640/2x PNGs. LI visually inspected list data flow, browser/clipboard explanation and action/lifetime views. A long paragraph spans the scrollable viewport; this is fixture rendering, not an actual phone/provider observation. One list read, one Detail read and zero opener dispatches occur. No product source changed to generate images.

```sh
fvm flutter test --no-pub --reporter expanded test/features/event_browse_test.dart test/app/activity_shared_router_test.dart test/app/external_activity_opener_test.dart test/harness/controlled_phone_harness_test.dart test/harness/controlled_phone_service_configuration_test.dart
ENMORI_RENDER_FONT=/path/to/pinned/flutter/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf fvm flutter test --no-pub --reporter expanded docs/evidence/sprint3/fixtures/li_disclosure_render_20261015_test.dart
ENMORI_PERSONA_ANDROID_TEST=true fvm flutter build apk --debug --no-pub --target lib/social_offline_harness.dart --target-platform android-arm64 --build-number 4
```

New **offline** APK: `build/distributions/li-disclosure-receipt-20261015/enmori-offline-disclosure-v4-arm64.apk`, **93,929,835 bytes**, SHA256 **af7e9ecef7abba89c00d7822a3e0db4a625d61d445f45357ecd0661729512447**. The pinned Flutter SDK's actual Android APK parser confirms `com.enmori.app.personatest` and its dedicated launcher; AAPT confirms version code 4, min SDK24/target36. Build succeeds with the existing Firebase plugin/Kotlin compatibility warning; no dependency upgrade was made.

This APK contains the approved Activity page in the existing offline preview. It supplies no Event provider or new connected consumer: unavailable reads remain unavailable. It is **built and parser-verified, not installed**. It shares the dedicated package ID with the running connected preview, so it is retained as a separate artifact rather than replacing that session. The existing connected v3 APK's earlier actual AI/Persona/device evidence retains its own source and binary attribution.

[Machine receipt](2026-10-15-li-disclosure-receipt.json) binds 380 selected tracked client/platform/tool/API/Backend-source inputs to received Git content, exact APK, local logs, font and four PNGs. This selected set is not presented as the earlier 491-input #119 or 483-input ZHOU manifest. The only added executable source in this receipt is the fixture render probe; runtime inputs match #122.

Retained first failures: original #120 object initially absent locally before the blob comparison, then fetched and matched; first screenshots used unreadable Ahem glyphs, then were regenerated with a real font; first render-only analysis identified filename style/protected root-layer access, fixed by rename and a documented test-only scoped suppression; non-writing format initially requested changes, then formatting was applied. First logs/screenshots remain local. No failed product assertion or runtime reset was hidden.

## Remaining executable handoff

At 18:27 SGT, GitHub still exposes JIN's Event branch at accepted #113 `e34f4a2bc40ddc9a4805ac90e31e1ab0215b4691` and ongoing phone service at #117 `f6036d4efbc4f3d7a33378cd7184b01d4eda31bb`. No new ongoing Event source/gate composition was publicly delivered. #121 is received readiness evidence, not that missing service. The client disclosure increment is received independently.

JIN supplies the assigned optional process-owned, default-disabled Event source/gate composition and runnable private handoff; SHI reviews only its new Backend delta. LI then performs real provider/service/phone/browser and the [source-disable/client-clear/owned-copy exercise](../../planning/2026-10-15-li-event-disclosure-and-removal-packet.md). These actual integrated operations remain **Not Run**, pending that concrete service source. No unknown gate name or substitute service is invented, and the unrelated active preview is untouched. Existing DU #116/#118/#119 source review remains independently owned; this packet does not reassign it.

No actual provider, model, Emulator or device operation occurred in this receipt. No main merge, Issue closure/Project, global erasure/SLA, full baseline/Sprint/UAT/Release/Done claim follows. Existing 21:00 checkpoint/23:59 team target remain targets, not completion evidence or owner commitments. New candidate stays Draft/Open.
