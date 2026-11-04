# Admin completion: existing capability and remaining interfaces

Authority: [4 November priority and execution decision](../decisions/2026-11-04-li-nonai-admin-insights.md). This is an implementation dependency inventory, not approval of new endpoints or data models.

| Capability | This frontend increment | Remaining dependency |
| --- | --- | --- |
| Current active Interest catalogue | Counts, name/ID search, source or name order, expandable stable-ID details | None for the existing active-only read. Do not claim a full catalogue including inactive entries. |
| Single Interest creation | Existing real capability check, validation, create, independent readback, unknown-result recovery and draft exit safeguards retained | Requires an existing authorized Admin session and enabled existing composition. No role is granted by this work. |
| Interest rename, activation/deactivation, deletion | Wider C2 product direction retained; no nonfunctional controls added | Approved management-all read, mutation/concurrency/error contracts and referenced-value deletion guards, followed by Backend implementation. |
| Event Category management | Wider C2 product direction retained | Approved physical catalogue/CRUD contracts and reference checks. External source categories are not silently converted into ENMORI categories. |
| Recommendation configuration draft/publish/history | Wider C2 direction over approved existing factors retained | Approved configuration/version/publication interfaces and independently verified producer; no formula or factor change in this work. |
| Pending account action requests | Wider C2 auditable-request direction retained | Approved request/status/audit interfaces, retained role/visibility limits. Preparing a request does not execute an account action. |

The current task excludes Backend and AI work. Therefore the last four rows remain explicit dependencies. Frontend cannot securely synthesize authority, persist these changes locally as server success, or assign itself a role. No new deadlines, dependency acceptance, external publication or full Admin acceptance is implied.

Validation for the delivered portion: search/sort must cause zero writes; create uses the existing independently verified acknowledgement/readback flow; capability loss and same-UID session replacement must not enable mutations; keyboard and scroll must keep real controls reachable. Actual Admin-service and phone verification remain distinct from synthetic repository tests.
