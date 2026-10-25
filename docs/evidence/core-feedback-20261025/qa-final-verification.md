# QA — final core-feedback verification

Date: 25 October 2026. Frozen source:
`0e60cb9b675e7607c7e5761c8dd78d09d1e889b8`.

## Independent execution

QA fast-forwarded its clean worktree to the exact frozen commit and ran one
Flutter command under the assigned exclusive validation lock. It used `--no-pub`,
the expanded reporter, `--concurrency=1`, and an exact name filter over the original
QA fixture and `test/features/own_avatar_test.dart`. Only four cases ran.

| Case | Earlier baseline | Frozen source |
| --- | --- | --- |
| Visit references without selecting, then return to ordinary chat | Pass | Pass |
| Select a reference, remove the last selection, then return | Fail: Send callback null | Pass |
| Review zero sources, cancel, then return | Fail: Send callback null | Pass |
| Unknown avatar save, leave/reopen, then read unchanged revision | New regression case | Pass; one write, Save/Choose remain disabled |

The original three-case fixture is unchanged: SHA-256
`66c46fe9c0e44874c94826a88fb9ddf102bc757d380e6471cbf4cb8a8443407c`.
The final avatar test file is
`74de306f4cf861ac839cd0d673be0fcf1bc9c4cdc6573ade6f9433e84cdb7fef`.
The AI cases retain draft and zero-dispatch assertions; they exercise the
original selected-reference paths, not the newer automatic-today capability.
The avatar case uses repository/picker fakes and exercises actual Navigator
departure/reentry within the same ProviderScope.

Execution: **4/4 passed, exit 0**, 8.591 seconds, from 20:37:33 to 20:37:42 SGT
(UTC+8). The log ends `00:05 +4: All tests passed!`; process wall time includes
startup. The lock was released and explicitly returned to Root before further
evidence work. QA did not rebuild, run another suite or operate a service/device.

HEAD stayed at the frozen commit. All 501 tracked files registered under
`lib`, `test`, `api`, `android`, `ios`, and `tool/core-feedback-qa` had identical
before/after hashes. The dependency lock and already-resolved package metadata
matched the earlier baseline; no package resolution was performed.

Private execution evidence, including the exact command and dependency hashes:
`/home/miku/.local/state/enmori-core-feedback-20261025/qa-final-0e60cb9/`.

| Evidence | SHA-256 |
| --- | --- |
| `qa-four-cases.log` | `6c59b72c6d8a974aee55093925e5ecb006a212562e5bbba873eae805bedcd96c` |
| `run.json` | `432f7ad547fffb9b9a27b3dd85a909e3a46934b7f4c974234c39fa0c4f019de9` |
| `source-before.json` and `source-after.json` | `08eaed92c91d367b31357526bd0db6e1eabdd66021052671f53d9fd46f6e9dc9` |

## Independent review of Root/App evidence

QA read the actual logs and Root's affected-file rerun command. These are
independent log checks, not additional QA executions.

| Producer/check | Observed result | Log SHA-256 |
| --- | --- | --- |
| Root Backend final | 1,526 passed; 0 failed/cancelled/skipped | `01f8e98d1177e1f1396fb5fcef52c442e60559e8b4bca6233f0872ff0524fb75` |
| Root Flutter analysis | No issues found | `9d46fab2ba3b8c22c45814acf0fee0ca37b5cc9b36c36dd50970dee75e271a0b` |
| Root first focused Flutter batch | 243 passed, 6 failed | `bc6250c206299e9e4c3ba57a76b3f4ba3f84fd8d93a849c6ab4895ca9a8726d7` |
| Root affected-file repair batch | 42 passed, 0 failed | `8614bb3b2e1b9925af7167fa2dfc9849c7dba824fd35ab49f9c531d5c96c3168` |
| App today-only repair | 5 passed, 0 failed | `a00f0372b4f7a0acf509ffb10d1774802c1af87b77134cf2f99ecad25c2c6d85` |

All six initial failures belong to the three complete files in Root's repair
command: `ai_today_sources_test.dart`, `activity_shared_router_test.dart` and
`account_preferences_flow_test.dart`. That command has no test-name filter.
Some individual names are absent from the parallel progress display; the actual
command and final count establish the file scope. The 42 cases overlap the first
batch, and App's five also overlap them. Do not add these counts or describe the
record as a fresh 249-case run at the final commit.

