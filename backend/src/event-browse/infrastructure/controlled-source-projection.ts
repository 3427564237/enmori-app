import type { BrowseOccurrence, BrowseSource } from "../ports/event-browse.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { parseBrowseInstant } from "../domain/browse-values.js";

/** One process-owned source generation, shared by browse, recommendation and
 * detail. No persistence, title merging, retry, or stale-on-error fallback. */
export class ControlledSourceProjection implements BrowseSource {
  private snapshot: { at: bigint; items: readonly BrowseOccurrence[] } | undefined;
  private pending: Promise<readonly BrowseOccurrence[]> | undefined;
  private epoch = {};
  constructor(private readonly source: BrowseSource) {}
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
  async batch(asOf:string,page:number,signal:AbortSignal){
    if(!this.source.batch)throw dependencyUnavailable;
    const epoch=this.epoch,result=await this.source.batch(asOf,page,signal);
    if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
    return result;
  }
  async availableEvent(id:string,asOf:string,signal:AbortSignal){
    if(!this.source.availableEvent)throw dependencyUnavailable;
    const epoch=this.epoch,result=await this.source.availableEvent(id,asOf,signal);
    if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
    return result;
  }
  async event(id:string,asOf:string,signal:AbortSignal){
    if(!this.source.event)throw dependencyUnavailable;
    const epoch=this.epoch,result=await this.source.event(id,asOf,signal);
    if(epoch!==this.epoch||signal.aborted)throw dependencyUnavailable;
    return result;
  }
}
