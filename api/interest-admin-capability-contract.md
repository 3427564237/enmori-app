# Minimal Interest Admin capability — 22 October 2026

Authority: [21Oct parallel-completion decision](../docs/decisions/2026-10-21-li-parallel-completion.md)
and its [ZHOU complete task](../docs/handoff/2026-10-21-parallel-completion/zhou-admin.md),
which explicitly delegates the necessary boolean identity capability. Existing
[Q12](../docs/decisions/2026-09-02-interest-tag-event-category-contract.md) and
[19Oct single-create scope](../docs/decisions/2026-10-19-li-core-feature-delivery.md)
remain controlling. This supplements the existing creation contract; it does not
supersede its mutation authorization, names, IDs, uniqueness or errors.

`GET /v1/me/interest-tag-admin-capability` accepts no query or request body.
Bearer verification precedes validation. A successful response is exactly
`{"canCreateInterestTags": boolean}` with `Cache-Control: no-store` on every
outcome. No UID, claim collection, role list or account/profile content is exposed.

The current server-owned Firebase user must be enabled and have exactly boolean
`enmoriAdmin === true` for true. Ordinary users and users whose Admin claim has
been removed receive false. Each call rereads the existing InterestAdminAuthority;
the client must not retain this hint across an observed session replacement or
use it as mutation authority. Disabled/revoked identities fail through the existing
authentication boundary. Missing/invalid bearer ->401 AUTH_REQUIRED; disabled or
revoked bearer ->403 AUTH_FORBIDDEN; authority/dependency failure ->503
SERVICE_UNAVAILABLE; body/query ->400 REQUEST_INVALID. Existing safe error
envelopes apply. No capability read writes data or assigns/revokes a claim.

If an account is disabled between successful bearer verification and the fresh
authority read, that read returns false; a create attempt returns403. This safe
race does not promise the same HTTP outcome as disablement already observed by
the bearer verifier, and cannot grant a mutation.

The route is registered only alongside the existing explicit Admin-create
composition. `POST /v1/admin/interest-tags` independently verifies current Admin
authority on every attempt, regardless of a previous true read. Existing public
`GET /v1/interest-tags` remains the active catalogue read; no management-all read,
rename, delete, role management, bulk import or real-account grant is added.

Creation still accepts only `{displayName}`, returns201 `{interestTag:{interestTagId,
displayName,lifecycleState:"active",revision:1}}`, and preserves existing409
CATALOGUE_NAME_CONFLICT /422 CATALOGUE_INVALID semantics. Unknown creation results
require an independent catalogue read before further action; a locally similar
name is not proof that this request created that ID, and no automatic resend or
new idempotency mechanism is introduced.
