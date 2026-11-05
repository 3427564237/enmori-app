import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { registerConversationRoutes } from "../../src/ai-conversation/transport/register-routes.js";
import type { ConversationOperations } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { StoredConversationMessage } from "../../src/ai-conversation/ports/real-conversation-store.js";
import type { PreparedReplySelection } from "../../src/ai-conversation/ports/selected-reply.js";

const conversationId=randomUUID(),operationId=randomUUID(),key=randomBytes(32).toString("base64url"),selectionRevision=randomUUID(),selectionKey=randomUUID();
const source={cardRef:selectionKey,kind:"check_in" as const,version:"server-version",sourceOccurredAt:"2026-10-25T01:00:00.000Z",observedAt:"2026-10-25T01:01:00.000Z",state:"available" as const,canNavigate:true as const};
const user:StoredConversationMessage={messageId:randomUUID(),role:"user",sequence:1,persistedAt:{seconds:1792886400,nanoseconds:0},availability:"available",text:"Synthetic request"};
const assistant:StoredConversationMessage={...user,messageId:randomUUID(),sequence:2,role:"assistant",text:"Synthetic answer",sources:[{...source,...{privateSourceId:"do-not-project"}}]};
const historyPair={historyKey:randomUUID(),userMessageId:user.messageId,assistantMessageId:assistant.messageId,userSequence:1,assistantSequence:2};
async function fixture(historyPairs:PreparedReplySelection["historyPairs"]=[historyPair], today?:PreparedReplySelection["today"], processing?: 'local' | 'cloud'){
 const calls:unknown[]=[];
 const app=Fastify({logger:false});app.decorateRequest("authPrincipal",null);
 const operations:ConversationOperations={
  prepare:async(_caller,input)=>{calls.push(input);return{kind:"success",value:{operationId,operationKey:key,conversationId,preparationExpiresAt:"2026-10-25T01:02:00.000Z",contextSelection:{selectionRevision,expiresAt:"2026-10-25T01:02:00.000Z",...(today?{today}:{}),sourceCards:[{...source,selectionKey,...(today?{checkInId:"own-today-record"}:{}),...{privateOwner:"do-not-project"}}],historyPairs:historyPairs.map(p=>({...p,...{privateReceipt:"do-not-project"}}))}}};},
  execute:async(_caller,input)=>{calls.push(input);return{kind:"success",value:{operationId,conversationId,userMessage:user,assistantMessage:assistant}};},
  listMessages:async()=>({kind:"success",value:{messages:[user,{...assistant,origin:"proactive",occurrenceId:randomUUID(),category:"explicit_follow_up"}]}}),
  cancel:async()=>({kind:"success",value:{operationId,state:"terminal"}}),
  readOutcome:async()=>({kind:"failure",code:"AI_OPERATION_UNAVAILABLE"}),
  deleteConversation:async()=>({kind:"success",value:undefined}),
 };
 await registerConversationRoutes(app,{verifyIdToken:async()=>({kind:"verified",principal:{firebaseUid:"synthetic"}})},operations,processing);
 await app.ready();return{app,calls};
}
const headers={authorization:"Bearer synthetic"};
test('cloud routes require the explicit cloud preparation and reviewed execution selection', async t => {
  const { app, calls } = await fixture([], undefined, 'cloud');
  t.after(() => app.close());
  const prepare = { method: 'POST' as const, url: '/v1/me/ai/operations', headers };
  const base = { kind: 'send', purpose: 'checkin_conversation' };
  const legacy = await app.inject({ ...prepare, payload: base });
  assert.equal(legacy.json().error.code, 'AI_CONTEXT_NOT_PERMITTED');
  assert.equal((await app.inject({ ...prepare, payload: { ...base, contextSelection: { processing: 'local', sources: [] } } })).statusCode, 400);
  const execute = { method: 'POST' as const, url: `/v1/me/ai/operations/${operationId}/execute`, headers: { ...headers, 'ai-operation-key': key } };
  assert.equal((await app.inject({ ...execute, payload: { text: 'Synthetic' } })).json().error.code, 'AI_CONTEXT_NOT_PERMITTED');
  assert.deepEqual(calls, []);
  assert.equal((await app.inject({ ...prepare, payload: { ...base, contextSelection: { processing: 'cloud', sources: [] } } })).statusCode, 201);
  assert.equal((await app.inject({ ...execute, payload: { text: 'Synthetic', contextSelection: { selectionRevision, includedKeys: [], excludedKeys: [] } } })).statusCode, 200);
  assert.equal(calls.length, 2);
});
test("today transport projects the server day and owner source locator without expanding the source card",async t=>{
 const today={date:"2026-10-25",timeZone:"Asia/Singapore",limit:5 as const,hasMore:true};
 const f=await fixture([],today);t.after(()=>f.app.close());
 const contextSelection={processing:"local",today:{timeZone:"Asia/Singapore"}};
 const r=await f.app.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",contextSelection}});
 assert.equal(r.statusCode,201);assert.deepEqual(f.calls[0],{kind:"send",purpose:"checkin_conversation",contextSelection});
 assert.deepEqual(r.json().contextSelection.today,today);
 assert.deepEqual(r.json().contextSelection.sourceCards,[{...source,selectionKey,checkInId:"own-today-record"}]);
 assert(!r.body.includes("do-not-project"));
});
test("today transport rejects client dates, owner selectors, invalid zones and mixed manual modes before operations",async t=>{
 const f=await fixture();t.after(()=>f.app.close());
 for(const today of [{timeZone:"GMT"},{timeZone:"+08:00"},{timeZone:"Unknown/Zone"},{timeZone:"Asia/Singapore",date:"2026-10-25"},{timeZone:"Asia/Singapore",owner:"other"},{}]) {
  const r=await f.app.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",today}}});assert.equal(r.statusCode,400);
 }
 const r=await f.app.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",contextSelection:{processing:"local",today:{timeZone:"Asia/Singapore"},sources:[]}}});
 assert.equal(r.statusCode,400);assert.deepEqual(f.calls,[]);
});
test("selected transport keeps exact locator input, allowlists cards and forwards request-local choices",async t=>{
 const f=await fixture();t.after(()=>f.app.close());
 const contextSelection={processing:"local",sources:[{kind:"check_in",checkInId:"legacy-record-id"}]};
 const response=await f.app.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",contextSelection}});
 assert.equal(response.statusCode,201);assert.deepEqual(f.calls[0],{kind:"send",purpose:"checkin_conversation",contextSelection});
 assert.deepEqual(response.json().contextSelection.sourceCards,[{...source,selectionKey}]);assert(!response.body.includes("do-not-project"));
 assert.deepEqual(response.json().contextSelection.historyPairs,[historyPair]);
 const choice={selectionRevision,includedKeys:[selectionKey],excludedKeys:[selectionKey],excludedHistoryKeys:[historyPair.historyKey]};const replyToMessageId=randomUUID();
 const result=await f.app.inject({method:"POST",url:`/v1/me/ai/operations/${operationId}/execute`,headers:{...headers,"ai-operation-key":key},payload:{text:"Synthetic",contextSelection:choice,replyToMessageId}});
 assert.equal(result.statusCode,200);assert.deepEqual(f.calls[1],{operationId,operationKey:key,text:"Synthetic",contextSelection:choice,replyToMessageId});
 assert.deepEqual(result.json().assistantMessage.sources,[source]);assert(!result.body.includes("do-not-project"));
});
test("selected transport rejects excessive, duplicate, content-bearing or foreign source shapes before operations",async t=>{
 const f=await fixture();t.after(()=>f.app.close());
 for(const selection of [
  {processing:"cloud",sources:[]}, {processing:"local",sources:[{kind:"event",checkInId:"x"}]},
  {processing:"local",sources:[{kind:"check_in",checkInId:"x",text:"private"}]},
  {processing:"local",sources:[{kind:"check_in",checkInId:"../x"}]},
  {processing:"local",sources:Array.from({length:6},(_,i)=>({kind:"check_in",checkInId:`id-${i}`}))},
  {processing:"local",sources:[{kind:"check_in",checkInId:"x"},{kind:"check_in",checkInId:"x"}]},
 ])assert.equal((await f.app.inject({method:"POST",url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",contextSelection:selection}})).statusCode,400);
 for(const contextSelection of [{selectionRevision:"forged",includedKeys:[],excludedKeys:[]},{selectionRevision,includedKeys:[selectionKey,selectionKey],excludedKeys:[]},{selectionRevision,includedKeys:[],excludedKeys:[],owner:"forged"},
  {selectionRevision,includedKeys:[],excludedKeys:[],excludedHistoryKeys:[historyPair.historyKey,historyPair.historyKey]},
  {selectionRevision,includedKeys:[],excludedKeys:[],excludedHistoryKeys:[randomUUID(),randomUUID(),randomUUID()]},
  {selectionRevision,includedKeys:[],excludedKeys:[],excludedHistoryKeys:["forged"]},
 ])
  assert.equal((await f.app.inject({method:"POST",url:`/v1/me/ai/operations/${operationId}/execute`,headers:{...headers,"ai-operation-key":key},payload:{text:"Synthetic",contextSelection}})).statusCode,400);
 assert.deepEqual(f.calls,[]);
});
test("source-aware transcript projects genuine proactive identity and does not fabricate a user pair",async t=>{
 const f=await fixture();t.after(()=>f.app.close());
 const response=await f.app.inject({method:"GET",url:`/v1/me/conversations/${conversationId}/messages`,headers});
 assert.equal(response.statusCode,200);const messages=response.json().messages;
 assert.equal(messages.length,2);assert.equal(messages[1].role,"assistant");assert.equal(messages[1].origin,"proactive");assert.equal(messages[1].category,"explicit_follow_up");
 assert.deepEqual(messages[1].sources,[source]);assert(!response.body.includes("do-not-project"));
});
test("history review permits a late accepted retry while rejecting reused message sequences",async t=>{
 // U1 fails, U2/A3 completes, then Retry U1 produces A4. The retained Store
 // selects the last two completed pairs by assistant sequence, not user order.
 const pairs=[{historyKey:randomUUID(),userMessageId:randomUUID(),assistantMessageId:randomUUID(),userSequence:2,assistantSequence:3},
  {historyKey:randomUUID(),userMessageId:randomUUID(),assistantMessageId:randomUUID(),userSequence:1,assistantSequence:4}];
 const good=await fixture(pairs);t.after(()=>good.app.close());
 const request={method:"POST" as const,url:"/v1/me/ai/operations",headers,payload:{kind:"send",purpose:"checkin_conversation",conversationId,contextSelection:{processing:"local",sources:[]}}};
 const response=await good.app.inject(request);assert.equal(response.statusCode,201);assert.deepEqual(response.json().contextSelection.historyPairs,pairs);
 const bad=await fixture([pairs[0]!,{...pairs[1]!,userSequence:2}]);t.after(()=>bad.app.close());
 assert.equal((await bad.app.inject(request)).statusCode,503);
});
