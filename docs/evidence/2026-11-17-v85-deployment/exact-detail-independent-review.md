# Independent exact-detail receipt and route review

17 November 2026, Asia/Singapore. This agent reads local source and private response artifacts only; the parent operator owns deployment, HTTP and emulator operations. No extra request, provider access, phone/AI action or production edit was made for this review.

## Seed checkpoint

The private `api-expiry.mjs` sequence reads onboarding/profile, seeds one first-page Browse, then reads Ticketmaster and onePA stable details. Its `after` mode requires host monotonic uptime to exceed the seed completion by 310 seconds, and sends the same Ticketmaster stable detail twice before any Browse-detail read. This ordering preserves the intended primary comparison under the documented controlled-window assumptions.

Observed seed evidence, UTC:

- Browse started `14:08:31.547`, returned 200 at `14:09:46.721` in 75.173 seconds, with 25 rows. Both providers were available; onePA coverage was explicitly incomplete.
- Browse `asOf` was `14:08:32.304`; the selected onePA summary `content.fetchedAt` was `14:09:45.306`. In this runtime composition, successful onePA contributes source freshness. Thus the seeded projection's inferred lifetime ends at the earlier of `asOf + 5 minutes` (`14:13:32.304`) and catalogue acquisition + 5 minutes (`14:14:45.306`). Waiting until seed completion + 310 seconds (`14:14:56.721`) conservatively exceeds both. This calculation assumes no intervening shared replacement and a stable server clock; it is not internal epoch tracing.
- Ticketmaster stable-before was 200 in 6.980 seconds (`14:09:46.721`–`14:09:53.703`). Offline comparison confirms its returned `event.eventId` exactly equals the context's selected stable ID and exactly one seed row. Its supplemental `content.detailsStatus` is `unavailable`; this is core detail success with explicit degradation, not full official-content recovery.
- onePA stable-before returned 503 / `SERVICE_UNAVAILABLE` in 14.045 seconds (`14:09:53.703`–`14:10:07.749`), request ID `req-l`. This controlled request completed before the seeded expiry boundary. It cannot simply be attributed to the repaired already-expired-admission defect. Static/browser/parse/generation attribution remains unproved.
- Primary identity hashes: Ticketmaster `24d47fd169ae56bbbc84b25678d1f54d612757a26e302c8c094f1d7b283456a1`; onePA `98de3ed4aa242fa756363440631630840a5c2934194c0f492b58bdb94096bd14`. These are hashes of stable `eventId`. The earlier fresh-v78 receipt hashed `browseId`, so those hash strings must not be compared directly. After the parent reviewer identified this mismatch, an offline comparison of the actual selected rows confirmed **Ticketmaster browseId equal / eventId equal; onePA browseId equal / eventId equal** between the earlier fresh-v78 round and this seed. An initial review message incorrectly inferred different identities from unlike hash fields; that conclusion is withdrawn. The original earlier non-fresh Ticketmaster round is a different comparison and is not reclassified here.

The script validates seed row presence/onePA availability and uses the same stored IDs/options later. It does not itself assert that a 200 detail response has the requested identity, or that `fetchedAt` and `asOf` satisfy the intended timing. The independent offline comparisons above cover those seed gaps without another request. Post-expiry responses still need their own offline identity/hash/timing checks; no post-expiry pass is asserted at this checkpoint. Client isolation was reported by the operator (emulator app force-stopped), not independently performed by this reviewer. Other users' shared reads remain unobservable in the current logging setup.

## Completed post-expiry HTTP review

The parent's `api-after.json` and all corresponding private raw responses were subsequently inspected offline. The monotonic wait was **310.680 seconds after seed completion**. The identity hashes equal the seed hashes, and every inspected raw response SHA-256 equals its receipt. The operator's first two post-wait activity requests were the intended stable Ticketmaster reads, before any Browse detail.

