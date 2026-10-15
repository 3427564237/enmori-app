# LI reviewed Event runtime verification and preview restoration

15 October 2026 (SGT). LI receives SHI's #124 source approval and ZHOU's #125 consumer receipt, runs the independently executable Backend checks, and restores the existing approved v3 phone preview. **Real Event/provider→phone/browser and assigned-client removal remain Not Run.** New #125 client disposition still belongs to DU.

## Received source and formal dispositions

- SHI [APPROVE5532820531](https://github.com/3427564237/enmori-app/pull/124#pullrequestreview-5532820531) binds exact #124 `5e08e5bb8e331c90159d682977608e2120056351`. The old Backend review wait is clear.
- ZHOU's [consumer receipt5533135723](https://github.com/3427564237/enmori-app/pull/125#pullrequestreview-5533135723) binds #125 `da26c2cb453f62e41fb689f9a72d098aeaf76521` / product `0dcc05c`. ZHOU independently ran64/64 on explicit fixtures; it is not DU's formal new-client disposition.
- LI now formally [APPROVES #1225533352617](https://github.com/3427564237/enmori-app/pull/122#pullrequestreview-5533352617) at exact `5e78b7361a9b18aedec9da5352a44945580e1f77`: its four accepted feature/test/handoff blobs and declared protected inputs are verified. This closes the missing formal composition receipt, without reopening unchanged components or repeating their suites.
- After the actual checks below, LI [APPROVES #1245533687213](https://github.com/3427564237/enmori-app/pull/124#pullrequestreview-5533687213) within bounded source/evidence scope. SHI remains the independent new-source reviewer; no phone/provider or whole-baseline acceptance is inferred.

Backend/API/operator inputs remain byte-identical to #124. The new host-helper product is **`f528ebd`**, with only `tool/li_controlled_phone_handoff.py` and its test changed. All **483** prior selected source/test/platform/tool/API inputs are checked against Git:481 match the earlier candidate manifest, and those two host paths have new explicit hashes. #125's client source/head remains unchanged for DU review. Ordinary app, Android, dependency and public contracts are unchanged.

## Settled transition and actual guarded SDK

The old #117-only preview was checked twice against fresh status: no model/compiler/operation pending, activeCalls/nonTerminal0, no quarantine/hold, modelAttempts0. LI then requested its existing explicit stop. Closed/cleanup-confirmed, inner-profile removal and outer-profile/ports-free receipts all passed, exit0; LI independently bound all five required ports. No uncertain original was reset or bypassed. Phone was initially disconnected; after the human reconnected it, LI verified the actual installed v3 hash and paused only `.personatest` for the controlled transition, without install/uninstall.

Fresh strict compile followed by actual guarded Auth/Firestore/HTTP/Dart SDK: final **164/164 Pass, outer exit0**, zero failure/cancel/skip/todo. Both temporary profiles and all five ports released. Provider/compiler/model are the suite's explicit doubles. This is a fresh LI run on the received Backend, distinct from JIN's earlier164.

Retain LI's first **163/164, outer exit1**. My launcher omitted the existing pinned Dart3.13.2 directory from PATH; only the Dart version precondition failed. The corrected explicit PATH was verified before the full rerun. Product source, assertions and timeouts were unchanged. This is separate from JIN's retained corrupt-Account503/409 assertion failure.

## Actual Linux private operator and TLS boundary

The original was settled and ports free before the existing authorized manual zero-content preload. It returned done/empty response, then the exact bound model/context8192 was freshly observed. `eval_count` was absent; no numeric token-count observation is invented. Startup and current residency remain distinct, with no keep-alive extension, daemon, warm loop or automatic content generation.

LI started the exact reviewed foreground operator with real mode0600 configuration/TLS files in its mode0700 session directory, actual Auth/Firestore and an existing optional provider key. Its production source starts disabled. The [replayed probe](fixtures/li_event_private_operator_20261015.py) passes:

- Actual TLS401 for unauthenticated Event, protected list and canonical Detail503/no-store while disabled; Profile/Settings/Persona200 using the supplied synthetic owner's real Auth.
- Atomic private enable command consumed and reflected in status with `eventControlFailed:false`. **No Event read was sent during that enabled window.**
- Malformed extra-field command consumed, Event disabled and failure flag true, while Profile remains200. A valid disable clears that control-failure flag.
- Stop visible before a queued enable; queued command remains unconsumed. Operator exits0, all three cleanup receipts pass, and all five ports independently bind. The owned queued command is removed only after those receipts.

Both actual operator invocations exited0 with confirmed cleanup. The first probe reporter failed after its functional checks because it incorrectly assumed a NODE_OPTIONS observer propagated through the controlled environment. Only the parent was observed; the production allowlist correctly removed that variable. LI preserved that failure, left the allowlist unchanged, corrected the probe's evidence scope and replayed the complete private-file/TLS/control checks. **No independent producer egress count or real provider success is claimed.** The public probe/result description clarifies this limit; the initial raw log wording is not used as proof of full-process coverage.

## Phone restoration and remaining host-helper defect

The already-approved installed v3 APK remains SHA256 **d492141ed9c09f93ec5da3784fc0f924d8e52ca46085c7ca172b2dfa4674ffe8**. **v5 was not installed.** A fresh owned #124 Backend preview is intentionally running, Event configured/disabled. It uses the same private nine-field handoff; no provider key reaches the phone. All restore attempts reuse this same original preview/service/owner, with no data reset or model generation.

The first actual restore reported `command_failed` despite subsequent native sign-in metadata. Failed-attempt cleanup removed its owned mappings, so that attempt was not called a successful restore. A deterministic POSIX test then reproduced one genuine consumption-poll race: Dart removes READY between a poll's existence and strict nonce checks. The bounded host correction treats only an actual vanished, non-symlink READY as WAIT, with owner proof unchanged; a later complete-absence observation confirms consumption. Present wrong nonce/unreadable file/symlink still refuse. No credential resend, timeout extension, Auth/TLS change, install or service reset is added.

The new regression initially failed (**17/18**); corrected host tests **18/18 Pass**. An isolated real Android app-private subfolder stress fixture passes **60/60** deletion interleavings, with no actual app restart/provider call in that fixture. This supports the specific source correction, not complete real-device reliability.

**Open finding retained:** two actual post-correction restore attempts still failed during the CONSUMED shell command. One diagnostic records two WAIT responses followed by exit1, without stderr; precise cause remains unclassified. The later diagnostic-assisted attempt passes installed-APK/nonce/atomic handoff and CONSUMED checks, retains its two mappings and restores the current connection. That later Pass and60/60 do **not** erase or resolve the earlier actual failures. DU's focused helper review receives this limit explicitly; do not relabel the helper universally reliable.

Final read-only observation at21:15SGT: native sign-in metadata present, with no host sign-in issued in this preview; applicable Auth/HTTPS mappings match; service running, modelAttempts0/modelPending0/no hold, Event disabled/pending0. This is approved **v3 native Auth on the new Backend**, not v5 Activity validation. Current residency/future Send is not promised. The active preview's private files/service/mappings are deliberately retained and its cleanup is **not** claimed. Identified config/TLS files from three closed owned sessions were removed only after their receipts; caller home configuration and active preview resources are preserved.

## Remaining work and scope

DU retains exact #125's new client disposition and the focused review of this host correction/open actual failure. Real Event typed-client list/Detail, native browser/return and source-disable plus assigned-client stale-action/owned-copy removal remain **Not Run**, rather than supplied by Backend gates or a restored v3 login. Existing [disclosure/removal](../../planning/2026-10-15-li-event-disclosure-and-removal-packet.md) and [manual cold-idle](https://github.com/3427564237/enmori-app/blob/3304141098225dce4564d1c1c1940f15141bf317/docs/evidence/sprint3/2026-10-15-jin-cold-idle-readiness-disposition.md) conditions remain.

LI refreshed the official [Developer terms](https://developer.ticketmaster.com/support/terms-of-use/) and [SG terms](https://ticketmaster.sg/terms-of-use): the existing visitor-disclosure/removal and SG deep-link conditions are retained. No new human credential/provider-contact workflow or coursework exemption is inferred. Source control tests did not open a real provider link or demonstrate real-content activation.

[Machine receipt](2026-10-15-li-reviewed-event-runtime.json) retains source bindings, all first failures, final results, actual command-stage diagnostics, live-versus-closed resources and local-log hashes. No repeated unchanged Flutter/full-Backend/model-generation suite was run. Existing21:00 checkpoint/23:59 target is not converted into achieved full delivery. Keep Draft/Open; no main merge, Issue/Project transition, global erasure/SLA or whole-baseline/Sprint/UAT/Release/Done acceptance.
