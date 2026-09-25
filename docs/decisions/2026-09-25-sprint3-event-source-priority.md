# PM direction — Sprint 3 Event source priority correction

- **Source ID:** S-PM-0925-S3EVENT-SOURCE
- **Status:** Confirmed by LI HOURUI, ENMORI PM, on 2026-09-25; source priority and bounded research only, not content-use approval or `Ready`
- **Scope:** Sprint 3 Event data-source sequencing under SHI's existing Event ownership
- **Earlier source retained:** [S-PM-0924-SPRINT3-COVERAGE](2026-09-24-sprint3-figma-coverage-ownership.md) selected STB TIH → Ticketmaster, with onePA as an outbound-link-only candidate
- **Execution handoff:** [Sprint 3 Event source and route review](../../ASTRA_HANDOFF_S2_VISUAL_GAP_PREP_20260923.md)

## Decision

LI changes the Sprint 3 Event-source priority to **Ticketmaster first; onePA second as a candidate Event-data source**. This replaces the earlier STB TIH → Ticketmaster order and the planning assumption that onePA is *only* an outbound link. STB TIH is no longer a planned first source: its tourism-oriented Event catalogue has not been shown to fit ENMORI's community-event goal. Meetup remains optional research only if the core Event path leaves capacity. Peatix and Eventbrite remain outbound `externalSourceUrl`-only candidates.

Ticketmaster-first means SHI checks actual Singapore Event coverage and relevance, access and content-use conditions, the minimum approved Event fields, and a usable external registration URL before treating it as a working ENMORI source. A supported country code or public event page alone does not prove the required fit or permission. In parallel, SHI may perform a bounded, read-only technical feasibility check against public onePA Event pages, without logging in or bypassing access controls, to determine whether required information and links can be extracted. If Ticketmaster fails the fit check, LI reviews this onePA evidence and the applicable use conditions before choosing the actual source; the team must not substitute synthetic records or a link-only flow and claim third-party Event ingestion is complete.

ENMORI continues to render its own Event Detail from Backend data and then opens the third-party registration page. The third party handles ticketing and payment. LI identifies ENMORI as a learning project, but that alone does not establish permission for automated bulk copying, retained storage, or redistribution of onePA content in an app. Before implementing those uses, identify a permitted basis with its actual educational scope or obtain PA permission; onePA's published terms and applicable educational-use conditions remain controlling. This decision does not approve a onePA importer, endpoint, Firestore schema, dependency, infrastructure, deployment, UAT, Release, or any `Ready`/Done claim. SHI may continue independently approved Event detail and participation work while source access is resolved. The reported Sponsor preference for onePA is preserved as a preference, not misrepresented as a formal Sponsor decision or PA content-use permission.
