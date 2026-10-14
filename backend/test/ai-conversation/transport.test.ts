import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildApp } from "../../src/bootstrap/build-app.js";
import { err } from "../../src/shared/domain/result.js";
import { appFailure } from "../../src/shared/application/app-failure.js";
import type { ConversationOperations, ConversationCaller } from "../../src/ai-conversation/ports/conversation-operations.js";
import type { StoredConversationMessage } from "../../src/ai-conversation/ports/real-conversation-store.js";
import { CONVERSATION_ERRORS, parseConversationCursor } from "../../src/ai-conversation/transport/register-routes.js";
const profile = "/tmp/isolated-conversation-transport";
const environment = { ENMORI_ENVIRONMENT: "test", ENMORI_CONTROLLED_PROFILE_DIRECTORY: profile,
  HOME: profile, APPDATA: profile, USERPROFILE: profile, XDG_CONFIG_HOME: profile, GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
const unused = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };
const dependencies = { completeOnboarding: unused, getOnboarding: unused, createCheckIn: unused, getCheckIn: unused,
  getInterestTags: unused, getOwnInterests: unused, replaceOwnInterests: unused };
const operationId = randomUUID(), conversationId = randomUUID(), key = Buffer.alloc(32, 7).toString("base64url");
const headers = { authorization: "Bearer original-token" }, controlHeaders = { ...headers, "ai-operation-key": key };
const user: StoredConversationMessage = { messageId: randomUUID(), sequence: 1, role: "user", availability: "available",
  persistedAt: { seconds: 1791936000, nanoseconds: 123456000 }, text: "  Synthetic message  " };
const assistant: StoredConversationMessage = { ...user, messageId: randomUUID(), sequence: 2, role: "assistant", text: "Synthetic reply" };
const routes = [ ["POST", "/v1/me/ai/operations"], ["POST", `/v1/me/ai/operations/${operationId}/execute`],
  ["POST", `/v1/me/ai/operations/${operationId}/cancel`], ["GET", `/v1/me/conversations/${conversationId}/operations/${operationId}`],
  ["GET", `/v1/me/conversations/${conversationId}/messages`], ["DELETE", `/v1/me/conversations/${conversationId}`] ] as const;
