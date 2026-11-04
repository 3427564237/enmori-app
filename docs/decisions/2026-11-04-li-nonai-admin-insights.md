# Non-AI frontend improvements, Admin and record charts

- Source ID: S-PM-1104-NONAI-ADMIN-INSIGHTS.
- Authority: LI / PM, 4 November 2026 (Asia/Singapore), this task.
- Confirmed requests: optimize work outside the current Backend and AI work; add complete Admin functionality and Apple Watch-like Check-in/Event charts as high priorities; then “start working”.
- Scope: implement independent frontend improvements against existing approved interfaces, retaining accounts, saved data, permissions, dependencies and current Backend/AI work.

## Preserved sources and exact change

Retain `2026-10-18-li-functionality-and-reliability-priority.md`, `2026-10-29-li-frontend-usability-profile.md`, the existing architecture and privacy contracts. This adds Admin usability and record visualization to the high-priority queue alongside interest editing, sign-in feedback and save/recovery continuity. It does not reopen accepted Profile/navigation work or schedule TalkBack-only, iOS, infrastructure or model work.

Retain C2 in `2026-08-31-pm-requirements-decisions.md` as the wider product direction. Retain the 19/21 October single-create implementation boundary and `api/interest-admin-capability-contract.md`. Complete Admin remains a product objective; this frontend increment cannot supply absent CRUD, Event Category, configuration Draft/Publish/history or pending-account-request interfaces. It adds no role grant, direct account execution or moderation behavior. Missing interfaces are documented as dependencies, not supplied by a second backend or by nonfunctional controls.

Retain the existing Check-in weekly review/search and participation contracts. Visualizations use only the authenticated owner's already permitted records and current saved choices. Going remains intent, not attendance. No numerical mood/health score, new goal, tracking, AI inference, analytics upload or persistent aggregate is introduced.

## Bounded implementation choices

These are implementation choices under this task, not quotations of additional user decisions:

- Native Flutter charts with the existing palette: record-day coverage ring, daily count bars, 28-day intensity grid and exact label distributions. The default remains the selected seven civil dates; an explicit 28-day view uses the same paged reader and captured IANA zone. Changing range clears the prior results and requires an explicit read. Original-record navigation and cancellation/revocation behavior remain.
- Event distribution counts the current loaded participation snapshot, including a separate no-current-participation segment. Hidden is an overlapping attribute, not an extra segment. Mark incomplete, failed-refresh and uncertain-write snapshots. No unapproved attendance history or future-event estimate is derived from plan-update timestamps.
- Admin: active-catalogue summary, local search/name sorting and item details, using the existing create/readback/unknown-result path and current session capability. No new public endpoints/types or dependencies.
- Interest editor: distinguish actual unsaved selection changes, confirm intentional departure and explain in-flight saves without claiming cancellation. Sign-in: update validation after the first attempt and support one guarded keyboard submission.

## Evidence boundary

Use repository-boundary tests and actual rendered previews for new behavior; identify synthetic data. Bind any APK/device result to its exact source. Source tests or rendered previews do not establish connected-service, physical-phone, dual-account, UAT or Release acceptance. No merge, external publication, real-account Admin grant or personal-data mutation is implied.
