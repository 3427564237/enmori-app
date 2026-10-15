import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { ControlledOllamaTransport, type ControlledOllamaBinding, type CompletePromptCompiler } from "../../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
const manifest="1".repeat(64),tokenizer="2".repeat(64),reference="synthetic-approved-qwen:9b";
const binding:ControlledOllamaBinding={endpoint:"http://127.0.0.1:11434",reference,manifestDigest:manifest,tokenizerDigest:tokenizer,
  ollamaVersion:"0.0.0-test",mode:"formal-9b",current:()=>true};
const compiler:CompletePromptCompiler<string>={compile:async input=>({rawPrompt:`Synthetic complete prompt ${input}`,tokens:12,manifestDigest:manifest,tokenizerDigest:tokenizer,includesAllFraming:true})};
const model={name:reference,model:reference,digest:manifest,details:{family:"qwen35",parameter_size:"9B"},context_length:8192};
const raw='{"schemaVersion":"ai_assistant_message_v1","message":"synthetic"}';
function fixture(change?:{binding?:Partial<ControlledOllamaBinding>;compile?:CompletePromptCompiler<string>["compile"];reply?:(path:string,init:RequestInit|undefined)=>Promise<Response>}){
  const calls:{path:string;init:RequestInit|undefined}[]=[],abort=new AbortController();
  const http:typeof fetch=async(url,init)=>{
    const path=new URL(String(url)).pathname;calls.push({path,init});
    const reply=await change?.reply?.(path,init);if(reply)return reply;
    return Response.json(path==="/api/version"?{version:binding.ollamaVersion}:path==="/api/generate"?
      {model:reference,response:raw,done:true,prompt_eval_count:12,eval_count:20}:{models:[model]});
  };
  const adapter=new ControlledOllamaTransport({...binding,...change?.binding},{compile:change?.compile??compiler.compile},http);
  const budget={deadline:1000,signal:abort.signal,remainingMs:()=>1000};
  return {adapter,calls,abort,budget};
}
test("controlled adapter preflights existing version/manifest/loaded context and submits one measured raw prompt",async()=>{
  const f=fixture();assert.equal(new TextDecoder().decode(await f.adapter.generate("input",f.budget)),raw);
  assert.deepEqual(f.calls.map(c=>c.path),["/api/version","/api/tags","/api/ps","/api/generate"]);
  const request=JSON.parse(f.calls[3]!.init!.body as string);
  assert.deepEqual(request,{model:reference,prompt:"Synthetic complete prompt input",raw:true,stream:false,format:"json",options:{num_ctx:8192,num_predict:512}});
  assert.equal(f.calls.every(c=>c.init?.redirect==="error"),true);assert.equal(f.adapter.state,"stopped");
});
test("controlled adapter rejects public/credential/query/DNS endpoints without any network call",()=>{
  for(const endpoint of ["https://example.com","http://8.8.8.8:11434","http://user:secret@127.0.0.1:11434","http://127.0.0.1:11434?token=x","file:///tmp/model","http://localhost:11434"]){
    assert.throws(()=>fixture({binding:{endpoint}}),/AI_UNAVAILABLE/);
  }
});
test("model/digest/context/tokenizer/complete-measurement mismatches fail before generation without fallback",async()=>{
  for(const patch of [{digest:"3".repeat(64)},{context_length:4096},{details:{family:"other",parameter_size:"9B"}},
    {details:{family:"qwen35",parameter_size:"4B"}},{details:{family:"qwen35",parameter_size:"9junk"}}]){
    const f=fixture({reply:async path=>Response.json(path==="/api/version"?{version:binding.ollamaVersion}:{models:[{...model,...patch}]})});
    await assert.rejects(f.adapter.generate("input",f.budget),/AI_UNAVAILABLE/);assert.equal(f.calls.some(c=>c.path==="/api/generate"),false);
  }
  for(const patch of [{tokens:4097},{tokens:0},{tokenizerDigest:"3".repeat(64)},{manifestDigest:"4".repeat(64)},
    {includesAllFraming:false}]){
    const f=fixture({compile:async input=>({...await compiler.compile(input,{deadline:0,signal:new AbortController().signal,remainingMs:()=>0}),...patch}) as Awaited<ReturnType<typeof compiler.compile>>});
    await assert.rejects(f.adapter.generate("input",f.budget),/AI_UNAVAILABLE/);assert.equal(f.calls.some(c=>c.path==="/api/generate"),false);
  }
});
test("late prompt compiler cannot dispatch after cancellation or loss of the controlled host lease",async()=>{
  let release!:(value:Awaited<ReturnType<typeof compiler.compile>>)=>void;let entered=false;
  const f=fixture({compile:()=>{entered=true;return new Promise(resolve=>{release=resolve;});}});
  const outcome=f.adapter.generate("input",f.budget);await setImmediate();assert.equal(entered,true);
  f.abort.abort();release(await compiler.compile("late",f.budget));await assert.rejects(outcome,/AI_UNAVAILABLE/);
  assert.equal(f.calls.some(c=>c.path==="/api/generate"),false);
  let current=true;const g=fixture({binding:{current:()=>current},compile:async(input,budget)=>{current=false;return compiler.compile(input,budget);}});
  await assert.rejects(g.adapter.generate("input",g.budget),/AI_UNAVAILABLE/);assert.equal(g.calls.some(c=>c.path==="/api/generate"),false);
});
test("abort/HTTP failure and ambiguous duplicate completion leave invocation quarantined, not stopped",async()=>{
  for(const kind of ["disconnect","http","partial","duplicate"]){
    const f=fixture({reply:async path=>{
      if(path!=="/api/generate")return Response.json(path==="/api/version"?{version:binding.ollamaVersion}:{models:[model]});
      if(kind==="disconnect")throw new Error("private endpoint error");
      if(kind==="http")return new Response("private error",{status:500});
      if(kind==="partial")return Response.json({model:reference,done:false,response:"partial"});
      return new Response(`{"model":"${reference}","done":false,"done":true,"response":"partial"}`);
    }});
    let settled=false;void f.adapter.generate("input",f.budget).then(()=>{settled=true;},()=>{settled=true;});
    await setImmediate();await setImmediate();assert.equal(f.adapter.state,"termination_unconfirmed");assert.equal(settled,false);
    await assert.rejects(f.adapter.preflight(f.budget),/AI_UNAVAILABLE/);assert.equal(f.calls.filter(c=>c.path==="/api/generate").length,1);
  }
});
test("confirmed done with wrong actual token measurement settles safely but rejects the entire response",async()=>{
  const f=fixture({reply:async path=>Response.json(path==="/api/version"?{version:binding.ollamaVersion}:path==="/api/generate"?
    {model:reference,done:true,response:raw,prompt_eval_count:13,eval_count:20}:{models:[model]})});
  await assert.rejects(f.adapter.generate("input",f.budget),/AI_UNAVAILABLE/);assert.equal(f.adapter.state,"stopped");
});
test("manual 4B development configuration is explicit and never selected as automatic 9B fallback",async()=>{
  const dev=fixture({binding:{mode:"manual-development-4b"},reply:async path=>Response.json(path==="/api/version"?{version:binding.ollamaVersion}:path==="/api/generate"?
    {model:reference,done:true,response:raw,prompt_eval_count:12,eval_count:20}:{models:[{...model,details:{family:"qwen35",parameter_size:"4B"}}]})});
  assert.equal(new TextDecoder().decode(await dev.adapter.generate("input",dev.budget)),raw);
  assert.equal(dev.calls.filter(c=>c.path==="/api/generate").length,1);
});

