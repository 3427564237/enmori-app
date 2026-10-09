# LI history correction re-review

Date: 9 October 2026, Asia/Singapore. Scope: independent LI review of DU's published #64 correction; continuation of LI's requested completion and owner follow-up. Product source was not changed.

## Exact inputs and disposition

[PR #64](https://github.com/3427564237/enmori-app/pull/64) was refreshed at `899fa9b7c0c04d2c51aa58bfc400f1769a2027aa`, base `f46a903cb5b339365ac2024004b32b7b96b99e7c`, Draft/Open and GitHub MERGEABLE. The latter is textual mergeability, not independent approval. The correction changes 11 source/test files relative to reviewed `32b443b022878859aba0641a1847f1e3bb1fd855`.

[LI formal re-review 5466910576](https://github.com/3427564237/enmori-app/pull/64#pullrequestreview-5466910576) is **Changes Requested**, confined to the remaining R2 alias regression. Original review 5457554482 and the [earlier evidence](2026-10-08-li-component-review-and-integration-handoff.md) remain history. Controlling authority is unchanged: [approved history physical A](https://github.com/3427564237/enmori-app/blob/ddc4376beddec5ba5673db99024d0bbaa9da20ec/docs/decisions/2026-10-07-li-history-physical-option-a.md) and [its exact candidate](https://github.com/3427564237/enmori-app/blob/f075c0f11dc50ce58e4116d53d794fa53f4f26d4/docs/planning/2026-10-07-du-history-physical-contract-proposal.md).

| Finding | Current conclusion |
| --- | --- |
| R1 runtime isolation | Cleared; LI resolved original thread PRRT_kwDOUMZtlc6qYsMw. History adapter/use case construction and route registration are absent from ordinary controlled-runtime/R4 wiring, and the route is available through guarded isolatedSlices.checkInHistory only. Direct ordinary exclusion and invalid controlled-demo composition regressions pass |
| R2 abbreviation rejection | EST/MST/CET now fail before repository access. Remaining correction regression: the new slash predicate also rejects supported non-abbreviation IANA identifiers Singapore/Japan/Portugal. Original R2 thread PRRT_kwDOUMZtlc6qYsM3 remains open, with a focused [LI reply](https://github.com/3427564237/enmori-app/pull/64#discussion_r4227557038) |
| R3 Note parser | Cleared; LI resolved original thread PRRT_kwDOUMZtlc6qYsM-. Empty, whitespace-only, overlong and outer-whitespace Notes reject the entire page; valid normalized control and committed 500-emoji boundary pass |

## R2 root cause and reproduction

The approved input is a recognized IANA identifier, excluding abbreviations/numeric offsets/unknown zones. The original R2 explicitly required preserving valid IANA identifiers/aliases. [IANA's backward-compatibility data](https://data.iana.org/time-zones/tzdb/backward) links Singapore to Asia/Singapore, Japan to Asia/Tokyo and Portugal to Europe/Lisbon; these are not abbreviation examples. The pinned Node 24.19.0 / Temporal dependency recognizes all three and returns the same supplied timeZoneId.

The changed `parseCivilDay` predicate `(zoneInput !== "UTC" && !zoneInput.includes("/"))` at line 40 rejects those valid inputs before Temporal or repository access. Each real use-case probe returns REQUEST_INVALID instead of success. Asia/Singapore, US/Eastern and UTC are passing controls; EST/MST/CET fail with zero repository calls. The changed predicate, recognized dependency values, comparison with the previous implementation and repeatable actual-use-case failures establish the cause; no new input contract is invented from implementation behavior.

After compiling the pinned head, reproduce from its root:

```javascript
import { ListOwnCheckInsForDate } from './backend/dist/src/check-ins/application/check-in-history.js';
const uc = new ListOwnCheckInsForDate(
  { listForDate: async () => ({kind: 'page', accountId: 'synthetic', rows: []}) },
  { decode: () => undefined, encode: () => 'unused' },
  { now: () => ({ok: true, value: new Date('2026-10-09T00:00:00.000Z')}) },
);
for (const timeZone of ['Singapore', 'Japan', 'Portugal']) {
  const result = await uc.execute({
    principal: {firebaseUid: 'synthetic'}, date: '2026-10-07', timeZone,
  });
  console.log(timeZone, result.ok); // actual false; required valid controls true
}
```

DU returns one focused correction distinguishing forbidden abbreviations from supported IANA identifiers, preserving offset/unknown rejection and exact supplied input/cursor binding. Add valid single-part non-abbreviation controls. No new dependency, physical-contract approval, UI/device requirement or repeated R1/R3 review is requested.

## Independent verification and attribution

An isolated managed checkout of immutable #64 was used. Existing locked packages were reused with a temporary node_modules link. Flutter lockfile resolution was offline/enforced. No source/package/lock/configuration or installed SDK was changed. Repository Backend, Flutter review and systematic-debugging workflows were used within the approved contract.

| LI execution | Actual result |
| --- | --- |
| Pinned Node 24.19.0 TypeScript compilation | Pass |
| `node --test 'backend/dist/test/**/*.test.js'` | 323/323 Pass; zero failed/skipped/cancelled |
| Existing actual isolated Auth/Firestore Emulator suite | 39/39 Pass; zero failed/skipped/cancelled; includes 5/5 synthetic counts-only timestamp audit and authenticated pagination; exit 0 |
| `fvm flutter test --no-pub --reporter expanded` | 158/158 Pass |
| `fvm dart analyze --fatal-infos lib test` | No issues |
| Original Node exclusion/abbreviation/control probes plus alias controls | 9 cases: 6 Pass / 3 Fail; only Singapore/Japan/Portugal assertions fail |
| Original reviewer Flutter Note probes | 5/5 Pass |
| Pinned base/head whitespace check | Pass |
| LI APK/device/history UI/screenshots/accessibility | Not Run; no attached adb device; visual history UI is outside this PR |

Node 24.19.0 was selected from the existing pnpm runtime cache; Flutter 3.47.2/Dart 3.13.2 and Java 25.0.4.1 were existing pins/tools. Emulator CLI used the existing controlled-environment helper and a fresh temporary credential profile, explicit existing cache, demo-enmori-rmvp01a-r10 and loopback Auth 9099 / Firestore 8080. The unchanged inner runner filtered/validated the actual child environment; history setup supplied process.env to the guarded composition. Both services stopped, ports were clear and the outer profile removed. No real/demo dataset or cloud fallback was used. Local reviewer scripts/logs remain under `/tmp/enmori-li-history-rereview-20261009/`; probes are separate from ordinary suite totals. Product test failures are explicitly recorded above, not converted to green totals.

DU's latest PR description expressly supersedes the older evidence note for its new owner-attributed runs. Its reported APK hash `6F646F8FED3AB703747C4A1BFBD4EB28CD57873D60B694835B6CAA90643F76A6` was not verified by LI. Stale note wording is retained as dated history and is not an additional blocker. An initial formal-review API request used the status value instead of the event value and returned 422 without mutation; the corrected REQUEST_CHANGES event succeeded as review 5466910576. This is a publication error, not a product test result.

## Updated handoff and progress boundary

This supersedes only the “DU correction has not been pushed / no reviewable head” observation in the [earlier 9 October handoff](2026-10-09-li-persona-acceptance-and-owner-follow-up.md). A new head is present and LI re-review has completed. R1/R3 are closed; the narrowly affected R2 remains pending. DU can continue unaffected approved work and submit the one remaining correction promptly.

My Friends #61 `5bdbcf8` and Persona Backend #65 `885dbcc` retain their scoped acceptances. LI has not resolved or validated the combined tree using unaccepted #64; the new JIN combined gate and LI independent gate review remain Not Run. Once the remaining corrected head passes, LI will supply the pinned candidate under the previously recorded union/isolation conditions. No prior gate can certify that new tree.

S3 preparation remains 5/5, with the original three limited increments and two subsequent accepted components; no additional history acceptance numerator is added. Overall 42-route/38-state percentage is still not reliably calculable. Keep 11 October boundary, #64 Draft/Open, #44 Open/Backlog and existing preparation Done. No merge, board/Issue transition, real index/runtime promotion, full-module/Sprint/UAT/Release/Done acceptance or silent scope change follows.
