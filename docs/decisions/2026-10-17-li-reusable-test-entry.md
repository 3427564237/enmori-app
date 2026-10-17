# PM decision — reusable Tailscale test entry before reassignment

- Source ID: S-PM-1017-LI-REUSABLE-TEST-ENTRY.
- Authority: LI HOURUI / ENMORI PM, 17 October 2026, Asia/Singapore.
- Status: confirmed PM direction; implementation and operational acceptance pending.
- Confirmation: LI explicitly instructed: “优先让 JIN 补齐可重复使用的测试入口，暂时不修改分工。”
- Scope: one bounded connection adaptation and reusable operational handoff for the existing controlled Android test candidate, using the existing private Tailscale path.

## Sources and limited supersession

Continue [the five-owner allocation and independent review/device split](2026-10-16-li-low-blocking-kickoff.md), including its earlier source trail. JIN retains shared runtime/composition work, SHI retains independent Account/AI/Check-in verification, and LI retains host coordination and the allocated Event/Friend/candidate verification. DU and ZHOU retain their existing responsibilities.

This decision settles the priority between preparing a reusable entry and shifting all device testing to LI: deliver the reusable entry first. There is no reassignment. Reconsider allocation only after that small delivery has been executed and assessed; assessment does not itself authorize a later reassignment.

The [earlier Tailscale runtime decision](2026-09-18-s2-controlled-runtime-handoff.md) is retained with its original #28/#30 scope. It is historical connection evidence, not proof of current #135 readiness. This new decision authorizes the bounded current-candidate connection adaptation over the existing private Tailscale arrangement. It does not silently extend the old service/configuration or declare that the old endpoint already serves the current candidate.

The historical expired-demo/rehearsal pause is retained. Preparing this reusable operational entry and its startup procedure is now the priority; any actual controlled test-window start must use valid current configuration and the original lifecycle/admission gates. Do not revive an expired session or bypass an unresolved original invocation/lease to create an apparent working entry. No demonstration date or service window is established by this record.

## JIN's small delivery

JIN owns the end-to-end entry, its connection defects and the operational handoff:

1. Complete one connection adaptation using the existing private Tailscale path for SHI's actual Windows-side Android setup and the LI-controlled Linux service. SHI cannot physically attach the phone to LI's Linux. Account for both Backend and Auth reachability and the identified APK's actual configuration/TLS requirements; merely being online in the same tailnet or creating an ADB reverse mapping is not a successful connection.
2. Provide source/candidate-bound startup, connection-check and private-configuration handoff steps, with scripts where practical. Make clear which steps LI runs on Linux and which SHI runs locally, how SHI identifies a currently usable window, and what a failed check means. Reuse existing tools where sufficient.
3. Keep the normal start procedure independently usable after the initial setup. JIN remains responsible for entry faults and for authoritative canonical/provenance/owned-cleanup support during the applicable business tests. The procedure must not require LI to become the sole tester or JIN to be present for every routine start.

JIN selects the smallest implementation within this scope and supplies the changed source, instructions, focused checks and actual connection evidence together. This record does not preselect a new tunnel, listener, certificate, authentication method or APK rebuild. Report any genuinely necessary expansion beyond the existing private Tailscale arrangement before implementing it. Product/API/data contracts, credential boundaries and independent review remain in force. Do not place private endpoints, configurations, tokens or credentials in the repository or public evidence.

## Ownership and availability

| Owner | Responsibility |
| --- | --- |
| LI | Agree and publish the Linux service-availability window in SGT and keep the controlled host available for that window; perform the documented host-side steps and coordinate conflicting shared-state journeys. |
| JIN | Deliver and maintain the reusable entry, startup/check/handoff procedure and connection fixes; supply the existing runtime/storage support and address entry faults. |
| SHI | After receiving the one-time setup/configuration through the private channel, independently use the documented entry and execute the existing assigned phone tests on the identified candidate, recording actual results. |

The window's start/end and the first execution appointment remain to be agreed. LI's obligation is the agreed window, not unspecified permanent uptime. Keep conflicting tests serialized where the existing shared environment requires it.

## Acceptance

LI's explicit criterion is: **“在约定的 Linux 服务可用时间内，SHI 能按说明自行开始测试，无需三个人同时沟通。”**

After the initial connection/setup has been delivered, SHI must actually use the supplied steps in the agreed window, verify Backend/Auth connectivity and configuration for the exact candidate, and independently begin an assigned business test without requiring a simultaneous LI/JIN/SHI conversation. Record the candidate/source, procedure/script version, window, actual start result and any remaining dependency or entry defect. A locally prepared script, an installed APK, a TCP-open result or a written promise alone does not pass this criterion.

This accepts the reusable entry only. Individual Account/AI/Check-in, Event/Friend/candidate flows, real two-round 9B and applicable platform gates retain their own Pass/Fail/Blocked/Not Run records. JIN's new code remains independently reviewed by SHI; LI independently reviews JIN's integration/gate evidence. No repeat review of unchanged #135/#136/#137 is requested.

## Observed baseline, not acceptance

- Candidate #135 head `dcdc3ba13f1a4bac192775b7a45f8e37bc4c680e`, product `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`, tree `df800e43374ec89b71799b6722d5364163eb68cc`.
- [SHI's actual original-APK receipt, signature, installation and installed-code readback](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6234547098) is complete. LI's separately signed local v7 remains a distinct artifact. Neither requires repeating the already completed transfer or pretending a shared hash.
- [SHI's #137 exact-head approval](https://github.com/3427564237/enmori-app/pull/137#pullrequestreview-5557658982) and LI's evidence path are complete; they are not proof of real model or operational phone connectivity.
- Current effective runtime/private handoff, the matching remote connection and an agreed service window are not yet accepted. Business phone verification remains Not Run at this checkpoint.

No service was started or network configuration changed by recording this decision. This record does not merge PRs, close Issues, change Project state or establish whole-application/Sprint/UAT/Release/Done acceptance.