test("actual dispatch abort signal is forwarded but fetch rejection alone never confirms model termination",async()=>{
  let invoked=false;const f=fixture({reply:async(path,init)=>{
    if(path!=="/api/generate")return Response.json(path==="/api/version"?{version:binding.ollamaVersion}:{models:[model]});
    invoked=true;return new Promise((_resolve,reject)=>init!.signal!.addEventListener("abort",()=>reject(new Error("aborted")),{once:true}));
  }});
  let settled=false;void f.adapter.generate("input",f.budget).then(()=>{settled=true;},()=>{settled=true;});
  await setImmediate();assert.equal(invoked,true);f.abort.abort();await setImmediate();
  assert.equal(f.adapter.state,"termination_unconfirmed");assert.equal(settled,false);
});
test("late confirmed done releases only remote invocation while withholding all original response bytes",async()=>{
  let release!:(value:Response)=>void;const f=fixture({reply:async path=>{
    if(path!=="/api/generate")return Response.json(path==="/api/version"?{version:binding.ollamaVersion}:{models:[model]});
    return new Promise(resolve=>{release=resolve;});
  }});
  const outcome=f.adapter.generate("input",f.budget);await setImmediate();f.abort.abort();
  release(Response.json({model:reference,done:true,response:raw,prompt_eval_count:12,eval_count:20}));
  await assert.rejects(outcome,/AI_UNAVAILABLE/);assert.equal(f.adapter.state,"stopped");
});

