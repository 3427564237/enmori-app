# UI baseline and visual acceptance contract — 2026-09-02

- **Status:** Partially approved; Q04-A through Q04-D approved; Q-04 remains Open
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q04
- **Approved scope:** Frozen UI reference-baseline identity, evidence-package requirements, reference authority boundary, linear-prototype limitation, controlled visual-improvement boundary, authority precedence/deviation governance, observed/provisional Q04-DEV-01 through Q04-DEV-13, screen-scope classification/visual-acceptance matrix structure, and inventory/grouping/production-surface dispositions
- **Evidence status:** Partially captured but Pending verification; Q04-A/Q04-B approval is not baseline-evidence readiness or deviation-register completeness
- **Not yet approved:** Complete deviation inventory, screen/state visual acceptance matrix, responsive/device baselines, accessibility acceptance, detailed visual tolerances, implementation, or Release evidence
- **Builds on:** S-FIGMA, S-BR4/S-BR5, S-PM-0901-BACKEND, and the affected approved feature contracts recorded in [`../SOURCE_MAP.md`](../SOURCE_MAP.md)

## Q04-A — Frozen UI Baseline Identity and Evidence

The approved visual reference baseline is Figma Make file `UFmjpkfucM4TctMuRQfsOC`, Version 5, titled `Create individual event details`, shown in Figma version history as August 1, 2026 at 7:37 PM.

The displayed timestamp is recorded exactly as presented by Figma. Q04-A does not infer an unstated timezone.

The share URL alone is not sufficient baseline identity.

## Baseline evidence package

Before visual implementation is Ready, the Version 5 Make source must be exported and retained as a baseline evidence package containing:

- the original exported archive;
- a SHA-256 digest of that archive;
- an extracted file inventory;
- the exported source and supplied assets;
- the Figma file key, version number, version title, and displayed timestamp;
- captured Figma version-history evidence identifying Version 5;
- evidence that the exported archive was obtained from the Version 5 historical state rather than an unverified later/current head;
- rendered Version 5 reference captures for screens/states later used by the visual acceptance matrix, including applicable reference viewport/device dimensions;
- any external fonts, remote assets, or other dependencies required to reproduce the observed Version 5 appearance but not contained in the archive;
- the extraction/capture date; and
- the responsible evidence recorder.

If Figma cannot directly export the historical Make version, the team must obtain or create a verifiably Version-5-derived snapshot before export and record that procedure. Exporting a later head and merely labelling it as Version 5 is not valid baseline evidence.

The exported React/TypeScript/CSS source is design evidence only. It is not Flutter production code, Backend/API authority, Business Rule authority, or proof of implementation.

## Reference authority and prototype limitations

Figma Version 5 is a frozen visual reference baseline, not a pixel-perfect production specification or a complete interaction contract.

Version 5 was created primarily as a linear high-fidelity prototype for requirements communication, demonstration, and UAT. Its interaction model was therefore optimized for demonstration rather than complete production behaviour.

Many prototype interactions, state transitions, validation paths, navigation branches, loading/error/empty states, responsive behaviours, edge cases, and lifecycle behaviours may be incomplete, simplified, hard-coded, linearized, or unsuitable for direct production implementation.

The exported React/TypeScript/CSS implementation and prototype interaction logic are therefore reference evidence only. Flutter must not reproduce prototype code structure, mock state management, hard-coded demonstration values, linear-navigation shortcuts, simulated Backend behaviour, or other demonstration-oriented implementation merely for fidelity to the export.

Version 5 provides frozen reference direction for:

- overall ENMORI visual identity;
- screen composition and information hierarchy;
- major component placement;
- colour and styling direction;
- typography intent;
- iconography and imagery intent;
- relative spacing, density, and grouping; and
- recognizable navigation and interaction presentation.

Version 5 does not require pixel-perfect reproduction of individual dimensions, spacing values, typography metrics, component geometry, animation timing, or prototype implementation details unless a later Q04 decision explicitly freezes those details.