| Request, UTC start | Result | Offline identity check |
| --- | --- | --- |
| Ticketmaster stable after 1, `14:14:57.394` | 200 / 6.467 s | Returned stable ID exactly matches context and seed |
| Ticketmaster stable after 2, `14:15:03.863` | 200 / 5.731 s | Same exact stable ID again |
| onePA stable after, `14:15:09.595` | 503 / 0.649 s, `SERVICE_UNAVAILABLE`, `req-p` | Same requested ID; error envelope has no event body to compare |
| onePA Browse after, `14:15:10.245` | 503 / 0.570 s, `SERVICE_UNAVAILABLE`, `req-q` | Same stored Browse ID; no event body |
| Ticketmaster Browse after, `14:15:10.816` | 200 / 5.852 s | Both returned Browse and stable IDs exactly match context |

All three successful after-detail responses still report supplemental `detailsStatus=unavailable`. Onboarding and profile after-reads returned 200, and each raw body is byte-for-byte equal to its respective seed response. This supports the narrow deployed exact-detail regression under the stated isolation assumptions. It does not establish full supplementary source content, deterministic internal epoch execution, global request isolation, physical-phone acceptance or lasting onePA recovery.

The onePA before/after behavior changed from a 14.045-second failure to two sub-second failures. It is still failure. The shorter delay does not establish a timeout fix or identify a source stage.

## Additional operations observation

The existing operations-status response observed at `14:16:02.832Z` reports onePA `unavailable / dependency_unavailable`, `lastObservedAt=14:14:58.062Z`, and `lastSucceededAt=14:09:45.306Z`. This failure observation predates both after-onePA requests (and occurs during the first post-wait Ticketmaster request). It therefore is not a newly timestamped result of either later onePA detail request. The previous successful timestamp matches the seed catalogue acquisition.

Source semantics limit the conclusion: `OnePaBrowseSource.observeRead` wraps **both** public catalogue acquisition and public detail/sitemap reads; `CombinedEventSource` can also record failed batch outcomes. `RuntimeStatus` turns the latest provider availability observation into a safe status and timestamp, without operation kind or request correlation. A cache hit or a local catalogue-admission failure does not itself renew the child source's observation timestamp. Consequently:

- In the controlled operator window with the emulator stopped and no intervening operator onePA call, a scheduled catalogue refresh failure is a supported **inference** for the earlier observation. Other clients' work and the internal operation kind remain unobserved.
- The original catalogue expired at `14:14:45.306Z`. Later fast failure with an unchanged earlier observation is consistent with catalogue/admission rejection before another dispatched detail read. It does not prove that branch, or distinguish it from other quickly rejected/fenced work.
- No exact upstream HTTP status, navigation/readiness result, parse result or request-level epoch outcome was captured. Do not label the catalogue's internal failure cause identified, and do not treat this status read as provider probing or a new stage logger.

No additional test or remote call was made by this reviewer. The independent seed/after identity checks were performed only against the operator's existing files.

## v84 Browse-card route and non-mutating client-expiry path

Source review establishes the normal deployed composition:

1. `bootstrap.dart` enables event participation. Home's **Browse all activities** calls `/activities?tab=browse` in `app_router.dart`.
2. The enabled participation routes build `ParticipationEventsPage`, whose Browse list uses `EventCard.summary`. Card identity prioritizes `summary.eventId`, falling back to `browseId` only for representations without a stable ID. This cycle's returned rows include stable IDs.
3. `event_participation_routes.dart` pushes `/events/:eventId/participation`, which builds **ParticipationEventPage**. This is the stable Event detail repository path, not the legacy `ActivityPage(browseId)` detail route.
4. The page's successful detail response starts a five-minute client timer. `_expireDetails` removes its source-backed detail, disables reuse of the old external destination, and retains the page/session-owned plan context. The visible fallback says details are unavailable and invites the top-right **Reload Event information** action; the existing **Your plans** section remains. The bounded emulator observation below subsequently verifies this visible state.

After the isolated HTTP window, the operator can use Home → Browse all activities → a stable-ID card, keep the successful detail visible for more than five minutes, capture the expired state, then tap the top-right reload once. Record time from successful content appearance, not from opening the list. Avoid Interested/Going/Ignore, provider links, Home/tab switches and background/foreground interruptions during that window. This tests expiry/reload without changing participation data. Navigation and interruption checks can follow separately; they may trigger refreshed list generations and should not be merged with the isolated expiry claim.

