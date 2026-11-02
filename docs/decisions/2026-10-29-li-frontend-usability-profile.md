# Frontend usability and Profile presentation — LI direction

Date: 29 October 2026 (Asia/Singapore). Authority: LI HOURUI, PM, explicit request in this chat.

## Authorized scope

Temporarily lower AI model integration and backend expansion priority. Inspect current source and rendered Home, Events, Friends, AI, Profile, registration, profile editing and settings. Fix demonstrated usability defects affecting discovery, navigation/back, truthful loading/error/empty/permission/save states, readable content and accessible interaction. Preserve accounts, drafts, settings and existing data; do not alter privacy, interests or participation to manufacture acceptance.

Redesign the existing own Profile within ENMORI's current visual language, drawing on the teacher's suggestion of recognizable circular icons and clear functional groups. Use icons with short text for existing working entry points. Separate identity, frequent functions and lower-frequency settings. Support large text, adequate touch targets, contrast and screen-reader labels. Do not add placeholder functions or expose private birthdays, location or unauthorized profile data. This records the PM's implementation direction; the reported teacher suggestion is not treated as a new formal Sponsor decision.

The implementation may reorganize presentation and connect existing destinations. Existing privacy, discovery, recommendation, account-save reconciliation and AI execution rules remain controlling. No new model, infrastructure, dependency, architecture or data-model scope is approved. Backend problems are recorded; only an authorized minimal correction directly blocking a necessary flow may be handled.

## Execution and evidence

Use GPT-6.1 Terra (max) for visual recognition, screenshots, computer use and device verification; GPT-6.1 Sol (xhigh) for bounded frontend implementation and checks; the main agent controls scope, integration and final review. One phone operator at a time, coordinated builds and installations, disjoint editing ownership. Distinguish source tests, APK metadata and actual device evidence, including unverified cases. Report before/after Profile presentation and remaining limitations.

## Preserved sources and scope of change

- `2026-09-02-ui-baseline-visual-acceptance-contract.md` and existing theme/architecture remain the baseline; this direction authorizes the bounded Profile presentation update, not a new application-wide design system.
- `2026-10-28-li-event-profile-discovery.md` remains authoritative for private birthday/home area, discovery and separate matching permissions.
- `2026-10-29-li-ordinary-account-companion.md` and v50 onboarding reconciliation remain unchanged; this round does not reopen AI/model delivery or widen acceptance.
- Candidate source starts at `ede0cc83` (latest local ordinary-account/v50 frontend evidence), not the older primary checkout. Existing uncommitted work and independent backend deployment branches are preserved.

This record does not claim UAT completion, Release readiness, a merge to main or approval of unrelated backlog items.

## Existing cloud entry reused after physical connectivity diagnosis

The physical starting installation was v50, despite the separate cloud handoff recording a previous v51 installation. The same phone on cellular could not open the legacy Tailscale HTTPS 8443 entry (`ERR_CONNECTION_CLOSED`), while the already-deployed Azure standard HTTPS entry returned the expected unauthenticated `AUTH_REQUIRED` body. This establishes an entry-specific connectivity difference, not the underlying network root cause.

Reuse the existing v51 signed cloud APK for the pre-redesign walkthrough and retain the exact Azure hostname/443 allowlist already approved in `2026-10-29-li-azure-backend-deployment.md` for the frontend candidate. That existing decision explicitly covers the corresponding client endpoint, same Firebase project and account data. No new backend deployment, hosting resource, model, consent, endpoint contract or worker change is introduced by this round. The legacy local endpoint remains allowed; there is no automatic endpoint fallback or request replay. Cloud AI/worker availability remains outside this round's claim.

### 30 October continuation: preserve installed-client compatibility

Before building the replacement for v51, source inspection found that the deployed Azure settings contract can include an already-saved `cloudAiConsent` value. The v50 strict parser rejects that response. Retain the existing v51 (`e057289`) client compatibility delta, its optional-consent recovery behavior, and truthful provenance display for already-saved messages, together with its existing tests and authority (`2026-10-28-li-cloud-consent-provenance.md`, `api/cloud-ai-processing-contract.md`). This is preservation of the previously approved and installed client behavior, not a new consent/data model, provider integration, model call, worker activation or backend deployment. Existing consent values are not changed during verification.
