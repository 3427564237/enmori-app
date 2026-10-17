# JIN private Tailscale entry: no-appointment increment

## Authority and source

LI's [current decision](../../decisions/2026-10-17-li-reusable-test-entry.md) at `f348278be0615cde9c5297ce06fa750716480f98` explicitly removes appointments/windows and authorizes the bounded private TCP adaptation. [Formal instruction](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6236325833). Its ancestry is retained by merge `15962a8b2d87e4634388eff644b9b877ef8067ec`; the superseded window remains historical, not a current prerequisite. No repeated approval of that same proposal is requested.

- Source-only increment: `116f041c4ab1ceda656897cecde0c72407d3e1ff`.
- Source tree: `3f7f1abd9a57d3b967cf2a2d7b843bfb79ef8600`.
- Base: #139 `84a93e75e1097920e1505d325eb39802d91def0f`. Its R1 source and private-file reader are unchanged.
- Checker procedure SHA256: `4df62efde8766ed6964d20b74d0b97c3530629218b7363ec6f1c1d84710ee6d9`. This covers checker/handoff/private-reader; Git source and the [machine-readable receipt](2026-10-18-jin-tailscale-entry.json) additionally bind exporter, relay and tests.
- Commands ran on working inputs before source commit. Their recorded before/after raw digests match the committed blobs after documented LF normalization; no historical execution is relabeled as this tree.

Product remains #135 `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`, tree `df800e43374ec89b71799b6722d5364163eb68cc`. Original APK SHA256 remains `776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`. Product/API/dependencies/Skills, APK and R1 implementation were not changed or rebuilt. SHI's original APK receipt/installation/device authorization and completed #135/#136/#137 gates are not reopened. LI's separately signed v7 remains a different artifact.

## Delivered behavior

[Operator instructions](../../../tool/reusable_phone_entry.md) describe original-host preparation, two foreground raw TCP Serve sessions, private configuration transfer, Windows relay, connection check, existing Android handoff and owned stop.

The checker accepts no mandatory appointment parameters and performs no time-window refusal. It retains actual per-request deadlines, current private-file revalidation, original TLS verification, unauthenticated Settings rejection, one synthetic Auth exchange and Settings readback. Host checks retain fresh quiet-state observations; they do not establish unknown original invocation/lease outcomes.

The Linux exporter reads current original handoff, host readiness and existing Tailscale status. It refuses occupied target Serve ports, Funnel or unsupported Services state, preserves HTTPS443, and creates one owner0600 route file in an existing owner0700 directory. It never changes network state. Node online/AllowedIPs are not treated as effective access-policy evidence.

The Windows relay binds only the two original loopback ports and transparently forwards to the numeric original tailnet address. It preserves Backend TLS bytes, bounds connection attempts/buffers/concurrency, refuses listener conflicts, monitors both private files and closes only owned resources. It introduces no arbitrary idle/session expiry, public URL, TLS termination or new identity. Local listeners alone do not prove upstream connectivity.

## Fresh author-side executions

These are JIN author-side invocations, including internal assistance, not SHI/LI independent reviews. Counts remain separate because scopes overlap. Full commands, input hashes, log/receipt hashes and cleanup boundaries are in the JSON receipt; `build/` artifacts are retained locally, not claimed uploaded.

| Scope | Environment | Result | Evidence and boundary |
| --- | --- | --- | --- |
| No-appointment checker | Windows, Python3.12.14 | 38/38 Pass, 0 skip, exit0 | `checker-no-appointment-green-02.log`; ResourceWarning fatal; actual owned HTTP/TLS fixtures plus synthetic private inputs |
| Checker + opaque relay + TLS/Auth composition | Windows, Python3.12.14 | 2/2 Pass, 0 skip, exit0 | `route-composition-01.log`; ResourceWarning fatal; actual checker HTTP/TLS and relay socket implementation |
| Relay / owned private-file fixtures | Windows, Python3.12.14 | 15/15 Pass, 0 skip, exit0 | `build/jin-tailscale-relay-20261018/windows-refusal-20261017T165227428Z/tests.log`; no fatal-ResourceWarning flag |
| Linux private route exporter | Ubuntu, Python3.12.3 | 24/24 Pass, 0 skip, exit0 | `exporter-linux-tool-output.txt` is a captured tool-output transcription, not a redirected raw log; no fatal-ResourceWarning flag |

