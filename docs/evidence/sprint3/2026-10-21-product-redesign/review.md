# Product redesign review packet — 21 Oct 2026

This is a source/UI candidate for LI integration review. It is not APK, device, provider, Firebase Emulator, UAT or Release acceptance.

Authority: [S-PM-1021-LI-PRODUCT-UI-DEFAULTS](../../../decisions/2026-10-21-li-product-ui-redesign-and-defaults.md), with the map/default ownership clarification in integration base `e1cd9c6`. New branch `souma/uiux-product-redesign-20261021` targets `souma/li-zhou-runtime-20261020`; prior merged PR #168 is not reused. [Design direction and source trail](design.md); [minimal field contract](../../../../api/check-in-defaults-and-place-label-contract.md).

## Actual Flutter previews

Production widgets rendered with synthetic fixtures, bundled Playfair and locally installed Roboto/Material icons. No real user content, real Event, live AI generation, map tile network or private QQ screenshot is included. Home fixture omits the optional friend activity section; Profile fixture omits participation. Their real composition remains in the app. Disabled preview actions reflect supplied fixture callbacks/state, not additional product permissions.

| Page | 375 × 812, normal text | 812 × 375, 2× text |
|---|---|---|
| Home | [Phone](home-phone.png) | [Landscape](home-landscape-2x.png) |
| Check-in | [Phone](check-in-phone.png) | [Landscape](check-in-landscape-2x.png) |
| Events | [Phone](events-phone.png) | [Landscape](events-landscape-2x.png) |
| Profile | [Phone](profile-phone.png) | [Landscape](profile-landscape-2x.png) |
| AI pending reply | [Phone](chat-pending-phone.png) | [Landscape](chat-pending-landscape-2x.png) |

Images are captured at 2× raster resolution. Landscape/large text deliberately scrolls; it is not expected to show every action in one viewport. The preview test checks the Check-in Save action remains reachable. Visual inspection corrected the composer vertical centering, Profile interest-row overflow, duplicate Events heading and unnecessary unknown-end copy. Five primary previews preceded secondary-page completion; these are the final regenerated copies.

## Page-by-page disposition

| Surface | Final change / retained behavior | Evidence or boundary |
|---|---|---|
| Home | Compact Today/Check-in, one Events section and one manual Browse all; personal shortcuts below. Existing friend activity composition retained. | Connected authenticated mock-HTTP Home → Events → detail → Interested → return/readback; consent-independent manual browse preserved. Legacy non-social recommendation route retains its existing See all. |
| Composer | Input first; custom Mood/Location/Activity pills; one permissions row/sheet. Portrait six input lines, short landscape three. | Custom labels, inherited friends-only visibility, one default GPS call, per-draft removal and save checked. Label-only draft Back also asks before discard. |
| Default preferences | Independent explicit saved location/weather defaults, old-account false, current settings revision; no historical rewrite. | Backend repository recreation, old-writer omission, malformed input and stale writes; UI Save → independent read → reopen/revoke. |
| GPS/weather | One current foreground observation per new draft; OS permission retained; default-weather alone does not request GPS. | Late GPS discarded on changed settings/session/clear. Pending settings completion while backgrounded starts no GPS and resume does not retry. Real OS/provider behavior remains device validation. |
| Saved/edit record | Manual place name displayed separately from GPS; editable/clearable; exact record read and version recovery retained. | Create/read/replay, edit omission/preservation/null clearing, same-key conflict, invalid atomic rejection. Save uncertainty retains exact request. |
| History/calendar | Compact consistent gutter and shared record treatment; existing date grouping and source IDs retained. | Existing calendar/history routing and record tests. No new calendar behavior. |
| Footprint/friend map | Numbered true-coordinate points and chronological lines; tap within a 100 m visual neighbourhood opens a chronological chooser when multiple records overlap. List fallback remains. | Coincident-point test selects the intended earliest record by stable ID; no coordinate jitter or new location authorization. JIN cache/auth work not duplicated. |
| Events list | Filter chips, deliberate category placeholder, title/time/place hierarchy, detail action, next-batch state and toolbar refresh. | No cover URL exists in current DTO, so no fabricated image or extra field. Unknown totals/end times are not invented. |
| Event detail/participants | Event facts then participation/source action; participant rows with avatar initials and chevrons. | Save/readback and source-action tests; source disclosure and source-open-vs-registration distinction retained. |
| AI | Visible new-conversation icon, drawer history/current Persona/management/AI settings; shared navigation and message recovery retained. | Draft discard/keep, uncertain request checks, stale history identity and keyboard tests. Active Persona reads the existing collection, never creates or generates one. |
| AI settings | Shared existing data-use consent plus AI safety/Persona entry; general profile/default controls hidden. | Existing shared consent scope is explicit. Profile still owns full account settings. No extra AI setting or model request added. |
| Own Profile | Identity, BIO, interests, records/Footprint, participation; edit/settings in toolbar; errors retry in place. | Save/reread, inactive interest labels, large-text wrapping, existing participation callback. |
| Friends/search/requests | Search-first list, toolbar refresh and consistent spacing/status rows. | Existing request acceptance, ignored-user and privacy semantics retained. No standalone notification backend/page exists in this checkout; friend requests remain in the existing hub. |
| Other-user profile | Avatar/identity hierarchy and manual place label only from authorized server projection. | Social projection test hides label when location field is private; GPS still requires map sharing. |
| Sign-in/registration | Concise branded heading, top-aligned form and consistent gutter. | Validation/retained inputs and registration/signout route tests. No auth API change. |
| Onboarding/interests/privacy | Form-first layout, consistent spacing, existing choice/dirty/reload states retained. | Existing Save/reload/session-replacement paths; no new required fields. |
| Persona manage/edit/preview | More compact sections and shared status styling; personal expression fields grouped. | Existing field preservation, preview isolation, explicit activation/delete, pending/stale/session replacement, small/large-text tests pass. |
| Ignored/empty/error states | Shared chips, rows and compact StatusPanel; existing dedicated actions retained where already clear. | No extra notification, recommendation or Admin behavior inferred. ZHOU Admin work is outside this branch. |

