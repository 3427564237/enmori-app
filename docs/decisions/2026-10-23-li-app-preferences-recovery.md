# LI — App product round: personal preferences recovery

- Authority: LI HOURUI / PM, explicit App task dispatched 23 October 2026 from source chat `01a15293-dbcf-75e2-b020-398d61d677cb`; scope confirmed by its six-chat collaboration authorization.
- Implementation baseline: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`, dedicated `souma/product-app-20261023` branch. Preserve the integration checkout and all later independent increments.
- Scope: Home, own Profile, Account and Settings presentation and existing client preference flows. Internal layout, copy and composition decisions are delegated; normal design choices do not require another approval.

## Retained authority and narrow supersession

Retain `2026-10-05-li-profile-settings-approval.md`, `2026-10-21-li-product-ui-redesign-and-defaults.md` and `2026-10-23-li-product-experience-refinement.md` and their referenced contracts. This round replaces only the editor's destructive-only reload recovery and unclear save feedback, and refines own-Profile presentation. It does not supersede their privacy, consent, location, weather, recommendation or persistence contracts. The former instruction to continue the old UI/UX branch applies to that historical pass; this explicitly requested round uses its dedicated branch and Draft PR into `souma/li-zhou-runtime-20261020`.

## Selected bounded delivery (implementation choice under delegated scope)

- Recover Profile/Settings drafts after stale revision or uncertain save: explicitly read latest, restore only locally modified fields against that snapshot, disclose concurrent same-field changes, require a fresh user Save. Keep ordinary reload/discard available. Never automatically retry a mutation or silently overwrite unedited remote fields.
- Recovery is transient editor state, scoped to the existing observed auth session, with no persistent cache/offline queue. Existing session and content-access fences remain.
- Show current pending/saving/readback state near Save and remove stale success feedback when edited again. Group settings by purpose, keeping independent choices independent.
- Own Profile presents its existing identity, biography, affiliation, region, interests and privacy state; records/participation reuse existing callbacks and slots.
- Home already has a Today/Check-in/weather/Events hierarchy at the specified baseline. Do not duplicate Social/Journal data or fabricate personalization to expand this delivery.

The recovery scope adds no API, schema, dependency, data use, permission or infrastructure change. Production-data changes, shared-service operations, signing, device operations, merge and deployment remain outside this task. The separately authorized language addition and its SDK wiring are recorded below. New needs outside this scope remain proposals. Source tests do not establish device/UAT/Release acceptance.

## Explicit PM addition: Chinese / English, 23 October 2026

The human user in this App chat explicitly requests: “请在 Settings 增加语言切换，先支持中文和英文，保存用户选择，重新打开应用后仍生效。请覆盖实际界面文案，并与 Integration 协调其他模块的翻译和全局接线，避免只翻译设置页。沿用本轮交付规则。”

This adds a saved UI-language preference and actual cross-module Chinese/English interface coverage. Integration owns the single global locale/persistence interface and global app wiring; module owners translate their actual feature interfaces through that interface. App owns its Settings selector and Account/Profile/Home copy. This does not authorize translation or modification of user-authored content, backend record values, event source text, AI payloads, permissions or recommendation rules. Persistence/dependency details will be recorded when the bounded implementation design is agreed; no new backend account field or cross-device sync is implied by “重新打开应用后仍生效”.

Integration's bounded implementation choice: one shared `context.tr(en, zh)` presentation helper; Flutter SDK localizations for platform controls; existing native MethodChannel boundary backed by Android preferences / iOS UserDefaults. No third-party package or Backend field is introduced. Device language is immediately saved independently of service-side Save/revision and remains through sign-out because it carries no account identity. Save failure retains the previous language. App supplies a Settings language slot usable even if server settings cannot load; Integration supplies and wires the actual persistent control. Translation changes UI copy only; existing English remains the default and existing wire values remain unchanged.
