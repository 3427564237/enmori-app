# LI pre-acceptance verification — internal AI lifecycle #79

Recorded 12 October 2026, Asia/Singapore. Executor/reviewer: LI HOURUI. **Disposition: LI independent precheck Pass for the selected internal functional scope; formal bounded acceptance Pending JIN's new-code review.** This is not an acceptance decision, merge or whole-AI completion.

## Exact sources and authority

- Actual reviewed #79 head: `d242cc9b8fa5626a877d0397c6f1a41278b5c81a`; unchanged executable source `141d120ab12468cd0b0b05cd7288d474d07724e5`.
- Base #76: `8f4f61d3e5c7fbc53d75209df5b9ce51f6f2a092`, unchanged product candidate including accepted #72 `0839c46`.
- [Controlling human LI A / C01–C07 and LC01–LC16 release](../../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md), task [#78](https://github.com/3427564237/enmori-app/issues/78).
- [Published handoff](https://github.com/3427564237/enmori-app/blob/d242cc9b8fa5626a877d0397c6f1a41278b5c81a/docs/evidence/sprint3/2026-10-12-zhou-ai-lifecycle-draft-handoff.md) records later explicit human Draft-code publication authority; old local-only checkpoints remain historical.
- [LI precheck COMMENT 5486141087](https://github.com/3427564237/enmori-app/pull/79#pullrequestreview-5486141087), exact head above. JIN's prior #76 proposal approval is distinct from the still-required actual implementation review.

## Independent current-head results

| Check | Actual LI result |
| --- | --- |
| Pinned toolchain and cached direct dependencies | Node 24.19.0 / pnpm 11.19.0 / TypeScript 7.0.2; all six direct package versions equal locked package.json |
| Strict `pnpm backend:verify` | **512/512 Pass**, exit 0; zero fail/cancel/skip/todo |
| Four extra reviewer-only boundary probes | **4/4 Pass**, counted separately from the committed 512 |
| Owner manifest inputs | **143/143** current Git blobs and declared working hashes match: nine exact Git-byte hashes, 134 equivalent Windows CRLF hashes |
| Current versus tested executable | Identical non-document Git payload to `141d120`; SHA-256 `8dedfe9ca6c7e19626e5a44544c292ca95bac917fbe130c78878212cd507391a` |
| Published owner test transcript | Exact LF SHA-256 `04f954326e837f09324665e0911af394e8911767e72d83dc110a9d6664653540`; CRLF reconstruction matches original declared `ed354beb2d3b4be1af4cd045b25a4bf298551ab02808f8a0de156970e3900dcc` |
| Product boundary | Nine changed code/test files confined to AI Conversation/runtime; no public API/Bootstrap/Flutter/dependency/configuration delta |
| Backend source/test whitespace | Pass |
| Complete #79 base/head whitespace | **Fail, exit 2:** copied approval file line 56 adds an EOF blank line; original decision content otherwise equal. Nonblocking documentation finding, not hidden or relabeled Pass |
| Actual model/Auth/Firestore/producer/device/public AI | Not Run and outside selected fake-Port scope |

Inspected original clocks/shared capacity and full Application user lifetime, immutable capture, actual guarded message/sink events, uncertain pending-ack/readback and older-target guards, explicit fresh retry, original-operation/session cancellation, Q17 optional projection and minimization, generation settlement/quarantine and once-only disposal. No blocking functional finding identified in LI's precheck. Owner's 465/502 checkpoints and failed acknowledgment/Q17 reproductions remain historical evidence; they are not silently replaced by the new 512.

The four reviewer probes demonstrate: two Application instances retain one shared runtime capacity while a finished-generation request holds its validation/user lifetime; an old reconciled capability cannot regenerate after a later retry committed its assistant; fresh same-owner session retry rejects old-session cancellation without stopping new generation; timestamp-only projections preserve inclusive seven-day bounds, normalized UTC tie order, five-row limit and immutable minimized copying. These use actual compiled Application/runtime with the committed handwritten fakes, not real adapter/model evidence.

## Reproduction and retained LI environment failure

Dedicated managed exact-head Linux worktree; existing cached dependency versions reused through a temporary local node_modules link. Pinned existing Node/pnpm paths were placed only on invocation PATH. The first `pnpm backend:verify` launch stopped before compiler/tests: pnpm's default dependency-state auto-install attempted to replace the reused modules directory and refused without a TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Shared cached dependencies remained present.

Following the repository systematic-debugging workflow, LI inspected the pinned pnpm dependency-check branch and independently verified package versions. The unchanged source then passed with invocation-only `pnpm_config_verify_deps_before_run=false`, preventing automatic installation while running the same committed build/test scripts. No install, source/test/lock/dependency/global-configuration edit or product guard bypass. The temporary dependency link was removed afterward; tracked checkout is clean. No credential, model-host or cloud operation occurred.

```text
# Existing pinned executables on invocation PATH; cached dependencies already verified:
pnpm_config_verify_deps_before_run=false pnpm backend:verify
node --test build/li-ai-review/independent-probes.mjs
git diff --check 8f4f61d d242cc9 -- backend/src backend/test
# Full diff check retains the separate documented EOF warning:
git diff --check 8f4f61d d242cc9
```

Local-only LI fingerprints:

| Artifact | SHA-256 |
| --- | --- |
| Passing strict verification log | `18952df5f08292eaf75614c48f191697f5660a610a84ceeb898ba1d23579d020` |
| First pre-test environment failure log | `93ccab0031a1e5e688df3f3594200f71ae207855ba201319957e6591dc2ac35c` |
| Reviewer-probe result log | `522bed1f38a252147db77127b8bddc9258199e4b32b69fff515898fff348679f` |
| Reviewer-only probe source below | `769b207148e1cca5157f77d4f1458c6be634bdfbdbe5dd10f18d0e903f45a3f9` |

Raw LI logs/temporary wrappers stay in ignored review storage. Published owner transcript has been checked; the remaining 15 private owner raw-log hashes were not independently rehashed or accessed.

## Handoff and status limits

JIN still supplies formal current-head new-code findings/result. LI's 512/4 results are ready for bounded acceptance reconciliation afterward; this record does not replace JIN or complete that final #78 condition. Proposal reviews/old Persona/final gate cannot certify new code. Remove or explicitly retain the nonblocking EOF exception; a documentation-only correction can preserve source/test attribution without an invented complete product rerun.

No public Conversation/storage/P07 producer/P04 or M26 UI/M27/live host/tokenizer/policy acceptance follows from fake tests. Original 42-route/38-state and passed 11 October target remain; no whole-Sprint percentage/extension/completion. #79 Draft/Open, #78 Open, main unchanged; no merge, Issue closure/manual Project promotion or whole-module/Sprint/UAT/Release/Done.

## Reviewer-only probe source

Save unchanged under ignored `build/li-ai-review/independent-probes.mjs` after compiling Backend. It imports the actual candidate code and committed fakes; it is not added to the product test count or committed executable source.

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedAiRuntime } from '../../backend/dist/src/ai-runtime/application/bounded-ai-runtime.js';
import { ConversationApplication } from '../../backend/dist/src/ai-conversation/application/conversation-application.js';
import { captureContext } from '../../backend/dist/src/ai-conversation/application/capture-context.js';
import { createFixture, flush } from '../../backend/dist/test/ai-conversation/fakes.js';
const pump = async () => { await flush(); await flush(); };
const accepted = a => { assert.equal(a.accepted, true); return a.request; };
function fixture() {
 const f=createFixture(); const runtime=new BoundedAiRuntime(f.clock,f.transport);
 const app=new ConversationApplication(runtime,f.sources,f.store,f.gates,f.sink);
 return {...f,runtime,app};
}
test('LI: two Applications share one runtime capacity while original validation retains its user',async()=>{
 const f=fixture(); const app2=new ConversationApplication(f.runtime,f.sources,f.store,f.gates,f.sink);
 f.gates.candidateControl.before.hold();
 const a=f.app.createSend(f.caller,f.conversation,'Synthetic A'); const ar=accepted(f.app.dispatch(a)); await pump();
 f.transport.calls[0].complete(); await pump();
 assert.deepEqual(app2.dispatch(app2.createSend(f.caller,f.conversation,'Synthetic duplicate owner')),{accepted:false,failure:'overload'});
 const commands=[];
 for(const name of ['b','c','d']) { const caller=f.sources.caller(name); const conv=f.store.createConversation(caller);
  const cmd=app2.createSend(caller,conv,'Synthetic '+name);commands.push({cmd,caller,request:accepted(app2.dispatch(cmd))}); }
 const e=f.sources.caller('e');const ec=f.store.createConversation(e);
 assert.deepEqual(app2.dispatch(app2.createSend(e,ec,'Synthetic overflow')),{accepted:false,failure:'overload'});
 await pump();assert.equal(f.transport.calls.length,2);assert.equal(f.runtime.state.queued,2);assert.equal(f.runtime.state.nonTerminal,4);
 f.app.cancel(a,f.caller); for(const c of commands)app2.cancel(c.cmd,c.caller);
 f.transport.calls[1].fail();f.gates.candidateControl.before.release();await pump();
 assert.equal((await ar.outcome).ok,false);assert.equal(f.runtime.state.nonTerminal,0);assert.equal(f.sources.watcherCount,0);
});
test('LI: original confirmed capability cannot regenerate after a later Retry committed its assistant',async()=>{
 const f=fixture();const text='Synthetic current input';const a=f.app.createSend(f.caller,f.conversation,text);
 const ar=accepted(f.app.dispatch(a));await pump();f.transport.calls[0].fail();await pump();assert.equal((await ar.outcome).ok,false);
 const b=f.app.createRetry(f.caller,f.conversation,a,text);const br=accepted(f.app.dispatch(b));await pump();f.transport.calls[1].complete();await pump();assert.equal((await br.outcome).ok,true);
 assert.equal(await f.app.reconcile(a,f.caller),'resolved');
 assert.deepEqual(f.app.dispatch(f.app.createRetry(f.caller,f.conversation,a,text)),{accepted:false,failure:'stale_authority'});
 assert.equal(f.transport.calls.length,2);assert.equal(f.store.userCommits,1);assert.equal(f.store.assistantCommits,1);assert.equal(f.sink.received.length,1);
});
test('LI: fresh same-owner session Retry rejects old-session cancellation and preserves new generation',async()=>{
 const f=fixture();const text='Explicit synthetic retry';const a=f.app.createSend(f.caller,f.conversation,text);
 accepted(f.app.dispatch(a));await pump();f.transport.calls[0].fail();await pump();
 const fresh=f.sources.caller(f.caller.owner);const b=f.app.createRetry(fresh,f.conversation,a,text);
 const br=accepted(f.app.dispatch(b));await pump();assert.equal(f.app.cancel(b,f.caller),false);
 assert.equal(f.app.cancel(a,f.caller),true);assert.equal(f.transport.calls[1].aborted,false);
 f.transport.calls[1].complete();await pump();assert.equal((await br.outcome).ok,true);
 assert.equal(f.store.userCommits,1);assert.equal(f.store.assistantCommits,1);assert.equal(f.clock.pending,0);
});
test('LI: timestamp-only projections use inclusive window, UTC-equivalent ties and minimized five-row copy',()=>{
 const asOf='2026-10-12T00:00:00.000Z';const rows=[
 ['z','2026-10-11T08:00:00+08:00'],['b','2026-10-11T00:00:00Z'],['a','2026-10-11T00:00:00.000Z'],
 ['latest','2026-10-12T00:00:00.000Z'],['older','2026-10-10T00:00:00Z'],['boundary','2026-10-05T00:00:00Z'],
 ['excluded-old','2026-10-04T23:59:59.999Z'],['excluded-future','2026-10-12T00:00:00.001Z']];
 const view={persona:undefined,checkIns:rows.map(([sourceId,occurredAt])=>({source:{sourceType:'check_in',sourceId},projection:{occurredAt,private:'synthetic'}}))};
 const c=captureContext(view,asOf,'Synthetic');assert.deepEqual(c.provenance.map(x=>x.sourceId),['latest','a','b','z','older']);
 assert.ok(c.input.checkIns.every(x=>Object.keys(x).join(',')==='occurredAt'));
 const boundary=captureContext({persona:undefined,checkIns:[view.checkIns[5]]},asOf,'Synthetic');assert.equal(boundary.input.checkIns.length,1);
 view.checkIns[0].projection.occurredAt=asOf;assert.equal(c.input.checkIns[3].occurredAt,'2026-10-11T00:00:00.000Z');
});
```
