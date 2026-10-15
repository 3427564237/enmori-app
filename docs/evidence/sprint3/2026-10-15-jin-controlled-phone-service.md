# JIN controlled phone service candidate — source-bound evidence

- Product: `3f4673f2653b8fa1669ab49275a421a99aeb19d8`; tree `4a07e62d708797044a6c7fbcf4f2de29f1be378b`.
- Base: accepted #114 `7f45b0656d608fdbf2dcdaba846eeaaa0a4214cb`, retaining accepted #112/#105. #115's later test-only fixes, #113 Event integration and #116 UX are not included or certified.
- Owner: JIN. New code review: SHI. Evidence/controlled-host/device disposition: LI. No peer approval is claimed by this owner report.
- [Runnable configuration, readiness, lifetime and cleanup handoff](2026-10-15-jin-controlled-phone-service-handoff.md); [source/log manifest](2026-10-15-jin-controlled-phone-service-manifest.json).
- Recorded: 2026-10-15T15:41:41.979404+08:00. The delivery replaces an estimate for this owner packet only, not an on-time whole-module promise.

## Delivered behavior

A separately invoked ongoing service factory/foreground operator serves the existing isolated Auth/Account/Persona/AI boundary for one fresh synthetic owner. It survives individual requests and sign-ins, supports repeated generation and canonical history, and runs the existing startup/hourly maintenance. Ordinary bootstrap and public contracts are unchanged. A private operator handoff supplies the existing app inputs; no credentials are placed in source, logs or APKs.

Stop closes new operations, drains originals without revoking their needed fresh Auth checks, and requires model/compiler/API/SDK settlement and this exact runtime epoch before owned cleanup. Retained sweep state and unknown startup acknowledgments produce a hold. Neither a timeout nor a terminal Application proves remote stop. No command resets an unresolved model lane or automatically resumes a crashed process.

## Actual checks

| Check | Actual result and attribution |
| --- | --- |
| Locked strict TypeScript build | Pass, exit 0, final product inputs. |
| Backend unit/Port/Transport regressions | **882/882**, exit 0, no failed/cancelled/skipped/todo. |
| Guarded actual Auth/Firestore/SDK/Dart suite | **155/155**, exit 0, no failed/cancelled/skipped/todo; 10 new service cases included. |
| New operator lifecycle/guard tests | **5/5**, explicit model/listener/service doubles; not an actual Linux launch. |
| Four Node syntax checks | Pass for new operator/tests and two focused-runner changes. |
| Source identity | **275/275** Git input bindings: 6 exact and 269 CRLF-equivalent. Inventory SHA-256 `61af008f90a028716917e549130ea462c72a3859d15bca75e0031531d5174568`. |
| Protected inputs | 10 unchanged protected paths, including normative API/inventory, dependencies, Firebase configuration, old shared builder and controlled-demo entrypoint. API remains **33 operations / 45 schemas**. |
| Fixture/runner cleanup | Actual owned fixture cleanup cases pass; test worker/outer profiles removed and five required ports free. These are test-runner receipts, not execution of the separate ongoing Linux operator. |

The ten service cases cover repeat Send/history and fresh sign-in with Persona state; consent revocation and disabled source writer; draining an original generation; outstanding compiler protection; nonempty startup refusal; invalid isolation rejection; dependency failure with independent Profile/Persona availability; foreign Auth rejection without deleting that identity; retained maintenance checkpoint; and an actual created Auth identity whose acknowledgment is deliberately discarded. The latter remains present and startup reports HOLD; only the separately owned test cleanup removes it. This does not prove arbitrary SDK ACK-loss recovery.

All model/compiler traffic in these actual SDK cases is explicitly doubled. No real model/device call was made by JIN. LI's #115 actual connected-device success retains its separate source and attribution. The existing finite semantic policy, input limits and 60/5/45 behavior are reused, not broadened.

## Failures and intermediate checkpoints retained

1. Initial strict compilation exposed test `unknown` types and then callback failure-type inference; both were corrected. A later compiler check rejected a phase-narrowing comparison across an await.
2. First full actual SDK run was **148/151, exit 1**. A disabled-writer test omitted the already-required idempotency header (400 rather than its intended 503 control). Drain cleanup remained held; source inspection identified that the initial service phase guard also denied the original request's fresh identity verification. The following fixture correctly refused remaining state. The correction preserves original Auth verification while guarding new operations and rereads fences after I/O settlement. The compiler-stop control expects the contract's terminated original socket, not an invented public 503.
3. An intermediate focused invocation accidentally used old emitted JS after the narrowing compile failure (`noEmitOnError`); **3/6, exit 1** is retained and is **not** evidence of the corrected source.
4. Corrected **8/8** focused and **153/153** full results preceded the additional checkpoint guard; **154/154** preceded the startup-ACK guard. They overlap and do not certify the later product. Current **155/155** above is the final full run.
5. The first offline Flutter batch invocation produced no completion and was cancelled. Direct pinned Flutter offline package restoration exited 0 with the lock unchanged. No new Flutter/device suite is claimed.

Raw local logs and failed compiled inputs remain local with manifest fingerprints. They are attributed owner artifacts, not peer downloads or independent recomputed evidence. No failed attempt is rewritten as Pass.

## Remaining acceptance and operation

SHI reviews this new composition/lifecycle delta; LI reviews the evidence and runs the supplied Linux service with the existing private host/tokenizer/TLS configuration, then performs its app/config/device join. Those actual ongoing host/HTTPS/phone checks are **Not Run** here. The private session handoff and two final profile/port receipts are specified; their existence on LI's host is not invented.

The service lasts only while the owned Emulator process lives. Crash/reboot durability, continuous cleanup SLA, arbitrary model-stop recovery, real Notes/accounts, cloud/provider/index enablement and whole ordinary-network baseline remain outside/unproved. No Event dependency, new key request, or unchanged component rerun is introduced. Draft/Open, main, Issues and Project states remain unchanged; no merge or module/Sprint/UAT/Release/Done claim.
