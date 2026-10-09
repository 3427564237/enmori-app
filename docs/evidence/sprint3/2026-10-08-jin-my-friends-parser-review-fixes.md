# JIN My Friends parser review fixes

8 October 2026, Asia/Singapore. Owner JIN; independent reviewer SHI. PR #61 remains Draft/Open. R1 and R2 are corrected with owner regression evidence; SHI re-review is required before either finding is treated as independently cleared.

## Reviewed source and correction

[SHI review 5445553266](https://github.com/3427564237/enmori-app/pull/61#pullrequestreview-5445553266) requested changes at `b4e0b1b9bb14e941162aa5db04fd3ce2a62a1d6d`, against base `f46a903cb5b339365ac2024004b32b7b96b99e7c`. The correction and regression tests are committed at **`c7b553d762c45c8c6b9d1d23f4acc906284e4e87`**. The subsequent evidence commit changes this Markdown record only.

The unchanged [LI approval](../../decisions/2026-10-07-li-next-read-option-a.md), [F01–F05 candidate](../../planning/2026-10-07-jin-friend-next-contract-delta.md), [Q18 Username rules](../../decisions/2026-09-02-add-friend-identity-matching-contract.md) and [approved Profile value rules](../../planning/2026-10-05-li-profile-settings-contract-preview.md) control the fix. No new contract or dependency is selected.

- **R1:** `listFriends` previously accepted any nonempty string. It now rejects noncanonical Username syntax, length and reserved names, and requires an already normalized 1–50 Unicode-scalar DisplayName without isolated surrogates, control/format characters or line/paragraph separators. It does not trim, lowercase, replace or otherwise repair response values. Supplementary Unicode and permitted internal spacing remain valid.
- **R2:** the previous cursor check accepted any 48-character base64url-shaped value. The parser now also decodes strict UTF-8, requires the canonical lowercase UUID-v4 version/variant syntax, and verifies exact unpadded base64url re-encoding. Invalid values fail the entire response, including otherwise valid rows and continuation. Backend owner-index existence and authorization remain authoritative.

The only product change is [the Friend response parser](../../../lib/features/friends/data/backend_friend_repository.dart). The helpers are private to that file and used by the My Friends read; existing lookup/send/inbox/action flows are unchanged. [The new regression suite](../../../test/features/my_friends_parser_test.dart) uses explicit UTF-8 HTTP mocks and includes invalid rows after a valid row, so failure cannot be confused with a successful partial page.

## Executed verification

Flutter **3.47.2**, Dart **3.13.2**; existing resolved packages and tracked lockfiles unchanged. The commands below used the project-selected installed SDK. All reported passing commands exited 0; no tests were skipped.

| Check | Result |
|---|---|
| New suite against reviewed product code, before either correction | **21 Pass / 41 Fail** out of 62. The rejection failures returned `Success<MyFriendsPage>`, reproducing both findings and additional boundary cases |
| `flutter test --no-pub --reporter expanded test/features/my_friends_parser_test.dart` after both corrections | **62/62 Pass**. Username canonical/reserved/length cases; malformed and normalized DisplayName cases, including 50 versus 51 supplementary scalars; invalid UUID/version/variant/UTF-8/encoding cases; all four valid UUID variants; valid/null and filtered-empty continuation controls |
| `flutter test --no-pub --reporter expanded` | **222/222 Pass**, including existing My Friends controller/widget behavior and all 62 new regressions |
| `dart analyze --fatal-infos lib test` | **Pass, no issues** |
| `dart format` on the two changed Dart files; `git diff --check` | **Pass** |
| Diff from reviewed head for `backend/`, `api/`, `tool/`, `integration_test/`, package manifests and lockfiles | **Unchanged** |

The local FVM launcher failed before product execution, and the initial sandboxed SDK invocation was denied path access. Verification then ran outside that sandbox with the same installed SDK, without installation, source/SDK edits or dependency resolution. The concrete Flutter launcher was `C:/Users/Aa124/fvm/versions/3.47.2/bin/cache/dart-sdk/bin/dart.exe C:/Users/Aa124/fvm/versions/3.47.2/bin/cache/flutter_tools.snapshot`; analysis/format used that SDK's `dart.exe` directly. These initial tool-start failures are not passing test runs or product failures.

## Evidence and acceptance boundaries

The [7 October implementation packet](2026-10-07-jin-my-friends-implementation.md) and SHI's review retain their original commits and attribution. Backend build/tests and actual Auth/Firestore Emulator checks were not rerun for this Flutter-only correction; their source is unchanged. Android/APK/device execution was **Not Run at the corrected head**: the previous Android result does not verify this changed client parser. The new tests exercise the HTTP DTO boundary with synthetic responses, not a live Backend or device.

Publish the corrected head and this evidence on existing PR #61 and request SHI re-review. Do not dismiss the changes-requested review, resolve its threads on SHI's behalf, merge, transition the board or claim independent approval. Default-disabled isolated activation and all real-account/provider/full-module/Sprint/UAT/Release gates remain unchanged. #46 stays preparation-only Done and #44 Open/Backlog; no target or owner/reviewer is removed.
