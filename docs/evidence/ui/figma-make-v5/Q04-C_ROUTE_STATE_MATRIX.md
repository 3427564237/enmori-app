# Q04-C route/state inventory and initial visual-acceptance mapping

- **Status:** Analysis/evidence population only; not an approved Q04 decision
- **Population date:** 2026-09-02
- **Source:** Retained Figma Make export with SHA-256 `9ffee1e2c6879f438c96737c9a61dbbc55493cf5e94f55a1eeadeb9462e63f00`
- **Governing structure:** Q04-C in [`../../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md`](../../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md)
- **Route coverage:** 42/42 exported route identifiers inventoried
- **Version 5 evidence verification:** Pending
- **Maximum readiness assigned here:** `Authority/Deviation Blocked` or `Evidence Pending`
- **Approved disposition overlay:** [`../../../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md`](../../../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md) records Q04-D's approved conservative disposition corrections. This file preserves the original pre-Q04-D population for audit traceability; Q04-D governs subsequent use.

This document inventories and maps evidence. It does not approve the resulting screen set, create or change product/Release scope, approve a new deviation, or provide 42 detailed visual specifications.

## Population summary

| Measure | Count |
|---|---:|
| Exported routes covered | 42/42 |
| `Release In Scope` route dispositions | 37 |
| `Project Scope — Deferred` route dispositions | 0 |
| `Prototype Evidence Only` route dispositions | 1 |
| `Pending Authority` route dispositions | 4 |
| `Explicitly Excluded` route dispositions | 0 |
| Canonical user-facing production surfaces | 29 |
| Material non-route-state groups | 38 |
| Initial matrix rows | 29 |
| Initial shared-pattern records | 12 |
| Newly discovered numbered deviation candidates | 9 |

`Release In Scope` records an applicable authoritative capability boundary; it is not a Ready finding and does not approve every field, action, state, copy item, or prototype transition inside the route.

## 42-route inventory

`Candidate` means a newly identified numbered deviation proposal that has not been approved. Existing Q04-DEV-01 through Q04-DEV-13 retain their approved status.

