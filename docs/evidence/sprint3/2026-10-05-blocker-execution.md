# Three blocker increments — execution evidence

Local implementation and the bounded checks below passed on 6 October 2026 (Asia/Singapore). All new checks started Not Run; the rows below are measured outcomes, not independent acceptance. The approved source and retained supersession are in [the PM decision](../../decisions/2026-10-05-li-blocker-implementation-approval.md).

## Exact scope and commits

- Existing PR #50 head/base of this work: `497dc1661105f8212f7a0987655ff48aa1a7627e`. Remote PR #50 was re-read: Draft, Changes Requested; base `codex/sprint3-first-slices`, head branch `souma/s3-01-li-start-20260930`. No remote publication occurred.
- Durable approval/history: `a72100f`.
- Check-in code: `97d102d` on `souma/s3-checkin-snapshot-20261005`. Three-field restriction narrowly amended; Note-only input, owned read and replay retained.
- Friend/Event implementation: `026d7ee`; repeated-login/lifecycle and harness correction: `562229d4859feacd5b87644393bdc2a93280a544` on `souma/s3-friend-event-isolated-20261005`. This is the exact executable source used for the final checks. Subsequent delivery commits add evidence only.
- Existing suitable worktree was reused at `/home/miku/.codex/worktrees/sprint3-li-completion/ENMORI`. The pre-existing proposal was preserved and committed unchanged. The stale/dirty primary checkout was not edited.

## Measured checks

| Check | Actual result | Command / evidence |
|---|---|---|
| Pinned Backend build | Pass | `pnpm backend:build` |
| Backend unit/contract/Transport regressions | 312/312 Pass, zero failed | `pnpm backend:test`; OpenAPI/strict DTO and route guards included |
| Real Auth/Firestore Emulator regressions | 37/37 Pass, zero failed | `pnpm backend:verify:emulator`; nine new real transaction/HTTP tests plus existing regression suites |
| Flutter static analysis | Pass, zero issues | `fvm flutter analyze` |
| Flutter tests | 141/141 Pass | `fvm flutter test`; strict parsers, account-change/late completion, retry/copy, small/enlarged/reduced-motion layouts, Check-in and login disposal regressions |
| Android real-Backend combined chain | 1/1 Pass | `node tool/run_s3_blocker_emulators.mjs emulator-5554`; real repositories, Auth, TLS Backend and persistence; no stub product data source |
| Final source whitespace/OpenAPI/fixture boundary | Pass | `git diff --check`; OpenAPI JSON parse and six isolated endpoints |

Runtime: Node 24.19.0, pnpm 11.19.0, Flutter 3.47.2 / Dart 3.13.2. Emulator `emulator-5554`, API 36, x86_64. Firebase demo project `demo-enmori-rmvp01a-r10`, Auth 9099, Firestore 8080. Emulator commands ran serially; no simultaneous suites shared ports. Existing isolated-profile environment filter removed ambient credential configuration. Android used the fixture certificate trust for HTTPS `10.0.2.2`, without a TLS verification bypass.

Exact installed test APK SHA-256: `2f87cebbf80957ca5e3c7204ee33b9169572ad3de6df22ab904882852ca2c058`. This APK embeds disposable isolated fixture configuration and is not a release or publication artifact. APK/credentials/raw identity payloads are not added to Git. [Sanitized machine-readable results](2026-10-06-blocker-results.json) retain fixed pass markers and local log hashes.

## Consumer chains and persistence

- Check-in: Android saved Private → Public → Friends-only defaults and created one record for each, then confirmed all saved values and re-read the first Private record after later Settings changes. The runner asserted three stored snapshots, ownership, final Settings value and revision. Real Emulator tests additionally verified same-transaction consistency under overlapping Settings/create, original replay after changes, legacy omission and extra-field rejection. Existing owner/expiry/fingerprint regressions remained green.
- Friend: Android A looked up B with real DisplayName, sent; B signed in and declined; A signed back in and sent a fresh request; B accepted; A freshly looked up Already friends. The test asserted the new request reference differs; the runner asserted friendship=true, pending=null and empty inbox. Contract/real Emulator tests cover reverse/same-direction races, recipient-only actions, old-reference protection, exact expiry, block/delete races, temporary eligibility, missing authority/name, uniform protection, bounded filtered continuation and isolated limits.
- Event: Home and See All opened the same synthetic occurrence via independent Backend Detail reads, displayed missing location as Not provided and copied the approved link. The runner asserted unchanged six-field recommendation storage. Direct-interface tests cover omitted end without inserting a recommendation, Unicode-scalar limits, calendar/nanosecond/end ordering, unsafe links, unavailable/expired/withdrawn and dependency errors. Existing ranking and recommendation DTO regressions remained green.

## Failures resolved and retained limits

Earlier Android attempts are not Pass evidence. They exposed test page/keyboard synchronization, a stale saved-panel result, disabled-field input during inbox loading, and the pre-existing SignInController Pending state surviving an auth/router transition. The harness now waits for data/input readiness and bounded page transitions; CheckInController discards disposed completions, and SignInController resets per auth subject with two targeted regressions. An attempted GET-body rejection test assumed Fastify parsed a GET body; it was removed after confirming the read handler does not consume a body. No new business behavior was inferred from these failures. Only the final all-green execution above is acceptance evidence for local checks.

The fixture runner deleted both synthetic Auth users, closed Backend/Firebase runtimes and removed its private configuration/certificate directory; Emulator shutdown discarded in-memory Firestore fixture data without export. The Android AVD started for this task was stopped. A separate `pm clear com.enmori.app` attempt returned Failed, so manual app-data erasure is not asserted. No cloud data, real-provider data, real-account qualification, new index/dependency or deployment was introduced.

## Required independent conclusions

| Increment | Retained owner | Required independent reviewer | Current conclusion |
|---|---|---|---|
| Check-in snapshot | LI | DU | Not Run on new exact published PR #50 head; existing Changes Requested remains |
| Isolated Friend chain | JIN | SHI | Not Run on published exact head |
| Synthetic Event Detail | SHI | ZHOU | Not Run on published exact head |

Focused packets: [Check-in](2026-10-05-checkin-review.md), [Friend](2026-10-05-friend-review.md), [Event](2026-10-05-event-review.md). Codex prepared code on LI's instruction, not a named owner's execution or an independent human approval. [Concrete publication preview](../../planning/2026-10-06-blocker-publication-preview.md) is ready for the retained action-time confirmation. Reviewers must review the exact read-back publication HEAD, including the evidence commit; a source SHA alone is not their approval.

Publication, independent reviews, PR #42/#43 prerequisite resolution/merges, implementation acceptance, Sprint acceptance, UAT, real-device/cloud verification and real Event provider approval remain separate gates. Closed #46/#47 preparation does not accept these new module implementations. The user's full completion standard is not yet met until the named independent conclusions arrive.
