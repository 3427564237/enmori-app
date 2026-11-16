# Profile and Home density refinement

Authority: [LI's approval of items 1 and 2](../../decisions/2026-11-17-li-profile-home-density.md). Branch: `souma/profile-home-density-20261117`. Base: `dbde9e4a` (v73 physical-device evidence).

## Delivered behavior

- Profile uses the existing compact identity header, smaller card padding and a readable, untruncated biography. Identity, affiliation, region, audience explanation and avatar access remain available.
- Check-in History and Footprint use compact labelled buttons. Buttons sharing a row have equal height even when one label wraps; available width and text scale still determine the number of columns.
- Interests retains its contextual edit action and return/readback behavior. Profile, discovery, privacy and Persona destinations use full-width list rows with the existing callbacks and session guards.
- Home places the smaller Today heading and full date on one line when they fit, and wraps them at narrow widths or larger text sizes. Reduced padding moves the primary action and following content upwards.
- Empty-weather failures show one concise status with the actual cause and an explicit Retry weather action. Check-in-specific “continue without location” wording is not repeated on Home. A one-time weather retry still requires the existing consent choice; it never enables automatic weather implicitly. Loaded weather retains source, licence, normalization notice, observation time and prior data on a failed refresh.
- Profile and weather loading, success, failure, clearing and scrolling do not move the Check-in action relative to its introduction container.

## Actual Flutter renders

The images are raster captures of **production Flutter widgets with synthetic repositories**, not design mockups or phone screenshots. They use the actual Home composition and Profile page, rendered at 2 pixels per logical pixel. Roboto, Material Icons, Playfair Display and a test-only CJK fallback are loaded. Device fonts, safe areas and system UI may differ.

The `before` images were captured from the unchanged v73 production widgets on 17 November, before this implementation. Matching `before` / `after` filenames use the same synthetic data and viewport. Additional `after` states include full profile details/Persona and location-failure recovery.

| Surface, 375 × 812 | Before | After |
| --- | --- | --- |
| Home, English | [Before](before/home-en-phone.png) | [After](after/home-en-phone.png) |
| Profile, English | [Before](before/profile-en-phone.png) | [After](after/profile-en-phone.png) |
| Home, Chinese | [Before](before/home-zh-phone.png) | [After](after/home-zh-phone.png) |
| Profile, Chinese | [Before](before/profile-zh-phone.png) | [After](after/profile-zh-phone.png) |

Additional inspected captures:

- [Narrow Profile](after/profile-en-narrow.png), [large-text settings](after/profile-interests-zh-large-text.png), [landscape Profile](after/profile-interests-en-landscape.png).
- [Complete Profile](after/profile-complete-en.png), [all four settings including Persona](after/profile-settings-zh.png).
- [Large-text Home](after/home-zh-large-text.png), [location off with automatic weather](after/home-location-off-en-auto-true.png), [optional weather](after/home-weather-off-empty-day.png), [failed refresh retaining prior weather](after/home-weather-failed.png).

## Verification

Visual review reproduced an 8dp height mismatch between the narrow English shortcuts (64dp History vs 56dp Footprint). A failing captured-font regression confirmed it. Equal-height layout within each shortcut row fixed it; the final viewport checks verify both normal wrapping and larger-text stacking. The landscape test explicitly scrolls to lazy shortcut content before measuring it.

The captured-font checks cover English/Chinese, 375/320 portrait, 812 landscape and normal/2x text. Existing long-identity checks cover 2.4x text. Interaction coverage includes seven Profile destinations and return routes, interest readback, audience explanation, minimum 48dp targets, Home scroll retention, weather consent/refusal, failure/retry recovery, unchanged preferences, and the stable primary Check-in action. Existing full-router tests exercise actual recommendation-profile navigation and both app-bar/system Back.

See [verification.json](verification.json) for final command outcomes, source hashes and raster hashes. Test runs overlap; counts must not be added.

Final results: all **1,809 Flutter tests passed** (exit 0). The separate captured-font layout/interaction run passed **26 tests** (exit 0), and static analysis reported **no issues**. All 43 final PNGs were generated successfully; `git diff --check` passed and dependency files were unchanged.

## Scope and evidence boundary

No connected Android device was detected at this round's initial or final check. This increment has no new APK, physical-device acceptance, backend deployment, remote publication or full-UAT claim. Existing login, interests, settings and records were not changed for these synthetic checks. The v73 phone receipt remains historical evidence for v73 only.

Recommendation loading and activity-card density (proposal items 3 and 4) were not included. Dependencies, data models, service access and weather consent/refresh rules remain unchanged.