The Version 5 UI is acknowledged as a basic first-pass visual design rather than a complete production design system.

## Controlled production visual improvement

Production Flutter implementation may improve visual polish, consistency, responsive behaviour, accessibility, platform appropriateness, and reusable component-system quality where those improvements:

- preserve the recognizable ENMORI visual direction;
- preserve approved information hierarchy and feature intent;
- do not change approved Business Rules or feature scope;
- do not weaken privacy, security, consent, or accessibility requirements;
- do not introduce new product behaviour merely as a visual improvement; and
- do not contradict an explicitly frozen Q04 deviation or later visual acceptance requirement.

Visual improvement is not authority to redesign product semantics. Material departure from the recognizable Version 5 visual direction requires explicit Q04 review rather than being silently introduced during implementation.

Prototype transitions, click targets, animations, and interaction demonstrations are interaction evidence only. They do not independently authorize:

- feature existence;
- navigation availability;
- data mutation;
- validation behaviour;
- Backend effects;
- lifecycle transitions;
- permissions or visibility;
- automatic actions; or
- other Business Rule behaviour.

Where prototype behaviour conflicts with an approved requirement, PM decision, Business Rule, privacy/security rule, API contract, accessibility requirement, or platform requirement, the approved non-Figma authority governs.

Prototype fixtures, hard-coded demonstration values, mock state, sample counts, example people/events, demo verification code, and implementation shortcuts are not production requirements.

## Q04-BASELINE-LIMITATION-01 — Linear Prototype Limitation

Figma Version 5 was built primarily as a linear demonstration prototype. Its presence of a screen, transition, interaction, or state is not by itself evidence that the represented production behaviour is complete, correct, or approved. Production behaviour must derive from the applicable approved requirement contracts.

## Q04-DEV-01 — Authentication identifier copy

- Figma Version 5 presents `Email or username`;
- the approved production authentication contract remains email/password;
- Username login is not approved; and
- Flutter must use requirement-compliant email/password wording unless a later explicit authentication decision supersedes it.

## Q04-B — Authority Precedence and Deviation Governance

### Scope-aware authority precedence

An authority controls only within its stated role and scope. Q04 does not convert a PM decision into a Sponsor/Supervisor decision and does not allow a visual decision to redefine product semantics.

For an affected screen or state, authority is applied in this order:

1. applicable non-waivable law, licence, privacy, security, accessibility, and platform obligations;
2. explicit formal Sponsor/Supervisor decisions and applicable formal project or assessment authority, each only within its attributed scope;
3. confirmed PM-controlled project decisions and approved Business Rules/Requirements within their stated scope;
4. explicit approved Q04 deviations and later screen/state visual-acceptance decisions, for presentation treatment only;
5. the Figma Version 5 visual reference baseline; and
6. exported prototype source, fixtures, transitions, mock state, and other implementation detail as supporting evidence only.

Within the same authority tier, document recency alone does not establish control. Compatibly specific sources may coexist where both rules can be satisfied and the narrower source comes from an authority competent for that subject. An actual same-tier conflict requires explicit competent supersession or a new authoritative resolution. Otherwise both sources and their conflict remain visible and the affected behaviour is Blocked.

An explicit higher-authority decision within scope may supersede a lower-authority source, but the supersession trail must retain both the old and new sources. Where role, scope, attribution, applicability, or supersession is ambiguous, the implementer must report the conflict and must not choose silently.

### Deviation governance

Q04-DEV-01 through Q04-DEV-13 are the observed/provisional deviation register approved from the currently inspected Version 5 UI and exported source. Their approval resolves the listed production direction; it does not claim that all Version 5 screens, states, source branches, responsive variants, or hidden transitions have been audited.

`Deviation register completeness` remains `Pending` until the verified Version 5 evidence package, extracted source inventory, and screen/state captures have been audited against the governing sources.

Any later-discovered conflict must receive the next numbered `Q04-DEV-*` entry, identify the conflicting evidence and governing authority, and be approved before the affected screen/state becomes Visual Implementation Ready. An implementer must not silently reinterpret a fixture as a requirement or choose between conflicting authorities.

