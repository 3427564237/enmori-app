# ENMORI v65 candidate — independent frontend review

Date: 12 November 2026 (Asia/Singapore). Reviewed checkout `/home/miku/.codex/worktrees/demo-ready-20261111/ENMORI`, HEAD `a3c6b544`.

Scope: read-only Flutter source review of Home, Events, Friends, own profile/preferences, recommendation profile and Check-in flows. Read AGENTS.md, skill routing, ARCHITECTURE.md and applicable decisions. Applied repository Flutter review and UI/UX guidance; targeted UX search matched “long waits unexplained”. No product files changed, no external writes, no adb actions, no live-account writes. Large-text mode and screen readers excluded as requested. Automated reproduction of F1 delegated to verification agent; this report does not claim physical reproduction.

## Findings

### F1 — P2: Recommendation profile can promise to discard a save that is already in flight

Classification: existing functionality defect; source-confirmed and independently reproduced in one offline synthetic widget probe. No physical/live write claim.

Steps: open Profile → Area, birthday & discovery; change Home area or a switch; Save; while the request is pending press Back; choose Discard. The page leaves, but the repository write continues and may commit. The dialog says “Discard unsaved changes?” without warning that the original save may still complete.

Evidence: `lib/features/recommendation_profile/presentation/recommendation_profile_page.dart:169–210` starts and awaits the mutation; `:321–345` gates navigation only on `_dirty`, never `_busy` or `_uncertain`, and permits Discard followed by Navigator.pop. After disposal, `:178–180` returns before provider invalidation/readback. No write cancellation is present in `data/backend_recommendation_profile_repository.dart:14–32`.

This also affects an uncertain save: `_uncertain=true` retains the same discard wording although the original outcome is unknown. Users cannot safely interpret Discard as “my new privacy/discovery settings did not apply”. Existing account preferences already block Back while busy (`lib/features/account/presentation/account_preferences_page.dart:824–833`), and Check-in warns that a pending save may still complete (`lib/features/check_in/presentation/check_in_page.dart:233–246`). Repair should give this existing flow equivalent truthful pending/unknown handling and retain an original-outcome read; no new product rule is needed.

Reproduction evidence from verification agent: `/tmp/enmori-audit-20261112/pending_save_discard_probe_test.dart`, `/tmp/enmori-audit-20261112/pending-save-discard-probe.log`. The fake saved Home area changed to null after the page was discarded. Probe result 1/1. An initial harness scrolling issue was fixed and is not counted as a product failure.

Authority: owner revision-checked recommendation profile and current settings in `docs/decisions/2026-10-28-li-event-profile-discovery.md:18`; no authority to silently cancel or claim rollback. The recommendation is to correct misleading state/navigation semantics, not to change visibility defaults.

### F2 — P2 usability: Approved multi-minute Event wait is represented by an unexplained bar

Classification: UI/UX gap, not evidence that the source is down or that its timeout is violated.

Current authorized budgets are provider 180 seconds, aggregate 210 seconds, client 225 seconds (`docs/decisions/2026-11-11-li-measured-onepa-wait-budget.md:7–11`), superseding 90/110/120. `lib/features/event_browse/data/backend_activity_repository.dart:111–119` uses 225 seconds. Initial load shows only a `LinearProgressIndicator` (`lib/features/event_participation/presentation/participation_events_page.dart:252–258`). Text explaining a search and the Stop action appear only when `_searching` is true (`:259–275`); initial load has `_searching=false`. Reload is disabled while busy (`:400–407`).

Parent root reports repeated physical v65 observations at ordinary font size with no visible loading-duration/status explanation and no cards, eventually followed by Ticketmaster available / onePA unavailable and actionable Ticketmaster cards. Those screenshots belong to root's evidence and should be linked in the consolidated report. Cross-tab observations are not a single continuous request timer: `app_router.dart:103–125` switches tabs with context.go, `event_participation_routes.dart:27–61` builds a new Events page, and `participation_events_page.dart:46–52` loads on every initState. The autoDispose controller retires old UI outcomes (`event_batches_controller.dart:11–14,44–47,157`), but this does not prove the network/server acquisition was cancelled. This source review explains the loading UI, not a measured backend duration.

