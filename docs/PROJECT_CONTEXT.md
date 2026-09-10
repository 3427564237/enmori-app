# Project Context — Evidence Extraction

## 1. Status and interpretation rules

This is a source-grounded extraction from the project-records repository at commit `5d4ac26`, the PM-supplied COMP3851A report S-FR1, and the confirmed PM decision records listed in `docs/SOURCE_MAP.md`, including the project-wide governance correction S-PM-0902-GOV. It is not an implementation plan. Source IDs refer to `docs/SOURCE_MAP.md`.

The controlling governance is S-PM-0902-GOV: applicable Sponsor/Supervisor authority is above PM-controlled project decisions within its scope; PM decisions govern delegated, implementation-detail, and otherwise-undecided matters without silently overriding a conflicting higher authority. A later date alone never constitutes supersession. Compatible same-tier specificity may coexist; an actual same-tier conflict requires explicit competent supersession or a new authoritative resolution. Old and new rules remain in the change trail.

Confidence labels:

- **Confirmed**: supported by an applicable authoritative source under S-PM-0902-GOV and not materially contradicted by an equal/higher authority.
- **Confirmed change**: a later authoritative source explicitly replaces an earlier rule; both are recorded.
- **Confirmed PM decision**: explicitly approved by the PM on 2026-08-31 for current or future scope; it does not retroactively become a Sponsor/Supervisor decision.
- **Blocked by conflict**: authoritative and derivative/final-looking records disagree enough that implementation must wait.
- **Unconfirmed/deferred**: proposed, inferred, design-only, technically detailed beyond approval, or explicitly deferred.

## 2. Product purpose and confirmed scope

**ENMORI** is a privacy-aware community application centered on Check-ins, interest/event discovery, and lightweight social connection. It helps a signed-in community user record personal activity/mood context, review their own history, discover relevant events and people, see permitted friend activity, and receive bounded AI-assisted explanations or conversational presentation of already-authorized information. The target audience is not restricted to students, and ENMORI is not a health-learning, diagnostic, treatment, or health-advice platform. [S-BR2, S-BR3, S-BR45, S-BR5, S-UCD, S-FR1 pp. 1–4, S-PM-0831]

The current public product name is **ENMORI**. **Nexus Five** is the project team name. **Campus Connect** is an obsolete historical product label retained only for traceability. [S-FR1 p. 1, S-T5, S-UIMAKE, S-PM-0831]

### 2.1 Confirmed in scope

| Area | Confirmed capability | Primary evidence |
|---|---|---|
| Account and onboarding | Email/password sign-up and login; profile and interest selection; initial AI/data consent and privacy selection; continued entry is allowed after either Accept or Reject. | S-BR1, S-BR4, S-BR45, S-KD5 |
| Profile and interests | View/edit own profile and selected interests; interest tags are a controlled catalogue used across profile, events, recommendations, and AI context. | S-BR1, S-BR5, S-MM-0731/0801 |
| Check-in | Create a timestamped Check-in with at least a Note or Mood; Weather is linked when available but failure does not block creation; optional permitted approximate location/context; delete own Check-in and propagate removal from dependent views. | S-BR2, S-BR45, S-MM-0711, S-FR1 p. 3, S-PM-0831 |
| History and reflection | Monthly Check-in Calendar with selected-date details; **Footprint** history with selectable dates, permitted approximate-location points/routes, and Check-in details; mood/activity heatmap for self-reflection without diagnosis. | S-BR2, S-T4, S-T5, S-FR1 pp. 3, 7, S-PM-0831 |
| Weather | Display weather context and, after Sprint 4.5, persist/link it to the Check-in under the same privacy access as that Check-in. Failure or fallback must not block Check-in. | S-BR3, S-BR45, S-MM-0711 |
| Events | Recommend/list events, show details, mark **Interested** and **Going** independently, expose permission-filtered interested people, and open third-party registration. | S-BR2, S-BR3, S-BR45, S-KD5 |
| External registration | After returning from a third-party registration page, ask the user to confirm Yes/No. Yes records Going/Booked business state; No leaves it unchanged. Opening a link is not proof of booking. | S-BR45, S-KD5 |
| Friends | Send/receive/accept/decline friend requests; friendship exists only after acceptance; show a permission-filtered friend page and Friends Activity. | S-BR3, S-BR45 |
| Search and discovery | “Search My Friends” searches the current user's established friends by name. “Add Friend” is separate and accepts only the target's canonical user-facing Username for direct lookup; internal AccountId and DisplayName are not Add Friend lookup keys. Friend Recommendation is separate from active search. | S-BR45, S-KD5, S-PM-0902-Q18 |
| Special Care | A user may privately flag any established friend as Special Care; no minimum friendship duration applies. It causes no notification and is a ranking weight/pinning rule, not an eligibility filter and not an input to friend recommendation. | S-BR45, S-KD5, S-FR1, S-PM-0831 |
| Home | Three relevant modules: Event Recommendation, Friend Recommendation/People You May Want To Know, and Friends Activity. Each shows Top 2 plus See All; Friends Activity appears immediately after Check-in. | S-BR45, S-KD5 |
| Persona | Create, select, edit, and delete up to five user-defined Persona configurations; one is active after explicit confirmation. Persona controls presentation style, not eligibility, authorization, or deterministic ranking. | S-BR45, S-MM-0717, S-KD5 |
| AI assistant | Bounded conversational assistance/explanations using authorized, minimized, structured context. For consented Check-in conversation assistance only, context may include at most the five most recent eligible Check-ins from the preceding seven days. This window must not generate or rank recommendation candidates. | S-BR2, S-BR4, S-BR5, S-FR1 p. 4, S-PM-0831 |
| COMP3851A restricted Admin baseline | The frozen Sprint 5 baseline permits only protected creation of an Interest Tag and excludes an Admin UI and broader lifecycle. This remains the historical COMP3851A rule and completion baseline. | S-BR5 |
| COMP3851B Admin increment | A Flutter Admin UI supports controlled management of Interest Tags, Event Categories, Recommendation Configurations, and preparation of auditable account-action requests. This is a new 2026-08-31 PM requirement and does not retroactively change COMP3851A scope or completion claims. | S-FR1 pp. 4, 7, S-AI5, S-TRACE5, S-PM-0831 |

### 2.2 Confirmed out of scope

| Excluded capability | Evidence / qualification |
|---|---|
| Groups, group management, group chat, and Group discovery | Removed in Sprint 3 and reaffirmed later. [S-BR3, S-MM-0619, S-MM-0711] |
| Ordinary user-to-user chat, private messaging, and internal event discussion | Removed/excluded; AI conversation is not a replacement social chat channel. [S-MM-0605, S-BR2, S-BR3] |
| In-app event booking, payment, or verification of third-party completion | Only third-party redirection plus explicit user confirmation is in scope. [S-BR2, S-BR45, S-KD5] |
| Precise, live, continuous, or background location tracking | Only permission-filtered approximate context may be used. [S-BR2, S-BR4, S-MM-0717] |
| Mental-health inference, diagnosis, treatment, medical/psychological/legal advice, or emergency decision-making | AI and heatmaps are bounded to wellbeing-oriented reflection/presentation. [S-BR2, S-BR4, S-BR5] |
| Admin moderation, content review/approval/rejection, and user reporting | Still excluded. Neither S-FR1 nor S-PM-0831 approves content moderation or reporting. |
| Direct execution of Disable, Suspend, Delete, or Restore account actions | COMP3851B Admin may only prepare an auditable Pending request. Approval authority, workflow, execution, and account-deletion effects remain unapproved. [S-PM-0831] |
| Self-service Admin access or Admin-to-Admin role assignment | Admin role assignment remains a controlled out-of-band action by an authorized system owner. [S-PM-0831] |
| Arbitrary recommendation algorithms, formulas, expressions, plug-ins, or new data sources created through Admin UI | Admin may configure only factors already implemented and approved in the factor registry. New algorithms/data sources require separate requirements and architecture approval. [S-PM-0831] |
| Automatic model routing/failover and end-user model choice | Qwen 4B is manual development/low-spec alternative only. [S-BR5] |
| Social/SingPass/biometric/anonymous authentication | Formal technical scope uses Firebase email/password authentication. [S-BR4] |
| Physical server fleet, Kubernetes, microservices, or enterprise infrastructure | Excluded by the formal COMP3851A serverless baseline; this does not approve a detailed COMP3851B architecture. [S-BR4] |

### 2.3 COMP3851B Week 9 Release priority

S-PM-0901-SCOPE makes the following confirmed capabilities **Must** for the Week 9 Release MVP: bounded AI Assistant, Event Recommendation, Friend Recommendation, Friends Activity ranking, and Persona create/read/update/delete, selection, and activation. This priority is incremental to the previously reviewed core demonstration flow for user entry, profile/interests/privacy, Check-in, event interaction, Calendar, and Footprint. [S-PM-0901-SCOPE]

