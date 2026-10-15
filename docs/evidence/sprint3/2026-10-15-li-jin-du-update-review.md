# LI independent JIN evidence review and DU reconciliation

15 October 2026 (SGT). JIN #105 exact **aab3bf23b8d9c76c6f830dfefa483d3f42bd2f01**, executable **f83005108517330370876c76ebee208051682570**, tree **e1eb09e1afe5a0cd1fc637a4268572fd61d3044a**. LI's shared candidate remains #111 exact **b53ad18c4ea05d1410760c1dfbd5779aa534a514**, tested executable3cc115a; no new product edit or APK rebuild. [Durable DU/PM disposition](../../decisions/2026-10-15-li-jin-du-update-disposition.md) · [sanitized source/result receipt](2026-10-15-li-jin-du-update-source.json).

## Independent JIN verification

LI used the clean existing review worktree at exactaab3bf23, archived old generated `backend/dist` outside Git and compiled current source. Existing Node24.19.0 / TypeScript7.0.2 / Admin14.3.0 / Firestore8.7.1 / CLI15.29.0 / cached Emulator1.22.0 were used unchanged. Local Java25.0.4.1 is explicitly LI's environment, not JIN's stated Java21 environment.

| Boundary | Actual LI result |
| --- | --- |
| Strict Backend compilation | Pass, exit0 |
| Full clean Backend | **882/882**, zero fail/cancel/skip/todo, exit0 |
| Actual guarded Auth/Firestore/Dart | **139/139**, zero fail/cancel/skip/todo, outerexit0 |
| Owned SDK/fixture teardown | Worker and outer private profiles removed; five required ports free |
| Host-tool boundary unit tests | **7/7**, fake HTTP/counters; separate from882 |
| Source identity | 18 accepted #108 blobs unchanged; changed manifest Git blobs match; product→head evidence-only |
| Protected inputs | Existing API, dependency manifests/locks and index declaration unchanged |
| Executable/API/test/tool whitespace | Pass; inherited documentation raw-log padding is not represented as all-file Pass |

Commands: locked Node runs `node_modules/typescript/bin/tsc --project backend/tsconfig.json`, `--test 'backend/dist/test/**/*.test.js'`, `tool/run_ai_store_emulators.mjs` with the existing verified cache and pinned Dart on PATH, and `--test tool/controlled_qwen_followup.test.mjs`. No install, model replacement, real Auth project, ordinary runtime or data/index deployment occurred.

The139-case actual suite includes expired and partial-deleting previous-target retirement, Bootstrap cleanup continuation, original full-precision expiry and corrupt/current-unsettled refusal, plus actual six-route Dart/Auth/store and Persona/candidate-policy cases. Model/token decisions in that suite remain explicit doubles. This independently exercises the submitted correction; SHI retains the separate formal new-JIN-code review. Old18/20 and22/25 owner attempts remain historical, not LI reproductions. LI did not reclassify the old R1 run as successful. JIN's546 Flutter/full analysis and494 working bindings remain owner-attributed; LI did not repeat them.

## Actual controlled host, same unchanged source

Used the existing verified private loopback9B binding, matching tokenizer0.23.3 and exact current helper/compiler/adapter/finite semantic policy. Private configuration was passed through stdin to the unchanged operator tool. No credential, endpoint/model identity/digest, prompt, reply or raw content is in the public receipt. No output repair, fake reply, policy relaxation or automatic retry was supplied. Auth, complete owned EMPTY Notes, memory store and complete-body sink in the semantic packet are **synthetic**.

1. **First readiness attempt failed.** A zero-content preload timed out; a shell sequencing mistake then allowed the semantic tool to run despite that readiness failure. Its preflight failed closed: `AI_UNAVAILABLE`, modelDispatches0, one synthetic U/zero A/body, no real product writes. The initial shell should have gated the dependent invocation; the second invocation explicitly exits on failed readiness. The0-dispatch result and server loading-cancel/timeout observations are retained. CPU/memory contention is not claimed as an established cause.
2. **After actual SDK shutdown**, the model was still unloaded. A separately recorded zero-content preload completed in**37426ms**, with no generated content. This is cold readiness evidence, not a new/relaxed Application45s budget. No server restart/reset or model change occurred.
3. **`semantic-once`: Pass**, one actual model dispatch, complete input**595 tokens**, observed model stopped, actual finite-policy Application success in**3184ms**. One synthetic U, one A and one accepted body; borrowed getters/original capability revoked, observable local content holders cleared, runtime queue/nonTerminal0 and no quarantine at that checkpoint. This is the first positive actual model+current semantic packet result; prior185-token rejection remains distinct. It proves one finite exact-attribution routine, not unrestricted chat, native-template equivalence or actual database persistence.
4. **`complete-inputs`: Pass**,24 actual matching-tokenizer measurements. An Application-valid1200-code-point input had exactly4096 complete framed tokens and was admitted by the compiler;1202 code points produced4097 and were rejected. Exact4097 adapter rejection preceded any generation POST; total generation POSTs0. This is a token-boundary result, not semantic acceptance of those strings.
5. **`cancel-once`: Pass for fail-closed behavior**, one actual HTTP invocation, local abandoned result in1731ms, abort forwarded, candidateChecks0, adapter `termination_unconfirmed`, runtime quarantined and next admission denied. Server receipt/start and remote stop remain **unproved**. No further generation was attempted after this observation. A private source-bound hold receipt records that actual remote settlement is required before another generation; do not restart/reset a host lease to bypass it. This does not establish confirmed remote cancellation or healthy current admission.

A subsequent process using a new local lease would not itself prove remote settlement. The tool’s passing cancellation status means the expected quarantine held, not that every cancellation/remote-stop obligation is complete. These results also do not join the actual model with the actual Firestore139-case journey. Nonempty operational Note authority, continuous90-day/+24h cleanup, actual model/Auth/store/device and native template rendering remain their own evidence boundaries.

## DU and Event status correction

DU's formal #111 APPROVE5526998896 binds the existing shared/native source. LI records post-peer bounded acceptance. DU also correctly identified the already-implemented minimal selected-date Footprint behavior in #94/#97. LI verified all four corresponding current paths unchanged from #94 and reran controller/shared-router suites **11/11 Pass**. They overlap the earlier595, and DU's independent local4 is not added. No duplicate page/route/API/code packet is required for that same minimum. A distinct Calendar surface, month markers and map/C5 behavior remain separately scoped, not accepted or cancelled.

During this run, ZHOU approved #109's contract but requested changes on #11082fbd0a for positive total + empty first-page array being accepted as empty success. SHI owns the focused consistency fix and ZHOU its re-review. The finding is in the upstream Backend adapter, absent from the seven Flutter blobs consumed by #111; actual provider/Backend enablement stays held. It does not require another unchanged LI APK build or reopen the selected direct-browser choice.

**Disposition:** receive JIN's independently verified new-source evidence, recognize the positive finite actual-host packet and precise token/quarantine results, and retain SHI's new-code review before acceptance of #105. Receive DU's #111 approval and retire the duplicate minimum-consumer ask. Keep APK hash/package and existing peer scopes. No merge, Issue closure, Project transition, provider/runtime promotion, overall percentage or whole42/38/Sprint/UAT/Release claim.