Backend source locations supplied by acceptance reviewer: `backend/src/event-browse/infrastructure/combined-event-source.ts:70–102` awaits all provider outcomes, then builds/returns `:113–128`; `backend/src/event-browse/application/event-browse.ts:23–25` awaits the combined batch. A fast source therefore cannot produce early cards under the current response model. Do not change this to progressive/partial responses without reviewing contract authority.

Suggested scope: visible plain-language loading status suited to the permitted wait, a clear way to leave/return, and truthful outcome/retry feedback. Show only measurable progress, never a fabricated percentage or promised finish time. Backend acquisition changes need separate evidence and approval where applicable.

### F3 — P2 usability: Loading more makes all already loaded Event cards non-actionable

Classification: source-confirmed UX restriction; not a demonstrated contract violation. No physical reproduction claimed.

Steps: load an Event list, press Load more events, then try an already loaded card while the next page waits. `participation_events_page.dart:362–372` supplies `onSelect:null` whenever `state.busy`, including pagination. This can last through the same long read budget. Yet `event_batches_controller.dart:76–82` deliberately treats a loading-more snapshot as current (`!state.busy || state.loadingMore`), and `:143` marks `loadingMore:next`. The page therefore blocks a safe, already supported action more broadly than the controller requires.

Recommendation: during next-page loading, preserve authorized existing-card navigation under the controller's snapshot/freshness/session guard, while keeping duplicate paging requests blocked. First-page refresh remains a distinct state. Test stale/session replacement and expiry as well as the normal loading-more case before changing it.

### F4 — P2 usability: Home profile loading shifts the main Check-in target

Classification: source-confirmed layout cause, with current physical observation reported by root.

`lib/app/remote_social_composition.dart:256–282` returns SizedBox.shrink while the own-profile read is pending or failed; success inserts OwnProfileHeader with bottom padding. `lib/app/home_shell_page.dart:199–225` places that asynchronous header above Today and New Check-in. Parent's ordinary-font screenshots 14/15 show the Check-in target moving substantially after the header arrives. The exact coordinate delta is device-pixel evidence and should not be confused with logical Flutter pixels.

Recommendation: reserve a stable loading shape or keep the primary Check-in action in a stable position. Do not retain stale personal content across invalidated authority to mask the shift. This is a layout stabilization within existing behavior, not a new information hierarchy requirement.

### F5 — P3 optional optimization: Event controls dominate the top of the list

Classification: design proposal for review, not an unfinished mandatory requirement.

`participation_events_page.dart:148–249` places area, search, My plans, source description, four time filters and time order before results; categories and provider status follow at `:294–361`. On a compact phone the first real activity may require scrolling. Root should judge the current screenshots before recommending a layout change. Consider keeping primary search/time controls visible while moving less frequent sorting/source details into a compact filter section, preserving existing controls and source disclosures. No redesign or new business rules are implemented here.

### F6 — P3 optional optimization: Save-recovery dialog exposes raw booleans and area codes

Classification: copy/presentation improvement.

`recommendation_profile_page.dart:225–230` shows `true/false` (including Chinese locale) and a raw area code in the recovery comparison. This is the moment the user must decide whether to keep or replace settings, so localized On/Off labels and known area names would be easier to compare. Keep saved-versus-draft provenance explicit and preserve an unknown-code fallback.

## Source checks that did not yield a new finding

- Friends discovery card profile navigation is now explicitly approved and wired; old “cannot open a profile from discovery” evidence must not be reused as a current defect.
- Check-in composer and editor have dirty/pending leave handling; selected original-record draft copies remain separated from location/privacy fields.
- Event read failures and source availability remain distinguishable from genuine empty lists; current Events pagination preserves available rows after next-page failure.
- Friends list Next intentionally replaces the page and Reload restarts the current query under the approved FS05 contract. That behavior was not mislabeled as a new defect.
- No generic dependency, state-management, localization framework, deep-link, tablet or architecture requirements were inferred from a review checklist.

## Limits

No overall acceptance/release recommendation is made by this source review. A green analyzer/test suite does not establish connected-service readiness or physical-phone usability. Live AI, ordinary-account writes, two-device visibility and iOS need their own current evidence. The original 15-second target is not claimed, and the larger authorized timeout does not itself establish usability.
