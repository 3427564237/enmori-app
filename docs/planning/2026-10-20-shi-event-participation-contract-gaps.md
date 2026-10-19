# Event participation — one concentrated contract decision

Status: candidate / NOT approved as a physical API or datastore contract.
Owner: SHI. Product decision: LI. Implementation review: ZHOU.

## Authority and supplied starting point

The user explicitly asked SHI to execute the supplied `shi.md` against the
19 October team bundle, after the historical single-chat/paused-package notes.
This is current authorization for SHI's scoped work, not a claim that the earlier
PM records were rewritten or that all five owners have started. Preserve those
records. The bundle HEAD is `927f77527b32d349aa08020f7de0e88402edb9c7` and contains
feature/UI baseline `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`.

Confirmed behavior comes from the supplied task, S-PM-1019-LI-CORE-SINGLE-CHAT
section9, existing participation privacy, and the preserved source-use decisions:
stable Event identity, Interested/Going/cancellation/ignore, explicit third-party
disclosure, return Yes -> Going / No -> unchanged, no Booked, current relationship
and participation privacy, manual participation regardless of data consent.

The assigned Backend Skill explicitly stops endpoint, public DTO/error, cursor,
precondition, Firestore field/ID/index/retention selection without the applicable
contract. The bundle has product direction but no such participation contract.
Do not turn a reasonable implementation choice into a confirmed PM rule.

## Recommended single decision packet for LI

These are recommendations, not implemented public routes or fields:

1. **State/ignore:** use `none | interested | going` plus an independent ignored
   flag. Recommend ignore affects recommendation visibility only and does not
   silently cancel an existing Going; explicit cancellation sets none. LI must
   confirm whether this is intended rather than a mutually exclusive ignored
   state, including how explicit re-selection clears ignore.
2. **Read/write/concurrency:** recommend owner read + idempotent replacement at
   `GET/PUT /v1/events/{eventId}/participation`, using the existing integer revision
   convention and exact precondition/error envelope convention chosen in the final
   contract. Recommend revision0/no participation for a missing owner record,
   compare-and-set inside one transaction, 412 for stale revision, no automatic
   mutation retry. Unknown result first re-reads. Final request/response/schema,
   header/body precondition representation and error identifiers need approval.
3. **Stable identity/lifetime:** use the existing internal stable Event ID, not
   browse locator, title or a global current-event variable. Recommend a single
   owner/Event record with status, ignored flag, revision and server timestamp.
   Confirm physical collection/key, allowed fields and cancellation/tombstone
   lifetime; specify what persists when the five-minute source projection expires,
   is refreshed or the source is removed. No provider content is copied into a
   participation record, no index/deletion/migration is selected by this packet.
4. **Participants:** recommend separate Friends/Others cursor reads with a small
   fixed page size, re-evaluating current friendship/block/eligibility/privacy on
   every read. Missing participation privacy remains private. Counts must be of
   currently authorized people only, never stored unfiltered totals. Confirm
   public participant fields and exact opaque user identity compatible with JIN's
   profile callback; never expose Firebase UID. Confirm ordering, cursor scope,
   handling of sparse filtered pages and permission changes between pages before
   defining the DTO/index/query. Do not infer a total from one returned page.
5. **Integration:** owner participation readback is the one source for Home,
   lists, detail and profile participation section. JIN supplies only the existing
   friendship/profile access seam; SHI does not implement social relations.
   LI wires shared router/bootstrap after the module is accepted. Declining data
   consent must not be used to reject manual participation. Recommendation keeps
   the already-approved exact Music mapping; other interests do not gain mappings.

Approve/adjust this one packet and persist the exact normative selection before
SHI implements transport, Firestore, participant paging and whole-module fixtures.
No real-host credentials are needed to make that decision or implement the
subsequent isolated adapter/tests. Missing host access is NOT the present code gate.

## Implemented independently now

`EventCard`, `ExternalRegistrationAction`/`ExternalRegistrationFlow`, and a pure
Backend participation-visibility policy with focused tests. The action requires
explicit real write/read injection; no default fake, HTTP route, Firestore write
or root composition has been installed. This is a tested partial increment,
not the complete Events package or a persistence/Emulator/device Pass.
