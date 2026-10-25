# QA — v27 signed artifact readback

25 October 2026, checked at `2026-10-25T07:00:23.547231+00:00`.
QA inspected the actual candidate read-only using Android build-tools `36.0.0`
`aapt dump badging`, `aapt dump xmltree` and `apksigner verify --print-certs`.
All three commands exited 0. No build, installation, phone connection, service
change or account-data inventory was performed by QA.

Artifact:
`/home/miku/.codex/worktrees/ai-companion-integration-20261025/ENMORI/build/group-delivery-v27/ENMORI-group-v27-release.apk`.

| Independently observed field | Result |
| --- | --- |
| SHA-256 | `b6399da5f5e352a400c19459627d900b00a63e12acb013901cb4b31bb9e502d9` |
| File size | 64,907,459 bytes |
| Package | `com.enmori.app.group` |
| Version | code `27`; name `1.0.0-group20261025` |
| SDK | minimum 24; target/compile 36 |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Manifest | No `android:debuggable` attribute observed |
| Candidate metadata | File/hash/size/package/version/certificate agree with `candidate.json` and `SHA256SUMS` |
| Preserved v26 | Actual retained APK hash is `0ac3c6dfbcb1a277bfc5265f12bbeb56d584dcfb87308e83142fe718c45829ea`; its previously verified certificate matches v27 |

The retained v26 APK is the previously pulled artifact at
`/home/miku/.local/state/enmori-v26-phone-20261025/installed-v26.apk`.
This comparison does not query the phone or establish which app it now runs.
The JDK emitted a native-access warning during `apksigner`; verification still
exited 0, and the original stderr is preserved.

Integration binds this candidate to clean source
`61478e0507e439fb0d0998c2fca26fbaa3ddbe15`. QA verified that commit exists and
its difference from the shared implementation base `ce6782c` is documentation
only. The source-to-APK binding comes from Integration's manifest/build records;
QA did not independently reproduce the build. The candidate covers confirmed
C entry and the existing bounded chat usability changes. It includes no new
F0, F1, notification or cloud wiring.

QA also read the retained build and router logs. The first build failed with
a generated `IntegrationTestPlugin` reference and Gradle exit 1. The final log
records a successful release APK after Integration's normal plugin regeneration.
The corrected router log ends `+40: All tests passed!`. These are Integration's
executions, separate from QA's earlier [16 C widget checks](qa-c-entry-review.md).
The failed invocation is retained; it does not contribute passing tests.

Private evidence directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/apk-v27/`.
`artifact-review.json` contains the exact commands, exit codes and stdout/stderr
hashes; its SHA-256 is
`d689b83195bcf2325aacd9b38d07c9fef0226e21e4ecdac10fd1ed6f3ff698c5`.
The inspected candidate metadata SHA-256 is
`66faf27cd35660841e95c6b2f17d137059c1b14a0d9ae2975693e1209ee3c5d0`.

Verdict: artifact identity, signature and metadata **Pass at the artifact-read
layer**. Installation, current-account preservation, native behavior, cross-network
delivery, accessibility, UAT, Release and Done remain separate and unestablished.
