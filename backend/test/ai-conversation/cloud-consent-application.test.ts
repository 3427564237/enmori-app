import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture as baseFixture, until, deferred } from './async-conversation-fakes.js';
import { valid } from '../ai-runtime/support.js';
import type { CloudAiConsentAuthority, CloudConsentObservation } from '../../src/account/ports/cloud-ai-consent-authority.js';
import { ApplicationCloudConversationConsent, AuthorizedAsyncCloudConversationTransport } from '../../src/ai-conversation/application/async-cloud-conversation-transport.js';

import { BoundedAiRuntime } from '../../src/ai-runtime/application/bounded-ai-runtime.js';
import { CloudAdmissionOwner } from '../../src/ai-runtime/application/cloud-admission-owner.js';
import type { AsyncConversationStore } from '../../src/ai-conversation/ports/async-conversation.js';
function fixture(_strategy: 'open_conversation_v1', _unused: undefined, consent: CloudAiConsentAuthority) {
  const lease = {}; let finalAuthorization = false;
  const consentBridge = new ApplicationCloudConversationConsent();
  const f = baseFixture('open_conversation_v1', (clock, model) => {
    const transport = new AuthorizedAsyncCloudConversationTransport({dispatch: async (input, budget) =>
      ({kind:'response',physical:'stopped',raw:await model.generate(input,budget)})}, {verify:(handle,budget)=>{finalAuthorization=true;return consentBridge.verify(handle,budget);},current:handle=>consentBridge.current(handle)});
    const owner = new CloudAdmissionOwner(clock,transport,{recover:async()=>({kind:'confirmed',reservations:[],previousRemote:'none_confirmed',lease}),current:l=>l===lease,reserve:async()=> 'confirmed'},
      {windowMs:86400000,maxRequests:24,maxTokens:24000,tokensPerRequest:1000});
    void owner.recover();
    return new BoundedAiRuntime(clock,{kind:'cloud',owner},true);
  }, consent);
  (f.store as AsyncConversationStore).readHistory = async () => ({kind:'read',value:{pairs:[],sources:[]}});
  return {...f,finalAuthorization:()=>finalAuthorization};
}
test('cloud Application requires a separate grant before user write/model and rechecks it before delivery',async()=>{
 for(const initial of ['denied','unavailable'] as const){
  const f=fixture('open_conversation_v1',undefined,{read:async()=>({kind:initial})});
  await Promise.resolve();await Promise.resolve();const a=await f.app.dispatch(f.create());assert.equal(a.accepted,true);if(!a.accepted)throw Error();
  const result=await a.request.outcome;assert.equal(result.ok,false);assert.equal(f.calls.length,0);assert.equal(f.store.rows.size,0);
 }
 let permission:CloudConsentObservation={kind:'authorized',generation:3,purposeGeneration:3,current:()=>true,release:()=>{}};
 const f=fixture('open_conversation_v1',undefined,{read:async()=>permission});
 await Promise.resolve();await Promise.resolve();const a=await f.app.dispatch(f.create());if(!a.accepted)throw Error();await until(()=>f.calls.length===1);
 permission={kind:'denied'};f.calls[0]!.completion.resolve(valid());
 assert.equal((await a.request.outcome).ok,false);assert.equal(f.delivered.length,0);
 assert.equal([...f.store.rows.values()].some(r=>r.assistantMessageId!==undefined),false);
});
test('cloud grant generation change and cancelled delayed grant cannot resume old dispatch',async()=>{
 let reads=0;const f=fixture('open_conversation_v1',undefined,{read:async()=>({kind:'authorized',generation:++reads===1?3:4,purposeGeneration:3,current:()=>true,release:()=>{}})});
 await Promise.resolve();await Promise.resolve();const a=await f.app.dispatch(f.create());if(!a.accepted)throw Error();
 assert.equal((await a.request.outcome).ok,false);assert.equal(f.calls.length,0);
 const wait=deferred<CloudConsentObservation>();const delayed=fixture('open_conversation_v1',undefined,{read:()=>wait.promise});
 await Promise.resolve();await Promise.resolve();const command=delayed.create(),b=await delayed.app.dispatch(command);if(!b.accepted)throw Error();
 await delayed.app.cancel(command,delayed.who);wait.resolve({kind:'authorized',generation:3,purposeGeneration:3,current:()=>true,release:()=>{}});
 assert.equal((await b.request.outcome).ok,false);assert.equal(delayed.calls.length,0);
});
test('concrete cloud bridge refuses legacy handles and revocable/throwing guards',async()=>{
 const c=new ApplicationCloudConversationConsent(),abort=new AbortController();
 const budget={signal:abort.signal,deadline:1,remainingMs:()=>1};
 const base={authorize:async()=>true,projection:()=>undefined};
 assert.equal(await c.verify(base,budget),false);
 assert.equal(await c.verify({...base,processing:'cloud',cloudConsentCurrent:()=>true},budget),true);
 assert.equal(c.current({...base,processing:'cloud',cloudConsentCurrent:()=>{throw Error();}}),false);
 abort.abort();assert.equal(await c.verify({...base,processing:'cloud',cloudConsentCurrent:()=>true},budget),false);
});

test('revocation during the last history await blocks physical dispatch even if the stale history read completes',async()=>{
 let live=true,historyReads=0;const wait=deferred<void>();
 const f=fixture('open_conversation_v1',undefined,{read:async()=>({kind:'authorized',generation:1,purposeGeneration:3,current:()=>live,release:()=>{}})});
 (f.store as AsyncConversationStore).readHistory=async()=>{historyReads++;if(f.finalAuthorization())await wait.promise;return {kind:'read',value:{pairs:[],sources:[]}};};
 await Promise.resolve();await Promise.resolve();const a=await f.app.dispatch(f.create());if(!a.accepted)throw Error();
 await until(()=>f.finalAuthorization() && historyReads>=5);assert.equal(f.store.rows.size,1);live=false;wait.resolve();
 assert.equal((await a.request.outcome).ok,false);assert.equal(f.calls.length,0);assert.equal(f.delivered.length,0);
});