Checker and composition logs are under `build/jin-reusable-entry-20261018/`. Windows run commands use the existing pinned Python and `-B`; checker/composition additionally use `-W error::ResourceWarning`. Exporter ran the exact temporary source copy with `python3 -B -m unittest -v test_prepare_tailscale_phone_route`. Per-run raw input hashes were stable and were checked against the source commit.

The two composition cases exercise guard401 -> Auth -> Settings and invalid TLS trust rejection before Auth. They use owned loopback TLS/Auth fixtures and synthetic APK/private-file inputs. The test-only upstream override connects owned loopback ports; the numeric tailnet fixture address is never contacted. This is not Tailscale, the real Backend, Android or model execution.

The relay suite covers byte forwarding, half-close/backpressure, upstream refusal/connect deadline, occupied-port rollback, connection limits, changed configuration and owned cleanup. It uses real Windows private-file/ACL and loopback fixtures; no actual remote tailnet or phone is used.

The exporter suite uses real POSIX owner/mode/dirfd file operations and failure cleanup; Tailscale commands and host observations are doubles. The outer TemporaryDirectory context and test cleanup completed, with owned-file cleanup assertions passing. No separate post-run filesystem inventory was taken. No remote runtime/model resources were created or cleaned up.

Seven changed Python files passed AST parsing; whitespace and protected-scope diffs passed. Source bytes/Git blobs and per-run hashes were checked. No unchanged full Backend/SDK/Flutter or APK build was repeated.

## Preserved failures and attribution

- The two new no-appointment CLI regressions against the old checker produced 0 Pass / 2 errors, exit1, because it still required window arguments. `checker-no-appointment-red-01.log` and its source receipt remain intact; the changed checker then passed its fresh38-case suite.
- The first exporter WSL launch failed with `E_ACCESSDENIED` before tests. The actual denied call and subsequent successful normal-permission call are retained in the exporter tool-output transcription/receipt. This was not a24-test failure.
- The earlier14-case relay run remains separately retained; adding the upstream-refusal case led to the15-case run above. Those overlapping counts are not added.
- Existing Windows path/SDK/ACL/junction failures and prior platform skips, including #139's Chinese absolute-path report, remain unchanged. This increment does not relabel them as new successes.
- [LI review5558677764](https://github.com/3427564237/enmori-app/pull/139#pullrequestreview-5558677764) belongs only to #139 exact84a93e7: Linux handoff54 cases/40Pass14WindowsSkip and checker38/38. It does not approve or execute this new adaptation, and does not replace SHI's R1 code review.

## Actual delivery boundary and next checkpoint

No real Tailscale/network configuration, remote service/model/provider activation, new private transfer or Android business execution occurred in these invocations. Real remote connection, assigned phone business flows and consecutive two-round9B remain **Not Run**. Fixture success is not operational acceptance.

JIN retains entry/fault ownership and canonical/provenance/owned-cleanup support. This executor has no original LI Linux operator connection and no local Tailscale CLI. Local Ubuntu fixture execution is not the original controlled host. Actual host current configuration, original invocation/lease state and effective authorized-only policy are not supplied here. SHI's current Tailscale usability and receipt of the matching new private file pair remain to be established; the already completed APK/device preparation is not a blocker again.

LI performs the existing original-host steps using actual current configuration and effective access policy, including existing broad grants, then privately supplies the matching handoff/route pair. This is execution of the approved scope, not a request for another appointment or proposal approval. JIN handles any entry fault and readback support; SHI then runs the documented checker/handoff and independently begins the assigned Account/AI/Check-in flow. That actual connection and independent flow start are the next verifiable acceptance checkpoint. No finish ETA is invented while the original host is inaccessible to this executor.

SHI reviews only this new code/composition; LI reviews this new evidence. #139's unchanged R1 gate remains separate. No merge, Issue/Project transition, Sprint/UAT/Release/Done or whole-application acceptance is asserted.
