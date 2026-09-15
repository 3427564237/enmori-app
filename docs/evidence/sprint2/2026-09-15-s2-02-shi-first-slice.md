# S2-02 SHI first-slice owner evidence

- Executed: 2026-09-15; recorded at 14:58 SGT (06:58 UTC)
- Owner: SHI ZHENGQI / `GGGGHOST-CN`
- Issue: [#28](https://github.com/3427564237/enmori-app/issues/28)
- Branch: `codex/issue-28-s2-event-recommendations`
- Base: `31bdb78574ca04f50d42954816ad33d709f89ca4`
- Scope: Domain ranking, Application orchestration, inner read Port and owner tests only
- Independent reviewer path: ZHOU YAOYIN; no independent approval claimed
- Mapping gate: [bounded proposal](../../planning/2026-09-15-s2-event-data-mapping-proposal.md), pending LI confirmation

## Runtime and dependency reproduction

Commands were executed in a dedicated project-local checkout. The original
`E:\COMP3851B` checkout and its user-owned untracked files were not changed.
No personal skill, global configuration, global install or dependency upgrade
was used.

```powershell
node --version
# v24.19.0
pnpm --version
# 11.19.0
pnpm install --frozen-lockfile --ignore-scripts --store-dir '<project-root>/.pnpm-store' --config.update-notifier=false
# Success: 690 locked packages; no lockfile resolution/change
pnpm backend:verify
# Strict TypeScript compilation: Pass
# Backend tests: 133/133 Pass; 0 failed/skipped/cancelled/todo
node --test 'backend/dist/test/event-recommendations/*.test.js'
# Event owner tests: 23/23 Pass
```

The initial sandboxed dependency download failed with network `EACCES` and was
stopped. The identical frozen dependency installation then succeeded with a
scoped network approval. No package-update suggestion was acted on.

Unchanged `pnpm-lock.yaml` last-changing commit:
`d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`.
Lockfile SHA-256:
`906AE91BD9C959BB5B83CE0420AAC8D56ABF9C8A65A7C231D8A0038056BD1783`.
`package.json`, lockfile, static schemas and existing OpenAPI are unchanged.

## What the executed tests prove

Twelve pure Domain cases verify the fixed Q03 match-count formula/breakdown,
score/start/identity full ordering, exact upcoming boundary, precision-preserving
inner instants, inactive/unpublished/zero-match exclusion, identity deduplication,
conflicting duplicate exclusion, input permutation reproducibility and no input
mutation. End time, title, labels, Category and other factors do not score.

Eleven Application cases verify one captured server instant and verified UID
read boundary, full-order-before-Top-2, zero/one/two handling, current active
catalogue matching, restore semantics, successful empty selection, safe account/
dependency failures, Clock failure, independently recomputed Home/All, and
explicit safe presentation field mapping without undeclared private content.

The repository is handwritten fake-backed in these tests. Its contract requires
valid completed-account authorization before constructing source projections,
current source validation, safe vendor failure normalization and no writes.
These tests **do not prove a Firebase adapter enforces that contract**.

The full 133-test run retains the existing 110 main-branch tests, including
R4 Transport/OpenAPI and R9/R10 fake-gateway/configuration tests. Those existing
passes do not establish the new recommendation endpoint or real Emulator
execution. Import inspection confirms that new inner layers import only inner
feature/shared contracts; no Fastify, Firebase, Infrastructure or Ollama imports.

## Explicit unfinished and Not Run boundaries

| Boundary | Status |
| --- | --- |
| Inner first-slice compile and owner tests | Pass as above |
| Event Transport/static JSON Schema/OpenAPI | Not Run; not implemented, mapping confirmation pending |
| Event Firestore adapter and persisted-input contract suite | Not Run; not implemented |
| Actual Auth + Firestore Emulator execution for S2-02 | Not Run |
| Synthetic initialization and overwrite/race tests | Not Run; mapping/manifest pending |
| Isolated demonstration initialization | Not Run; target project/manifest confirmation pending |
| ZHOU independent current-head review | Not Run |
| JIN S2-04/S2-06 review | Not Run; no review performed in this slice |
| Android, Q04, Accessibility, UAT, Release acceptance | Not Run / not inferred; no SHI physical-device assignment |
| Issue/Project completion, merge, Done | Not performed or inferred |

LI's Interest PR #32 is Draft/unmerged and Sprint 2 planning PR #25 is unmerged
at this check. Their published authority/mapping references are recorded in the
proposal; no LI implementation changes were copied into SHI's branch. This
slice does not wait for LI's UI and does not widen SHI's assigned work package.
