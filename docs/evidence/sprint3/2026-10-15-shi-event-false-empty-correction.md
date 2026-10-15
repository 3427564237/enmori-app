# SHI Event false-empty correction — ZHOU R1

15 October 2026, Asia/Singapore. Owner SHI; independent reviewer ZHOU. Applies to [#110 review 5527108790](https://github.com/3427564237/enmori-app/pull/110#pullrequestreview-5527108790) on prior `82fbd0ac94a4731ff8d12617309705a2c5353baf`. Preserves selected EB03 and all existing interface/external-opening decisions. No new product choice or provider contact is required.

## Cause and minimal correction

The adapter already refused a positive upstream total when `_embedded` was absent, but accepted the equivalent inconsistent `{page:{number:0,totalElements:1},_embedded:{events:[]}}`. No raw occurrence was supplied to validate/filter, yet Application/Transport emitted HTTP200 with an empty list. This is source failure, not evidence of no eligible activities.

One additional pre-projection check now refuses `totalElements > 0 && rows.length === 0` with the existing `dependencyUnavailable`. Existing mapping returns safe no-store HTTP503 `SERVICE_UNAVAILABLE`. It does not reject a real total0 or a nonempty raw batch whose actual supplied occurrences are all ineligible. No retry/overfetch/pagination, fallback, schema/field/status, UI, recommendation, storage, dependency, credential or runtime change.

## Actual SHI verification

Node24.19.0, existing pinned TypeScript7.0.2 and installed locked dependencies. No install/lockfile mutation. First added four regressions to unchanged old product: **11/13 Pass, 2 failures** (missing Port rejection and HTTP200 instead of503), exit1. After the one condition fix:

| Command | Actual result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Strict compile Pass |
| `node --test backend/dist/test/event-browse/event-browse.test.js` | **13/13 Pass**, failed/cancelled/skipped/todo0 |
| `node --test "backend/dist/test/**/*.test.js"` | **654/654 Pass**, failed/cancelled/skipped/todo0 |
| `git diff --check` | Pass on correction delta |

New cases cover exact inconsistent upstream shape, real zero with absent/explicit empty events, nonempty/all-ineligible raw rows, and real adapter → Application → Fastify safe503/no-store/no `items`/one-request behavior. Uses only injected synthetic HTTP, no actual provider call, credential or content. Build inventory is the clean source-matched output established for #110, not stale tests from a different review branch.

Flutter/APK/Android and full existing Emulator were **not rerun** for this Backend-only condition. Prior #110650/533 and LI/JIN source-specific results retain their original attribution; no unchanged APK was rebuilt. ZHOU must review the newly published exact head; SHI does not clear the review himself. Shared JIN #113 composition and LI real provider/native device activation remain separate. Keep Draft/Open; no merge, Issue/Project/runtime transition or UAT/Release/Done claim.
