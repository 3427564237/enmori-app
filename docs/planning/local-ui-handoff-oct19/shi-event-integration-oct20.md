# SHI Event integration handoff — EP1 + EB2

Target: `souma/li-shi-du-integration-20261020`, starting at
`900ca6fcdefb77e9aa95d96fa80994ebf826398f`. This adds to the already-integrated
19Oct SHI package; do not cherry-pick that package again. Formal authority is
the 20Oct participation selection P01–P06/P05 and the next-batch PM extension
copied unchanged from PR #165. Exact HTTP/storage/scan/index/cursor choices are
in [the normative contract](../../../api/event-participation-contract.md).

## LI/JIN composition (not enabled by this PR)

1. Construct `createIsolatedEventParticipation` using the existing isolated
   Firebase environment, gateway, server clock, same gated BrowseSource and a
   private >=32-byte cursor signing key. Never put the key in Flutter/config Git.
   This constructor deliberately rejects real/demo credentials; it is not a
   rollout shortcut. LI must separately select any real-account composition.
2. Register `registerParticipationRoutes(app, identityVerifier, feature.operations)`.
   Choose **one** existing Browse route registration, passing `feature.browse`;
   do not register duplicate `/v1/event-browse` paths. Preserve the shared router's
   `maxParamLength:174`. Source batch support is opt-in; no source fallback.
3. Inject `feature.ignoredEventIds` into the existing controlled recommendations
   constructor. Music binding, consent, ranking and interest mapping are unchanged.
   The same gated source forwards batch/stable-ID detail, with disable-generation
   checks; do not bypass it with a second provider client. Later-page occurrences
   are read by stable ID from a bounded identity-only in-process registry followed
   by a fresh provider Detail read, not from archived provider content.
4. Flutter: override `participationRepositoryProvider` with
   `BackendParticipationRepository(existingAuthorizedBackendClient)`; override
   existing Activity and EventDetail Repository providers with that same runtime.
   Defaults cannot report an in-memory success. Register `eventParticipationRoutes`
   with the existing external opener, current-session guard and immutable Username
   profile callback. `/participation-events` is the independent paginated list;
   `/events/:eventId/participation` uses the approved existing Detail endpoint.
5. Home: reuse `EventCard` + `ParticipationControls(eventId: ...)`, with only
   server-authorized reason/count arguments. Profile: `OwnParticipationSection`.
   JIN's other-user profile: `UserParticipationSection(username: ..., onSelect: ...)`.
   Participants callbacks carry **Username**, not UID/accountId. Invalidate the
   `userParticipationPageProvider` family and participant controller family after
   a relationship/privacy mutation; server reauthorizes every read regardless.
6. The internal `purgeDeletedAccountPage` seam is bounded and refuses a live
   Account; JIN's separately approved permanent-deletion orchestration may call
   it only after its trusted marker. No scheduled cleanup/deletion service or
   migration is installed here. Deploy the one documented composite index only
   through LI's approved target process, not by running these synthetic tests.

## ZHOU review / LI device checks

- Independent exact-head source review: persistence/CAS/no-op, source-independent
  cancellation, read-before-retry, privacy/relationship/count scan bounds,
  signed scoped cursors, later-page Detail identity, unchanged recommendation rules.
- Device: list -> bottom Next -> actual changed batch; duplicates once; sparse
  empty batch still Next; injected dependency failure preserves rows/cursor;
  Retry requests same position; final available window disables Next; Reload
  starts a new window. Background/session replacement drops late results.
- Interested/Going/cancel/ignore agree across Home/list/Detail/Profile and a new
  Repository read. Ignore never cancels Going. Unknown write/412 requires Read.
- External browser return: ordinary parent rebuild (including fresh callback and
  opener objects) preserves the in-flight coordinator; No does not write, Yes
  writes Going once. Launch success is not a registration/payment receipt.
- Four participant groups independently read authorized pages; zero count is
  displayed only when exactly authorized, unavailable count is omitted, stale
  names/counts disappear on failure/background. Profile navigation uses Username.

Actual provider/device/account rollout, deployment, source-key handling and
end-to-end acceptance remain LI-owned and **Not Run** in this source delivery.
JIN's Home friend activity extension remains JIN-owned, not implemented here.
