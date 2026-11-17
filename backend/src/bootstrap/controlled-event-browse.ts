import { ControlledSourceProjection } from "../event-browse/infrastructure/controlled-source-projection.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";

/** Private process capability, never an HTTP/phone/config enable flag. An explicitly selected bounded
 * process cache is cleared on disable. Disabling invalidates pending results, not bytes already
 * delivered to a client; client removal remains a separate operator obligation. */
export function createControlledEventBrowse(options: {
  readonly source?: BrowseSource;
  readonly projectionCache?: true;
  readonly running: () => boolean;
  readonly track: <T>(work: () => Promise<T>) => Promise<T>;
  /** Testable process-owned timer; scheduling never enables the source. */
  readonly warmSchedule?: (milliseconds:number,tick:()=>void)=>()=>void;
}) {
  const projection = options.source && options.projectionCache ? new ControlledSourceProjection(options.source) : undefined;
  const selected = projection ?? options.source;
  let enabled = false, epoch = {};
  const pending = new Set<AbortController>();
  let cancelWarmTimer:(()=>void)|undefined,warming:Promise<void>|undefined,warmStarted=false;
  function startWarmup() {
    if(!enabled||!options.running())throw unavailable();
    if(warmStarted||!options.source?.warm)return;
    warmStarted=true;
    const admitted=epoch;
    const current=()=>warmStarted&&enabled&&options.running()&&admitted===epoch;
    const schedule=options.warmSchedule??((milliseconds:number,tick:()=>void)=>{
      const timer=setTimeout(tick,milliseconds);timer.unref();return ()=>clearTimeout(timer);
    });
    const arm=()=>{
      if(!current()||cancelWarmTimer)return;
      const delay=options.source?.warmDelay?.()??300000;
      if(!Number.isFinite(delay)||delay<0)return; // Invalid scheduling metadata cannot dispatch work.
      cancelWarmTimer=schedule(delay,()=>{cancelWarmTimer=undefined;tick();});
    };
    const tick=()=>{
      if(!current())return;
      // Retain the original acquisition's cleanup fence. Once it settles, its
      // finalizer schedules from the shared admission clock, not completion.
      if(warming){
        // A re-enabled epoch can be waiting on the prior epoch's aborted work.
        // Its own wake-up survives the old epoch's finalizer, without polling.
        void warming.then(arm);
        return;
      }
      const work=read(new AbortController().signal,(_value,signal)=>options.source!.warm!(signal)).catch(()=>{});
      warming=work;
      arm(); // warm() synchronously admits/joins before its first await.
      void work.finally(()=>{if(warming===work)warming=undefined;arm();});
    };
    tick();
  }
  const unavailable = () => new Error("CONTROLLED_EVENT_BROWSE_UNAVAILABLE");
  function disable() {
    enabled = false; epoch = {}; projection?.clear();
    warmStarted=false;cancelWarmTimer?.();cancelWarmTimer=undefined;
    for (const controller of pending) controller.abort();
    // Aborted I/O remains tracked until its original promise actually settles.
  }
  function enable() {
    if (!options.source || !options.running()) throw unavailable();
    enabled = true;
  }
  async function read<T>(signal: AbortSignal, work: (source: BrowseSource, signal: AbortSignal) => Promise<T>): Promise<T> {
    if (!enabled || !options.running() || !options.source || signal.aborted) throw unavailable();
    const admitted = epoch, controller = new AbortController();
    const combined = AbortSignal.any([signal, controller.signal]);
    pending.add(controller);
    try {
      return await options.track(async () => {
        const result = await work(selected!, combined);
        if (!enabled || !options.running() || admitted !== epoch || combined.aborted) throw unavailable();
        return result;
      });
    } finally { pending.delete(controller); }
  }
  const source: BrowseSource = {
    ...(options.source?.status?{status:()=>options.source!.status!()}:{}),
    ...(projection ? {recommendationSnapshot: (asOf:string,signal:AbortSignal)=>read(signal,async(value,current)=>{
      const snapshot=await value.recommendationSnapshot!(asOf,current),admitted=epoch;
      return {items:snapshot.items,...(snapshot.sourceStatus===undefined?{}:{sourceStatus:snapshot.sourceStatus}),
        ...(snapshot.sourceCoverage===undefined?{}:{sourceCoverage:snapshot.sourceCoverage}),
        current:()=>enabled&&options.running()&&admitted===epoch&&snapshot.current()};
    })} : {}),
    ...(options.source?.event?{event:(id:string,asOf:string,signal:AbortSignal)=>read(signal,(value,current)=>value.event!(id,asOf,current))}:{}),
    ...(options.source?.batch?{batch:(asOf:string,page:number,signal:AbortSignal)=>read(signal,(value,current)=>value.batch!(asOf,page,current))}:{}),
    ...(options.source?.availableEvent?{availableEvent:(id:string,asOf:string,signal:AbortSignal)=>read(signal,(value,current)=>value.availableEvent!(id,asOf,current))}:{}),
    firstBatch: (asOf, signal) => read(signal, (value, current) => value.firstBatch(asOf, current)),
    detail: (id, asOf, signal) => read(signal, (value, current) => value.detail(id, asOf, current)),
  };
  return { source, enable, disable, startWarmup, warmupSettled:()=>warming??Promise.resolve(),
    projectionReady: (asOf: string) => enabled && options.running() && projection?.ready(asOf) === true,
    peek: (id: string, asOf: string) => enabled && options.running() ? projection?.peek(id, asOf) : undefined,
    observation: () => ({ configured: options.source !== undefined, enabled: enabled && options.running(), pending: pending.size }),
  };
}
