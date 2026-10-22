# SHI observed Event window and independent JIN review — 22 October 2026

## Exact delivery and authority

- Branch: `codex/shi-events-coverage-20261022`.
- Actual base: `986d4f895252f266c1f6bf785b7f0c24ee03643e`, fetched from `souma/li-zhou-runtime-20261020`.
- Product source: `fdbac3c60ac6259120f4e65a78e0d7a272a37e74`.
- Tested tree: `646e2916477ea55bdc14a5259104812017cff46a`.
- This record is a subsequent evidence-only commit. The old SHI #167 tree is already integrated; no old package replay, main rebase or shared-runtime edit.
- Authority: S-PM-1021-LI-PARALLEL-COMPLETION and `docs/handoff/2026-10-21-parallel-completion/shi-events.md`, retaining 19Oct core rules, EB2, current P05/selectedAt producer and the resolved #167 generation invariants. LI owns current title/time UI and global composition; UI/UX owns page/card redesign. Neither is modified here.

## Delivered change and minimal composition handoff

`ControlledSourceProjection` retains cloned/frozen successful later-page rows separately from page-zero recommendation candidates. Pages 1–49 are admitted only through the existing explicit batch call, match the initialized generation's cursor time and contain at most 20 unique rows. One page slot is atomically replaced, not appended indefinitely: page0 plus 49 slots means at most 1,000 unique source identities. Duplicate cross-page IDs have one stable identity with page0/earlier-page display precedence, not merged fields. No auto-fetch, title persistence, provider document archive, index, dependency or new public DTO.

Existing `createControlledEventBrowse().peek/projectionReady` and `socialEventSource` are reused without a new runtime flag or builder. LI/JIN consume the same current-source seam; the existing own participation title lookup and Friend Activity producer acquire observed later-page titles automatically. Do not widen the firstBatch recommendation candidate pool or change Music mapping, scoring, consent or visibility. `selectedAt` implementation is LI's existing contribution and is not redone.

Page0 admission clears later pages even if refresh fails; invalidation/disable and lazy expiry revoke them. Later pages never renew the original five-minute lifetime. Snapshot, generation, abort and same-page request tokens prevent obsolete work from publishing; failed next-page requests preserve accepted rows and allow explicit same-cursor retry. A cold cursor read preserves existing raw-detail availability but does not create an initialized display projection. Old #167 stable/ordinary raw Detail fences are retained unchanged.

The producer now fails dependency-unavailable when a permitted recent Interested/Going selection lacks its current observed title, instead of returning a false empty Event feed. The retained inclusive seven-day candidate window is unchanged; legacy missing selection times and noncandidate historical rows are not backfilled or fetched. Expiry between metadata and display fails unavailable. Participation/field permission revocation still removes display. Independent Check-in category behavior is retained by its regression suite.

UI/root/runtime files are unchanged. LI should consume this incremental source, then verify second-page selection, own participation title, Friend Activity title, refresh/expiry and legitimate unavailable handling in the final candidate. ZHOU reviews this new source-generation/publication change once. No repeated #167 or original producer approval is requested.

## Actual verification

Windows; Node.js 24.19.0; approved existing project TypeScript/dependencies reused through an ignored local junction. No install, lockfile or SDK version changes. All HTTP in the new source tests is injected synthetic HTTP; product-data checks use the real repository against the handwritten in-memory gateway, not a real Firestore instance.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/event-observed-window.test.js backend/dist/test/event-source-generation-regression.test.js backend/dist/test/controlled-event-projection.test.js backend/dist/test/event-browse-pagination.test.js backend/dist/test/controlled-event-browse.test.js backend/dist/test/event-participation.test.js backend/dist/test/event-participation-visibility.test.js backend/dist/test/social-event-source.test.js backend/dist/test/friend-activity.test.js backend/dist/test/friend-activity-display.test.js
git diff --check
git diff 986d4f895252f266c1f6bf785b7f0c24ee03643e --check
```

Strict compilation **Pass**. Ten affected files **83/83 Pass**, zero skipped/cancelled. Includes actual Ticketmaster adapter + signed next cursor + gate; real participation Repository save Interested, change Going, Ignore, independent new Repository read, actual selectedAt/title producer and privacy revoke. Cancel/unignore work after disable without a source. Other cases cover expiry, refresh clearing, late work, 50x20 bound, page replacement/retry, mismatched cursor, copied immutable rows, duplicate/oversized rejection, prior concurrency, Friends/Others privacy/paging and existing Transport/contracts. No raw provider HTTP is needed for the new display/title proof: list calls are exactly pages `[0,1]`.

Final ignored log: `build/shi-observed-final.txt`, SHA-256 `518ab0998d3da6c2e83ed2db95964badc4e16cb567e486ac84ad8f4a8030493a`. The hash is a local-log receipt, not a claim the raw log was uploaded.

Preserved development outcomes:

- Before coverage implementation: new window file **1 Pass / 3 Fail**, failing later-page lookup/title and bound observations.
- First expanded post-implementation run **57 Pass / 1 Fail**: the new account fixture omitted mandatory `checkInVisibility`, so real Repository owner validation correctly rejected Save. Only the fixture was completed; guards/assertions were not weakened.
- New missing-title producer regression before its correction: **2 Pass / 1 Fail**, exposing a false empty feed. Fixed at the existing producer boundary.
- Subsequent focused5/5 and expanded82/82 were intermediate invocations. Final immutable-row/bound addition yields the distinct83/83 run above, not counts combined across invocations.
- Initial fetch name-resolution and local junction access failures were environment setup failures; retry used permitted access and existing dependencies. No runtime diagnosis or product Pass is inferred from setup.

## JIN #166 independent review receipt (separate tree)

Formal [SHI APPROVE5610294942](https://github.com/3427564237/enmori-app/pull/166#pullrequestreview-5610294942) binds exact `124a1f86ee49cd744740c61f0ba2cf971faa23d1`, executable `77781dc374e745f491a33b17f2874d6c46740a5a`. Original R1/R2/R3 were independently confirmed repaired and resolved by their original reviewer SHI. Public Port injection/Bootstrap composition, rendered-session actions and pre/post-token transport checks were inspected. New FA2 minimizes content after ranking and rechecks current permissions/source before navigation.

Independent execution on that JIN tree: strict compile; seven Backend/contract files58/58 Pass. Six-file pinned Flutter3.47.2 `test --no-pub --no-test-assets --reporter expanded` invocation was **56 Pass / 4 Fail**, each failure reporting missing `shaders/ink_sparkle.frag` in inherited widget paths. These are retained failures, not60/60. Separate invocation of `jin_rendered_session_regression_test.dart` and `friend_activity_display_test.dart` was **27/27 Pass**, overlapping the56 (not added). Initial restricted SDK-lock access failure retained; permitted rerun used the same SDK without upgrade. JIN tracked source/tests remained unchanged. JIN's SDK6/6 and Flutter60/60 remain author-attributed only. This is source approval, not final integration/device acceptance.

## Not Run and owner boundaries

New Event source is pending ZHOU independent review and LI integration/evidence acceptance. Actual Auth/Firestore Emulator, complete Backend, Flutter/device/UI, real provider/accounts, live model, APK/release and deployment were not executed for this Backend-only cache/producer delta. Prior real-device results stay on LI's old exact candidate; none are transferred to this source. No private runtime/config/key, host, current phone, account data, Project status or Issue closure was touched. No main merge, auto-merge or public APK release. Keep Draft/Open; no whole-module/Sprint/UAT/Release/Done inference.
