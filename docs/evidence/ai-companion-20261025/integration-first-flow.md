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
Pinned compilation and **4/4** selected HTTP tests passed for this correction;
the raw result is `integration-late-retry-history.log`.

## Selected-reply client and validation cleanup

Client Domain `090e996` and wire `a7a288f` add the optional selected-reply
capability without changing ordinary preparation. A selected Retry explicitly
binds the existing conversation and saved user message. Preparation sends only
manual Check-in IDs with local processing; the returned minimized cards and
history keys belong to that one ticket. Execute sends the original operation
key, closed source choices and explicit history exclusions once. Selection
conflicts and cancelled/unknown requests do not trigger an ordinary-send
fallback. The controller owns ticket expiry and retention of the preparation
token; its final UI checks remain a separate evidence layer.

All **8/8** focused wire tests passed. They cover actual transport shapes,
invalid or content-rich metadata, legitimate late-Retry history, request-local
choices, conflict propagation and late cancellation. Raw log
`integration-f1-wire-first.log` SHA-256:
`495601491705a354e523782f553beb42f9a454ebe7fc7dd6703b92fb6d5eeb32`.
QA independently reviewed the wire against Backend at `e483b7c`; that source
review did not claim to run these tests or accept the unfinished UI.

After the one real F1 continuation and independent artifact review completed,
Integration stopped its own synthetic Auth/Firestore Emulator process normally
(exit 0). All five assigned ports were checked closed. No further model or
Emulator calls are planned in this scope. The original six input files still
match the startup preservation manifest. The existing `enmori-group.service`
remains active in `li-zhou-integration-oct20/ENMORI`, whose source HEAD remains
`7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`; this check is not a deployment.
Owner-local preservation readback SHA-256:
`ad2c62c902ccfea6ceef3a8e800871c62939e5b41cb44aa89c86316266726657`.

## Shared client composition checkpoint

The explicitly selected first-flow composition now injects source references,
an exact-session `/ai/message` locator page and the optional notification ports.
An opaque notification is resolved by the existing owner endpoint, then the
message page reads the canonical target anchor again. Missing or stale locators
do not fall back to Latest. A verified Check-in source opens the existing owner
record route only while the originating route and exact session are current.

`ENMORI_AI_COMPANION_INSTALLATION_REF` is optional. An absent value supplies no
SDK port; the notification boundary creates no controller/listener/token flow.
An explicit valid installation uses the pinned lazy SDK adapter and the existing
registration contract. The planned v28 build omits that value. Its Settings
controls explain that system notifications are unavailable for this installation.
Sign-out calls bounded cleanup while the original session is valid, then checks
session identity again before logging out. Cleanup failure/timeout cannot block
logout or cause a replacement account to be logged out.

Targeted shared-file analysis was clean after removing one redundant import.
The **12/12** composed router/bridge tests passed, including default-null/invalid
configuration with no SDK access, opaque target/abort handling, fresh anchor
reads, stale callbacks and bounded logout with a real notification controller
and a synthetic delayed registration GET. Raw final log SHA-256:
`204f316450a4ac7967aab784ea1ddbc5abed01fce307f75cdf138d08d7fcb620`.
The first two logout tests used an unsuitable nested provider override and did
not reach the mounted settings router; that fixture was replaced. Their first
real-composition version also waited for all Settings animations to settle.
The final tests pump a bounded route transition and invoke the route callback;
they establish logout coordination, not full Settings visual readiness. Those
diagnostic logs remain beside the final log for independent review.

This checkpoint does not close Product's `629a22d` source-body/Search finding or
QA's `cb8d982` same-owner unknown-registration finding. Their module owners are
fixing both before final candidate acceptance. F1 picker/review UI, independent
composed UI review and the final v28 artifact remain subsequent evidence layers.

## Subsequent independent closures and F1 review component

