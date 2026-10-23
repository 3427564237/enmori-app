# Social round 2 — compare visible activity plans

Status: bounded implementation selection under the confirmed
[round-two PM delegation](2026-10-23-li-product-round2.md); acceptance pending.
Social directly read the human reply `01a16967-05ab-7661-85e9-92109f82c384`
in source chat `01a15293-dbcf-75e2-b020-398d61d677cb`.
Base: `4d9cbf926d356320bc9b4721031e3c50dddd9fae`; the previous Social commit
`b78c06f22411ba0d10561a2c15dae1f6a4041ea1` is already an ancestor.

## Audit and selected new loop

My plans already accumulates and filters the owner's saved participation.
Profiles already expose authorized Interested/Going records; activity cards
already open their stable Event ID. These are retained, not counted as new.
Currently the user cannot see their own choice beside another person's visible
choice without opening each Event separately.

Add an explicit **Compare plans** entry to the visible participation section.
The comparison reads one authorized page for the selected immutable Username
and checks the owner's current participation for those Event IDs through the
existing shared participation controller. It shows both states and which Events
both people have chosen. The user opens the existing Event detail, changes only
their own choice through its established save/readback flow, then returns to a
fresh comparison of the same page. Revisiting reconstructs from persisted facts.

The comparison is a private, transient presentation of already-authorized data.
It creates no invitation, notification, new sharing setting, inferred agreement,
new ranking/context input or second writable store. It does not expose the
owner's private choices to the other person. Interested/Going are not bookings.
No changes to P01–P06, EB2, privacy defaults, source retention or consent rules.

## Bounded read and interaction contract

- Existing `ParticipationRepository.forUsername`: explicit pages of at most 20;
  no scanning across pages or hidden all-friend lookup. Page replacement avoids
  presenting accumulated stale foreign records. Refresh/return rechecks the
  current page; First page restarts; Next is explicit.
- Existing shared `ParticipationController.load`: at most three owner reads in
  flight for the visible page. Failure/uncertain/busy states remain unknown,
  never interpreted as no participation. No comparison command writes data.
- Before Event navigation, re-read the same public page and verify the selected
  Event is still visible. Clear old content while checking and while covered.
  Session replacement, content-access invalidation or backgrounding retires
  old rows and callbacks; late results cannot restore them. Errors do not become
  empty lists. A failed page retains only its retry cursor, not foreign content.
- The existing detail owns mutations, expected revision and unknown-result
  recovery. The existing title component owns ephemeral source content; no
  supplier title is copied into participation storage.
- Integration owns shared route/composition wiring. The new page accepts
  Username and an asynchronous Event-ID navigation callback. The existing
  participation section exposes an optional comparison-entry callback.

English/Chinese copy, large text, meaningful loading/error/empty feedback and
existing theme/motion apply. Test through repository fixtures; report the exact
central validation commands. No service, real-data, device, signing or deployment
operation is included in this Social delivery.