| # | Exported route | Feature family | Production disposition | Governing authority / blocker | Matrix ID(s) | Applicable deviations | Evidence/audit status |
|---:|---|---|---|---|---|---|---|
| 1 | `login` | Auth | Release In Scope | S-PM-0901-SCOPE core user entry; S-BR4/S-BR5 email/password | M01 | DEV-01 | Source inspected; capture/provenance Pending |
| 2 | `register` | Auth/onboarding | Release In Scope | S-PM-0901-SCOPE core user entry; S-BR1/S-BR4; Q18 requires Username during onboarding | M02 | DEV-02; candidate DEV-15 | Source inspected; capture/provenance Pending |
| 3 | `verify` | Auth/onboarding | Pending Authority | Account creation is in scope, but no reviewed authority establishes this six-digit email-verification workflow, resend/expiry semantics, or demo code | M02 | DEV-02 | Authority and capture Pending |
| 4 | `reg-complete` | Auth/onboarding | Release In Scope | Completion state supports the approved core user-entry flow; exact copy/navigation remains Q04 evidence | M02 | DEV-03 | Source inspected; capture/provenance Pending |
| 5 | `forgot-password` | Auth | Prototype Evidence Only | Q04-DEV-02 records no approved production recovery contract | M03 | DEV-02 | Production authority absent |
| 6 | `profile-setup` | Profile onboarding | Release In Scope | S-PM-0901-SCOPE profile flow; authority for DOB/age-group/region/school fields and their visibility/use is not established by the reviewed decisions | M04 | DEV-08, DEV-09, DEV-11, DEV-12 | Local-field authority blocked; capture Pending |
| 7 | `interest-setup` | Interests/onboarding | Release In Scope | S-PM-0901-SCOPE; S-BR1; S-PM-0902-Q12. Authority for forcing at least one Interest at onboarding is not established | M05 | DEV-11, DEV-12 | Minimum-one rule Pending; capture Pending |
| 8 | `data-consent` | Consent/onboarding | Release In Scope | S-PM-0901-SCOPE; S-BR45/S-KD5 initial consent flow; use copy governed by Q17 | M06 | DEV-09 | Source inspected; capture Pending |
| 9 | `less-personalised` | Consent/onboarding | Release In Scope | S-BR45/S-KD5 permit continued entry after rejection; exact reduced-mode presentation remains visual evidence | M06 | DEV-09, DEV-11 | Source inspected; capture Pending |
| 10 | `home` | Home | Release In Scope | S-PM-0901-SCOPE and S-BR45/S-KD5 core Home/Top-2 modules | M08, M09, M14, M15 | DEV-06–DEV-09, DEV-11–DEV-13; candidates DEV-21/DEV-22 | Source inspected; deviation/capture blocked |
| 11 | `home-limited` | Home | Release In Scope | Approved continued entry after consent rejection; module semantics still follow Q03/Q16/Q17 | M08, M09, M14, M15 | DEV-07, DEV-09, DEV-11; candidate DEV-22 | Source inspected; deviation/capture blocked |
| 12 | `people-list` | Friend Recommendation | Release In Scope | S-PM-0901-SCOPE Must; Q03/Q16/Q17 | M09 | DEV-08, DEV-11, DEV-12; candidate DEV-22 | Source inspected; deviation/capture blocked |
| 13 | `public-profile` | Friends/profile | Release In Scope | S-BR3/S-BR45 profile visibility; Q18 lookup itself grants no Profile authority | M11 | DEV-04, DEV-06, DEV-08, DEV-10–DEV-13; candidate DEV-16 | Projection/action conflicts and capture Pending |
| 14 | `friend-request-sent` | Friend Request | Release In Scope | S-BR3/S-BR45 and Q18 send semantics | M12 | DEV-03, DEV-11 | Source inspected; capture Pending |
| 15 | `friend-requests` | Friend Request | Release In Scope | S-BR3/S-BR45 and Q18 receive/accept/decline | M12 | DEV-11, DEV-12 | Source inspected; protected states/capture Pending |
| 16 | `friend-accepted` | Friend Request | Release In Scope | Q18 acceptance creates Friendship | M12 | DEV-03, DEV-11 | Source inspected; capture Pending |
| 17 | `friend-declined` | Friend Request | Release In Scope | Q18 decline creates no Friendship | M12 | DEV-03, DEV-11 | Source inspected; capture Pending |
| 18 | `friends-page` | Friends | Release In Scope | S-BR3/S-BR45/S-KD5; Search My Friends and Special Care approved | M13 | DEV-04, DEV-11, DEV-12 | Source inspected; capture Pending |
| 19 | `events-list` | Events/Recommendation | Release In Scope | S-PM-0901-SCOPE core Event flow and Event Recommendation Must | M15 | DEV-07, DEV-11–DEV-13; candidate DEV-22 | Source inspected; deviation/capture blocked |
| 20 | `event-detail` | Events | Release In Scope | S-BR2/S-BR3/S-BR45/S-KD5 Event details, Interested/Going, external link | M16, M18 | DEV-04, DEV-06, DEV-11–DEV-13 | Source inspected; capture Pending |
| 21 | `interested-people` | Event participation | Release In Scope | PROJECT_CONTEXT §3 explicitly records permission-filtered Interested people | M17 | DEV-11–DEV-13 | Source inspected; capture/privacy evidence Pending |
| 22 | `going-people` | Event participation | Pending Authority | Going state is approved, but reviewed authority does not establish a user-visible Going-people directory or its identity/count exposure | M17 | DEV-11–DEV-13 | Scope/visibility authority Pending |
| 23 | `event-status-saved` | Event state outcome | Release In Scope | Approved Interested/Going state mutations; exact standalone outcome presentation is visual evidence | M16, M18 | DEV-04, DEV-11–DEV-13 | Source inspected; capture Pending |
| 24 | `checkin` | Check-in | Release In Scope | S-PM-0901-SCOPE core Check-in; S-PM-0831 C3; Q13 Weather | M19 | DEV-06, DEV-09, DEV-11, DEV-12; candidate DEV-21 | Weather/authority conflict and capture Pending |
| 25 | `checkin-success` | Check-in | Release In Scope | Successful Check-in outcome supports approved core flow; Q13 fallback notice applies | M20 | DEV-05, DEV-06, DEV-11; candidate DEV-21 | Missing fallback evidence; capture Pending |
| 26 | `checkin-timeline` | Footprint | Release In Scope | S-PM-0901-SCOPE; S-PM-0831 C5 renames/corrects to Footprint | M21 | DEV-05, DEV-06, DEV-10–DEV-12 | Source inspected; capture Pending |
| 27 | `checkin-calendar` | Calendar | Release In Scope | S-PM-0901-SCOPE; S-PM-0831 C4 | M22 | DEV-06, DEV-11, DEV-12 | Source inspected; capture Pending |
| 28 | `checkin-edit` | Check-in | Pending Authority | Reviewed current scope explicitly establishes create/delete and history; an Edit Check-in lifecycle contract was not found | M19 | DEV-06, DEV-09, DEV-11, DEV-12; candidate DEV-21 | Scope/lifecycle authority Pending |
| 29 | `ai-customize` | Persona | Release In Scope | S-PM-0901-SCOPE Persona selection/activation Must; Q19 field/projection boundary | M23 | DEV-09, DEV-11; candidate DEV-17 | Persona field/projection conflict and capture Pending |
| 30 | `ai-assistant` | AI | Release In Scope | S-PM-0901-SCOPE AI Assistant Must; Q17/Q19/Q31 | M26 | DEV-06, DEV-07, DEV-09, DEV-11; candidate DEV-17 | Required failure/deletion states absent; capture Pending |
| 31 | `ai-safety` | AI | Pending Authority | AI safety requirements are authoritative, but no reviewed authority requires a separate user-facing AI Safety screen or this content/navigation | M27 | DEV-11 | Surface authority and capture Pending |
| 32 | `ai-limited` | AI/consent | Release In Scope | Continued bounded use after consent rejection is supported; exact presentation/copy remains Q04/UI work | M26 | DEV-09, DEV-11 | Required operational states/capture Pending |
| 33 | `own-profile` | Profile | Release In Scope | S-PM-0901-SCOPE profile/history entry; S-PM-0831 naming/positioning | M28 | DEV-03, DEV-05, DEV-10–DEV-12; candidate DEV-15 | Local conflict/capture Pending |
| 34 | `privacy-settings` | Privacy | Release In Scope | S-PM-0901-SCOPE; S-BR45/S-KD5 privacy controls | M29 | DEV-03, DEV-10–DEV-12 | Route-map/field-level acceptance and capture Pending |
| 35 | `consent-settings` | Consent | Release In Scope | S-PM-0901-SCOPE; Q17 purpose allowlists | M29 | DEV-07, DEV-09 | Copy/state acceptance and capture Pending |
| 36 | `profile-edit` | Profile/interests | Release In Scope | S-PM-0901-SCOPE; Q12 catalogues; Q18 immutable Username | M28 | DEV-09, DEV-11, DEV-12; candidate DEV-15 | Username/field authority conflict and capture Pending |
| 37 | `first-time-privacy` | Privacy/onboarding | Release In Scope | S-BR45/S-KD5: Accept→Public, Reject→Private, both enter app; Friends-only later | M07 | DEV-03 | Source inspected; capture Pending |
| 38 | `reg-check` | External registration | Release In Scope | S-BR45/S-KD5 return Yes/No confirmation and Going update | M18 | DEV-03, DEV-04, DEV-11 | Source inspected; capture Pending |
| 39 | `friends-activity` | Friends Activity | Release In Scope | S-PM-0901-SCOPE Must; Q03/Q16/Q17 | M14 | DEV-04, DEV-08, DEV-11–DEV-13; candidate DEV-22 | Empty/privacy/deviation and capture blocked |
| 40 | `find-people` | Add Friend | Release In Scope | Q18 exact authenticated Username lookup and privacy-safe outcomes | M10 | DEV-03, DEV-11, DEV-12; candidate DEV-14 | Matching/exposure conflict and capture Pending |
| 41 | `persona-management` | Persona | Release In Scope | S-PM-0901-SCOPE Must; Q19 lifecycle/fields | M24 | DEV-11; candidates DEV-17–DEV-20 | Multiple lifecycle conflicts; capture Pending |
| 42 | `edit-persona` | Persona | Release In Scope | S-PM-0901-SCOPE Must; Q19 permits only approved structured Persona fields | M25 | DEV-11; candidate DEV-17 | Field-model conflict and capture Pending |