The preceding checkpoint is retained as its original observation. App's
`bd10a8e` applies the source display fence to search results, the selected
message, surrounding messages and captured navigation callbacks. Product
reviewed the repair at `683fac9`; QA independently exercised three counterexamples
at `9c65bb6`. The source/Search P1 is closed within that source/widget scope.
See [QA's separate evidence](qa-app-source-search.md).

Delivery's `df3351f` retains an unresolved registration revision across an
exact-owner session replacement and clears it only after an authoritative
advanced revision. It keeps credentials and different-owner UI separate.
QA's `8bccd50` independently closes the same-owner unknown-fence finding with
two cases. The author's 38-case suite remains a separate result. Neither
result proves SDK, FCM or physical-device behavior.

QA also identified the earlier Settings settle timeout as a test-platform
fixture issue: the language channel lacked its read-only `readLanguage` mock.
The actual settings state was ready. Root's revised fixture supplies that
mock, restores `pumpAndSettle` and explicitly checks `PreferencesPhase.ready`
for the configured and null-installation cases. No production workaround was
introduced for this diagnostic.

Root's `cad5fb4` adds the pure selected-reply review presentation. It displays
only minimized source/time metadata and history pair sequence references.
Confirmation returns to the draft; sending remains a separate action owned by
the controller. Expired or inconsistent review state cannot be confirmed,
busy work can be cancelled, and the layout supports scrolling and enlarged
English/Chinese text. It contains no repository or model calls.

Targeted analysis was clean and **18/18** cases passed: six new review-widget
cases and the twelve updated shared composition/router cases. This is a
replacement run of those shared cases, not eighteen additional cases to sum
with the earlier twelve. Raw log `integration-f1-review-final.log` SHA-256:
`9023d8a06dfcd6f737cca669183c2cd55dbb9f51c6fcd09416673366828a5517`.
App still owns the picker/controller/page composition and its final F1 tests;
independent F1 review and the v28 artifact remain open at this checkpoint.

## Complete Backend regression

Pinned Node 24.19.0 / TypeScript 7.0.2 strict compilation and the complete
tracked Backend unit/contract suite at `fdc9ff4` passed **1,481/1,481** tests
across 121 test files. This run used no Emulator, actual model, FCM or production
account. Its log `integration-backend-final-repaired.log` has SHA-256
`907a69d21641488bd19b2c2b26473e983e581a37b51a45fdfc55c1fd1226ed28`.

The initial complete run at `838e65c` passed 1,480 and failed one exact error
catalogue assertion: the existing expected map omitted the four approved F0/F1
statuses already present in the contract, transport and independently reviewed
shared catalogue. `fdc9ff4` adds those four expected entries only; it changes no
production behavior. The original failing log remains preserved, SHA-256
`ab3afba484cbaf8278c79cfd5bb05ed7d03d1279014cdf17a5b7888cd179cd0a`.

## Final F1 composition and v28 source/artifact checkpoint

The selected-source picker/controller/page from App `ee44827` is integrated
as `721a253`; its access-recovery repair `9bc571c` is integrated as `6b4ec58`.
Root added the exact-session saved-Check-in detail entry at `a20927c` and
corrected only its covered-page test finder at `9d50ac4`. The explicit detail
action opens the selected own record in the picker without preparing or
sending automatically. Current route, original exact session and content
access guards apply to retained callbacks. The unknown original-operation
readback remains authoritative before any new preparation or saved-user Retry.

QA reproduced the real recovery defect at the original head and independently
closed it with two repaired-head cases in `dc170411`; Product reviewed that
closure in `346ac94`. App's final two long-input harness corrections `785571f`
were integrated as `8d5a724`. All three App cherry-pick pairs have identical
stable patch IDs. Earlier pending F1 statements above are superseded only by
these source/widget results, not by a device or deployment claim.

At clean `8d5a724`, full Flutter analysis passed. Six F1/route/Messaging files
passed **55/55**, and the two exact social long-input cases passed **2/2**.
Final log SHA-256:
`6e266d25b4086c6b7e019e0a09822d412bbe146d84ee52383c1926cf043911bf`.
The complete historical suite remains **1,348 Pass / 62 Fail** at its earlier
head; 58 failures reproduce on the original baseline, and four new finder
cases were subsequently fixed and checked. No second full-suite run occurred.
[Regression comparison and closures](integration-regression-audit.md).

The first v28 build failed at Gradle configuration because resource-value
generation was disabled. Root's four-line `4d030645` enables it only when the
already approved native companion variant is selected; dependency versions
are unchanged. QA independently reviewed that patch. The subsequent build at
clean `fd1649724e38298418b22681fcce6b6a9fcf933c` completed successfully.
The actual v28 APK is 66,447,274 bytes, SHA-256
`22dc680046950c61fb53bdfc824f0852c84da649094aa58b45c0ab4e9225f377`.
Its metadata binds the exact source and successful build log; the earlier failed
build log remains preserved. The [focused handoff](../../handoff/2026-10-25-ai-companion-v28.md)
contains package/version/signature, independent artifact review and remaining
runtime/phone gates. Installation reference remains absent. This build does
not deploy the new Backend, enable actual push or resolve model quality failures.

QA's final `4b8a99fac7662c7bd877af5fdfb876c5a751a14b` independently verifies
the actual APK hash, identity, signature against retained v26, merged manifest
and all four packaged Firebase resource values against this build's existing
configuration. Every static check passed; installation reference remains absent.
The [artifact record](qa-v28-artifact.md) distinguishes independent binary
inspection from the retained Integration build's source provenance. Both later
Product and QA merges and this handoff change documentation only; they do not
silently relabel the frozen APK source or add device/runtime evidence.