### Observed/provisional deviation register

| ID | Observed Version 5 evidence | Production resolution | Governing authority |
|---|---|---|---|
| Q04-DEV-01 | Login says `Email or username`. | Use email/password authentication copy. Username login is not approved. | S-BR4/S-BR5 and S-PM-0901-BACKEND; Q18 restricts Username lookup to Add Friend. |
| Q04-DEV-02 | Registration/password recovery uses a hard-coded demo code `123456` and prototype-only reset flow. | Treat the code and flow as fixtures only. Production password recovery remains Not Approved until a separate authoritative contract defines it; Q04 must not invent one. | S-BR4/S-BR5 and S-PM-0901-BACKEND define the approved authentication boundary; no approved source authorizes this prototype recovery behaviour. |
| Q04-DEV-03 | Product copy uses `Campus Connect`. | Production public product identity is `ENMORI`; historical labels remain evidence only. | S-PM-0831 C7 explicitly supersedes the conflicting product-name material. |
| Q04-DEV-04 | Friends Activity exposes `Booked externally`; event detail also offers direct `Mark Going`. | Do not publish `Booked externally` as the canonical social state. `Going` is the canonical state; an external registration link does not prove Going, and the approved return confirmation governs its update. | S-BR45 and S-KD5, retained by S-PM-0831. |
| Q04-DEV-05 | Profile labels the feature `Check-in Timeline`. | Use the approved `Footprint` product concept and its approved selected-date/history semantics. | S-BR45/S-KD5 and S-PM-0831 C5. |
| Q04-DEV-06 | Weather values such as `Cloudy, 28°C` appear without Open-Meteo attribution/link treatment. | Every user-facing Open-Meteo Weather display, including materially Weather-derived Q17 output, must receive deterministic compliant attribution; Q04 may choose placement but cannot omit it. | S-PM-0902-Q13. |
| Q04-DEV-07 | Copy describes Event results as `AI recommendations` and couples the recommendation modules to AI-personalisation consent. | Event/Friend/Friends Activity recommendations are Backend-owned deterministic modules; Qwen does not rank them. Consent and AI copy must follow the approved bounded data-use contracts. | S-BR5, S-PM-0901-Q03, and S-PM-0901-Q17. |
| Q04-DEV-08 | Friend reasons/ranking include same campus, school, year, role, and similar demographic/context signals. | v1 Friend Recommendation may use only approved eligibility and formula inputs; campus/school/year/role factors are prohibited. Public reasons use only the approved safe explanation projection. | S-PM-0901-Q03 and S-PM-0901-Q17. |
| Q04-DEV-09 | Consent copy says profile details, Check-ins, event activity, and region may feed both AI and recommendation features. | Check-in data is limited to approved bounded conversational-AI purposes and never enters Recommendation ranking; region/location is not a Recommendation or Qwen input. Use the exact purpose-specific allowlists. | S-PM-0831 C6 and S-PM-0901-Q17, with Persona projection refined by S-PM-0901-Q19. |
| Q04-DEV-10 | Privacy UI proposes a friend-visible `Campus Route Map`. | Do not implement social route-map publication from this prototype. Only approved Check-in/Calendar/Footprint visibility and lifecycle behaviour may be shown unless a separate authority approves route-map sharing. | S-BR2/S-BR45 and S-PM-0831 C4/C5; no approved authority creates the prototype route-map feature. |
| Q04-DEV-11 | Product positioning and fixtures repeatedly frame ENMORI as NUS/campus/student-only. | Campus/student data may remain clearly marked sample content, but production naming, navigation, onboarding, and capability copy must not narrow ENMORI to students-only. | S-PM-0831 C8/Q20 resolves the current broader community scope. |
| Q04-DEV-12 | Fixed Interest Tags, categories, names, roles, events, and other catalogue/profile values are embedded in source. | Treat them as fixtures, not authoritative catalogue values, schemas, or permissible identity fields. Production catalogue identity, validation, lifecycle, and references follow Q12; identity/search follows Q18. | S-PM-0902-Q12 and S-PM-0902-Q18. |
| Q04-DEV-13 | Event cards/details hard-code Interested/Going totals, friend/other breakdowns, named people, and navigation to those lists. | Values are fixtures. Any production count, identity, list, and navigation exposure must be dynamically authorized under approved Event, friendship, privacy, lifecycle, and field-projection rules; the prototype cannot broaden visibility. | S-BR3/S-BR45/S-KD5 and the field/minimisation boundaries in S-PM-0901-Q17. |