async function fixture(isolated = true, change?: Partial<ConversationOperations>) {
  const calls: { kind: string; caller: ConversationCaller; input: unknown }[] = [];
  const verified: string[] = [];
  const identityVerifier = { verifyIdToken: async (token: string) => { verified.push(token); return token === "expired" ? { kind: "invalid" as const } :
    token === "denied" ? { kind: "forbidden" as const } : token === "offline" ? { kind: "dependency_unavailable" as const } :
    { kind: "verified" as const, principal: { firebaseUid: "synthetic-owner" } }; } };
  const operations: ConversationOperations = {
    prepare: async (caller, input) => { calls.push({ kind: "prepare", caller, input }); return { kind: "success", value: {
      operationId, conversationId, operationKey: key, preparationExpiresAt: "2026-10-14T10:00:15.000Z" } }; },
    execute: async (caller, input) => { calls.push({ kind: "execute", caller, input }); return { kind: "success", value: { operationId, conversationId, userMessage: user, assistantMessage: assistant } }; },
    cancel: async (caller, input) => { calls.push({ kind: "cancel", caller, input }); return { kind: "success", value: { operationId, state: "terminal" } }; },
    readOutcome: async (caller, c, op) => { calls.push({ kind: "read", caller, input: [c, op] }); return { kind: "success", value: { operationId, state: "assistant_saved", userMessage: user, assistantMessage: assistant } }; },
    listMessages: async (caller, c, before) => { calls.push({ kind: "page", caller, input: [c, before] }); return { kind: "success", value: { messages: [user, assistant] } }; },
    deleteConversation: async (caller, c) => { calls.push({ kind: "delete", caller, input: c }); return { kind: "success", value: undefined }; }, ...change,
  };
  const app = await buildApp({ ...dependencies, identityVerifier, ...(isolated ? { isolatedSlices: { environment, conversations: operations } } : {}) });
  return { app, calls, verified, operations, identityVerifier };
}
function failure(response: { statusCode: number; json(): unknown }, status: number, code: string): void {
  assert.equal(response.statusCode, status); const b = response.json() as { error: { code: string; message: string }; requestId: string };
  assert.deepEqual(Object.keys(b).sort(), ["error", "requestId"]); assert.deepEqual(Object.keys(b.error).sort(), ["code", "message"]);
  assert.equal(b.error.code, code); assert.ok(b.requestId.length > 0);
}
test("all six AI routes are absent in ordinary composition and invalid isolation fails before app creation", async t => {
  const f = await fixture(false); t.after(() => f.app.close());
  for (const [method, url] of routes) assert.equal((await f.app.inject({ method, url, headers })).statusCode, 404);
  for (const patch of [{ ENMORI_ENVIRONMENT: "controlled-demo" }, { FIRESTORE_EMULATOR_HOST: "real.example:443" }, { GCLOUD_PROJECT: "ordinary" }]) {
    await assert.rejects(buildApp({ ...dependencies, identityVerifier: f.identityVerifier, isolatedSlices: { environment: { ...environment, ...patch }, conversations: f.operations } }));
  }
  assert.equal(f.calls.length, 0);
});
test("selected auth/error envelope precedes malformed/oversize body, invalid key and target", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const [method, url] of routes) failure(await f.app.inject({ method, url }), 401, "AUTH_REQUIRED");
  for (const payload of ["{", "x".repeat(17000)]) failure(await f.app.inject({ method: "POST", url: routes[0][1], headers: { "content-type": "application/json" }, payload }), 401, "AUTH_REQUIRED");
  for (const [token, status, code] of [["expired",401,"AUTH_REQUIRED"],["denied",403,"AUTH_FORBIDDEN"],["offline",503,"AI_UNAVAILABLE"]] as const) {
    failure(await f.app.inject({ method: "POST", url: routes[0][1], headers: { authorization: `Bearer ${token}` }, payload: {} }), status, code);
  }
  assert.equal(f.calls.length, 0);
});
test("six selected operations project only public fields with correct success statuses", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  assert.equal((await f.app.inject({ method: "POST", url: routes[0][1], headers, payload: { kind: "send", purpose: "checkin_conversation" } })).statusCode, 201);
  const executed = await f.app.inject({ method: "POST", url: routes[1][1], headers: controlHeaders, payload: { text: user.text } });
  assert.equal(executed.statusCode, 200); const body = executed.json();
  assert.equal(executed.headers["cache-control"], "no-store");
  assert.equal(body.userMessage.text, user.text); assert.equal(body.userMessage.persistedAt, "2026-10-14T00:00:00.123456Z");
  assert.deepEqual(Object.keys(body.userMessage).sort(), ["availability", "messageId", "persistedAt", "role", "sequence", "text"]);
  assert.equal((await f.app.inject({ method: "POST", url: routes[2][1], headers: controlHeaders })).statusCode, 200);
  assert.equal((await f.app.inject({ method: "GET", url: routes[3][1], headers })).statusCode, 200);
  assert.equal((await f.app.inject({ method: "GET", url: routes[4][1], headers })).statusCode, 200);
  const deleted = await f.app.inject({ method: "DELETE", url: routes[5][1], headers }); assert.equal(deleted.statusCode, 204); assert.equal(deleted.body, "");
  assert.deepEqual(f.calls.map(c => c.kind), ["prepare", "execute", "cancel", "read", "page", "delete"]);
});
test("fresh verifier retains the exact original token instance; same UID refreshed token has different binding", async t => {
  const f = await fixture(); t.after(() => f.app.close()); const payload = { kind: "send", purpose: "checkin_conversation" };
  await f.app.inject({ method: "POST", url: routes[0][1], headers, payload });
  await f.app.inject({ method: "POST", url: routes[0][1], headers: { authorization: "Bearer refreshed-token" }, payload });
  assert.notEqual(f.calls[0]!.caller.tokenInstance, f.calls[1]!.caller.tokenInstance);
  assert.equal(f.calls[0]!.caller.principal.firebaseUid, f.calls[1]!.caller.principal.firebaseUid);
  await f.calls[0]!.caller.verifyCurrentAuth(); assert.equal(f.verified.at(-1), "original-token");
  assert.equal(JSON.stringify(f.calls[0]!.caller).includes("original-token"), false);
});
test("strict preparation rejects unselected fields, duplicate query and invalid UUID, retaining valid Retry", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const payload of [{kind:"send",purpose:"checkin_conversation",text:"forbidden"}, {kind:"send",purpose:"other"},
    {kind:"retry",purpose:"checkin_conversation",conversationId,userMessageId:"not-uuid"},
    {kind:"send",purpose:"checkin_conversation",conversationId:conversationId.toUpperCase()}, []]) {
    failure(await f.app.inject({ method: "POST", url: routes[0][1], headers, payload }),400,"REQUEST_INVALID");
  }
  assert.equal((await f.app.inject({method:"POST",url:routes[0][1],headers,payload:{kind:"retry",purpose:"checkin_conversation",conversationId,userMessageId:user.messageId}})).statusCode,201);
  failure(await f.app.inject({method:"POST",url:routes[0][1]+"?x=1&x=2",headers,payload:{kind:"send",purpose:"checkin_conversation"}}),400,"REQUEST_INVALID");
  assert.equal(f.calls.length,1);
});
test("execute body and key reject invalid Unicode, noncanonical bytes and excessive input without dispatch", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const text of [" ","\ud800","x".repeat(2401)]) failure(await f.app.inject({method:"POST",url:routes[1][1],headers:controlHeaders,payload:{text}}),422,"AI_INPUT_INVALID");
  for (const bad of [key+"=",key+","+key, "A".repeat(42)+"B"]) failure(await f.app.inject({method:"POST",url:routes[1][1],headers:{...headers,"ai-operation-key":bad},payload:{text:"valid"}}),400,"REQUEST_INVALID");
  failure(await f.app.inject({method:"POST",url:routes[1][1],headers:controlHeaders,payload:{text:"x".repeat(17000)}}),413,"REQUEST_TOO_LARGE");
  failure(await f.app.inject({method:"POST",url:routes[1][1],headers:controlHeaders,payload:{text:"valid",owner:"other"}}),400,"REQUEST_INVALID");
  assert.equal(f.calls.length,0);
});
test("canonical cursor is read-only continuation and rejects duplicate/reordered/unsafe variants", async t => {
  const f = await fixture(); t.after(() => f.app.close()); const encode=(s:string)=>Buffer.from(s).toString("base64url");
  const valid=encode('{"v":1,"before":21}'); assert.equal(parseConversationCursor(valid),21);
  for (const raw of ['{"v":1,"before":0}','{"before":21,"v":1}','{"v":1,"before":2,"before":21}','{"v":1,"before":9007199254740992}','{"v":1,"before":21,"owner":"x"}']) {
    failure(await f.app.inject({method:"GET",url:routes[4][1]+"?before="+encode(raw),headers}),400,"REQUEST_INVALID");
  }
  failure(await f.app.inject({method:"GET",url:routes[4][1]+`?before=${valid}&before=${valid}`,headers}),400,"REQUEST_INVALID");
  assert.equal((await f.app.inject({method:"GET",url:routes[4][1]+"?before="+valid,headers})).statusCode,200);
  assert.deepEqual(f.calls.at(-1)!.input,[conversationId,21]);
});
test("cancel/read/delete reject bodies and control key is unavailable to ordinary read", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const index of [2,3,4,5]) { const [method,url]=routes[index]!;
    failure(await f.app.inject({method,url,headers:index===2?controlHeaders:headers,payload:{}}),400,"REQUEST_INVALID"); }
  failure(await f.app.inject({method:"GET",url:routes[3][1],headers:controlHeaders}),400,"REQUEST_INVALID");
  assert.equal(f.calls.length,0);
});
test("unknown deletion/cancel returns selected unresolved error and never a successful confirmation", async t => {
  const f=await fixture(true,{cancel:async()=>({kind:"failure",code:"AI_OUTCOME_UNRESOLVED"}),deleteConversation:async()=>({kind:"failure",code:"AI_OUTCOME_UNRESOLVED"})}); t.after(()=>f.app.close());
  failure(await f.app.inject({method:"POST",url:routes[2][1],headers:controlHeaders}),503,"AI_OUTCOME_UNRESOLVED");
  failure(await f.app.inject({method:"DELETE",url:routes[5][1],headers}),503,"AI_OUTCOME_UNRESOLVED");
});

