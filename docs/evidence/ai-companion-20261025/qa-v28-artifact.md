# QA — v28 signed artifact and native configuration

25 October 2026. Independent readback completed at
`2026-10-25T10:56:17.813128+00:00` against the actual v28 APK.
**Pass for artifact identity, signature, packaged manifest and configuration
consistency.** This does not establish installation, native runtime behavior,
data preservation, service/model quality, notification delivery or Release.

Artifact:
`/home/miku/.codex/worktrees/ai-companion-integration-20261025/ENMORI/build/group-delivery-v28/ENMORI-group-v28-release.apk`.

## Actual artifact identity

QA independently calculated file hashes and ran Android build-tools `36.0.0`
`aapt dump badging`, `aapt dump xmltree`, `aapt dump --values resources`, and
`apksigner verify --verbose --print-certs` for both the candidate and retained
v26 APK. All five commands exited 0. The candidate hash was checked again after
inspection and remained unchanged. QA did not invoke Flutter, Gradle or ADB.

| Independently observed field | Result |
| --- | --- |
| SHA-256 | `22dc680046950c61fb53bdfc824f0852c84da649094aa58b45c0ab4e9225f377` |
| File size | 66,447,274 bytes |
| Package | `com.enmori.app.group` |
| Version | code `28`; name `1.0.0-group20261025` |
| SDK | minimum 24; target and compile 36 |
| Signature | Verification succeeds using APK Signature Scheme v2 |
| Certificate SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee` |
| Debuggable | No `android:debuggable` attribute in the packaged application |
| Metadata consistency | Actual identity agrees with `candidate.json` and `SHA256SUMS` |
| Retained v26 | Actual hash remains `0ac3c6dfbcb1a277bfc5265f12bbeb56d584dcfb87308e83142fe718c45829ea`; fresh signature verification yields the same certificate |

The baseline is the existing owner-local
`/home/miku/.local/state/enmori-v26-phone-20261025/installed-v26.apk`.
Reading it does not query a phone or establish what is currently installed.
The JDK emitted a native-access warning during signature verification; both
commands still exited 0, and their original stderr is retained.

## Packaged manifest and Firebase resources

The actual merged APK manifest, rather than only the source manifest, contains:

- `firebase_messaging_auto_init_enabled = false`.
- `firebase_analytics_collection_enabled = false`.
- `android.permission.POST_NOTIFICATIONS`.
- The Firebase initialization provider and messaging plugin components.

The permission declaration does not grant runtime permission or prove a token,
subscription, cold-start click or notification delivery. Native messaging
services inspected in the manifest are not exported; the messaging receivers
are guarded by `com.google.android.c2dm.permission.SEND`.

QA independently extracted the actual string resource values in a private
process and compared them with the existing owner-local client configuration
file identified by Integration as this build's `--dart-define-from-file` input.
No API key or configuration value is reproduced in this document or tool output.

| Packaged resource | Present and nonempty | Exact match to existing build configuration |
| --- | --- | --- |
| `google_api_key` | Yes | Yes |
| `google_app_id` | Yes | Yes |
| `gcm_defaultSenderId` | Yes | Yes |
| `project_id` | Yes | Yes |

The app ID's sender segment also matches the sender resource, and the project
matches the controlled project required by the approved native source. These
are configuration consistency observations, not Firebase runtime acceptance.

The inspected configuration contains **no**
`ENMORI_AI_COMPANION_INSTALLATION_REF`. Integration records the additional
`ENMORI_AI_COMPANION_FIRST_FLOW=true` CLI selection; the packaged native
resources are consistent with that selected Gradle branch. Candidate metadata
also records first-flow selected and installation reference unconfigured.

At the frozen source, `bootstrap.dart` maps the empty installation reference to
a null messaging port. `CompanionNotificationBoundary` requires a valid
installation reference and non-null port before observing the notification
controller. Thus the candidate's D1 installation/notification lane remains
unconfigured by this build input. Bundling Firebase and declaring its permission
does not change that limitation or establish actual permission, token,
registration, refresh, cleanup or push behavior.

## Source binding and retained build failure

Integration's candidate/build record binds the artifact to clean source
`fd1649724e38298418b22681fcce6b6a9fcf933c`, with clean-before/after recorded.
QA verified that commit exists and that its entire `lib/` tree is unchanged from
the independently reviewed recovery head `6b4ec589c49fc7edf43a4654421c757d2435c9e5`.
The [F1 review](qa-f1-app-integration.md) retains its original failures,
18 earlier checks and two focused recovery passes at their exact heads.

The first v28 build stopped during native configuration with
`defaultConfig contains custom resource values, but the feature is disabled`.
It produced no candidate from that attempt. The retained failed-build log
SHA-256 is `ff9e8d0e7471f36a4cce3f792ec57893aef397f3f8b393a9e20344046cbec5ed`.

QA reviewed the subsequent `4d030645ceb7f21c141291aaaa9042e89d6723d7` repair:
the only native/dependency difference from `8d5a724` is four lines adding
`buildFeatures { resValues = companionNative }` in `android/app/build.gradle.kts`.
The existing strict first-flow selection controls it; Dart, manifest and
dependency versions are unchanged. The successful second build's actual APK
now contains the four intended resources above. Its log SHA-256 is
`76261452452df42f318fdae533db3b070b11b13d0df94bfe376081f08d6ac893` and its
terminal line records the built release APK.

Source-to-artifact provenance and clean-before/after come from Integration's
retained build records. QA independently inspected those records and the binary;
it did not reproduce the build or treat a source commit alone as binary proof.

## Private evidence and remaining gates

Private evidence directory:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/apk-v28/`.
Directory permissions are `0700`; raw resource output is `0600`. Raw resource
values and the existing configuration were not committed. The record preserves
commands, exit codes, stdout/stderr hashes, candidate metadata and comparison
booleans.

| Evidence file | SHA-256 |
| --- | --- |
| `artifact-review.json` | `618d090f9fb8ffd012c5e79bc7b7b46e6c550de7feca6508185cc1497ff3e5eb` |
| `artifact-readback.json` | `ca401adda86274ef207f6bef369cd395d1f28e6911fe5e65f580fff8f53068b1` |
| Inspected `candidate.json` snapshot | `98d3789a8a6afadea9ecd12cf91f27cae23b125f85e54a68d4b87d121ea2db10` |
| Actual merged manifest output | `bc8c0d1c7502f0a7bba3dc682a02fdade851492a5955dfaba1f60d6cf06fff1d` |
| Private resource output | `980456008512f5e5a7a77bb45545411333cb0cdaeed81085215e046697efaac1` |

No installation, native permission/token operation, service deployment, model
call, push send, real-data inventory or phone interaction occurred. Current
account preservation, native F1 behavior, installation-bound D1, cross-network
delivery, accessibility, UAT, Release and Done remain separate gates. The
historical full-directory test failures and unresolved semantic ledgers are not
converted to passes by this artifact review.