Admin Recommendation Configuration remains in the wider confirmed COMP3851B scope as **Should / Not Ready**. It is not a Week 9 Must and must not block implementation of a separately approved deterministic v1 recommendation design. [S-PM-0901-SCOPE]

Must denotes Release priority only. The affected production PBIs remain Blocked / Not Ready until their applicable Backend/Auth/Data/API, field-allowlist, recommendation-formula, Persona-lifecycle, AI-retention, fallback, Qwen-runtime, UI-baseline, testing, owner/reviewer, estimation, and platform-evidence gates are resolved. No such unresolved detail is approved by priority alone. [S-PM-0901-SCOPE]

S-PM-0902-BR01 keeps Q18 Add Friend/Friend Request outside the Week 9 mandatory Release scope without invalidating historical COMP3851A/Sprint 3 requirements or the accepted gated UAT design. It selects RMVP-01A—authenticated entry, initial privacy/consent and one first persisted Note-only or Mood-only Check-in variant—as the first production refinement target, while retaining Weather, delete propagation, Calendar and Footprint as subsequent slices. RMVP-01A remains Not Ready until its exact variant/paths, physical contract, Q04, estimates, assignments, tests and platform gates are resolved. [S-PM-0902-BR01]

S-PM-0902-IOS01 makes Week 9 product implementation, product evidence and product UAT Android-only and defers the complete iOS product implementation until after Week 9. ENMORI remains a dual-platform Flutter target, but Week 9 is not a completed dual-platform Release. This timing correction leaves ENABLER-A01's separate architecture-only iOS evidence gate unchanged; its required UAT-B-0902-R2 platform amendment was subsequently approved by S-PM-0903-UAT02. [S-PM-0902-IOS01, S-PM-0903-UAT02]

S-PM-0903-UAT02 approves UAT-B-0902-R2's exact Week 9 platform mapping: 45 mandatory Android/shared base cases, deferred `X-05` and iOS product instances, and unchanged `CORE-16`/Q18 gates. It resolves Q-32 but records no executed result: every case remains Not Run, production Ready remains empty, and no Sprint, later iOS schedule, external status write, or Release acceptance is approved. [S-PM-0903-UAT02]

S-PM-0903-RMVP01A-SEL selects RMVP-01A's product path: new-member Firebase email/password registration with onboarding Username; both `Accept → Public` and `Reject → Private`; and a Note-only first Check-in. Mood, Weather, Activity, Approx Location, AI, deletion, Calendar, Footprint and iOS product work remain outside this slice. Q-33 now holds the proposed physical API/schema/error/UI/test contract; RMVP-01A is still Not Ready. [S-PM-0903-RMVP01A-SEL]

S-PM-0903-RMVP01A-R2DIR approves only the direction for an amended Q-33 R2: onboarding stores current `checkInVisibility`, its committed idempotency result shares the successful Firestore transaction, and Q18-B's current Username no-release/no-reuse rule remains controlling. The 500-grapheme Note rule and 24-hour idempotency window are accepted for R2. At issuance R1 was not finally approved and Q-33 remained Open; S-PM-0903-RMVP01A-CONTRACT subsequently approved R2 exactly. [S-PM-0903-RMVP01A-R2DIR]

S-PM-0903-RMVP01A-CONTRACT approves RMVP-01A-CONTRACT-PREVIEW-0903-R2 exactly and resolves Q-33 at the requirement-contract level. The approved contract fixes the bounded onboarding, current Check-in visibility, Note-only create/later-read, physical REST/JSON and logical Firestore records, stable errors, UI projection, and test/evidence boundary. RMVP-01A remains Not Ready pending Q04, dependencies, accepted estimates/assignments, controlled prerequisites and Android execution commitment; no Sprint, implementation, external write, UAT Pass or Release acceptance follows. [S-PM-0903-RMVP01A-CONTRACT]

S-PM-0903-RMVP01A-STAFF-REV rejects the first RMVP-01A `20 / 20 / 16 / 16 / 6` task-hour proposal while retaining 78h for a revised approximately balanced preview. It prospectively adds legitimate-work workload balance to team planning, prohibits scope padding, requires independent review of every JIN-authored/executed artifact, and requires A01's historical `14 / 2 / 4 / 4 / 0` allocation to be re-evaluated before later scheduling. The revised allocations remain proposals and RMVP-01A remains Not Ready. [S-PM-0903-RMVP01A-STAFF-REV]

S-PM-0903-RMVP01A-STAFF-R2DIR accepts that balanced envelope and its substantive responsibilities in principle but rejects the first revised table's circular/redundant review topology. It directs an acyclic implementation/test → component-review → JIN overall-gate → LI terminal-review graph, excludes JIN's own R12–R14 artifacts from JIN's approval scope, and keeps A01 plus the proposed `8 SP` outside the pending RMVP-01A staffing approval. Staffing remains Proposed and RMVP-01A remains Not Ready. [S-PM-0903-RMVP01A-STAFF-R2DIR]

S-PM-0903-RMVP01A-STAFF subsequently approves the corrected 78h R1–R16 staffing table, balanced `16 / 16 / 15 / 15 / 16` member envelope, LI PBI ownership, JIN overall-review role and acyclic review topology exactly. It does not approve the proposed `8 SP`, A01, Ready, Sprint execution, implementation or external writes. RMVP-01A remains Not Ready pending its separate estimate and affected Q04, dependency, controlled-environment, Android-commitment and A01-sequencing gates. [S-PM-0903-RMVP01A-STAFF]

S-PM-0903-RMVP01A-EST subsequently approves RMVP-01A at `8 SP` as a relative complexity/uncertainty estimate for the bounded vertical outcome, explicitly without conversion from the approved 78h task plan. Later scope or dependency growth above 8 SP requires splitting and re-estimation. RMVP-01A remains Not Ready pending affected Q04, dependency, controlled-environment, Android-commitment and A01-sequencing gates; no Sprint, implementation or external write follows. [S-PM-0903-RMVP01A-EST]

S-PM-0903-Q04-RMVP01A-R1 approves the exact bounded Q04 entry/core R1: Q04-DEV-15/23/24, detailed M02/M06/M07/M08-shell/M19-note/M20 states and public copy, slice-scoped SP-01/05/06, and the Android responsive/accessibility acceptance baseline. It resolves the authority/content portion of RMVP-01A's affected Q04 gate only. Provenance/captures, production-state representations, responsive/accessibility execution and traceability evidence remain Pending; no matrix row is Visual Implementation Ready and RMVP-01A remains Not Ready. [S-PM-0903-Q04-RMVP01A-R1]

S-PM-0903-RMVP01A-START subsequently applies a bounded proportional-governance correction: RMVP-01A is Ready and enters delivery setup; necessary A01 validation is absorbed into the approved 78h work rather than scheduled as a separate 24h item. Compatible dependency choices, controlled emulator setup, bounded Q04 execution evidence and exact Android evidence remain mandatory Done conditions instead of start blockers. Product code is held until the stable baseline is pushed and GitHub/Notion team publication is complete. [S-PM-0903-RMVP01A-START]

S-SPONSOR-0910-RMVP01A-A11Y-DEFER subsequently removes the remaining accessibility-specific execution and evidence, including human audible TalkBack traversal, from the current RMVP-01A Sprint/Increment closure gate. LI HOURUI explicitly relayed and recorded this as a Sponsor decision. Deferred rows remain `Not Run — Deferred`; the earlier Q04 accessibility baseline, implementation, tests and evidence are retained for future work. Functional bounded UAT, non-accessibility Q04 evidence, higher non-waivable obligations, Release acceptance and all other Done gates remain unchanged. [S-SPONSOR-0910-RMVP01A-A11Y-DEFER]

## 3. Functional requirements

The following are normalized statements, not newly invented official requirement IDs.

### 3.1 Account, profile, and consent

- The user can register and sign in with email/password and manage their own profile/interests. [S-BR1, S-BR4]
- Initial privacy choice presents Accept and Reject. Accept establishes Public; Reject establishes Private; either permits app entry. Friends-only is available later in Settings. [S-BR45, S-KD5]
- Profile viewing and social exposure must obey the profile owner’s Public/Friends-only/Private setting. [S-BR3, S-BR45]
- The two final blocking defects reported on 2026-07-31—interest-tag save/change and incorrect event records—were recorded as fixed/retested internally on 2026-08-01. This is implementation-status evidence, not a new requirement. [S-MM-0731, S-MM-0801]

### 3.2 Check-in and history

