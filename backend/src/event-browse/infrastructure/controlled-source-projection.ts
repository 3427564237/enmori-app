import type { BrowseOccurrence, BrowseSource } from "../ports/event-browse.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import { parseEventInstant } from "../../event-recommendations/infrastructure/event-records.js";

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
    const now = parseEventInstant(asOf);
    if (now === undefined || signal.aborted) throw dependencyUnavailable;
    const current = this.snapshot;
    if (current && now >= current.at && now - current.at < 300_000_000_000n) {
      return current.items.filter(item => parseEventInstant(item.startAt)! > now);
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
    return items.filter(item => parseEventInstant(item.startAt)! > now);
  }
  async detail(id: string, asOf: string, signal: AbortSignal): Promise<BrowseOccurrence | undefined> {
    return (await this.firstBatch(asOf, signal)).find(item => item.browseId === id);
  }
}
