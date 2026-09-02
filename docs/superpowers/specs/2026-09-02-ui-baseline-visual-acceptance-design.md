# UI baseline and visual acceptance design

- **Status:** Partially approved PM design; Q04-A through Q04-D approved; Q-04 Open
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q04; authority/conflict model adopted project-wide by S-PM-0902-GOV
- **Evidence status:** Source export partially captured; Version 5 evidence-package verification and deviation-register completeness Pending
- **Implementation status:** Not implemented or verified

## Approved Q04-A baseline identity

| Property | Frozen value |
|---|---|
| Figma surface | Figma Make |
| File key | `UFmjpkfucM4TctMuRQfsOC` |
| Version | Version 5 |
| Version title | `Create individual event details` |
| Displayed history timestamp | August 1, 2026 at 7:37 PM |
| Timestamp timezone | Not stated; no timezone inferred |
| Authority | Visual reference direction only |
| Pixel-perfect requirement | No |
| Complete interaction contract | No |

The share URL is an entry point, not sufficient immutable identity.

## Evidence readiness gate

```text
Q04-A approved contract
        │
        ├── does not require the evidence package to already exist
        │
        └── Visual Implementation Ready only after verified Version 5 package
             ├── original archive + SHA-256
             ├── extracted inventory/source/assets
             ├── Version 5 history/provenance evidence
             ├── screen/state captures + viewport/device dimensions
             ├── external font/asset/dependency inventory
             └── capture date + evidence recorder
```

If direct historical-version export is unavailable, the recorded procedure must prove the snapshot was derived from Version 5. A renamed later-head export is invalid.

## Reference versus production authority

| Version 5 evidence may guide | Version 5 evidence cannot independently authorize |
|---|---|
| ENMORI visual identity | Feature existence or scope |
| Composition and hierarchy | Navigation availability |
| Major component placement | Data mutation or Backend effect |
| Colour/style/typography intent | Validation or lifecycle behaviour |
| Iconography/imagery intent | Permission, visibility, or automatic action |
| Relative spacing/density/grouping | Prototype code architecture or mock state |
| Recognizable interaction presentation | Hard-coded values, fixtures, or demo shortcuts |

Version 5 is a basic, linear, high-fidelity prototype and first-pass visual design. It is neither a complete production design system nor a pixel-perfect specification. Approved Flutter improvements may enhance polish, consistency, responsiveness, accessibility, platform appropriateness, and component reuse without changing product semantics or materially departing from the recognizable Version 5 direction.

## Frozen limitation and observed/provisional deviations

`Q04-BASELINE-LIMITATION-01` records that screen/state/transition presence in the linear prototype is not proof of complete, correct, or approved production behaviour.

`Q04-DEV-01` resolves the visible login-copy conflict:

```text
Figma:       Email or username
Production:  email/password only
Username login: not approved
```

Q04-B adds Q04-DEV-02 through Q04-DEV-13 for the currently observed prototype conflicts involving demo password recovery, product naming, Going semantics, Footprint naming, Weather attribution, deterministic recommendation ownership, Friend inputs, data-use consent, route-map sharing, student-only framing, fixed catalogue/profile fixtures, and Event social counts/identities.

These entries are approved production-resolution directions but form only an observed/provisional register. Completeness remains Pending until the verified Version 5 package, source inventory, and screen/state captures have been audited.

## Q04-B authority and conflict model

```text
applicable non-waivable external obligations
                    ↓
formal Sponsor/Supervisor + project/assessment authority
                    ↓
confirmed PM decisions + approved Business Rules/Requirements
                    ↓
approved Q04 deviations + visual acceptance decisions
                    ↓
Figma Version 5 visual reference
                    ↓
prototype source, fixtures, mock state, transitions
```

Every authority remains limited to its role and scope. Within one tier, a later date is not a conflict-resolution rule. Compatibly specific sources may coexist where both can be satisfied and the narrower source comes from a competent authority; an actual conflict requires explicit competent supersession or a new authoritative resolution. Without one, the conflict stays visible and the affected behaviour remains Blocked.

S-PM-0902-GOV subsequently adopts this core authority/conflict model project-wide. Q04's deviation, Figma-reference, and prototype-evidence tiers remain visual-governance extensions rather than general product-authority tiers.

Any additional conflict discovered while auditing a screen/state must be assigned the next numbered Q04 deviation before that screen/state becomes Visual Implementation Ready. Implementers cannot silently pick an authority or promote prototype behaviour into a production requirement.

## Captured source-export slice

The PM-supplied archive and unchanged extracted tree are retained at [`../../evidence/ui/figma-make-v5/`](../../evidence/ui/figma-make-v5/). Its SHA-256 is `9ffee1e2c6879f438c96737c9a61dbbc55493cf5e94f55a1eeadeb9462e63f00`.

The archive corroborates the frozen Figma file key through its README, but does not contain an immutable Version 5/history identifier. It therefore advances the evidence package without completing historical-version provenance or screen/state capture verification.

## Next decision gate

Q04-B has frozen Authority Precedence and Deviation Governance plus an observed/provisional Q04-DEV-01 through Q04-DEV-13 register. It does not claim completeness.

## Q04-C classification and matrix model

Q04-C freezes structure rather than 42 detailed screen specifications:

```text
42 exported routes ── every route gets one inventory disposition
        │
        ├── zero-to-many matrix rows
        └── may remain evidence-only or explicitly excluded

matrix rows ── zero-to-many exported routes/states
        │
        ├── may reference stable independently-ready shared patterns
        └── may represent required production states absent from Version 5
```

The three independent classifications are:

- Production disposition: `Release In Scope`, `Project Scope — Deferred`, `Prototype Evidence Only`, `Pending Authority`, or `Explicitly Excluded`;
- Acceptance depth: `Dedicated Acceptance`, `Shared Pattern Acceptance`, `Evidence Inventory Only`, or `Not Applicable`; and
- Readiness: `Inventory Pending`, `Evidence Pending`, `Authority/Deviation Blocked`, `Acceptance Pending`, `Visual Implementation Ready`, or `Accepted Evidence Complete`.

Scope classification inherits Q04-B and only records the applicable authoritative source. It cannot create, expand, defer, or exclude product or Release scope.

Shared visual patterns require stable IDs/versions and independent authority, criteria, evidence, and readiness. A consuming screen cannot be ready before its pattern, and material local exceptions require explicit governance.

Every matrix row records its stable ID, source route/state relationships, surface/family, production disposition and authority, acceptance depth, deviations, reference evidence including missing Figma evidence, state coverage, shared pattern, accessibility/platform gate, and readiness/blocker.

The next activity is evidence/analysis population of the 42-route inventory and identification of material non-route states. Population is not automatic approval of the resulting screen set. Responsive/device baselines, accessibility acceptance, implementation, and complete evidence verification remain later Q04/readiness work.