- A Check-in requires at least one of note or mood and receives a timestamp. [S-BR2]
- Weather is saved/linked when available under the Check-in's existing privacy rules. Weather unavailability or lookup failure must not block Check-in creation. Weather is context, not a third required input. [S-BR45, S-MM-0711, S-FR1 p. 3, S-PM-0831]
- Q13-A selects Open-Meteo for the controlled non-commercial Week 9 Release through a Backend-only adapter. It uses only explicitly permitted Approx Location quantized to a 0.1-degree grid, discloses that the coordinate crosses to an external provider subject to then-current provider-side logging/retention, and makes compliant nearby Open-Meteo/CC BY attribution mandatory wherever its Weather data are displayed. [S-PM-0902-Q13]
- Q13-B permits one monotonic two-second current-Weather attempt per logical Check-in creation, explicitly requests Unix UTC time, validates declared Celsius/WMO units and a -30/+15-minute freshness window, and performs no automatic retry, background lookup, or later backfill. Any Weather failure leaves an otherwise valid Check-in creatable without Weather. [S-PM-0902-Q13]
- Q13-C freezes `weather_projection_v1` with minimal source/time/one-decimal-Celsius/nine-condition semantics, decimal half-away-from-zero rounding, and no retrospective remapping. Weather inherits Check-in authority/lifecycle; permission withdrawal is race-safe; Qwen receives only the fixed safe condition label. [S-PM-0902-Q13]
- Q13-D fixes deterministic Weather display/attribution and canonical links, extends application-owned attribution to materially Weather-derived Q17 output, uses enrichment applicability for transient no-Weather copy, excludes commercial Free API use and broader Weather features, and defines mandatory Release evidence. [S-PM-0902-Q13]
- Approximate location/context is optional and consent-dependent; precise/live/background location is prohibited. [S-BR2]
- Check-in uses the already-saved privacy state read-only; it must not introduce a second location-visibility default or independent location-privacy toggle. [S-BR45, S-KD5]
- Deleting a Check-in must remove it from dependent Calendar, Footprint, Friends Activity, Map, and Heatmap views. [S-BR2, S-PM-0831]
- Calendar supports month-level review. Selecting a marked date displays that user's Check-ins for the date as newest-first summaries containing time, Note/Mood, and any existing Weather, Activity, or Approx Location fields permitted for display. [S-BR2, S-T5, S-FR1 p. 3, S-PM-0831]
- The canonical history feature is **Footprint**, replacing the user-facing label **Check-in Timeline**. It retains the previously confirmed history capability and adds selected-day presentation. [S-BR2, S-T4, S-FR1 pp. 3, 7, S-PM-0831]
- Footprint lists all of the user's Check-ins for the selected date. It connects the Check-ins that have display-permitted Approx Location points in chronological order. A Check-in without a permitted location remains in the detail list but creates no map point. [S-PM-0831]
- Calendar can open Footprint with the selected date; Footprint also has its own date selection. [S-PM-0831]
- Mood/activity presentation supports reflection only and must not infer a diagnosis. [S-BR2]

### 3.3 Events

- Event cards/details expose the approved descriptive information and recommendation reason without revealing unauthorized user data. [S-BR2]
- Interested and Going are independent states. Going is the user-facing term; “Booked” may remain an internal unified business meaning but must not reappear as a standalone “Booked externally” UI concept. [S-BR45, S-KD5]
- Third-party registration uses a link-out and return confirmation; the system cannot infer completion from the link visit. [S-KD5]
- Interested counts/previews and people lists are visibility-filtered. Where a preview is shown, established friends are prioritized without exposing unauthorized identities. [S-BR3]

### 3.4 Friends and activity

- Friend requests support send, receive, accept, and decline. Only acceptance creates friendship. [S-BR3]
- My Friends search and Add Friend search are separate flows with different candidate sets. [S-BR45, S-KD5]
- Q18-A prospectively standardizes direct Add Friend lookup on the target's current user-facing unique Username only. The opaque AccountId remains internal and DisplayName remains non-authoritative presentation text. Username validation, matching, lifecycle, result projection, and request behavior remain Open under Q-18. [S-PM-0902-Q18]
- Q18-B freezes ASCII-only Username syntax and canonicalization, exact-equality Add Friend lookup, global atomic uniqueness across Accounts/reservations, a fixed MVP reserved namespace, Week 9 immutability, and no automatic or deletion-triggered reuse. Result projection, protected-state handling, Friend Request behavior/errors, UI, API/schema, implementation, and evidence remain Open. [S-PM-0902-Q18]
- Q18-C requires authenticated/authorized Add Friend lookup, a fixed lifecycle/block/protected-rule precedence, a minimum identity projection, requester-relative relationship states only for eligible targets, semantically indistinguishable target-unavailable/rate-protection outcomes, and read-only enumeration-protected behavior. It creates no new hidden eligibility rule. [S-PM-0902-Q18]
- Q18-D fixes one Pending request per unordered Account pair, a Backend-authoritative 30-day Pending lifetime, atomic accept/decline/invalidation/expiry behavior, first-valid-commit race semantics, requester-level send protection, privacy-safe stable errors, no implicit terminal-record retention, and explicit MVP exclusions. Q-18 is Resolved at requirement-contract level; downstream API/schema/UI/operations/evidence gates remain. [S-PM-0902-Q18]
- Friends Activity candidates must pass visibility/consent filtering before ranking. The feed is unified: Special Care may increase rank, but eligible ordinary friends can still appear in Top 2 and See All. [S-BR45, S-KD5]
- On the Friend Page, Special Care friends are pinned ahead of ordinary friends. The flag is private, creates no friend notification, and may be applied to any established friend without a minimum friendship duration. [S-KD5, S-FR1, S-PM-0831]

### 3.5 Recommendations and Home

- Candidate eligibility and privacy filtering occur before scoring. [S-BR4, S-MM-0717, S-BR5]
- Backend deterministic logic owns candidate construction, approved factors, weights, score, order, tie handling, and fallback. [S-BR5]
- Home shows Top 2 from the already-ranked result for each module and See All shows the complete ranked set without UI reordering. [S-BR45, S-KD5]
- Event Recommendation, Friend Recommendation, and Friends Activity are distinct modules. “Activity Recommendation” is not the approved Home label. [S-KD5]
- Exact numeric weights, normalization, decay, and tie-breakers in S-ALG4 remain **unapproved**. S-PM-0901-Q03 separately controls the current deterministic v1 formulas and does not adopt S-ALG4. [S-BR45, S-ALG4, S-PM-0901-Q03]

### 3.6 AI and Persona

- Qwen3.5-9B is the sole primary model for the Sprint 5 target. Qwen3.5-4B is a manually selected development/low-spec alternative, not an automatic failover target. [S-BR5]
- Ollama is the current local runtime behind a Qwen Local Model Adapter; vLLM, SGLang, and llama.cpp are future options, not commitments. [S-BR5]
- Q31-A makes Qwen3.5-9B the sole Week 9 Release-acceptance model, keeps 4B explicit and development-only, prohibits application-level filesystem/network/database/shell/tool/persistent-memory capabilities, and requires both the human-readable reference and immutable model/manifest digest actually loaded by Ollama as Release identity evidence. [S-PM-0902-Q31]
- Q31-B applies one monotonic 60-second total deadline with nested 5-second queue and 45-second generation ceilings, counts the complete model-facing input against a 4096-token limit, bounds the host to one active/two queued requests, and holds each per-user slot from acceptance to application terminal state. Disconnect and timeout fail closed; an unconfirmed underlying invocation quarantines the host generation slot. [S-PM-0902-Q31]
- Q31-C requires duplicate-aware, single-root raw JSON parsing before object materialization, exact versioned output schemas, deterministic structural/authority validation, and a separate fail-closed semantic output policy. A runtime validation pass must not be reported as algorithmic proof that unrestricted free text is grounded. [S-PM-0902-Q31]
- Q31-D permits no automatic model retry. AI Conversation failure creates no synthetic assistant content; Recommendation explanation may fall back only within the unexpired overall deadline through Backend-owned deterministic rendering of the approved safe explanation projection. Overall timeout and stale/abandoned/deletion terminal states permit no later fallback. Failure does not advance the Conversation anchor, while an already-persisted user message retains its Q14-B effect. [S-PM-0902-Q31]
- Q31-E keeps dependency readiness distinct from `busy` admission capacity and defines mandatory identity, isolation, timing, terminal, parser, semantic-policy, fallback, retention, and live-9B evidence. The adversarial corpus proves only defined cases. Runtime readiness is blocked by any unresolved contract/evidence failure, not an undefined generic defect-priority label. [S-PM-0902-Q31]
- Flutter must never call the local model/runtime directly. The authenticated backend applies authorization, privacy/visibility, minimization, purpose checks, validation, and deterministic fallback before/after model use. [S-BR5]
- Qwen cannot access Firestore/database state or independently fetch user/event/friend records. It receives only an approved minimized payload. [S-BR5]
- Qwen may explain, summarize, or conversationally present an approved result. It may not create recommendation candidates, decide access, set weights/scores, reorder output, or persist authoritative state. [S-BR5]
- For consented Check-in conversational assistance, the minimized context window is capped at the five most recent eligible Check-ins from the preceding seven days. If fewer than five eligible Check-ins exist, only those available are used. This rule applies only to Check-in conversation assistance and never to candidate generation, recommendation scoring, or ranking. [S-FR1 p. 4, S-PM-0831]
- Unsafe, invalid, or unavailable model output must be rejected in favor of deterministic backend fallback. [S-BR4, S-BR5]
- Persona affects tone/presentation only. It does not change privacy, candidates, scores, or business rules. [S-BR45, S-BR5]

