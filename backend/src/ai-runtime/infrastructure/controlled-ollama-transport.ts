import type { GenerationTransport, RequestBudget } from "../ports/generation-transport.js";

export interface ControlledOllamaBinding {
  readonly endpoint:string;readonly reference:string;readonly manifestDigest:string;readonly tokenizerDigest:string;
  readonly ollamaVersion:string;readonly mode:"formal-9b"|"manual-development-4b";
  /** Supplied by the controlled-host handoff, never by Flutter/request JSON.
   * Includes no concurrent tag replacement, tools/network/model-memory access,
   * verified provisioned model size/family and matching tokenizer/template. */
  current():boolean;
}
export interface CompletePromptCompiler<Input> {
  /** Existing provisioned matching tokenizer measures the COMPLETE raw model
   * input incl. Backend/schema/Persona/Note/current-input/framing tokens. No
   * truncation, fallback tokenizer, prompt cache or second-model validator. */
  compile(input:Input,budget:RequestBudget):Promise<{
    readonly rawPrompt:string;readonly tokens:number;readonly manifestDigest:string;
    readonly tokenizerDigest:string;readonly includesAllFraming:true;
  }>;
}
const unavailable=()=>new Error("AI_UNAVAILABLE");
const digest=(v:string)=>/^[0-9a-f]{64}$/.test(v);
function privateOrigin(value:string):string{
  const url=new URL(value);
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=="/")throw unavailable();
  const h=url.hostname;
  const parts=h.split(".").map(Number),ipv4=parts.length===4&&parts.every((p,i)=>Number.isInteger(p)&&p>=0&&p<=255&&String(p)===h.split(".")[i]);
  const allowed=ipv4&&(parts[0]===127||parts[0]===10||(parts[0]===172&&parts[1]!>=16&&parts[1]!<=31)||(parts[0]===192&&parts[1]===168));
  // Only already-controlled private/loopback literal endpoints are supported.
  // No DNS lookup, redirect, public fallback or new exposure is performed.
  if(!allowed&&h!=="[::1]"&&!/^\[f[cd][0-9a-f]{2}:/i.test(h))throw unavailable();
  return url.origin;
}
function record(v:unknown):v is Record<string,unknown>{return typeof v==="object"&&v!==null&&!Array.isArray(v);}
/** Vendor envelope parser rejects duplicate keys before ordinary materialization.
 * Raw MODEL JSON remains untouched for the existing Q31 parser/gates. */