## Motion and skill

SDK-only state feedback (`AnimatedSwitcher`, 160 ms / zero for reduced motion), Material drawer/navigation and sheets; custom sheets honor `disableAnimations`. No new runtime package, custom animation controller or repeating decoration. Device frame timing was not measured.

Personal skill `flutter-motion-engineering` installed from `ariaramin/flutter-skills` at `33586d6e67912a7fbaf731d3b3e1fc018b625154`, MIT, after source/license inspection; available to the next Codex turn. Installation does not change repository dependencies. See [provenance](design.md#skill-provenance).

## Validation and handoff

Flutter 3.47.2 / Dart 3.13.2; backend Node 24.19.0, pnpm 11.19.0, TypeScript 7.0.2. Dependency versions unchanged. Shell Node 26 / fallback pnpm 11.25 were rejected by the project's engine check; the installed pinned toolchain was used successfully.

- `fvm flutter analyze --no-pub`: no issues.
- Initial Flutter focused run: 202 passed / 12 failed. Two Profile layout overflows and old selectors/labels/navigation expectations were corrected; affected subset: 128 passed. Later defaults/map tests: 37 passed.
- Additional page/router run: 34 passed / 4 failed on old Events/Check-in entry expectations. Updated tests exercise the actual new routes; these failures are superseded by the successful focused reruns below.
- Final review batch (controlled app, Event preview, five-page raster/large-text preview, Settings): 32 passed.
- Persona/page and connected-journey batch: 54 passed / 1 failed because the new test used an invalid paused → resumed lifecycle transition. Fixed the test to emit hidden/inactive; the final connected-journey suite passes all 3, including the background-read regression.
- Legacy recommendation navigation/source-expiry batch: 18 passed / 1 stale test selector. The expired-state Refresh key already existed at base; test corrected to assert no automatic request, then explicit refresh/readback. See final expiry result in `validation.txt`.
- Backend strict TypeScript build: passed. Initial selected domain/repository/HTTP/OpenAPI batch: 67 passed / 1 schema-description mismatch. Removed schema drift; exact transport/OpenAPI rerun: 2 passed. Social privacy: 10 passed. Create/edit/manual-label final suite: 7 passed.
- `git diff --check`: passed. No full-suite aggregate is claimed; batches overlap. [Selected final outputs](validation.txt) preserve commands and run outcomes.

The five-page previews and fake-port/mock-HTTP journeys demonstrate source behavior and rendering. Firebase Emulator integration, actual database migration/readback, real OS permission prompts/GPS/weather, real model generation, APK installation and physical-phone UX remain **Not Run in this worktree**. The PM task assigns final host/APK/device work to the main integration chat. Before acceptance, LI should check saved defaults across app reopen; permission rejection and settings revocation; manual place vs GPS display; same/near point chooser; AI drawer/history/settings; and primary actions on the same signed phone candidate. No main merge, public deployment or real-user mutation was performed.
