# Non-AI frontend, Admin and record insights — verification

Work began 4 November and continued 5 November 2026, Asia/Singapore. Branch:
`souma/nonai-admin-insights-20261104`, based on `d97812dedf0408926bf4cf4aed0162429e7dd073`.
Authority: [LI's priority/execution direction](../../decisions/2026-11-04-li-nonai-admin-insights.md).

## Delivered behavior

- **Check-in charts:** History → Record charts. Read the selected seven civil dates or explicitly choose 28 days ending on the same date. A coverage ring, daily bars/intensity grid and exact Mood/Activity label counts summarize only the existing authenticated-owner reader. Tap a date to filter the original records below; opening a record uses its existing saved-record destination. Missing labels remain explicit. Unread days show `?`, partially read counts `≥`, and incomplete scans remain labeled. Range changes retire prior results/late reads. Stop/continue, captured IANA time zone, session/background and mutation invalidation remain inherited from the existing scanner. No goal, attendance history, mood score, AI, persistent aggregate or additional service is introduced.
- **Event charts:** My plans contains a status ring and labeled count bars for Interested, Going and no current participation. Tapping a bar filters the existing list. Counts use the loaded confirmed participation snapshot; hidden is counted separately as an overlapping attribute. Remaining pages, refresh failures and unconfirmed changes remain visible. Going is intent, not attendance. The Profile's embedded plan section keeps its existing compact presentation.
- **Admin:** existing active catalogue summary, local name/ID search, source/name ascending/name descending ordering, expandable stable-ID details, and reveal of a newly confirmed created item. Existing fresh capability checks, one-item creation, independent readback, unknown-result recovery, session replacement and draft protection remain. Search/order causes no mutations or extra catalogue reads. This is the current Interest administration capability, not complete C2 CRUD or account execution.
- **Forms:** interest Back/Skip confirms actual changed selections, Keep editing retains them, reverting a selection removes the warning, and leaving an already dispatched save does not cancel/replay it. Same-UID session replacement removes the old dialog and reads the current session's interests. Sign-in validates edits after the first attempt, accepts keyboard completion and guards against duplicate pending submissions.
- **Observed layout repair:** the inherited Check-in edit visibility dropdown overflowed by 103px in the existing English large-text test. Its expanded width, unconstrained item height and nondense layout now allow the existing labels to fit. The test opens/selects the longer Friends-only label in both languages without saving.

## Verification

- The 17-file Flutter batch at `8529315c2f244ef91daddf64d831ada9255dd30d`: **152/152 passed**. Includes new chart/form tests, synthetic rendering, existing Admin repository/controller/page/composition, Check-in search/edit, Event plans, Interest controller/session/page, sign-in lifecycle, registration recovery and journal localization. The final source `6aeb776abfbf66375009469a2a1d4e5479deac6c` changes only the English empty-state wording for the no-current-participation filter; all **24 Event plans tests passed again**. These 24 overlap the earlier batch and are not added to its count.
- Full `fvm flutter analyze --no-pub`: **no issues**. `git diff --check` passed.
- Actual production-widget rendering: **8 synthetic cases**, English 390dp/1x and Chinese 360dp/1.3x, including scrolled states. Local native fonts were loaded for PNG inspection. Six representative captures are retained in `previews/`; they are not phone screenshots or real account data.
- No Backend/API, dependency-lock, infrastructure or AI source delta. The unchanged Backend/model suites were not rerun. No repository-wide Flutter green claim.
- Exact code/APK receipt and final verification metadata are in `apk.json` and `checks.json`. Raw test/build logs remain under the ignored `output/nonai-admin-insights-20261105/` directory; log hashes are in `checks.json`.

Initial failures remain attributable: a new test initially accessed a constructor-only Flutter field instead of the rendered text field; scroll helpers initially targeted off-screen/lazily unbuilt controls after the added content. These tests now scroll/pump to real hit targets while retaining their assertions. The existing-email registration test also failed on the unchanged baseline because it skipped the already-required discard confirmation; its assertion now includes that dialog. The visibility-dropdown overflow reproduced on the unchanged baseline and was localized to its exact RenderFlex before the bounded product repair. These failed attempts do not count as passes.

## APK and acceptance boundary

The [local v55 APK](../../../build/nonai-admin-insights-v55/ENMORI-insights-v55-release.apk) built successfully from source `6aeb776abfbf66375009469a2a1d4e5479deac6c`: package `com.enmori.app.group`, versionCode `55`, versionName `1.0.0-insights20261105`, nondebuggable, 68,969,796 bytes. Its SHA-256 is `baff603b9c86c30e63e0e0d2dac54cfb2939ccb85931dd858276c98c490e6c23`. `apksigner verify` passed; package, signing certificate and permissions match the existing v54 artifact. The successful build still prints inherited Kotlin plugin migration and SDK tooling warnings; it is not a warning-free build claim.

The candidate uses the existing Azure client configuration, retaining the companion flag. No service deployment, Admin grant, model request or real-account mutation is part of this work. The successful APK's metadata and permission comparison with v54 are recorded in [apk.json](apk.json). The APK and raw logs are local ignored build outputs; the receipt and representative synthetic PNGs are retained in this evidence directory.

`adb devices -l` found no connected device. Installation, retained-data upgrade, real Admin create/readback, real saved-record journeys, Wi-Fi/mobile-data and dual-account/device acceptance are **Not Run**. No main merge, external publication, independent author-review acceptance, UAT or Release claim.

## Remaining Admin work

[The concrete dependency inventory](../../planning/2026-11-05-admin-completion-dependencies.md)
preserves wider C2 scope: full Interest management, Event Category CRUD,
configuration draft/publish/history and auditable pending account requests.
Their missing contracts/Backend implementation remain outside this task's
Backend/AI exclusion. No dummy controls or local-only successes were added for them.
