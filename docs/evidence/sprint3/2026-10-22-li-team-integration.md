# LI team integration checkpoint — 22 October 2026

Candidate product/test commit: `9b9c4e9a58a009b7c0ed411732bae5650927e681`; base `986d4f895252f266c1f6bf785b7f0c24ee03643e` (v20 integration evidence). Existing checkout was clean; used author-attributed `cherry-pick -x`, not a main merge or PR merge command.

| Source reviewed | Integrated commits / status |
| --- | --- |
| DU #172 `a435a50` | `7690789`: validated Persona expression capture; LI source review complete |
| ZHOU #171 `2252a44` (product `4fcd09f`) | `6ae0526`, `1c689e5`: Admin capability, create/readback and Profile/ordinary-interest wiring; LI function review complete, JIN permission approval retained |
| SHI #170 `ba53347` | `e8eb9ea`, `5f17c4a`, `1791844`, `fde8e83`: observed source window and awaited-source-loss repair; DU exact-head repair approval received; ZHOU original finding disposition pending |
| JIN #173 `6050aa6` (product `bbf3ce3`) | `c5c865c`, `46a8007`, `84df258`: cross-page revocation and canonical activity ID consumption; DU exact-head independent review APPROVED |

Only conflict: both source-window and canonical-ID supplements appended to `api/friend-activity-display-contract.md`; retained both scopes. Admin transport additions and JIN delete eligibility auto-merged and were inspected. No dependencies/signing/runtime config changed. v20 Home/History/record/Event-card visual layout, AI client and Home weather code are unchanged; JIN's necessary content invalidation/map-attribution hooks are retained.

Checks on combined tree: Node24.19.0 strict compile, Flutter3.47.2 analyze clean; Backend five affected files **37/37**, Flutter four affected files **24/24**, zero failures. Added one positive actual-Fastify path using SHI's later-page controlled source and JIN's canonical-ID schema; title/ID/actual timestamp survive, while three source-loss races still503 and genuine revocation omission remains covered. Tests use in-memory/fake boundaries, no provider/account writes. Source receipt/logs are in ignored `build/team-integration-oct22/`; TypeScript output is isolated there, not live `backend/dist`. Existing author full-suite/Emulator results are reused only for unchanged boundaries, not relabelled new integrated runs.

ZHOU reminder: https://github.com/3427564237/enmori-app/pull/170#issuecomment-6338424296
DU reminder: https://github.com/3427564237/enmori-app/pull/173#issuecomment-6338424913

No new confirmed integration blocker in this scope. At the initial checkpoint #170/#173 independent reviews were pending; the update below records subsequent approvals. Source integration is not final acceptance. Existing public service stayed active without restart, claims or catalogue changes; installed/distributed v20 is unchanged. No new APK, real Admin, two-account/device, actual provider/model or OSM traffic acceptance performed. Real Admin grant/intended new catalogue item require owner authorization before execution. Keep main unchanged and integration PR Draft.

## DU review receipt — 22 October, 19:24 SGT

- [#173 DU APPROVED](https://github.com/3427564237/enmori-app/pull/173#pullrequestreview-5613395493), exact `6050aa68887f5c7794b65d8f178d49f009892546`: independent strict compile, canonical HTTP6/6, isolated two-identity SDK6/6 (38 owned documents/2 Auth users cleaned), Flutter24 checks and analyze clean. These are DU's source-bound results, not additional LI or integrated-tree execution counts.
- [#170 DU APPROVED](https://github.com/3427564237/enmori-app/pull/170#pullrequestreview-5613394327), exact `ba533475ead63e0e7a3e5f39c1ad12df4c5a8fc2`: independent strict compile and affected36/36, including the three awaited-source-loss HTTP races and genuine removal controls. ZHOU's original older-head REQUEST_CHANGES still exists; its new-head disposition is not inferred from DU's approval.
- Both exact product versions already exist in the tested candidate above. No repeated cherry-pick, tests, build, live-service restart or device operation for this receipt. #173 independent-review gate is complete; #170 now has independent repair approval, with original-reviewer closure outstanding. Real-account/device acceptance remains separate. No main merge.
