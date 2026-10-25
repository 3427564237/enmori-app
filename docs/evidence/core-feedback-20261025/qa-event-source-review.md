# QA — event information source review

Date: 2026-10-25. Candidate reviewed:
`a592f363860bd1f5ebbd84f3b0d6899d799e8e24`, parent
`087281e11ec5a681fd012b9d64431b225ed6f8ea`.
Contract read from Integration: `api/event-detail-presentation-contract.md`.

QA performed source review only. Delivery's 22 Node fake/injection passes remain
author evidence. At this review checkpoint its Flutter verification was pending
the Root-owned slot. No model, provider, CDN, browser, service, phone or test was
called by QA for this slice.

## Open findings at a592f36

**P2 — covering the detail route does not retire its image.**
`EventInformation._EventCoverState` checks mounted/generation, app lifecycle,
owner subject and disposal. A real ParticipationEventPage can push the
participants page through ParticipantPreview while the original detail remains
mounted in the Navigator stack and the app remains resumed. This leaves an
already decoded image retained; pending bytes can also complete, decode and be
installed on that covered route. The original five-minute expiry is not extended,
but the contract's visible-detail/exit retirement requirement is not met.

Relevant candidate lines:
`lib/features/event_detail/presentation/event_information.dart:103–118, 133–143,
160–176`. Actual navigation exists in
`lib/features/event_participation/presentation/participation_event_page.dart:211–218`
and `lib/app/router/event_participation_routes.dart:72–76` at the common baseline.
The author's exit test only replaces the entire widget tree; it does not perform
a Navigator push over an existing detail.

Delivery independently accepted this path after QA's report and is preparing a
route-visibility fence. Closure still requires a repaired exact head and focused
evidence: push a real covering route while bytes are pending and after decoding,
verify cancellation/disposal and no late refill, then verify returning does not
silently revive the retired snapshot. Checking route visibility only at async
completion would not dispose an image already held before the navigation.

**P3 — missing-description copy overstates upstream absence.**
The source projection deliberately discards nonempty unsafe/HTML description
fields. `EventInformation` and the fallback ActivityPage nevertheless say that
Ticketmaster did not provide a description. A neutral unavailable-description
message covers both genuine absence and filtered data without inventing a
reason. This needs only the bounded copy correction, not a new field or suite.

## Other inspected boundaries

- Description comes from safe plain `info` then `description`, is whitespace
  normalized and bounded. Cover selection uses the occurrence's actual images;
  no arbitrary fallback, scraping or generated content is added.
- The cover URL is HTTPS on the approved host; credentials, query, fragment and
  custom port are excluded. List responses remain minimal while detail types
  and strict readers carry optional presentation data.
- The detail-owned HTTP client omits ENMORI credentials, disables redirects and
  compression, enforces allowed MIME types, a ten-second deadline and 2 MiB
  maximum, then closes itself. Decoding checks actual dimensions and uses
  RawImage instead of the global ImageCache. Failed images preserve text/actions.
- Background/owner/dispose cancellation and parent expiry are present. These
  are distinct from the uncovered navigation case above.
- Ticketmaster purchase/booking wording uses the actual provider URL and does
  not invent a second information URL or guarantee the browser's final step.
  The participation return confirmation and unknown-write flow are unchanged.

Root's generic EventDetail serializer, controlled source-to-detail projection
and route injection are not included in this candidate. Final verification must
check those shared paths at the integrated head, including optional cover and
description surviving through the actual authenticated response and active page.
