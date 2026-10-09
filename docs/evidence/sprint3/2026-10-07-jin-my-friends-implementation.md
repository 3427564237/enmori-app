# JIN isolated My Friends implementation — 7 October 2026

Owner JIN; independent implementation reviewer SHI. This is the bounded F01–F05 increment, not full `friends-page`, real-account enablement, Sprint acceptance, UAT or Release. Keep the implementation PR Draft; no merge or board transition is requested by this record.

## Authority and exact sources

- Historical candidate: [#58](https://github.com/3427564237/enmori-app/pull/58), `2cdf7315a3f088a090f1e24a287bfc53506a0447`, against `f2d01a129ab4d409c5acb8027481f32b7afec7fe`.
- [LI option A](../../decisions/2026-10-07-li-next-read-option-a.md), copied unchanged from `c8264b4113fe3a1ce6431997c97e4ab5dd03840a`, conditionally approves that exact candidate. Its preview remains historical.
- [SHI preparation approval](https://github.com/3427564237/enmori-app/pull/58#pullrequestreview-5441974828) is APPROVED at the same candidate, with no blocking findings or material reconciliation. It authorizes no claim about previously absent code or tests.
- Product implementation: `92c9b662012271d15ef26403a07866092898576a`. Test/harness follow-up: `dba518b3dacb424ae1826d9e0b0726a91f218cf3`; production Backend/Flutter/API files are unchanged between those commits.
- Main observed at `f46a903cb5b339365ac2024004b32b7b96b99e7c`. Its changes from the candidate baseline are three planning Markdown additions only; no executable-source integration delta was found.

## Delivered behavior

`GET /v1/me/friends` is registered only in validated isolated Emulator composition. Flutter exposes `/friends/list` only behind the existing default-disabled isolated flag. It returns only current Username and actual DisplayName for accepted friends with permitted Profile visibility and current requester/target eligibility and either-direction block checks. Private and unset-name records are omitted; missing or malformed authority fails the whole page.

The feature-local index uses explicitly initialized fixture populations. A valid acceptance atomically creates two independently random owner pointers and pair references with pending consumption. Missing initialization aborts acceptance rather than manufacturing an empty index. Fixture block/temporary protection retains the pointers and hides rows; fixture permanent deletion removes both pointers/references without inventing a real Friendship-deletion rule. Existing decline, expiry, stale-request, canonicalization and request semantics are retained.

Each list transaction scans at most 20 pointers plus one lookahead. A continuation is the last scanned random reference, canonically decoded and required to exist in the current owner's index. There is no scan-to-fill, general query framework or stored pagination session. Empty filtered pages can continue. Flutter replaces pages on Next, clears stale rows on reload/error/account change, ignores late results, and rereads after reopening/resuming. Rows have no action or Profile handoff.

## Executed verification

| Check | Actual result and attribution |
| --- | --- |
| `pnpm backend:verify` | **Pass, 321 tests** with Node 24.19.0 / pnpm 11.19.0 and unchanged lockfile. Source matches production commit `92c9b66`; later changes are test/harness-only |
| `flutter test --no-pub --reporter expanded` | **Pass, 160 tests**, Flutter 3.47.2 / Dart 3.13.2; includes five new parser/controller/widget tests. Production Flutter and unit-test content unchanged in `dba518b` |
| `flutter analyze --no-pub` | **Pass, no issues**. Windows Unicode-path protocol failure was avoided by an ASCII-path junction to the same checkout; no SDK/source version change |
| `node tool/run_my_friends_emulators.mjs --backend` | **Pass, 13 tests** at `dba518b`. Actual isolated Auth/Firestore transactions, HTTP authorization, acceptance/cleanup races, transaction abort rollback, Profile/eligibility read races and fresh reauthorization |
| Continued full-page read bound | **Pass: 106 reads in each of two transaction attempts**. Real SDK retry was exercised with one deliberately injected `ABORTED`; the returned order and no lookahead-target expansion were asserted |
| `node tool/run_my_friends_emulators.mjs --android emulator-5554` | **Pass, one integration scenario** at `dba518b`, Android API 36 Emulator. Two synthetic accounts use real Auth, HTTPS Backend, application repositories and router; request/accept/list, 20/20/2 page replacement, Private/unset-name omission, account switching, reload/reopen and injected offline recovery passed. Backend persistence readback confirmed both atomic pointers |
| Baseline-to-head `git diff --check` | **Pass** for the implementation and retained candidate; no default whitespace-pass exception claimed |

The bound is 21 scanned documents + 20 × 4 target/pair/presentation/reservation reads + 5 requester/initialization/cursor reads. It is an application document-read ceiling per transaction attempt, not a total across retries or a billed-index-read promise. This execution also tests foreign/stale cursors, 0/20/21 boundaries, initialized-empty versus missing index, filtered-empty continuation and malformed authority.

Full regression execution is compatibility evidence for the changed acceptance/transport integration. It does not reopen prior preparation/component reviews or reattribute their historical results to the new slice. Real provider calls, real-account migration/backfill, live Qwen, iOS, physical-device evidence, UAT and Release were not executed or claimed. The evidence-only commit following `dba518b` changes no executable source or test content.

The passing Android build produced `app-debug.apk`, 80,046,472 bytes, SHA-256 `a4eec9c83c00c6b4a8f986c85f7a4988124de71bf9accb85029d092622a9dc08`. This identifies the locally executed artifact; the test APK embeds ephemeral fixture configuration and is not published. The test reported `MY_FRIENDS_ANDROID_TWO_ACCOUNT_ACCEPT_PAGING_PRIVACY_UNSET_RELOAD_ERROR: Pass` and `MY_FRIENDS_ANDROID_TWO_ACCOUNTS_ATOMIC_POINTER_READBACK: Pass`; the runner exited 0 after stopping the Auth/Firestore emulators and removing its temporary profile. No screenshot or physical-device evidence is claimed.

## Reproduction and environment

Use the pinned Node and Flutter versions with the existing lockfiles. The Backend build is `pnpm backend:build`; the focused runner starts only `demo-enmori-rmvp01a-r10` on loopback Auth 9099 / Firestore 8080, checks ports before use, applies the existing credential-profile allowlist, and stops the emulators afterward. Run Backend and Android sessions serially.

For Android, use `node tool/run_my_friends_emulators.mjs --android emulator-5554`. Supply local tool/cache paths through `ENMORI_TEST_FLUTTER_DART`, `ENMORI_TEST_FLUTTER_SNAPSHOT`, `ENMORI_TEST_OPENSSL`, `ANDROID_HOME`, `PUB_CACHE`, `GRADLE_USER_HOME`, and optionally `FIREBASE_EMULATORS_PATH`. These select already installed tools/caches, not credentials. Windows test-library discovery uses the temporary isolated `LOCALAPPDATA` path. The Android fixture uses temporary HTTPS certificate trust for `10.0.2.2`, not a TLS bypass, and two synthetic Firebase Auth accounts. Authored application repositories, Backend and router are real. Offline recovery is a test-only HTTP `ClientException` injection, matching `IOClient`'s documented error boundary.

Two initial Android attempts did not pass: the first stopped before product execution because the Windows test library required `LOCALAPPDATA`; the second reached the real request/accept/list flow but the test injected a raw socket exception instead of the HTTP client abstraction's exception. Both were corrected in the harness/test, without changing product behavior. The final run passed; the prior failed-run temporary profile was removed. Only sanitized results and artifact hashes belong in this packet; fixture passwords, TLS private keys, token values, raw records and the credential-bearing test APK must not be published.

## Delivery and remaining gates

The bounded implementation is delivered for SHI's independent code/evidence review; that review is **Pending** and is separate from SHI's completed preparation review. #58's approved proposal head is retained, and #46 preparation remains accepted/Closed/Done. This work makes no merge or Project-status decision.

Actual 11 October feasibility: the isolated list implementation and execution evidence are delivered now; independent implementation review is still pending. A full nine-route/real-user Friend commitment still cannot be made. Real eligibility/block/lifecycle sources, name-based My Friends search, public Profile actions, Friend Recommendation, Friends Activity and their Home consumers remain outside this delivery and require LI's explicit scope/priority resolution. The 42-route/38-state target is retained; no target is silently removed and no finish estimate is invented. #44 remains Open/Backlog. History, Event access/use and Persona gates remain with their existing owners.