test("corrupt inner outcomes cannot leak content or falsely confirm another operation", async t => {
  const f = await fixture(true, {
    cancel: async () => ({kind:"success",value:{operationId:randomUUID(),state:"terminal"}}),
    readOutcome: async () => ({kind:"success",value:{operationId,state:"active",userMessage:user}}),
    listMessages: async () => ({kind:"success",value:{messages:[user, {...assistant,messageId:user.messageId}]}}),
  }); t.after(()=>f.app.close());
  for (const index of [2,3,4]) {
    const [method,url]=routes[index]!;
    const response=await f.app.inject({method,url,headers:index===2?controlHeaders:headers});
    failure(response,503,"AI_UNAVAILABLE");
    assert.equal(response.headers["cache-control"],"no-store");
    assert.equal(response.body.includes("Synthetic"),false);
  }
  const unauthenticated=await f.app.inject({method:"GET",url:routes[4][1]});
  assert.equal(unauthenticated.headers["cache-control"],"no-store");
});
test("normative AI envelope/codes and isolation are separate from unchanged legacy envelope", async()=>{
  const contract=JSON.parse(await readFile("api/openapi.json","utf8"));
  assert.deepEqual(contract.components.schemas.ConversationError.required,["error","requestId"]);
  assert.deepEqual([...contract.components.schemas.ConversationError.properties.error.properties.code.enum].sort(),Object.keys(CONVERSATION_ERRORS).sort());
  assert.deepEqual(contract.components.schemas.ErrorEnvelope.properties.error.required,["code","message","requestId"]);
  for(const [path,methods] of Object.entries(contract.paths) as [string,Record<string,any>][]) if(path.includes("/ai/")||path.includes("/conversations/")) {
    for(const operation of Object.values(methods)) assert.equal(operation["x-enmori-environment"],"isolated-emulator");
  }
});