test("a successful startup observation is not residency: cold idle is rejected before compilation or generation POST",async()=>{
  let loaded=true,compiles=0;
  const f=fixture({compile:async(input,budget)=>{compiles++;return compiler.compile(input,budget);},
    reply:async path=>Response.json(path==="/api/version"?{version:binding.ollamaVersion}:
      {models:path==="/api/ps"&&!loaded?[]:[model]})});
  await f.adapter.preflight(f.budget);assert.equal(f.adapter.state,"ready");
  loaded=false; // External idle-unload observation, not an adapter action.
  assert.equal(f.adapter.state,"ready"); // Cached lifecycle state cannot observe idle host changes.
  await assert.rejects(f.adapter.generate("input",f.budget),/AI_UNAVAILABLE/);
  assert.equal(f.adapter.state,"not_checked");assert.equal(compiles,0);
  assert.deepEqual(f.calls.map(c=>c.path),["/api/version","/api/tags","/api/ps","/api/version","/api/tags","/api/ps"]);
  assert(f.calls.every(c=>c.init?.method==="GET"&&c.init.cache==="no-store"));
});

test("external residency restoration reuses the same adapter without automatic generation and does not reserve future readiness",async()=>{
  let loaded=false;
  const f=fixture({reply:async path=>Response.json(path==="/api/version"?{version:binding.ollamaVersion}:path==="/api/generate"?
    {model:reference,response:raw,done:true,prompt_eval_count:12,eval_count:20}:
    {models:path==="/api/ps"&&!loaded?[]:[model]})});
  await assert.rejects(f.adapter.generate("cold",f.budget),/AI_UNAVAILABLE/);
  assert.equal(f.calls.some(c=>c.init?.method==="POST"),false);
  loaded=true; // Explicit fixture restoration models LI's separately attributed manual recovery.
  await f.adapter.preflight(f.budget);assert.equal(f.adapter.state,"ready");
  assert.equal(f.calls.some(c=>c.init?.method==="POST"),false);
  assert.equal(new TextDecoder().decode(await f.adapter.generate("explicit user request",f.budget)),raw);
  assert.equal(f.adapter.state,"stopped");
  loaded=false;
  await assert.rejects(f.adapter.generate("later cold request",f.budget),/AI_UNAVAILABLE/);
  assert.equal(f.adapter.state,"not_checked");
  const posts=f.calls.filter(c=>c.init?.method==="POST");assert.equal(posts.length,1);
  assert.equal(posts[0]!.path,"/api/generate");
  assert.deepEqual(JSON.parse(posts[0]!.init!.body as string).options,{num_ctx:8192,num_predict:512});
  assert.equal("keep_alive" in JSON.parse(posts[0]!.init!.body as string),false);
});
