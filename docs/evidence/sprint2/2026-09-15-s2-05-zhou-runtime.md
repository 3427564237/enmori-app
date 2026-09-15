# S2-05 bounded AI runtime owner evidence

- Assigned owner: ZHOU YAOYIN / `YaoyinZhou3922`
- Issue: [#31](https://github.com/3427564237/enmori-app/issues/31)
- Recorded: 2026-09-15; Windows x64; synthetic local automated execution
- Base: `31bdb78574ca04f50d42954816ad33d709f89ca4`
- Implementation/test commit: `0fe1249f83e9b8a005b93c9ba39dd17657eb1f5f`
- Branch: `codex/issue-31-ai-runtime`
- Required independent reviewer: JIN ZIHAN; **Pending**, not self-approved

## Authority and observed Sprint progress

The published [Sprint decision](https://github.com/3427564237/enmori-app/blob/3a110132b01f2dee3605351ce123aa90a3376ccb/docs/decisions/2026-09-13-sprint2-scope-capacity-contract.md)
and [execution plan](https://github.com/3427564237/enmori-app/blob/3a110132b01f2dee3605351ce123aa90a3376ccb/docs/planning/2026-09-13-sprint2-plan.md)
authorize S2-05's internal scheduling/parser component and ZHOU's S2-02 review.
They remain published PM authority at PR #25's immutable head; their existence
does not mean the planning PR is merged or its independent review passed.

Controlling local sources: [Q31](../../decisions/2026-09-02-qwen-runtime-failure-contract.md),
[Q14](../../decisions/2026-09-02-retention-logging-audit-policy.md),
[Backend architecture](../../decisions/2026-09-01-backend-architecture.md), its
[detailed design](../../superpowers/specs/2026-09-01-backend-architecture-design.md),
AGENTS.md and repository Skill routing. Existing pinned Backend facilities are
reused under the Sprint component scope; no toolchain decision is broadened.

At the read checkpoint, LI's #32 and DU's #34 had owner implementations and
remaining integrated Android Emulator/reviewer gates. SHI's #33 had progressed
from its first inner slice to a PM-confirmed persisted/API slice at
`aa376e2a7ad9eaf978a864bc8e8c8896689a8c6e`; the old first-slice description was
not treated as current implementation state. #31 was open with no implementation
comments. Issue/PR text and commits were inspected; no Project-board status
transition, Sprint acceptance or other owner's completion is inferred.

## Delivered component and AC traceability

Implementation: [component guide](../../../backend/src/ai-runtime/README.md).

| Issue #31 requirement | Implemented and executed evidence |
| --- | --- |
| One generation, two queued, one non-terminal request per user | Host instance with separate FIFO queue, generation reservation/quarantine and per-user ownership; overload rejected before acceptance; checkpoint retains user slot after generation lane release |
| Monotonic 60s overall / 5s queue / 45s generation | Injected elapsed clock; original deadline passed to preparation/checkpoint; generation receives the smaller sub-deadline; exact-boundary and delayed-timer checks; wall-clock jump case |
| Cancellation, expiry and late output cannot duplicate terminal results or leak slots | Abandoned/cancelled paths for preparation, queue, generation and checkpoint; original-handle isolation; shutdown discard; active slot quarantine until transport settlement; late resolve/reject and timer race permutations |
| Strict Q31 JSON output | Fatal raw UTF-8, one object, exact two string fields/version, decoded duplicate-key check, reject nested values before object materialization; no extraction, repair or coercion |
| Prohibited deterministic output | Empty/length/Unicode/control/bidi, markup/fence/object, URL/link and recognizable tool-call syntax fixtures; rejected result contains no original content |
| Deterministic fake evidence, no live-model prerequisite | Handwritten fake clock/transport and checkpoint, built-in node:test; no additional test framework, live model or model installation |

Parser success is explicitly an immutable **structural candidate**, not a
deliverable/accepted assistant message. `checkCandidate` is an injected pipeline
seam with a fake in owner tests; it does not implement semantic safety, source
authorization, persistence or Conversation lifecycle. Its propagated
`unsafe_output`/`stale_authority` cases prove failure containment only.

The real transport must settle only after confirmed underlying generation
termination. Aborting local I/O alone is insufficient. No concrete Ollama
transport is added or claimed. The module is not connected to public routes,
Bootstrap or storage. No output, prompt, identity or private data logging is
introduced. The parser's lexical checks/corpus are not universal semantic proof.

## Actual verification

Node.js **24.19.0**, pnpm **11.19.0**, TypeScript **7.0.2**. Existing lockfile
last changed at `d8ea465bdbb22c0bb69e10b4f7dba54f2c6761d0`, SHA-256:
`906AE91BD9C959BB5B83CE0420AAC8D56ABF9C8A65A7C231D8A0038056BD1783`.

Executed in `D:/3851-worktrees/issue-31-ai-runtime`:

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile --ignore-scripts --store-dir D:/3851/.pnpm-store --config.update-notifier=false
$env:pnpm_config_store_dir = 'D:/3851/.pnpm-store'
$env:pnpm_config_verify_deps_before_run = 'error'
pnpm backend:verify
git diff --cached --check
```

- Frozen installation: **Pass**; no dependency, manifest or lockfile change.
- Strict TypeScript compilation: **Pass**.
- Backend tests: **195/195 Pass**, zero failed/skipped/cancelled/todo.
- Of these, **85 new AI component cases** and **110 retained baseline cases**.
- Diff whitespace check: **Pass**.
- Import review: Application/Domain/Ports depend inward; Node monotonic timer
  adapter remains in Infrastructure. No vendor model/Firebase/Fastify import
  enters the new inner component.
- Original `D:/3851` checkout and its pre-existing untracked files are unchanged.

## Remaining independent gates

JIN's independent #31 review, normal merge and Issue/Project closure remain
pending. This record is owner implementation evidence only. It does not claim
full Q31-E, loaded-model token limits, semantic safety, authorization revalidation,
Conversation/Persona lifecycle, product AI acceptance or Release/Done.

Optional existing-host smoke: **Not Run**. No released-buffer instruction or
model installation was assumed; this is not a component acceptance dependency.
Android and Firebase Emulator are not required for S2-05. ZHOU's separate
S2-02 review and its real Emulator rerun are recorded in the
[review packet](2026-09-15-s2-02-zhou-review.md), not counted as AI test evidence.
