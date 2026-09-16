# Sprint 2 isolated Demo target confirmation

- Source ID: S-PM-0916-S2DEMO-TARGET
- Status: Confirmed by LI HOURUI; target decision only, initialization Not Run
- Decision owner: LI HOURUI, ENMORI PM
- Scope: Issue #28 / S2-02 fixed synthetic Demo initialization

## Authority and verification

LI confirmed that the single project visible through the authenticated local
Firebase CLI is the existing isolated, non-production ENMORI Demo environment,
and authorized only the six records in the already approved manifest. LI then
instructed execution of the remaining LI/PM work.

A fresh read-only `firebase projects:list --json` succeeded and returned exactly
one project, `enmori-rmvp-controlled`, in `ACTIVE` state. This establishes project
existence and current inventory visibility. Isolation and non-production purpose
are LI's explicit owner attestation, not conclusions inferred from its name or
from CLI access. No cloud records, IAM policy or deployment were changed by this
verification. Account identities, endpoints and authentication material are not
included in this record.

## Exact target and unchanged manifest

The single approved Firebase project ID is `enmori-rmvp-controlled`. No alias,
wildcard, second project or inferred substitute is approved. The previously
proposed configuration example `enmori-controlled-01` is not the target. The
Emulator-only project `demo-enmori-rmvp01a-r10` remains a separate test environment.

Use only `backend/fixtures/s2-event-demo-manifest.v1.json` from PR #33 head
`db40a4d234b0a9ce715467fb394bd4d6a1dc8476`, version `s2-event-demo-v1`, canonical
SHA-256 `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`.

The only writable paths are:

- `interest_tags/interest_community`
- `interest_tags/interest_music`
- `events/s2_demo_community_early`
- `events/s2_demo_music_early`
- `events/s2_demo_community_music`
- `events/s2_demo_community_late`

## Execution handoff

SHI remains the assigned initializer implementer and executor. SHI may now
implement and verify the approved fixed-manifest initializer, update the proposal
to cite this target decision, obtain the assigned independent review for the new
code, and execute within the existing controlled environment and authority.
Unavailable access must be reported for owner authentication/authorization; this
decision neither supplies credentials nor authorizes IAM or deployment changes.

Preserve the existing proposal's exact project check, controlled Demo mode and
absence of Auth/Firestore Emulator variables before Firebase initialization.
Read all six targets before any write in one transaction. Create only absent
named records; identical existing records remain unchanged; any differing record
aborts with no writes. No overwrite, reset, delete, account/Auth Binding,
own-selection, Check-in or arbitrary import is authorized.

Report the implementation head, manifest digest, environment class and bounded
created/unchanged/conflict outcome. Hand DU the existing runtime prerequisites
through the approved private configuration path; do not publish private endpoints
or credentials. Actual initialization, Android integration and final smoke remain
Not Run until executed and evidenced.

## Supersession trail

- [S-PM-0913-SPRINT2](https://github.com/3427564237/enmori-app/blob/3a110132b01f2dee3605351ce123aa90a3376ccb/docs/decisions/2026-09-13-sprint2-scope-capacity-contract.md): scope, owners and completion boundaries remain unchanged.
- [S-PM-0915-S2EVENT-MAPPING](https://github.com/3427564237/enmori-app/blob/db40a4d234b0a9ce715467fb394bd4d6a1dc8476/docs/decisions/2026-09-15-sprint2-event-contract-mapping.md): Event/API/storage mapping remains unchanged.
- [S-PM-0916-S2DEMO-MANIFEST](https://github.com/3427564237/enmori-app/blob/db40a4d234b0a9ce715467fb394bd4d6a1dc8476/docs/decisions/2026-09-16-s2-demo-manifest-confirmation.md): manifest approval remains unchanged; only its deferred target gate is resolved by this decision.
- [SHI proposal](https://github.com/3427564237/enmori-app/blob/db40a4d234b0a9ce715467fb394bd4d6a1dc8476/docs/planning/2026-09-16-s2-event-demo-initialization-proposal.md): execution safeguards remain unchanged; its example target is replaced only as specified above.

Retain all earlier records. This decision does not approve production access,
new infrastructure, dependencies, product scope, client-rules acceptance, UAT,
Release, Issue closure or Sprint completion.
