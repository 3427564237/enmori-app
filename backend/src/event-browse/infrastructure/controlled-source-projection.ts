import type { BrowseOccurrence, BrowseSource } from "../ports/event-browse.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { parseBrowseInstant } from "../domain/browse-values.js";
import { sourceEventId } from '../domain/source-event-id.js';
import { Temporal } from '@js-temporal/polyfill';
const cacheWindow = 300_000_000_000n;
type SourceSnapshot = { at: bigint; from?: bigint; items: readonly BrowseOccurrence[]; candidates?: readonly BrowseOccurrence[] };
// Coverage can precede freshness for out-of-order concurrent request instants.
// Every consumer still applies its own exact future-time filter.
const covers = (snapshot: SourceSnapshot, now: bigint) =>
  now >= (snapshot.from ?? snapshot.at) && now - snapshot.at < cacheWindow;

/** A waiter owns its deadline, not the shared work it joins. Always observe
 * the underlying promise, even when a source ignores cancellation. */
function withinBudget<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(dependencyUnavailable);
    };
    signal.addEventListener("abort", abort, { once: true });
    work.then(value => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(dependencyUnavailable);
      else resolve(value);
    }, error => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
    if (signal.aborted) abort();
  });
}

/** One process-owned source generation, shared by browse, recommendation and
 * detail. No persistence, title merging, retry, or stale-on-error fallback. */
