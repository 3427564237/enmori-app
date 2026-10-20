# FA2 — authorized Friend Activity display

Authority: S-PM-1020-LI-EVENT-BATCHES-FRIENDS-ACTIVITY, exact decision blob at
`7e802c6215f8f3967ea220807083619f6c66adfc`, read with the full JIN prompt at
PR #165 `a822091071ddd206eea4d1041b7349006214ffb6`. This is the delegated minimal
DTO/display extension to the existing JIN package, not a new feed/storage system.
Q03 ranking, seven-day window, Q17 scoring inputs, consent and privacy remain.

## Existing endpoint, extended display only

`GET /v1/me/friends/activity?view=home|all&category=all|check_in_created|event_interested|event_going`
retains verified-principal authentication, no-store, strict query and existing
failure mapping. The client never supplies an account/owner ID or rank value.
Home returns at most two visible results; See all uses the same filtering/order.

Every item still has `type, sourceRecordId, occurredAt, username, displayName`.
Exactly one additional display object is required:

- Check-in: `checkIn: {note, mood?}`. Mood is the normalized saved label for that
  specific Check-in, not the friend's present mood. Note follows the existing
  Check-in content validation. No location/weather/activity label/AI fields.
- Interested/Going: `event: {eventId, title}`. `eventId` is a stable canonical
  Event ID, not a `tm_` browse locator. Title is current source-authorized text,
  bounded to 500 UTF-16 units by this adapter. No provider document is retained.

Metadata queries still select only owner, created time and Check-in visibility.
Only type/source ID/time/private Special Care flag reach the unchanged ranker.
Actor display information is kept outside that input. After ranking, the selected
Check-in body is read and minimized in the same Firestore transaction. Private,
expired and unselected Check-in bodies are not fetched for Home display.

Current eligible viewer/target, completed identity, Username reservation, accepted
friendship, no block, profile visibility, applicable consent and record/participation
visibility are checked on each read. Deleted/hidden/revoked records cannot be
recovered from an old card. Private legacy/missing visibility remains denied.
Malformed authorized content fails closed; no old display fallback is used.

## Stable source navigation and UI

Home, See all and activity Detail use the same Repository endpoint. Detail passes
only immutable `{username,type,sourceRecordId}` and selects its freshly authorized
result; missing source is unavailable, not an empty successful Detail. This does
not add a second public Detail endpoint or pass cached Note/title as authority.

The optional host Event callback receives only the current stable Event ID after
an additional authorized activity read. It must open LI's existing gated Event
Detail. Rendering, requests, lifecycle clearing and callbacks are session/generation
bound, including same-UID replacement before repaint. Waiting, empty and service
failure are distinct; background clears content and does not restart reads.

## SHI producer / LI composition boundary (still explicit)

`EventActivitySource.read(tx,viewer,owner,asOf,"friends_activity_v1")` supplies
only current, purpose-authorized Interested/Going metadata. Its `display` operation
receives the selected metadata and rechecks exact participation plus the same gated
current Event source before returning only `{eventId,title}`. `undefined` from
`read` is unavailable; `undefined` from `display` means that selected content was
revoked/removed and is omitted. Missing producer is never a fabricated empty feed.
No concrete EP1 producer or ordinary runtime is enabled by this increment.

SHI #167 was read at approved exact `db1b7249c7b97d0e0f8e68e3d9024efcc4e1b9be`
(product `ac849740ead323d19419eaf7b3dcd3098445f411`). Its R1/R2 are resolved;
they are not an outstanding review wait. EP1 persists `updatedAt` on every changed
participation/preference write, including Ignore/restore, and public other-user
rows expose only Event ID/status. It does **not** establish the time of the latest
Interested/Going selection after preference-only writes. This package does not
mislabel that timestamp, infer a historical time or add an unapproved storage field.

Small remaining decision for LI, with SHI owning the participation producer:
confirm whether activity means the latest participation-record mutation (including
Ignore/restore, with explicit display wording), or requires the actual status-selection
instant retained by SHI. The latter requires an explicit physical-field/history
rule for existing records. JIN will adapt the approved producer at the existing
composition point. Check-in activity and strict Event callback fixtures proceed
independently. No real Event read/participation/time acceptance is claimed here.

## Composition correction from review R3

`registerSocialModule` is now `backend/src/bootstrap/register-social-module.ts`.
It injects the public `friends/ports/social-authority.ts` contract into Activity,
Recommendations and Ignore; consumer adapters no longer import Friends Infrastructure.
Storage/path/read behavior stays inside the owning adapter. Shared Check-in decoding
uses `CheckInProjectionDecoder` injected through the owning feature provider;
Weather rendering uses its public builder slot. No new dependency or architecture.
