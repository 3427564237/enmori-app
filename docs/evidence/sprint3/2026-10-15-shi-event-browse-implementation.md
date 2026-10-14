# SHI selected Event browse implementation and integration handoff

Owner: SHI. Prepared 15 October 2026 (Asia/Singapore). Technical reviewer: ZHOU. Shared writers: JIN (Backend Bootstrap / normative OpenAPI / route inventory), LI (Home/router / minimal platform external opening). Draft implementation, not enabled-provider or device acceptance.

## Authority and scope

This implements the exact [#109 contract at 718da394](https://github.com/3427564237/enmori-app/blob/718da39440a6a3d67cce5ad9a3efbbb7f5acbc40/docs/planning/2026-10-15-shi-real-event-browse-contract-candidate.md), as selected by [LI EB01–EB06](../../decisions/2026-10-15-li-real-event-contract-selection.md), with EB07 prospectively superseded by [explicit external opening](../../decisions/2026-10-15-li-event-external-open-selection.md). Preserve the [reduced-permission follow-up](../../decisions/2026-10-15-li-reduced-permission-process-and-followup.md): no extra human provider-contact assignment, but actual terms/privacy/removal and activation checks are not erased. The 15 October PM follow-up on #44 releases this selected isolated source delivery in parallel with technical review; SHI does not self-approve.

New feature-local paths only: `backend/src/event-browse`, `backend/test/event-browse`, `lib/features/event_browse`, `test/features/event_browse_test.dart`. No shared Bootstrap/router/platform/normative API edits, dependency change, datastore writes/cache/index, recommendation changes, participation or registration state. Source responses are transient, minimized, no-store. Provider HTTP tests use injected synthetic fetch; Flutter tests use fake HTTP/Ports/clipboard/opener, not an actual key/browser.

## Concrete writer handoff

### JIN — two route registrations and normative fragment

Construct `EventBrowse(completedAccountGate, new TicketmasterBrowseSource({key, enabled}), serverClock)` and call `registerEventBrowseRoutes(app, verifiedIdentityAdapter, useCase)`. The shared composition supplies the existing current Firebase identity verifier and completed-onboarding authority. `BrowseAccountGate.verify(principal)` must resolve only the verified principal's existing owner binding/onboarding and return the existing stable failure when absent/incomplete; **never** replace it with an unconditional success, client UID, Admin authority or a new collection. Existing `GetOnboarding.execute(principal)` is the application-facing seam available to the shared writer; inspect its exact completed result before mapping.

`key()` is an explicitly private controlled callback; `enabled()` must stay false until LI accepts the actual selected provider/notice/privacy/removal readiness. Key presence alone is not enablement. No environment variable name, host deployment, credential discovery or public Admin route is introduced here. Provider URL/search parameters are fixed inside the adapter, not accepted from the client. One request, 10s abort, 1MiB raw ceiling, no redirects/retry/pagination. Source failures cross the Port as the existing `dependencyUnavailable`, then safe `SERVICE_UNAVAILABLE`. Read cancellation or revoked activation discards output.

`transport/schemas.ts` exports Fastify response schemas and `eventBrowseApiFragment.paths` for the **one existing** `api/openapi.json`. It uses existing `bearerAuth` and `ErrorEnvelope` references; it is not a second OpenAPI document. Integrate the two selected method/paths, path parameter, schemas and approved status table under the shared sole-writer process, retaining existing operations. All responses require `Cache-Control:no-store`. Ordinary shared runtime and normative OpenAPI remain unchanged in this feature branch: production route reachability and OpenAPI integration are **Not Run**.

### LI — independent activities routes and native opener

Use `ActivityPage(onSelect: (id) => navigate('/activities/$id'))` at `/activities`, and `ActivityPage(browseId: id)` at `/activities/:browseId`. Keep existing `/events`, Home Top2 and recommendation See All unchanged. Apply the existing shared Auth/onboarding route guard. `activityRepositoryProvider` already consumes the approved Backend client/token provider; it never calls Ticketmaster or Firestore directly. Forward only the opaque browse locator, not the list object.

Override `externalActivityOpenerProvider` with LI's minimal actual platform implementation of `ExternalActivityOpener.open(url, current: guard)`. It must recheck the supplied `current()` guard immediately before OS handoff, use an external browser only, pass the exact approved URI, report launch failure and never log URL/content/raw errors. This branch adds no package, platform channel or OS manifest edit. The default null opener deliberately fails visibly, with `Copy source link` auxiliary fallback. Fake-opener success is **not** evidence that the external browser is implemented. Home/router/platform-native wiring and actual Android/browser/return evidence are **Not Run**.

The controller invalidates pending/visible reads on a new session observation (including same subject), logout, disposal, background and 5min age; late responses cannot restore old content. Return does not automatically refresh or infer Going/registration. Reload is explicit. The selected missing optional information and first-batch attribution/empty/error states remain visible.

## SHI execution evidence

Executed on this feature source, inherited from #109 `718da394` / #102 `4190047`, not JIN's later AI storage branch. Node.js **24.19.0**, existing installed pinned TypeScript, Flutter **3.47.2** / pinned Dart; no install, upgrade or lockfile mutation in this execution.

| Command | Actual result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass (strict compile) |
| `node --test "backend/dist/test/**/*.test.js"` after clean generated output | **650/650 Pass**, zero failed/skipped/cancelled |
| `node --test backend/dist/test/event-browse/event-browse.test.js` | Feature suite included in full result: **9 cases**; strict ID/scalars/nanosecond/optional-end/URL, minimization, owner refusal, source identity/absence, raw bytes/UTF-8/revocation/cancel, safe Transport |
| Pinned `dart analyze --fatal-infos lib test integration_test` | Pass, no issues |
| Pinned Flutter `test --no-pub --reporter expanded test/features/event_browse_test.dart` | **8/8 Pass** |
| Pinned Flutter `test --no-pub --reporter expanded --concurrency=1` | **533/533 Pass** |

Final publication binds the tested source commit in the PR body; this evidence document is added after execution. No Firebase Emulator/provider/Android command was executed for this new composition. Existing inherited tests are regression coverage, not a new actual SDK/provider/device run.

First attempts are retained honestly: Widget loading failed on non-const `Semantics` and was corrected; one HTTP fixture failed Latin-1 encoding and was corrected to explicit UTF-8; a new same-subject replacement fixture reused the same canonical const object and was changed to distinct observations; analysis found missing braces/unused import, corrected. A full Backend attempt included stale generated tests from earlier review branches; generated `backend/dist` was moved to a recoverable ignored `build/shi-event-browse-dist-before-clean-20261015` archive before clean compilation. Clean current-source result is 650/650, not the stale-output failure. No product/user data was deleted.

## Remaining acceptance gates

1. ZHOU exact-head technical review of the selected interface and implementation.
2. JIN shared completed-owner wiring, route inventory and normative OpenAPI integration; verify auth/onboarding zero-provider calls through actual composed root.
3. LI shared Home/router and native external-browser implementation; DU review of LI's new shared delta.
4. LI actual approved provider first-batch + matching Detail strict validation, notice/privacy/removal readiness and explicit enablement; no raw content/key in public evidence.
5. Assigned controlled Backend/device execution for real list → Detail → external source/copy/return, failed launch, expired/background/session changes. Real provider, SDK composition, Android/iOS browser, UAT and Release remain **Not Run**.

These prerequisites affect actual integration/activation only; they do not turn the delivered source into a completed Event module/Sprint. Keep Draft/Open; no merge, Issue closure, board promotion or Done claim.
