import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';
import { parseServiceOwnership, SERVICE_OWNER_LOCAL_MS, SERVICE_OWNER_RESPONSE_MS, SERVICE_OWNER_STARTUP_MS,
  serviceOwnerUuid } from '../domain/service-owner.js';
import type { RuntimeClock } from '../ports/runtime-clock.js';
import type { ServiceOwnerAuthority, ServiceOwnerLease, ServiceOwnerResult, ServiceOwnershipConfiguration } from '../ports/service-owner.js';

/** One process, one acquisition, and no revival after an unknown mutation or lost capability. */
export class RenewableServiceOwner {
  private readonly config:ServiceOwnershipConfiguration;
  private phase:'idle'|'starting'|'active'|'unavailable'|'lost'|'stopped'='idle';
  private startPromise:Promise<RuntimeEpoch|undefined>|undefined;
  private lease:ServiceOwnerLease|undefined;
  private deadline=0;
  private lastNow=0;
  private readonly abort=new AbortController();
  private cancelRenew:(()=>void)|undefined;
  private cancelExpiry:(()=>void)|undefined;
  private renewPending=false;
  private resolveLost!:()=>void;
  readonly whenLost=new Promise<void>(resolve=>{this.resolveLost=resolve;});
  constructor(private readonly authority:ServiceOwnerAuthority,private readonly clock:RuntimeClock,
    configuration:ServiceOwnershipConfiguration,private readonly processEpoch:string){
    const parsed=parseServiceOwnership(configuration);if(!parsed||!serviceOwnerUuid(processEpoch))throw Error('INVALID_SERVICE_OWNERSHIP');this.config=parsed;
  }
  get lost(){return this.phase==='lost';}
  private retire(lost=this.phase==='active'){
    if(['lost','stopped','unavailable'].includes(this.phase))return;
    this.phase=lost?'lost':'unavailable';this.cancelRenew?.();this.cancelExpiry?.();this.abort.abort();
    if(lost)this.resolveLost();
  }
  stop(){if(this.phase==='stopped')return;const wasLost=this.lost;
    this.cancelRenew?.();this.cancelExpiry?.();this.abort.abort();if(!wasLost)this.phase='stopped';}
  private now():number|undefined{
    try{const value=this.clock.now();if(!Number.isFinite(value)||value<this.lastNow||value>Number.MAX_SAFE_INTEGER-SERVICE_OWNER_STARTUP_MS)throw Error();
      this.lastNow=value;return value;}catch{this.retire();return undefined;}
  }
  current(epoch?:RuntimeEpoch):boolean{
    if(this.phase!=='active'||!this.lease||this.abort.signal.aborted)return false;
    const now=this.now();if(now===undefined)return false;
    if(now>=this.deadline||epoch&&(epoch.processEpoch!==this.lease.processEpoch||epoch.generation!==this.lease.generation)){
      this.retire();return false;
    }
    return this.lease.serviceKey===this.config.serviceKey;
  }
  start():Promise<RuntimeEpoch|undefined>{
    if(this.startPromise)return this.startPromise;
    if(this.phase!=='idle')return Promise.resolve(undefined);
    this.phase='starting';this.startPromise=this.acquire().catch(()=>{this.retire(false);return undefined;});return this.startPromise;
  }
  private wait(until:number):Promise<void>{
    return new Promise(resolve=>{
      let cancel=()=>{};const finish=()=>{cancel();this.abort.signal.removeEventListener('abort',finish);resolve();};
      cancel=this.clock.at(until,finish);this.abort.signal.addEventListener('abort',finish,{once:true});
      if(this.abort.signal.aborted)finish();
    });
  }
  private async response(submitted:number,invoke:(live:()=>boolean)=>Promise<ServiceOwnerResult>,live:()=>boolean):Promise<ServiceOwnerResult>{
    const end=submitted+SERVICE_OWNER_RESPONSE_MS;
    const current=()=>{const now=this.now();return now!==undefined&&now<end&&!this.abort.signal.aborted&&live();};
    if(!current())return {kind:'unknown'};
    return new Promise(resolve=>{
      let settled=false,cancel=()=>{};
      const finish=(result:ServiceOwnerResult)=>{if(settled)return;settled=true;cancel();this.abort.signal.removeEventListener('abort',aborted);resolve(result);};
      const aborted=()=>finish({kind:'unknown'});
      cancel=this.clock.at(end,aborted);this.abort.signal.addEventListener('abort',aborted,{once:true});
      // A local timeout/abort is never cancellation of this original durable transaction.
      Promise.resolve().then(()=>current()?invoke(current):{kind:'unknown'} as const)
        .then(result=>finish(current()?result:{kind:'unknown'}),()=>finish({kind:'unknown'}));
    });
  }
  private install(lease:ServiceOwnerLease,submitted:number):boolean{
    const now=this.now();
    if(now===undefined||this.abort.signal.aborted||now>=submitted+SERVICE_OWNER_RESPONSE_MS||this.phase==='active'&&now>=this.deadline||
      lease.serviceKey!==this.config.serviceKey||lease.processEpoch!==this.processEpoch||
      !Number.isSafeInteger(lease.generation)||lease.generation<1||!Number.isSafeInteger(lease.leaseVersion)||lease.leaseVersion<1||
      !Number.isSafeInteger(lease.renewedAtMs)||lease.renewedAtMs<1||lease.leaseUntilMs-lease.renewedAtMs!==120000)return false;
    this.lease=Object.freeze({...lease});this.deadline=submitted+SERVICE_OWNER_LOCAL_MS;this.phase='active';
    this.cancelRenew?.();this.cancelExpiry?.();
    this.cancelExpiry=this.clock.at(this.deadline,()=>{this.current();});
    this.cancelRenew=this.clock.at(submitted+this.config.renewEveryMs,()=>{void this.renew().catch(()=>this.retire());});
    return true;
  }
  private async acquire():Promise<RuntimeEpoch|undefined>{
    const began=this.now();if(began===undefined)return undefined;const limit=began+SERVICE_OWNER_STARTUP_MS;
    while(this.phase==='starting'){
      const submitted=this.now();if(submitted===undefined||submitted>=limit)break;
      const result=await this.response(submitted,live=>this.authority.acquire(this.processEpoch,live),()=>this.phase==='starting');
      const now=this.now();if(now===undefined||this.phase!=='starting'||now>=limit)break;
      if(result.kind==='confirmed'){
        if(this.install(result.lease,submitted))return Object.freeze({processEpoch:result.lease.processEpoch,generation:result.lease.generation});
        break;
      }
      if(result.kind!=='occupied'||!Number.isSafeInteger(result.remainingMs)||result.remainingMs<=0||result.remainingMs>120000)break;
      // Only a definite NO-WRITE occupied observation permits another fresh attempt.
      await this.wait(Math.min(limit,now+Math.min(this.config.renewEveryMs,result.remainingMs)));
    }
    this.retire(false);return undefined;
  }
  private async renew():Promise<void>{
    if(this.renewPending||!this.current())return;
    this.renewPending=true;const original=this.lease!,submitted=this.now();
    try{
      if(submitted===undefined)return;
      const result=await this.response(submitted,live=>this.authority.renew(original,live),()=>this.current()&&this.lease===original);
      // No successful or late callback can adopt a changed owner or revive an expired capability.
      if(!this.current()||this.lease!==original)return;
      if(result.kind!=='confirmed'||result.lease.generation!==original.generation||
        result.lease.leaseVersion!==original.leaseVersion+1||!this.install(result.lease,submitted))this.retire();
    }finally{this.renewPending=false;}
  }
}
