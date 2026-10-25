# SHI v29 Event experience closeout

## Source, scope and ownership

- Actual base: `5cc207cd9c2879f2108546c505f58be14344c7ad`, fetched from `souma/ai-companion-integration-20261025` on 25 October 2026 (Asia/Singapore).
- Verified ancestry includes supplied team baseline `567350cdca4f257de64881178c5e487854802f87` and required checkpoint `9d9fc8b9da451c3ed0189d85ad0578eae3f8c7f9`; each merge-base ancestry check exited0.
- Branch: `souma/shi-event-experience-20261025`, based on the current published integration, not old main or the old SHI package.
- Product/test source: `f4e1ba6b5f5f083bffcc00624919c03e33763b30`; tree `38cb0b95d0411b86f26425b3c0381cd00e722de1`.
- This record is a subsequent evidence-only commit. Unified task: [exact prompt](https://github.com/3427564237/enmori-app/blob/5cc207cd9c2879f2108546c505f58be14344c7ad/docs/planning/2026-10-25-v29-next-round-team-prompt.md), SHI Event list/detail/mapping and external-return scope. Current peer reviewer is DU; JIN handles complex interface questions. LI retains shared Home/router/API integration, real credentials/providers/service/model, signing and physical-device/cross-network acceptance.

## Actual gap and correction

Both `ActivityPage` and `EventDetailPage` originally loaded only from initState. Reusing the same mounted Element while changing its locator/Event ID selected a new family provider but never issued its read; the new detail remained cleared/loading until explicit Reload. The three deterministic widget counterexamples show read calls `[A]` rather than `[A,B]`, including the old read remaining in flight, and the analogous two browse locators. They preserve the same Element and inspect the actual repository boundary, not a manually discarded callback.

The pages now schedule a read on identity change. Each post-frame callback captures both identity and a local schedule number, so superseded/unmounted callbacks cannot initiate the wrong read. Existing controller disposal/generation/freshness guards remain; a completed old read cannot replace B. No shared router, controller, API, Backend, dependency, product theme, participation write or source mapping was changed. Two inherited test hosts use test-only NoSplash to avoid this Windows SDK's missing ink shader, without changing assertions or production presentation.

## Current implementation audit: retain working fields

| Assigned concern | Verified implementation boundary and disposition |
| --- | --- |
| Cover | Ticketmaster occurrence `images` -> approved HTTPS s1.ticketm.net asset; bounded dimensions/bytes, no credential/redirect/disk cache. EventInformation owns request/decoded image and retires it on background, session or covered-route exit. Existing cover/fallback assertions retained. |
| Description | Backend projection takes safe actual `info`, then `description`, bounded plain text; optional fields pass through current BrowseDetail/EventDetail and handwritten client readers. Missing/rejected information uses neutral unavailable copy. No generated summary/translation. |
| Place/time | Actual venue/address and current approved local-time formatter retained; no coordinate-to-place invention/geocoder or changes to mapping/ranking. |
| Tickets versus information | In-app detail remains before explicit Ticketmaster tickets/booking action. Current source exposes one actual URL; no second information URL was observed in the approved projection, so no invented/duplicated source-information action was added. |
| Failure/expiry/return | Existing explicit Retry/Reload and five-minute/background/session clearing retained. External registration still requires actual handoff and explicit Yes; No/no change, duplicate-cycle protection and unknown-write read-before-retry remain. |
| New retained-page identity | Both detail entry widgets now start the new identity read automatically and keep late old data hidden; the new three regressions cover the corrected lifecycle. |

The mapping/controller audit is source inspection, not a new actual Ticketmaster/CDN or real-phone result. The normal v29 mapping was already delivered; it is deliberately not rewritten. No recommendation weights, global Home/Avatar/AI/route work or second provider is introduced.

## Executed commands and exact outcomes

Windows; pinned Flutter3.47.2/Dart3.13.2. Initial offline resolution failed because baseline-approved firebase_messaging16.7.0 was absent from this machine's cache. `flutter pub get --enforce-lockfile` then downloaded the exact locked packages successfully. No pubspec/lockfile/SDK version changes or new dependency selection occurred; no native permission or actual messaging initialization was performed.

Commands use the existing pinned SDK directly through its dart executable and flutter_tools.snapshot (equivalent pinned toolchain, not a global SDK):

```text
flutter pub get --offline --enforce-lockfile
flutter pub get --enforce-lockfile
flutter test --no-pub --no-test-assets --concurrency=1 --reporter expanded test/features/event_page_retarget_test.dart
flutter test --no-pub --no-test-assets --concurrency=1 --reporter expanded test/features/event_page_retarget_test.dart test/features/event_information_test.dart test/features/event_cover_loader_test.dart test/features/event_browse_test.dart test/features/external_registration_flow_test.dart
flutter test --no-pub --no-test-assets --concurrency=1 --reporter expanded test/features/event_page_retarget_test.dart test/features/event_information_test.dart test/features/event_browse_test.dart
flutter test --no-pub --no-test-assets --concurrency=1 --reporter expanded test/features/event_browse_test.dart
dart analyze --fatal-infos <the five changed Dart files>
dart format --output=none --set-exit-if-changed <the same five files>
git diff 5cc207cd9c2879f2108546c505f58be14344c7ad --check
```

- Final corrected before-fix counterexample: **0 Pass / 3 Fail**, exactly the missing new-identity reads.
- First five-file serial batch: **38 Pass / 3 Fail**. One failure was the new external ProviderContainer fixture retaining a timer until test teardown; two were existing interaction fixtures loading missing `shaders/ink_sparkle.frag`. These are retained, not rewritten as41/41.
- Corrected three-file host/fixture rerun: **26 Pass / 1 Fail**. All three new retarget cases and the cover route-retirement checks pass. The remaining shader failure was a second, separately constructed MaterialApp in the browse test file.
- After setting NoSplash on that second test host only: affected browse file **16/16 Pass**. Earlier successful files were not rerun. The reruns overlap the first batch, so do not add them or claim a fresh complete41/41 invocation.
- Scoped fatal-info analysis: **No issues found**. Format: **5 files / 0 changes**. Working/full-range whitespace checks pass.
- Initial stream-observation setup did not establish the guarded route's authenticated precondition, and two paused-clock attempts were interrupted. The final browse fixture supplies the already-observed authenticated state through the existing override API. Those setup attempts are not product failures or passes. Its final ProviderScope owns teardown; the product timer logic was not weakened.
- Serial execution on this Windows host observed no other active Dart/test process before setup. No Gradle/APK run, shared Linux-host validation lock acquisition or peer-host test execution is claimed.

Local ignored raw-log receipts (hashes are not a claim of raw upload):

| File | SHA-256 |
| --- | --- |
| build/shi-v29-retarget-before.txt | 36fa12ee0c75655e951731719470e7c6e210bc27854df62d67ce3c3d53dbd34c |
| build/shi-v29-event-final.txt (initial batch, not all green) | 9089943f1761f28668ff40e114bf89c01d8cd6b4008946f9255c331aa63241f4 |
| build/shi-v29-event-repair.txt | 555f09e97a7fa33a1d61a12c92808faf081afd18199d834bfb16b0915f84659c |
| build/shi-v29-browse-repair.txt | 297a17e9da809f4d40f5afc575cb73f55c64ad7acbb699aa2999b9fe9c13f0e9 |

## Single integration / real verification handoff for LI

Consume this small module PR into the existing integration. No constructor/public API changes or new configuration are required. Do not replay #170 or the earlier Event presentation package; both already exist in the base. DU reviews this new delta and fixture boundaries, not previously accepted Backend/AI work.

On LI's next explicitly approved candidate/device window, run one concentrated Event journey:

1. Open Events and current in-app detail; verify actual source title, venue/address, readable time, description/cover or honest missing-media/text fallback. Do not create substitute content or a second information URL.
2. Open a different Event through the existing host navigation; if the host retains the page, confirm the new identity reads automatically, shows the new event and ignores any late old completion. A fresh page must still load once.
3. Open Tickets/booking once; confirm the labelled external destination, return No leaves participation unchanged and explicit Yes follows the existing single Going save/readback. Do not replay an old unknown write; use its existing readback path.
4. Confirm cover retirement on another page/background and explicit reload after expiry; simulate connectivity loss only under LI's controlled conditions, verify real failure versus empty and recover with Retry/Reload.

Real provider/media/cross-network data may be absent; record that exact limitation. No key/credential transfer, additional real probing, APK build/install/deployment or private account operations were performed by SHI. Old Root1526/1526 and QA/device evidence retain their old source/author attribution, not new execution here. Await DU exact-head independent review and LI final acceptance; keep Draft/Open, no main merge/auto-merge/board/Issue/Release/Done changes.
