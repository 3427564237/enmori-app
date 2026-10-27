# Complete event address and Android actions — approved contract

Status: LI confirmed “确认合同并实现” on 2026-10-27 (Asia/Singapore). Source: [remaining batch decision](../decisions/2026-10-27-li-remaining-feature-batch.md).

## Complete address

Extend the existing authenticated `GET /v1/events/:eventId` with optional query
`includeVenueAddress=true`. With the query absent, preserve the existing response
shape exactly, including no new address field. No new endpoint or storage field.
The opted-in response may add `event.venueAddress`:

```json
{"street":"1 Example Road","city":"Singapore","postalCode":"123456","countryCode":"SG"}
```

This is synthetic schema illustration, not a real venue. `street` comes only
from the actual source venue `address.line1` (1–200 Unicode scalars), `city` from
`city.name` (1–100), `postalCode` from the actual six-digit Singapore postal code,
and country code must be the source's `SG`. Optional `street2` comes only from
`address.line2` (1–200). Reject unsafe control/bidi/markup text and malformed
Unicode. Do not truncate, geocode, infer from venue name, fill missing parts from
other venues or combine multiple venues. Provide the object only for exactly
one venue with all required parts valid. Otherwise omit the address; the Event
itself remains usable. Existing controlled Firestore Event records without a
complete source address omit it; no schema migration or new persistent cache.

Map action uses only this verified object, displays the complete address before
dispatch, and opens the Android `geo:0,0?q=...` address search. Missing address
shows “Complete venue address unavailable”; the map action is disabled. No
background location, coordinates inferred by ENMORI, or silent venue-name fallback.

## Platform boundary

Use a small Event action port and Android MethodChannel adapter, following the
existing platform-service pattern; no plugin, SDK dependency, manifest permission,
cloud service or calendar data access. Unsupported platform or missing external
app produces an explicit unavailable result. Dispatch checks foreground, current
session and fresh Event identity immediately before handing off.

Calendar uses Android `ACTION_INSERT` with CalendarContract.Events.CONTENT_URI,
actual title/start and optional actual end; do not invent end times. Location
uses the complete address if present, otherwise the existing source place label,
and the actual source URL is included in the description. Open the system editor
for user confirmation, never write Calendar Provider directly. Report only editor
handoff, not saved success; cancellation does not alter ENMORI participation.
The calendar app may supply its own editable default duration when no source end
exists; disclose that the source did not supply an end time.

## Validation

Test complete/missing/unsafe/multiple-venue source projection; opt-in/default
compatibility; auth and unavailable failures; exact native arguments and no invented
end; stale/session/background rejection; empty recent list, fresh detail reads,
review pagination/partial/revocation and AI draft-preserving exact jump.
Android native compilation and source tests are separate from device handoff,
real-account validation and Release. No deployment authorized here.

## Implementation references

The source venue fields were checked against the official
[Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/).
Native handoff follows Android's documented
[calendar intent](https://developer.android.com/guide/components/intents-common#Calendar)
and [encoded address map intent](https://developer.android.com/guide/components/intents-common#Maps).
These references establish platform mechanics, not product authority or device acceptance.
