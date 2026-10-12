# ZHOU — isolated real-AI capability probes, Slice A

Date: 12 October 2026, SGT (UTC+08:00). Owner: ZHOU. Independent reviewer:
JIN; subsequent bounded evidence assessment: LI. This is a disposable test/tool
delivery, not a Conversation adapter or amended-rule implementation.

## Authority and exact source

[LI's capability-only release at `0f65bc84`](https://github.com/3427564237/enmori-app/blob/0f65bc84a883b7aa92648ed8f36565b71cb1c520/docs/decisions/2026-10-12-li-real-ai-capability-verification-only.md)
releases only row A and its four synthetic experiments from
[#90 `99583d6`](https://github.com/3427564237/enmori-app/pull/90).
[JIN's proposal approval](https://github.com/3427564237/enmori-app/pull/90#pullrequestreview-5491753860)
is document/technical review, not acceptance of this new tool. The user's
“按要求完成任务” authorizes completing that released task and its Draft handoff.

- Executed source: **`2a64f705a61505e34976f86fff41e74b2c65b843`**.
- Executed tree: **`f83b230bdfccad55e3ea678566118c94fb00b916`**.
- Base: **`99583d6bd601ba51c577d46901b3e07e389e6fd8`**, preserving the
  independently reviewed proposal. The new PR is stacked on #90 so its existing
  documents and accepted #88 client are outside this review delta.
- Five new `.mjs` tool files only at the executed source. Subsequent evidence
  changes do not change the executed tool or any product source.
- [Machine-readable commands, source hashes, sanitized reports and failures](2026-10-12-zhou-ai-capability-probes-results.json).
  Hashes cover exact Git blob bytes, avoiding Windows working-copy line-ending
  ambiguity. The final evidence head belongs in the PR, not a circular self SHA.

No Backend route, adapter, Application/Domain/Port, public contract, Flutter,
product collection/field, index, dependency/version or runtime configuration was
changed. Seven pre-existing untracked Persona records are excluded.

## Reproduction and environment

Run from the repository root with the existing installed, locked dependencies:

```powershell
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node backend/scripts/run-ai-capability-probes.mjs
```

The compiler builds the existing controlled-environment guard; the new `.mjs`
tools remain outside the product TypeScript and normal test globs. Five
`node --check` checks pass. Strict Backend build exits 0; it is not presented as
typechecking these JavaScript tools. Ambient pnpm was observed as 11.25.0;
it was not used. No install or version change was made.

The launcher verifies actual Node **24.19.0**, Firebase Tools **15.29.0**,
Firebase Admin **14.3.0**, Firestore SDK **8.7.1**, and the pre-existing
Firestore Emulator **1.22.0** JAR SHA-256 against the locked CLI's bundled
checksum. It requires the existing JAR and does not initiate a download.
Auth/Firestore use the existing `demo-enmori-rmvp01a-r10`, loopback configuration
in unchanged `firebase.json`. Ports 8080/9099/4400/4500 must be free before
launch; an occupied port fails preflight without stopping another process.

The existing `buildControlledEmulatorTestEnvironment` sanitizes both the CLI
and its worker. The worker repeats the established `run-emulator-tests.mjs`
pattern because Firebase CLI adds `FIREBASE_CONFIG` to its command child.
The SDK/probes receive a fresh isolated profile and the unchanged
`requireControlledEmulatorEnvironment` guard. A direct invocation without that
environment fails at guard, exit 1 as expected, before any Emulator reads/writes.

Only the launcher command above is the supported execution entry. It owns a
fresh Emulator invocation; initial Firestore collections and Auth users must
both be zero. There is no Auth user/token creation or model invocation. The
240-second child-tool watchdog is an experimental execution bound, not a
change to any Q31/product deadline. Timeout reports cleanup unconfirmed rather
than claiming no effect. CLI/vendor output is not published: only explicit
non-content report JSON is forwarded. CLI logs are created inside its temporary
profile, and both profiles are removed after execution.

## Actual results

Final run **23:18:21.094–23:18:33.430 SGT**, command exit **0**. This is one
successful invocation of the four experiments, not a general production
guarantee. `suite: pass` means the experiments and observed cleanup completed;
each capability and remaining limitation is assessed separately.

| Released experiment | Actual observation | Classification and limit |
| --- | --- | --- |
| Fixed readTime across documents/query | Both server-readTime and Backend-UTC anchors read two original documents, a query and a repeated document at one matching readTime despite an acknowledged mutation/update/insertion between reads. Latest controls see all three changed documents. One callback each; no latest fallback. | Supported in these two Emulator fixtures. Does not certify Cloud support, trusted production UTC, producer authority or F03. |
| Immutable createTime and metadata precision | Updating and rereading the same document preserves createTime and identity; updateTime advances and subsequent reads do not change it. Sample create/update metadata have sub-millisecond remainders 188000/839000 ns, and sampled create/update/read sub-microsecond remainders are 0. | Metadata behavior observed, with microsecond granularity in these samples. No controllable 1ns server commit or physical commit instant is proved. |
| Real commit/ACK, local marker and separate durable barrier | A marker before a deliberately unguarded SDK call does not stop the call. A marker after the SDK returns its Promise precedes observed ACK and a persisted fixture. A held transaction callback also resumes/commits after a marker. Writer-before-barrier leaves one effect; barrier-before-writer leaves none. | Local marker alone is insufficient to cancel SDK writes. Held callback is before commit RPC; Promise return is not observed wire dispatch. Only two serial barrier orders were tested. Arbitrary concurrent ordering, strict local-time zero late effect and F01 closure remain unproved. |
| Locked transaction retry options and real conflict | Two transactions acquire different first documents and then request each other's document. `maxAttempts=1`: callbacks `[1,1]`, one durable commit, one actual ABORTED code 10, final counters `[1,1]`. `maxAttempts=3`: callbacks `[2,1]`, two durable commits, one retry callback, counters `[2,2]`. | Real conflict and retry observed, with no fabricated vendor failure. Callback count differs from committed-effect count. No ACK loss was injected; exception/absence/maxAttempts=1 cannot prove no outstanding write. |

Probe 3 deliberately omits an Application admission check to test the SDK's
relationship to a local marker. It is not an implementation of Cancel or an
instruction to dispatch after cancellation in product code. Metadata ordering
is not compared with a local wall clock to infer an unobserved physical commit.
These limitations are also explicit in each tool's reports.

The locked SDK behavior is the measured evidence. Official
[readTime constraints](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/TransactionOptions)
and [transaction ordering/locking](https://firebase.google.com/docs/firestore/transaction-data-contention)
provide context; they do not replace these results or prove a stronger cancel
guarantee. The fixture tool implements no pending-operation/canonical-assistant
model and does not rerun or reopen the accepted #88 client.

## Failures and cleanup

The results JSON retains these checkpoints separately from the final run:

1. An uncommitted preparation invocation failed with `ERR_MODULE_NOT_FOUND`
   while a parallel probe module was still absent. No Emulator execution.
   Probe modules now load after the guard, inside its stable failure boundary.
2. Run 01, source `928937ff322e8a29f8e66b07fe03a61dc601ec63`,
   **23:16:32.807–23:16:32.873**, exit 1: preflight SDK version lookup used
   a pnpm symlink path and could not find the transitive module. A minimal
   reproduction returned `MODULE_NOT_FOUND`; resolving the actual SDK entry
   returned 8.7.1. No Emulator started.
3. Run 02, source `d598cc498daf8525a8eae55975b16f72b41c3d44`,
   **23:17:16.152–23:17:23.344**, exit 1: CLI preflight passed but its
   injected configuration was rejected by the unchanged credential guard.
   No four-probe execution. CLI exited, ports were free and profile removed.
   The existing allowlist worker pattern resolved that boundary; the guard was
   not relaxed.
4. Run 03 is the final execution on `2a64f705…`, exit 0; it does not erase
   those prior failures. The final-source direct negative guard check still
   exits 1 with `controlled_environment_rejected`, as expected.

Every probe deletes only its own randomly named synthetic fixture collection
and documents. There is no full-database reset/delete and no product-path
access. Tracked local write Promises settle before cleanup. **17 created fixture
documents were observed removed**; final Firestore top-level collections **0**,
Auth users **0**, with no further Auth page. SDK shutdown, worker profile
removal, CLI exit 0, four required ports free and CLI profile removal all pass.
These are observed fixture cleanup results, not a general recovery/cleanup SLA
or proof that an ambiguous write can never commit later.

## Handoff and retained gates

Submit one focused Draft code/evidence PR and link it in the existing #81/#83
threads. JIN independently reviews this exact new source and evidence; LI then
assesses only the released verification result. Local collaborator inspection
does not substitute for either gate. No LI shared product code changed, so no
new DU shared-code review is implied by this tool.

**F01-A's strict existing rule remains controlling.** This delivery selects no
F01-B/C/D amendment, N02 inventory/control-retention/schema/index choice, F03
producer purpose/generation, R-A recovery or C-A cleanup/runtime responsibility.
Slices B/C/D/E stay held on their missing decisions. Cloud, ACK-loss recovery,
Android/device, live Qwen, actual product persistence/reader/route/lifecycle and
full M26/Sprint/UAT/Release verification are **Not Run or unproved here**.

The existing **23:59 SGT** delivery target remains. Owner execution finished at
23:18:33; publication/review/assessment times must use their own actual records.
No 22:00 reviewed-contribution claim, merge, Issue closure, manual Project
transition, ordinary/provider enablement or whole-feature completion is made.
