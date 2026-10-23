# Product round handoff — 23 October 2026

Base: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`.
Integration: `souma/product-integration-20261023`, target
`souma/li-zhou-runtime-20261020`. The existing integration worktree is unchanged.
Draft integration PR: [#174](https://github.com/3427564237/enmori-app/pull/174).

| Module | Work branch | Accepted delivery SHA / PR | Contract and current state |
| --- | --- | --- | --- |
| App | `souma/product-app-20261023` | `deb11e4b6ccec640e87771ebc87f32eb8638919b` / [#178](https://github.com/3427564237/enmori-app/pull/178) | Accepted. Profile/Settings draft recovery and bilingual personal flows; device language control injected in general Settings. |
| Social | `souma/product-social-20261023` | `b78c06f22411ba0d10561a2c15dae1f6a4041ea1` / [#176](https://github.com/3427564237/enmori-app/pull/176) | Accepted. Events → My plans → stable-ID detail → confirmed participation → retained plans; cumulative paging and loaded-results filters. |
| Journal | `souma/product-journal-20261023` | `2edbed45ea0aa144d8fc59d61167dc099a1d6f0e` / [#177](https://github.com/3427564237/enmori-app/pull/177) | Accepted. Shared label editing, same-month recorded-date review, retained history pages, authorized map preview; shared saved-record view wired through both Profile and Friends. |
| AI | `souma/product-ai-20261023` | `a2934b911949260962978ada817e2ba654fa701b` (includes `85dfc9081836698b4333482a7b1f1205ede68c51`) / [#179](https://github.com/3427564237/enmori-app/pull/179) | Accepted. Small-plan draft → editable review → explicit Send; repeatable Persona trials and bilingual UI. No new data access or streaming claim. |
| Backend | `souma/product-backend-20261023` | `acd4dcd24d98fb1621468220002eb06c817e7750` / [#175](https://github.com/3427564237/enmori-app/pull/175) | Accepted by exact-commit merge. Prior-boot process-lock recovery; 28 Node + 1 Python isolated checks reused. Not deployed. |

All deliveries were accepted by exact-commit local merges, with their Draft PR
heads and common base verified. Equivalent shared prerequisite commits coalesce
without duplicating code. The Social/Journal shared-file conflicts retained both
owners' translations and Journal's record builder. No GitHub PR was merged.

The human added English/Chinese Settings selection in the App chat; Integration
read that actual user message. Integration provides device-local persistence,
global locale wiring for both ordinary and group app roots, and the shared
`context.tr(en, zh)` / typed `localizedFailure` helpers. Modules translate their
actual UI; user/source/model content and API values stay unchanged. SDK locale
delegates were already locked transitively and are now a direct SDK dependency.
No Backend language field, external service, or account-data use is added.

Shared wiring stays in Integration: `lib/app/router/*`, `app.dart`, global theme,
motion and bottom navigation. App may edit `HomeShellPage` content. Social owns
its Activity/Event components; Journal's narrow map-preview change in
`social_profile_page.dart` is coordinated with Social. Backend additionally owns
the affected `tool/run_real_account_local*` launcher repair for this round.

Execution:

1. Confirm consumer interfaces and preserve account/session/permission fences.
2. Integrate exact delivered commits after ancestry and diff review; wire entry,
   detail, mutation/readback and return paths. Do not import undelivered branches.
3. Reuse module checks, run only composition/conflict/critical-route checks, and
   inspect affected phone-size/dynamic-text/reduced-motion surfaces.
4. Freeze the product commit, build one signed candidate if the existing signing
   path is available without exposing/copying secrets, and record version/hash/
   certificate. Any shared-runtime switch requires its own concrete approval.

Flutter commands use a single advisory lock at the local launch directory's
`flutter-validation.lock`; lock contention returns immediately for coordination.
APK/Gradle belongs to Integration only. Module delivery messages are exchanged
directly using the verified local roster, not inferred from document writes.

Integration reproduced and fixed covered Events callbacks duplicating detail
routes and authentication-invalid plan reads retaining old pages. Shared route
callbacks now check the active source path; explicit auth loss retires the plans
projection. Existing AI navigation and Profile-owned records follow the confirmed
22/23 October decisions; stale integration assertions were updated accordingly.

Assembly verification: the initial six-file batch passed 44/48. Its four stale
assertions were corrected against those decisions. A bounded follow-up passed
9/10 (two new record-builder routes and four auth-loss variants included); the
remaining lazy-viewport assertion was corrected and both pending-navigation
variants passed. Thus 54 distinct composition/access cases have final passing
evidence, not one uninterrupted 54-case run. The five device-language contract
and large-text checks passed earlier. Modules' narrower source/fixture evidence
is retained in their delivery notes; no complete-suite rerun is claimed.

Device-language tests confirm both application roots, acknowledged writes,
fresh-container restoration, failed-read availability and draft preservation.
AI pending navigation is confirmed only with synthetic transport. Real model
multi-round continuity, v24 intermittent AI settings reads, native restart,
phone fonts/keyboard/TalkBack, iOS compilation, shared-runtime switch and full
UAT remain unverified. The AI Chinese preview still has a fixture-only missing
heading glyph and is not counted as visual acceptance.

The signed candidate and final static-check result are recorded separately in
the v25 evidence note once the product source is frozen and the build verified.
