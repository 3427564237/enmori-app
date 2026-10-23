# App round implementation and validation plan

1. Preserve the pinned baseline; inspect the actual Profile/Settings/Home flow and the applicable authority. Record this round's narrow PM scope.
2. Add transient typed draft recovery: three-way comparison of base, local draft and latest server snapshot. Treat affiliation type/name as one field. No automatic write; untouched fields adopt latest values. Show conflicting field names for explicit review.
3. Wire explicit recovery and discard/reload into the existing editor, preserve failed-reload drafts and existing session fences, place truthful feedback next to Save, and group settings without changing their meanings. Improve Profile identity/privacy context using saved values only.
4. Verify affected fake-repository flows: save/readback, concurrent updates, uncertain commits, failed recovery retry, discard, session replacement, narrow screen/large text and keyboard. Reuse existing consumer tests for settings-to-new-Check-in behavior. No shared runtime or APK build.
5. Inspect the diff and run targeted checks in the Integration-coordinated Flutter window. Commit/push, create a Draft PR targeting the integration branch, attach it and report exact SHA, shared-file impacts and unverified boundaries.

Review focus: unchanged remote privacy fields must survive recovery; affiliation cannot combine school type with another endpoint's company name; read failures cannot erase the only recoverable draft; same-session readback cannot show saved when a newer draft differs; replacement sessions cannot inherit drafts or pending recovery. No changed business requirements or backend contracts.

## Added language scope and review coverage

The later explicit user request adds English/Chinese UI and a durable device language choice. Integration supplies shared helpers, SDK delegates, native storage and global route wiring. App supplies the Settings slot and actual own-module translations, including labels, validation, recovery, weather conditions, counts and accessibility copy. User-authored content and wire values remain original.

The language slot is outside the account-settings load/failure branch, so an unavailable Backend does not hide a device-only preference. Language switches do not submit server settings or discard an unsaved privacy draft. Bilingual tests use real Flutter SDK delegates. The shared language persistence/restart proof belongs to Integration; this package's tests cover the consumer UI and its independent save semantics.

## Surface audit at the pinned baseline

| Surface | Existing capability | This round |
| --- | --- | --- |
| Home | Today/date, primary Check-in, optional weather, delegated recommendations/feed; full shell already suppresses duplicate personal shortcuts | Retain hierarchy; translate real headings, actions, tooltips and empty/unavailable copy; no invented personalized data |
| Own Profile | Persisted display name, immutable Username, BIO, affiliation, region, interests, delegated records/participation | Saved profile audience is visible and editable; school/company icons follow actual type; bilingual identity/editor/empty states |
| Settings | Independent revisioned privacy, data-use, map, Check-in defaults and Home weather | Group by purpose, persistent save feedback, explicit draft recovery/readback, language slot independent of service load |
| Account | Sign-in/register, validation, onboarding choice, email links | Translate actual controls, validation, consent explanation and feedback; no auth/backend changes |

No new Social/Journal data source, route or global theme is introduced. Existing Playfair/forest-green tokens and EnmoriMotion remain. Profile records and participation keep their existing integration slots.
