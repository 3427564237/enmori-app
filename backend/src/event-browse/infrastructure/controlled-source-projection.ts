import type { BrowseOccurrence, BrowseSource } from "../ports/event-browse.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { parseBrowseInstant } from "../domain/browse-values.js";
import { sourceEventId } from '../domain/source-event-id.js';
type SourceSnapshot = { at: bigint; items: readonly BrowseOccurrence[] };

/** One process-owned source generation, shared by browse, recommendation and
 * detail. No persistence, title merging, retry, or stale-on-error fallback. */
export class ControlledSourceProjection implements BrowseSource {
  private snapshot: SourceSnapshot | undefined;
  private pending: Promise<readonly BrowseOccurrence[]> | undefined;
  private epoch = {};
  // Explicitly browsed pages only. Recommendation candidates remain snapshot.items.
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
          if(cached)this.observedPages.set(page,items);
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
      if(now!==undefined&&cached&&now>=cached.at&&now-cached.at<300_000_000_000n){
        const found=cached.items.find(item=>sourceEventId(item.browseId)===id&&parseBrowseInstant(item.startAt)!>now);
        if(found)return found;
      }
      const result=await source.event!(id,asOf,signal);
      // A refresh can also begin/publish after the initial cache miss. Raw
      // later-page results may not escape across that generation boundary.
      this.requireCurrent(epoch,cached,signal);return result;
    };
  }
  ready(asOf: string): boolean {
    const now = parseBrowseInstant(asOf), snapshot = this.snapshot;
    return now !== undefined && snapshot !== undefined && !this.pending && now >= snapshot.at && now - snapshot.at < 300_000_000_000n;
  }
  /** Synchronous current projection only: no source IO inside social transactions. */
  peek(id: string, asOf: string): BrowseOccurrence | undefined {
    const now = parseBrowseInstant(asOf), snapshot = this.snapshot;
    if (now === undefined || !snapshot || this.pending || now < snapshot.at || now - snapshot.at >= 300_000_000_000n) return undefined;
    // First page wins duplicate identities. No title merging or provider IO.
    for(const items of [snapshot.items,...[...this.observedPages].sort(([a],[b])=>a-b).map(([,rows])=>rows)]){
      const found=items.find(item=>sourceEventId(item.browseId)===id&&parseBrowseInstant(item.startAt)!>now);
      if(found)return found;
    }
    return undefined;
  }
  private freezePage(items: readonly BrowseOccurrence[]): readonly BrowseOccurrence[] {
    if(items.length>20||new Set(items.map(item=>item.browseId)).size!==items.length)throw dependencyUnavailable;
    return Object.freeze(items.map(item=>Object.freeze({...item})));
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
    if (current && now >= current.at && now - current.at < 300_000_000_000n) {
      return current.items.filter(item => parseBrowseInstant(item.startAt)! > now);
    }
    this.snapshot = undefined; // Expired generation cannot become a fallback.
    if (!this.pending) {
      const admitted = {};this.epoch=admitted;this.observedPages.clear();this.pageReads.clear();
      const work = this.source.firstBatch(asOf, signal).then(items => {
        if (admitted !== this.epoch || signal.aborted) throw dependencyUnavailable;
        // Clone and freeze the complete generation before publishing one pointer.
        const projected = this.freezePage(items);
        this.snapshot = { at: now, items: projected };
        return projected;
      });
      this.pending = work;
      void work.finally(() => { if (this.pending === work) this.pending = undefined; }).catch(() => {});
    }
    const epoch=this.epoch,items = await this.pending;
    if (epoch!==this.epoch||signal.aborted) throw dependencyUnavailable;
    // A concurrent request can only consume a complete, still-current generation.
    const published = this.current();
    if (!published || published.items!==items || now < published.at || now - published.at >= 300_000_000_000n) throw dependencyUnavailable;
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
    if(found)return found;
    if(!this.source.batch)return undefined;
    const result=await this.source.detail(id,asOf,signal);
    // Legitimate later-page reads remain available only within their admitted
    // generation, including when replacement fails rather than publishes.
    this.requireCurrent(epoch,cached,signal);
    return result;
  }
}
