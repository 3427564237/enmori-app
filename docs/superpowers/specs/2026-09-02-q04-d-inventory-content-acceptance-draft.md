# Q04-D — Inventory Content Acceptance and Production Surface Disposition

- **Status:** Approved by PM
- **Date prepared:** 2026-09-02
- **Decision owner:** LI HOURUI, ENMORI PM
- **Builds on:** Approved Q04-A through Q04-C in [`../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md`](../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md)
- **Population evidence reviewed:** [`../../evidence/ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md`](../../evidence/ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md)
- **Version 5 evidence verification:** Pending
- **Approval boundary:** Inventory/grouping/disposition content only; no shared pattern, matrix row, detailed visual specification, implementation, or readiness approval

## Approved Q04-D decision

Q04-D accepts the Q04-C population as a complete route-level inventory and an initial material-state/matrix analysis after applying the disposition corrections below.

Acceptance means that the inventory is suitable as the controlled starting point for later visual-acceptance work. It does not mean that every prototype route is a production screen, that every field/action is authorized, that the deviation register is complete, or that any row is `Visual Implementation Ready` or `Accepted Evidence Complete`.

## Approved content counts

| Measure | Approved Q04-D value |
|---|---:|
| Exported routes covered | 42/42 |
| `Release In Scope` route dispositions | 37 |
| `Prototype Evidence Only` route dispositions | 5 |
| `Project Scope — Deferred` route dispositions | 0 |
| `Pending Authority` route dispositions | 0 |
| `Explicitly Excluded` route dispositions | 0 |
| Canonical production surfaces supported by authority | 27 |
| Evidence-only matrix rows | 2 |
| Total initial matrix rows retained | 29 |
| Material non-route-state groups retained | 38 |
| Shared-pattern records retained but unready | 12 |
| Retained new deviation candidates | 8 |
| Candidate reviewed but not retained as a deviation | 1 |

Route-level `Pending Authority` becomes zero only because the four previously pending routes are conservatively classified as `Prototype Evidence Only`. This does not resolve the separately listed field, purpose, privacy, copy, or local-action authority questions.

## Approved route dispositions

### `Release In Scope` — 37 routes

The following routes map to an authoritative Release capability or a material state of one. Their exact route structure, fields, actions, copy, and transitions remain subject to the governing contracts and Q04 deviations:

`login`, `register`, `reg-complete`, `profile-setup`, `interest-setup`, `data-consent`, `less-personalised`, `first-time-privacy`, `home`, `home-limited`, `people-list`, `find-people`, `public-profile`, `friend-request-sent`, `friend-requests`, `friend-accepted`, `friend-declined`, `friends-page`, `friends-activity`, `events-list`, `event-detail`, `interested-people`, `event-status-saved`, `reg-check`, `checkin`, `checkin-success`, `checkin-timeline`, `checkin-calendar`, `ai-customize`, `persona-management`, `edit-persona`, `ai-assistant`, `ai-limited`, `own-profile`, `profile-edit`, `privacy-settings`, and `consent-settings`.

This disposition is not permission to copy prototype interaction logic. The applicable authoritative capability/source remains the one recorded in the Q04-C route inventory.

### `Prototype Evidence Only` — 5 routes

| Route | Proposed reason and mapping |
|---|---|
| `verify` | No reviewed authentication authority establishes the prototype six-digit verification flow, resend/expiry behavior, or demo code. Retain it as evidence attached to M02 Account Registration; it is not an independently authorized production state. |
| `forgot-password` | No approved production password-recovery contract. Retain M03 as an evidence-only matrix row. |
| `going-people` | Going status is approved, but that does not authorize a Going-user directory, identity list, or count disclosure. Retain route traceability under M17 while the supported production surface remains permission-filtered Interested People. |
| `checkin-edit` | No reviewed Check-in lifecycle authority approves editing. Retain the route as evidence attached to M19; the supported production surface is Check-in creation unless a separate lifecycle decision supersedes this disposition. |
| `ai-safety` | Safety requirements are authoritative, but prototype presence does not authorize a standalone AI Safety screen. Retain M27 as an evidence-only row; later visual work may place approved safety content within M26 AI Conversation or M29 Settings without treating this route as navigation authority. |

### Local prototype-only states within otherwise authorized routes