QA also checked `source-validation.json`: its source head equals the frozen
commit and all six recorded log hashes/sizes match the actual files. Manifest
SHA-256: `464f879234e3e066d5ec016ecec3fcdc96f2fd86d00bb18f05de97b4751bb002`.

## Final source review scope

The prior QA records preserve the automatic-day Backend review, Event image
route-lifetime correction, friend-source readiness review, controlled runtime
entry review, and App today/Send/later-contact review. No new blocking source
finding remained in those reviewed slices. Source evidence does not establish
that the controlled runtime has been deployed or runs indefinitely.

QA reread the final avatar provider/editor guards: pending revision/photo survive
route destruction within the session, unchanged GET does not release them,
advanced matching readback or a definite invalid/precondition result clears only
the matching attempt, and session replacement clears private state. Native
picker SHA-256 remains `6b141986ba936f925f57a7a384b6da0a9a9cd7ba08756c796052a342c2416a0b`,
the previously reviewed cancellation correction. The new native picker was not
executed by this widget run.

Root's equivalent fixes for the preview local-name collision and narrowed
device-zone Future are included in the frozen source. QA read App's timeout
correction `54db6f8`: it retains the 15-second timeout and failure catch, removes
the incompatible Failure-returning callback, and does not change test assertions
or add a fallback. Today still prepares fresh on Send and generic execute
conflict still requires original-operation readback.

No new real-model, Ticketmaster/CDN, deployed Firestore, service deployment,
avatar upload, Android runtime, phone installation, cross-network, UAT, Release
or Done evidence was produced by this verification. The current-day five-case
evidence is Flutter fake-backed behavior, not physical-device/model proof.

## Independent v29 artifact readback

At 20:45:26 SGT, QA inspected the actual v29 candidate and retained v28 with one
bounded tool batch: Android build-tools `36.0.0` `aapt dump badging`, `aapt dump
xmltree ... AndroidManifest.xml`, and `apksigner verify --verbose --print-certs`
for each APK. All six commands exited 0. No Flutter, Gradle, resource inventory,
ADB, device or service operation was performed by QA.

Candidate:
`/home/miku/.codex/worktrees/ai-companion-integration-20261025/ENMORI/build/group-delivery-v29/ENMORI-group-v29-release.apk`.

| Field | Independently observed result |
| --- | --- |
| APK SHA-256 | `35e4b53688f729d01b80f322c838c92b6c4785ee9445528c63c00eb47ed2fd30` |
| Size | 66,906,266 bytes |
| Package | `com.enmori.app.group`, same as retained v28 |
| Version | code `29`, greater than v28 code `28`; name `1.0.0-group20261025` |
| Signature | APK Signature Scheme v2 verifies; same certificate as actual v28 |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Permissions | Same nine declarations as v28; no additions/removals, no broad storage/media permission |
| Messaging auto-init | `firebase_messaging_auto_init_enabled = false` in both APKs |
| Analytics collection | `firebase_analytics_collection_enabled = false` in both APKs |
| Debuggable | False in both APKs |
| Metadata | Actual identity/hash/size match `candidate.json`; `SHA256SUMS` agrees |

The retained v28 still hashes to
`22dc680046950c61fb53bdfc824f0852c84da649094aa58b45c0ab4e9225f377`.
Both APK hashes remained unchanged after inspection. Candidate metadata,
source-validation metadata and Integration HEAD all identify `0e60cb9`; the
tracked implementation delta from that freeze was empty. Root's successful
build log ends with the release APK and 114.5-second Gradle task.

Private readback directory:
`/home/miku/.local/state/enmori-core-feedback-20261025/qa-final-0e60cb9/apk-v29/`.
It contains all commands, exit codes and stdout/stderr hashes; directory mode is
0700 and raw outputs/review metadata are 0600.

| Evidence | SHA-256 |
| --- | --- |
| `artifact-review.json` | `b256b5b782b76b01d5567f73d697964147c9b9fd4aa4b5c26a72452a13cf3a89` |
| Actual `candidate.json` | `8bc6cadf30257df1e8426184ba15ed0852373db876dd99691f811d7d940866e0` |
| Root `integration-v29-build.log` | `4d5a6a999826ed0e2fc25cdc5b0a6ecb3437735acfb562ba5d7efc3943c3c29f` |

**Pass for artifact identity, signature and the requested packaged permission/
configuration checks.** Package, signer and upgrade ordering are preserved;
actual installation and user-data preservation have not been exercised here.
The declared notification permission is not runtime permission or proof of
registration/delivery. This static readback does not change the runtime, model,
phone and acceptance boundaries above.