Source references: `lib/app/bootstrap.dart:114`, `lib/app/router/app_router.dart:681`, `lib/app/router/event_participation_routes.dart:32`, `lib/features/event_participation/presentation/event_card.dart:47`, `lib/features/event_participation/presentation/participation_events_page.dart:498`, `lib/features/event_participation/presentation/participation_event_page.dart:88`, and `lib/features/event_detail/data/backend_event_detail_repository.dart:20`.


## Independent emulator visual checkpoint: expiry and recovery

The reviewer inspected private PNG/XML captures produced by the parent operator, without controlling the emulator. The ready capture at `14:18:29.507Z` shows the selected Ticketmaster title, date/time, venue, source label, plan controls and active official-details action. The expired capture at `14:23:42.116Z` is **312.610 seconds later by recorded monotonic uptime**. It remains on Event details; the old title/date/venue/image are absent, the reload explanation is visible, and **Your plans** remains.

**Correction to the initial procedure wording:** the official-details action is not removed in this case. It remains visibly muted, with Android XML `enabled=false` and `clickable=false`; the ready action had both true. This is consistent with `_expireDetails` preserving the page/session-owned return coordinator while passing `sourceAvailable=false`. `ExternalRegistrationAction` guards both its button and `_open()` with that flag. The requirement is that stale source content cannot authorize another external opening, not that this widget must disappear.

Authority is the [20 October participation decision](../../decisions/2026-10-20-li-event-participation-selection.md), particularly explicit return confirmation and preservation of participation facts after source expiry; the [participation contract](../../../api/event-participation-contract.md) requires current source validation for new/changed participation and preserves existing facts; the [26 October return/freshness decision](../../decisions/2026-10-26-li-reference-and-event-usability.md) retains five-minute freshness while restoring usable return paths. The particular retained-but-disabled coordinator is implementation evidence satisfying those boundaries, not a newly invented business rule. No external opening/return or Going write was exercised in this checkpoint.

After the operator's explicit top-right reload, `emulator-detail-refresh-pending` shows loading, no stale title/date, disabled official-details action and disabled reload (preventing another visible refresh tap). `emulator-detail-refreshed` at `14:24:55.474Z` shows the same title and date/time with active actions again. The complete ready/refreshed XML files have the same SHA-256, so their captured text/control trees match exactly. Capture timestamps are observation times; they do not establish exact HTTP duration.

A separate interruption attempt at `14:25:18.080Z` disabled emulator connectivity and requested a detail reload. The `emulator-detail-offline` capture at `14:25:21.003Z` shows **Loading Event information** and **Checking your participation**, with plan actions disabled. It does **not** show a terminal network error. After network restoration, `emulator-detail-online-recovered` shows the same ready content/control tree, with the parent's recovery receipt at `14:25:53.812Z`. This supports **interrupted loading followed by restored content**, not terminal-error/explicit-retry acceptance. That first run remains limited to pending-load recovery. The separate terminal-error run reviewed below supplies the previously missing error/retry evidence; it does not retroactively change this first capture into an error state.

The visible plans section and controls persist; no participation button was activated in the operator's receipt. This is bounded UI/state-preservation evidence, not a fresh server audit of every saved plan. It concerns Ticketmaster and the exact recorded emulator/APK/backend, not onePA recovery or physical-phone acceptance. Raw public event details and private captures remain outside Git.

| Private artifact (PNG unless specified) | SHA-256 |
| --- | --- |
| `emulator-detail-ready.png` | `3958a17704417c1f3242cb5e0ecf6c30da7d08f7d4fcd50e6318bd735a3d80cc` |
| `emulator-detail-expired.png` | `ed7190d7256a169bcd2de8d017738d49370ce33c4f283a3470aed535bf38b1ae` |
| `emulator-detail-expired.xml` | `eaa5efb734a99fe30acc71ed5ad3d2a015a3bcabdf4f70109726cf741c41a5ef` |
| `emulator-detail-refresh-pending.png` | `6edb9c83b4033f87d85f2b7703661a16a41cc1b004f64aa8f794a6398d5565fa` |
| `emulator-detail-refreshed.png` | `86f905f2c847c38c78a5fa4416c7367e98bea2562ddd1adfb58c9c54a5255238` |
| `emulator-detail-offline.png` | `50c772e5a7b0fc09ab0a7254b7a4748012bdb92fc8b8fd72210ef8bef4804cd6` |
| `emulator-detail-online-recovered.png` | `c43c17c4f57358d12a9380e3c3ce5e974e681cd520bfb24aadf80bcd1d0ae1e2` |
| `emulator-detail-ready.xml`, `emulator-detail-refreshed.xml`, `emulator-detail-online-recovered.xml` (same bytes) | `08376d8dbcdea646fc5a895054e4454ccb14db482836aa8e15072e1cb35d49cf` |


