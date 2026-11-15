# My Friends display-name fallback

Authority: [LI's 15 November 2026 amendment](../docs/decisions/2026-11-15-li-friend-list-name-fallback.md).

For `GET /v1/me/friends` and `GET /v1/me/friends/search`, retain the existing `MyFriendsPage` wire shape. After all current relationship, privacy, eligibility and integrity checks, a row's `displayName` is its actual DisplayName or, if validly unset, its canonical Username. Existing Profile parsing is unchanged: a saved unset name is null; an incomplete saved Profile still fails validation, and a wholly absent legacy Profile retains its private default. Malformed names still fail validation.

Search uses the existing normalization and substring match over this displayed label. A named account is searched by its actual DisplayName; its Username is not an additional search key. The existing owner-bound cursor, page size and read budget remain unchanged.

Private Profiles, blocked pairs and ineligible targets remain excluded. Discovery opt-in never overrides this exclusion. No fallback is persisted into an Account. Profile, Activity, recommendation and other consumers retain their separately authorized contracts.