### 3.7 Admin scope and supersession

**Historical COMP3851A baseline.** S-BR5 confirms only protected creation of an Interest Tag through a restricted backend operation and explicitly excludes Admin UI and broader lifecycle actions. S-AI5, S-TRACE5, and S-FR1 describe a broader surface, but those derivative sources do not prove that it was approved for COMP3851A. The COMP3851A baseline and its completion claims therefore remain unchanged. [S-BR5, S-AI5, S-TRACE5, S-FR1 pp. 4, 7]

**New COMP3851B requirement.** S-PM-0831 prospectively approves a Flutter Admin UI with these boundaries:

- Interest Tags and Event Categories support create, read, update, and delete. If an item is referenced by a Check-in, user interest, event, or another retained record, permanent deletion is blocked; the item may instead be deactivated and later restored.
- Recommendation Configurations and their factor entries support create, read, update, and delete. A new factor entry may only select logic from the implemented, approved factor registry; Admin cannot define an arbitrary expression, algorithm, plug-in, or data source. Deletion must not erase a published version retained by a historical recommendation.
- Recommendation Configuration edits are saved as Draft until explicit Publish. Publishing creates a new effective version; historical recommendation records remain associated with the version used when they were produced.
- Admin access is assigned out of band by an authorized system owner. The app provides no self-service role application and no Admin-to-Admin role grant.
- Disable, Suspend, Delete, and Restore for user accounts do not execute from this scope. The UI may create a Pending request that records the target account, requested action, reason, requesting Admin, and request time for later processing and audit.
- The request approver, approval-state lifecycle beyond Pending, executor, execution effects, appeals, sessions, retention, and deletion semantics remain open and must not be invented.

Exact validation syntax, API shape, schema/storage, deployment, and implementation architecture remain deferred.

## 4. Business rules

### 4.1 Visibility and lifecycle

- Permission and visibility filtering precede social display, recommendation scoring, and AI context construction.
- A user owns and may delete their Check-in; dependent representations must no longer expose deleted data.
- Profile privacy is one saved state with Public, Friends-only, and Private values; later consumers read it consistently.
- Special Care is private metadata of the acting user. It changes allowed ordering only, never visibility eligibility.
- A new Interest Tag is catalogue availability only; it has no retroactive or automatic assignment effect.

### 4.2 Event state

- Interested and Going are separate and may coexist independently.
- Going/Booked has one business meaning: explicit user-confirmed intent/status after the external-registration flow.
- External-link activation alone does not mutate Going state.

### 4.3 Recommendation ownership

- Deterministic backend logic is authoritative for candidates, factors, scores, rank, tie handling, and fallback.
- The UI preserves backend order.
- Qwen is presentation/explanation support only and cannot become an implicit ranking engine.
- Special Care affects Friends Activity ranking, not friend-recommendation eligibility.

### 4.4 Persona

- Maximum five Persona configurations per user.
- Selection requires confirmation and yields one active Persona.
- Edit/delete are in scope; delete requires confirmation.
- Tone Presets are removed as a separate concept.
- Create produces an inactive Persona. Confirmed activation atomically replaces the unique Active Persona authority; zero Active Personas is valid. [S-PM-0901-Q19]
- Permanent deletion removes the live Persona entity/content, has no Restore, frees capacity, and clears active authority without selecting a replacement. [S-PM-0901-Q19]
- The approved structured properties are owner-only `displayName`, `tone`, `responseLength`, and `formatStyle` under the S-PM-0901-Q19 enums. Free-text Persona prompts and arbitrary extensions are prohibited. [S-PM-0901-Q19]
- Persona-based AI uses an immutable projection snapshot captured at request start. Edit/Active change affects later requests; permanent deletion causes an in-flight result to fail closed before persistence/delivery. [S-PM-0901-Q19]
- Historical Conversation does not resolve or retain a readable Persona. Only non-content `presentationMode` and non-identifying projection schema version metadata may remain with the Conversation. [S-PM-0901-Q19]

### 4.5 COMP3851B Admin lifecycle

- Catalogue hard deletion is allowed only when no retained record references the item; otherwise deletion is blocked and deactivation is the available lifecycle action.
- Publishing, not saving a Draft, makes a Recommendation Configuration version effective for new recommendations.
- Historical recommendations retain their original Recommendation Configuration version; later Admin changes do not rewrite their basis or explanation.
- Account administration in this increment means preparing an auditable Pending request, not changing account state.
- Admin authorization is provisioned by an authorized system owner outside the app; client-supplied Admin status is never trusted.

## 5. Privacy and security rules

| Rule | Confirmed statement | Evidence |
|---|---|---|
| Authentication | Firebase Authentication email/password; protected backend requests require authenticated identity. | S-BR4, S-BR5 |
| Authorization | Sensitive/protected operations are authorized server-side. Admin status is never trusted from Flutter input. | S-BR4, S-BR5 |
| Privacy precedence | Filter by owner privacy, relationship, consent, and feature purpose before ranking or AI processing. | S-BR3, S-BR4, S-BR5 |
| Data minimization | Send only the fields necessary for the approved purpose; no full document dumps or unrestricted conversation history. | S-BR2, S-BR4, S-BR5 |
| Check-in AI window | For consented Check-in conversational assistance only, use no more than the five most recent eligible Check-ins from the preceding seven days; never reuse this window as a recommendation-ranking input. | S-FR1 p. 4, S-PM-0831 |
| Location | No precise/live/continuous/background tracking; permitted approximate context only. | S-BR2, S-MM-0717 |
| Model isolation | Qwen has no direct database access, authorization authority, or persistence authority. | S-BR5 |
| Secrets | Model/runtime/service credentials remain backend-side and must not enter Flutter, Git, logs, prompts, or responses. | S-BR4, S-BR5 |
| Output validation | Backend validates model output and uses deterministic fallback when invalid, unsafe, or unavailable. | S-BR4, S-BR5 |
| Admin trust boundary | Admin role is assigned out of band by an authorized system owner and verified by protected server-side authorization; the Flutter UI cannot confer Admin status. | S-BR5, S-PM-0831 |
| Admin audit boundary | Account actions create a Pending auditable request only; this phase approves neither an execution path nor access to unrelated private profiles, Check-ins, locations, friendships, or AI conversations. | S-PM-0831 |
| Sensitive inference | Do not infer mental health or expose private/non-consenting data through recommendations or AI. | S-BR2, S-BR4, S-MM-0717 |
| Retention | No unapproved secondary AI/Recommendation copies; Conversations expire 90 days after dedicated `lastPersistedMessageAt`; operational logs expire after 30 days under a strict cross-layer allowlist; Admin Configuration and Account Action Request retention/audit use the approved entity-specific anchors and lifetimes. | S-BR5; S-PM-0902-Q14 |

## 6. Recommendation and AI rules

The approved deterministic v1 field and formula boundary is:

- Event Recommendation v1 uses valid user Interest Tag IDs matched to the Event's valid Interest Tag IDs after Event status/time eligibility. Q12-A explicitly supersedes Q03/Q17's ambiguous `eventCategoryOrTagIds` phrase: the separately typed Event Category ID does not score or implicitly match by name. It does not score Check-in, Mood, Activity, Weather, location, social data, Interested/Going counts, popularity, Special Care, Persona, or AI history. [S-PM-0901-Q17, S-PM-0901-Q03, S-PM-0902-Q12]
- Friend Recommendation v1 derives only shared interests and common Events from purpose-authorized fields after account, privacy, friendship, and pending-request eligibility. Approximate/contextual overlap is not enabled in v1, and Special Care is prohibited. [S-PM-0901-Q17]
- Friends Activity v1 filters accepted-friend Activity by privacy/visibility before using approved type/category, server-authoritative time, and the requesting user's Backend-only Special Care boolean. Special Care cannot restore an ineligible Activity and never enters Qwen. [S-PM-0901-Q17]
- The backend must remain deterministic and explainable; AI may verbalize the reason but cannot manufacture one unsupported by the deterministic result.
- COMP3851B Admin may create and configure only factors backed by already implemented and approved factor logic. Configuration uses Draft and explicit Publish, creates an effective version, and preserves the version used by historical recommendations. [S-PM-0831]

For consented Check-in conversational assistance, one Backend `asOf` defines a rolling `[asOf - 7 × 24 hours, asOf]` window. After authorization, consent, deletion, future-date, and window filtering, the Backend selects at most the five newest records and projects only UTC time, authorized Note text, normalized Mood label, normalized Activity label, and normalized Weather-condition label. Activity and Weather objects, provider payloads, temperature, location, IDs, paths, and arbitrary maps do not enter Qwen. [S-PM-0901-Q17]