## Separate terminal-error → explicit-reload emulator verification

The independent reviewer read `emulator-detail-terminal.py` and its completed JSON receipt, inspected the four requested PNGs and compared the before/offline/restored XML files. The script addresses only the selected emulator, first asserts the emulator property, uses the enabled reload control, and makes no participation-button action. Its sequence **waits until unavailable is present and loading absent before restoring connectivity**; only then does it enable connectivity and explicitly tap reload. The reviewer did not execute this script or any device command.

| Captured state (SGT) | Independently observed result |
| --- | --- |
| 22:32:08.007, before | Same selected Ticketmaster title and date/time; core details and official action available; plans section visible |
| **22:32:14.145, offline terminal** | “The service is unavailable. Try again.” plus detail-reload explanation; no loading text, no old title/date/image; reload enabled; official action disabled/non-clickable |
| 22:32:22.074 and 22:32:25.616, after explicit reload | Receipt records loading, disabled reload/official action, plans section present; immediate PNG independently shows that waiting state |
| **22:32:29.743, restored** | Same title/date and ready control tree restored; no loading/error; reload and official action enabled again |

The offline terminal screen also shows the plan-read failure and **Load your plans** recovery action. It does not represent the failed plan read as a confirmed empty state. Plans remain visible throughout; the script records zero product-mutation actions. Supplemental official content still has the previously recorded unavailable limitation. This supports the narrowly exercised **offline terminal failure → restored network → explicit reload → same Ticketmaster core detail** path on exact v84 with v85. It is a client connectivity interruption, not a captured backend 503 response or onePA recovery. The before/restored XML bytes also match the earlier ready XML (`08376d8d…d49cf`), supporting matching captured text/control state; these visual observations do not independently audit all stored participation records or prove long-term reliability.

The script's final cleanup enables emulator Wi-Fi/data and the receipt records `networkRestored=true`; this reviewer verified the local script/receipt rather than executing device verification. The parent's device-restoration record remains the authority for final settings.

### Later onePA directory state

The separate `emulator-browse-finalcheck.xml` contains **Ticketmaster: available / onePA: available** and the exact incomplete-range notice: “Some onePA interest searches could not be loaded. The current activity range is incomplete.” This is evidence that a later displayed directory snapshot again reported onePA availability with incomplete coverage. It does not identify the underlying failure stage, prove complete query recovery or establish that a onePA detail request recovered. The same-ID onePA detail failures above remain open.

| Private artifact | SHA-256 |
| --- | --- |
| `emulator-detail-terminal.json` | `87bdc4bced47205e69a0c125d4cba0debac9de25607f717dd305e9932b9b4abc` |
| `emulator-detail-terminal.py` | `471407689629a3b001c12fdd6a1eaaa559e81ae430820b5a9f9b04e67c33d614` |
| `detail-terminal-before.png` | `fe175087d91eeede8d19eebc61daae634d9f3a90466f28f8c5cd070252d66de4` |
| `detail-terminal-offline.png` | `7d61108240acd841731f673e335b64d4a70f8320bdd3bf1e9ee34b464471f28f` |
| `detail-terminal-offline.xml` | `985d948a2866368c152459857fdb364541542c9fce8e0e396da4922b0593b30d` |
| `detail-terminal-explicit-reload-immediate.png` | `b6505160c43d410864f7d381b373753bdf6115dbd2601ddf897be382c64f467d` |
| `detail-terminal-restored.png` | `856423a30ed380514cadce349a3b11f429a7cba424b78a481607b92305d30200` |
| `detail-terminal-before.xml`, `detail-terminal-restored.xml` (same bytes) | `08376d8dbcdea646fc5a895054e4454ccb14db482836aa8e15072e1cb35d49cf` |
| `emulator-browse-finalcheck.xml` | `fa54ebf39c9c15de1379245d4b84a7779368ccc51c2df315e1bf7fc557700517` |
