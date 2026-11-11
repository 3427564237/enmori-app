import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { RuntimeClock } from '../ports/runtime-clock.js';

interface ClockObservation { readonly elapsed:number;readonly monotonic:number;readonly wall:number }
/** Linux /proc/uptime includes suspend. No local wall value proves a remote lease expired. */
export function linuxUptimeMilliseconds(text:string):number {
  const match=/^([0-9]+)\.([0-9]{1,9}) [0-9]+\.[0-9]{1,9}\n?$/.exec(text);
  if(!match||text.length>256)throw Error('OWNERSHIP_CLOCK_INVALID');
  const ms=BigInt(match[1]!)*1000n+BigInt(match[2]!.padEnd(3,'0').slice(0,3));
  if(ms>BigInt(Number.MAX_SAFE_INTEGER))throw Error('OWNERSHIP_CLOCK_INVALID');return Number(ms);
}
export class SuspendInclusiveRuntimeClock implements RuntimeClock {
  private initial:ClockObservation|undefined;
  private last:ClockObservation|undefined;
  private elapsed=0;
  private retired=false;
  constructor(private readonly observe:()=>ClockObservation=()=>{
    if(process.platform!=='linux')throw Error('OWNERSHIP_CLOCK_UNSUPPORTED');
    return {elapsed:linuxUptimeMilliseconds(readFileSync('/proc/uptime','utf8')),monotonic:performance.now(),wall:Date.now()};
  }){}
  now():number {
    if(this.retired)throw Error('OWNERSHIP_CLOCK_RETIRED');
    try{
      const value=this.observe();
      if(![value.elapsed,value.monotonic,value.wall].every(v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER))throw Error();
      if(!this.initial){this.initial={...value};this.last={...value};return 0;}
      const first=this.initial,last=this.last!;
      if(value.elapsed<last.elapsed||value.monotonic<last.monotonic||value.wall<last.wall||
        Math.abs((value.wall-first.wall)-(value.monotonic-first.monotonic))>1000)throw Error();
      const elapsed=Math.max(value.elapsed-first.elapsed,value.monotonic-first.monotonic,value.wall-first.wall);
      if(elapsed<this.elapsed)throw Error();this.elapsed=elapsed;this.last={...value};return elapsed;
    }catch{this.retired=true;throw Error('OWNERSHIP_CLOCK_INVALID');}
  }
  at(instant:number,wake:()=>void):()=>void {
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const check=()=>{if(cancelled)return;let remaining:number;
      try{remaining=instant-this.now();}catch{wake();return;}
      if(remaining>0)timer=setTimeout(check,Math.ceil(remaining));else wake();};
    let delay=0;try{delay=Math.max(0,Math.ceil(instant-this.now()));}catch{}
    timer=setTimeout(check,delay);return()=>{cancelled=true;clearTimeout(timer);};
  }
}
