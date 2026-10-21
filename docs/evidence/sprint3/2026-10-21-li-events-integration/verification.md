# LI Events composition checkpoint — 21 October 2026

## Source and authority

Candidate PR #165 remains Draft, base `souma/li-shi-du-integration-20261020`
(`900ca6f`). LI merged SHI #167 exact head
`db1b7249c7b97d0e0f8e68e3d9024efcc4e1b9be` with a merge commit `7b63ebf`;
ZHOU's [exact-head approval](https://github.com/3427564237/enmori-app/pull/167#pullrequestreview-5586692615)
is module evidence, not approval of subsequent LI composition.
Product/APK source: `5529f7b4d5cf91489aa0b1b4ff118ec53a7fd522`.
P01–P06, EP1/EB2 and the existing Home repair remain controlling. No new product,
architecture, dependency, real-account rollout or main merge decision is made.

The sole merge conflict was route inventory. Both LI Persona preview/conversation
history and SHI's five participation entries were retained. OpenAPI merged cleanly.

## Connected behavior

- The retained isolated runtime constructs one participation feature from its
  existing Firestore gateway, clock and gated Event source. The shared router
  registers a single paginated Browse implementation plus participation routes.
  Recommendations receive the approved ignored-ID filter. Music/consent rules
  remain unchanged. A private random 32-byte key lives for one server process;
  restart invalidates page positions, requiring Reload, but retains business facts.
- Core-test harness explicitly enables the authenticated participation Repository.
  The ordinary and real-account composition defaults remain off; no emulator
  credential/authorization shortcut was added to the real-account app.
- Events bottom navigation now reaches paginated Events, with actual next batch,
  category selection and Reload. Home and See all use the same EventCard and
  committed participation state; detail navigation carries stable Event IDs.
  Ignored Home cards disappear after a confirmed ignored state.
- Profile receives the owner participation section. Participant callbacks carry
  immutable Username into the existing exact-Username lookup. This is **not**
  JIN's full other-user profile/history/calendar/map integration; that remains
  pending latest #166 independent review and LI composition.
- Existing v13 Home Refresh/empty/failure behavior and the v12 banner removal are
  retained. No new AI conversation/model-output test was performed.

## Bounded checks and original failures

Backend strict compilation passed. One focused batch passed **36/36**:
`event-browse-composition`, `event-browse-pagination`, `event-participation`,
`controlled-real-account-runtime`. The new shared-root HTTP case verifies one
Browse registration, next cursor, auth, saved participation/owner list, 412 and
source-independent cancellation; ordinary bootstrap still returns 404.

Flutter selected four files: `controlled_demo_app_test`, `participation_journey`,
`participation_rendered_action`, `participation_repository`. Initial batch passed
35 module cases but could not load root tests because LI's edit also introduced
an unused uninitialized field on `_ConnectedPages`; removed that field. Root-only
rerun passed four old cases and failed the new case because its synthetic Browse
fixture used a noncanonical Event ID and cursor. Corrected the fixture to the
strict approved wire formats; reran only that new case, **1/1 passed**. Thus
**40 distinct selected cases passed across bounded runs**, not a claimed single
40/40 run. The new case exercises authenticated Home Interested save, stable-ID
detail and paginated list reading the same state, then requesting the next cursor.

Full Flutter analyze found only three missing-brace informational issues in the
new root callbacks. Added braces and reanalyzed that file: no issues. No other
file had an analyzer issue. `git diff --check` passed. Logs remain local under
`build/li-events-integration/`; failures have not been relabeled as successes.

## Actual retained environment / real provider

Before this work, the runner had stopped at `2026-10-20T23:23:10.850Z` with
`exportConfirmed=false`. Private logs show SIGTERM followed by failed Firestore
export. The latest existing complete snapshot was dated `2026-10-20T04:25:32Z`.
Its six files and failure logs were copied into an owner-private recovery
folder and verified unchanged before restart. **Changes after that old snapshot
cannot be claimed recovered.** This was not caused by this Events integration.
No clear/reset, service reinstall or real Firebase account mutation was used.

After restoring that snapshot, a new dedicated synthetic account used the normal
Auth and Backend endpoints and rejected optional processing. Real Ticketmaster
Browse returned **18** first-batch items, then **19 different next-batch items**.
Stable-ID detail, Going save, fresh GET, owner participation list, stale-revision
412 and participants read passed. Normal stop then confirmed export at
`2026-10-21T02:51:06.511Z`; after restart, login and the exact saved participation
(including revision/time) and owner list matched. Cancellation followed by fresh
GET passed. No unknown write was replayed. Receipts contain only booleans/counts;
credentials, event IDs, cursors and account data stay outside Git.

AI was configured and available but inherited `aiMaintenanceHealthy=false`.
That is still unresolved; startup/model preparation is not a fresh chat pass.
The runtime is normally stopped after verification to export the cancellation
and preserve the completed checkpoint; use `python3 tool/core_local.py start
--events --ai` from this candidate when resuming device work.

## Acceptance still pending

ADB reported no connected device. v14 installation, native Next/Reload, external
browser return Yes/No, keyboard/system Back and native account-switch behavior
are **Not Run**. Prior v12/v9 native results remain historical and do not certify
this APK. Full friend profile/Home activity awaits #166 and the missing Event
activity producer; real-account participation rollout remains separate. Current
LI composition requires independent review. No release, main merge or whole-app
Done claim. See `receipt.json` for APK metadata and final export status.
