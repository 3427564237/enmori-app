# PR #170 P2 — awaited participation/source loss

## Binding and scope

- Review input: ZHOU exact head `b39ec5e19cc462fc0f588480044766b249fc6104`, original P2 comment4345691400.
- Product correction: `8f821f9b67087610ee2e7976c5c898d778deef65`.
- Tested tree: `b1cefde5f96fab013facbc23c06f9dc83b49fb7e`.
- This record is a subsequent evidence-only commit. Existing base, generation cache, page bounds, API/storage/DTO, ranking and dependencies are unchanged.
- Authority: retained FA2 unavailable-versus-revoked distinction, current approved SHI task. ZHOU [review and counterexamples](https://github.com/3427564237/enmori-app/blob/4e68ff959f7b1f3c8277a782c670e2dfa66d0fd3/docs/evidence/sprint3/2026-10-22-zhou-shi170-review/review.md).

## Cause and bounded repair

`display` checked projection readiness before awaiting the exact participation-document read. Disable, page0 refresh or page1 replacement could remove the specific title during that await; missing peek then resolved undefined. The consumer treats undefined as actual revoked/removed content and returns a successful empty array.

The producer now checks permission and reads the participation first. Actual absent/cancelled/reselected participation remains omission. For a still-matching authorized row, readiness and the specific title are checked synchronously after the await; missing either throws the existing safe dependency error. Same-page replacement needs the specific-ID check even while ready remains true. No source retry, title fallback, additional transaction or new error code.

## Actual execution and retained failures

Windows; Node24.19.0; existing approved TypeScript/dependencies. No install or frozen-lockfile rerun.

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json --pretty false
node --test backend/dist/test/social-event-display-race.test.js
node --test backend/dist/test/social-event-display-race.test.js backend/dist/test/social-event-source.test.js backend/dist/test/friend-activity.test.js backend/dist/test/friend-activity-display.test.js
git diff b39ec5e19cc462fc0f588480044766b249fc6104 --check
```

- Before repair: new file **5 Pass / 6 Fail**. Three direct producer races return undefined instead of rejection, and three actual Fastify/Repository/authority/producer HTTP paths return200 rather than503. Actual controlled projection, stable canonical Event ID, real producer and in-memory gateway are used. No external HTTP/provider/real accounts.
- Canonical normal direct producer returns the expected title; genuine privacy removal is omitted. Deleted/cancelled/reselected snapshot rows are omitted even if the source disables while their get is held. These are positive controls, not absent assertions.
- Final strict compile **Pass**; four affected files **36/36 Pass**, zero skipped/cancelled. All three actual HTTP races assert503 SERVICE_UNAVAILABLE and no-store, all gate pending counts settle0. The new11 cases overlap the36, not added. Original83 are not repeated or relabeled current execution.
- Initial new HTTP harness was interrupted before completion: incomplete fieldPrivacy made the route finish before reaching the held read. Completed the strict fixture and added an early-route-exit diagnostic; this is an initial harness failure, not product evidence.
- First post-repair four-file run **33 Pass / 3 Fail** exposed another fixture assumption: the in-memory gateway snapshots at transaction admission, so an outside commit cannot change that snapshot mid-read. Moved the genuine removal setup before display transaction admission, retaining the held-read/disable and omission assertions. No product guard changed to satisfy the fixture; final36 is a separate invocation.
- Existing whitespace/full repair-range checks Pass. Git's LF/CRLF notice is not a test failure.

Ignored local log receipts (not claims of raw upload):

| Log | SHA-256 |
| --- | --- |
| build/shi-display-race-before.txt | 586d73238ca668ac80a9115d5d75f279ec8690316d549a7c817b749406bff042 |
| build/shi-display-race-fixture-failure.txt | f43df560120c8c16e8eb7894d3570c0c3fc9c589a2129dc631e939dfde261576 |
| build/shi-display-race-final.txt | 55b2b439a116e8bdf2fb220e4d3692163ac464ee3fc817067ed9fa4e6831179d |

## Separate compatibility issue and disposition

ZHOU separately found inherited consumer/Transport rejection of canonical `tm_event_<64hex>` because of the broad `tm_` exclusion. LI/JIN own that compatibility correction; no substitute ID, weakened schema or cross-owner change is bundled here. The new HTTP tests prove failure propagation only; they do **not** claim normal canonical-ID HTTP acceptance. The normal direct-producer control establishes this repair's positive boundary, while the full composed positive route remains subject to LI/JIN's issue. Generic-ID inherited fixture success is not used to hide it.

P2 is pending ZHOU exact-head re-review, not self-resolved or approved by SHI. Earlier failures/reviews remain intact. No unaffected cache/Flutter/Emulator/provider/model/device suite, actual runtime, APK, real account or private configuration was touched. LI retains final composition/device acceptance, Draft/Open and no main merge/board/Issue/Release/Done transition.