Recommendation explanation receives one already-selected result plus its minimal deterministic reason, never a candidate pool or score vector. S-PM-0901-Q19 closes the Persona gate with `persona_presentation_v1`, containing only schema version and approved tone, response-length, and format-style enums. Persona identity, display name, object, revision, timestamps, and free text never enter Qwen. [S-PM-0901-Q17, S-PM-0901-Q19]

S-PM-0901-Q03 approves fixed non-negative integer v1 scoring without candidate-pool normalization. Event Recommendation scores interest matches and orders ties by upcoming start time then canonical Event ID. Friend Recommendation scores two points per shared Interest and one per common Event, then applies the approved count/ID total ordering. Friends Activity adds fixed recency, Activity relevance, and Backend-private Special Care points inside a seven-day window, then orders by score, time, and canonical source tuple. [S-PM-0901-Q03]

Q16 defines zero results as a successful deterministic computation: no eligibility/positive-factor broadening, Qwen call, stale-result reuse, or user-visible Recommendation history. Q14-approved aggregate telemetry may record an empty returned-result count but not candidate identity or protected exclusion reasons. Home, See All, and Refresh recompute independently with their captured `asOf`. Approved titles are `No event recommendations right now`, `No friend recommendations right now`, and `No recent activity from friends`, with the corresponding supporting copy in S-PM-0902-Q16. [S-PM-0902-Q16]

S-ALG4's different 0–100 scores, weights, seven-day decay, normalization, and tie-breakers remain unapproved and must not be substituted for S-PM-0901-Q03.

## 7. UI / UX decisions

- Current online UI entry point: S-FIGMA, supplied by PM on 2026-08-31. S-PM-0902-Q04 Q04-A freezes Figma Make file `UFmjpkfucM4TctMuRQfsOC`, Version 5, title `Create individual event details`, displayed as August 1, 2026 at 7:37 PM, as the visual reference baseline; no unstated timezone is inferred.
- Version 5 is a non-pixel-perfect, incomplete linear prototype and basic first-pass visual design. It controls recognizable visual direction, not Business Rules, scope, production interaction semantics, Flutter structure, API/Backend behaviour, accessibility exceptions, or platform exceptions. [S-PM-0902-Q04]
- The PM-supplied source archive, SHA-256, extracted source, file inventory, intake date, and recorder are retained under `docs/evidence/ui/figma-make-v5/`. Exact historical-Version-5 provenance, reference captures/dimensions, external-dependency reproduction evidence, and full evidence verification remain Pending and block affected screens/states from Visual Implementation Ready. [S-PM-0902-Q04]
- Q04-BASELINE-LIMITATION-01 records the prototype's linear/demonstration limitation. Q04-B defines role/scope-aware authority precedence and requires explicit same-tier supersession rather than document recency. Q04-DEV-01 through Q04-DEV-13 are approved observed/provisional deviations. Q04-C requires every one of the 42 exported routes to receive an inventory disposition, permits zero-to-many route/matrix relationships, records required production states missing from Figma, and independently gates shared visual patterns. Classification records authoritative scope but cannot change it. Population content acceptance and completeness remain Pending. [S-PM-0902-Q04]
- Q04-D accepts the inventory/grouping/disposition content after conservative review: 42/42 routes, 37 Release routes, five Prototype Evidence Only routes, 27 supported production surfaces plus two evidence-only rows, 38 material state groups, 29 rows, and 12 still-unready patterns. DEV-20 is not retained; DEV-14–19/21–22 remain unapproved candidates. This does not approve implementation or readiness. [S-PM-0902-Q04]
- S-PM-0902-GOV adopts the Q04/SOURCE_MAP authority and conflict model project-wide. Applicable Sponsor/Supervisor authority ranks above PM-controlled decisions within scope; PM remains authoritative for delegated, implementation-detail, and otherwise-undecided matters. Date alone never supersedes, and a same-tier conflict requires explicit competent supersession or a new resolution unless compatible specificity allows both rules to apply. [S-PM-0902-GOV]
- Repository UI exports remain historical/corroborating evidence, especially S-UI5 and S-UIMAKE.
- Initial consent/privacy flow: Accept → Public; Reject → Private; both enter the app; Friends-only is later in Settings.
- Check-in does not carry a second privacy default or independent location toggle.
- Friends Activity follows Check-in on Home.
- Home module cards show Top 2 plus See All and preserve backend rank.
- Going is user-facing; the old standalone “Booked externally” UI is removed.
- My Friends search, Add Friend search, and Friend Recommendation are separate experiences.
- Persona choose/create/edit/delete is in scope, with selection and deletion confirmations.
- The formal COMP3851A Sprint 5 scope has no Admin dashboard/mobile UI. S-PM-0831 prospectively adds a Flutter Admin UI to COMP3851B; this is a new PM requirement, not evidence that the earlier UI was delivered or Sponsor-approved.
- Calendar selected-date details use newest-first Check-in summaries. Calendar may open Footprint for the selected date, and Footprint retains an independent date selector. [S-PM-0831]
- **Footprint** is the canonical current user-facing history label; **Check-in Timeline** is retained only when quoting historical sources. [S-PM-0831]
- Early Group screens in S-UIMAP/S-UIS1 are obsolete due to later scope removal.
- ENMORI is the current product name; Nexus Five names the team and Campus Connect is an obsolete historical label. Existing mismatched exports remain historical evidence and are not silently relabelled. [S-PM-0831]

No concrete Figma export was required for the 2026-08-31 context-extraction phase. S-PM-0902-Q04 now requires the verified Version 5 archive, digest, historical-version provenance, reference captures/dimensions, dependency inventory, and recorder/date evidence before Visual Implementation readiness. Q04-A does not require pixel-perfect reproduction.

## 8. Sponsor / Supervisor decision trail

