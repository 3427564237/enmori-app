# Shared UI/UX increment — 20 October 2026 SGT

## Source and isolation

Fetched origin at task start. Actual base: `900ca6fcdefb77e9aa95d96fa80994ebf826398f`, matching the live head of Draft #162, `souma/li-shi-du-integration-20261020`. Worktree: `/home/miku/.codex/worktrees/uiux-consistency-20261020/ENMORI`; branch: `souma/uiux-consistency-20261020`. This increment is reviewed against that integration branch, not its cumulative diff against main.

Authority: [this task's PM authorization](../../../decisions/2026-10-20-li-shared-uiux-increment.md), [core feature decision](../../../decisions/2026-10-19-li-core-feature-delivery.md), [AI context limitation](../../../decisions/2026-10-19-li-ai-mvp-simplification.md), [existing UI baseline](../../../planning/local-ui-handoff-oct19/ui-baseline.md), [HCI source receipt](../2026-10-19-hci-handoff/review.md), AGENTS.md and ARCHITECTURE.md. HCI `7848b5a` is already inherited; no re-import.

Read live #162, open PR list and #44, plus the current owner prompts. SHI retains Events participation persistence/pagination and external-return integration; JIN retains Friend/profile permissions, maps/weather and ignore/Undo; ZHOU retains Persona and AI continuation; DU retains account/record recovery and unsaved exits. Their prompts establish assigned scope, not a claim that every owner has started or finished. No teammate message or new assignment was sent.

## Findings and bounded changes

| Check | Baseline observation | This increment / remaining boundary |
| --- | --- | --- |
| Navigation and return | Approved Home/Friends/Events/AI/Profile navigation, guarded callbacks and existing DU exit guards already exist. Home AI/Footprint tiles show chevrons even with null callbacks. | Null-callback Home tiles now disable interaction, remove the chevron and explain availability. Existing tab selection, router guards, system Back and exit confirmations are retained. |
| Information hierarchy | Social Home has a large hero, a decorative discovery icon and vague shortcut names. | Smaller Playfair hero; direct “AI conversation” / “Footprint” labels under “Your space”; full-width secondary actions and semantic secondary text colors. No new destinations. |
| Action discoverability | Some disabled optional actions have no reason. | Missing Browse/Persona/Interests callbacks receive visible unavailable copy; Settings tooltip also reflects absence. Existing required recommendation and Check-in callbacks remain unchanged. |
| Truthful capability copy | Home says “active Persona and saved Notes”, while the approved current AI composition excludes automatic Note text. | Removes the saved-Notes claim. No AI context or consent logic changes. |
| Form feedback | Shared normal/focus input borders are explicit, error/focused-error styles fall back to SDK defaults; helper text can be compressed. | Explicit error borders keep the same 14dp shape and 2dp focus indication; multiline helper text. Validation, save, conflict, draft and submit rules stay in feature owners' code. |
| Loading / empty / failure | Startup is only a spinner; root blocked states lack hierarchy. Recommendations use a separate 8dp panel; browse uses bare text. | One small `StatusPanel` used by root pages and two Event features: labeled progress, title/body, neutral empty state, error icon and existing recovery actions. It owns no state or request. |
| Visual consistency | Deep green, warm paper, local Playfair and main buttons already shared; ElevatedButton and TextButton shape not fully covered. | Extend existing ThemeData only. Preserve local font/license, body sans-serif, 20dp cards and 48dp minimum buttons. No dependency, dark-mode platform or design-system framework added. |

Only the two Event **view** files consume the shared panel. Their controllers, lifecycle clearing, snapshot guards, source disclosures, exact recommendation empty copy, retry/reload callbacks and repository/API contracts are unchanged. The new core widget is actually shared by two features, satisfying the architecture reuse boundary. No other owner's feature implementation is rewritten.

## Capability inventory at the base

This is a source/handoff inventory, not fresh connected acceptance.

| Category | Evidence and current boundary |
| --- | --- |
| Implemented and connected in an existing candidate | Account sign-in/onboarding, Profile/Settings/Interests and bounded Check-in readback have attributed v8 native evidence in #162 and `2026-10-20-real-account-native/verification.md`. Those results belong to source `f3c733a`, not this new UI commit. |
| Implemented UI, composition-dependent | Home callbacks expose only supplied destinations. Manual Ticketmaster browse/detail and recommendation views have actual repository boundaries, loading/empty/failure/reload states and route tests. Availability still depends on the selected composition/provider and real data. |
| Implemented components, pending connection/completion | SHI's EventCard / ExternalRegistrationAction are in the base; persistence, participants pagination and full cross-page state remain assigned to SHI. They are not presented as completed by this visual change. |
| Missing portions assigned to owners | Full Persona fields/independent preview/history work (ZHOU); Friend projections, ignore/restore/Undo and map/weather integration (JIN); remaining account/record recovery (DU), according to current handoffs. No placeholder success/data added here. |
| Known integration-data issue | #162 reports a legacy synthetic Community recommendation on the existing real-account candidate. This PR neither changes service data nor guesses provenance from event titles. Replacing/removing that fixture in the actual connected composition remains the integration owner's work; it is not an accepted real recommendation. |

Configuration-unavailable and account-blocked root screens still have no new recovery command: the router supplied none, and inventing sign-out/setup behavior would go beyond this presentation change. They now have clear separate headings. Full availability gating of each bottom tab across every incomplete composition remains an integration concern; null Home callbacks alone do not certify all route compositions.

## Verification

Pinned local Flutter 3.47.2, resolved existing lockfile with `flutter pub get --offline`; no dependency/version change. No APK/build, emulator, phone, Firebase, Ollama, email or host business-service operation.

Commands below used `/home/miku/fvm/versions/3.47.2/bin/` executables:

1. `flutter test --no-pub test/app/shared_uiux_test.dart test/app/home_event_navigation_test.dart test/app/activity_shared_router_test.dart test/features/event_recommendations_page_test.dart --reporter expanded`: **28 passed, 1 failed** initially. Recommendation Retry was at y=620 outside the test's 800×600 viewport after the panel grew. The test tapped without scrolling. Added `ensureVisible`, settle and a hit-test assertion before the same callback/count assertion; no ignored warning or changed business expectation.
2. `flutter test --no-pub test/app/shared_uiux_test.dart test/features/event_recommendations_page_test.dart test/features/rmvp01a_r6_pages_test.dart --reporter expanded`: **30/30 passed**. Includes the corrected retry test, exact Q16 empty copy, retained registration/Check-in validation, draft/exit and recovery cases. Optional widget capture enabled for the new tests.
3. Visual inspection prompted smaller Home/status headings. After those presentation adjustments, `flutter test --no-pub test/app/shared_uiux_test.dart --reporter expanded`: **6/6 passed** with final captures. These repeated six cases are not additional independent coverage. A final disabled-description color refinement was checked with the single `unwired Home shortcuts` case and its refreshed image (1/1); disabled Material ListTile styling otherwise overrides subtitle defaults, so the explanatory Text receives the explicit semantic color.

Across these runs there are **47 distinct cases**, not the sum of all run totals: shared UI 6, recommendation 6, Home/Event return 4, activity router 13 and existing R6 pages 18. Router cases were not repeated after typography-only edits. Test doubles are isolated evidence, not real service success.

The new shared checks exercise portrait 375×667 and landscape 667×375 at 1.3 text scale, scrolling to each Home action, selected-tab no-op, callback dispatch, unavailable shortcut affordances, waiting versus error/configuration states, manual retry, and input/error correction. The form preview is a synthetic component validation example, not a new product Display Name rule. Existing R6 tests retain their inherited bounds without adding a new specialist test matrix.

Targeted Dart analysis: no issues on the eight changed Dart files; format: eight files, zero changes; `git diff --check`: pass. Final remote-base readback remained `900ca6fcdefb77e9aa95d96fa80994ebf826398f`. Native keyboard/system Back, actual screen-reader behavior, all-device layout, final real-provider composition and combined APK remain **Not Run** here. No whole-product/UAT/Release/Done claim; distinct-author review remains pending.

## Visual review

Actual Flutter widget renders, local Playfair/Material Icons and SDK Roboto, 1.3 text scale. These are isolated widget previews with callbacks/fakes, not phone screenshots or real records. No invented activity/person data is shown. The plain form is explicitly a component preview.

| Preview | What to inspect |
| --- | --- |
| [Home portrait](previews/home-375.png) / [landscape](previews/home-667.png) | Brand/type hierarchy, Check-in entry and fixed navigation; lower content scrolls. |
| [Home actions](previews/home-actions-375.png) / [landscape actions](previews/home-actions-667.png) | AI/Footprint labels and reachable secondary actions. |
| [Unavailable shortcuts](previews/home-unavailable.png) | Explanation instead of a false chevron/action. |
| [Startup](previews/startup.png) / [service error](previews/service-error.png) | Named waiting state versus manual retry. |
| [Empty and error](previews/empty-and-error.png) / [form error](previews/form-error.png) | Consistent status shape, text feedback and error focus border. |

## Integration handoff

Consume the independent Draft PR against the recorded base. No new route/bootstrap injection, API, storage migration or environment config is required. Both `EnmoriApp` and `ControlledDemoApp` already use the shared theme. Keep SHI's incoming Event view edits when resolving the two small presentation overlaps; reuse `StatusPanel` without replacing their state machines. DU remains the separate reviewer for LI-authored code. The original integration conversation owns final connected/native checks and any pending product choices.
