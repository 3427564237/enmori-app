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

## Android background candidate wiring

The explicit `ENMORI_AI_COMPANION_FIRST_FLOW=true` build selection reads the same
four Firebase client options supplied to Dart and generates native resource names
needed by Firebase's provider before Dart starts. It requires the existing group
project and matching App ID / sender ID. Missing, duplicate or inconsistent
configuration fails the build without printing its values. No new configuration
file, Google Services Gradle plugin or service-account credential is introduced.
Ordinary builds do not receive these additional resources. This follows the
documented [direct-resource alternative](https://firebase.google.com/docs/projects/multiprojects#support_multiple_environments_in_your_android_application).

The `proactive_notifications.prepareChannel` handler creates only the fixed
`enmori_requested_followups` channel when explicitly called by the opt-in flow.
Its default importance respects OS settings; its default lock-screen visibility
is private and it creates no unread badge count. Handler registration does not
create the channel, request permission or obtain a token. Messaging auto-init
remains false. Candidate native compilation, token lifecycle, background startup,
notification click, cancellation and device behavior remain unverified.

## Integrated first-flow and source boundaries

The explicit candidate now composes the same physical model lane for ordinary
chat, Persona preview and requested follow-up generation. The F0 store uses the
chat store's retained-message gateway and same-transaction bridge. A fixed owner
and optional worker window are supplied as typed operator configuration; ordinary
startup has neither. A worker window is at most 30 minutes. Registration and the
single-post FCM sender additionally require explicit remote installation/lease
configuration. No actual runtime or worker was started by these edits.

The fixed worker verifies the current Auth account and then current binding and
purpose in Store operations, rather than storing or reusing an HTTP token. Root
shutdown closes first-flow admission and stops its worker before draining the
shared lane. The selected mutable reader is also registered with the existing
conversation I/O tracker using only owner/topic/operation identifiers; cancellation
does not substitute for physical SDK settlement.

Normative API now contains the 11 approved F0 routes, typed source resolution and
message anchors, selected-source preparation/execution, and minimal assistant
origin/source projections. Old request fields and legacy error envelopes remain
compatible. The initial settings response alone permits revision 0 / off / empty
zone. Saved settings require a confirmed IANA zone. Explicit source exclusions
are per request; the inherited-history conflict recovery remains under focused
integration review and is not claimed complete by this checkpoint.

The App candidate flag `ENMORI_AI_COMPANION_FIRST_FLOW` connects the owner HTTP
repository and `/ai/follow-ups` pages. A new follow-up receives an ephemeral
saved-message object bound to the exact authenticated session; URL-only entry or
same-UID session replacement cannot replay it. No ordinary build enables these
routes. Native Messaging opt-in, source navigation/read state and F1 picker work
continue in their respective slices.

Validation at this integration checkpoint: pinned TypeScript build and **55/55**
targeted API/HTTP/composition checks passed; targeted Dart analysis has no issues,
and **19/19** router/composition widget tests passed, including three new candidate
route cases. These are source/fake-transport checks. Initial failures were a test
fixture missing the required isolated profile fields, an old route-environment
expectation, and three Dart brace lints; production guards were retained. Logs:
`integration-first-flow-targeted.log`, `integration-first-flow-targeted-final.log`,
`integration-app-first-flow-check.log`, `integration-app-first-flow-final.log` in
the private round state directory. Their totals overlap module reports and are
not summed into a larger independent count.

QA's separate actual emulator evidence is [10/10 F0 checks](qa-context-first-flow-emulator.md).
The first actual local F0 semantic evaluation is **1 Pass / 7 Fail**, despite all
eight protocol-valid outputs; see [the independent review](qa-f0-semantic-review.md).
That quality gate is open. No deployment, real-account write, FCM send, device
installation, UAT or release acceptance follows from this integration checkpoint.

## Selected-history recovery and exact delivery target checkpoint

Context `26dd48cae40a20a571d73731ea696fde1854259f` is now composed with
the canonical conversation store's `prepareHistorySnapshot` in the selector's
same Firestore transaction. Both readers receive the callback; ordinary prepare
forwards the requested topic, and execution SDK transactions retain the root I/O
tracker. Prepared metadata exposes at most two current complete pair identities
with request-local history keys. Explicit `excludedHistoryKeys` omit those
complete pairs for this reply only. The fixed latest-two window is selected
before exclusion; it never backfills earlier history. Changed history requires a
fresh review. Saved records and the user's draft are not deleted by exclusion.
The prior unresolved recovery gap is retained in the earlier checkpoint and
[independent F1 review](qa-f1-selected-context.md).

Delivery `23ce434504c56906623b7e6c2bb198048c7bfbdc` adds the optional
delivery-reference resolver. Root composes it with the existing first-flow
application and owned-message anchor: an opaque reference must belong to a
currently authorized, published intent, then match the canonical topic,
message and sequence. Absent/unpublished/inaccessible targets fail without a
latest-message fallback. Unknown verification remains unavailable. This read
does not generate, dispatch or mark a message read. Normative OpenAPI and the
route inventory include the same exact-body, candidate-only operation.

Pinned TypeScript compilation passed, followed by **43/43** targeted HTTP,
normative API and delivery-composition checks. These cover genuine proactive
projection, request-local source/history choices, private-field removal,
strict malformed inputs, retirement and target mismatch. Raw logs are
`integration-history-delivery-build.log` and
`integration-history-delivery-targeted.log` under the private round directory.
They are source/fake evidence, not an emulator or real-provider result.

The same assembly includes App `16e1923` and its independent two-case widget
review: a DST overlap keeps both candidates, disables a past candidate and
requires explicit selection/confirmation of a future one. Initial settings
and active-list GET recovery at `be0a7b1` has its separate review. The next
source-card, selected-reply and native-Messaging UI slice remains in progress.

Runtime's one permitted F0 prompt correction `5c0e27d` has completed its
eight-case actual local comparison. Independent QA found **5 Pass / 3 Fail**,
separately from the original **1 Pass / 7 Fail**. No further F0 tuning is being
run. [The comparison](qa-f0-semantic-comparison.md) retains the remaining
presumed completion, dated mood and decision-versus-attendance failures.

Delivery's separate root-wrapper review found that object spreading would drop
prototype methods of a valid class-based source supplier. The concrete current
factory uses own arrow methods, but the interface does not require that shape.
Root replaced the spread with explicit member-call forwarding, preserving the
original receiver. Strict compilation and all four delivery-wrapper cases
passed, including a private-state class supplier. Raw result:
`integration-delivery-receiver-fix.log`. This small correction does not change
HTTP scope or storage/dispatch behavior.

A later wire review found an overly strict cross-pair ordering assumption in
Root's prepared-history projection. The existing Retry contract permits an
older unanswered U1 to receive A4 after U2/A3 completes. The Store therefore
legitimately returns `(U2,A3),(U1,A4)` ordered by assistant sequence. The HTTP
projection now checks each pair's U-before-A order, unique IDs/sequences and
ascending assistant sequence, without requiring non-overlapping pairs. A
targeted late-retry and duplicate-sequence regression was added. Existing
history selection, Retry permissions and model serialization are unchanged.
