# ZHOU connected two-round AI validation increment

17 October 2026 SGT, `D:\3851`. This completes the missing two-round automation in the existing sustained-service Android target under the [approved client/mobile kickoff](../../decisions/2026-10-16-li-low-blocking-kickoff.md). It supplies executable test source; actual device/model execution remains separate.

## Source and scope

Base is the approved unified #135 head `dcdc3ba13f1a4bac192775b7a45f8e37bc4c680e`, executable `b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e`. Source-only range is `dcdc3ba..e877a94` (the two commits `8611703` and `e877a94`); use the full hash/tree in the [machine receipt](2026-10-17-zhou-connected-repeat.json). Later evidence commits change no tests.

Exactly three test files change: the existing connected-device target and two new shared-script/HTTP-fixture files. AI/Persona production consumers match reviewed #130, while #135 retains its separately accepted Account/Event contributions. All 356 selected `lib`, Backend source, API, platform, operator and dependency inputs were checked unchanged. No product correction is invented without a reproduced client defect.

The connected target retains Settings and Persona create/activate/edit, deliberate draft discard, Persona deletion and Conversation deletion. Its AI section now explicitly sends `I read a book today.`, Reloads, sends the same text as a fresh regular Send, then Reloads again. It requires one session/conversation, four distinct ordered message IDs, two user/assistant pairs, available nonempty replies and an unchanged first pair. Expected model wording is never supplied or repaired.

Ordinary history merges into cached rows. Therefore `TWO_ROUNDS_DELIVERED` and the intermediate Reload stages do **not** independently prove a four-row server read. The target explicitly asserts the display is empty after entering Persona, then returns and fetches history. Only the complete four-row field comparison after that fresh view emits `ZHOU_CONNECTED_AI_TWO_ROUNDS_FRESH_VIEW_READBACK: Pass`. Persona deletion must preserve all historical fields, including microsecond timestamps and text. Final Conversation deletion must clear the visible messages. Canonical storage, Note provenance and physical cleanup still require JIN's independent host evidence.

The same two-Send UI script runs in local tests on actual pages/controller/wire with handwritten HTTP/Auth fixtures. New cases reject a wrong second operation, changed history, and empty/first-pair-only history after actual Persona navigation cleared the display. They assert no automatic outcome read, retry or third generation. Fixed markers and Boolean historical comparisons avoid printing private reply bodies or identifiers. The test's 95-second observation allowance contains the existing 90-second client budget; product budgets are unchanged.

## Actual verification

Pinned Flutter 3.47.2 / Dart 3.13.2, Windows, source-only tip recorded in the JSON:

- Affected Flutter tests **17/17 Pass**, exit 0. This includes the five new cases, plus existing Persona, cancel/return and repeat-wire checks; overlapping runs are not added.
- Fatal-info analysis: no issues, exit 0.
- Non-writing format: three files, zero changes, exit 0.
- Scoped whitespace checks pass; test inputs stayed unchanged through the final run. The JSON binds working hashes, Git blobs, commands and local log hashes.

Failure history is retained: the author's first three-case invocation had one pass and two guarded `WidgetTester` action failures from wrapping an active pump journey in `expectLater`; direct await/catch fixed test organization. That original output exists only in the tool transcript, not a reconstructed raw file. Subsequent runs passed. Review also caught a legitimate idle phase on Persona return, the cached-history proof gap and content-bearing matcher failures; these test gates were corrected before final verification. Local independent static review is supporting evidence, not LI formal approval.

Full application, Backend/SDK, real 9B, Android/iOS and APK checks were not repeated for this test-only increment. A local fixture pass is not a real phone/model pass.

## Current execution handoff and remaining dependency

The original #135 APK already received and installed by SHI remains the current manual-verification artifact. Its SHA-256 is `776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825`. Use the existing [version-bound manual procedure](2026-10-16-zhou-client-repeat-use.md#minimal-jin-comparison-and-android-handoff) as soon as JIN's current entry/configuration is valid. Include Persona create/activate/edit, the identical-input pair of sends, fresh history and deliberate deletion; JIN retains canonical/source/owned-cleanup readback. Natural cancel/leave/return remains a separate flow; do not manufacture late live replies or blind retries.

This increment does not require SHI to rebuild or replace that installed APK before manual verification. `tool/run_baseline_device_flow.py --flow connected` builds and installs a distinct integration runner; a later authorized run must separately identify its source and installed bytes. Do not mix its evidence with the original #135 artifact or use the older #115 short-lived configuration target. The present target uses the existing nine-field sustained-service/nonce handoff.

At the 22:43 SGT check, [JIN #139](https://github.com/3427564237/enmori-app/pull/139) head `c777fbfc2f24e68dd43efcb5f3ba0ed352871f14` supplies private-file/window/readiness preparation, not a working remote route. The [specific listener/access decision](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6235109065), JIN's runnable route and current TLS/configuration/original-lease readiness, and SHI's usable Tailscale connection remain the affected execution prerequisites. LI's offered window is 17 October 22:27–22:57 SGT, without automatic extension. Real two-round 9B and the new phone execution are Not Run here.

SHI Event #132 is unchanged at approved `7da25ca`; no new Event source was available for ZHOU re-review. LI reviews this new ZHOU test contribution. No service/network/model/device operation, credential access, main merge, task/Project transition or whole-module/Sprint/UAT/Release acceptance is included.
