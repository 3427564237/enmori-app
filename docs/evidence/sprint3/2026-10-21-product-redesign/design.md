# Product UI redesign — implementation direction

Authority: S-PM-1021-LI-PRODUCT-UI-DEFAULTS. Base `e1cd9c6`; replaces presentation only except the explicitly delegated small contract below. Private QQ reference inspected locally, never included in this packet.

| Page | Existing problem | Target structure / concrete change |
|---|---|---|
| Home | Large slogans, duplicate event browsing, many secondary buttons | Compact greeting and Check-in action; one Events section with manual browse; friend activity; small personal shortcuts |
| Check-in | Hero pushes input below fold; hidden labels; scattered permission actions | Input first, Mood/Location/Activity pills with custom text, one permissions sheet; saved result and recovery retained |
| Events / detail / people | Actions and facts have equal emphasis | Event cover or honest placeholder, title/date/place hierarchy, compact category filters, single primary action; participation and people grouped |
| AI | New conversation hidden; history in content; generic settings | Visible new action, drawer for history/Persona/AI settings, conversation remains dominant |
| Profile / friend profile | Many equal buttons, weak identity hierarchy | Avatar/name/username/BIO, interests, records/Footprint, participation, edit/settings |
| Friends / ignored / notifications | Dense operational labels and scattered refresh | Search and relationship state first, concise empty states, consistent rows and toolbar refresh |
| History / calendar / map / record | Similar pins hide overlapping records | True coordinates retained; numbered points and explicit record selector; chronological list fallback |
| Settings / privacy / interests | Defaults missing; fields poorly grouped | Separate new Check-in defaults, sharing and optional use; explicit save/readback; existing stale-revision recovery |
| Sign-in / registration / onboarding | Oversized whitespace and long explanations | Compact branded heading, form-first layout, inline validation and one primary action |
| Persona manage / edit / preview | Technical controls compete with content | Clear active Persona, grouped edit sections, preview and save hierarchy |

Shared direction: existing deep green `#244b3f`, warm paper and white surfaces; Playfair only headings; body in platform sans. Page gutters 16, section gaps 20, compact rows, 48px touch actions. Chips, sheets and drawer use Material semantics and reduced-motion-aware transitions. No marketing hero, new design package or animated backgrounds. Five primary actual Flutter widget previews precede secondary-page completion; synthetic data and disabled map networking must be labelled.

## Minimal contract (delegated by PM decision)

- Existing GET/PUT `/v1/me/settings`: optional independent booleans `defaultCheckInLocation`, `defaultCheckInWeather`; absent stored/response values decode as false. PUT omission preserves the stored value for older clients. Explicit false revokes the default for future drafts; existing settings revision CAS remains mandatory. Neither is inferred from sharing or optional processing consent. No history rewrite.
- Existing Check-in create/read/history/edit: optional `locationLabel`, normalized NFC trimmed short text (1–50 Unicode scalar values; empty/null clears where editable; controls/format/surrogates rejected), same validation as Mood/Activity. Old records omit it. Label follows record visibility but is never treated as GPS or sent to weather/AI/recommendation inputs.
- Existing Mood/Activity short-text contract unchanged. Activity text never becomes an event/category identifier.
- Composer reads settings before enabling save. Default location initiates one foreground capture per draft; late completion is fenced on exit, revocation/session changes. Default weather requires actual captured point, existing 0.1-degree request and settings revision. Per-draft disabling remains possible. System permission is never bypassed.

## Skill provenance

Installed personal `flutter-motion-engineering` from `ariaramin/flutter-skills`, commit `33586d6e67912a7fbaf731d3b3e1fc018b625154`, path `skills/flutter-motion-engineering`, MIT licence copied alongside. Source contains Markdown guidance and Flutter SDK-only example/test files, no install scripts. New skill available next turn; current changes use existing SDK primitives and repository guidance. Official `flutter/skills` at `6e59065` was inspected but contains no animation skill. No runtime dependency installed.

## Reference boundaries

UI-UX Pro Max identified Social Media App but its vibrant/marketing recommendations were too generic for the approved brand; broad design-system query returned marketing/pink guidance inconsistent with this app and was rejected. Flutter stack searches lacked verified matching guidance. Native Material chips/drawers and Flutter animation/reduced-motion APIs are the implementation fallback. No third-party UI assets copied.
