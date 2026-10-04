# LI Profile and Settings — bounded contract for approval

**Status: Proposed; implementation approval Pending.** Owner LI HOURUI, independent reviewer DU KUN, under [#45](https://github.com/3427564237/enmori-app/issues/45). This is the next usable Account/Profile/Settings increment after the [approved own Username/Interests slice](../decisions/2026-09-30-own-profile-first-slice-approval.md). The proposal fixes the API/data/UI choices needed to implement it; it does not become authority merely by being written.

## Result and sources

The owner can edit a display name, choose Profile visibility, change the saved Check-in default and optional data-use choice, and sign out of this device. Existing Username, Interests, Note flow and deterministic Event recommendations are retained. No other-user Profile/Friend API, lifecycle/block-management action, AI operation or provider integration is introduced.

Primary records were read from `nexus-five-project-records` at immutable commit `5d4ac26e9a9dc2a6914d16c7d576261033c9c0b8`, rather than treating Figma or implementation as requirement authority:

- [BR Sprint 1](https://github.com/3427564237/nexus-five-project-records/blob/5d4ac26e9a9dc2a6914d16c7d576261033c9c0b8/Sprint1/Business%20Rules%20and%20Requirements%20Lead%20%E2%80%94%20Sprint%201.pdf): Basic Profile BP-FR1–6/BP-NFR1–5 support a basic display name and purpose-limited collection; UC6/US6 support viewing/changing data-use consent with future relevant suggestions following the choice. They do not prescribe the physical fields, name limit or optionality below.
- [BR Sprint 3](https://github.com/3427564237/nexus-five-project-records/blob/5d4ac26e9a9dc2a6914d16c7d576261033c9c0b8/Sprint3/Business%20Rules%20and%20Requirements%20Lead%20%E2%80%94%20Sprint%203.pdf): S3-PV-FR1–8 require one Profile with Private/Friends-only/Public authorization and owner control through Profile/Settings. Exact-lookup minimum identity is governed by the later [Q18](../decisions/2026-09-02-add-friend-identity-matching-contract.md); it is not Profile-view permission.
- [Sprint 5 key decisions, decision 9](https://github.com/3427564237/nexus-five-project-records/blob/5d4ac26e9a9dc2a6914d16c7d576261033c9c0b8/Sprint5/Sprint_5_Key_Decisions_English.pdf), [BR Sprint 4.5 S5-AC01–05](https://github.com/3427564237/nexus-five-project-records/blob/5d4ac26e9a9dc2a6914d16c7d576261033c9c0b8/Sprint4/Business%20Rules%20and%20Requirements%20Lead%E2%80%94%20Sprint%204.5.pdf): the initial Check-in choices allow entry under Public or Private; later Settings offers all three choices, applying the saved default to later Check-ins.
- [Approved RMVP R2](../decisions/2026-09-03-rmvp-01a-contract-approval.md) and [R2 direction](../decisions/2026-09-03-rmvp-01a-r2-amendment-direction.md) explicitly separate Check-in visibility from Profile privacy, retain the initial Accept/Reject mapping, and leave later social-read snapshot/current-state effects undecided.
- [Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md), [Q14](../decisions/2026-09-02-retention-logging-audit-policy.md), [Q16](../decisions/2026-09-02-recommendation-empty-result-contract.md) control purpose, minimization, current consent/visibility, safe evidence and independent recommendation reads. [Practical delivery](../decisions/2026-09-30-sprint3-practical-delivery.md) controls incremental execution and truthful feature dispositions.

Physical names, normalization, defaults, revision rules, Settings independence and logout below are **choices requested for explicit PM approval**, not claims that the PDFs already chose them.

## Fields and disclosure

| Field | Proposed contract / purpose |
|---|---|
| `username` | Existing immutable canonical Username, owner display; no rename or identity substitution |
| `displayName` | Optional owner-selected nonunique presentation name: `null` means unset/explicitly cleared; a supplied string is trimmed at leading/trailing Unicode whitespace and must have 1–50 Unicode scalar values, no control/format characters or line/paragraph separators, internal spacing preserved; no HTML interpretation. UI shows “Display name not set”, never substitutes Username as DisplayName. Changing visibility does not require collecting a name |
| `profileVisibility` | `private`, `friends_only`, `public`; one Profile state independent of Check-in visibility. New/legacy missing state reads Private; no read-time write. It supplies a current state for future authorized consumers, not permission to skip requester/lifecycle/block/relationship checks |
| `checkInVisibility` | Existing current default extended with `friends_only`. This UI describes the default for future Check-ins; it makes no claim that changing it rewrites or exposes old Check-ins |
| `optionalProcessingConsent` | Existing `accepted`/`rejected` choice, for optional authorized processing only. Later Settings saves independently of visibility. Acceptance grants no extra field purpose, provider permission or blanket AI availability; rejection must be checked by future applicable consumers |
| `revision` | Nonnegative safe integer owner resource version; not displayed to users. Separate Profile and Settings revisions prevent unrelated owner edits from overwriting each other |

No email, Firebase UID, internal AccountId, Note, age, DOB, region, school, biography, avatar or full consumer history enters these DTOs. Public/Friends-only choices do not create a public endpoint in this slice. Missing DisplayName cannot satisfy Q18's lookup presentation requirement; the future reader must report unavailable until it has a real value and all its other permissions.

## Exact candidate APIs

All four operations require the existing verified Backend Auth Binding and completed onboarding. No caller-supplied owner selector is accepted. JSON objects reject undeclared fields. Keep existing envelope conventions.

```text
GET /v1/me/profile
200 {"profile":{"username":"member_a","displayName":null,"profileVisibility":"private","revision":0}}

PUT /v1/me/profile
body {"displayName":"Alex","profileVisibility":"friends_only","expectedRevision":0}
200 {"profile":{"username":"member_a","displayName":"Alex","profileVisibility":"friends_only","revision":1}}

GET /v1/me/settings
200 {"settings":{"checkInVisibility":"public","optionalProcessingConsent":"accepted","revision":0}}

PUT /v1/me/settings
body {"checkInVisibility":"private","optionalProcessingConsent":"rejected","expectedRevision":0}
200 {"settings":{"checkInVisibility":"private","optionalProcessingConsent":"rejected","revision":1}}
```

PUT replaces only the two fields of its resource and advances that resource revision exactly once at the successful atomic commit. A stale revision never writes. No extra Idempotency-Key or automatic retry is proposed. After an uncertain response, reread and require explicit resubmission using the fresh revision; do not claim that an unobserved attempt failed or succeeded. A repeated old revision cannot apply again.

Reuse `REQUEST_INVALID` 400 for malformed/undeclared DTO fields, `AUTH_REQUIRED` 401, `AUTH_FORBIDDEN` 403, `ONBOARDING_REQUIRED` 409 and `SERVICE_UNAVAILABLE` 503 with their current messages. Proposed additions, scoped to the affected operations:

| Code | HTTP | Safe message |
|---|---|---|
| `PROFILE_INVALID` | 422 | Use a display name of 1–50 characters or leave it unset, and choose a valid Profile visibility. |
| `PROFILE_REVISION_PRECONDITION_FAILED` | 412 | Your profile changed. Reload it before saving again. |
| `SETTINGS_INVALID` | 422 | Choose valid privacy and data-use settings. |
| `SETTINGS_REVISION_PRECONDITION_FAILED` | 412 | Your settings changed. Reload them before saving again. |

Negative/fractional/unsafe revisions and non-enum choices are invalid; safe-integer revision overflow fails closed without writing. No raw vendor errors or submitted name/settings values in logs. Normative OpenAPI, error catalogue and route inventory are amended only after approval.

## Persistence and compatibility

Use the existing `accounts/{accountId}` record and Auth Binding, through an Account-owned repository Port and the existing protected Firestore transaction pattern. No parallel Profile collection, index, scheduler, dependency or infrastructure is proposed.

- Add `displayName`, `profileVisibility`, `profileRevision` only on an approved Profile save. Legacy absence projects as `null`/`private`/`0`; do not backfill or silently change old visibility. A partially present or invalid new Profile field group is a service failure, not a permissive default. New onboarding writes may omit the group and receive the same owner projection until the first save.
- Add `settingsRevision` on Settings save; legacy absence is version 0. Preserve existing consent/visibility values. Invalid stored values fail closed. Transactions reread the same owner record and preserve every unrelated field and the other resource's revision.
- Keep initial onboarding request `initialChoice=accept|reject` and its Public/Private derivation unchanged. Extend the **current Account read** parser/type/OpenAPI enum to accept Friends-only after Settings. This is an explicit bounded amendment to the existing Account read contract; initial choice still cannot be Friends-only. Account consumers must distinguish these types.
- Preserve Note-only `check_ins` records and owner create/read authorization. This proposal does not settle past Check-in social-read semantics, per-Check-in consent, Activity permission, deletion lifecycle or Q27 administrative actions. Those remain affected consumer decisions; no third-party adapter is wired here.
- Future optional-processing operations must check authoritative current consent before reading data or publishing a result under Q17. This slice changes the producer setting only; it does not invent revocation/deletion behavior for absent operations or activate the internal AI/Friend components.

## UI, save/read and session behavior

Keep My profile's current Username/Interests behavior. Add Display name, an Edit profile entry and a Settings entry. Edit profile labels the name optional and offers three Profile choices with explicit Save; a blank form name explicitly submits `null`. Back before Save writes nothing. Save reflects the later canonical Backend read; failed reread shows safe Retry rather than a new unconfirmed success. A 412 asks the owner to reload and re-enter changes; no silent merge or overwrite.

Settings contains distinct **Profile visibility**, **Check-in default visibility** and **Optional data use** sections. Profile visibility opens the same Profile editor/resource; Check-in/data-use settings edit the second resource together with an explicit Save. This combines related surfaces while retaining `privacy-settings` and `consent-settings` capabilities. Proposed explanation: “Profile visibility controls who may view your profile. Check-in visibility is the default for future check-ins.” Optional-use copy must describe choice without claiming all AI is enabled or old data has been erased.

Add **Sign out** for this device through `AuthRepository.signOut()` and the already-installed Firebase Auth SDK. Successful signout follows the current unauthenticated route/gate, discards the old account's route stack and provider/page state, and presents Sign in. Failure shows “Could not sign out. Try again.” and does not manufacture an unauthenticated session. This is not account deletion, all-device revocation or password recovery. Do not persist a new offline Profile/Settings cache.

Read/loading/error/retry, save-in-progress and successful-reread states remain explicit. While a save is in progress, prevent duplicate submissions; a later response cannot mutate a disposed page or a changed account. Cancellation after a dispatched mutation cannot undo a committed write; reopening must reread. Returning to Home retains Q16's independent recommendation read without a new ranking rule or timeout policy.

## Acceptance and remaining coverage

Owner checks after approval must prove: legacy-safe owner reads without migration; normalized valid name and rejected invalid/undeclared input; all three independent Profile/Check-in choices; consent-only/visibility-only settings changes preserving the other value; unchanged initial onboarding mapping; two concurrent saves yielding one successful commit and one 412; preserved unrelated Account fields; failed/uncertain save and explicit reread; save/cancel/account-change/late-result guards; successful/failed device signout and safe subsequent sign-in. Use Domain/Application, API/route/parser contracts, protected Firestore Emulator and focused Flutter widget tests, then the existing isolated Android real-Backend path for the owner flow. DU reviews code and related evidence as one packet. All new-slice execution is currently **Not Run**.

This is the implementable next LI contract, not full Sprint acceptance. Coverage dispositions:

| Remaining capability | Disposition |
|---|---|
| Own Profile editing, privacy/data-use Settings, logout | Proposed here; implement after exact approval |
| Existing entry/onboarding/Interests and Home/Event reads | Retained approved behavior, with regression verification |
| Footprint/Calendar, Friend/Activity and Persona/AI Home/Profile entries | Pending the first approved owner destination/read from DU/JIN/ZHOU; no dead or fabricated destination |
| DOB/age, region, school/community, biography, avatar | Purpose/requiredness/disclosure and physical contracts remain Pending; not silently cancelled or collected by this slice |
| Verify/forgot-password | Prototype Evidence Only; no recovery/verification contract approved |
| Full Profile presentation to other users and JIN eligibility/block/interest readers | Pending the affected reader contracts. These fields supply only part of JIN's inputs and do not make Friend implementation Ready |

If LI approves this exact proposal, persist the confirmation under `docs/decisions/` before implementation. Preserve all earlier sources and record the narrow amendment: new owner Profile fields/Settings operations, current Account Friends-only read support, independent later settings choices and device logout. No waiver of DU review, predecessor review, merge, JIN gate, UAT or Release is requested.
