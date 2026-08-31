# Project Source Map

## 1. Extraction record

- Source repository: `https://github.com/3427564237/nexus-five-project-records`
- Snapshot examined: branch `main`, commit `5d4ac26`
- Extraction date: 2026-08-31
- Coverage: all 100 tracked files were inventoried; all 21 PDFs, 57 DOCX files, 2 XLSX files, diagrams, images, Draw.io files, text files, README, and Git history/refs were examined.
- Online UI source supplied by PM: [Figma Make — 修改登陆界面](https://www.figma.com/make/UFmjpkfucM4TctMuRQfsOC/%E4%BF%AE%E6%94%B9%E7%99%BB%E9%99%86%E7%95%8C%E9%9D%A2?t=QGiRIeFYsrfwKyGw-1). The Figma connector can resolve its Make source manifest (including `src/app/App.tsx`, guidelines, styles, and image resources). It is therefore recorded as the current online UI entry point. No export is required for this extraction stage.
- External report supplied by PM: `ENMORI_Interim_Report_Group(1).docx`, 662,914 bytes, SHA-256 `e9d535e39937aa593136199ab363a8cb682a8abcb0ac2964fedf436fbf30ac12`. The source file is not stored in this repository. The PM identifies it as the COMP3851A final project report; the file itself is internally titled and tagged as an interim group report. It is recorded as a late synthesis source, not silently promoted above formal decisions.
- PM conflict dispositions recorded on 2026-08-31: C1–C8 and C10 were decided; C9 was explicitly left open. The durable record is [`docs/decisions/2026-08-31-pm-requirements-decisions.md`](decisions/2026-08-31-pm-requirements-decisions.md). These are current PM decisions and are not represented as historical Sponsor/Supervisor approvals.
- Flutter client architecture approved by PM on 2026-09-01: [`docs/decisions/2026-09-01-flutter-client-architecture.md`](decisions/2026-09-01-flutter-client-architecture.md), with canonical rules in [`ARCHITECTURE.md`](../ARCHITECTURE.md). The decision is limited to the Flutter client and leaves backend, schema, API, Firebase, UI, and algorithm choices unresolved.
- COMP3851B Release MVP boundary approved by PM on 2026-09-01: [`docs/decisions/2026-09-01-comp3851b-release-mvp.md`](decisions/2026-09-01-comp3851b-release-mvp.md). Week 9 targets a prioritized, demonstrable, testable MVP across four development Sprints, followed by three weeks of stabilization; the exact MVP feature set remains to be selected.
- No application code in this repository was treated as a requirements source, and no Flutter business code was changed.

Git upload dates are not document approval dates: nearly all records entered this repository on 2026-08-02. Dates below therefore come from the document body where available. Several Office metadata dates are unreliable, including inherited 2013 template dates.

## 2. Authority and credibility scale

| Grade | Meaning | Appropriate use |
|---|---|---|
| A | Dated explicit Sponsor/Supervisor decision, confirmed PM decision record, or latest formal requirements package | Controlling evidence within its stated scope |
| B | Reviewed derivative: traceability, UAT, final report, UI specification, or final diagram | Corroboration; cannot silently override Grade A |
| C | Early proposal/draft, implementation-oriented notes, unapproved algorithm, prototype/export, or ambiguous internal record | Historical/design evidence only |
| D | Referenced but unavailable source | Cannot substantiate a requirement |

“Final” in a filename raises relevance but does not by itself establish authority. Explicit approval language, date, authorial role, and consistency with controlling records determine credibility.

## 3. Source-of-truth hierarchy

1. Latest dated explicit Sponsor/Supervisor decisions in meeting minutes or confirmed PM/key-decision records, each only within the deciding role's stated scope. A PM decision does not retroactively become a Sponsor/Supervisor approval.
2. Latest formal Business Rules and Requirements package for the affected scope; only explicit incremental changes supersede older rules.
3. Earlier requirements that later packages explicitly freeze or leave unchanged.
4. Reports, traceability matrices, UAT/acceptance records, UI specifications, diagrams, and prototypes as supporting evidence.
5. Current implementation behavior is evidence of implementation only, never proof of a requirement.

Every supersession must retain both the old source and the new source. Conflicts are listed in `OPEN_QUESTIONS.md`, not resolved by this hierarchy when authority remains ambiguous.

## 4. Primary requirements and decision sources

| ID | Repository path | Content date / phase | Nature | Grade | Key use and caveats |
|---|---|---:|---|:---:|---|
| S-BR1 | `Sprint1/Business Rules and Requirements Lead — Sprint 1.pdf` | Sprint 1 | Formal baseline requirements | A | Account, profile, interests, consent, basic AI/recommendation baseline. |
| S-BR15 | `Sprint2/Business Rules and Requirements Lead — Sprint 1.5 + Early Sprint 2.pdf` | Sprint 1.5 / early Sprint 2 | Formal incremental package | A | Transitional rules; later Sprint 2 package controls where changed. |
| S-BR2 | `Sprint2/Business Rules and Requirements Lead — Sprint 2.pdf` | Sprint 2 | Frozen formal requirements | A | Check-in, history, privacy, events, Friends Activity, bounded AI; explicit exclusions. |
| S-BR3 | `Sprint3/Business Rules and Requirements Lead — Sprint 3.pdf` | Sprint 3 | Frozen incremental requirements | A | Weather display, friend recommendation, friend requests, profile visibility, event-interest social features; Group/chat removal. |
| S-BR4 | `Sprint4/Business Rules and Requirements Lead — Sprint 4.pdf` | Sprint 4 | Formal technical/AI package | A | Firebase/Flutter/backend boundary and AI safeguards. Gemini-specific portions are superseded by Sprint 5. |
| S-BR45 | `Sprint4/Business Rules and Requirements Lead— Sprint 4.5.pdf` | Sprint 4.5 | Formal corrective increment | A | Privacy flow, persisted weather, Going semantics, Home modules, Special Care, friend search, Persona management. Explicitly takes precedence where it conflicts with earlier Sprints. |
| S-BR5 | `Sprint5/Business Rules and Requirements Lead — Sprint 5.pdf` | Sprint 5; added 2026-08-02 | Formal final increment | A | Qwen migration and narrowly bounded Admin Create Interest Tag capability. Explicitly freezes all other listed domains. |
| S-KD5 | `Sprint5/Sprint_5_Key_Decisions_English.pdf` | Created 2026-07-21 | Consolidated confirmed Sponsor decisions | A | Sixteen decisions covering privacy, Home, Special Care, Going, search, Persona, and naming of recommendation modules. |
| S-MM-0521 | `Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-21.{docx,pdf}` | 2026-05-21 | Sponsor meeting | A/C | Early ideas; document itself says several items await Sponsor/review confirmation. Historical only unless explicitly decided. |
| S-MM-0529 | `Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-29.{docx,pdf}` | 2026-05-29 | Project meeting | B | Sprint 1 review and action record. |
| S-MM-0605 | `Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-05.{docx,pdf}` | 2026-06-05 | Sponsor meeting | A | Ordinary user chat removed; AI bounded; privacy consistency required; stack still provisional at this date. |
| S-MM-0612 | `Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-12.{docx,pdf}` | 2026-06-12 | Project meeting | B | Sprint 2 preparation/review record. |
| S-MM-0619 | `Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-19.{docx,pdf}` | 2026-06-19 | Sponsor meeting | A | Check-in foundation; Interested versus Going; external registration; no payment/verification; Group/chat/admin moderation excluded. |
| S-MM-0626 | `Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-26.{docx,pdf}` | 2026-06-26 | Project meeting | B | Sprint 3 review/action record. |
| S-MM-0703 | `Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-03.{docx,pdf}` | 2026-07-03 | Sponsor meeting | A | Small Home set, People You May Know, consent-based friendship, privacy-first data filtering, structured AI context, saved weather. |
| S-MM-0711 | `Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-11.{docx,pdf}` | 2026-07-11 | Sponsor review | A | Group removal reaffirmed; AI context limits and weather fallback. Its “friend search future” note is later superseded by Sprint 4.5. |
| S-MM-0717 | `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-17.{docx,pdf}` | 2026-07-17 | Sponsor meeting | A | Persona management, deterministic/filtered recommendations, Top 2, AI safety, and Qwen/Ollama replacement of Gemini. |
| S-MM-0724 | `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-24.{docx,pdf}` | 2026-07-24 | Sponsor review | A | Documents/prototype still under review; AI/recommendation/privacy material required revision; no extra feature expansion approved. |
| S-MM-0731 | `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-31.{docx,pdf}` | 2026-07-31 | Sponsor review | A | Only two blocking defects identified: profile interest-tag saving/changing and incorrect event records; no new feature work. |
| S-MM-0801 | `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-08-01.{docx,pdf}` | 2026-08-01 | Internal finalisation meeting | B | Records the two defects as fixed/retested and freezes the final package, but is not separately attributed to Sponsor approval. |
| S-MM-ALL | `Meeting_Minutes_Complete.pdf` | 2026-05-21–2026-08-01 | Consolidated duplicate | B | Convenient compiled copy of the twelve meetings; per-meeting files remain the traceable originals. |
| S-PM-0831 | [`docs/decisions/2026-08-31-pm-requirements-decisions.md`](decisions/2026-08-31-pm-requirements-decisions.md) | 2026-08-31 | Confirmed PM decision record | A | Resolves C1–C8 and C10 for current/future scope and explicitly leaves C9 open. This is PM authority, not evidence of an earlier Sponsor/Supervisor decision. |
| S-PM-0901 | [`docs/decisions/2026-09-01-flutter-client-architecture.md`](decisions/2026-09-01-flutter-client-architecture.md) | 2026-09-01 | Confirmed PM architecture decision | A | Approves the Flutter client architecture and Fake-auth validation slice only; does not approve backend, schema, API, Firebase, UI, or algorithm decisions. |
| S-PM-0901-MVP | [`docs/decisions/2026-09-01-comp3851b-release-mvp.md`](decisions/2026-09-01-comp3851b-release-mvp.md) | 2026-09-01 | Confirmed PM release-boundary decision | A | Defines Week 9 as a prioritized, demonstrable, testable COMP3851B Release MVP after four development Sprints, followed by three stabilization weeks; it does not select the MVP feature set. |

No separately attributable Supervisor decision was found. References to supervision or review do not identify an explicit Supervisor ruling.

## 5. Late reports, traceability, backlog, and test evidence

| ID | Repository path(s) | Phase | Nature | Grade | Key use and caveats |
|---|---|---|---|:---:|---|
| S-AI1–4 | `Sprint1/Sprint_1_AI_Report_Final.docx` through `Sprint4/Sprint_4_AI_Report_Final.docx` | Sprints 1–4 | AI reports | B | Useful evolution record. Earlier provider/model claims are superseded by Qwen decisions. |
| S-AI5 | `Sprint5/Sprint_5_AI_and_Admin_Report_Final.docx` | Sprint 5; Office modified 2026-07-30 | “Final Delivery” report | B | Claims broader Admin CRUD/account administration and cites missing `Sprint 5 edit.pdf`; directly conflicts with S-BR5. |
| S-TRACE5 | `Sprint5/Four_Sprints_AI_Complete_Requirement_Traceability_Matrix_Final.xlsx` | Sprint 5 | Final traceability matrix | B | Also carries broader Admin capabilities. Traceability is derivative, not controlling when inconsistent with S-BR5. |
| S-ALG4 | `Sprint4/algorithm_homepage.docx` | Office modified 2026-07-20 | Algorithm proposal/specification | C | Provides exact weights, decay, normalization, and tie-breakers not approved in formal BRs; also uses legacy Booked semantics. |
| S-T1 | `Sprint1/Sprint 1 test/*` | Sprint 1 | 13 PBI/AC/UAT/entity-note DOCX files + MiniERD | B/C | Contains the only explicit Sprint 1 backlog/PBIs. Some no-interest/fallback cases failed or remained unresolved. |
| S-T2 | `Sprint2/Sprint 2 test/*` | Sprint 2 | AC, UAT, traceability, data notes, MiniERD | B/C | Friends-only sharing and delete-propagation evidence is incomplete/failed in the recorded browser session. |
| S-T3 | `Sprint3/Sprint 3 test/*` | Sprint 3 | AC, UAT, traceability, data notes, MiniERD | B/C | Empty recommendation and permission-denied states were not successfully evidenced. |
| S-T4 | `Sprint4/Sprint 4 test/*` | Sprint 4 | AC, UAT, traceability, data dictionary, MiniERD | B/C | Consent wording and Footprint/date-filter inconsistencies remain in UAT. |
| S-T5 | `Sprint5/Sprint 5 test/*` | Sprint 5 | AC, UAT, ERD/MiniERD | B/C | Records missing selected-date calendar detail and residual Campus Connect branding. ERD contains legacy naming and is not an approved data-model authority. |
| S-FR1 | External PM-supplied file `ENMORI_Interim_Report_Group(1).docx`; SHA-256 `e9d535e39937aa593136199ab363a8cb682a8abcb0ac2964fedf436fbf30ac12` | OOXML created/modified 2026-08-01 18:01 UTC (2026-08-02 02:01 Singapore); supplied 2026-08-31 | PM-designated COMP3851A final project report; internally labelled interim group report | B | The source file is not stored in this repository. It is a ten-page late synthesis covering scope, Check-in/Footprint/Calendar, Admin/AI, testing, privacy, diagrams, and references. No signatures, comments, tracked changes, or explicit Supervisor ruling were found. It corroborates but cannot override Grade A decisions. |
| S-HOURS | `Hours_on_Project.xlsx` | Whole project | Effort log | B | Project administration evidence; not a requirements source. |
| S-GANTT | `Diagrams/Gantt_Chart.png`, `Diagrams/Gantt_Sprint1.png` … `Gantt_Sprint5.png` | Whole project | Planning exports | C | Schedule evidence only. No standalone Project Plan was found. |

## 6. UI and diagram sources

| ID | Repository path / link | Phase | Nature | Grade | Key use and caveats |
|---|---|---|---|:---:|---|
| S-FIGMA | [Figma Make — 修改登陆界面](https://www.figma.com/make/UFmjpkfucM4TctMuRQfsOC/%E4%BF%AE%E6%94%B9%E7%99%BB%E9%99%86%E7%95%8C%E9%9D%A2?t=QGiRIeFYsrfwKyGw-1) | Current link supplied 2026-08-31 | Online UI source | B | PM-designated sole front-end/UI link. Make source manifest is accessible. It is a design source, not authority for business-rule changes. |
| S-UI5 | `UI design/Sprint 5 ui.docx` | Sprint 5 | Detailed UI specification | B | Twenty screen/interaction directives largely align with Sprint 4.5/S-KD5. |
| S-UIMAP | `UI design/Requirement-to-Screen Mapping.png` | Early UI | Mapping export | C | Contains early Group-related screens later removed from scope. |
| S-UIS1 | `UI design/Revised Sprint 1 UI Screens.jpg`, `UI design/Sprint 1 Screen Flow.png` | Sprint 1 | UI exports | C | Historical UI only; not the final baseline. |
| S-UIMAKE | `UI design/Campus Connect Al Screenflow.png` | Later UI export | 30-screen flow export | B/C | Rich screen evidence, but branded Campus Connect and not independently approval-stamped. |
| S-UCD | `Diagrams/Use_Case_Diagram.png` | Final records | Final use-case diagram | B | Excludes Group/chat/admin moderation/live GPS/in-app booking; corroborates core scope. |
| S-CD | `Diagrams/Class_Diagram.png` | Final records | Final class diagram | B | Corroborates core entities but omits Admin/Interest Tag administration. It must not become a data-model decision. |

The repository itself contains no Figma URL. The PM-supplied Figma Make link fills that provenance gap for the current UI entry point. Because this stage does not implement or visually validate screens, no PNG/PDF export is currently necessary. A node-specific `/design/` link or explicit exports may be required later for pixel-accurate Flutter implementation or approval evidence.

## 7. Material sources not found

| Missing item | Evidence and impact | Status |
|---|---|---|
| COMP3851A Project Proposal | Mentioned historically, but no standalone proposal exists in files, branches, tags, or reachable history. | Unavailable (D) |
| Project Plan | S-BR5 refers to an “earlier Project Plan,” but no plan document exists. Gantt images are not a substitute. | Unavailable (D) |
| `Sprint 5 edit.pdf` | Cited as authoritative by S-AI5/S-TRACE5, but absent from the repository and history. | Unavailable (D); central to Admin conflict |
| Original Figma design file / approval history | Current source is a Figma Make link; repository exports have no live link or approval metadata. | Partially supplied; approval state unknown |
| Explicit Supervisor rulings | No decision is separately attributed to a Supervisor. | Not found |

## 8. Provenance warnings

- DOCX and PDF versions of meeting minutes are duplicates, not independent confirmations.
- “Passed” in several UAT documents sometimes coexists with “not tested in this browser session”; those rows are weak test evidence.
- UI exports, ERDs, class diagrams, and implementation reports cannot introduce business behavior absent from formal or separately confirmed Sponsor/Supervisor/PM decisions.
- Product labels vary among **Nexus Five**, **ENMORI**, and **Campus Connect**. S-PM-0831 resolves the current public product name as **ENMORI**, while preserving the other labels as historical evidence.
- S-FR1 is outside the source repository. Its OOXML title is `ENMORI: AI-Supported Community Check-in and Event Connection Platform`, its subject is `COMP3851A Interim Report Group Section`, and its keywords include `interim report`. The PM-supplied “final report” identity and the file’s internal “interim” identity must both remain visible.
- The Figma Make source is React/Tailwind-oriented reference material. It must not be copied into Flutter or treated as an architecture decision.

## 9. Complete file-level inventory

The tables above describe logical sources and authority. This appendix accounts for every tracked file, including supporting files grouped above. “Sprint date” means the Sprint/meeting date stated by path or body; where no document date exists, upload time is not substituted for an approval date.

S-FR1 is not inserted into the tracked-file inventory below because it is an external PM-supplied file. S-PM-0831 and S-PM-0901 are tracked in this application repository, but are outside the separately inventoried `nexus-five-project-records` snapshot.

| Files | Date | Nature | Grade |
|---|---|---|:---:|
| `.gitignore` | Undated | Repository configuration, not project evidence | — |
| `README.md` | Final repository snapshot | Records overview, not a final report | B |
| `Hours_on_Project.xlsx` | Whole project; no reliable approval date | Effort log | B |
| `Meeting_Minutes_Complete.pdf` | 2026-05-21–2026-08-01 | Compiled duplicate of meeting minutes | B |
| `Diagrams/Class_Diagram.png`<br>`Diagrams/Use_Case_Diagram.png` | Final records; no embedded approval date | Final diagram exports | B |
| `Diagrams/Gantt_Chart.png`<br>`Diagrams/Gantt_Sprint1.png`<br>`Diagrams/Gantt_Sprint2.png`<br>`Diagrams/Gantt_Sprint3.png`<br>`Diagrams/Gantt_Sprint4.png`<br>`Diagrams/Gantt_Sprint5.png` | Project/Sprints 1–5; no embedded approval date | Schedule exports | C |
| `Sprint1/Business Rules and Requirements Lead — Sprint 1.pdf` | Sprint 1 | Formal requirements | A |
| `Sprint1/Sprint_1_AI_Report_Final.docx` | Sprint 1 | AI report | B |
| `Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-21.docx`<br>`Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-21.pdf` | 2026-05-21 | Same Sponsor meeting in two formats | A/C |
| `Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-29.docx`<br>`Sprint1/Meeting_Minutes/Meeting_Minutes_2026-05-29.pdf` | 2026-05-29 | Same project meeting in two formats | B |
| `Sprint1/Sprint 1 test/01 Sprint 1 Product Backlog Items (PBIs).docx`<br>`Sprint1/Sprint 1 test/02 Detailed Sprint 1 UAT Scenarios.docx`<br>`Sprint1/Sprint 1 test/04 Sprint 1 Acceptance Criteria.docx` | Sprint 1; no reliable document date | Backlog, UAT, acceptance evidence | B |
| `Sprint1/Sprint 1 test/03 MiniERD.docx`<br>`Sprint1/Sprint 1 test/Sprint 1 MiniERD.drawio` | Sprint 1; no reliable document date | Data-design evidence | C |
| `Sprint1/Sprint 1 test/05 PBI-4 Basic Suggestions - Acceptance Scenario Evidence.docx`<br>`Sprint1/Sprint 1 test/08 Recommendation Explanation UAT.docx`<br>`Sprint1/Sprint 1 test/09 AI Data Consent Behaviour Traceability.docx`<br>`Sprint1/Sprint 1 test/11 Basic Profile UAT.docx`<br>`Sprint1/Sprint 1 test/12 Interest Selection UAT.docx` | Sprint 1; no reliable document date | Acceptance/UAT/traceability evidence | B |
| `Sprint1/Sprint 1 test/06 Recommendation Entity Notes.docx`<br>`Sprint1/Sprint 1 test/07 AIConversation Entity Notes.docx`<br>`Sprint1/Sprint 1 test/10 UserProfile Entity Notes.docx`<br>`Sprint1/Sprint 1 test/13 InterestTag Entity Notes.docx` | Sprint 1; no reliable document date | Entity/design notes | C |
| `Sprint2/Business Rules and Requirements Lead — Sprint 1.5 + Early Sprint 2.pdf`<br>`Sprint2/Business Rules and Requirements Lead — Sprint 2.pdf` | Sprint 1.5 / Sprint 2 | Formal requirements | A |
| `Sprint2/Sprint_2_AI_Report_Final.docx` | Sprint 2 | AI report | B |
| `Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-05.docx`<br>`Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-05.pdf` | 2026-06-05 | Same Sponsor meeting in two formats | A |
| `Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-12.docx`<br>`Sprint2/Meeting_Minutes/Meeting_Minutes_2026-06-12.pdf` | 2026-06-12 | Same project meeting in two formats | B |
| `Sprint2/Sprint 2 test/Acceptance Criteria.docx`<br>`Sprint2/Sprint 2 test/UAT Test Scenarios.docx`<br>`Sprint2/Sprint 2 test/Final_Traceability_Matrix.docx` | Sprint 2; no reliable document date | Acceptance/UAT/traceability evidence | B |
| `Sprint2/Sprint 2 test/CheckIn Mood Location Data Notes.docx`<br>`Sprint2/Sprint 2 test/Event and EventInterest Data Notes.docx`<br>`Sprint2/Sprint 2 test/PrivacySetting and FriendVisibility Data Notes.docx` | Sprint 2; no reliable document date | Data/entity notes | C |
| `Sprint2/Sprint 2 test/miniERD.docx`<br>`Sprint2/Sprint 2 test/Sprint 2 MiniERD.drawio` | Sprint 2; no reliable document date | Data-design evidence | C |
| `Sprint3/Business Rules and Requirements Lead — Sprint 3.pdf` | Sprint 3 | Formal requirements | A |
| `Sprint3/Sprint_3_AI_Report_Final.docx` | Sprint 3 | AI report | B |
| `Sprint3/s3uiuxProblem.txt` | Sprint 3; undated | UI issue notes | C |
| `Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-19.docx`<br>`Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-19.pdf` | 2026-06-19 | Same Sponsor meeting in two formats | A |
| `Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-26.docx`<br>`Sprint3/Meeting_Minutes/Meeting_Minutes_2026-06-26.pdf` | 2026-06-26 | Same project meeting in two formats | B |
| `Sprint3/Sprint 3 test/Final_Sprint3_Traceability_Matrix.docx`<br>`Sprint3/Sprint 3 test/Sprint3_Acceptance Criteria.docx`<br>`Sprint3/Sprint 3 test/Sprint3_UAT Test Scenarios.docx` | Sprint 3; no reliable document date | Traceability/acceptance/UAT evidence | B |
| `Sprint3/Sprint 3 test/Sprint3_CheckInWeather_AI_Location.docx`<br>`Sprint3/Sprint 3 test/Sprint3_FriendRecommendation_EventSocial.docx`<br>`Sprint3/Sprint 3 test/Sprint3_Profile_FriendRequest_Friendship.docx` | Sprint 3; no reliable document date | Feature/data notes | B/C |
| `Sprint3/Sprint 3 test/Sprint3_miniERD.docx`<br>`Sprint3/Sprint 3 test/Sprint3_Incremental_MiniERD.drawio` | Sprint 3; no reliable document date | Data-design evidence | C |
| `Sprint4/Business Rules and Requirements Lead — Sprint 4.pdf`<br>`Sprint4/Business Rules and Requirements Lead— Sprint 4.5.pdf` | Sprint 4 / 4.5 | Formal requirements | A |
| `Sprint4/Sprint_4_AI_Report_Final.docx` | Sprint 4 | AI report | B |
| `Sprint4/algorithm_homepage.docx` | Office modified 2026-07-20 | Detailed algorithm proposal | C |
| `Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-03.docx`<br>`Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-03.pdf` | 2026-07-03 | Same Sponsor meeting in two formats | A |
| `Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-11.docx`<br>`Sprint4/Meeting_Minutes/Meeting_Minutes_2026-07-11.pdf` | 2026-07-11 | Same Sponsor review in two formats | A |
| `Sprint4/Sprint 4 test/Sprint4_Acceptance_Criteria.docx`<br>`Sprint4/Sprint 4 test/Sprint4_Traceability_Matrix.docx`<br>`Sprint4/Sprint 4 test/Sprint4_UAT_Test_Scenarios.docx` | Sprint 4; no reliable document date | Acceptance/traceability/UAT evidence | B |
| `Sprint4/Sprint 4 test/Sprint4_CheckInWeather_AI_Location.docx`<br>`Sprint4/Sprint 4 test/Sprint4_FriendRecommendation_EventSocial.docx`<br>`Sprint4/Sprint 4 test/Sprint4_Profile_FriendRequest_Friendship.docx` | Sprint 4; no reliable document date | Feature/data notes | B/C |
| `Sprint4/Sprint 4 test/Database_Data_Dictionary.docx`<br>`Sprint4/Sprint 4 test/Sprint4_miniERD.docx` | Sprint 4; no reliable document date | Data-design evidence | C |
| `Sprint5/Business Rules and Requirements Lead — Sprint 5.pdf` | Sprint 5; added 2026-08-02 | Formal requirements | A |
| `Sprint5/Sprint_5_Key_Decisions_English.pdf` | Created 2026-07-21 | Confirmed decision record | A |
| `Sprint5/Sprint_5_AI_and_Admin_Report_Final.docx` | Office modified 2026-07-30 | Final-labelled AI/Admin report | B |
| `Sprint5/Four_Sprints_AI_Complete_Requirement_Traceability_Matrix_Final.xlsx` | Sprint 5; no reliable approval date | Final traceability matrix | B |
| `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-17.docx`<br>`Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-17.pdf` | 2026-07-17 | Same Sponsor meeting in two formats | A |
| `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-24.docx`<br>`Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-24.pdf` | 2026-07-24 | Same Sponsor review in two formats | A |
| `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-31.docx`<br>`Sprint5/Meeting_Minutes/Meeting_Minutes_2026-07-31.pdf` | 2026-07-31 | Same Sponsor review in two formats | A |
| `Sprint5/Meeting_Minutes/Meeting_Minutes_2026-08-01.docx`<br>`Sprint5/Meeting_Minutes/Meeting_Minutes_2026-08-01.pdf` | 2026-08-01 | Same internal finalisation meeting in two formats | B |
| `Sprint5/Sprint 5 test/Sprint5_Acceptance_Criteria.docx`<br>`Sprint5/Sprint 5 test/Sprint5_UAT_Test_Scenarios.docx` | Sprint 5; no reliable document date | Acceptance/UAT evidence | B |
| `Sprint5/Sprint 5 test/Sprint5_MiniERD.docx`<br>`Sprint5/Sprint 5 test/ERD.drawio`<br>`Sprint5/Sprint 5 test/Sprint 5 ERD.png` | Sprint 5; no reliable document date | Data-design evidence | C |
| `UI design/Sprint 5 ui.docx` | Sprint 5 | Detailed UI specification | B |
| `UI design/Campus Connect Al Screenflow.png` | Later UI; no approval date | 30-screen UI export | B/C |
| `UI design/Requirement-to-Screen Mapping.png`<br>`UI design/Revised Sprint 1 UI Screens.jpg`<br>`UI design/Sprint 1 Screen Flow.png` | Early/Sprint 1 | Historical UI exports | C |
