# Avatar extension: minimal implementation contract for LI confirmation

Product authority: [confirmed visibility decision](../decisions/2026-10-27-li-avatar-visibility.md).
Status: approved by LI on 27 October: “按这套最小方案实现”.
Authority: [implementation decision](../decisions/2026-10-27-li-next-batch-implementation.md).

- Keep existing `/v1/me/profile/avatar` GET/PUT and its three-field response unchanged.
- Add authenticated `/v1/me/profile/shared-avatar` GET/PUT. GET returns
  `{avatar:{pngBase64,sourceSha256,revision,visibleToAuthenticatedUsers}}`.
  PUT requires `{pngBase64,expectedRevision,visibleToAuthenticatedUsers}`. Public
  confirmation must be an explicit boolean; null image requires false. Saving the
  current image with true is the owner's explicit publication operation.
- Add authenticated GET `/v1/users/:username/avatar`, resolving only an exact
  existing username. Return `{avatar:{pngBase64,sourceSha256}}`; both null for
  missing, unset, private or removed target avatars. Do not expose target
  revisions, private fields, profile visibility, or existence distinctions.
- Persist one optional boolean `avatarVisibleToAuthenticatedUsers` on the
  existing account document in the existing revision transaction. Absent means
  false. An invalid present value fails closed. No collection, index, migration,
  dependency or storage service. Old PUT always resets visibility to false so
  old clients cannot accidentally publish a replacement photo.
- Require authenticated completed viewer accounts and valid completed target
  account bindings. Profile visibility does not restrict an explicitly shared
  avatar. Writes still derive their owner only from the verified principal.
- Reuse existing PNG validation, metadata stripping, revision conflicts and
  failure vocabulary. Apply `Cache-Control: no-store` to every avatar response.
- New client saves carry the displayed visibility choice. Unknown-result recovery
  compares advanced revision, image hash (or exact canonical bytes when republishing)
  and visibility, preserving drafts and
  never automatically retrying a write. Account/background/route transitions
  invalidate read results and clear decoded images; foreground/return reads
  refresh visible identities. No persistent photo cache or AI use.
- Verify legacy privacy, explicit publication, replacement/removal, restricted
  profiles, two-account authorization, anonymous denial and unknown-result
  recovery with isolated tests. Live accounts and physical-device acceptance
  remain separate evidence.
