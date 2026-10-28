import type { BrowseSource, BrowseOccurrence } from "../ports/event-browse.js";
import { coverImageUrl } from "../domain/browse-values.js";
import { plain, excerpt, PublicEventBrowser } from "./public-event-pages.js";
/** Enrichment follows only links actually returned by the same provider page. */
export class EnrichedTicketmasterSource implements BrowseSource {
  private pending = new Map<string, Promise<BrowseOccurrence>>();
  private cached = new Map<string, { until: number; row: BrowseOccurrence }>();
  constructor(
    private readonly source: BrowseSource,
    private readonly browser: PublicEventBrowser,
  ) {}
  private async enrich(
    row: BrowseOccurrence,
    signal: AbortSignal,
  ): Promise<BrowseOccurrence> {
    const cached = this.cached.get(row.browseId);
    if (
      cached &&
      cached.until > Date.now() &&
      cached.row.startAt === row.startAt
    )
      return { ...cached.row, ...row, content: cached.row.content! };
    const prior = this.pending.get(row.browseId);
    if (prior) return prior;
    const work = (async () => {
      const base: BrowseOccurrence = {
        ...row,
        content: {
          provider: "ticketmaster",
          sourceId: row.browseId,
          fetchedAt: new Date().toISOString(),
          timeZone: "Asia/Singapore",
          detailUrl: row.externalSourceUrl,
          status: "unknown",
          ...row.content,
          detailsStatus: row.content?.fullDescription
            ? "available"
            : "unavailable",
        },
      };
      try {
        let page = await this.browser.read(row.externalSourceUrl, signal);
        const detail = page.links.find((u) =>
          /^https:\/\/(?:www\.)?ticketmaster\.sg\/activity\/detail\/[A-Za-z0-9_-]+$/.test(
            u,
          ),
        );
        if (detail && detail !== page.url)
          page = await this.browser.read(detail, signal);
        // An information page must link back to the exact API occurrence booking
        // URL, or be that URL itself. Never merge another occurrence by title.
        if (
          page.url !== row.externalSourceUrl &&
          !page.links.includes(row.externalSourceUrl)
        )
          return base;
        const description = plain(page.description),
          sections = page.sections
            .map((s) => ({
              heading: plain(s.heading, 100),
              text: plain(s.text, 12000),
            }))
            .filter(
              (s): s is { heading: string; text: string } =>
                !!s.heading && !!s.text,
            );
        const result: BrowseOccurrence = {
          ...base,
          ...(description ? { shortDescription: excerpt(description) } : {}),
          ...(coverImageUrl(page.cover) ? { coverImageUrl: page.cover } : {}),
          content: {
            ...base.content!,
            detailsStatus: description ? "available" : "not_provided",
            detailUrl: page.url,
            ...(page.url !== row.externalSourceUrl
              ? { bookingUrl: row.externalSourceUrl }
              : {}),
            ...(description ? { fullDescription: description } : {}),
            ...(sections.length ? { sections } : {}),
            ...(/FULLY SOLD OUT/i.test(page.text)
              ? { status: "sold_out" as const }
              : {}),
          },
        };
        this.cached.set(row.browseId, {
          until: Date.now() + 300000,
          row: result,
        });
        while (this.cached.size > 100)
          this.cached.delete(this.cached.keys().next().value!);
        return result;
      } catch {
        return base;
      }
    })();
    this.pending.set(row.browseId, work);
    try {
      return await work;
    } finally {
      if (this.pending.get(row.browseId) === work)
        this.pending.delete(row.browseId);
    }
  }
  async firstBatch(asOf: string, signal: AbortSignal) {
    return (await this.batch(asOf, 0, signal)).items;
  }
  async batch(asOf: string, page: number, signal: AbortSignal) {
    const batch = this.source.batch
      ? await this.source.batch(asOf, page, signal)
      : { items: await this.source.firstBatch(asOf, signal) };
    // List reads use provider summaries and already acquired enrichments. Full
    // browser reads are demand-driven by detail, with no N-detail fan-out.
    const items = batch.items.map((row) => {
      const cached = this.cached.get(row.browseId);
      return cached &&
        cached.until > Date.now() &&
        cached.row.startAt === row.startAt
        ? { ...cached.row, ...row, content: cached.row.content! }
        : {
            ...row,
            content: {
              provider: "ticketmaster" as const,
              sourceId: row.browseId,
              fetchedAt: new Date().toISOString(),
              timeZone: "Asia/Singapore" as const,
              detailUrl: row.externalSourceUrl,
              status: "unknown" as const,
              ...row.content,
            },
          };
    });
    return { ...batch, items };
  }
  async detail(id: string, asOf: string, signal: AbortSignal) {
    const row = await this.source.detail(id, asOf, signal);
    return row ? this.enrich(row, signal) : undefined;
  }
  async event(id: string, asOf: string, signal: AbortSignal) {
    const row = await this.source.event?.(id, asOf, signal);
    return row ? this.enrich(row, signal) : undefined;
  }
  async availableEvent(id: string, asOf: string, signal: AbortSignal) {
    return (await this.event(id, asOf, signal)) !== undefined;
  }
}