## Canonical surface and initial matrix mapping

These are initial canonical user-facing surface rows, not detailed specifications. Every row inherits global Version 5 provenance/capture, responsive/device, accessibility/platform, and shared-pattern readiness gates.

| Matrix ID | Canonical production surface | Exported route/state mapping | Disposition | Acceptance depth | Shared patterns | Initial readiness / main blocker |
|---|---|---|---|---|---|---|
| M01 | Sign in | `login` | Release In Scope | Dedicated Acceptance | SP-01, SP-03 | Authority/Deviation Blocked — DEV-01 production copy; evidence Pending |
| M02 | Account registration and verification | `register`, `verify`, `reg-complete`; required Username onboarding state missing | Mixed: Release In Scope + Pending Authority | Dedicated Acceptance | SP-01, SP-05 | Authority/Deviation Blocked — verification authority and candidate DEV-15 |
| M03 | Password recovery | `forgot-password` multi-step states | Prototype Evidence Only | Evidence Inventory Only | SP-01, SP-05 | Authority/Deviation Blocked — no production recovery contract |
| M04 | Profile onboarding | `profile-setup` | Release In Scope | Dedicated Acceptance | SP-01, SP-06 | Authority/Deviation Blocked — field collection/use/visibility authority incomplete |
| M05 | Interest onboarding | `interest-setup` | Release In Scope | Shared Pattern Acceptance | SP-01, SP-10 | Authority/Deviation Blocked — mandatory-one rule not established; SPs unready |
| M06 | Initial data-consent decision | `data-consent`, `less-personalised` | Release In Scope | Dedicated Acceptance | SP-05, SP-06 | Evidence Pending — DEV-09 governs production copy; captures/SPs Pending |
| M07 | Initial privacy decision | `first-time-privacy` | Release In Scope | Dedicated Acceptance | SP-06 | Evidence Pending — capture/SP Pending |
| M08 | Home dashboard shell | `home`, `home-limited`; one route contributes to M09/M14/M15 | Release In Scope | Dedicated Acceptance | SP-02, SP-06, SP-07 | Authority/Deviation Blocked — candidates DEV-21/DEV-22 and evidence gates |
| M09 | Friend Recommendation module and See All | Home states, `people-list`; required Q16 empty state partly/misrepresented | Release In Scope | Shared Pattern Acceptance | SP-02, SP-07 | Authority/Deviation Blocked — candidate DEV-22; SPs/evidence Pending |
| M10 | Exact Add Friend lookup | `find-people`; protected/rate outcomes absent | Release In Scope | Dedicated Acceptance | SP-01, SP-03, SP-08 | Authority/Deviation Blocked — candidate DEV-14 |
| M11 | Other-user profile | `public-profile` friend/non-friend branches; protected unavailable state absent | Release In Scope | Dedicated Acceptance | SP-03, SP-04, SP-08 | Authority/Deviation Blocked — candidate DEV-16 and field-level visibility audit |
| M12 | Friend Request lifecycle | `friend-request-sent`, `friend-requests`, `friend-accepted`, `friend-declined`; expiry/invalidation/unavailable absent | Release In Scope | Dedicated Acceptance | SP-03, SP-04, SP-05, SP-08 | Evidence Pending — Q18 states must be captured; SPs unready |
| M13 | My Friends search/activity list | `friends-page` | Release In Scope | Shared Pattern Acceptance | SP-02, SP-08, SP-10 | Evidence Pending — DEV-04 governs Going wording; SPs/capture Pending |
| M14 | Friends Activity module and See All | Home states, `friends-activity`; Q16 empty state absent | Release In Scope | Shared Pattern Acceptance | SP-02, SP-07, SP-08 | Authority/Deviation Blocked — candidate DEV-22 |
| M15 | Event Recommendation/list | Home states, `events-list`; Q16 empty state absent | Release In Scope | Shared Pattern Acceptance | SP-02, SP-07, SP-08 | Authority/Deviation Blocked — candidate DEV-22 |
| M16 | Event detail and status | `event-detail`, `event-status-saved` | Release In Scope | Dedicated Acceptance | SP-04, SP-05, SP-09 | Evidence Pending — privacy/count/attribution capture and SPs Pending |
| M17 | Event participant lists | `interested-people`, `going-people` | Mixed: Release In Scope + Pending Authority | Shared Pattern Acceptance | SP-02, SP-03, SP-08 | Authority/Deviation Blocked — Going-people directory authority missing |
| M18 | External registration and Going confirmation | `event-detail` external-link overlay, `reg-check`, `event-status-saved` | Release In Scope | Dedicated Acceptance | SP-04, SP-05, SP-09 | Evidence Pending — approved Yes/No semantics; capture/SPs Pending |
| M19 | Check-in composer | `checkin`, `checkin-edit`; location sheet; required persistence/Weather states partly absent | Mixed: Release In Scope + Pending Authority | Dedicated Acceptance | SP-01, SP-04, SP-06, SP-09 | Authority/Deviation Blocked — Edit authority and candidate DEV-21 |
| M20 | Check-in saved outcome | `checkin-success`; Q13 weather-enrichment notice absent | Release In Scope | Shared Pattern Acceptance | SP-05, SP-09 | Authority/Deviation Blocked — candidate DEV-21 |
| M21 | Footprint | `checkin-timeline`; delete sheet; map/list variants | Release In Scope | Dedicated Acceptance | SP-02, SP-04, SP-08, SP-09 | Evidence Pending — DEV-05/06/10 govern production; captures/SPs Pending |
| M22 | Check-in Calendar | `checkin-calendar`; selected-date state | Release In Scope | Dedicated Acceptance | SP-02, SP-08, SP-09 | Evidence Pending — selected-date/empty evidence and SPs Pending |
| M23 | Active Persona companion overview | `ai-customize` | Release In Scope | Dedicated Acceptance | SP-03, SP-10, SP-11 | Authority/Deviation Blocked — candidate DEV-17 and missing no-active state |
| M24 | Persona management and activation | `persona-management`; create/delete/overflow/capacity states | Release In Scope | Dedicated Acceptance | SP-04, SP-05, SP-10, SP-12 | Authority/Deviation Blocked — candidates DEV-17–DEV-20 |
| M25 | Persona editor | `edit-persona`; validation/discard/preview states | Release In Scope | Dedicated Acceptance | SP-01, SP-04, SP-10 | Authority/Deviation Blocked — candidate DEV-17 |
| M26 | AI Conversation | `ai-assistant`, `ai-limited`; required Q19/Q31 failure/deletion states absent | Release In Scope | Dedicated Acceptance | SP-02, SP-03, SP-04, SP-11 | Authority/Deviation Blocked — final failure/deletion copy deferred; evidence absent |
| M27 | AI safety information | `ai-safety` | Pending Authority | Evidence Inventory Only | SP-08 | Authority/Deviation Blocked — standalone surface authority absent |
| M28 | Own Profile and profile editing | `own-profile`, `profile-edit` | Release In Scope | Dedicated Acceptance | SP-01, SP-05, SP-08 | Authority/Deviation Blocked — candidate DEV-15 and local-field authority gaps |
| M29 | Privacy and consent settings | `privacy-settings`, `consent-settings` | Release In Scope | Dedicated Acceptance | SP-05, SP-06, SP-10 | Authority/Deviation Blocked — field-level authority/copy audit incomplete; evidence Pending |

