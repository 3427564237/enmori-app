# Recommendation wait experience verification

Authority: [approved loading performance decision](../../decisions/2026-11-17-li-activity-loading-performance.md).

Home and All/For you now expose an explicit local Stop waiting action, delayed ten-second explanation and distinct stopped/reload state. Initial copy is short. The underlying HTTP read is not claimed cancelled; operation, view, account and context fences retire late results. A queued activity-area refresh cannot replace a newer route request. Accessible actions remain outside decorative semantics exclusions.

Targeted tests: **45 passed**, including the prior eight bilingual/screen-size retained-scroll rendering cases and a new scrolled return/Stop/late-result case. Full Flutter suite after the retained-scroll repair: **1,917 passed**. Static analysis: **no issues**. Initial full validation exposed eight retained-scroll loading-visibility failures; that evidence was retained in `/tmp/enmori-v78-flutter-full.log` and the root cause was repaired before the final full run. It was not treated as a flaky or waived test.

Production-themed Flutter renders use synthetic pending repositories, actual app widgets and local Roboto/Playfair/CJK fonts. Twelve images were generated; six representative initial, long-wait and stopped states were visually inspected and retained under `ui-preview/`. English at375x812/1x and Chinese at320x640/2x show readable content and reachable actions with no overflow. They are fixture render evidence, not live source or physical-phone acceptance. Existing retained Home geometry tests pass; repeating neutral progress keeps waiting visible below the top panel without retaining old cards.

Logs: `/tmp/enmori-wait-ux-regression.log`, `/tmp/enmori-v78-wait-renders.log`, `/tmp/enmori-v78-flutter-full-final.log`, `/tmp/enmori-v78-flutter-analyze.log`. APK packaging and backend release are recorded separately after completion.
