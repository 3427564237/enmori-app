# JIN cross-page content authority and native tile-cache delivery — 22 October 2026

## Source and scope

- Actual integration base: `986d4f895252f266c1f6bf785b7f0c24ee03643e`, branch `souma/li-zhou-runtime-20261020`.
- Initial coherence product/test/tool commit: `decca1629b67cf470629c5b5d54955b28e61730b`; tree `b6976db1a2c3ddf3934849f76efec60e2c7264fa`.
- Final product/API/test source: bbf3ce3e69dc762d1739db510497af33dfff5d9f; tree 1926a34782e2087eb940324262456aeaf8f1b10d. It adds the bounded canonical-ID correction below.
- Development branch: `codex/jin-permission-cache-20261022`. Later evidence commits change only this evidence directory.
- Authority: [complete JIN handoff](../../../handoff/2026-10-21-parallel-completion/jin-coherence.md), [parallel completion](../../../decisions/2026-10-21-li-parallel-completion.md), and [UI/UX ownership correction](../../../decisions/2026-10-21-li-product-ui-redesign-and-defaults.md). The existing approved #166 repairs and LI's Event selectedAt/title integration are inherited, not recreated or reopened.
- Project-local Skills and routing were read; no Skill/dependency installation. No dependency, storage or route addition; the later canonical-ID correction aligns existing Backend/API/client validation with the established producer identity. #170 source-coverage work and #171 Admin work are not included.

## Delivered behavior and minimal integration

`ContentAccessBoundary` is the small app-builder hook in both ordinary and controlled roots. `contentAccessProvider` carries only an invalidation revision and foreground state; it is not authorization, mutation success, persistent storage or a source of user data. `afterContentMutation` captures the session before dispatch, survives the initiating editor's disposal, and invalidates dependent reads after confirmed, failed or unknown mutation settlement. Old-session completions cannot clear or populate a new session.

The existing owner/friend Profile, Settings, History, calendar/day, saved Check-in, map record, friends list/discovery and Home/See-all activity consumers now clear old content and fence late reads. Backgrounding also clears covered routes. Resumption triggers a current read where the existing view supports it, or leaves explicit Reload; cached content is not revived as authority. Cross-device changes still require a fresh server read (Reload/re-entry/resume); this does not introduce push synchronization or polling.

Edit/Delete and friendship writes carry the rendered operation/session guard through token acquisition to HTTP dispatch. A replacement session with the same UID hides the old editor Note. Unconfirmed deletes/unfriend operations retain a recoverable failure instead of manufacturing success. Existing pending-create/idempotency recovery remains intact, including overlapping abandoned operations. Location removal/replacement and Settings map-sharing saves invalidate projections; independent reads establish their result.

No page redesign or nearby-marker chooser was implemented. The only map presentation change is keeping existing OSM attribution inside the visible map. `EnmoriOsmTiles` reuses the installed native HTTP-aware cache, supplies a stable ENMORI User-Agent/contact URL, and requests viewport tiles without extra pan/prefetch buffers. LI retains final composition, APK and real two-account device verification. DU independently reviews this new functional contribution.

## Executed checks

All commands ran in the source checkout with existing pinned Flutter 3.47.2, Dart, Node 24.19.0 and Java 21. Raw logs remain in ignored `build/jin-coherence-20261022/`; their SHA-256 and changed-source blob bindings are in [verification.json](verification.json). No raw private data/configuration is included.

| Check | Actual result / boundary |
| --- | --- |
| Initial two counterexamples | 0/2: stale cross-view privacy content and same-UID calendar reuse reproduced before fixes |
| Final affected Flutter batch (21 files listed in receipt) | **153/153 Pass**, exit 0, normal assets; controller/widget/HTTP fixtures, not devices |
| Native tile-cache and visible-attribution file | **3/3 Pass**, exit 0; actual native disk cache + mocked HTTP, image memory cache evicted, destroy/recreate cache provider, conditional 304 |
| Strict Backend compile | exit 0, existing strict `backend/tsconfig.json`; initial compilation; repeated successfully after the canonical-ID correction |
| Guarded Auth/Firestore SDK integration | **6/6 Pass**, exit 0: one parent and five subtests, not six independent flows |
| Dart analysis | `dart analyze --fatal-infos lib` and `dart analyze --fatal-infos test/features`: no issues, exit 0 |
| Dart format | 32 changed Dart files, 0 changes, exit 0 |
| Canonical-ID affected Backend + client | **30/30 Backend** and **19/19 Flutter**, exit 0; 13 Flutter cases overlap the earlier 153; do not add counts |
| Whitespace/dependencies | `git diff --check` passed; manifests/locks unchanged; existing Activity response ID pattern corrected |

The SDK command was `node tool/run_social_weather_emulators.mjs --content-coherence` after `node ../../../node_modules/typescript/bin/tsc --project backend/tsconfig.json`. The existing runner confines the demo Auth/Firestore environment and owned profile. Two owned synthetic identities exercise actual Firebase Auth verification, application routes and Firestore: save/independent peer read; legacy missing-field compatibility; Private exclusion from direct ID, month/activity and an already issued history cursor; location replace/remove and map-share withdrawal; rejected foreign/stale delete preserving data followed by confirmed delete; relationship removal denying both peer profiles/list/history. The last subtest title overstates “issued cursor”: its final history read has no cursor; old-cursor revalidation was actually exercised by the earlier Private subtest. **38 owned documents and two owned Auth users were removed and checked; outer profile removed and all five owned loopback ports free.** The runner's missing client Firestore-rules warning is retained: this is Admin-SDK/application authorization evidence, not client Firestore Rules verification.

