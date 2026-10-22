# LI team integration checkpoint — 22 October 2026

Candidate product/test commit: `9b9c4e9a58a009b7c0ed411732bae5650927e681`; base `986d4f895252f266c1f6bf785b7f0c24ee03643e` (v20 integration evidence). Existing checkout was clean; used author-attributed `cherry-pick -x`, not a main merge or PR merge command.

| Source reviewed | Integrated commits / status |
| --- | --- |
| DU #172 `a435a50` | `7690789`: validated Persona expression capture; LI source review complete |
| ZHOU #171 `2252a44` (product `4fcd09f`) | `6ae0526`, `1c689e5`: Admin capability, create/readback and Profile/ordinary-interest wiring; LI function review complete, JIN permission approval retained |
| SHI #170 `ba53347` | `e8eb9ea`, `5f17c4a`, `1791844`, `fde8e83`: observed source window and awaited-source-loss repair; ZHOU new-head re-review requested, pending |
| JIN #173 `6050aa6` (product `bbf3ce3`) | `c5c865c`, `46a8007`, `84df258`: cross-page revocation and canonical activity ID consumption; DU independent review requested, pending |

Only conflict: both source-window and canonical-ID supplements appended to `api/friend-activity-display-contract.md`; retained both scopes. Admin transport additions and JIN delete eligibility auto-merged and were inspected. No dependencies/signing/runtime config changed. v20 Home/History/record/Event-card visual layout, AI client and Home weather code are unchanged; JIN's necessary content invalidation/map-attribution hooks are retained.

Checks on combined tree: Node24.19.0 strict compile, Flutter3.47.2 analyze clean; Backend five affected files **37/37**, Flutter four affected files **24/24**, zero failures. Added one positive actual-Fastify path using SHI's later-page controlled source and JIN's canonical-ID schema; title/ID/actual timestamp survive, while three source-loss races still503 and genuine revocation omission remains covered. Tests use in-memory/fake boundaries, no provider/account writes. Source receipt/logs are in ignored `build/team-integration-oct22/`; TypeScript output is isolated there, not live `backend/dist`. Existing author full-suite/Emulator results are reused only for unchanged boundaries, not relabelled new integrated runs.

ZHOU reminder: https://github.com/3427564237/enmori-app/pull/170#issuecomment-6338424296
DU reminder: https://github.com/3427564237/enmori-app/pull/173#issuecomment-6338424913

No new confirmed integration blocker in this scope. Independent #170/#173 reviews remain pending at checkpoint; source integration is not final acceptance. Existing public service stayed active without restart, claims or catalogue changes; installed/distributed v20 is unchanged. No new APK, real Admin, two-account/device, actual provider/model or OSM traffic acceptance performed. Real Admin grant/intended new catalogue item require owner authorization before execution. Keep main unchanged and integration PR Draft.