## Material non-route-state inventory

Each entry groups materially related states. Incidental hover styles, animation branches, simple accordion expansion, and repeated component instances are not separate entries.

| State ID | Material state group | Source evidence | Matrix rows | Governing source / issue | Evidence status |
|---|---|---|---|---|---|
| NS01 | Sign-in validation, submission, authentication failure, and in-progress state | Missing-field error exists; dependency/loading states absent | M01 | S-BR4/S-BR5; final app error presentation not frozen | Partial/missing evidence |
| NS02 | Registration verification incomplete/invalid/expired/resend state set | Invalid/incomplete demo-code state exists; expiry/resend authority absent | M02 | Verification workflow Pending Authority | Authority/evidence Pending |
| NS03 | Password-recovery email/code/new-password/success/failure stages | Three-step prototype flow | M03 | No approved production recovery contract | Prototype evidence only |
| NS04 | Zero-Interest onboarding validation | Prototype blocks continuation with zero | M05 | Authority for minimum-one rule not established; Q16 supports valid empty recommendation outcomes | PM review required |
| NS05 | Initial consent Accept versus Not Now | Both branches present | M06 | S-BR45/S-KD5; Q17 controls purpose copy | Source present; capture Pending |
| NS06 | Initial privacy Accept→Public versus Reject→Private | Both branches present | M07 | S-BR45/S-KD5 | Source present; capture Pending |
| NS07 | Home full-consent versus limited-consent composition | `home` and `home-limited` | M08, M09, M14, M15 | Q03/Q16/Q17; route split does not alter module authority | Source present; capture Pending |
| NS08 | Home Check-in not-yet-completed versus completed/recent state | Only not-yet state materially shown | M08 | Core Check-in/Home flow | Completed-state evidence missing |
| NS09 | Event Recommendation loading, approved empty, success, request error, and Refresh/See All independence | Success prototype; approved Q16 empty absent | M08, M15 | Q16-A; candidate DEV-22 | Missing/conflicting evidence |
| NS10 | Friend Recommendation loading, approved empty, success, request error, and Refresh/See All independence | Success plus non-approved dismissal empty | M08, M09 | Q16-B; candidate DEV-22 | Missing/conflicting evidence |
| NS11 | Friends Activity loading, approved empty, success, and request error | Success only | M08, M14 | Q16-C; candidate DEV-22 | Missing evidence |
| NS12 | Add Friend initial input/instruction state | Default state exists but advertises name/account-ID lookup | M10 | Q18 exact Username only; candidate DEV-14 | Conflicting evidence |
| NS13 | Add Friend generic unavailable, protected non-exposure, rate/enumeration handling | Prototype exposes ordinary `No people found`; protected handling absent | M10 | Q18-C/D | Missing/conflicting evidence |
| NS14 | Add Friend `self`, `already_friends`, outgoing/incoming Pending, and `can_send_request` states | Self/friends/outgoing approximations; incoming absent; multi-result layout | M10 | Q18-C | Partial/conflicting evidence |
| NS15 | Friend Request accept/decline terminal outcomes | Dedicated accepted/declined routes | M12 | Q18-D | Source present; capture Pending |
| NS16 | Friend Request expired, invalidated, terminal/unavailable, and protected-race result | Absent | M12 | Q18-D stable unavailable semantics | Missing Figma evidence |
| NS17 | Other-user Profile non-friend, established-friend, and protected-unavailable projection | Friend/non-friend branches; protected unavailable absent | M11 | S-BR3/S-BR45; Q18 lookup grants no Profile authority | Partial evidence; field audit Pending |
| NS18 | Remove Friend confirmation and completion | Bottom sheet exists | M11 | Q18 MVP excludes unfriend; candidate DEV-16 | Conflicting authority |
| NS19 | My Friends search-empty and filter-empty outcomes | Both exist | M13 | S-BR45/S-KD5 separate Search My Friends | Source present; capture Pending |
| NS20 | Special Care marked/unmarked ordering/control | Toggle/pinned grouping exists | M13 | S-PM-0831 C10; S-BR45/S-KD5 | Source present; capture Pending |
| NS21 | External-registration warning before leaving ENMORI | Overlay exists | M16, M18 | S-BR45/S-KD5 | Source present; capture Pending |
| NS22 | Return confirmation Yes/No and resulting Going state | `reg-check` plus status outcome | M18 | S-BR45/S-KD5 | Source present; capture Pending |
| NS23 | Interested/Going participant list empty, populated, expanded, and privacy-filtered outcomes | Populated/expanded prototype only | M17 | Interested list authority exists; Going list authority Pending; protected empty absent | Authority/evidence Pending |
| NS24 | Check-in Note-or-Mood validation | Error exists | M19 | S-PM-0831 C3 | Source present; capture Pending |
| NS25 | Approx Location allow/continue-without-location choice | Bottom sheet exists for create/edit | M19 | S-PM-0831/Q13 purpose boundary | Source present; capture Pending |
| NS26 | Weather success, not-applicable omission, applicable-enrichment fallback, removal, and attribution | Fixed Weather shown/saved regardless of location; required fallback/attribution absent | M08, M11, M16, M19–M22, M26 | Q13; DEV-06; candidate DEV-21 | Conflicting/missing evidence |
| NS27 | Check-in persistence in-progress, failure, success, and transient fallback notice | Success route only | M19, M20 | S-PM-0831 C3; Q13-D | Loading/failure/fallback evidence missing |
| NS28 | Check-in permanent-delete confirmation and post-delete state | Delete sheet exists | M21 | S-BR2; lifecycle/copy evidence incomplete | Partial evidence |
| NS29 | Footprint selected-date list with zero/one/multiple Check-ins and with/without permitted map points | Static populated list/map; no empty/no-location variant captured | M21 | S-PM-0831 C5 | Partial/missing evidence |
| NS30 | Calendar no-date-selected, selected date with entries, selected date without entries, and open Footprint same-date action | No-date and populated selected-date behavior; empty/open-same-date incomplete | M22 | S-PM-0831 C4 | Partial/missing evidence |
| NS31 | Persona activation intent, explicit confirmation, replacement, and zero-active state | Tapping card activates immediately; zero-active/confirmation absent | M23, M24 | Q19; candidate DEV-18 | Conflicting/missing evidence |
| NS32 | Persona create modal, inactive-created state, maximum-five capacity, and duplicate-effect handling | Template/create modal and max-five exist; inactive-created confirmation not explicit | M24, M25 | Q19; candidates DEV-17/DEV-20 | Partial/conflicting evidence |
| NS33 | Persona delete confirmation for inactive/active Persona and resulting zero-active state | Inactive confirmation exists; active deletion prohibited | M24 | Q19; candidate DEV-19 | Conflicting evidence |
| NS34 | Persona edit validation, enum limits, save conflict, and discard-unsaved confirmation | Tone-limit and discard exist; approved field model not used; concurrency state absent | M25 | Q19; candidate DEV-17 | Conflicting/missing evidence |
| NS35 | AI request accepted/in-progress, successful response, and delivery-complete state | Static immediate reply only | M26 | Q31-B/C | Loading/timing evidence missing |
| NS36 | AI busy, dependency unavailable, invalid/unsafe output, timeout, abandoned, and stale-authority no-content states | Absent | M26 | Q31-D/E; final public copy deferred | Authority/evidence Pending |
| NS37 | Conversation source-unavailable tombstone, whole-Conversation delete confirmation, deletion in-flight, and post-delete state | Absent | M26 | Q19; final UI copy deferred | Authority/evidence Pending |
| NS38 | Profile/privacy/consent form validation, unsaved/save-in-progress, success, conflict, and consent on/off feedback | Prototype success badges/toggle branches only | M28, M29 | Q12/Q18/Q19 purpose and lifecycle boundaries; exact error/UI contracts incomplete | Partial/missing evidence |