Each row records the currently governing production direction. If a later competent authority explicitly supersedes one of these rules, the new decision must update the row while retaining the supersession trail.

## Captured source-export evidence

The PM supplied `修改登陆界面.zip` on 2026-09-02. The original archive, unchanged extracted source, canonical file inventory, intake checks, and SHA-256 `9ffee1e2c6879f438c96737c9a61dbbc55493cf5e94f55a1eeadeb9462e63f00` are retained under [`../evidence/ui/figma-make-v5/`](../evidence/ui/figma-make-v5/).

The export README corroborates Figma file key `UFmjpkfucM4TctMuRQfsOC`, but the archive contains no immutable Version 5/history record. Historical-version provenance, screen/state captures/dimensions, and external-dependency reproduction evidence therefore remain Pending. The source was inspected but not executed and its dependencies were not installed.

## Q04-C — Screen Scope Classification and Visual Acceptance Matrix Structure

The exported Version 5 source contains 42 route-level screen identifiers. Every exported route must receive exactly one inventory disposition so that route coverage is complete and auditable.

Route presence does not approve production scope, Release inclusion, navigation availability, or a separate detailed visual specification. A route is not necessarily equivalent to one production screen: multiple routes may represent states of one surface, one route may contribute to multiple matrix rows, and a material matrix row may have no Version 5 route at all. The route inventory and matrix therefore have a zero-to-many relationship in either direction, while preserving complete route-to-matrix traceability.

Production-required material screens or states absent from Version 5 must be represented when required by an applicable authoritative source. Their missing Figma evidence must be recorded explicitly; absence from the prototype must not erase a production requirement or be disguised as available reference evidence.

Q04-C defines classification and matrix structure only. It does not classify all 42 routes, approve their production implementation, complete the deviation audit, or establish 42 detailed per-screen visual specifications.

### Production disposition

Each route or material surface/state receives one of these dispositions, supported by the applicable authoritative source under Q04-B:

- `Release In Scope`: an authoritative source places the production surface/state in the applicable Release;
- `Project Scope — Deferred`: an authoritative source retains the production surface/state in overall project scope but outside the applicable Release;
- `Prototype Evidence Only`: prototype evidence exists but no authoritative source approves the represented production capability;
- `Pending Authority`: scope, attribution, applicability, terminology, or supersession is unresolved; or
- `Explicitly Excluded`: an authoritative source explicitly excludes the production capability from the applicable scope.

Q04-C inherits the Q04-B authority-precedence and explicit-supersession rules in full. Classification records scope established by the applicable authoritative source. Q04-C classification itself cannot create, expand, defer, or exclude product or Release scope.

### Acceptance depth

Each matrix row receives one acceptance-depth classification:

- `Dedicated Acceptance`: the surface/state requires independent visual acceptance because its visual behaviour is materially unique, elevated-risk, or cannot be governed by a shared pattern;
- `Shared Pattern Acceptance`: the surface/state is accepted through a stable referenced shared visual-pattern record plus verification of correct local composition and applicability;
- `Evidence Inventory Only`: the evidence is retained and traceable, but no production visual standard is created; or
- `Not Applicable`: an authoritative exclusion means production visual acceptance does not apply.

