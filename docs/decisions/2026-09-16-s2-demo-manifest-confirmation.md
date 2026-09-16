# Sprint 2 Event Demo manifest confirmation boundary

- **Source ID:** S-PM-0916-S2DEMO-MANIFEST
- **Status:** Manifest confirmed; isolated Demo project allowlist deferred
- **Decision owner:** LI HOURUI, ENMORI PM
- **Scope:** Issue #28 / S2-02 only; synthetic Event catalogue preparation for a later controlled integration run
- **Earlier sources retained:** S-PM-0913-SPRINT2 and S-PM-0915-S2EVENT-MAPPING
- **Reviewed proposal:** `docs/planning/2026-09-16-s2-event-demo-initialization-proposal.md` and `backend/fixtures/s2-event-demo-manifest.v1.json` at PR #33 head `1f1835b96acdfbbf8de2967b431f779a98705a13`

## Confirmed manifest

LI confirms the bounded synthetic manifest `s2-event-demo-v1` only. Its canonical JSON SHA-256 is `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`; the exact named paths are:

- `interest_tags/interest_community`
- `interest_tags/interest_music`
- `events/s2_demo_community_early`
- `events/s2_demo_music_early`
- `events/s2_demo_community_music`
- `events/s2_demo_community_late`

The reviewed artifact is acceptable because it contains no account, Auth Binding, own-selection, Check-in, credential, endpoint, project override, arbitrary import, reset or delete instruction. It remains constrained by the approved active/published/future Event and Interest matching rules. The manifest confirmation does not approve a new Event API, data model, dependency, deployment, production access, client-rules acceptance, Android integration, UAT, Release or Done.

## Deferred target allowlist and execution

LI does **not** confirm the proposed project ID `enmori-controlled-01` at this time. The available evidence verifies neither that the ID resolves to an existing project nor that it is the approved isolated non-production Demo environment. It must not be substituted for the Emulator-only project, inferred from a configuration example, or replaced by an alias/wildcard.

Before LI can issue the separate target confirmation, SHI must provide a non-sensitive, project-owner-verifiable record that identifies one exact existing isolated non-production Demo project and confirms it is distinct from the Emulator and production environments. The record must not contain credentials, endpoints, tokens, user data or other sensitive configuration. If a different project is proposed, SHI must update the proposal and resubmit it for LI confirmation.

Until that second decision is recorded, actual Demo access and initialization remain **Not Run**. SHI may not add or run an initializer. Any later approved initializer must preserve the proposal's fixed-manifest, transactionally create-only/no-overwrite, fail-closed boundary. SHI remains the executor and must report the exact implementation head, target class, manifest digest, create/unchanged/conflict outcome and remaining evidence boundaries after a valid run.

This record is a PM coordination decision, not implementation evidence, independent review, merge authorization, Issue closure or Project completion.
