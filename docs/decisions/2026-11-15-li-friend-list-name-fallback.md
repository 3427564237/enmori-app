# LI: show accepted friends without a display name

Date: 15 November 2026 (Asia/Singapore). Authority: LI HOURUI, PM.

LI reported that accepting a request left the sender absent from the recipient's friend list, even after refreshing and restarting. Read-only inspection of the reported pair established an accepted friendship, both valid owner-list pointers, eligible accounts, no block and a non-private sender with no DisplayName. The request presentation permits its existing discovery-authorized Username fallback; the list excluded the same account for its missing optional name. Isolated tests reproduced this asymmetry.

LI approved the concrete correction: “可以，就按这个方案修复并更新后端，保留现有隐私限制。” The approved proposal was to show Username when DisplayName is absent and make that displayed value searchable in My Friends, preserving current privacy restrictions.

## Bounded amendment

- For an otherwise authorized accepted friend with a public or friends-only Profile, an unset DisplayName no longer suppresses the row. The existing string `displayName` response field carries the actual DisplayName when present, otherwise the canonical Username. This is a response projection; it never fills or changes the stored optional field.
- My Friends search applies its existing normalization and matching to that displayed label. Accounts with an actual DisplayName retain name-only matching; this does not introduce general Username search over named accounts or non-friends.
- Retain current requester/target eligibility, accepted relationship, either-direction blocking, Profile visibility, pointer/reservation validation, pagination/read budgets, revision checks and failure semantics. Private Profiles remain excluded, including those without a name or with discovery enabled. Discovery opt-in is neither required for an accepted friend's fallback nor a grant to bypass Profile privacy.
- No new endpoint, DTO field, collection, index, migration, dependency, account write, notification or model call is authorized by this correction. Existing profile and field-privacy rules remain unchanged.
- Implement, test and deploy this bounded correction to the existing single backend service, preserving its settings, accounts, data and runtime safeguards. No Android rebuild or infrastructure change is required by the compatible response projection.

## Supersession trail

This explicitly supersedes only the unset-name exclusion and no-fallback clause in F03 of [7 October's approved My Friends candidate](2026-10-07-li-next-read-option-a.md), and the corresponding name-only projection semantics carried into [12 October's friend-search approval](2026-10-12-li-friend-search-and-internal-ai-approval.md), for the missing-name case above. The [original F03 proposal](../planning/2026-10-07-jin-friend-next-contract-delta.md) and previous decisions are retained. Private-profile exclusion and every other protection remain controlling. This is a PM amendment, not an attributed Sponsor decision or a readiness/acceptance claim.

Verification must separately record isolated regression results, actual deployment identity, account/data preservation and fresh live reads. Product tests use synthetic accounts; the reported live pair is read only.
