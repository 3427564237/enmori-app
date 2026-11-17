# Exact-detail expiry verification: execution order and evidence limits

17 November 2026, Asia/Singapore. Prepared by source review only; this document is a procedure, **not a pass receipt**. The parent operator alone performs remote HTTP and emulator actions and records their actual results separately.

## Fixed candidate and scope

The [v85 deployment decision](../../decisions/2026-11-17-li-v85-deployment.md) selects backend source `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`, archive SHA-256 `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`, and the unchanged **v84** APK SHA-256 `b544dde5ba9060b5fb20ce822ec19a6f44e6e96c9c268e3664122afed0a581d0`. Verify mounted runtime identity after deployment and installed emulator APK identity; a package upload alone does not prove the executing version.

No physical-phone action, AI renewal/send, product-data mutation, source-access workaround, logger/configuration change or additional deployment is part of this procedure. Reuse the authorized retained test account. Keep raw responses, screenshots, identities and tokens private under `/home/miku/.local/state/enmori-v85-deploy-20261117/`.

## The three independent clocks

1. **Shared projection:** `ControlledSourceProjection.live()` uses both its request-time snapshot boundary and immutable provider `sourceFreshness`, when present. The repaired branch retires a snapshot that is already expired before admitting a new exact stable-ID read. A snapshot still live at admission remains an in-flight expiry fence.
2. **Public onePA catalogue:** scheduled `warm()` targets the underlying `CombinedEventSource`/`OnePaBrowseSource`, not the projection. It may replace the public catalogue while leaving the old shared projection untouched. Do not disable warming to create the test. Conversely, explicit page-zero Browse and recommendation acquisition can replace the shared projection and invalidate the intended expiry setup.
3. **Client detail:** `ParticipationEventPage` starts its five-minute timer after a successful detail response. It clears source-backed details at expiry and prevents reopening the old external destination. A page-owned browser-return action can remain visible but disabled to preserve its existing return coordinator; removal of every external-action widget is not required. Explicit Refresh starts a new read and cancels the old timer. That client timer is not proof of the server projection's age. The stable detail repository uses the existing `/v1/events/{eventId}` contract-v3 GET, optionally with `includeVenueAddress=true`, and a 30-second client read budget.

The catalogue may already be aged when Browse succeeds. “Fresh Browse” means a new request, **not** a renewed provider lifetime. On public onePA summary rows, `content.fetchedAt` comes from the catalogue acquisition time; it can help check remaining lifetime. The API does not expose the whole internal `sourceFreshness` object or a projection epoch.

## Controlled HTTP sequence

Perform this sequence before emulator navigation, or otherwise document that no test-operated app read can refresh Events during the window. Do not run Browse/recommendation/route tests in parallel with it.

1. Record runtime identity and wall-clock/monotonic request timings. Make one explicit first-page Browse request. Save its `asOf`, response-completion time, source-status/coverage summary, response hash and private exact identity mapping.
2. Require **onePA available** in this seed, preferably with a returned onePA row and its `content.fetchedAt`. `CombinedEventSource.batch` publishes `sourceFreshness` only when onePA succeeds. A Ticketmaster-only degraded seed can follow the legacy projection path where `live()` lacks this source-expiry fence; a successful post-wait read then does not specifically exercise the repaired branch.
3. Select one returned, upcoming Ticketmaster stable event ID as the primary expiry control and, separately, one returned onePA ID for the unresolved provider investigation. Keep title/date/venue and exact IDs private; public evidence uses provider plus a stable identity hash/alias. The healthier Ticketmaster control prevents an independent onePA acquisition failure from hiding the projection outcome.
4. Immediately read the **stable detail** for the primary ID. Record status, error code/request ID or validated matching response identity. A pre-expiry 200 establishes the baseline. If onePA summary `fetchedAt` shows that its catalogue is nearly expired, or the baseline crosses the inferred boundary, label the pre-expiry classification uncertain. Do not pretend the catalogue is fresh merely because the seed returned 200. A new bounded cycle may be prepared later using the normal warm schedule; no repeated probe loop is implied.
5. From the **seed response completion**, allow at least 310 seconds to elapse using monotonic time. Record actual elapsed duration and any known interrupting read. Do not alter device/server clocks. During the interval do not read Browse detail, page zero, recommendation/Home, or navigate/foreground the test app in a way that triggers those reads. The margin puts the seeded request-time projection beyond its five-minute maximum under a stable server clock, even if its provider lifetime was shorter. Ordinary background catalogue warming may continue.
6. The **first** post-wait activity request must be the same primary stable-ID detail GET, with the same representation options. Do not open Browse detail first: `ControlledSourceProjection.detail` calls `firstBatch`, which can refresh the expired generation and mask the exact defect. Save status, duration, response/error code, trusted error request ID and identity-match result.
7. Make one explicit second stable-ID read for the same identity after completion. This checks repeated post-expiry behavior without an intentional list refresh. A second successful call is useful bounded evidence, not a long-term success rate.
8. Only after that isolated sequence, read the same onePA stable ID and, if within the approved bounded request plan, its Browse detail. Record these separately. Opening Browse detail may now change the projection; it must not retroactively be described as the isolated post-expiry control. onePA 503 remains a provider/detail limitation unless correlated stage evidence establishes otherwise.
9. If a request fails, retain its error and timing. One explicit same-ID retry can demonstrate bounded recovery. Returning to Browse and selecting another identity is a different path; neither that nor a later different-ID success closes the original failure.

