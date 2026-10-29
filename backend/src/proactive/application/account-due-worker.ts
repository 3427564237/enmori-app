import type { FirstFlowApplication } from "./first-flow-application.js";
import type { ProactiveActor } from "../ports/first-flow.js";
import type { ProactiveAccountRoster } from "../ports/account-roster.js";

/** Rotating bounded pages give every registered owner the same eligibility.
 * Serial work shares the application's/model's physical-settlement fence. */
export class AccountFirstFlowDueWorker {
  private timer:ReturnType<typeof setInterval>|undefined;
  private pending:Promise<void>|undefined;
  private readonly abort=new AbortController();
  private after:string|undefined;
  constructor(private readonly options:{application:FirstFlowApplication;roster:ProactiveAccountRoster;
    actor:(uid:string)=>ProactiveActor;current:()=>boolean;intervalMs?:number;nowMs?:()=>number}) {
    const interval=options.intervalMs??60000;
    if(!Number.isSafeInteger(interval)||interval<1000||interval>2147483647)throw Error("Invalid worker interval");
  }
  get running(){return !!this.timer&&!this.abort.signal.aborted;}
  private current(){try{return !this.abort.signal.aborted&&this.options.current();}catch{return false;}}
  start(){if(this.timer||this.abort.signal.aborted)return;this.timer=setInterval(()=>{void this.tick();},this.options.intervalMs??60000);this.timer.unref();void this.tick();}
  tick():Promise<void>{
    if(!this.current())return this.pending??Promise.resolve();
    if(this.pending)return this.pending;
    this.pending=this.cycle().catch(()=>{/* Retry metadata next cycle, never replay effects. */}).finally(()=>{this.pending=undefined;});
    return this.pending;
  }
  private async cycle(){
    const page=await this.options.roster.page(this.after);if(!this.current())return;
    // Commit cursor before processing so one unavailable owner cannot starve later pages.
    this.after=page.next;
    for(const uid of page.actors){
      if(!this.current())return;
      const original=this.options.actor(uid);
      const actor:ProactiveActor={principal:original.principal,verifyCurrentAuth:()=>original.verifyCurrentAuth(),current:()=>this.current()&&original.current()};
      // No work from this process can be in flight here: cycle is serial and
      // application recovery refuses while its physical generation is running.
      const recovered=await this.options.application.recover(actor);
      if(!this.current())return;if(recovered.kind!=="ok")continue;
      const active=await this.options.application.activeIntents(actor);
      if(!this.current())return;if(active.kind!=="ok"||active.value.length>3)continue;
      for(const intent of active.value){
        if(!this.current())return;
        if(intent.state==="queued"&&Date.parse(intent.dueAt)<=(this.options.nowMs??Date.now)()||intent.state==="published"&&intent.dispatchState==="not_started")
          await this.options.application.runIntent(actor,intent.intentId,this.abort.signal);
      }
    }
  }
  async stop(){this.abort.abort();if(this.timer)clearInterval(this.timer);this.timer=undefined;await this.pending;}
}