- Persona template selection and Persona duplication are `Prototype Evidence Only`. They do not change the Release disposition of `persona-management`.
- `Try Your Persona` prototype conversation, sample responses, and preview fixtures do not independently authorize another AI use case or persisted Conversation.
- Prototype dismiss controls for Recommendation cards do not create a retained dismissal/preference feature without a separate authoritative lifecycle and data-purpose contract.
- Prototype-only fixed values, sample people/events/counts, Campus/student fixtures, and mock transitions retain the Q04-A/Q04-B evidence-only boundary.

## Approved canonical surface disposition

The 29 initial matrix rows remain traceable, but only 27 are proposed as supported canonical production surfaces.

| Matrix row(s) | Proposed disposition |
|---|---|
| M01, M02, M04–M26, M28, M29 | Supported canonical production surfaces, subject to their authoritative semantic boundaries, deviations, shared-pattern gates, evidence, and unresolved local questions. |
| M03 Password Recovery | Evidence-only matrix row; not a production surface under current authority. |
| M27 AI Safety Information | Evidence-only matrix row; not a standalone production surface under current authority. |

Mixed route groups are resolved as follows:

- M02 remains the canonical Account Registration surface. `register` and the authoritative registration lifecycle are production-facing; `reg-complete` is its completion/terminal state. `verify` remains attached for evidence only.
- M17 becomes the canonical permission-filtered Interested People surface. `going-people` remains evidence-only traceability and does not authorize a second directory.
- M19 remains the canonical Check-in Composer for creation. `checkin-edit` remains attached for evidence only and does not authorize edit behavior.
- M26 remains the canonical AI Conversation surface. `ai-limited` is a consent/authority-dependent state of that surface rather than independent feature scope. Approved safety information may later be presented here or in M29 without creating M27 as a standalone screen.

Success/terminal routes such as `reg-complete`, `friend-request-sent`, `friend-accepted`, `friend-declined`, `event-status-saved`, and `checkin-success` are material states of their canonical surface rather than separate production-scope authorities.

## Authority questions intentionally left Pending

Q04-D does not decide the following product/data/privacy contracts:

1. collection, display, edit, retention, and visibility purposes for Profile Date of Birth, derived age group, Region, School/Community Context, and Bio;
2. whether Interest onboarding may require at least one selected Interest;
3. exact field exposure and authorization when navigating from Add Friend or Friend Recommendation to a full Profile;
4. whether Friend Recommendation results may initiate Friend Request send directly, rather than through the separately approved exact Add Friend lookup flow;
5. whether Recommendation dismissal is a transient UI-only action or a retained product preference/lifecycle;
6. exact Interested-person field/count disclosure beyond the already approved permission-filtered capability; and
7. final public wording for Q31/Q19 failure, unavailable, deleted, abandoned, timeout, and stale-authority states.

For item 7, the Q31/Q19 semantic outcomes already have product authority. Only their visual/content wording remains `Acceptance Pending`; Q04-D does not reopen the semantic product decision or create a new product-authority requirement.

## Approved deviation-candidate review status

A Q04 deviation is retained only where Version 5 conflicts with an applicable authoritative production requirement. Missing authority alone is handled through `Prototype Evidence Only` or `Pending Authority`, not by inventing a production resolution.

### Retained for later PM decision — 8 candidates

