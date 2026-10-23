# LI — product experience refinement, 2026-10-23

Confirmed PM scope in the current UI/UX task: evolve the existing cream/forest-green presentation, without changing backend contracts, permissions, recommendation rules or data collection. This supplements the 2026-10-22 UX priority decision; its safety and business rules remain unchanged.

- Home focuses on Today, Check-in, weather and Events. Personal records, interests and Persona management remain reachable through Profile (legacy shells retain their existing shortcuts).
- Friends defaults to the existing friend list, with Activity and Discover as peer views. Keep request, ignore/undo, readback and session fences.
- Events distinguishes refreshing source data, synchronizing participation and hiding a recommendation. Existing participant group/status queries remain separate behind a unified entry.
- Reuse motion tokens and system reduced-motion settings. No dependency, API, privacy, backend, APK, device or deployment changes are authorized in this pass.

PR #169 was already merged before this pass. Continue its work branch with independently reviewable commits; do not create another PR or claim the merged PR is Draft.

Implementation boundaries: current Activity/Event DTOs provide no cover URL and Home recommendations expose no rotation cursor. Keep text-led cards and honest refresh feedback; image transport and recommendation rotation require feature-owner contract coordination. Participant previews use existing status/group queries and never infer hidden totals or scan past a sparse cursor. AI display excerpts are local to currently authorized messages, with no stored title or extra model/history call.

Icon follow-up proposal: a restrained forest-green lowercase e formed by two open, offset arcs on warm paper, representing a journal and conversation. Deliver separate adaptive foreground, background and monochrome layers and inspect launcher masks before replacing the existing asset. This pass retains the existing icon.