The final 153-case invocation was bound before/after to **763 execution inputs**, all stable during that invocation. The cache file ran separately because it was already passing and is disjoint. Afterwards only braces around a single cache-test polling `if` were added for lint, with identical behavior; analysis/format were repeated. The source receipt records this, rather than calling that a fresh exact-tree cache test. The initial Backend compile/SDK happened before later Flutter fixes and the canonical-ID correction. SDK inputs and Check-in permission behavior are reused only in their unchanged scope, not labelled a fresh final-tree execution. A new strict compile and the 30 affected Backend / 19 client cases cover the canonical-ID correction on the final source; only a blank EOF line was removed from its new Backend test afterwards.

## Canonical Event identity correction from the latest handoff

ZHOU reported the inherited mismatch at #44 comment6335402018; SHI repeated ownership at6335526311. The actual sourceEventId/EP1 producer uses tm_event_<64 lowercase hex>. Adapter, Transport/OpenAPI and Dart had rejected every tm_ prefix, including this approved canonical form. New tests using the actual mapper, producer, Repository and Fastify reproduced **4 Pass / 2 Fail** (Interested/Going returned503); valid generic-ID fixtures had hidden this mismatch. The three consuming validations now permit only the exact existing canonical form in addition to existing generic IDs, continuing to reject opaque browse IDs, wrong lengths, nonhex/uppercase and extra characters. No new identifier mapping, fake title or preference timestamp is used.

Actual HTTP Home/All now retains selectedAt/title/exact ID and denies after participation privacy revocation. Client tests carry the unchanged canonical ID through fresh-read Event callbacks and prevent opening after revocation. Strict compile + four affected Backend files30/30 and two Flutter files19/19 pass. An initial new Backend fixture used the wrong composition property (compile failed) and the initial new client test omitted its locator import (load failed); both are preserved, not product reproductions. A final blank-EOF whitespace finding in the new Backend test was corrected without a semantic change.

SHI's #170 source-invalidation repair (reported head ba533475) is separate and not incorporated. Its review/LI composition must be resolved before claiming the newer producer's runtime acceptance; the existing producer's race is not falsely claimed fixed by this consumer change.

## Failures and repairs retained

- The first sandbox Flutter startup produced an empty log and was stopped: **Not Run**, not a product failure. Authorized pinned-SDK execution then reproduced the two failures above.
- Multi-file `flutter analyze` failed with an LSP “Unterminated string” in the Chinese-path environment (exit 255). Direct pinned `dart analyze` completed; early brace-info findings were fixed. The interrupted `analysis-tests-release.log` has no completion and is not a pass; `analysis-tests-resumed.log` has the successful result.
- New-test setup failures (missing fixture import, pending-test teardown timer, awaiting a void cache-dispose API, invalid handwritten PNG) were corrected without disabling assertions. The tile PNG now comes from a one-pixel in-memory drawing.
- First compile used the wrong local node_modules path; the next exposed an optional-field assertion in the new SDK test. Both failures remain; corrected strict compile passed.
- Initial broad batch: **144 Pass / 12 Fail** out of 156. Subsequent affected repair batches were 24/12, 27/9 and 26/3 before 14/14 and final 153/153. They overlap and must not be added together. Fixes addressed initial-auth invalidation, editor initial-session binding, and overlapping abandoned-write invalidation. Existing test fixtures were aligned with the current authenticated-session observation; ambiguous Footprint and lazy-list Remove-friend finders were corrected. No test/theme was disabled and no failure count is relabelled green.
- Earlier cache and analysis logs, all repairs, and source manifests are retained locally. The final passing batch is the result to assess; earlier observations stay historical.

## Native OSM policy and limits

Checked the [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) and [flutter_map caching documentation](https://docs.fleaflet.dev/tile-servers/offline-mapping) on 22 October 2026, plus the installed locked **flutter_map 8.3.2** source (no dependency change). Built-in native caching already existed. Tests establish Cache-Control max-age/Age, Expires with a Cache-Control header, seven-day fallback, persistent fresh reuse and stale ETag/Last-Modified/304 reuse without a freshness override. They do not certify every HTTP cache directive or live OSM network behavior. The installed parser's Expires-only case falls back to seven days; no new general HTTP cache implementation is introduced.

The installed default cache uses temporary storage (the OS may evict it); its default 1 GB reducer runs at startup and is not a hard live quota. No fixed OSM request-rate entitlement is invented. No offline area/download, bulk fetch, service provider change or precise-location weather transmission is added. Browser behavior remains the installed browser HTTP-cache policy, not the native cache test.

## Remaining acceptance / execution boundaries

- **DU:** new functional/composition review of this package. Completed #166/old component reviews stay complete.
- **LI:** consume the minimal app hooks in the actual combined tree, then real two-account device checks for privacy, delete, map-share withdrawal, relationship removal, background/resume and error recovery. Both devices must do current reads; no instant remote push is promised.
- **LI/UI owner:** retain their map layout/near-point selection and defaults work. This package does not consume or claim its device results.
- **Not Run:** real-account or device flows, live OSM traffic/quota observation, Android/iOS native cache behavior, browser cache behavior, real GPS/weather/provider/model, APK build/install, deployment and overall acceptance. Local cache fixtures and isolated SDK data are not those results.
- #171's bounded permission review is a separate JIN action after this delivery. Its shared transport/controlled-root edits will need normal LI combination; no new Admin behavior is silently included here.

No main merge, Issue/Project closure, release or complete-app claim.
