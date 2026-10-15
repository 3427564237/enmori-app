# JIN: R1 restart correction, accepted semantic join and controlled-host handoff

Recorded 15 October 2026, SGT. Owner implementation/evidence only; SHI reviews the new JIN correction/composition, LI reviews evidence and bounded acceptance.

## Exact source and authority

Product source **`f83005108517330370876c76ebee208051682570`**, tree **`e1eb09e1afe5a0cd1fc637a4268572fd61d3044a`**. Publication above this source adds only this evidence record and its manifest. Prior submitted #105 source remains `71dfa60266bebd5f38dfef97d020214e5e5b7703`.

- [SHI R1 Changes Requested 5521128730](https://github.com/3427564237/enmori-app/pull/105#pullrequestreview-5521128730) controls this correction. Earlier SHI approval of `f887524` remains historical and does not approve this source.
- [LI #108 APPROVE5521308725](https://github.com/3427564237/enmori-app/pull/108#pullrequestreview-5521308725) binds `c1060448e53034a297c9f5da536c991ca900505a`. Its finite `bounded_routine_summary_v1` policy, 34-case corpus, portable packet, actual SDK cases and network Persona harness enter unchanged as 18 exact accepted path/blob copies. A local two-parent trial `d169f10703d92c54b90b838216f8413191213365` was not pushed: making #108 an ancestor of its #105 base could auto-close that stacked Draft. Publication instead has parent `4ac29ad` and the identical complete tree tested locally as `c7065899d496d0e932a53777fe7e13db95591268`. No working input or compiled source changed; the manifest proves full tree identity. Textual compatibility alone was not used as a runtime Pass.
- [LI current-source/operator evidence](https://github.com/3427564237/enmori-app/blob/be44375e9c8e3080e7086aab1dbb0db788c826fd/docs/evidence/sprint3/2026-10-14-li-new-ai-join-review.md) remains LI-attributed. The later LI [#105 host checkpoint](https://github.com/3427564237/enmori-app/pull/105#issuecomment-6173361327) observed one real model rejection with the approved policy, 185 complete input tokens and 3032ms. No raw reply was retained; its exact rejection cause is unknown, not diagnosed as an unsafe reply or a paraphrase.
- JIN's earlier unpublished policy-choice draft is superseded by the actual approved #108 delivery and is excluded. No repeat F01/Q31 vote or deployment/key request is made.

JIN constructed and published earlier integration merges including `e594cb7` into this integration branch, not main. The later LI #107 approval is not represented as preceding that earlier merge. This join likewise does not modify main or retarget the review base.

## R1 correction and retained failures

The old retirement path required a live content inventory before retiring a previous-process control. Valid expired or deleting targets therefore blocked `createIsolatedConversationComposition` before its own cleanup could start.

The correction retains the confirmed replacement runtime-epoch transaction check. Only previous-epoch retirement may validate a complete expired inventory. A valid irreversible deleting marker may retire that old control even when a prior child-delete batch is partial; it does not return content/outcome, clear another operation's claim, revive data, or grant new admission. Startup whole-target cleanup then drains the remaining children. Live readers/writers remain live-only; current-epoch retirement still requires closed and settled original work. Corrupt metadata, unknown SDK effects and unproved current settlement remain fail closed. The internal trusted clock seam applies consistently to existing composition suppliers; no client clock/DTO, record/index or retention rule is added.

| Checkpoint | Actual result | Attribution / consequence |
| --- | --- | --- |
| Old product plus two new actual SDK regressions | 18/20, exit1 | Both expired and interrupted-delete reproductions fail exactly at previous-epoch retirement. Test snapshot hash is in the manifest. |
| First corrected run, compiled `4ac29ad` | 22/25, exit1 | Five new retirement/Bootstrap cases pass. The precision test incorrectly treated the fractional expiry millisecond as certainly live; its failed factory had already replaced the epoch and caused two later fixtures to use an obsolete epoch. This is retained test-harness failure, not a relaxation of the approved precision rule. |
| Corrected fixture at current product | 25/25, exit0 | Use the last certainly-live millisecond and first certainly-expired millisecond. After each case, read back the actual runtime epoch so an earlier failed factory cannot contaminate another case. All original assertions remain. |

Seven new SDK cases cover the two reproduced failures, actual Bootstrap expired/deleting/partially-deleted startup, original full-precision expiry and no renewal, corrupt/unknown/current-unsettled protection. The original cases preserve live canonical outcomes, old-A/new-B claims, previous-epoch pagination, six-route general composition and delete. Both private profiles and all five required ports were released after each of these runs, including failures. Focused cases overlap the full suite; do not add them.

## Current-source verification

Locked Node24.19.0 / TypeScript7.0.2; Admin14.3.0 / Firestore8.7.1 / CLI15.29.0 / Emulator1.22.0; Java21.0.12; Flutter3.47.2 / Dart3.13.2. No dependency selection/change. Commands run from the exact source archive using existing locked dependencies. Backend882, Flutter546 and focusedSDK25 were started with local reference `c7065899`; publication `f83005108517330370876c76ebee208051682570` has the identical complete Git tree and all494 checked working inputs. They are attributed executions on that identical payload, not repeated executions caused by a parent-only publication change.

| Boundary | Command | Result |
| --- | --- | --- |
| Strict Backend | `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass, exit0 |
| Full Backend | `node --test "backend/dist/test/**/*.test.js"` | 882/882, fail/cancel/skip/todo0, exit0 |
| Actual focused SDK | `node tool/run_ai_store_emulators.mjs --coordinator-only` | 25/25, fail/cancel/skip/todo0, outerexit0 |
| Actual full SDK / Dart HTTP | `node tool/run_ai_store_emulators.mjs` | 139/139, fail/cancel/skip/todo0, outerexit0 |
| Full Flutter, default concurrency | `flutter test --reporter expanded` | 546/546, exit0 |
| Fatal-info analysis | `dart analyze --fatal-infos lib test integration_test` | No issues, exit0 |
| Non-writing format | `dart format --output=none --set-exit-if-changed lib/harness/ai_conversation/ai_network_harness_app.dart test/harness/ai_network_persona_harness_test.dart` | 2 files, 0 changed, exit0 |
| Host-tool fake-boundary suite | `node --test tool/controlled_qwen_followup.test.mjs` | 7/7, exit0; HTTP/counter doubles, not real host |
| Host-tool syntax and negative configuration | Two `node --check` commands; empty stdin `semantic-once` | Syntax Pass; expected guard rejection exit1, no host contact |
| Source and whitespace | 494 non-document/non-Skill working input bindings; executable/API delta diff check | Bindings Pass; executable/API delta whitespace Pass |

The full guarded suite uses the actual validated child environment, fixed demo project and loopback Auth/Firestore, cached verified Emulator JAR and actual SDK binding observer. Actual139/139 includes the Dart HTTP/Auth/Application/store/history/delete case and three accepted #108 Persona/candidate-policy SDK cases. Owned fixture assertions, SDK/app shutdown, both temporary private profile removals and all five port checks passed. Model/token decisions in these SDK fixtures remain doubles; no real Qwen/store join is claimed.

API and route inventory, dependency locks/manifests, index declarations and LI Home/router are unchanged from `71dfa602`. New public API/schema/index/runtime enablement is not part of this correction. Whole PR whitespace retains inherited raw-log padding; current `71dfa602`-to-product full-file check exits2 for three inherited #108 log-padding findings. This is not an all-file whitespace Pass. The accompanying manifest records exact aggregate results, source/blob bindings and private log fingerprints; hashes do not imply reviewer downloads or reruns.

## Approved semantics and executable operator handoff

The compiler now instructs exact attribution of the complete recognized source sentence, preserving punctuation/case and distinguishing current input from Note attribution. It describes the already-approved finite routine grammar, Persona-only bullet option and exact JSON shape. It does not widen the policy, transform a response, add a fallback, synthesize an accepted answer or substitute prompt instructions for the independent candidate gate. The #108 implementation/corpus remain unchanged. Arbitrary safe paraphrases can still be rejected; this is not general natural-language semantic completeness.

`tool/controlled_qwen_followup.mjs` supplies three explicit modes on LI's existing controlled host. Build the exact Backend source above first. Pass only the existing private operator configuration through stdin (never commit/echo it): `controlledHostVerified:true`, existing `binding` and pinned `tokenizerFiles` matching the existing helper constructor. No secret, model download, alternative host or new dependency is requested. The tool checks Node24.19.0, formal9B loopback binding and matching pinned tokenizer identities; actual adapter preflight still checks the loaded host. `current()` here is the operator's exclusive-use lease, not an independently proved immutable deployment.

```sh
node tool/controlled_qwen_followup.mjs semantic-once < "$EXISTING_PRIVATE_CONFIG"
node tool/controlled_qwen_followup.mjs complete-inputs < "$EXISTING_PRIVATE_CONFIG"
# Only while the previously used model invocation is confirmed settled:
node tool/controlled_qwen_followup.mjs cancel-once < "$EXISTING_PRIVATE_CONFIG"
```

- `semantic-once`: one actual compiler/tokenizer/adapter/Application attempt through unchanged #108 packet with its actual finite candidate policy. Fixed synthetic current input, synthetic Auth/empty Notes/memory store/sink. Only one U/one A/one accepted body, stopped model, cleared local holders and revoked capabilities yields `Pass`. Rejection remains `Not Proven`/exit2 with one U/zero A as applicable. No automatic retry, reply inspection/logging or repair. JSON report is content-free.
- `complete-inputs`: a bounded search (at most192 measurements) for valid <=2400-code-point inputs with exactly4096 and4097 complete framed tokens. Every exact candidate is counted; search hints are not proof of tokenizer monotonicity. Missing exact boundaries are `Blocked`, not rounded. No generation POST is allowed; actual4097 adapter rejection must precede POST. Previously measured raw token strings or old185/193 counts do not prove this changed complete prompt.
- `cancel-once`: at most one actual runtime/adapter HTTP invocation; cancel at the next event-loop boundary after local HTTP invocation. Server receipt/start is not proven by that observation. Aborted socket uncertainty stays quarantined and a second admission is denied. If remote stop is unconfirmed, report it and do not restart/reset/bypass the host lease to send another request; LI must establish actual remote settlement. This is not a product database journey.

Nine new joined-runtime cases cover one-active/two-queued/per-owner, original5s/45s/60s limits, preparation consuming the original total budget, pending candidate revocation, late tokenizer completion, aborted transport quarantine and late confirmed stop without late content. They are part of882, using fake HTTP/tokenizer/clock. #108's additional full Application cases retain their separate synthetic boundaries. The seven tool tests include exact positive attribution and rejected paraphrase/extra-advice cases through the actual candidate gate; they do not claim model generation.

**Current JIN actual-host result: Not Run.** LI's earlier model/tokenizer results are retained, not transferred. LI can execute these exact new-source modes locally without another key/deployment request. Native template-render equivalence, positive real-model semantic acceptance, valid complete-input boundaries and actual cancellation/remote settlement remain explicit observations to collect. A successful finite positive case would not prove universal Q31-E semantic conformance or a real database/model combined journey.

## Remaining disposition

SHI R1 and new-source review remain pending until SHI reviews this correction; no reviewer thread is self-resolved. LI source/evidence acceptance follows. Nonempty operational Note writer/canonical-time/deletion/nonreuse facts hold only their dependent real reader/write/source-cleanup paths. Restart/short cleanup tests do not establish continuous90-day/+24h operational SLA; partial evidence is not full cleanup operation proof. New Android/device/API24/25/human accessibility/UAT/Release were Not Run in this increment. Existing #99 default-run failure and its limited later diagnosis remain historical; this later546 pass is not a retrospective explanation.

This is one usable correction/join/operator packet.15October23:59 remains the prospective target, with no deadline completion promise. Draft/Open and main/Issue/Project boundaries remain. No ordinary/cloud/provider/model-as-product enablement or whole42-route38-state/module/Sprint/Done claim.
