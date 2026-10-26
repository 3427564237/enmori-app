import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareConversationHost } from '../../src/bootstrap/prepare-conversation-host.js';
import { LocalModelLane } from '../../src/ai-runtime/infrastructure/local-model-lane.js';
import type { ConversationOperationExecutor, ExecutedConversation, ConversationExecutionDelivery } from '../../src/ai-conversation/ports/application-conversation-operations.js';
import type { ConversationResult } from '../../src/ai-conversation/ports/conversation-operations.js';

test('warm host does not reload the model; cold host preloads with unchanged idle release', async () => {
  for (const loaded of [true, false]) {
    const calls: {url:string;body?:string}[]=[];
    const lane = new LocalModelLane('qwen3.5:9b', async (url,init) => {
      calls.push({url:String(url),...(typeof init?.body==='string'?{body:init.body}:{})});
      if(String(url).endsWith('/api/ps'))return Response.json({models:loaded?[{name:'qwen3.5:9b',expires_at:new Date(Date.now()+30*60_000).toISOString()}]:[]});
      return Response.json({model:'qwen3.5:9b',done:true,response:''});
    });
    await lane.prepareForChat();
    assert.equal(calls.length,loaded?1:2);
    assert(!calls.some(c=>c.url.endsWith('/api/chat')));
    if(!loaded){const body=JSON.parse(calls[1]!.body!);assert.equal(body.prompt,'');assert.equal(body.keep_alive,'30m');assert.deepEqual(body.options,{num_ctx:8192});}
    assert.deepEqual(lane.state,{pending:false,outcomeUnknown:false});
  }
});

test('failed residency read does not guess idle state or dispatch a preload', async () => {
  let calls=0;
  const lane=new LocalModelLane('qwen3.5:9b',async()=>{calls++;return Response.json({models:null});});
  await assert.rejects(lane.prepareForChat());assert.equal(calls,1);
  assert.deepEqual(lane.state,{pending:false,outcomeUnknown:false});
});

test('a loaded model near idle expiry is prepared before the send window', async () => {
  const paths:string[]=[];
  const lane=new LocalModelLane('qwen3.5:9b',async url=>{
    paths.push(String(url));
    return String(url).endsWith('/api/ps')
      ? Response.json({models:[{name:'qwen3.5:9b',expires_at:new Date(Date.now()+1000).toISOString()}]})
      : Response.json({model:'qwen3.5:9b',done:true,response:''});
  });
  await lane.prepareForChat();
  assert.deepEqual(paths.map(p=>new URL(p).pathname),['/api/ps','/api/generate']);
  assert.equal(lane.state.pending,false);
});

for(const finish of ['ready','cancel','dispose','authority-lost','failed'] as const){
 test(`host preparation ${finish} retains original cancellation before any business dispatch`,async()=>{
  let ready!:()=>void,fail!:()=>void,dispatches=0,cancels=0,disposals=0;
  const preparing=new Promise<void>((resolve,reject)=>{ready=resolve;fail=()=>reject(Error('unavailable'));});
  const inner:ConversationOperationExecutor={create:()=>({
   dispatch:async()=>{dispatches++;return {kind:'failure',code:'AI_BUSY'} as ConversationResult<ExecutedConversation>;},
   cancel:async()=>{cancels++;return {kind:'unresolved'};},dispose:()=>{disposals++;},
  })};
  let current=true;
  const delivery:ConversationExecutionDelivery={signal:new AbortController().signal,current:()=>current,acceptCompleteBody:()=>false};
  // The fake factory does not read input: no user content is needed for this gate.
  const execution=prepareConversationHost(inner,()=>preparing).create({} as Parameters<ConversationOperationExecutor['create']>[0],delivery);
  const result=execution.dispatch();await Promise.resolve();assert.equal(dispatches,0);
  if(finish==='cancel')await execution.cancel();
  if(finish==='dispose')execution.dispose();
  if(finish==='authority-lost')current=false;
  if(finish==='failed')fail();else ready();
  const observed=await result;
  assert.equal(dispatches,finish==='ready'?1:0);
  assert.equal(cancels,finish==='cancel'?1:0);assert.equal(disposals,finish==='dispose'?1:0);
  if(finish==='failed')assert.deepEqual(observed,{kind:'failure',code:'AI_UNAVAILABLE'});
  else if(finish!=='ready')assert.deepEqual(observed,{kind:'terminated'});
 });
}
