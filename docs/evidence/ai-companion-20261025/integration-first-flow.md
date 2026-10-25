# First-flow integration evidence

Authority: [LI's scoped implementation decision](../../decisions/2026-10-25-li-ai-companion-first-flow.md).
Implementation is in progress. This record does not approve deployment, account writes,
native installation, registration, FCM sends or cloud product adoption.

## Shared dependency and error boundary

Commit `c5357a7` adds the four agreed failure kinds through the Backend catalogue,
Transport error list, normative error enum and Flutter result/localization boundary.
New F0 routes use the existing AI N01 envelope `{error:{code,message},requestId}`.
Older non-AI routes retain their existing nested request ID envelope.

The direct dependency is exactly `firebase_messaging: 16.7.0`. Resolution adds only
that package, platform interface 4.10.0 and web 4.2.5. Existing Core 4.14.0, Auth
6.6.1 and all previously locked packages remain unchanged. Manifest defaults disable
Messaging auto initialization and analytics collection. This is not native token,
background startup or FCM service verification.

At integration `47839d7`, pinned Node 24.19.0 / TypeScript 7.0.2 compile passed;
the existing OpenAPI contract checks passed 6/6. Targeted FVM Dart analysis of the
three shared Dart files reported no issues. No new API routes were present in that
check. Raw logs are owner-local under the round's state directory.

## Native civil time resolution

`com.enmori.app/time_zone` now supports `resolveCivil` with integer
`year,month,day,hour,minute` and explicit `timeZone`. It returns candidates containing
only `dueAt,timeZone,displayTime,offsetLabel`. A gap returns an empty list; an overlap
returns alternatives requiring explicit selection. Invalid fields, unknown zones,
numeric offsets and abbreviations fail. There is no default-zone or automatic
date normalization fallback.

The implementation uses Android's [ZoneRules.getValidOffsets](https://developer.android.com/reference/java/time/zone/ZoneRules#getValidOffsets(java.time.LocalDateTime)),
available from API 26. Older Android versions receive `TIME_UNAVAILABLE`; the minimum
SDK and dependencies were not changed. The UI must retain input and explain that
time resolution is unavailable. It must compare the returned zone to its captured
zone and clear confirmation after editing fields or observing a device-zone change.

A dependency-free JVM check compiles the production Java resolver with `javac
--release 17` and verifies Singapore, a DST gap and overlap, a 30-minute overlap,
Apia's skipped date, UTC and invalid inputs. It passed. Raw result:
`native-time-check/result.log` in the owner-local state directory. This verifies
resolver logic with host zone data; Android compilation and physical UI remain
separate checks.
