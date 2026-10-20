# LI correction re-review — DU History #89

13 October 2026, Asia/Singapore. Requested by human LI: recheck DU's `9e2a057`
and confirm resolution of the previous findings. This records independent
contribution review, not History shared-router integration or Release acceptance.

- Exact reviewed head: `9e2a0572ff0e760c958635cd8d1c1f6253581a91`.
- Tree: `802dad901e596d2e89e78e489c31a64da5e38667`.
- Previous reviewed source: `c7729de89ecb35c47561a867e07fcd71cd568833`;
  subsequent evidence source `1c8288965c34d481706702014c4c83aecf96719c` left
  the original findings unchanged. This new source actually corrects them.
- [LI exact-head APPROVE 5493652567](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5493652567).
- Original [Changes requested 5492321616](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5492321616)
  and failure evidence remain historical. Four original threads are replied to
  with source-bound proof and marked resolved; no old comment is deleted.

## Four original findings

| Finding | Current-source independent resolution |
| --- | --- |
| Time-zone abbreviations | Restored accepted deny set and negative/valid-IANA-alias tests. Original probe rejects all eight abbreviations with REQUEST_INVALID before repository access; Asia/Singapore, US/Eastern and UTC controls succeed. The committed suite also preserves the accepted backward-compatible aliases. |
| Normalized Note DTO | Restored trim/nonempty/maximum500-grapheme checks. The unchanged accepted #64 Note test now passes: empty/whitespace/outer-whitespace/501 graphemes rejected, valid500 accepted. |
| Native API24 minimum | Removed java.time and uses existing TimeZone/Date/SimpleDateFormat/ParsePosition. No minSdk increase or dependency. New isolated test APK builds; aapt reports min24/target36. API24/25 runtime remains Not Run. |
| Isolated-only History route | History is again passed only through isolatedSlices after the controlled Emulator environment guard. Ordinary R4/controlled runtime no longer registers/constructs it. Original injection probe now reports absent route/404; unsafe composition rejection, authenticated no-store flow and actual Emulator paging pass. |