Shared visual-pattern records have stable identifiers, their own authority, acceptance criteria, evidence, lifecycle/version, and readiness state. A screen using `Shared Pattern Acceptance` cannot become `Visual Implementation Ready` until the referenced pattern satisfies its own acceptance/readiness gate. A pattern update does not silently change an already accepted screen; applicability and any required re-verification must remain traceable. Material local exceptions cannot be hidden under the shared pattern and require explicit local governance, including a numbered Q04 deviation where an authority conflict exists.

Repeated layouts, controls, and standard loading, empty, error, confirmation, or unavailable treatments should use shared-pattern acceptance where applicable. Each consuming screen is still checked for correct composition and applicability without duplicating a full visual specification.

### Readiness state

Each matrix row uses one of these readiness states:

- `Inventory Pending`;
- `Evidence Pending`;
- `Authority/Deviation Blocked`;
- `Acceptance Pending`;
- `Visual Implementation Ready`; or
- `Accepted Evidence Complete`.

Inventory presence is not readiness. A row cannot become `Visual Implementation Ready` until:

- its production disposition is supported by the applicable authoritative source;
- each authority conflict has an approved numbered Q04 deviation;
- required reference evidence is available or its approved absence/missing-evidence treatment is recorded;
- its acceptance depth and required state coverage are defined;
- every referenced shared pattern has passed its independent readiness gate;
- all material local exceptions are explicitly governed; and
- applicable responsive/device, accessibility, platform, privacy, security, and licence gates are satisfied or separately resolved.

### Matrix fields

Each matrix row contains:

| Field | Required purpose |
|---|---|
| Matrix ID | Stable Q04 screen/state identifier. |
| Source route/state | Zero-to-many exported routes, conditional states, dialogs, overlays, or an explicit `absent from Version 5` marker. |
| User-facing surface | Human-readable surface/state name. |
| Feature family | Traceable functional grouping without creating scope. |
| Production disposition | One approved classification above. |
| Governing authority | Exact source establishing that disposition. |
| Acceptance depth | Dedicated, Shared Pattern, Evidence Inventory Only, or Not Applicable. |
| Applicable deviations | Approved Q04-DEV identifiers or an explicit none/pending state. |
| Reference evidence | Capture/source identifier and applicable viewport/device information, including explicit missing evidence. |
| Required state coverage | Referenced material state set without duplicating a full specification. |
| Shared visual pattern | Stable pattern identifier/version or an explicit not-applicable value. |
| Accessibility/platform gate | Applicable requirement/evidence reference or unresolved gate. |
| Readiness/blocker | Current readiness state and concrete unresolved blocker. |

The route inventory separately records, for every one of the 42 exported routes:

- the exact exported route identifier;
- its feature family;
- its single inventory disposition and governing authority;
- zero or more related matrix IDs;
- applicable Q04 deviations; and
- evidence/audit status.

No exported route may disappear from traceability merely because it maps to no production matrix row. Conversely, every production-required material row absent from Version 5 must remain visible with missing prototype evidence explicitly recorded.

### Completeness boundary

The 42-route inventory establishes route-level coverage only. Matrix completeness additionally requires an audit for material non-route dialogs, overlays, conditional states, shared visual patterns, and authoritative production-required states absent from Version 5. This does not require every incidental source-code branch or repeated component instance to receive a separate visual specification.

Population of the route inventory and matrix is evidence/analysis work. It does not automatically approve the classified screen set, a newly discovered deviation, production implementation, or Visual Implementation readiness.

## Q04-D — Inventory Content Acceptance and Production Surface Disposition

Q04-D accepts the populated Q04-C inventory/grouping/disposition content under the detailed approved record in [`../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md`](../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md).

The accepted content baseline is:

