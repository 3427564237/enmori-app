# onePA exact-detail diagnosis and independent projection review

17 November 2026, Asia/Singapore. Source baseline `4ad2b4b7`; current projection repair reviewed separately below. **The repeated onePA detail failure remains unresolved.** This review adds local stage evidence, not production request attribution or a successful recovery claim.

## Authority and evidence boundary

The [narrow repair/diagnosis decision](../../decisions/2026-11-17-li-expired-projection-repair.md) permits local investigation and the already-expired shared-projection repair, with deployment separately subject to LI confirmation. The [approved public acquisition/detail rules](../../decisions/2026-10-28-li-event-profile-discovery.md), [five-minute catalogue warming/freshness decision](../../decisions/2026-11-17-li-activity-loading-performance.md), repository backend skill and architecture remain controlling. The earlier API-only detail presentation contract remains in the supersession trail; it is not used to erase the subsequently approved bounded onePA reader.

This agent performed source review, read existing private receipts/downloaded logs, ran synthetic Node fixtures and existing compiled tests. It made **zero remote requests, browser launches, phone operations, product writes, AI calls, deployments or production edits**. All fixtures replace HTTP and browser dependencies. There is no new production logging sink, permanent diagnostic test, access-policy change or attempt to bypass an access refusal.

## Existing runtime evidence

Use the corrected [API verification receipt](../2026-11-17-stable-followup/api-verification.json), whose fresh error request IDs were recovered from `body.error.requestId`; the original probe metadata had missed that nested field.

| Same public onePA identity, SGT start | Stable Event detail | Browse detail |
| --- | --- | --- |
| 21:05:10 / 21:05:24, before fresh Browse | 503 / 14.275 s | 503 / 12.742 s |
| 21:07:01 / 21:07:14, after fresh Browse | 503 / 13.273 s, `req-2bj` | 503 / 14.412 s, `req-2bk` |

The intervening Browse succeeded in 1.979 seconds with both providers available and onePA coverage explicitly incomplete. The identity hash matches across rounds. These are operator-host authenticated HTTP observations against the recorded v78 backend, not phone timing or backend stage traces. A different Ticketmaster identity succeeding later is not same-ID recovery. Final v83 phone detail failures at 20:40:38 and 20:41:03 are separate observations; no request ID connects them to these later reads.

Existing raw onePA response files contain only the safe `SERVICE_UNAVAILABLE` error envelope, not the provider HTML/JSON. They cannot be replayed through the source parser to establish a real payload defect. In downloaded 17/16 November application logs, exact searches for `req-2bj` and `req-2bk` returned zero matches. `build-app.ts` sets `logger: false`; the retained event composition supplies Ticketmaster diagnostic categories but no corresponding onePA stage callback. This is an attribution gap, not proof that a stage did not execute. No raw application log, private activity identity or response body is copied into this report.

The earlier [backend review](../2026-11-17-stable-candidate/backend-review.md) also records an independent plain-HTTP refusal and recurring failures followed by one bounded same-ID success. That refusal was not retried or rendered in this diagnosis; it does not prove the later service requests received the same refusal.

## Exact runtime path and failure boundaries

1. `tool/retained_core_events.mjs` composes `OnePaBrowseSource(enabled, new OnePaPublicReader().read, readOnePaCatalogue)` with Ticketmaster. `createControlledEventBrowse` adds runtime enable/ownership/cancellation fences and a shared `ControlledSourceProjection`.
2. Stable Event detail uses the account gate and clock in `controlled-event-recommendations.ts:79`, then `source.event(eventId, asOf, signal)`. If that returns no row, it may resolve identity from a current first batch and enter guarded Browse detail. If it throws, the application returns `SERVICE_UNAVAILABLE`; it does not turn the error into an empty success. Browse detail independently verifies the account and uses `source.detail` through the projection.
3. `OnePaBrowseSource.event/detail` first uses or joins the admitted public catalogue. For an identity present there, both call `load` with **that product's observed URL**. They do not fetch every list card or search sitemaps for an already-known identity. Unknown identities use only observed, permitted sitemap links. A valid catalogue may coexist with failed demand-driven details. Its summary never substitutes for full details.
4. `load` coalesces the same URL, caches only a successful projected row for five minutes, and removes pending work on completion. A failed read is not cached as a successful empty row. Missing `__NEXT_DATA__` or invalid JSON throws. A parsed payload that fails publication, identity, time or other projection checks returns no row instead. Later wrapper/account/generation failures can still turn a no-row path into 503, so 404-versus-503 is not a complete stage trace.
5. `OnePaPublicReader` begins a **20-second overall signal**. `publicText` uses an additional **12-second HTTP budget**, rejects redirects, caps bytes and decodes strict UTF-8. A complete static payload avoids Chromium. A missing expected payload or thrown static error enters the existing ordinary ephemeral browser path: launch timeout 10 seconds, navigation timeout 8 seconds, readiness timeout 10 seconds. These inner limits share the overall signal; they are not added to grant a longer deadline. Context/browser cleanup is owned and awaited by the existing reader.
6. The exact `CombinedEventSource.event/detail` call delegates to the selected provider. The aggregate batch deadline does not wrap this exact detail call. Catalogue acquisition can still precede it and has its own approved admission/freshness/deadline rules.
7. The projection checks its admitted generation and snapshot lifetime after the provider returns. A concurrent refresh, disable, cancellation or expiry may reject an otherwise successful provider result. The approved repair only removes a snapshot that was already expired before admission of a new stable exact read; it preserves those in-flight checks.

Owning source: `backend/src/event-browse/infrastructure/{onepa-browse-source,onepa-public-reader,public-event-pages,combined-event-source,controlled-source-projection}.ts`; application mapping: `event-browse/application/event-browse.ts`, `bootstrap/controlled-event-recommendations.ts`, `event-detail/application/get-event-detail.ts`.