| Candidate | Authoritative production source | Affected surface/state | Required production resolution if approved |
|---|---|---|---|
| Q04-DEV-14 | S-PM-0902-Q18 Q18-A–C | M10 Add Friend lookup; NS12–NS14 | Replace name/Account-ID/substring/multi-result search with authenticated exact canonical Username lookup returning one minimum target or one generic unavailable outcome. |
| Q04-DEV-15 | S-PM-0902-Q18 Q18-B | M02 Account Registration; M28 Profile Edit | Collect canonical Username during onboarding and do not expose production Username rename/edit in Week 9. |
| Q04-DEV-16 | S-PM-0902-Q18 Q18-D MVP exclusions | M11 established-friend Profile; NS18 | Remove/disable the prototype unfriend action from the current Release unless a separate unfriend contract is approved. |
| Q04-DEV-17 | S-PM-0901-Q19 Persona fields/projection | M23–M25; NS32/NS34 | Use only `displayName`, `tone`, `responseLength`, and `formatStyle`; do not reproduce prohibited free-text prompts/instructions, role-play fields, interests, arbitrary preferences, or extension data. |
| Q04-DEV-18 | S-PM-0901-Q19 Persona lifecycle | M23/M24; NS31 | Preserve selection as client intent and require explicit confirmation before atomic activation/replacement; support zero Active Personas. |
| Q04-DEV-19 | S-PM-0901-Q19 Persona lifecycle | M24; NS33 | Permit confirmed deletion of the Active Persona, atomically clear active authority, and do not require or auto-select a replacement. |
| Q04-DEV-21 | S-PM-0902-Q13 Q13-A–D | M08/M11/M16/M19–M22/M26; NS26/NS27 | Display/persist Weather only through Q13-authorized optional enrichment; implement omission/fallback/removal/attribution and never fabricate fixed Weather without permitted Approx Location. |
| Q04-DEV-22 | S-PM-0902-Q16 Q16 Common/A–C | M08/M09/M14/M15; NS09–NS11 | Retain all Home modules and use the exact approved module empty copy and independent See All/Refresh semantics without hidden broadening. |

### Do not retain as a deviation

`Q04-DEV-20 (Candidate)` is not retained as a proposed deviation. Q19 does not approve a Persona duplicate operation or template catalogue, but absence of production authority alone is not an actual conflict requiring a Q04 deviation. Persona template/duplicate behavior is classified as `Prototype Evidence Only`.

This disposition preserves the candidate audit trail without assigning Q04 approval or silently converting the feature into project scope.

## Disputed grouping and substantiation report

### Groupings proposed for PM confirmation

- M02: keep `reg-complete` as an Account Registration terminal state while retaining `verify` as evidence only.
- M17: keep `interested-people` as the production surface and `going-people` as evidence-only traceability.
- M19: keep `checkin` as the production composer and `checkin-edit` as evidence-only traceability.
- M26/M27/M29: do not create a standalone AI Safety surface; later map approved safety content to AI Conversation or Settings.

### Release-in-scope routes without independent standalone-screen authority

The following route structures are not independently required screens. Their Release disposition derives from an authoritative semantic state and their proposed grouping into a canonical surface:

- `reg-complete` — successful registration completion;
- `less-personalised` — consent-rejection continuation;
- `home-limited` — Home under limited consent/authority;
- `friend-request-sent`, `friend-accepted`, `friend-declined` — Q18 lifecycle outcomes;
- `event-status-saved` — approved Interested/Going mutation outcome;
- `checkin-success` — approved Check-in success/fallback outcome; and
- `ai-limited` — bounded AI presentation under current consent/authority.

Q04-D proposes accepting these as material states, not as proof that production must preserve separate routes or full-screen layouts.

### Additional product/privacy questions exposed by the audit

- Whether the non-friend/public Profile may expose interests, public Check-in details, Weather, Event activity, recommendation reasons, or profile image in the exact combination shown by Version 5.
- Whether a Friend Recommendation card may expose DisplayName, profile image, role/context, explanation, direct Profile navigation, and direct Friend Request action in one projection.
- Whether public Interested/Going totals and `Friends`/`Others` breakdowns have an approved privacy-safe purpose; Q04-DEV-13 prevents fixture copying but does not itself define the final field-level projection.
- Whether Check-in Activity is single-valued or multi-valued and how it is edited; the prototype selects multiple activities while current authoritative projection terminology is singular/normalized.
- Whether Profile image upload/change, logout result handling, and Account onboarding failure/retry require separate authoritative lifecycle/API decisions or only shared visual patterns.

These questions remain blockers for the affected local state only. They do not broaden Q04-D into a product/data/API decision.

## Readiness and continuation boundary

Q04-D accepts inventory/grouping/disposition content only.

It does not:

- approve any shared visual-pattern record;
- approve detailed per-screen visual specifications;
- approve final error/loading/empty copy beyond already authoritative copy;
- verify Version 5 provenance or captures;
- complete responsive/device/accessibility/platform evidence;
- close the deviation-register completeness gate;
- mark any matrix row `Visual Implementation Ready` or `Accepted Evidence Complete`; or
- close Q-04.

Q04-D approval does not approve Q04-DEV-14 through Q04-DEV-19 or Q04-DEV-21 through Q04-DEV-22. They remain numbered candidates for later PM review. Q-04 remains Open.
