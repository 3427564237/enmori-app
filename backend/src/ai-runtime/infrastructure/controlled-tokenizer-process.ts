import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import type { RequestBudget } from "../ports/generation-transport.js";
import type { MatchingPromptCounter } from "./controlled-conversation-prompt.js";

export interface ControlledTokenizerFiles {
  readonly pythonExecutable:string;readonly pythonSha256:string;
  readonly helperPath:string;readonly helperSha256:string;
  readonly tokenizerPath:string;readonly tokenizerSha256:string;
  readonly manifestDigest:string;
  /** Actual LI0.23.3 environment, no install/dependency selection by this tool. */
  readonly tokenizersVersion:"0.23.3";
  current():boolean;
}
const unavailable=()=>new Error("AI_UNAVAILABLE");
const hash=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
/** Existing isolated host Python/tokenizer only. Text goes through stdin; stdout
 * contains one integer count. No shell, network, content argv/env/file or logs. */
export class ControlledTokenizerProcess implements MatchingPromptCounter {
  readonly manifestDigest:string;readonly tokenizerDigest:string;
  constructor(private readonly files:ControlledTokenizerFiles){
    for(const p of [files.pythonExecutable,files.helperPath,files.tokenizerPath])if(!isAbsolute(p))throw unavailable();
    for(const d of [files.pythonSha256,files.helperSha256,files.tokenizerSha256,files.manifestDigest])if(!/^[0-9a-f]{64}$/.test(d))throw unavailable();
    if(files.tokenizersVersion!=="0.23.3")throw unavailable();
    this.manifestDigest=files.manifestDigest;this.tokenizerDigest=files.tokenizerSha256;
  }
  current(){try{return this.files.current()===true;}catch{return false;}}
  private live(b:RequestBudget){return this.current()&&!b.signal.aborted&&Number.isFinite(b.remainingMs())&&b.remainingMs()>0;}
  count(raw:string,budget:RequestBudget):Promise<number>{
    if(!this.live(budget)||!raw.isWellFormed())return Promise.reject(unavailable());
    return this.measure({raw},budget);
  }
  private async measure(holder:{raw:string|undefined},budget:RequestBudget):Promise<number>{
    const dispose=()=>{holder.raw=undefined;};budget.signal.addEventListener("abort",dispose,{once:true});
    try{
    // Verify the executable/helper for EACH invocation; the helper independently
    // verifies the loaded tokenizer bytes and installed library version.
    for(const [path,expected] of [[this.files.pythonExecutable,this.files.pythonSha256],[this.files.helperPath,this.files.helperSha256]] as const){
      if(hash(await readFile(path))!==expected||!this.live(budget))throw unavailable();
    }
    return await new Promise<number>((resolve,reject)=>{
      let output="",stderrBytes=0,failed=false,settled=false;
      const child=spawn(this.files.pythonExecutable,["-I",this.files.helperPath,this.files.tokenizerPath,this.files.tokenizerSha256,this.files.tokenizersVersion],
        {shell:false,windowsHide:true,stdio:["pipe","pipe","pipe"]});
      const abort=()=>{failed=true;child.stdin.destroy();child.kill();};
      const timer=setTimeout(abort,Math.max(1,Math.ceil(budget.remainingMs())));
      budget.signal.addEventListener("abort",abort,{once:true});
      const done=(code:number|null)=>{
        if(settled)return;settled=true;clearTimeout(timer);budget.signal.removeEventListener("abort",abort);child.stdin.destroy();
        const count=/^[1-9][0-9]*\n?$/.test(output)?Number(output.trim()):NaN;output="";
        if(failed||code!==0||stderrBytes!==0||!this.live(budget)||!Number.isSafeInteger(count)||count<1)reject(unavailable());else resolve(count);
      };
      child.stdout.setEncoding("utf8");child.stdout.on("data",(chunk:string)=>{output+=chunk;if(output.length>24)abort();});
      child.stderr.on("data",(chunk:Buffer)=>{stderrBytes+=chunk.length;abort();});
      child.stdin.on("error",()=>{failed=true;child.kill();});
      child.once("error",()=>{failed=true;done(null);});child.once("close",done);
      if(!this.live(budget)||holder.raw===undefined)abort();else {child.stdin.end(holder.raw,"utf8");dispose();}
      // Failure/abort resolves only when the owned child has actually closed.
    });
    }finally{dispose();budget.signal.removeEventListener("abort",dispose);}
  }
}
