import type { BrowseSource, BrowseOccurrence } from "../ports/event-browse.js";
/** Two independent providers. Partial source failure is explicit, never empty
 * success. Stable occurrence identity is preserved without cross-provider merge. */
export class CombinedEventSource implements BrowseSource {
  private statuses = [
    { provider: "ticketmaster", available: true },
    { provider: "onepa", available: true },
  ];
  private endings = new Map<string, Map<number, number>>();
  constructor(
    private readonly ticketmaster: BrowseSource,
    private readonly onepa: BrowseSource,
  ) {}
  status() {
    return this.statuses.map((x) => ({ ...x }));
  }
  async firstBatch(asOf: string, signal: AbortSignal) {
    return (await this.batch(asOf, 0, signal)).items;
  }
  async batch(asOf: string, page: number, signal: AbortSignal) {
    const sources = [this.ticketmaster, this.onepa];
    let ends = this.endings.get(asOf);
    if (!ends) {
      ends = new Map();
      this.endings.set(asOf, ends);
      while (this.endings.size > 20)
        this.endings.delete(this.endings.keys().next().value!);
    }
    const results = await Promise.allSettled(
      sources.map(async (s, i) => {
        if (page > (ends!.get(i) ?? Infinity))
          return { items: [] as BrowseOccurrence[] };
        const batch = s.batch
          ? await s.batch(asOf, page, signal)
          : { items: page === 0 ? await s.firstBatch(asOf, signal) : [] };
        if (!("nextPage" in batch) || batch.nextPage === undefined)
          ends!.set(i, page);
        return batch;
      }),
    );
    if (signal.aborted) throw Error("Source unavailable");
    this.statuses = results.map((r, i) => ({
      provider: i === 0 ? "ticketmaster" : "onepa",
      available: r.status === "fulfilled",
    }));
    if (results.every((r) => r.status === "rejected"))
      throw Error("Sources unavailable");
    const batches = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );
    const items: BrowseOccurrence[] = batches.flatMap((b) => [...b.items]);
    items.sort(
      (a, b) =>
        a.startAt.localeCompare(b.startAt) ||
        a.browseId.localeCompare(b.browseId),
    );
    return {
      items,
      sourceStatus: this.status(),
      ...(batches.some((b) => "nextPage" in b && b.nextPage !== undefined)
        ? { nextPage: page + 1 }
        : {}),
    };
  }
  private source(id: string) {
    return id.startsWith("pa_") ? this.onepa : this.ticketmaster;
  }
  async detail(id: string, asOf: string, signal: AbortSignal) {
    return this.source(id).detail(id, asOf, signal);
  }
  async event(id: string, asOf: string, signal: AbortSignal) {
    return this.source(id).event?.(id, asOf, signal);
  }
  async availableEvent(id: string, asOf: string, signal: AbortSignal) {
    return (await this.event(id, asOf, signal)) !== undefined;
  }
}