export class ControlledSourceProjection implements BrowseSource {
  private snapshot: SourceSnapshot | undefined;
  private pending: Promise<readonly BrowseOccurrence[]> | undefined;
  private epoch = {};
  // Current pages are shared with source-authorized social reads. Ranking uses
  // the separately completed snapshot.candidates, never a partial page prefix.
  private readonly observedPages = new Map<number, readonly BrowseOccurrence[]>();
  private readonly pageReads = new Map<number, object>();
  readonly batch?:NonNullable<BrowseSource['batch']>;
  readonly availableEvent?:NonNullable<BrowseSource['availableEvent']>;
  readonly event?:NonNullable<BrowseSource['event']>;
  constructor(private readonly source: BrowseSource) {
    if(source.batch)this.batch=async(asOf,page,signal)=>{
      const now=parseBrowseInstant(asOf);
      if(now===undefined||signal.aborted||!Number.isSafeInteger(page)||page<0||page>49)throw dependencyUnavailable;
      if(page!==0){
        const epoch=this.epoch,cached=this.snapshot,read={};
        if(this.pending||(cached&&cached.at!==now))throw dependencyUnavailable;
        this.pageReads.set(page,read);
        try{
          const result=await source.batch!(asOf,page,signal);
          if(epoch!==this.epoch||cached!==this.snapshot||this.pending||this.pageReads.get(page)!==read||signal.aborted)throw dependencyUnavailable;
          const items=this.freezePage(result.items);
          // A cold cursor read cannot invent an initialized title projection.
          if(cached) {
            this.observedPages.set(page,items);
            // A later-page reread replaces its visible data. Retire the previous
            // complete ranking snapshot instead of mixing old scores/new titles.
            if(cached.candidates) {
              const {candidates:_,...firstPage}=cached;
              this.snapshot=firstPage;
            }
          }
          return {...result,items};
        }finally{if(this.pageReads.get(page)===read)this.pageReads.delete(page);}
      }
      // Explicit first-page refresh replaces the one shared generation. Old
      // pending first/next reads cannot publish over it; other readers join it.
      const epoch={};this.epoch=epoch;this.snapshot=undefined;this.observedPages.clear();this.pageReads.clear();
      const work=source.batch!(asOf,0,signal).then(result=>{
        if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
        const items=this.freezePage(result.items);
        this.snapshot={at:now,items};
        return {...result,items};
      });
      const pending=work.then(result=>result.items);this.pending=pending;
      void pending.finally(()=>{if(this.pending===pending)this.pending=undefined;}).catch(()=>{});
      return work;
    };
    if(source.availableEvent)this.availableEvent=async(id,asOf,signal)=>{
      const epoch=this.epoch,result=await source.availableEvent!(id,asOf,signal);
      if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;return result;
    };
    if(source.event)this.event=async(id,asOf,signal)=>{
      const epoch=this.epoch,pending=this.pending;
      if(signal.aborted)throw dependencyUnavailable;
      // Stable IDs obey the same pending replacement as ordinary browse Detail.
      // Do not start an independent old provider lookup in the new epoch.
      if(pending)await pending;
      if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
      const now=parseBrowseInstant(asOf),cached=this.snapshot;
      if(now!==undefined&&cached&&covers(cached,now)){
        const found=cached.items.find(item=>sourceEventId(item.browseId)===id&&parseBrowseInstant(item.startAt)!>now);
        if(found&&!this.source.status)return found;
      }
      const result=await source.event!(id,asOf,signal);
      // A refresh can also begin/publish after the initial cache miss. Raw
      // later-page results may not escape across that generation boundary.
      this.requireCurrent(epoch,cached,signal);return result;
    };
  }
  /** Fetch all available pages atomically. No partial candidate set or stale
   * fallback on later-page failure. The same generation feeds social readback. */
  async recommendationSnapshot(asOf: string, signal: AbortSignal) {
    const now=parseBrowseInstant(asOf);
    if(now===undefined||signal.aborted)throw dependencyUnavailable;
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.source.status?45000:10000);
    const bounded = AbortSignal.any([signal, deadline.signal]);
    try {
      if(this.pending) {
        const epoch = this.epoch;
        await withinBudget(this.pending, bounded);
        if(epoch!==this.epoch||bounded.aborted)throw dependencyUnavailable;
      }
      let snapshot=this.snapshot;
      if(!snapshot?.candidates||!covers(snapshot,now)) {
        const epoch={}; this.epoch=epoch; this.snapshot=undefined;
        this.observedPages.clear(); this.pageReads.clear();
        // Same bounded window as cache freshness, but not added to its TTL.
        // A slower owner lookup must not replace another Home reader's complete
        // generation merely because its captured request instant is earlier.
        const from=now-cacheWindow, sourceAsOf=Temporal.Instant.fromEpochNanoseconds(from).toString();
        const work=(async()=>{
          const pages: (readonly BrowseOccurrence[])[]=[];
          const unique=new Map<string,BrowseOccurrence>();
          for(let page=0;page<50;page++){
            if(epoch!==this.epoch||bounded.aborted)throw dependencyUnavailable;
            const result=this.source.batch ? await withinBudget(this.source.batch(sourceAsOf,page,bounded),bounded)
              : {items:await withinBudget(this.source.firstBatch(sourceAsOf,bounded),bounded)};
            if(epoch!==this.epoch||bounded.aborted)throw dependencyUnavailable;
            const items=this.freezePage(result.items); pages.push(items);
            for(const item of items){
              const prior=unique.get(item.browseId);
              if(prior&&JSON.stringify(prior)!==JSON.stringify(item))throw dependencyUnavailable;
              unique.set(item.browseId,item);
            }
            if(result.nextPage===undefined)break;
            if(result.nextPage!==page+1||page===49)throw dependencyUnavailable;
          }
          const items=pages[0]??[];
          const candidates=Object.freeze([...unique.values()]);
          this.snapshot={at:now,from,items,candidates};
          pages.forEach((rows,page)=>{if(page>0)this.observedPages.set(page,rows);});
          return items;
        })();
        this.pending=work;
        try{await work;}finally{if(this.pending===work)this.pending=undefined;}
        if(epoch!==this.epoch)throw dependencyUnavailable;
        snapshot=this.snapshot;
      }
      if(!snapshot?.candidates||bounded.aborted)throw dependencyUnavailable;
      const captured=snapshot,candidates=snapshot.candidates;
      return {items:candidates.filter(row=>parseBrowseInstant(row.startAt)!>now),
        current:()=>!signal.aborted&&this.snapshot===captured&&!this.pending};
    } finally {
      clearTimeout(timer);
    }
  }
  ready(asOf: string): boolean {
    const now = parseBrowseInstant(asOf), snapshot = this.snapshot;
    return now !== undefined && snapshot !== undefined && !this.pending && covers(snapshot,now);
  }
  /** Synchronous current projection only: no source IO inside social transactions. */
  peek(id: string, asOf: string): BrowseOccurrence | undefined {
    const now = parseBrowseInstant(asOf), snapshot = this.snapshot;
    if (now === undefined || !snapshot || this.pending || !covers(snapshot,now)) return undefined;
    // First page wins duplicate identities. No title merging or provider IO.
    for(const items of [snapshot.items,...[...this.observedPages].sort(([a],[b])=>a-b).map(([,rows])=>rows)]){
      const found=items.find(item=>sourceEventId(item.browseId)===id&&parseBrowseInstant(item.startAt)!>now);
      // Social matching needs only the current authorized occurrence identity.
      // Supplementary detail acquisition must not hide combined-source rows.
      if(found)return found;
    }
    return undefined;
  }
  private freezePage(items: readonly BrowseOccurrence[]): readonly BrowseOccurrence[] {
    if(items.length>(this.source.status?40:20)||new Set(items.map(item=>item.browseId)).size!==items.length)throw dependencyUnavailable;
    return Object.freeze(items.map(item=>Object.freeze({...item,...(item.interestConcepts?{interestConcepts:Object.freeze([...item.interestConcepts])}:{}),...(item.regionNames?{regionNames:Object.freeze([...item.regionNames])}:{})})));
  }
  private current() { return this.snapshot; }
  private requireCurrent(epoch: object, snapshot: SourceSnapshot | undefined, signal: AbortSignal): void {
    if(epoch!==this.epoch||snapshot!==this.snapshot||this.pending!==undefined||signal.aborted)throw dependencyUnavailable;
  }
  clear(): void { this.snapshot = undefined; this.pending = undefined; this.epoch = {}; this.observedPages.clear(); this.pageReads.clear(); }
  async firstBatch(asOf: string, signal: AbortSignal): Promise<readonly BrowseOccurrence[]> {
    const now = parseBrowseInstant(asOf);
    if (now === undefined || signal.aborted) throw dependencyUnavailable;
    const current = this.snapshot;
    if (current && covers(current,now)) {
      return current.items.filter(item => parseBrowseInstant(item.startAt)! > now);
    }
    this.snapshot = undefined; // Expired generation cannot become a fallback.
    if (!this.pending) {
      const admitted = {};this.epoch=admitted;this.observedPages.clear();this.pageReads.clear();
      const work = this.source.firstBatch(asOf, signal).then(items => {
        if (admitted !== this.epoch || signal.aborted) throw dependencyUnavailable;
        // Clone and freeze the complete generation before publishing one pointer.
        const projected = this.freezePage(items);
        this.snapshot = { at: now, items: projected, ...(!this.source.batch ? {candidates:projected} : {}) };
        return projected;
      });
      this.pending = work;
      void work.finally(() => { if (this.pending === work) this.pending = undefined; }).catch(() => {});
    }
    const epoch=this.epoch,items = await this.pending;
    if (epoch!==this.epoch||signal.aborted) throw dependencyUnavailable;
    // A concurrent request can only consume a complete, still-current generation.
    const published = this.current();
    if (!published || published.items!==items || !covers(published,now)) throw dependencyUnavailable;
    return items.filter(item => parseBrowseInstant(item.startAt)! > now);
  }
  async detail(id: string, asOf: string, signal: AbortSignal): Promise<BrowseOccurrence | undefined> {
    // firstBatch may admit a new generation synchronously. Bind that generation
    // before yielding, then consume its current snapshot, never an old returned array.
    const first=this.firstBatch(asOf,signal),epoch=this.epoch;
    await first;
    const cached=this.snapshot;
    this.requireCurrent(epoch,cached,signal);
    const now=parseBrowseInstant(asOf);
    if(now===undefined)throw dependencyUnavailable;
    const found=cached?.items.find(item=>item.browseId===id&&parseBrowseInstant(item.startAt)!>now);
    if(found&&!this.source.status)return found;
    if(!this.source.batch)return undefined;
    const result=await this.source.detail(id,asOf,signal);
    // Legitimate later-page reads remain available only within their admitted
    // generation, including when replacement fails rather than publishes.
    this.requireCurrent(epoch,cached,signal);
    return result;
  }
}
