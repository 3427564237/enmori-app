# LI small UX increment — connected-device checkpoint

Product **290c4317208089e36d0d494031e3ee25cba7d451**, over accepted #1110adb9a5b29605f5c8dba758a8e8383e4ba2e3e89. Four changed Dart/test files; no feature policy, API, data, dependency, route key or callback change. [Current bounded authority](../../decisions/2026-10-15-li-small-ux-device-increment.md).

`OfflineEntry` previously used a non-scrollable centered Column. New tests against old source reproduced2/2 failures:320×480@2x text overflows608px,640×320@2x overflows304px. This is a demonstrated reachability defect, not a Figma pixel claim. SafeArea viewport+LayoutBuilder+SingleChildScrollView+minimum-height content preserves short-content centering and enables scroll to the original Continue action for longer content. Home and offline Home/Profile links to the same history route now use canonical Footprint, matching C5/Q04 and the destination title.

Implementation agent: four relevant widget files39/39; scoped fatal-info analysis4 files no issues; four-file nonwriting format0 changes; whitespace Pass. Parent independently reran new entry cases plus shared History/AI router tests **25/25**, exit0, checking action reachability/callback and existing entry/session/router semantics. These totals overlap, not64 distinct tests. Existing pinned Flutter3.47.2/Dart3.13.2 and locked dependencies; no install or lock change.

A separate agent read the final four-file delta and found no blocker: viewport bounds/short-content centering, no Expanded/infinite-height change, original keys/callbacks/routes/enabled conditions, canonical source name and meaningful user-behavior assertions. That agent did not rerun tests and does not replace DU's formal peer review. No larger Home card redesign or feature-owned change is included.

Figma/Q04 reference: existing route26 `checkin-timeline` Footprint/M21; precise live Figma node unavailable in this pass. No live Figma visual-parity claim. Ordinary-size centering is source-reviewed; TalkBack/keyboard/Figma pixels and actual installed updated APK remain Not Run at this checkpoint. New evidence will be appended to this exact product if a device build/run occurs.

The physical device is vivo V2405A/API36, connected USB. Parent is separately running the reviewed controlled real-model network target; that target does not include this offline UI source. Existing baseline offline APK keeps its original hash/source and is not relabelled as the new increment before rebuild. Keep Draft/Open, no main merge or whole Figma/module/Sprint/UAT/Release/Done claim.
