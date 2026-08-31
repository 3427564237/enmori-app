# PM requirements decisions — 2026-08-31

- **Status:** Confirmed
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0831

This record preserves the PM decisions confirmed during the 2026-08-31 Project Context Extraction review. It controls current and prospective ENMORI work only within PM authority. It does not retroactively create Sponsor/Supervisor approval, alter historical COMP3851A delivery claims, or prove that earlier implementation and UAT failures were corrected.

## Decisions

1. **C1 — Report identity:** Treat the PM-supplied `ENMORI_Interim_Report_Group(1).docx` as the PM-designated COMP3851A final submission and Grade B synthesis evidence. Preserve its internal “interim group report” identity and do not elevate it above Grade A sources.
2. **C2 — Admin scope:** Preserve protected Create Interest Tag as the historical COMP3851A Sprint 5 baseline. For COMP3851B, add a bounded Flutter Admin UI for Interest Tag and Event Category CRUD, with permanent deletion blocked while a value is referenced; Recommendation Configuration Draft/Publish and version history over factors already implemented and approved in the factor registry; and preparation of auditable Pending Account Action Requests. This does not approve direct account action execution, moderation, reporting, or Admin role self-assignment. Admin access is granted out of band only by an authorized system owner.
3. **C3 — Check-in inputs:** A Check-in requires at least Note or Mood. Weather is optional contextual enrichment linked when available; weather failure must not block Check-in creation.
4. **C4 — Calendar selected date:** Selecting a date shows that user's Check-ins for the date as newest-first summaries containing time, Note/Mood, and any existing Weather, Activity, or Approx Location fields permitted for display, and can open Footprint with the same selected date.
5. **C5 — History terminology and route:** Footprint is the canonical current term. It lists all selected-date Check-ins and connects only display-permitted Approx Location points in chronological order. A Check-in without a permitted location remains in the list and creates no map point.
6. **C6 — Recent Check-in AI context:** Only consented Check-in conversational assistance may receive at most the five most recent eligible Check-ins from the preceding seven days. This window must not construct, score, or rank recommendation candidates.
7. **C7 — Product identity:** ENMORI is the current public product name, Nexus Five is the team name, and Campus Connect is obsolete historical wording retained only for traceability.
8. **C8 — Audience and positioning:** ENMORI serves a broader community audience and is not restricted to students. It is not a health-learning, diagnostic, treatment, or health-advice product.
9. **C10 — Special Care:** Any established friend is eligible for the private Special Care flag; no minimum friendship duration applies. It influences ranking/pinning only and is not a friend-recommendation eligibility input.

## Explicitly unresolved

**C9 — UAT completion:** Keep the reported 15/20 UAT snapshot and five failures open because no later retest evidence was found. Do not claim 20/20 or final UAT closure without new evidence and an accepted disposition.

## Change control

Later decisions supersede this record only rule by rule. Update `docs/SOURCE_MAP.md`, `docs/PROJECT_CONTEXT.md`, and `docs/OPEN_QUESTIONS.md` together when an affected decision changes or new evidence closes an open item.