The new formatter's ISO8601 `X` pattern is available from API24 in the
[official Android SimpleDateFormat reference](https://developer.android.com/reference/java/text/SimpleDateFormat).
This supports the source compatibility conclusion, not a runtime/device result.
The approved #64 public API, History Infrastructure/Ports, dependencies/locks,
Firebase configuration and index payload remain unchanged in the reviewed scope.

## Actual LI verification

| Check | Result |
| --- | --- |
| Clean strict Backend build/full source suite | Pass323/323, exit0 |
| Full Flutter unit/widget | Pass162/162, exit0 |
| Guarded actual Auth/Firestore Emulator | Pass39/39, full outer exit0; includes isolated History paging |
| Fatal-info analysis lib/test/integration_test | Pass, exit0 |
| Unchanged accepted #64 Note probe | Pass1/1, exit0; overlaps full tests, not added to162 |
| Original abbreviation/ordinary-route probes | Expected rejection/absence observed |
| New corrected Android debug test APK | Build Pass; com.enmori.app.historytest, min24/target36; not installed by LI |
| Four-file non-writing Dart format | Fail/exit1: would change4 files; source left untouched |
| Exact 1c82889→9e2a057 diff whitespace | Fail/exit2:12 new blank lines at EOF |

Pinned Flutter3.47.2/Dart3.13.2, Node24.19.0/pnpm11.19.0, existing locked
dependency cache and invocation-only dependency-verification workaround.
Offline enforce-lockfile pub get changed no source/lock. LI targeted no physical
device. Local reviewer APK157,503,564 bytes, SHA256
`cd6c492fcfacc14ccae82aa8918f76ed2fb79c8ae0ac9683d2231210e88f8f45`;
it differs from DU's independently built APK and is not an installed-binary hash.

Actual Emulator execution used the unchanged environment builder/guard and
versioned run-emulator-tests worker, fresh private profile, exact demo project,
loopback ports and checksum-verified existing cached JAR. No cloud access or
dependency install. CLI shutdown, isolated profiles removed and ports8080/9099/
4400/4500 free at settled readback. Temporary cache symlink removed without
deleting its target; final tracked-clean review checkout.

Retain the initial reviewer preparation failure: reused checkout's generated
backend/dist contained seven tests from a prior reviewed branch whose TypeScript
sources do not exist at this head. The first invocation therefore included
unrelated stale tests and failed. LI inventoried those source-absent outputs,
removed only ignored generated backend/dist, rebuilt and ran the actual323-test
suite successfully. No product source/assertion was changed; failed log retained.

Reproduction on the exact detached head:

```text
flutter pub get --offline --enforce-lockfile
pnpm backend:verify                     # from clean generated backend/dist
flutter test --no-pub --reporter expanded
dart analyze --fatal-infos lib test integration_test
node build/li89-rereview/run-emulators.mjs
flutter test --no-pub build/li89-review/accepted64_backend_repositories_test.dart --plain-name "history parser rejects Notes outside the normalized 1-500 grapheme projection"
node build/li89-review/zone-probe.mjs
node build/li89-review/ordinary-route-probe.mjs
ORG_GRADLE_PROJECT_historyTestApplicationIdSuffix=.historytest flutter build apk --debug --no-pub --target integration_test/s3_check_in_history_real_backend_test.dart
dart format --output=none --set-exit-if-changed <4 changed Dart paths>
git diff --check 1c8288965c34d481706702014c4c83aecf96719c HEAD
```

The ignored reviewer Emulator launcher and probes remain local; they are not
product implementation or new requirements. The launcher reuses the established
guarded execution pattern; its fingerprint is retained with the private logs.

## Nits, owner evidence and remaining scope

The12 EOF whitespace additions and4 formatter changes are nonblocking for the
four corrected functional findings. The owner record's whitespace-Pass and
Flutter161 statements need reconciliation; LI measured Fail and162 at this head.
Do not silently relabel those checks green. No source formatting was performed
on DU's branch by the reviewer.

DU's API35 physical five-read/22-record unchanged readback, synthetic screenshots
and APK fingerprint remain owner-attributed. LI did not rerun that device or
download/recompute the owner APK. The token path uses Auth Emulator plus ADB
reverse, not evidence of native FlutterFire UI sign-in. Earlier API36 execution
is historical and does not certify this corrected source.

API24/25 runtime, accessibility, UAT and Release remain Not Run. Resolve only
the four original findings at this exact source; no shared History integration,
new combined-source gate, whole #82/#85/Sprint completion or prior12 October
deadline achievement is inferred. Keep Draft/Open; no merge, Issue closure,
Project promotion or ordinary/provider/model enablement.

Local ignored LI log SHA256:

| Artifact | Fingerprint |
| --- | --- |
| backend-fresh.log | 885fcab78f57c09d73d054e8cfcbcc1ec6f1847a87b3eb3fa799c286ef0c8137 |
| flutter.log | ef3b8f00a0c2478561c882aacb4df8d9da3b0e0d2de6b876300a8faceba4e823 |
| emulators.log | 52960eff98f6c5742883a7aa1a359a51cbc66488de2730d185ddfe4d163ea3dd |
| android-build.log | ad285243af0f2df40f40795b9cd9d9f32b7b17fefed4449d02c1ad10e619b867 |
| diff-check.log | 3297b99d69ebb2167c6b4e4288af0b198625a843bb3cd2933b0cc4b828a80499 |
| format.log | 091006b31b1fce9f4b57455929e7d7bc9f109e36f5ac41363795b173354614af |

## Later formatting-only source, independently refreshed

Latest #89 `6ef6978c4dcdba79b66c781ba99d851aa4e26955` changes16 files from
approved9e2a057. LI compared every changed Git blob: each removes exactly one
final newline byte, with no other byte/content change. New diff whitespace
passes and four-file non-writing Dart format reports0 changes/exit0. The former
format/EOF nits are resolved at this source; retain their earlier Fail results
as history. [LI exact-head APPROVE5498833589](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5498833589)
refreshes the scoped review. Prior product tests remain executions at9e2a057
with this explicit content-equivalence check, not tests relabelled to6ef6978.
Four functional findings remain resolved; all runtime/Release limits and the
unperformed shared History integration remain as above.

The passing whitespace check here is the exact9e2a057→6ef6978 delta. A separate
main-f46a903→current full-baseline check still fails for pre-existing CRLF
trailing whitespace and an EOF blank line in android/app/build.gradle.kts,
unchanged by this cleanup. Do not describe the entire PR baseline as whitespace
Pass. This inherited style exception is nonblocking and changes no finding,
approval scope or platform/runtime claim.
