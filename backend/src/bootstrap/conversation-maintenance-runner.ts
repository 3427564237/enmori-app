import type { ConversationMaintenance, MaintenanceResult } from "../ai-conversation/ports/conversation-maintenance.js";
import type { RuntimeEpoch } from "../ai-conversation/ports/real-conversation-store.js";

export interface MaintenanceSchedule { every(milliseconds:number,tick:()=>void):()=>void; }
const schedule:MaintenanceSchedule={every:(milliseconds,tick)=>{const timer=setInterval(tick,milliseconds);timer.unref();return ()=>clearInterval(timer);}};
const failed:MaintenanceResult=Object.freeze({complete:false,inspected:0,changed:0,failures:1,expiredOrInvalidCheckpoint:false});

/** Owned by the existing isolated Backend lifecycle, never a second service.
 * Construct only AFTER a confirmed current epoch and before accepting AI work.
 * Startup/hourly execution does not by itself prove the original 24h SLA.
 */
export function startConversationMaintenance(maintenance:ConversationMaintenance,epoch:RuntimeEpoch,
  report:(phase:"expiry"|"source",result:MaintenanceResult)=>void,timers:MaintenanceSchedule=schedule){
  let stopped=false,pending:Promise<void>|undefined;
  const emit=(phase:"expiry"|"source",result:MaintenanceResult)=>{
    // No raw errors, paths, IDs, credentials, or content cross this boundary.
    const sanitized={complete:result.complete,inspected:result.inspected,changed:result.changed,
      failures:result.failures,expiredOrInvalidCheckpoint:result.expiredOrInvalidCheckpoint};
    try{report(phase,sanitized);}catch{/* Reporting failure cannot release content or abort teardown. */}
  };
  const cycle=async()=>{
    for(const phase of ["expiry","source"] as const){
      if(stopped)return;
      try{emit(phase,await (phase==="expiry"?maintenance.expirySweep(epoch):maintenance.sourceSweep(epoch)));}
      catch{emit(phase,failed);}
    }
  };
  const tick=()=>{
    if(stopped||pending)return;
    pending=cycle().finally(()=>{pending=undefined;});
  };
  const cancelTimer=timers.every(60*60*1000,tick);
  tick();
  return {settled:()=>pending??Promise.resolve(),stop:async()=>{stopped=true;cancelTimer();await pending;}};
}
