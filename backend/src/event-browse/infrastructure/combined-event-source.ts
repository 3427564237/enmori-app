import { freezeSourceCoverage } from "../domain/source-coverage.js";
import type { BrowseSource, BrowseOccurrence, EventSourceCoverage } from "../ports/event-browse.js";
/** Two independent providers. Partial source failure is explicit, never empty
 * success. Stable occurrence identity is preserved without cross-provider merge. */
export class CombinedEventSource implements BrowseSource {
  private observed = new Map<number, import("../../admin/ports/admin-repository.js").ServiceObservation>();
  private attempts = [0, 0];
  observations() {
    for (const [i, source] of [this.ticketmaster, this.onepa].entries()) {
      const value = source.observations?.().find(v => v.provider === (i === 0 ? 'ticketmaster' : 'onepa'));
      const current = this.observed.get(i);
      if (value && (!current || value.lastObservedAt > current.lastObservedAt)) this.observed.set(i, {...value});
    }
    return [...this.observed.values()].map(v => ({...v}));
  }
  private statuses = [
    { provider: "ticketmaster", available: true },
    { provider: "onepa", available: true },
  ];
  private listings = new Map<string, { ends: Map<number, number>; unavailable: Set<number>; sourceCoverage?: readonly EventSourceCoverage[] }>();
  constructor(
    private readonly ticketmaster: BrowseSource,
    private readonly onepa: BrowseSource,
    private readonly batchTimeoutMs?: number,
  ) {}
  private async boundedBatch<T>(signal: AbortSignal, read: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (signal.aborted) throw Error("Source unavailable");
    if (this.batchTimeoutMs === undefined) return read(signal);
    const deadline = performance.now() + this.batchTimeoutMs;
    const controller = new AbortController();
    let cancel!: () => void;
    const expired = new Promise<never>((_, reject) => {
      cancel = () => {
        controller.abort();
        reject(Error("Source unavailable"));
      };
    });
    const timer = setTimeout(cancel, this.batchTimeoutMs);
    signal.addEventListener("abort", cancel, {once: true});
    try {
      // A browser's asynchronous close may outlive its abort. Do not make the
      // healthy provider wait for that cleanup past the ordinary client budget.
      const result = await Promise.race([Promise.resolve().then(() => read(controller.signal)), expired]);
      // A ready provider promise can run before an overdue timer callback.
      if (signal.aborted || performance.now() >= deadline) {
        controller.abort();
        throw Error("Source unavailable");
      }
      return result;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }
  status() {
    return this.statuses.map((x) => ({ ...x }));
  }
  async firstBatch(asOf: string, signal: AbortSignal) {
    return (await this.batch(asOf, 0, signal)).items;
  }
  async batch(asOf: string, page: number, signal: AbortSignal) {
    const sources = [this.ticketmaster, this.onepa];
    let listing = page === 0 ? undefined : this.listings.get(asOf);
    const freshListing = !listing;
    if (!listing) {
      listing = { ends: new Map(), unavailable: new Set() };
      this.listings.set(asOf, listing);
      while (this.listings.size > 20)
        this.listings.delete(this.listings.keys().next().value!);
    }
    const current = listing;
    const results = await Promise.allSettled(
      sources.map(async (s, i) => {
        // A provider absent from the first page remains explicitly unavailable
        // for this listing. Do not restart its failed cold read for every page
        // of the healthy provider. A fresh page zero retries both providers.
        if (current.unavailable.has(i)) throw Error("Source unavailable");
        if (page > (current.ends.get(i) ?? Infinity))
          return { items: [] as BrowseOccurrence[] };
        const attempt = (this.attempts[i] ?? 0) + 1; this.attempts[i] = attempt;
        const observe = (available: boolean) => {
          if (signal.aborted || this.attempts[i] !== attempt) return;
          if (available && s.observations) {
            // The child owns its network/cache boundary. A successful cached
            // batch is not a new observation of the remote provider.
            this.observations();
            return;
          }
          const at = new Date().toISOString(), prior = this.observed.get(i);
          this.observed.set(i, {provider: i === 0 ? 'ticketmaster' : 'onepa', available, lastObservedAt: at,
            ...(available ? {lastSucceededAt: at} : prior?.lastSucceededAt ? {lastSucceededAt: prior.lastSucceededAt} : {})});
        };
        let batch;
        try {
          batch = await this.boundedBatch(signal, async providerSignal => s.batch
            ? s.batch(asOf, page, providerSignal)
            : { items: page === 0 ? await s.firstBatch(asOf, providerSignal) : [] });
          if (i === 1) {
            const coverage = freezeSourceCoverage('sourceCoverage' in batch ? batch.sourceCoverage : undefined,
              [{provider:'onepa',available:true}]);
            if (freshListing) {
              if (coverage) current.sourceCoverage = coverage;
              else delete current.sourceCoverage;
            }
            else if (current.sourceCoverage?.[0]?.complete !== coverage?.[0]?.complete) throw Error('Source coverage changed');
          }
          observe(true);
        } catch (error) { observe(false); throw error; }
        if (!("nextPage" in batch) || batch.nextPage === undefined)
          current.ends.set(i, page);
        return batch;
      }),
    );
    if (signal.aborted) throw Error("Source unavailable");
    if (page === 0) results.forEach((result, index) => {
      if (result.status === "rejected") current.unavailable.add(index);
    });
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
      ...(results[1]?.status === 'fulfilled' && current.sourceCoverage
        ? {sourceCoverage: current.sourceCoverage} : {}),
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