| Date | Confirmed change or decision | What it replaced / constrained |
|---:|---|---|
| 2026-06-05 | Remove ordinary user-to-user chat; bound AI and apply privacy consistently. | Narrows early social/chat ideas from May. |
| 2026-06-19 | Make Check-in the foundation; distinguish Interested/Going; external registration only; no payment/verification; exclude Group/chat/admin content review. | Replaces early Group/chat directions. |
| 2026-07-03 | Keep Home small; add People You May Know; consent-based friendship; filter before social/AI use; save weather with Check-in. | Clarifies Home, privacy, AI context, and weather persistence direction. |
| 2026-07-11 | Reaffirm no Group; bounded AI context; weather fallback cannot block Check-in. | The “full friend search later” note is subsequently replaced by Sprint 4.5. |
| 2026-07-17 | Persona CRUD/select, maximum five and one active; deterministic privacy-first ranking; Top 2; no sensitive/precise/non-consenting inputs; replace Gemini with Qwen/Ollama. | Replaces Gemini provider/model direction and advances Persona/recommendation rules. |
| 2026-07-21 | Sixteen consolidated decisions settle Friends Activity placement/ranking, Special Care, Going, privacy flow, Persona, search separation, and Home labels. | Corrects earlier Special-Care-only feed, Booked-externally UI, and incomplete search rules. |
| 2026-07-24 | AI/recommendation/privacy documents still needed revision; no additional feature expansion approved. | Prevents treating pre-review broad claims as automatically final. |
| 2026-07-31 | Only two blocking defects named; no new feature work. | Freezes scope while requiring two corrections. |
| 2026-08-01 | Internal record says both corrections were fixed/retested and package frozen. | Status update only; not a separately attributable Sponsor ruling. |
| 2026-08-31 | PM resolves C1–C8 and C10, leaves C9 open, and prospectively approves the bounded COMP3851B Admin increment plus Calendar/Footprint/AI terminology and behavior recorded here. | This is a new PM decision record. It does not retroactively alter COMP3851A scope, UAT evidence, or Sponsor/Supervisor history. |
| 2026-09-01 | PM approves the Flutter client architecture and Fake-auth validation slice recorded by S-PM-0901. | Replaces the earlier deferred-client-architecture status only for Flutter client structure/state/routing/testing. Backend architecture remained open at this decision point and was subsequently resolved at architecture level by S-PM-0901-BACKEND; feature schema, field, UI, and algorithm decisions remain separately gated. |
| 2026-09-01 | PM defines Week 9 as a prioritized, demonstrable, testable COMP3851B Release MVP after four two-week development Sprints, with academic Weeks 10–12 reserved for concentrated stabilization. | Does not commit every confirmed capability to Week 9, select the exact MVP feature set, or postpone Sprint-level testing until stabilization. |
| 2026-09-01 | PM makes bounded AI Assistant, Event Recommendation, Friend Recommendation, Friends Activity ranking, and Persona management Week 9 Must capabilities; Admin Recommendation Configuration remains Should / Not Ready. | Must is priority, not readiness. Backend/Auth/Data/API, field allowlists, algorithms, lifecycle, retention, fallback, Qwen runtime, and UI baseline remain unresolved; detailed Sprint 2–4 refinement waits for those decisions. |
| 2026-09-01 | PM approves the Q-30 Backend Architecture Baseline recorded by S-PM-0901-BACKEND. | Resolves the trusted Backend/Auth/Data/API, controlled-deployment, testing, operations, and repository-boundary architecture. It does not approve feature endpoints/DTOs, Firestore schema, recommendation formulas, field allowlists, Qwen operational parameters, final UI, or public deployment. |
| 2026-09-01 | PM approves purpose-specific Q-17 recommendation and non-Persona AI field allowlists recorded by S-PM-0901-Q17. | At this decision point Q-17 is partially resolved: deterministic v1 and non-Persona AI inputs are bounded, while Persona-to-Qwen remains Blocked pending an exact projection. S-PM-0901-Q19 later closes that remainder; retention, fallback, runtime, and UI stay separate. |
| 2026-09-01 | PM resolves Q-03 through the deterministic v1 recommendation formulas recorded by S-PM-0901-Q03. | Approves fixed scoring and total ordering for Event Recommendation, Friend Recommendation, and Friends Activity. Does not adopt S-ALG4, approve Admin configuration, or settle zero-result behavior. |
| 2026-09-01 | PM resolves Q-19 and closes Q-17's Persona projection gate through S-PM-0901-Q19. | Approves Persona lifecycle, permanent deletion, historical usage metadata, Conversation deletion/source invalidation, structured Persona fields, projection enums, and request-start snapshot semantics. Retention duration, UI copy, API/schema, account actions, and Qwen runtime remain separate. |
| 2026-09-02 | PM resolves Q-14 through S-PM-0902-Q14. | Approves purpose-limited retention, Conversation and log expiry, Admin Configuration history/audit, and exact Account Action Request expiry/content-minimization/audit boundaries. It approves no Account Action enum value or execution workflow and is not Sponsor/Supervisor authority. |
| 2026-09-02 | PM approves Q31-A through S-PM-0902-Q31. | Approves Qwen model identity, isolation, Backend-only selection authority, and immutable loaded-digest Release evidence. Q-31 remains Open for timeout/budget, concurrency, validation, and fallback. |
| 2026-09-02 | PM approves Q31-B through S-PM-0902-Q31. | Approves the unique monotonic total deadline, nested timing/token budgets, bounded host/per-user capacity, cancellation, and terminal/quarantine semantics. Q-31 remains Open for structured-output validation and fallback. |
| 2026-09-02 | PM approves Q31-C through S-PM-0902-Q31. | Approves raw duplicate/single-root enforcement, exact output schemas, deterministic runtime validation, and a separately evidenced semantic model-output policy. Q-31 remains Open for retry/fallback and closure evidence. |
| 2026-09-02 | PM approves Q31-D through S-PM-0902-Q31. | Approves zero automatic retry, overall-deadline terminal behavior, non-content AI Conversation failure, safe-projection-only Recommendation fallback, and Conversation-anchor effects. Q-31 remains Open only for Q31-E closure evidence. |
| 2026-09-02 | PM approves Q31-E and resolves Q-31 through S-PM-0902-Q31. | Approves readiness/admission separation and the mandatory automated/live-host evidence and closure gates. Requirement resolution is not implementation readiness or Sponsor/Supervisor approval. |
| 2026-09-02 | PM approves Q16 Common through S-PM-0902-Q16. | Approves common successful-empty, privacy-safe observability, request-independence, and refresh semantics. Q-16 remains Open for three module-specific behaviors and final copy. |
| 2026-09-02 | PM approves Q16-A through Q16-C and resolves Q-16 through S-PM-0902-Q16. | Approves exact module copy and common Home/See All/Refresh behavior without approving DTO names or Q-04 visual treatment. |
| 2026-09-02 | PM approves Q12-A through S-PM-0902-Q12. | Approves distinct catalogue identities and name normalization, and explicitly supersedes Q03/Q17's ambiguous Event Category/Tag scoring-input terminology while preserving the formula and ordering. Q-12 remains Open for Q12-B–D. |
| 2026-09-02 | PM approves Q12-B through S-PM-0902-Q12. | Approves the non-cascading Active/Inactive lifecycle, existing-reference preservation, restore/rename behavior, safe Event editing with an already-inactive Category, and inactive-plus-zero-reference permanent deletion. Q-12 remains Open for Q12-C–D. |
| 2026-09-02 | PM approves Q12-C through S-PM-0902-Q12. | Approves Backend-verified Admin mutation authority, expected/authoritative revision distinction, stale-before-no-op validation, new/replacement-only Active checks, concurrency, and distinct stable HTTP/application errors. Q-12 remains Open only for Q12-D. |
| 2026-09-02 | PM approves Q12-D and resolves Q-12 through S-PM-0902-Q12. | Approves bounded single-entity catalogue operations and explicit exclusions, including no bulk import/export, hierarchy/mapping, cascade, extended metadata, analytics/reference disclosure, or retained catalogue audit-history product. |
| 2026-09-02 | PM approves Q13-A through S-PM-0902-Q13. | Approves the controlled non-commercial Open-Meteo provider, Backend-only/minimized 0.1-degree Approx Location boundary, third-party processing disclosure, and mandatory attribution. Q-13 remains Open for Q13-B–D. |
| 2026-09-02 | PM approves Q13-B through S-PM-0902-Q13. | Approves the single two-second minimum-variable lookup, explicit Unix UTC and declared-unit validation, stricter freshness window, and non-blocking no-retry/no-backfill behavior. Q-13 remains Open for Q13-C–D. |
| 2026-09-02 | PM approves Q13-C through S-PM-0902-Q13. | Approves frozen projection semantics/mapping/rounding, minimal Check-in-owned persistence, deletion/withdrawal races, and condition-label-only Qwen projection. Q-13 remains Open only for Q13-D. |
| 2026-09-02 | PM approves Q13-D and resolves Q-13 through S-PM-0902-Q13. | Approves deterministic Weather/Q17 attribution with frozen canonical links, enrichment-based fallback copy, explicit Free API/product exclusions, and mandatory evidence. Requirement resolution is not implementation/compliance evidence. |
| 2026-09-02 | PM approves Q18-A through S-PM-0902-Q18. | Prospectively standardizes AccountId, Username, and DisplayName vocabulary; Username alone is the direct Add Friend lookup key. Q-18 remains Open for validation, matching, lifecycle, result projection, request behavior, API/schema/UI, implementation, and evidence. |
| 2026-09-02 | PM approves Q18-B through S-PM-0902-Q18. | Approves the frozen ASCII canonicalization pipeline, exact-only lookup, global atomic reservation uniqueness, fixed namespace protection, immutable Week 9 lifecycle, and no deletion-triggered reuse. Q-18 remains Open for result projection, protected-state handling, Friend Request behavior/errors, exclusions, API/schema/UI, implementation, and evidence. |
| 2026-09-02 | PM approves S-PM-0902-BR01 backlog refinement priority. | Approves ENABLER-A01 at 8 SP/24h with named roles but retains its explicit iOS architecture-capability Ready gate; selects narrow RMVP-01A; confirms Q18 outside Week 9 mandatory scope; no production Ready or Sprint/external write follows. |
| 2026-09-02 | PM approves S-PM-0902-IOS01 iOS product delivery deferral. | Makes Week 9 product implementation/evidence/UAT Android-only and defers complete iOS product implementation until after Week 9. The dual-platform target and A01 architecture-only iOS gate remain; R2 is required before revised Week 9 UAT execution. |
| 2026-09-02 | PM approves Q18-C through S-PM-0902-Q18. | Approves authenticated/authorized exact lookup, fixed privacy precedence, minimum result projection, eligible requester-relative relationship states, target-level non-distinguishability, read-only behavior, and enumeration protection. Q-18 remains Open only for Friend Request mutation/concurrency/errors/exclusions and downstream API/schema/UI/evidence. |
| 2026-09-02 | PM approves Q18-D and resolves Q-18 through S-PM-0902-Q18. | Approves 30-day Pending lifetime, protected send/accept/decline/invalidation/expiry, pair uniqueness and first-valid-commit race behavior, requester-level abuse protection, terminal-outcome/retention separation, privacy-safe errors, exclusions, and mandatory evidence. Requirement resolution is not downstream implementation readiness. |
| 2026-09-02 | PM approves Q04-A through Q04-D through S-PM-0902-Q04 and supplies the exported Make source. | Freezes Version 5/evidence and authority/matrix governance, then accepts the populated inventory/grouping/dispositions. Five routes remain prototype-only; eight new deviation candidates, patterns, provenance/captures, and readiness remain unresolved. Q-04 remains Open. |
| 2026-09-02 | PM approves S-PM-0902-GOV as an explicit project-governance correction. | Makes the Q04/SOURCE_MAP authority model canonical project-wide, corrects the former repository wording that placed PM beside Sponsor/Supervisor at the highest tier, rejects date-only supersession, and preserves compatible specificity plus explicit same-tier conflict resolution. It is not a Sponsor/Supervisor decision. |
| 2026-09-03 | PM approves S-PM-0903-UAT02 and UAT-B-0902-R2. | Fixes the exact 45-case Week 9 Android/shared aggregation and later iOS relationship, resolving Q-32. Every case remains Not Run; no Ready, Sprint, external write, or Release acceptance follows. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-SEL. | Selects new-member registration, both Initial Choice branches, and Note-only as RMVP-01A's product path. Q-33 physical contract, Q04, estimation, assignment and Ready remain open. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-R2DIR. | Directs the amended R2 visibility, atomic-idempotency and Q18-B Username corrections and accepts its Note/idempotency values. R1 was not finally approved and Q-33 remained Open at this point; exact R2 approval follows in S-PM-0903-RMVP01A-CONTRACT. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-CONTRACT. | Approves RMVP-01A-CONTRACT-PREVIEW-0903-R2 exactly and resolves Q-33 at requirement-contract level. RMVP-01A remains Not Ready; no estimate/assignment, Sprint, implementation, external write or execution acceptance follows. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-STAFF-REV. | Rejects the first uneven 78h staffing proposal, adds a prospective legitimate-work balance rule, requires independent review of JIN-authored/executed artifacts and requires A01 re-evaluation before scheduling. Revised allocations remain unapproved previews. |
| 2026-09-03 | PM issues S-PM-0903-RMVP01A-STAFF-R2DIR. | Accepts the balanced envelope/responsibilities in principle but directs removal of circular review dependencies. A01 and `8 SP` are excluded from the pending staffing approval; no Ready, Sprint or external write follows. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-STAFF. | Approves the corrected 78h R1–R16 staffing table, balanced member envelope and acyclic review topology exactly. `8 SP`, A01, Ready, Sprint, implementation and external writes remain outside approval. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-EST. | Approves RMVP-01A at 8 SP as a relative estimate, not a conversion from 78h. Remaining Ready gates, Sprint, implementation and external writes remain unapproved. |
| 2026-09-03 | PM approves S-PM-0903-Q04-RMVP01A-R1. | Approves the bounded six-surface entry/core visual-state contract, Q04-DEV-15/23/24 and slice-scoped SP-01/05/06. Evidence remains Pending; no Visual Implementation Ready, Ready, Sprint or implementation follows. |
| 2026-09-03 | PM approves S-PM-0903-RMVP01A-START. | Makes RMVP-01A Ready, absorbs necessary A01 validation into its 78h work and authorizes delivery setup. Product coding waits for stable-baseline push and team publication; Done evidence and scope exclusions remain. |
| 2026-09-10 | Sponsor defers the remaining RMVP-01A accessibility-specific execution/evidence from the current stage; LI HOURUI relays and records S-SPONSOR-0910-RMVP01A-A11Y-DEFER. | Human audible TalkBack and the remaining accessibility-only evidence move to future work and remain `Not Run — Deferred`. The earlier baseline is retained; functional UAT, non-accessibility Q04 evidence, higher non-waivable obligations, Release and other Done gates remain. |

