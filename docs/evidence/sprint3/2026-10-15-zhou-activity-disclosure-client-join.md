# ZHOU Activity disclosure client join

15 October 2026 SGT. Workspace `D:\3851`. This delivers a tested, feature-only combination for LI to receive while JIN's ongoing Event-service increment is separately awaited. It does not change LI's branch or operate the live preview.

## Exact source

- LI base: #119 `dcb94d925b8010e02d41f033e84ed3902ab08559`.
- Approved feature: #120 `49d9b7d8df1b3d6819139473c1f67c91938266e7`, [ZHOU approval5531488284](https://github.com/3427564237/enmori-app/pull/120#pullrequestreview-5531488284).
- Tested product: `df42ed2897cfd4058f15f481cf1e26ca31977a6f`, tree `b689ba806c210b2d1222408ecdba4700473cbc50`.
- Construction: clean cherry-pick of the four approved page/test/decision/display-document paths onto that LI base, with no conflict resolution or new implementation. Those four blobs match #120 exactly.

The LI shared app/router/native, harness, controlled entrypoint, Backend/API, integration targets, shared route tests, tooling and dependency/lock inputs remain byte-identical to the LI base. The resulting Activity page contains the reviewed list data flow, browser/clipboard explanation and five-minute lifetime sentence. It adds no provider call, route, credential, consent gate or activation. The implementation authority and its supersession boundaries remain in the [existing handoff](../../decisions/2026-10-15-li-activity-disclosure-implementation-handoff.md).

## Independent composed-client checks

Pinned Flutter3.47.2 / Dart3.13.2, existing dependencies, no installation:

```text
flutter test --no-pub --reporter expanded test/features/event_browse_test.dart test/app/activity_shared_router_test.dart test/app/external_activity_opener_test.dart
dart analyze --fatal-infos lib/features/event_browse lib/app/router/activity_routes.dart lib/app/platform/external_activity_opener.dart test/features/event_browse_test.dart test/app/activity_shared_router_test.dart test/app/external_activity_opener_test.dart
git diff --check dcb94d925b8010e02d41f033e84ed3902ab08559 HEAD
```

Focused **27/27 Pass**, exit0; scoped fatal-info analysis no issues; delta whitespace Pass. Existing feature/widget cases cover actual disclosure strings,320x640/2x text, empty/error distinction and lifetime clearing. Existing shared route cases cover default-disabled omission, all nonauthenticated gates, Home/list/Detail/Back, replacement-session and background invalidation, no duplicate Detail/read and no late action restoration. Native-opener unit cases use channel doubles to verify explicit exact URL handoff and rejected/stale/capability-failure paths. There is no new product bug or fix inferred from this successful combination.

Post-run working-vs-Git verification binds **483 selected tracked inputs**, normalized aggregate `002716c9d52700f39d42af067f01d38d4ceaac602cb8e753269a8f43baa0d0af`. This is a post-run capture, not a newly claimed before/after pair. [Content-free machine receipt](2026-10-15-zhou-activity-disclosure-client-join.json) records exact feature blobs, commands and local log hashes. Raw logs stay local. Subsequent report-only commits do not alter the tested application inputs. Earlier #120 10/10 and LI's old actual device results retain their original sources and attribution; they are not added to27 or transferred to this head.

## Handoff and affected gaps

At the recorded public-source check, LI #119 still had the old ActivityPage and JIN's ongoing Event source/gate construction was not publicly delivered. #121 `3304141098225dce4564d1c1c1940f15141bf317` is the separately SHI-approved readiness test/procedure packet; production/operator/API inputs are unchanged, so it is not the missing Event service. Existing #113 isolated Event and #117 ongoing AI/Persona service remain separately accepted sources.

LI can receive this exact feature-only combination into its own candidate without another review of unchanged #110/#120 components, or consume the original #120 directly. LI supplies the authoritative integrated head, actual rendered disclosure and provider/service/phone/browser and disable/client-clear/owned-copy exercise. JIN supplies the optional process-owned, default-disabled Event source/gate composition and runnable handoff; SHI reviews only that new Backend delta. ZHOU remains available for concrete feature/client findings and targeted correction re-review. The service handoff blocks the real Event join only; completed AI/Persona evidence and this client compatibility check remain valid within their scopes.

No real provider, model, Emulator, device or service operation was performed for this packet. No private runtime configuration, APK build/install, source activation, live-preview change, main merge, Issue closure or Project transition occurred.21:00 checkpoint and23:59 team target remain; this packet is not whole-baseline or real Event acceptance.
