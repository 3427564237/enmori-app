import type { BrowseOccurrence, BrowseSource } from "../ports/event-browse.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { parseBrowseInstant } from "../domain/browse-values.js";
import { sourceEventId } from '../domain/source-event-id.js';

/** One process-owned source generation, shared by browse, recommendation and
 * detail. No persistence, title merging, retry, or stale-on-error fallback. */
export class ControlledSourceProjection implements BrowseSource {
  private snapshot: { at: bigint; items: readonly BrowseOccurrence[] } | undefined;
  private pending: Promise<readonly BrowseOccurrence[]> | undefined;
  private epoch = {};
  readonly batch?:NonNullable<BrowseSource['batch']>;
  readonly availableEvent?:NonNullable<BrowseSource['availableEvent']>;
  readonly event?:NonNullable<BrowseSource['event']>;
  constructor(private readonly source: BrowseSource) {
    if(source.batch)this.batch=async(asOf,page,signal)=>{
      if(page!==0){
        const epoch=this.epoch,result=await source.batch!(asOf,page,signal);
        if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;return result;
      }
      const now=parseBrowseInstant(asOf);
      if(now===undefined||signal.aborted)throw dependencyUnavailable;
      // Explicit first-page refresh replaces the one shared generation. Old
      // pending first/next reads cannot publish over it; other readers join it.
      const epoch={};this.epoch=epoch;this.snapshot=undefined;
      const work=source.batch!(asOf,0,signal).then(result=>{
        if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
        const items=Object.freeze(result.items.map(item=>Object.freeze({...item})));
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
      const now=parseBrowseInstant(asOf),cached=this.snapshot;
      if(signal.aborted)throw dependencyUnavailable;
      if(now!==undefined&&cached&&now>=cached.at&&now-cached.at<300_000_000_000n){
        const found=cached.items.find(item=>sourceEventId(item.browseId)===id&&parseBrowseInstant(item.startAt)!>now);
        if(found)return found;
      }
      const epoch=this.epoch,result=await source.event!(id,asOf,signal);
      if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;return result;
    };
  }
  private current() { return this.snapshot; }
  clear(): void { this.snapshot = undefined; this.pending = undefined; this.epoch = {}; }
  async firstBatch(asOf: string, signal: AbortSignal): Promise<readonly BrowseOccurrence[]> {
    const now = parseBrowseInstant(asOf);
    if (now === undefined || signal.aborted) throw dependencyUnavailable;
    const current = this.snapshot;
    if (current && now >= current.at && now - current.at < 300_000_000_000n) {
      return current.items.filter(item => parseBrowseInstant(item.startAt)! > now);
    }
    this.snapshot = undefined; // Expired generation cannot become a fallback.
    if (!this.pending) {
      const admitted = this.epoch;
      const work = this.source.firstBatch(asOf, signal).then(items => {
        if (admitted !== this.epoch || signal.aborted) throw dependencyUnavailable;
        // Clone and freeze the complete generation before publishing one pointer.
        const projected = Object.freeze(items.map(item => Object.freeze({ ...item })));
        this.snapshot = { at: now, items: projected };
        return projected;
      });
      this.pending = work;
      void work.finally(() => { if (this.pending === work) this.pending = undefined; }).catch(() => {});
    }
    const items = await this.pending;
    if (signal.aborted) throw dependencyUnavailable;
    // A concurrent request can only consume a complete, still-current generation.
    const published = this.current();
    if (!published || now < published.at || now - published.at >= 300_000_000_000n) throw dependencyUnavailable;
    return items.filter(item => parseBrowseInstant(item.startAt)! > now);
  }
  async detail(id: string, asOf: string, signal: AbortSignal): Promise<BrowseOccurrence | undefined> {
    const found=(await this.firstBatch(asOf, signal)).find(item => item.browseId === id);
    return found??(this.source.batch?this.source.detail(id,asOf,signal):undefined);
  }
}