No explicit Supervisor decision could be attributed from the available records. This absence must not be filled by inference.

## 8.1 COMP3851B release-planning boundary

- Sprint 1 covers academic Weeks 2–3, Sprint 2 Weeks 4–5, Sprint 3 Weeks 6–7, and Sprint 4 Weeks 8–9. [S-PM-0901-MVP]
- The Week 9 target is a prioritized, demonstrable, testable COMP3851B Release MVP rather than implementation of every confirmed product capability. [S-PM-0901-MVP]
- Academic Weeks 10–12 concentrate on cross-feature testing, UAT, optimization, compatibility, defect closure, and release evidence. S-PM-0902-IOS01 later supersedes only iOS **product** timing: Android testing/review/evidence remains inside applicable development Sprints, while complete iOS product implementation/evidence is deferred until after Week 9. [S-PM-0901-MVP, S-PM-0902-IOS01]
- S-PM-0901-SCOPE selects bounded AI Assistant, Event Recommendation, Friend Recommendation, Friends Activity ranking, and Persona management as Week 9 Must capabilities. Admin Recommendation Configuration is Should / Not Ready. This selection does not permanently remove other confirmed capabilities from the wider product scope. [S-PM-0901-SCOPE]
- The Release Goal and Definition of Done boundary are recorded by S-PM-0901-SCOPE. Detailed Sprint 2–4 selection, ownership, estimates, and sequencing remain subject to re-refinement after the affected blockers are resolved. [S-PM-0901-SCOPE]
- The Fake-auth Architecture Validation Slice remains in history as ENABLER-A01 at 8 SP/24h, but S-PM-0903-RMVP01A-START does not schedule or count it separately for the current delivery path. Necessary architecture validation is instead absorbed into RMVP-01A's approved 78h work; this is not a claim that A01 was completed. [S-PM-0901, S-PM-0902-BR01, S-PM-0903-RMVP01A-START]
- Week 9 product PBIs now use Android-only implementation/evidence/UAT timing. Complete iOS product implementation is deferred until after Week 9; no exact later Sprint/date or iOS product assignment is approved. The final dual-platform Release remains pending. [S-PM-0902-IOS01]
- UAT-B-0902-R2 is the approved Week 9 platform execution mapping. It requires all 45 mandatory Android/shared base cases to satisfy their exact rules, while `X-05`, all iOS product instances, `CORE-16`, and Q18 retain their recorded deferral/gates. Approval is not execution evidence. [S-PM-0903-UAT02]

## 9. Technical boundaries and approved client/Backend architecture

- The COMP3851A formal sources describe a Flutter/Dart client and a Firebase serverless baseline using Cloud Functions in TypeScript/Node.js, Cloud Firestore, and Firebase Authentication. S-PM-0901-BACKEND is the controlling PM decision for the prospective COMP3851B Backend architecture; it does not retroactively alter the historical baseline.
- Flutter uses Firebase Authentication directly but sends all product-data, social, recommendation, AI, and Admin operations through the versioned HTTPS REST/JSON Backend. The Backend verifies identity and is the business authorization, privacy, and data-access boundary. [S-PM-0901-BACKEND]
- The Backend baseline is a TypeScript-strict Node.js 24 LTS feature-first modular monolith using Fastify in Bootstrap/Transport, Firebase Admin/Firestore Infrastructure adapters, and an internal Qwen Adapter to a separately supervised local Ollama process. [S-PM-0901-BACKEND]
- `Application/Domain defines Ports; Infrastructure implements Ports; inner layers never import Infrastructure.` Vendor types and raw errors remain inside Infrastructure; Transport maps only stable application failures. [S-PM-0901-BACKEND]
- Cloud Firestore is the Week 9 product datastore, but Flutter has no direct product-data access. Backend Admin technical privilege never substitutes for use-case authorization or privacy filtering. Qwen has no Firestore credential or write authority. [S-PM-0901-BACKEND]
- Week 9 uses one controlled Linux demonstration host behind a controlled HTTPS edge. The raw Backend listener and Ollama are not device/LAN-visible. Dependency failure does not crash the Backend process, while readiness and affected endpoint availability may degrade independently. [S-PM-0901-BACKEND]
- The repository remains single-repository with Backend source under `backend/` and the normative OpenAPI contract under independent `api/`. Flutter does not import Backend source. [S-PM-0901-BACKEND]
- Physical-server fleets, Kubernetes, a microservice estate, enterprise infrastructure, and public long-term Internet deployment remain outside the recorded Week 9 scope.
- S-PM-0901 approves the Flutter client architecture summarized in `ARCHITECTURE.md`: feature-first organization with Presentation, selective Domain, and Data layers; Repository interfaces; Riverpod without code generation; constructor injection for non-Riverpod Domain/Data classes; ViewModel Repository dependencies declared through `ref.watch` in `build()`; `go_router`; project `Result<T>`/`AppFailure`; and an application-lifetime Auth Session Provider.
- The approved validation slice uses `FakeAuthRepository` and requires a vertical integration test across bootstrap, session Provider, Router, ViewModel, Repository, and observed session state. It is not production authentication.
- `flutter_riverpod`, `go_router`, and SDK `integration_test` support are approved in principle for this slice; compatible versions must be verified against Flutter 3.47.2 and `pubspec.lock` committed.
- Feature endpoint/DTO fields, Firestore schema/indexes, exact dependency patch/tooling, any unlisted purpose field, final UI, and exact deployment products/configuration remain **undecided**. Q-03, Q-14, Q-17, Q-19, and Q-31 resolve their requirement contracts, but do not make an affected production PBI Ready without their applicable implementation-evidence and remaining contract gates. [S-PM-0901-BACKEND, S-PM-0901-Q17, S-PM-0901-Q03, S-PM-0901-Q19, S-PM-0902-Q14, S-PM-0902-Q31, S-PM-0901-SCOPE]

## 10. Conflict register

### 10.1 Final-report cross-check and PM dispositions