An external user's concurrent read can still replace this single-process shared projection. Without approved request-stage logging, the operator can control their own actions but cannot establish complete global quiescence. Report “controlled operator sequence, other shared reads not fully observable,” and rely on the existing synthetic generation tests for deterministic isolation. If a known replacement occurs, mark the window contaminated and do not use it as expiry-specific proof.

## Exact-v84 emulator sequence

Run after the isolated HTTP control so emulator startup/Home reads cannot invalidate it. Record emulator model/API/image, app version/APK hash, backend identity and start/end times separately from physical-phone evidence.

1. Open the existing stable participation detail route through the normal UI. Preserve the identity mapping privately and capture loading followed by either valid details or the actual error. Do not infer the stable route from a Browse-detail success alone.
2. On a successful detail, leave that page visible without opening an official provider link, changing tabs or generating another Events read. Record the rendered-success time. Observe beyond five minutes: old source-backed information must be retired, the old external destination must no longer be openable, and a reload path must remain understandable. A retained return-coordinator button may be visible but disabled; check its enabled/clickable state rather than requiring it to disappear. Saved Interested/Going values are not changed by reading/expiry.
3. Tap the existing Refresh once. Capture loading, disabled duplicate refresh while pending, then success or the truthful failure. A successful same-ID response after expiry supports the client/server path; a 503 supports only the unavailable path. Do not mark content recovery passed if source details remain unavailable.
4. If the operator includes an emulator network interruption, keep it to reads: fail a detail read, restore the emulator's original network state, explicitly refresh the same ID, and record the result. Do not submit participation changes to test read recovery. Saved choice preservation can be inspected without changing it.
5. Test route return/background return in a separate window. `RefreshOnReturn` can initiate a new read when detail is absent/expired; returning to Home/Browse may also replace the server generation. These are useful navigation/recovery observations but are not the isolated backend expiry experiment.
6. Preserve screenshots and error envelopes privately; publish sanitized state summaries, timestamps and hashes. Restore temporary emulator/network settings. This does not verify the user's physical phone or declare all source-backed details reliable.

## Interpretation and remaining blind spots

| Observation | Supported conclusion | Not established |
| --- | --- | --- |
| Same-ID stable 200 before and twice after an uncontaminated five-minute window with eligible seed | Bounded deployed regression of exact-detail availability across the intended old-projection boundary | Internal branch trace, all concurrent workloads or long-term reliability |
| Exact read succeeds with `content.detailsStatus=unavailable` | Stable event identity/core details were returned with explicit supplemental-content degradation | Full official description/sections availability |
| onePA 503 before/after fresh Browse or after the repaired boundary | Repeated safe backend failure for that identity | Static timeout, access refusal, browser/parse error or epoch rejection as the specific cause |
| 404 `EVENT_UNAVAILABLE` | This request did not return a current eligible occurrence | A provider outage is solved or the activity definitively never existed |
| v84 emulator loading/error/refresh/expiry visuals | Those visible states and interactions on the recorded emulator/APK/backend | Physical-phone acceptance or real-user feedback |
| Network restoration followed by another failure | Network settings were restored but content recovery remains unverified | Confirmation that the source or write state was restored |

The 32 deterministic expiry tests already cover both providers, cold/live/expired admission, pending replacement, in-flight expiry, replacement failure, cancellation, clear, later-page invalidation and runtime disable. Source review and [independent regression](../2026-11-17-backend-expiry/onepa-diagnosis.md) found no new repair defect. Live tests cannot force these exact races without additional instrumentation; do not add production controls or infer their outcomes from one successful request.

The onePA 12–14 second diagnosis remains open. Incoming HTTP errors can be classified by route/status/code/request ID and compared by identity hash. They do not contain provider-stage evidence. If lawful provider content was already captured, it can be replayed offline; this procedure does not authorize obtaining it through a rejected access path. No production logger change is approved.
