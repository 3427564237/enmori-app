# S2-02 fixed Demo initializer owner verification

- Owner: SHI ZHENGQI / `GGGGHOST-CN`; Issue [#28](https://github.com/3427564237/enmori-app/issues/28)
- Branch / PR: `codex/issue-28-s2-event-recommendations` / [Draft #33](https://github.com/3427564237/enmori-app/pull/33)
- Implementation commit: `5a4c300768098268c8bbd340af60bd3c9439a3f2`
- Recorded: 2026-09-16 18:58 SGT / 10:58 UTC
- Independent reviewer: ZHOU YAOYIN / `YaoyinZhou3922`; current-head review **Not Run**
- Actual controlled Demo initialization: **Not Run**

## Confirmed authority and fixed input

LI's S-PM-0916-S2DEMO-TARGET decision at
`a0727d2502d8e669feafb17ba57050906a4439c8` confirms the sole target as
`enmori-rmvp-controlled`, attests that it is the isolated non-production Demo,
and assigns SHI the initializer implementation and execution. The fixed input
remains the approved `backend/fixtures/s2-event-demo-manifest.v1.json` from PR
#33:

- manifest version: `s2-event-demo-v1`;
- canonical JSON SHA-256:
  `d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b`;
- document count: six fixed Interest/Event paths.

The command has no project or manifest arguments. Before Firebase Admin is
initialized, it requires `ENMORI_ENVIRONMENT=controlled-demo`, requires the
exact approved project ID, rejects Auth/Firestore Emulator variables, rejects
`FIREBASE_CONFIG`, validates any ambient Google project identifier against the
same exact target, and reloads and validates the fixed manifest version,
inventory, record contracts and digest.

## Create-only behavior

One Firestore transaction reads all six targets before any write. Identical
existing records remain unchanged, absent records use transaction `create`, and
any differing record returns `conflict` without creating otherwise absent
records. There is no `set`, `update`, delete, reset, traversal, account/Auth
Binding, own-selection, Check-in, arbitrary path/import, IAM or deployment
behavior. Operator output is limited to the bounded result, approved project,
environment class, manifest metadata, document count and UTC start/end; failure
output does not print vendor errors, credentials or record content.

## Exact executed commands and results

Runtime: Node.js **24.19.0**, pnpm **11.19.0**. No dependency or lockfile change.

```powershell
pnpm backend:verify
# Strict TypeScript compile Pass; Backend 162/162 Pass

pnpm backend:verify:emulator
# Isolated Auth + Firestore Emulator 22/22 Pass; CLI exit 0
# Includes fixed initializer create, concurrent retry/unchanged, conflict/no-write
# and preservation of unrelated records. Emulators shut down normally.

git diff --check
# Pass
```

The first sandboxed Emulator launch could not read the user's Firebase CLI
configstore and exited before starting an Emulator or test. The same approved
command was then run with the required local execution access and passed. Both
successful verification paths use the synthetic
`demo-enmori-rmvp01a-r10` project and loopback Emulators only; neither contacted
nor wrote the approved controlled Demo.

## Remaining ordered gates

1. Publish this increment and obtain ZHOU's independent review of the exact PR
   #33 head.
2. Only after that approval, execute the fixed command in the existing approved
   controlled environment and record exact UTC start/end and
   `created`/`unchanged`/`conflict` result.
3. Provide DU the non-sensitive result and use the approved private channel for
   existing endpoint/client configuration. Do not publish credentials, tokens,
   accounts, Firebase UIDs, endpoint secrets or device serials.

Until step 2 succeeds, Demo initialization, DU's full S2-03 integration,
Android final smoke, Q04, accessibility, UAT, Release and Done remain **Not
Run**. PR #33 stays Draft and Issue #28 stays open.