S-FR1 was cross-checked against the formal requirements, late Sprint records, UAT, meeting minutes, and S-PM-0831. `Confirmed` below means the current rule is settled; it does not mean S-FR1 itself is controlling evidence. `Superseded` retains the earlier statement as history. `Needs PM Decision` remains open.

| ID | Evidence A | Evidence B | Current judgment | Recorded disposition and change trail |
|---|---|---|---|---|
| C1 — Report identity and authority | S-FR1, OOXML created/modified 2026-08-01 18:01 UTC: title names ENMORI, while subject/keywords call it a COMP3851A interim report. | PM supplied it on 2026-08-31 as the COMP3851A final project report; the file has no signatures, comments, tracked changes, or explicit Supervisor ruling. | **Confirmed** | Treat as the PM-designated final submission and Grade B late synthesis; preserve the internal “interim” identity and do not elevate it over Grade A decisions. |
| C2 — Admin breadth and delivery phase | S-BR5, Sprint 5: only protected Create Interest Tag; no Admin UI or broader lifecycle. | S-AI5/S-TRACE5 and S-FR1 pp. 4, 7 describe broader Admin capabilities; S-PM-0831 approves a bounded Flutter Admin UI for COMP3851B. | **Superseded prospectively** | Preserve the restricted COMP3851A baseline. Apply the broader, bounded Admin requirement only to COMP3851B; it is not a retroactive Sponsor approval or delivery claim. |
| C3 — Required Check-in inputs and Weather | S-BR2, Sprint 2: at least Note or Mood. S-BR45 and S-MM-0711: Weather is linked when available and failure must not block Check-in. | S-FR1 p. 3 describes Note, Mood, and Weather together in the normal flow. | **Confirmed** | Note or Mood remains the validation rule. Weather is optional contextual enrichment, not a third required input. |
| C4 — Calendar selected-date details | S-BR2 confirms monthly history but does not settle the detailed selected-day interaction. | S-T5 records missing selected-date details; S-FR1 p. 3 describes Calendar/history behavior; S-PM-0831 approves newest-first self-owned summaries. | **Confirmed PM decision** | Add selected-date details without converting the earlier UAT failure into proof that it was fixed. |
| C5 — Footprint vocabulary and route | S-BR2 confirms Check-in history/timeline; S-T4 records Footprint/date inconsistencies. | S-FR1 pp. 3, 7 uses Footprint and selected-date history; S-PM-0831 defines the canonical term and route behavior. | **Confirmed PM decision** | Use Footprint; list all selected-date Check-ins and connect only permitted Approx Location points chronologically. Calendar may pass its selected date. |
| C6 — Seven-day/five-Check-in AI window | Formal AI/privacy packages require bounded, consented, minimized context but do not approve this fixed quantity as a recommendation rule. | S-FR1 p. 4 describes recent Check-in context; S-PM-0831 limits the rule to consented Check-in conversation assistance. | **Confirmed with constraint** | Maximum five most recent eligible Check-ins from the preceding seven days, only for Check-in conversation assistance; never for recommendation candidates, scoring, or ranking. |
| C7 — Product identity | Late diagrams/repository use Nexus Five; UAT uses ENMORI; S-UIMAKE uses Campus Connect. | S-FR1 p. 1 identifies ENMORI and Nexus Five; S-PM-0831 chooses ENMORI as product name. | **Superseded** | ENMORI is the current product; Nexus Five is the team; Campus Connect is obsolete historical wording. |
| C8 — Target audience and product positioning | Early materials emphasize students/campus use and the unavailable Proposal prevents reconstruction of the original target statement. | S-FR1 describes broader community connection; S-PM-0831 confirms a community audience and rejects health-learning/advice positioning. | **Confirmed PM decision** | Do not restrict ENMORI to students and do not market it as a health-learning, diagnostic, treatment, or health-advice platform. |
| C9 — UAT completion claim | S-FR1 p. 8 reports a 15/20 UAT snapshot. | Five failed cases have no later retest evidence; S-MM-0801 explicitly closes only two other blocking defects. | **Needs PM Decision** | Explicitly skipped by PM on 2026-08-31. Keep the 15/20 snapshot and the five unresolved failures open; make no completion claim. |
| C10 — Special Care eligibility | S-BR45/S-KD5 define Special Care for an existing friend without a duration threshold. | S-FR1 uses “long-time friend” narratively. | **Confirmed** | Any established friend is eligible; “long-time” is an example, not a business rule. |

### 10.2 Earlier repository conflicts and current status

### C-01 — Sprint 5 Admin scope (prospectively resolved)

- S-BR5: Admin may only **Create Interest Tag**; explicitly excludes read/update/deactivate/reactivate/delete, moderation, user-account administration, and Admin UI.
- S-AI5 and S-TRACE5: claim Interest Tag CRUD/deactivation and preparation for disable/suspend/delete/restore user accounts; cite missing `Sprint 5 edit.pdf`.
- S-MM-0724 says relevant documents still required revision. S-MM-0731/0801 freeze the package broadly but do not explicitly approve the expanded Admin list. Final use-case/class diagrams omit Admin.
- Status: **Superseded prospectively by S-PM-0831 for COMP3851B.** S-BR5 remains the historical COMP3851A baseline. The new bounded Admin surface is recorded in §§2.1 and 3.7; approval/execution of account requests remains open.

### C-02 — Exact recommendation algorithm

- S-ALG4 specifies exact weights, 0–100 formulas, normalization, seven-day decay, and tie-breakers.
- S-BR45 deliberately leaves formulas/weights/normalization/decay/tie-breakers outside the formal package; Sponsor decisions confirm only factors, privacy-first filtering, determinism, explainability, and Top 2.
- Status: **superseded prospectively for deterministic v1 by S-PM-0901-Q03.** S-ALG4 itself remains unapproved and must not be treated as the basis of the current formula.

### C-03 — Booked semantics

- S-ALG4 treats Booked as completed external booking.
- S-BR45/S-KD5 say the external link is not proof; Going/Booked is recorded only after explicit user confirmation and Going is the UI term.
- Status: later formal/confirmed rule changes the business meaning; the conflicting algorithm text remains recorded as obsolete/unapproved.

### C-04 — Initial privacy default and consent wording

- S-BR45/S-KD5: Accept → Public, Reject → Private, either enters app; Friends-only later in Settings.
- Some UAT/acceptance wording assumes a Private default or omits weather/activity/approximate-location consent language.
- Status: formal rule controls the requirement, but UAT and UI evidence must be corrected/reapproved before claiming compliance.

### C-05 — Friend search timing

- S-MM-0711 describes full friend search as future scope.
- S-BR45/S-KD5 later confirm separate My Friends and Add Friend search flows.
- Status: confirmed later change; old decision is retained as history.

### C-06 — Group screens versus removed scope

- Early requirement-to-screen and Sprint 1 exports contain Group/join-group flows.
- S-BR3 and later Sponsor decisions remove Group and ordinary chat.
- Status: confirmed later removal; early screens are historical only.

### C-07 — Product name and UI baseline

- Final diagrams/repository use Nexus Five; UAT expects ENMORI; a major UI export uses Campus Connect; current Figma Make title does not settle the public product name.
- Status: **Superseded by S-PM-0831.** ENMORI is the product name, Nexus Five the team name, and Campus Connect an obsolete historical label. UI approval/version provenance remains separately open.

### C-08 — Diagram/data vocabulary versus final rules

- Sprint 5 ERD uses legacy `isGoingisBookedExternally`-style naming; the final class diagram omits Admin; S-BR5 uses Going and a narrowly bounded Admin create action; S-PM-0831 later adds bounded COMP3851B Admin behavior.
- Status: diagrams remain incomplete/legacy evidence and cannot silently define a data model for either baseline.

## 11. Verification gaps (not requirement changes)

- Sprint 1 records leave no-interest and recommendation-fallback behavior unresolved/failing.
- Sprint 2 records do not successfully demonstrate Friends-only Check-in sharing and delete propagation.
- Sprint 3 records do not successfully demonstrate empty-recommendation and permission-denied profile states.
- Sprint 4 records show consent wording and Footprint/date-filter inconsistencies.
- Sprint 5 UAT records missing selected-date calendar details and residual Campus Connect branding. S-PM-0831 now settles the required behavior/name but does not prove those failures were fixed or retested.
- S-FR1 records a 15/20 UAT snapshot; five failures have no later retest evidence. S-PM-0831 explicitly leaves this verification conflict open.
- Multiple “Passed” UAT rows state that the Figma prototype was not exercised in the browser session. These are weak verification claims and must not be read as proof of implementation.

## 12. Canonical domain language

The canonical glossary is [`CONTEXT.md`](../CONTEXT.md). This extraction document preserves evidence and requirement boundaries; it is no longer a second glossary authority. Technical integration terms such as Qwen Local Model Adapter remain described in the relevant source-grounded sections rather than in the domain glossary.

The approved factor-registry contents, account-request approval/execution semantics, and the final data schema remain unconfirmed. Deterministic v1 scoring is controlled by S-PM-0901-Q03.