function envelope(text:string):unknown{
  let at=0;
  const ws=()=>{while(/[\x20\t\r\n]/.test(text[at]??"!"))at++;};
  const string=():string=>{ws();const start=at;if(text[at++]!=='"')throw unavailable();
    while(at<text.length){const c=text[at++];if(c==="\\"){at++;continue;}if(c==='"'){const s:unknown=JSON.parse(text.slice(start,at));if(typeof s!=="string"||!s.isWellFormed())throw unavailable();return s;}}throw unavailable();};
  const value=(depth:number):void=>{
    if(depth>20)throw unavailable();ws();const c=text[at];
    if(c==='"'){string();return;}
    if(c==="{"||c==="["){
      at++;ws();const end=c==="{"?"}":"]",keys=new Set<string>();
      if(text[at]===end){at++;return;}
      for(;;){if(c==="{"){const key=string();if(keys.has(key))throw unavailable();keys.add(key);ws();if(text[at++]!==":")throw unavailable();}
        value(depth+1);ws();if(text[at]===end){at++;return;}if(text[at++]!==",")throw unavailable();}
    }
    const primitive=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));
    if(!primitive)throw unavailable();at+=primitive[0].length;
  };
  value(0);ws();if(at!==text.length)throw unavailable();return JSON.parse(text) as unknown;
}
async function boundedEnvelope(response:Response):Promise<unknown>{
  if(!response.ok||!response.body)throw unavailable();
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;
    if(length>1024*1024)throw unavailable();chunks.push(next.value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return envelope(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();chunks.length=0;}
}

/** D1-A implementation only: NOT ordinary wiring or an actual-host readiness
 * claim. Official protocol: docs.ollama.com/api/{generate,tags,ps}. */
export class ControlledOllamaTransport<Input> implements GenerationTransport<Input>{
  private readonly origin:string;private invoked=false;
  private stateValue:"not_checked"|"ready"|"invoked"|"stopped"|"termination_unconfirmed"="not_checked";
  constructor(private readonly binding:ControlledOllamaBinding,private readonly compiler:CompletePromptCompiler<Input>,
    private readonly http:typeof fetch=fetch){
    this.origin=privateOrigin(binding.endpoint);
    if(!binding.reference||/\s/.test(binding.reference)||!digest(binding.manifestDigest)||!digest(binding.tokenizerDigest)||
      !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(binding.ollamaVersion)||
      !["formal-9b","manual-development-4b"].includes(binding.mode)||typeof binding.current!=="function")throw unavailable();
  }
  get state(){return this.stateValue;}
  private live(budget:RequestBudget):boolean{
    try{return !budget.signal.aborted&&Number.isFinite(budget.remainingMs())&&budget.remainingMs()>0&&this.binding.current();}catch{return false;}
  }
  async preflight(budget:RequestBudget):Promise<void>{
    if(!this.live(budget)||this.invoked)throw unavailable();
    const read=async(path:string)=>{
      if(!this.live(budget))throw unavailable();
      const response=await this.http(`${this.origin}${path}`,{method:"GET",redirect:"error",signal:budget.signal,cache:"no-store"});
      const result=await boundedEnvelope(response);if(!this.live(budget))throw unavailable();return result;
    };
    try{
      const version=await read("/api/version");if(!record(version)||version.version!==this.binding.ollamaVersion)throw unavailable();
      for(const path of ["/api/tags","/api/ps"]){
        const result=await read(path);if(!record(result)||!Array.isArray(result.models))throw unavailable();
        const matching=result.models.filter(m=>record(m)&&(m.name===this.binding.reference||m.model===this.binding.reference));
        if(matching.length!==1)throw unavailable();const model=matching[0] as Record<string,unknown>;
        if(model.digest!==this.binding.manifestDigest||!record(model.details))throw unavailable();
        const sizeText=typeof model.details.parameter_size==="string"?/^(\d+(?:\.\d+)?)B$/.exec(model.details.parameter_size):null;
        const size=sizeText?Number(sizeText[1]):NaN;
        if(typeof model.details.family!=="string"||!model.details.family.toLowerCase().startsWith("qwen")||
          (this.binding.mode==="formal-9b"?size<8||size>=10:size<3||size>=5)||!Number.isFinite(size))throw unavailable();
        if(path==="/api/ps"&&model.context_length!==8192)throw unavailable();
      }
      this.stateValue="ready";
    }catch{this.stateValue="not_checked";throw unavailable();}
  }
  async generate(input:Input,budget:RequestBudget):Promise<Uint8Array>{
    await this.preflight(budget);
    let compiled:Awaited<ReturnType<CompletePromptCompiler<Input>["compile"]>>|undefined;
    try{compiled=await this.compiler.compile(input,budget);}catch{throw unavailable();}
    if(!this.live(budget)||compiled.manifestDigest!==this.binding.manifestDigest||compiled.tokenizerDigest!==this.binding.tokenizerDigest||
      compiled.includesAllFraming!==true||!Number.isSafeInteger(compiled.tokens)||compiled.tokens<1||compiled.tokens>4096||
      typeof compiled.rawPrompt!=="string"||!compiled.rawPrompt.isWellFormed()||!compiled.rawPrompt)throw unavailable();
    if(this.invoked)throw unavailable();
    const expectedTokens=compiled.tokens;
    let body:string|undefined=JSON.stringify({model:this.binding.reference,prompt:compiled.rawPrompt,raw:true,stream:false,
      // The bounded attribution slice needs repeatable decoding, not creative sampling.
      // Gates still decide acceptance; these parameters never guarantee safety.
      format:"json",options:{num_ctx:8192,num_predict:512,temperature:0,seed:42}});
    compiled=undefined;
    // No await between the original guard, host lease and actual SDK dispatch.
    if(!this.live(budget)){body=undefined;throw unavailable();}
    this.invoked=true;this.stateValue="invoked";
    let stopped=false;
    try{
      const response=await this.http(`${this.origin}/api/generate`,{method:"POST",headers:{"content-type":"application/json"},body,
        signal:budget.signal,redirect:"error",cache:"no-store"});body=undefined;
      const value=await boundedEnvelope(response);
      if(!record(value)||value.model!==this.binding.reference||value.done!==true)throw unavailable();
      stopped=true;this.stateValue="stopped";this.invoked=false;
      if(!this.live(budget)||typeof value.response!=="string"||!value.response.isWellFormed()||
        value.prompt_eval_count!==expectedTokens||!Number.isSafeInteger(value.eval_count)||
        (value.eval_count as number)<0||(value.eval_count as number)>512)throw unavailable();
      return new TextEncoder().encode(value.response);
    }catch{
      body=undefined;compiled=undefined;
      if(stopped)throw unavailable();
      // Neither socket close, HTTP error, abort nor malformed/partial done is
      // evidence that the remote generation stopped. Never free its lane here.
      // The unresolved promise owns no response/content cache or replay handle.
      this.stateValue="termination_unconfirmed";
      return new Promise<Uint8Array>(()=>{});
    }
  }
}
