# LI approved Event, recommendation profile and discovery integration

Date: 28 October 2026 (Asia/Singapore). Authority: LI HOURUI, PM.
Source: the human's explicit “PLEASE IMPLEMENT THIS PLAN” in this chat.

## Approved behavior

Integrate verified Ticketmaster and onePA public acquisition into Backend and Flutter for the existing classroom demonstration. Preserve Ticketmaster identities, use a separate onePA namespace, verify occurrence identity when enriching API records, display source/time/venue/cover/intro on cards and structured full details and important admission, pricing, deadline, status and accessibility information. Detail and booking links are distinct only when source-provided. Opening a provider never asserts registration or changes participation. Browser acquisition uses bounded Playwright/Chromium, ephemeral contexts, request coalescing and short memory lifetime; no retained copied catalogue or public redistribution expansion.

Use a versioned URA 2025 Singapore planning-area catalogue. Optional home area is account-synced; activity area is manual override, then foreground location (five-minute reuse), then home area, then Singapore-wide. Raw device coordinates stay on device. Location never overwrites home area. Foreground auto location is opt-in. Birthday is optional, private, editable and deletable; use civil age at event date for explicit source age rules and current civil age for friendship ranking, never infer age or event restrictions.

New independent discovery switch defaults off. Opt-in grants a minimal username/display-name/authorized-avatar card, not the full profile. Independent match grants cover interests, home region, affiliation and age. Preserve existing profile/field visibility and relationship exclusions; private participation remains protected. Withdrawing discovery or consent invalidates recommendations and minimal cards. Age alone cannot create friend eligibility.

Scoring v3: interests 4 each; Event visible friends 2 each capped at 10; Friend common events 2 each; same planning area 2, otherwise same broad region 1; same affiliation 1 for Friends; explicit target age match 1 for Events and age difference <=5 adds 1 for otherwise eligible Friends. Missing permitted factors are neutral; failed reads remain errors. Stable ordering and safe reasons required.

## Concrete implementation contract

Add owner-only GET/PUT `/v1/me/recommendation-profile`, revision checked, with nullable birthDate/homeAreaCode, autoActivityLocation, discoverable, match permissions, onboardingPromptSeen and revision. Store the separate projection in `accounts/{id}.recommendationProfile` so existing account deletion removes it and legacy Profile DTO stays unchanged. No raw location or birthday in public cards/logs/model input. Use existing authentication, error codes, PROFILE_INVALID/PROFILE_REVISION_PRECONDITION_FAILED and no-store responses. Discovery projection is read with current account state, not a persisted user directory. Add GET `/v1/users/:username/discovery-card` for current eligible minimal cards and explicit friendship actions.

Event summary/detail additions are optional for old records; add source metadata, full description/sections, source detail and booking URLs, time zone, source status, pricing, age constraints and standard area. Existing callers remain valid. Add optional activityAreaCode to Event recommendation reads. Extend safe reason enum and formula version to v3. Versioned catalogue is bundled locally; no geocoding platform. Implement the approved browser dependency at a verified pinned release.

## Supersession and unchanged authority

Retain `2026-09-01-deterministic-v1-recommendation-formulas.md`, `2026-09-01-recommendation-ai-field-allowlists.md`, `2026-10-25-li-recommendation-completion.md`, `2026-09-25-sprint3-event-source-priority.md`, `2026-10-15-li-real-event-contract-selection.md`, and `api/event-detail-presentation-contract.md` as history. This decision replaces their affected API-only/Ticketmaster-only presentation, free-text-region/no-age-input, public-profile-required discovery and v1/v2 scoring restrictions with the behavior above. It does not claim a new Sponsor decision, waive provider obligations, expose private content, enable background tracking, purchase/register, introduce notifications, or change AI/cloud deployment.

Normal registration/social initialization must be regression-tested through the actual runtime wrapper. No allegation about a teammate's account is established by source inspection. Test fixtures, real service, APK and physical device results are separate evidence layers.

## Compatibility implementation detail

28 October implementation audit found that installed v40/v41 clients reject the new identifiers, formula and additional fields. Within the approved compatibility scope, new reads opt into the v3 representation using `X-ENMORI-Contract-Version: 3`. Absent capability keeps a bounded legacy representation and v2 scoring of current authorized signals; it does not bypass opt-in, consent, age restrictions or privacy. Full onePA/detail/minimal-card functionality requires the new APK. The first candidate runtime was rolled back before the compatibility change; exact deployment receipts record subsequent switching.
