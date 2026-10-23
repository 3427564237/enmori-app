# Journal round 2: a new draft from an owned Check-in

Scope follows [LI's confirmed second-round delegation](2026-10-23-li-product-round2.md).
The actual human reply was read in source chat
`01a15293-dbcf-75e2-b020-398d61d677cb`, message
`01a16967-05ab-7661-85e9-92109f82c384`. Integration assigned Journal one genuinely
new recording/review loop and accepted this selection and route boundary.

The clean worktree branched from exact
`4d9cbf926d356320bc9b4721031e3c50dddd9fae` into
`souma/product-round2-journal-20261023`. The old branch remains, and the baseline
already contains the first Journal delivery and calendar index repair.

## Audit and bounded choice

Already delivered: record creation/editing, calendar counts, date reads,
accumulated history pages and footprint summaries. These are not new in round 2.
The missing loop is using one's earlier writing as an editable starting point
for a separate Check-in, without altering the original or retyping everything.

Within the delegated design scope, implement:

1. An owned saved-detail action opens a new source-ID route. Re-read through
   `CheckInRepository.readOwned`; never accept a social projection as ownership.
2. Only Note, Mood and Activity become temporary editor input. There is no
   template store, source-reference field or new Backend/API contract.
3. Do not copy ID, creation time, revision, place name, GPS, weather or sharing
   state. Current new-Check-in preferences come from the existing settings
   repository, including their independent location/weather purposes. The
   default-private and explicit per-record visibility rules are unchanged.
4. Show review guidance and allow editing/removing text before explicit Save.
   Opening/retrying the source never creates a record. Source failure does not
   open the composer, fetch settings or start default GPS.
5. Use the existing new-record save, server ID/time and same-request recovery.
   Failed settings still block saving. Back retains the discard confirmation,
   with discard returning to the source. Saving opens the newly returned ID.
6. Source loading is fenced by session and content-access revision; a session
   replacement, including the same UID, permanently retires this draft route.
   Once copied, the text is the user's local input: subsequent mutation receipts
   must not overwrite edits or dispose an uncertain save. Nothing persists after
   leaving the route, beyond the existing submitted-request recovery behavior.

Integration owns route wiring and source/session callback checks. App may link
today's saved records to this same detail action; its separate date projection
must not treat History's mutable selected date as today or all-time recency.
Backend confirmed existing owner-read/new-key creation contracts are sufficient.

This extends the round-1 recording UI only. It does not supersede stored-default,
consent, server authorization, location/weather, data-preservation or unknown-save
rules. No shared runtime, real account, phone, deployment or main merge is used.
