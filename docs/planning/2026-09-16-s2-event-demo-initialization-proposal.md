# S2-02 isolated Demo initialization proposal

- Owner: SHI ZHENGQI (`GGGGHOST-CN`)
- Scope: Issue #28 / Draft PR #33
- Status: **Target and manifest confirmed; initializer implementation in progress; actual Demo initialization is Not Run**
- Controlling decisions: S-PM-0913-SPRINT2, S-PM-0915-S2EVENT-MAPPING,
  S-PM-0916-S2DEMO-MANIFEST and S-PM-0916-S2DEMO-TARGET

## Confirmed target allowlist

LI confirmed the allowlist contains exactly one Firebase project ID in
S-PM-0916-S2DEMO-TARGET at commit `a0727d2502d8e669feafb17ba57050906a4439c8`:

```text
enmori-rmvp-controlled
```

No alias, wildcard, second project, endpoint or credential is allowed. LI's
target decision records owner-side existence and explicitly attests that this
is the isolated non-production Demo project. The superseded example
`enmori-controlled-01` is not an approved target.
The Emulator-only `demo-enmori-rmvp01a-r10` is explicitly outside this allowlist.

The later initializer must fail before Firebase initialization unless the
runtime project ID exactly equals the LI-confirmed allowlist entry, controlled
Demo mode is selected, and Auth/Firestore Emulator variables are absent. It
must not accept a project override from the manifest or command line.

## Exact named manifest

The proposed fixture is the repository artifact
`backend/fixtures/s2-event-demo-manifest.v1.json`.

- Manifest version: `s2-event-demo-v1`
- Canonical JSON SHA-256: `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`
- Named paths, and only these paths:
  - `interest_tags/interest_community`
  - `interest_tags/interest_music`
  - `events/s2_demo_community_early`
  - `events/s2_demo_music_early`
  - `events/s2_demo_community_music`
  - `events/s2_demo_community_late`

The two Interest identities match the fixed LI/SHI mapping. The four Events
are synthetic, active, published and future for Sprint 2 integration. Selecting
both tags yields a score-two Event followed by the earlier score-one Events;
Home can therefore prove Top 2 while See All proves the complete deterministic
order. An empty own selection remains the approved successful empty case.

The manifest contains no account, Auth Binding, own-selection, Check-in,
Category, credential, endpoint, project ID, arbitrary source path or mutation
instruction. The static owner test validates every named record through the
approved Interest/Event parsers and pins the path list and canonical digest.

## Confirmed execution boundary

The initializer is a fixed code path for this manifest and the confirmed
single-project allowlist. After independent review, it will read all six named
targets in one Firestore transaction before writing:

1. If every target is absent, create all six records.
2. If every existing target exactly equals the approved record and the rest are
   absent, create only the absent records.
3. If any existing target differs, abort the transaction with no writes.
4. If all six exactly match, report unchanged without writes.

It will use only transaction `create` for absent named paths. There is no
`set`, `update`, delete, reset, collection traversal, arbitrary import, account
write, credential handling or deployment behavior. Any race or dependency
failure must fail closed without a partial initialization claim.

## Remaining execution gate

LI has confirmed both the target and fixed manifest. The new initializer code
must pass owner tests and isolated Emulator tests, then receive ZHOU's assigned
independent current-head review before SHI executes it against the confirmed
Demo target. Until that review and execution occur, actual Demo initialization
remains **Not Run**. Production/client-rules acceptance, Android integration,
UAT, Release and Done remain **Not Run** and are not implied by this proposal.
