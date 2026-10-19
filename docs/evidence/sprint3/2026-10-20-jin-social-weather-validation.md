# JIN source-bound local validation and handoff

Date: 20 October 2026, Asia/Singapore. Author JIN; this is not SHI independent review or LI operational acceptance.

- Incoming bundle HEAD: `927f77527b32d349aa08020f7de0e88402edb9c7`, with `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857` ancestry verified. Incoming ZIP SHA256 `7c47dbe50a3e728e109f5dfffeb948c19ad5ebeb8e3250b6fd682e00d921a794` (10,603,399 bytes).
- Implementation commit: `cb23d6a660291e6f5660cd0c0c7bb33ab2ff914e`, tree `df239adbf3d343007b7681f39318d4272acb1b92`.
- Final source/test revision: `b882680c616c461cf4a7fe8dfd0a5f6cf78a9e9a`, tree `55978ec0d7590af0ef66dc306bbf57eaa221a56b`.
- The second commit only narrows the map attribution test finder (disclosure text and attribution both legitimately mention OSM) and formats the added Dart error mapping. Backend subtree is identical at both commits: `06790f26a77049aa926963d540e48de4b8c5ec19`. Backend/SDK results below were executed on cb23d6a, not re-labelled as new executions on b882680.
- Isolated branch: `codex/jin-friend-location-weather-20261020`. Original workspace stays clean at `78757646953ccf80f47180f9443d81a055844615`; no original APK/log/failed record was removed or replaced. No existing component review was reopened.

## Checks actually executed

| Invocation / source | Actual result | Scope |
| --- | --- | --- |
| Node 24.19.0 `typescript/bin/tsc --project backend/tsconfig.json`, cb23d6a | exit 0 | strict source + test compilation |
| `node --test` with 19 affected files listed in `final-backend-files.json`, cb23d6a | **154/154, 0 skip, exit 0** | Weather mapping/deadline, Check-in store/idempotency, social authorization, recommendation/activity, existing Friend/search/Check-in contracts, OpenAPI |
| `node tool/run_social_weather_emulators.mjs`, cb23d6a | **5/5, 0 skip, outer 0** | one parent flow + four subtests; real local Firebase Auth/HTTP/Admin Firestore, provider double |
| Flutter 3.47.2 `flutter test --no-pub` with 13 files in `final-flutter-files.json`, cb23d6a | **118 Pass / 1 Fail, exit 1** | map assertion matched both new disclosure and attribution text; retained |
| Same affected Flutter command, b882680 | **119/119, exit 0** | revised assertion; session replacement, unknown save/key reuse, dialogs, records/map, independent readback, existing Friend/Check-in regressions |
| pinned `dart analyze --fatal-infos` on all 41 changed Dart files, b882680 | **no issues, exit 0** | includes added public error mapping and new tests |
| pinned `dart format --output=none --set-exit-if-changed`, same 41 files | **41 files, 0 changes, exit 0** | prior 1-would-change result retained; fixed mapping format |
| `git diff 927f775 b882680 --check` | **exit 0** | prior CRLF whitespace failure retained and fixed |

Both gate phases bind **1,558 tracked inputs**, unchanged before/after their respective invocations. The raw manifest files and SHA256 receipts accompany the private handoff; source receipt lists all 100 changed Git blobs plus raw/normalized working-file hashes. Normalization is only CRLF→LF and is not a substitute for byte stability checks.

The actual SDK flow creates two synthetic users, starts from no friend pair, sends/accepts, races the same Weather-enabled Check-in key, verifies one provider attempt/one record, calls actual Auth-protected profile/activity/exact-record routes, removes map sharing, updates private Special Care and removes the friendship. Final cleanup independently confirms **17 owned document paths and two Auth users absent**; the isolated credential profile is removed and all five owned loopback ports 8080/9099/4400/4500/9150 are free. Emulator permissive-rules warning is preserved: these tests exercise the server-authoritative Admin path, not a client Firestore-rules security claim.

No real Weather or OSM fetch is made by the test suites. Map widgets inject a no-network tile child; location and HTTP/UI tests use handwritten fixtures. The SDK uses actual local storage/identity but Weather is still a double. Native permission prompts, OS precision switching, real GPS, production quota, real Weather freshness and physical device behavior are **Not Run** here.

## Preserved failures and changes prompted by checks

- Fresh-account Friend lookup originally failed without a preseeded pair (0/1). The corrected repository treats absence as empty and creates on send; both the focused regression and real SDK prove the fixed path.
- Earlier Weather-grid test expected save rejection. Q13 requires optional enrichment failure not to block an otherwise valid Check-in; corrected code saves with no weather and a transient notice. Old output remains local, not a final pass claim.
- Intermediate TS schema/type compile failures, Dart style failures, Flutter analyzer LSP `FormatException`, initial pub/cache/tool invocations and CRLF whitespace records are retained. Direct pinned `dart analyze` produced the final valid analysis result; the LSP wrapper crash is not called a clean run.
- Initial Activity revocation fixture retained listRefs while declaring no friendship; the store correctly failed closed. The corrected stale-pointer fixture carries a valid non-friend pair and proves no activity leaks.
- Location test preparation failures (awaiting a void binding API; expecting paused Flutter to draw a frame; missing async return in the new repository method) remain in their numbered logs. The corrected lifecycle test asserts state clearing while paused and the visible result after resume; it does not pretend this is a native permission test.
- Final map assertion failure and the 1-file format result are preserved separately from the subsequent successful repair gate. Counts from overlapping earlier runs are not summed.

Raw local receipts remain under `build/jin-social/`, `build/jin-client/`, `build/jin-weather/` in the isolated checkout. The handoff packages selected final logs, failed-run logs and hashes; nothing is claimed uploaded to GitHub. The user’s earlier local-emulator-only evidence restriction is not broadened into a prohibition on delivering this requested source/evidence bundle.

## Remaining integration / decision / acceptance

Use the [single-page LI integration instructions](2026-10-20-jin-module-integration.md) and [physical contract mapping](2026-10-20-jin-social-weather-contract.md).

1. **LI decision**: persistent ignore undo/expiry/deletion handling, already requested at [#84](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6274517573). No implementation is silently chosen for that missing rule.
2. **SHI producer**: current participation projections and event metadata callbacks; this incoming branch has no matching producer. JIN's server authorization/identity hooks and failure behavior are implemented/tested. Partial Check-in activity remains independently usable; the combined event feed is not called connected.
3. **LI composition/device**: place the module builders/actions into the existing authenticated runtime and DU composer, reuse current private configuration, build the unified APK, then validate real two-account revocation, foreground location and provider/map/cache behavior. No replacement runtime, APK or deployment was made by this package.
4. **Independent review**: JIN → SHI on this new contribution/composition; LI acceptance remains separate. Author tests do not substitute for those gates. No merge, issue closure, Project change, UAT/Release/whole-app Done claim.