## Initial shared visual-pattern records

These stable references are proposed analysis records only. None is `Visual Implementation Ready` or independently accepted.

| Pattern ID | Pattern | Primary authority | Initial status |
|---|---|---|---|
| SP-01 | Form validation and protected submission | Applicable feature validation/error contracts | Acceptance Pending |
| SP-02 | Async loading/success/empty/error/refresh collection | Q16 plus applicable feature/API contracts | Acceptance Pending |
| SP-03 | Privacy-safe unavailable/non-distinguishable state | Q16, Q18, Q19 and applicable privacy rules | Authority/Acceptance Pending |
| SP-04 | Confirmation and destructive irreversible action | Q18/Q19 and applicable lifecycle contracts | Acceptance Pending |
| SP-05 | Successful mutation/outcome feedback | Applicable lifecycle contract; final copy where approved | Acceptance Pending |
| SP-06 | Consent/privacy purpose choice | S-BR45/S-KD5, Q13/Q17 | Acceptance Pending |
| SP-07 | Ranked Top-2/See All/Refresh module | S-BR45/S-KD5, Q03/Q16 | Acceptance Pending |
| SP-08 | Search/filter/permission-filtered list | S-BR45/S-KD5, Q16/Q18 | Acceptance Pending |
| SP-09 | External link, provider attribution, and licence notice | S-BR45/S-KD5, Q13 | Acceptance Pending |
| SP-10 | Selection/activation with explicit confirmation | Q12/Q19 and applicable privacy controls | Acceptance Pending |
| SP-11 | AI request/message/non-content failure presentation | Q19/Q31 | Authority/Acceptance Pending |
| SP-12 | Modal/bottom-sheet/overlay accessibility and focus boundary | Applicable platform/accessibility requirements | Authority/Acceptance Pending |