- 42/42 exported routes inventoried;
- 37 routes classified `Release In Scope` at capability/state level;
- five routes classified `Prototype Evidence Only`: `verify`, `forgot-password`, `going-people`, `checkin-edit`, and `ai-safety`;
- zero route-level `Pending Authority`, without resolving the separate field/purpose/privacy/content questions retained by Q04-D;
- 27 authority-supported canonical production surfaces;
- two evidence-only matrix rows, M03 Password Recovery and M27 standalone AI Safety;
- 29 total initial matrix rows, 38 material non-route-state groups, and 12 shared-pattern records that remain unready; and
- eight retained but unapproved numbered deviation candidates: Q04-DEV-14 through Q04-DEV-19 and Q04-DEV-21 through Q04-DEV-22.

Q04-DEV-20 is not retained as a deviation candidate. Persona template/duplicate behaviour is `Prototype Evidence Only` because missing production authority alone is not an authoritative conflict.

Q04-D confirms the grouping rules recorded in the detailed record, including:

- `reg-complete` as a terminal state of Account Registration while `verify` remains evidence only;
- `interested-people` as the supported production participant-list surface while `going-people` remains evidence only;
- Check-in creation as the supported Composer while `checkin-edit` remains evidence only;
- `ai-limited` as an authority/consent-dependent AI Conversation state; and
- no standalone production AI Safety screen under current authority, while approved safety content may later be mapped to an authorized AI or Settings surface.

Q31/Q19 semantic failure outcomes retain their existing authority. Their final user-facing wording is visual/content `Acceptance Pending`, not a newly reopened product-authority question.

Profile field purpose/visibility/lifecycle, minimum Interest onboarding, Add Friend/Friend Recommendation full-Profile exposure, direct Friend Request action from Recommendation, Recommendation dismissal lifecycle, participant count/identity exposure, and the other product/privacy questions listed in the detailed Q04-D record remain unresolved outside Q04.

Q04-D approves inventory/grouping/disposition content only. It does not approve the eight retained deviation candidates, shared patterns, detailed per-screen specifications, final unresolved content, evidence verification, implementation, or readiness.

## Supersession and unavailable remote source

Future Figma Make edits or Version 6+ do not automatically change the approved baseline. Supersession requires a new explicit PM decision identifying the replacement version and retaining the Version 5 evidence trail.

If the remote Make file becomes unavailable, the exported evidence package and its verified digest remain the reproducible record of the approved Version 5 baseline.

## Approval, evidence, and continuation boundary

Q04-A approval and baseline-evidence readiness are separate states:

- once this requirement decision is persisted and `git diff --check` passes, Q04-A is Approved;
- the actual baseline evidence gate remains Pending until the Version 5 export, digest, provenance evidence, and reference captures are captured and verified;
- missing evidence blocks Visual Implementation readiness but does not silently change the approved Q04-A contract.

Q04-B, Q04-C, and Q04-D are Approved after persistence and `git diff --check`. The observed/provisional deviation register is not a completeness claim. Q04-D content acceptance is not shared-pattern, detailed-specification, evidence, implementation, or readiness approval.

Q-04 remains Open. The eight retained deviation candidates, shared-pattern acceptance, Version 5 evidence verification, responsive/accessibility/platform gates, and affected visual acceptance remain unresolved before the corresponding screen/state can become Visual Implementation Ready.

S-PM-0902-GOV subsequently adopts Q04-B's authority and conflict model as the canonical project-wide model and corrects the former `AGENTS.md` hierarchy. Q04's visual-evidence tiers and deviation governance remain specific to Q04.

This is a current PM UI-governance decision, not a Sponsor/Supervisor decision, not visual implementation, and not evidence that Version 5 was previously approved under these exact terms.

## Subsequent bounded RMVP-01A acceptance

[S-PM-0903-Q04-RMVP01A-R1](2026-09-03-q04-rmvp-01a-entry-core-acceptance.md) subsequently approves Q04-DEV-15 and new Q04-DEV-23/24, the bounded M02/M06/M07/M08-shell/M19-note/M20 detailed state/copy contract, slice-scoped SP-01/05/06 and its Android responsive/accessibility acceptance baseline. This later compatible specificity does not erase Q04-D's issuance-time candidate record. Seven earlier candidates remain unapproved; evidence remains Pending and no matrix row becomes Visual Implementation Ready.
