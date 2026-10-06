# LI verified Profile/Settings publication readback — 2026-10-05

Operator: LI HOURUI. Authority: [S-PM-1005-LI-PROFILE-SETTINGS-PUBLICATION](../../decisions/2026-10-05-li-profile-settings-publication-approval.md), following LI's explicit confirmation of the exact verified packet at `f7f1097a6fe4604bd9591721c34e972f1a9c5d24`.

The remote was reread immediately before normal push. #50 was Open/Draft at `7e24396135ce41c94873da05f59af033c4035dee`, based on #43 `27b899fe93066298bd36d4d5dadf0f90a374a50d`, exactly as previewed. The existing branch was fast-forwarded without force to `4977f05db1d678f7f07ea1021cced44aa573a3ba`. No predecessor merge or retargeting occurred.

Completed actions:

- Published the source/tests/evidence and its specific publication authorization to existing [PR #50](https://github.com/3427564237/enmori-app/pull/50).
- Updated its title to `feat: add owner Profile Settings and device signout` and replaced its description with the confirmed final change, exact source/results and review boundaries.
- Posted the confirmed [Issue #45 evidence/status update](https://github.com/3427564237/enmori-app/issues/45#issuecomment-5989695590), including the received ZHOU #53 preparation update without accepting its unresolved physical contracts.
- Read back the actual #50 head/base, title, Draft/Open state and #45 comment. Issue #45 remains Open/In Progress; #44 remains Open/Backlog. No Project status, reviewer substitution, self-approval, merge or whole-Sprint acceptance was added.

The [owner execution packet](2026-10-05-li-profile-settings.md) retains its original local-before-publication snapshot. This record supersedes only its publication Pending statement. Implementation/Android source remains `e6f72b9123e79045d7c1c0cc1cd58a8198275434`; verification-only source remains `b752ee04ae4a65785a9235b0df284df10ecb9dfb`. Existing source-bound logs were checked, not relabelled as new runs: Backend 286/286, isolated Firebase 28/28, Flutter 126/126, analysis clean, Android 1/1 and host persistence Pass. No tested code changed in the publication authorization commit.

DU's new #50 disposition and separate #43 predecessor review remain required. The prior `acc6763` and `daca5e3` approvals are preserved only for their exact historical scopes. JIN's combined gate, final stacked-tree checks, LI Sprint acceptance, UAT and Release remain separate.
