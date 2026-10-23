# Journal product round — 23 October 2026

Authority: LI/PM's complete Journal assignment in chat
`01a1689b-1662-7f13-bc79-b5ffeeadd284`, from the six-role product round
started in `01a15293-dbcf-75e2-b020-398d61d677cb`. Human collaboration
authorization was directly verified there: “授权六个聊天直接协作（推荐）”.
Baseline: `7cf12cd398eb1a613eff2e5c867af5a623428cf5`.

## Confirmed scope and retained authority

This round delegates internal Journal design, implementation and a Draft PR to
`souma/li-zhou-runtime-20261020`. It supersedes earlier UI-chat ownership only
for this round's create/edit/detail, History, Calendar and shared map components.
Integration retains global theme, motion and routes; App retains defaults;
Social retains relationships. No main merge, deployment, real data, device,
service, signing or new data-collection/sharing purpose is authorized.

Retain the 19 October core-delivery rules and
`2026-10-21-li-history-footprint-chat-feedback.md`,
`2026-10-21-li-product-ui-redesign-and-defaults.md`,
`2026-10-22-li-ux-priority.md`, and
`2026-10-23-li-product-experience-refinement.md` outside this bounded change.
In particular: Note or Mood; stored defaults for new records only; foreground
single GPS capture; separate hand-written place/Activity labels; 0.1-degree
weather requests; no refresh of historical weather on text edits; server-owned
authorization; mutation/access invalidation; same-request unknown recovery.

## Implementation choices under the delegated scope

- Existing: month counts/markers, date reads with cursors, exact-ID Calendar to
  History return, record management, map points and nearby-point chooser.
- New loop: move between days with records **within the selected month**, using
  the existing month counts and captured device IANA zone; read that date through
  the existing repository. Empty/error counts never imply no history elsewhere.
- History's Load more appends authorized pages, deduplicates stable IDs, preserves
  reading context on next-page failure, and clears accumulated rows on reload,
  date/session/access changes. This deliberately replaces the older
  replace-the-visible-page presentation (and its tests), not the cursor contract.
- Calendar identifies History as its return destination. Months and daily pages
  remain server queries; this is not keyword search or complete-history filtering.
- Map selection shows time context and one current server-authorized record
  summary before an explicit detail action. No bulk content prefetch, inferred
  route, extra location collection or new persistence.
- Create/edit reuse the same custom Mood/Activity/place-label interaction.

These are implementation choices, not new Sponsor requirements. Delivery evidence
will distinguish isolated source checks from unrun connected/device acceptance.

## Confirmed language extension

Directly verified human message in App chat
`01a1689b-0799-7550-a624-e44ec1aa3081`, message
`01a168a0-5c07-78e1-afb2-a6aafae02152`: add English/Chinese selection in
Settings, persist it across reopen, and cover actual interfaces through
Integration coordination. Integration owns locale persistence and SDK delegates.
Journal uses its shared `context.tr` and typed failure helper. Existing notes,
labels, IDs, coordinates and stored timestamps stay unchanged. A user choosing a
localized quick Mood/Activity label creates that explicitly selected free text;
these labels are not API enums or Event IDs. No stored record is translated.