## Pending Authority items

### Route-level

1. `verify`: exact email-verification workflow, resend/expiry behavior, and public errors.
2. `going-people`: existence and visibility of a Going-people directory and its counts/identities.
3. `checkin-edit`: whether Check-in edit is in the applicable product/Release scope and its lifecycle rules.
4. `ai-safety`: whether a standalone AI Safety surface is required, and its approved content/navigation.

### Material local states or fields

- Profile onboarding/edit authority for Date of Birth, derived age group, Region, School/Community Context, Bio, and their per-field visibility/retention purposes is incomplete in the reviewed approved records.
- Authority for requiring at least one Interest during onboarding is not established.
- Final public UI copy/interaction for Q31 non-content failures and Q19 unavailable/deleted Conversation states is explicitly deferred.
- Exact Profile field visibility and the authorization boundary for opening a full Profile from Add Friend/Friend Recommendation require a field-level UI/API mapping; Q18 lookup alone does not authorize it.
- Password recovery remains without a production contract and is therefore `Prototype Evidence Only`, not silently promoted to Pending Release scope.

## Newly discovered numbered deviation candidates — PM review required

These candidates are not approved deviations. Their numbers reserve an unambiguous review handle after approved Q04-DEV-13.

| Candidate | Figma evidence | Governing production authority | Proposed production direction |
|---|---|---|---|
| Q04-DEV-14 (Candidate) | `find-people` performs substring matching over DisplayName and Username, returns multiple candidates, and advertises name/account-ID search. | Q18-A–C require authenticated exact canonical Username lookup returning one minimum target or one generic unavailable outcome. | Replace the prototype search semantics with exact Username-only lookup and Q18 privacy-safe states. |
| Q04-DEV-15 (Candidate) | Registration lacks mandatory Username selection while `profile-edit` permits Username mutation. | Q18-B requires Username during onboarding and makes it immutable for Week 9. | Add authoritative onboarding selection and render Username read-only outside separately approved remediation. |
| Q04-DEV-16 (Candidate) | Established-friend Profile exposes `Remove Friend` and confirmation. | Q18-D MVP exclusions state no unfriend product under Q18; no separate approved unfriend contract was found. | Do not implement unfriend from this evidence unless separately approved. |
| Q04-DEV-17 (Candidate) | Persona source contains relationship, descriptions, traits, interests, custom interests, arbitrary personality details/instructions, preferences, templates, and preview content. | Q19 permits only owner-management `displayName` plus structured `tone`, `responseLength`, and `formatStyle`; free-text prompts/instructions and arbitrary extensions are prohibited. | Redesign Persona presentation around the Q19 structured field model; prototype extras are not production fields. |
| Q04-DEV-18 (Candidate) | Tapping a non-active Persona immediately changes `activePersonaId`. | Q19 says selection remains client intent until explicit confirmation atomically activates the sole Persona. | Add explicit activation confirmation and zero-active handling; no tap-to-activate side effect. |
| Q04-DEV-19 (Candidate) | Prototype refuses deletion of the Active Persona and requires selecting another first. | Q19 permits permanent Active Persona deletion, atomically clears active authority, and does not auto-select a replacement. | Permit confirmed active deletion with zero-active outcome under Q19. |
| Q04-DEV-20 (Candidate) | Persona UI offers Duplicate and template-based creation as production mutations. | Q19 approves bounded create/edit/delete/activation but does not approve a duplicate operation or template catalogue; creation must yield one inactive Persona under duplicate-effect protection. | Treat duplicate/templates as unsupported prototype behavior unless separately approved; preserve ordinary structured create. |
| Q04-DEV-21 (Candidate) | Home/Check-in display fixed Weather before location choice and Check-in persistence always writes fixed Weather even when Approx Location is not permitted; fallback/attribution are absent. | Q13 requires explicitly permitted canonical Approx Location, optional bounded enrichment, omission/fallback semantics, lifecycle revalidation, and deterministic attribution. | Use Q13 Weather states only; never fabricate or attach Weather without authority. |
| Q04-DEV-22 (Candidate) | Recommendation modules use missing, hidden, or non-approved empty copy such as `No more recommendations right now`, and do not consistently retain all empty Home modules. | Q16 freezes successful-empty semantics, exact module copy, retained Home modules, independent See All, and Refresh behavior. | Apply Q16-A–C exact empty states through a shared ranked-module pattern. |