## What 12–14 seconds can and cannot establish

| Hypothesis | Existing support / competing explanation | Smallest discriminating evidence |
| --- | --- | --- |
| Static request consumes its 12-second budget, then launch/navigation fails quickly | Compatible with the measured total. No static elapsed/outcome was retained. | Correlated static start/end outcome and subsequent stage result. |
| Static response is quick but lacks payload; browser navigation/readiness or cleanup consumes the wait | Also compatible: readiness alone permits ten seconds, plus launch/navigation/cleanup. | Same request's finite browser stage outcomes/durations; no raw page content. |
| Provider response arrives after a delay but has missing/invalid embedded JSON | Local fixtures map this to 503. No actual failed provider body is available. | If already captured lawfully, offline replay of the exact public payload, or a bounded parse outcome enum. |
| Catalogue wait/admission fails before the exact detail request | Exact lookup calls `list` first. Fresh Browse makes a healthy catalogue plausible but does not exclude all concurrent expiry/admission changes. | Catalogue cache/join/admission outcome for the same request. |
| Exact provider read succeeds but shared generation/expiry rejects it | This is an intentional existing fence; a separate already-expired admission defect was proved and repaired. No historical request-stage trace proves either path here. | Provider completion plus projection admission/current/expiry outcome for the same request. |

The totals are **not** proof of a 12-second timeout. Multiple stages can produce the same public 503. Do not extend budgets, introduce retries, relax freshness or claim the projection repair resolves onePA on this evidence.

One additional diagnostic limitation is explicit in the source: `publicText` flattens unsuccessful HTTP status to a generic error; `OnePaPublicReader` catches that error and does not inspect `page.goto` response status. It therefore cannot distinguish a terminal refusal from another acquisition failure in its current operational evidence. The approved ordinary rendering path does not authorize circumventing an explicit denial. This review used only a fake 403 response to confirm error flattening; it did not follow a real refusal with browser work. Any access-rule repair or new production stage capture must be separately concrete and reviewed within the existing authority.

## Local verification and review receipt

Pinned repository Node **24.19.0**; compiled output came from the other agent's approved backend build. No dependency/build configuration changed.

- Private diagnostic fixture: **9/9 passed**. It verifies known-ID exact URL reuse/no fanout; missing payload and malformed JSON → `SERVICE_UNAVAILABLE`; publication-rejected valid payload → `EVENT_UNAVAILABLE` at the Browse application boundary; explicit later read after a failure reaching the same URL again; one fake 403 fetch producing a generic error; complete static payload avoiding a browser; fake launch and readiness failures, finite stage budgets and cleanup.
- Initial diagnostic run was 4 passed / 5 failed due to fixture mistakes: missing `componentProps` in the synthetic success payload and accessing `Result.error` instead of its actual `failure` field. The original log is preserved privately. Correcting only the fixture produced 9/9; there was no production change or claim of a reproduced production failure.
- Independent existing/new regression: **57/57 passed** across `stable-detail-expiry`, `onepa-public-reader`, and `dual-source`. This includes the 32 new expiry cases for both providers. It is not a complete backend, emulator or live-source acceptance run.

The independent projection review found no material blocker in the 9-insertion/3-deletion production diff. Pending replacement is still joined before admission; only an already-expired snapshot is retired. Retirement clears observed pages and page-read identities and advances the epoch without reading/publishing replacement rows. A live-at-admission snapshot still fences in-flight expiry. Old exact/later-page reads cannot revive after retirement; replacement failure, cancellation, clear and runtime disable still reject late results. Cold reads and source failures/undefined remain unchanged. No stale fallback or automatic retry was added.

Private artifacts under `/home/miku/.local/state/enmori-backend-expiry-20261117/`:

| Artifact | SHA-256 |
| --- | --- |
| `onepa-offline-diagnosis.mjs` | `bb2b267f6f31c270933d94150dad007ca1fb4f19bf6a9712b2fc73d6ac2a47a9` |
| `onepa-offline-diagnosis.log` | `7b48a587d786eb84e60a6852772349d244aa9297c1a0aefc445eca4e79cd5a95` |
| `onepa-independent-regression.log` | `6681139cda4d2045c78deaacc7ac822c3c8a72dce4c69ce6d6c2de0b53576a62` |
| Reviewed `controlled-source-projection.ts` | `e6c253e428307edd16de3f4a4be7941b9bd032f14d297bfbe2767df228a6e89a` |
| Reviewed `stable-detail-expiry.test.ts` | `1d5c5b70fedbfbb6f4ccd87eb78dac39ec2bbb9439ecfb1f47d228b5fbbc3cf4` |

Reproduction: pinned Node `--test` with the private fixture, or with the three corresponding `backend/dist/test/event-browse/*.test.js` files. The fixture forbids unexpected HTTP and injects every browser dependency. The earlier log download script was inspected only; this agent did not execute it or access credentials.

## Remaining evidence and next step

A reviewable expiry-only artifact can proceed through the separate deployment approval gate, with the onePA limitation retained. For onePA, existing local evidence does not justify a provider implementation change. First use any already-existing, safely collected correlated stage evidence; none was found in the downloaded logs. If no such evidence exists, present the previously proposed bounded diagnostic capture for explicit approval, covering only finite catalogue/static/browser/parse/projection outcomes, elapsed times and trusted request correlation with the approved retention/cleanup boundary. It must exclude activity/user IDs, URLs, page bodies, credentials and raw exceptions. Do not enable it silently.

After an approved deployment, the same public identity still needs bounded failure/retry/recovery verification on both detail routes and the final candidate client. A one-off success or an unrelated identity cannot close the recurring failure or establish stable-version readiness.
