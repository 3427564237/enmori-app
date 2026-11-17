# Activity loading and waiting experience v78

Authority: [LI's approved background-warming and release decision](../../decisions/2026-11-17-li-activity-loading-performance.md). Runtime source: `9b305490ea199585852f369bc9d0b712e854de8a`; previous deployed v77 source: `9905e2650b806e6a55438eedf8cc82cf3d8279ca`.

The existing B2 single instance and Always On are retained. Only the onePA public catalogue is warmed after listening, with foreground and scheduled acquisitions sharing a minimum five-minute interval between starts. Personal data, permissions and ranking remain request-time reads. Ticketmaster remains demand-driven. No dependency, public API, persistent store, source-query scope, infrastructure, billing or account change is included.

Valid provider data stays readable during replacement acquisition. Records, coverage, acquisition time and expiry are published together after validation; failures do not renew the previous expiry. Derived projections preserve provider expiry. Shutdown and ownership loss immediately disable admission, then drain existing work. Scheduling includes late timers, foreground admissions, cancellation cleanup and re-enable boundaries.

Home and All/For you have short initial feedback, a ten-second longer-wait explanation, explicit local Stop waiting, and distinct stopped/reload states. Stopping retires late results without claiming server cancellation. Current-operation controls and queued area changes cannot cancel or overwrite a newer route read. [UI verification](ui-verification.md) includes bilingual, large-text and retained-scroll renders.

## Verification

- Backend: **2,016 passed**; Azure launcher: **9 passed**.
- Flutter: **1,917 passed**, static analysis **no issues**. The initial full run found eight retained-scroll progress visibility regressions, which were repaired before this final run.
- Six focused Auth/Firestore Emulator suites: **28 passed**, using isolated credential profiles and ports19099/18080. These cover interests, event recommendations, recommendation v2, event composition, participation and combined reads.
- Private package operator: **74 Python +22 Node checks passed**. Independent review found an unnecessary unchanged file outside the payload allowlist; it was removed. All three forward/reverse stop-verification entrypoints now use the current platform log format, with intent binding and mutation replay protection retained.
- [Verification receipt](verification.json) records log hashes and independent review. [Signed Android receipt](android-v78.json) binds version78 to the existing group certificate and APK hash. No device was connected; this is not physical-phone acceptance.

An additional broad Emulator run was **not passing**:245 tests,223 passed,17 failed,5 skipped. It used default ports instead of the participation fixture's required ports and omitted pinned Dart from PATH. Other failures involve unchanged legacy fixtures or single-attempt transaction-conflict expectations: default discoverability, historical Note selection, Check-in field acceptance, and SDK conflict/unavailable handling. These source files and fixtures are unchanged from deployed v77. The failures remain recorded; the focused28-pass result must not be represented as full Emulator-suite acceptance. No out-of-scope business rule or test fixture was changed to suppress them.

## Actual cloud source observations

The candidate ran on the existing host without changing its live package, settings, users or model state. Its six compiled source modules match the final package compilation byte-for-byte; mounted helper hashes were checked against v77.

- Startup acquisition completed partially in **147.603s**:13/15 query groups complete,161 raw records,157 unique records. The unchanged required default returned50 records. The mapped future catalogue contained71 records, including Food1 and Dance3; supplemental failures remained explicitly incomplete.
- Prepared projection read: **214ms**. This measures the internal source/projection path, not an authenticated HTTP response.
- The next acquisition started five minutes after the first. While it was running, the valid prior snapshot remained readable in **9ms**.
- The second acquisition failed its required default after10 raw records; the remaining14 queries were not started. The optimistic two-success probe assertion therefore failed. This is **not** successful replacement evidence. Source tests separately verify that failure retains the original expiry, does not immediately retry, and permits recovery at the next scheduled admission.
- Probe cleanup verified zero remaining owned processes. The published [cloud probe receipt](cloud-probe-summary.json) preserves both outcomes and limitations.

An upstream failure can leave a gap after the old five-minute cache expires and before the next admitted acquisition completes. Cold startup and such gaps may still involve waiting or provider unavailability. This release improves prepared reads and makes waiting controllable; it does not guarantee every open is instantaneous or establish two-month uptime. No expired fallback or source-refusal bypass is included.

## Published runtime and API observations

[Final deployment receipt](deployment-v78.json): package `2026111704554378.zip`, SHA-256 `6005380c4e663bfaebfee898dc1fae56c66c0910b9b4485f0da7ea000070d230`, version78. The actual running container's manifest matches the tested source and package manifest hash. Application listening and authenticated ordinary endpoints were verified; owner generation advanced92→93 and lease version7483→7485→7519. Settings and monetary hashes were unchanged, with zero operator model calls or product writes. No rollback was executed.

Initial prepared-source authenticated requests took **4.020s All /5.284s Home**. A later complete check took **4.540s All /1.412s Home**, and Browse took **3.188s**, returning25 activities. Both providers were available, with onePA coverage explicitly incomplete. The retained test account has no active interests and no personalized results; this establishes response latency and source availability, not nonempty personalized ranking acceptance. Its profile, interests and preferences hashes remained unchanged. Food/Dance mapping is supported separately by the real public-source probe and prior v77 controlled-requester evidence.

The later requests occurred more than three provider-cache lifetimes after startup; onePA's reported last successful read was05:19:21UTC, before the operator's next Browse read at05:21:13UTC. This supports continued background refresh in the released runtime. It does not convert the failed second pre-release probe into a success or establish long-term availability.

Cold platform startup still took approximately228seconds from start submission to application listening, followed by public-source warmup. The few-second timings describe an already running, prepared source, measured from the operator host; they are not a phone-network benchmark or SLA. Always On retains the approved normal hosting configuration, but a platform restart or upstream failure can still produce a wait.

Read-only checks attempted before readiness were retained as unsuccessful. The first post-start API check succeeded through All/Home but its final Admin status read threw `TypeError`; it remains a failed overall probe. The later complete API probe passed. This is separate from the successful package activation and exact running-manifest verification.
