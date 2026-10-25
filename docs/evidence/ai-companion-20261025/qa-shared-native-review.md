# QA — shared failures, fixed Messaging lock and civil time

25 October 2026. Independent read-only source review of Integration commits
`c5357a74b898d592714b67f43025560fcf65f31d` (shared errors/dependency) and
`1a1f96b11606d6ecd7bb1124b823a9dfbad6e7d5` (native time resolver).
QA read the complete changed source and the native JVM-check source. No test,
Flutter/Dart analysis, dependency resolution, Gradle build, registration or
device operation was executed by QA for this checkpoint.

## Dependency scope

Compared every package block in `pubspec.lock` against shared baseline `ce6782c`:
all **131 existing entries are byte-for-byte unchanged**, none removed. The new
lock has 134 entries, adding only:

| Package | Locked version |
| --- | --- |
| `firebase_messaging` | `16.7.0` (exact direct dependency) |
| `firebase_messaging_platform_interface` | `4.10.0` |
| `firebase_messaging_web` | `4.2.5` |

Core remains `4.14.0`, Auth `6.6.1`. `package.json` is unchanged, including Admin
`14.3.0`. The application manifest sets Messaging auto initialization and
analytics collection false. `android/app/build.gradle.kts` is unchanged; no
minimum SDK or desugaring/dependency change was introduced for time conversion.
These are lock/source observations, not proof of native merged-manifest behavior,
absence of future explicit token calls, registration or FCM availability.

## Failure mappings

The four approved additions agree across the Backend catalogue, transport list,
OpenAPI error enum, Dart kinds, general Backend decoder and Chinese localization:

| Code | HTTP | Dart kind |
| --- | --- | --- |
| `PROACTIVE_REVISION_PRECONDITION_FAILED` | 412 | `proactiveRevisionPreconditionFailed` |
| `PROACTIVE_INPUT_INVALID` | 422 | `proactiveInputInvalid` |
| `AI_SOURCE_UNAVAILABLE` | 404 | `aiSourceUnavailable` |
| `AI_CONTEXT_SELECTION_CONFLICT` | 409 | `aiContextSelectionConflict` |

The catalogue preserves review/readback semantics and does not tell the client
to replay an unknown command. Actual F0 routes are not established by adding
these enums. The existing general decoder expects nested `error.requestId`;
the AI repository has a separate strict status/code table and top-level
`requestId`. Integration's F0 handoff selects the latter N01 envelope. App was
notified to keep the new route's decoder consistent and to extend the separate
AI decoder when source/resolver/F1 execution reaches it. The shared-enum check
does not establish that every future consumer already handles the new failures.

## Native time resolution

`FollowUpCivilTimeResolver` validates the explicit zone against available region
IDs (plus supported UTC), rejects unknown zones, numeric offsets/abbreviations
and invalid calendar fields, and asks `ZoneRules.getValidOffsets` for every valid
offset. Each output carries only UTC due instant, the same zone, displayed civil
time and its offset label. It does not normalize a gap or select a fold candidate.
The caller is the existing Kotlin `MainActivity.kt`, not a new Java activity.

The official Android reference confirms that
[`getValidOffsets`](https://developer.android.com/reference/java/time/zone/ZoneRules#getValidOffsets(java.time.LocalDateTime))
is available from API 26, returns no offset for a gap and alternatives for an
overlap. [`ZoneId.getAvailableZoneIds`](https://developer.android.com/reference/java/time/ZoneId#getAvailableZoneIds())
returns supported region IDs rather than arbitrary numeric offsets. QA checked
these primary references on 25 October. `MainActivity` checks API level before
calling the helper: API 24/25 receives `TIME_UNAVAILABLE`; invalid input receives
`TIME_INVALID`. Neither is a successful empty candidate list.

The author's dependency-free check covers Singapore, New York's gap/fold,
Lord Howe's 30-minute fold, Apia's skipped date, UTC and invalid inputs. QA read
the complete source and `native-time-check/result.log`, which reports Pass.
That is the author's host-JVM execution using host timezone data. QA did not
rerun it; it is not Android compilation, MethodChannel execution, API 24/25
device behavior or native picker proof. The recorded OpenAPI 6/6 result is also
Integration's execution, not another independent QA run.

Remaining integration cases are explicit fold selection, gap versus platform
failure, candidate invalidation after edited fields/device-zone changes, and
confirmation of the displayed absolute instant before creation. The App adapter
must preserve input on unavailable resolution and never fall back to a guessed
local `DateTime`. Time normalization and source expiry still require Backend
validation. No F0 or physical acceptance is inferred from this source review.

Private hash-bound record:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/shared-native-1a1f96b/source-review.json`,
SHA-256 `67cdf407a0a5d0411f39a6bb73f17ad5fd6c2252982ec7b0d577819f421c0159`.
It records both exact commits, lock comparison, unchanged Gradle configuration
and SHA-256 of the resolver, Kotlin activity and JVM-check sources. No additional
blocking defect was found in these two source deltas; composed/native execution
remains Not Run by QA.