## Blockers preventing Visual Implementation Ready

### Global blockers applying to every matrix row

- Version 5 historical-state provenance is not verified.
- Required screen/state captures, viewport/device dimensions, external font/asset/dependency reproduction evidence, and capture recorder evidence are incomplete.
- Responsive/device baselines and accessibility/platform acceptance have not been approved/evidenced.
- All twelve shared visual-pattern records remain independently unready.
- The deviation-register completeness audit remains Pending.
- Population is analysis only and has not received content-level PM acceptance.

### Authority/deviation blockers

- Four route-level `Pending Authority` items remain unresolved.
- Nine newly discovered deviation candidates require PM review and approval/rejection.
- Profile field collection/visibility, minimum Interest onboarding, Profile-opening authorization, and final AI/Conversation failure copy remain unresolved as listed above.
- Any additional conflict found during capture/non-route audit must receive a numbered Q04 deviation before the affected row can become ready.

### Evidence/state blockers

- Q16 empty states and standard async loading/error handling are absent or conflicting.
- Q18 protected unavailable, request expiry/invalidation, and enumeration/rate states are absent.
- Q13 optional-enrichment fallback, removal, and attribution states are absent or conflicting.
- Q19 zero-active, confirmed activation, active deletion, Conversation deletion, and unavailable-source states are absent or conflicting.
- Q31 busy/unavailable/invalid/unsafe/timeout/abandoned/stale-authority presentation evidence is absent and final public copy remains deferred.
- Calendar/Footprint empty/no-location and Check-in persistence failure states lack verified reference evidence.

## Grouping/classification requiring PM review

- Whether `verify` and `reg-complete` remain states of the canonical Account Registration surface when the exact verification workflow is unresolved.
- Whether `going-people` should be removed, deferred, or separately authorized alongside the approved Interested-people surface.
- Whether `checkin-edit` should remain grouped with Check-in Composer or be classified outside the applicable Release.
- Whether `ai-safety` is an independently authorized production surface or evidence-only content incorporated into another AI surface.
- Whether Profile onboarding/edit fields beyond the already established identity/interest requirements have an authoritative purpose, visibility, lifecycle, and Release disposition.
- Whether Persona templates/duplicate are rejected as prototype-only or require a future separately approved project-scope decision.

## Continuation boundary

No matrix row in this population is `Accepted Evidence Complete` or `Visual Implementation Ready`. Q-04 remains Open. Version 5 evidence verification remains Pending.
