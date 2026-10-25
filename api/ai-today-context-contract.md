# Automatic current-day Check-in context — 25 October 2026

Authority: LI's [v28 feedback and automatic-today direction](../docs/decisions/2026-10-25-li-core-experience-repair.md).
This extends the existing local F1 prepare/execute protocol; explicit IDs remain
compatible. No new model, provider, data category, retention extension or
persistent inferred memory is introduced.

`prepare.contextSelection` is exactly one of:

```json
{"processing":"local","sources":[{"kind":"check_in","checkInId":"owned-id"}]}
```

```json
{"processing":"local","today":{"timeZone":"Asia/Singapore"}}
```

The client cannot submit both, a date, time, owner, cap or source contents.
The existing device IANA-time-zone port supplies the zone. The server validates
its canonical form, derives today's civil interval from its authoritative clock,
and reads only the current owner's records in `[startUtc,endUtc)` no later than
the captured `asOf`. Reuse `createdAt DESC, document ID DESC`; read at most six
rows to select the latest five and determine `hasMore`. Existing seven-day,
purpose, exact source-version, owner and accepted-operation checks still apply.
No new index or storage model is required. A record with rejected authority or
unavailable source is not silently converted to an empty day.

The existing prepared selection returns its current metadata and cards. Only
the automatic branch adds `today:{date,timeZone,limit:5,hasMore}` and an owned
`checkInId` on each of its source cards, for exclusion matching in this topic.
This identifier never enters a model prompt. Source text projection remains
Note, stored Mood/Activity and original occurrence time, excluding GPS/weather.
Internal preparation binds date, zone and interval. Crossing the civil-day
boundary before acceptance needs a fresh preparation; no automatic replay.

The existing execute shape is unchanged: the client resolves this preparation's
fresh `selectionKey`s into included/excluded keys. Current-topic exclusions are
matched by source identity, never by reusing old keys. Excluding a selected item
does not fetch or insert the sixth record. Show the latest-five limit when needed.
No records is valid and admits ordinary chat. Unknown date/source availability
is visibly different from no records; the user can explicitly turn references
off to continue. Turning off uses the existing explicit `sources:[]` form.

The UI defaults to automatic current-day references for this topic while the
existing local-AI purpose is enabled, displays the scope and exclusions, and
keeps an off control. This replaces mandatory manual picking and preconfirmation.
One explicit Send performs fresh prepare and then one execute. It cannot bypass
Persona/consent/source authorization, send twice, or recover an unknown execute
by starting a new operation. Actual inherited-history conflicts still require
explicit whole-pair exclusion; only unchanged pair identities may carry a user's
prior exclusion choice to new keys. Changed dependencies require fresh review.
Drafts, source choices and the original saved-user Retry identity are preserved.

Today/off/exclusion UI state is held only for the current session/topic and
clears on new topic or account/session replacement. No cloud calls, proactive
intent, background location or notification follows from automatic context.

Ownership: Context implements selected-reply application/reader/Ports and only
the bounded `listOwnCheckInDayPage` Firestore transaction gateway extension;
App implements client/controller/UI; Integration owns HTTP validation/projection,
the normative API document, device-zone injection and shared composition.
