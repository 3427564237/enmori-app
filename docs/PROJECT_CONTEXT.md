# Project Context — Evidence Extraction

## 1. Status and interpretation rules

This is a source-grounded extraction from the project-records repository at commit `5d4ac26`, the PM-supplied COMP3851A report S-FR1, and dated PM decisions S-PM-0831, completed 2026-08-31. It is not an implementation plan. Source IDs refer to `docs/SOURCE_MAP.md`.

The controlling rule is incremental supersession: a later, explicit Sponsor decision or formal package changes only the affected rule. Everything else from an earlier frozen package remains. Old rules are retained in the change trail rather than silently overwritten.

Confidence labels:

- **Confirmed**: supported by a controlling formal source or explicit Sponsor decision and not materially contradicted by an equal/higher authority.
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
| Search and discovery | “My Friends” searches established friends by name. “Add Friend” is separate and searches username/account ID/unique username with self/duplicate/existing-friend prevention. Friend recommendation is separate from active search. | S-BR45, S-KD5 |
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
- Friends Activity candidates must pass visibility/consent filtering before ranking. The feed is unified: Special Care may increase rank, but eligible ordinary friends can still appear in Top 2 and See All. [S-BR45, S-KD5]
- On the Friend Page, Special Care friends are pinned ahead of ordinary friends. The flag is private, creates no friend notification, and may be applied to any established friend without a minimum friendship duration. [S-KD5, S-FR1, S-PM-0831]

### 3.5 Recommendations and Home

- Candidate eligibility and privacy filtering occur before scoring. [S-BR4, S-MM-0717, S-BR5]
- Backend deterministic logic owns candidate construction, approved factors, weights, score, order, tie handling, and fallback. [S-BR5]
- Home shows Top 2 from the already-ranked result for each module and See All shows the complete ranked set without UI reordering. [S-BR45, S-KD5]
- Event Recommendation, Friend Recommendation, and Friends Activity are distinct modules. “Activity Recommendation” is not the approved Home label. [S-KD5]
- Exact numeric weights, normalization, decay, and tie-breakers in S-ALG4 are **not confirmed** by a controlling source. [S-BR45, S-ALG4]

### 3.6 AI and Persona

- Qwen3.5-9B is the sole primary model for the Sprint 5 target. Qwen3.5-4B is a manually selected development/low-spec alternative, not an automatic failover target. [S-BR5]
- Ollama is the current local runtime behind a Qwen Local Model Adapter; vLLM, SGLang, and llama.cpp are future options, not commitments. [S-BR5]
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
| Retention | Raw prompts/responses should not be stored long-term by default, but an exact retention period is not approved. | S-BR5; open question |

## 6. Recommendation and AI rules

Approved recommendation factors exist at category level, not as approved numeric formulas:

- Event recommendations may use permitted interests, event attributes/context, and other explicitly allowed non-sensitive factors.
- Friend recommendations may use shared interests, common events/event interest, and permitted approximate/contextual overlap only after privacy filtering.
- Friends Activity may rank a unified eligible activity set using recency/relevance and Special Care as a weight.
- The backend must remain deterministic and explainable; AI may verbalize the reason but cannot manufacture one unsupported by the deterministic result.
- COMP3851B Admin may create and configure only factors backed by already implemented and approved factor logic. Configuration uses Draft and explicit Publish, creates an effective version, and preserves the version used by historical recommendations. [S-PM-0831]

S-ALG4’s 0–100 scores, fixed weights, seven-day decay, normalization, and exact tie-breakers are implementation proposals unless PM supplies approval evidence. They must not be copied into code as confirmed business rules.

## 7. UI / UX decisions

- Current online UI entry point: S-FIGMA, supplied by PM on 2026-08-31. It is the only UI link required at this stage.
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

No concrete Figma export is required for this context phase. Pixel-accurate implementation later may require a node-specific design link or exports because Figma Make does not expose the same node/screenshot workflow as a standard `/design/` file.

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
| 2026-09-01 | PM approves the Flutter client architecture and Fake-auth validation slice recorded by S-PM-0901. | Replaces the earlier deferred-client-architecture status only for Flutter client structure/state/routing/testing; backend, schema, API, Firebase, UI, and algorithm decisions remain open. |

No explicit Supervisor decision could be attributed from the available records. This absence must not be filled by inference.

## 9. Technical boundaries and approved Flutter client architecture

- The COMP3851A formal sources describe a Flutter/Dart client and a Firebase serverless baseline using Cloud Functions in TypeScript/Node.js, Cloud Firestore, and Firebase Authentication. This is historical/formal evidence, not approval of the detailed COMP3851B architecture.
- Protected operations and model access remain behind an authenticated backend boundary; Flutter must not directly access the Qwen runtime or acquire authorization authority.
- The recorded Qwen Local Model Adapter is an approved isolation boundary around the current Ollama runtime, not approval of a complete backend topology or an irreplaceable runtime choice.
- Physical-server fleets, Kubernetes, a microservice estate, and enterprise infrastructure remain outside the recorded scope.
- S-PM-0901 approves the Flutter client architecture summarized in `ARCHITECTURE.md`: feature-first organization with Presentation, selective Domain, and Data layers; Repository interfaces; Riverpod without code generation; constructor injection; `go_router`; project `Result<T>`/`AppFailure`; and an application-lifetime Auth Session Provider.
- The approved validation slice uses `FakeAuthRepository` and requires a vertical integration test across bootstrap, session Provider, Router, ViewModel, Repository, and observed session state. It is not production authentication.
- `flutter_riverpod`, `go_router`, and SDK `integration_test` support are approved in principle for this slice; compatible versions must be verified against Flutter 3.47.2 and `pubspec.lock` committed.
- Exact Firebase/backend deployment, real Auth integration, schema, API contracts, branch policy, product-wide testing strategy, and architecture outside the approved Flutter client scope remain **undecided**.

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
- Status: exact algorithm is unconfirmed, not approved merely because the document is detailed.

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

Exact scoring formulas, the approved factor-registry contents, account-request approval/execution semantics, and the final data schema remain unconfirmed.