test("actual complete-body sink accepts once synchronously and ignores the later return value",async t=>{
  const observed:boolean[]=[];let resumed=false;
  const f=await fixture(true,{execute:async(_caller,_input,delivery)=>{
    assert.equal(typeof delivery.acceptCompleteBody,"function");
    observed.push(delivery.acceptCompleteBody!({operationId,conversationId,userMessage:user,assistantMessage:assistant}));
    observed.push(delivery.acceptCompleteBody!({operationId,conversationId,userMessage:user,assistantMessage:{...assistant,text:"late replacement"}}));
    await Promise.resolve();resumed=true;return {kind:"failure",code:"AI_UNAVAILABLE"};
  }});t.after(()=>f.app.close());
  const response=await f.app.inject({method:"POST",url:routes[1][1],headers:controlHeaders,payload:{text:user.text}});
  assert.equal(response.statusCode,200);assert.equal(response.json().assistantMessage.text,assistant.text);
  assert.equal(response.headers["cache-control"],"no-store");assert.deepEqual(observed,[true,false]);assert.equal(resumed,true);
});
test("complete-body sink rejects mismatched pair before writing any response bytes",async t=>{
  const f=await fixture(true,{execute:async(_caller,_input,delivery)=>{
    assert.equal(delivery.acceptCompleteBody!({operationId:randomUUID(),conversationId,userMessage:user,assistantMessage:assistant}),false);
    return {kind:"failure",code:"AI_UNAVAILABLE"};
  }});t.after(()=>f.app.close());
  const response=await f.app.inject({method:"POST",url:routes[1][1],headers:controlHeaders,payload:{text:user.text}});
  failure(response,503,"AI_UNAVAILABLE");assert.equal(response.body.includes("Synthetic reply"),false);
});
