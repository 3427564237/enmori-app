# App product round — delivery evidence

Baseline: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`. Dedicated workspace `/home/miku/.codex/worktrees/8c33/ENMORI`, branch `souma/product-app-20261023`. The target integration branch was rechecked remotely and still pointed at the pinned baseline during implementation. No old integration workspace was edited.

## Consumer paths

- Profile → Edit profile → edit → Save → readback → return to Profile. Saved profile audience is displayed separately from record/field controls; Username is immutable and affiliation icon matches School/Company.
- Profile → Settings → independent privacy/data-use/Check-in/Home choices → Save → readback. Existing `afterContentMutation` invalidation and `accountSettingsSnapshotProvider` observations still drive other consumers.
- Stale or unknown save → “Check latest & keep my edits” → latest snapshot and explicit review → user Save at the latest revision. Only fields changed since the original snapshot are restored; unrelated remote changes survive. Same-field conflicts name the field and show its latest saved value. Affiliation type/name are recovered together. “Use all latest saved values” discards the recovered draft without a write. Failed read keeps recovery available; session replacement retires pending work.
- Language: `AccountPreferencesPage.languageSection` is a composition slot outside service loading/failure branches, shown only in general Settings. Integration supplies real device-persistent language control and global locale wiring. The App package translates Home, Account/auth/onboarding/email actions, own Profile/editor, general and AI Settings, ordinary interests editor, Home weather and shared WeatherCard, including validation/status/consent/permission/attribution/count/semantics copy. User/source content and enum wire values remain original.

## Shared dependencies and ownership

Included Integration-authored foundation patches: `91d1bd5f94fcabb22c5dd750713f0785f6f77b07` (explicit `context.tr` helper), `ab44e2234789f42261d8b4494eaac18d9da92b4e` (typed failure copy), `068be07a0785a69660e3dd093b931caeabe759ac` (direct SDK localization delegate dependency already in lockfile). These are common foundations, not separate App inventions.

App changes Home page content, Account presentation and its controller, Auth presentation, ordinary Interests presentation and Weather presentation. App does not modify shared router, global theme/motion, Social/Journal behavior, Backend/API, native persistence, production configuration or signing. Own participation and records retain owner-provided callbacks/slots. Integration coordinates Social/Journal/AI/admin and global navigation translations, native locale persistence and assembled validation.

## Validation status

Initial recovery batch: 49 passed, 3 failed assertions across 52 tests. Six new recovery scenarios and existing account/session fences passed. Two failures were exact-text expectations for the intentional empty-interest copy update; one existing location test assumed a single text match even though inline feedback and a Snackbar both display it. Assertions now check the new copy and the keyed persistent location feedback respectively. This first batch is not reported as a passing suite.

Affected-source/test analysis passed with no issues. The six-file UI batch covered 70 tests: 65 initially passed; one new interest fixture exposed an asynchronous auth-stream race, and four existing onboarding assertions queried a lazy offscreen error row. The fixture now supplies the authenticated snapshot synchronously, matching the guarded production route; the onboarding assertions scroll the keyed error into view. These corrections change test setup/assertions, not product authentication or error handling.

The corrective two-file run (`app_language_copy_test.dart` and `rmvp01a_r6_pages_test.dart`) passed all 32 tests. The remaining four files (`account_preferences_flow_test.dart`, `own_profile_flow_test.dart`, `profile_location_flow_test.dart`, `auth_email_page_test.dart`) passed in the six-file run. Thus all 70 UI cases have passing final evidence across the original and corrective runs; this is not a claim of a fresh single 70-test rerun. The final changed page and two corrected test files also passed analysis with no issues. The three pure recovery tests and existing content-coherence cases passed in the initial recovery batch.

New coverage includes live English/Chinese switching without discarding dirty service preferences, the language slot during failed server reads and its exclusion from AI-only settings, translated validation/conflict values/Home/weather/auth pages, and unchanged user-authored content. English and Chinese editor tests cover 360×640 and 640×360 at 2× text with reduced motion, and verify Save remains usable above the keyboard.

Rendered synthetic-fixture previews were inspected at 390×844: `/tmp/enmori-app-preview/profile-en.png`, `profile-zh.png`, `settings-en.png`, `settings-zh.png`, and `recovery-zh.png`. Chinese headings, controls, conflict feedback and retained user text render legibly. The preview fixture explicitly supplies the host CJK font fallback for Flutter's test font collection; production theme is unchanged. Settings previews show this module's consumer page without a simulated language control; Integration injects the real persistence-backed control. Logs: `/tmp/enmori-app-validation.log`, `/tmp/enmori-app-recheck.log`.

The shared Flutter window was released to AI after the corrective run. Integration still owns assembled module/global-root verification, native persistence/reopen behavior and final artifact evidence. App's widget/fixture evidence alone does not establish those results. No live service, Firebase, Ollama, signed build, device, deployment, UAT or Release validation is claimed. No real user data was accessed or changed.
