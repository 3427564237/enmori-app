import type { BrowseSource, BrowseOccurrence } from "../ports/event-browse.js";
import { coverImageUrl } from "../domain/browse-values.js";
import {
  renderedText,
  excerpt,
  PublicEventBrowser,
} from "./public-event-pages.js";
import type { PublicPage } from "./public-event-pages.js";

function selectedOccurrence(
  page: PublicPage,
  row: BrowseOccurrence,
): string[] | undefined {
  const booking = new URL(row.externalSourceUrl).pathname.match(
    /^\/ticket\/area\/([A-Za-z0-9_-]+)\//,
  );
  if (
    !booking ||
    new URL(page.url).pathname !== `/activity/detail/${booking[1]}`
  )
    return undefined;
  return page.occurrenceRows?.find((cells) => {
    const m = cells[0]?.match(
      /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}) \([^)]*\) (\d{1,2}):(\d{2}) (am|pm)$/i,
    );
    if (!m) return false;
    const month = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ].indexOf(m[2]!.toLowerCase());
    const hour = (Number(m[4]) % 12) + (m[6]!.toLowerCase() === "pm" ? 12 : 0);
    if (month < 0 || Number(m[4]) < 1 || Number(m[4]) > 12 || Number(m[5]) > 59)
      return false;
    const at = Date.UTC(
      Number(m[3]),
      month,
      Number(m[1]),
      hour - 8,
      Number(m[5]),
    );
    const normalize = (s: string) =>
      s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
    return (
      at === Date.parse(row.startAt) &&
      !!row.locationLabel &&
      normalize(cells[2] ?? "") === normalize(row.locationLabel)
    );
  });
}
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
        // The reader resolves the matching information page. Links in that
        // page may advertise unrelated events and must not redirect enrichment.
        const page = await this.browser.read(row.externalSourceUrl, signal);
        // An information page must link back to the exact API occurrence booking
        // URL, or be that URL itself. Never merge another occurrence by title.
        const occurrence = selectedOccurrence(page, row);
        if (
          page.url !== row.externalSourceUrl &&
          !page.links.includes(row.externalSourceUrl) &&
          !occurrence
        )
          return base;
        const description = renderedText(page.description),
          sections = page.sections
            .map((s) => ({
              heading: renderedText(s.heading, 100),
              text: renderedText(s.text, 12000),
            }))
            .filter(
              (s): s is { heading: string; text: string } =>
                !!s.heading && !!s.text,
            );
        const admission = sections
          .filter((s) => /admission/i.test(s.heading))
          .map((s) => s.text)
          .join("\n");
        const minimum = admission.match(
          /no admission[^.]*?children below\s+(\d{1,3})\s+years old/i,
        );
        const pricing = sections
          .filter((s) => /pricing|faq/i.test(s.heading))
          .map((s) => s.text)
          .join("\n");
        const prices = [
          ...pricing.matchAll(
            /(?:CAT\s+\d+(?:\s*\([^)]*\))?|VIP)\s*:\s*\$([\d,]+(?:\.\d{1,2})?)/gi,
          ),
        ]
          .map((m) => Number(m[1]!.replace(/,/g, "")))
          .filter((n) => Number.isFinite(n) && n > 0);
        const range = pricing.match(
          /range from\s+\$([\d,]+(?:\.\d{1,2})?)\s+to\s+\$([\d,]+(?:\.\d{1,2})?)/i,
        );
        if (!prices.length && range) {
          const minimum = Number(range[1]!.replace(/,/g, ""));
          const maximum = Number(range[2]!.replace(/,/g, ""));
          if (minimum > 0 && maximum >= minimum) prices.push(minimum);
        }
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
            ...(minimum && Number(minimum[1]) <= 150
              ? { minimumAge: Number(minimum[1]) }
              : {}),
            ...(prices.length
              ? {
                  priceLabel: `From $${Math.min(...prices)}${/booking fees?[^.]*not included|booking fee per ticket/i.test(pricing) ? " · booking fees extra" : ""}`,
                }
              : {}),
            ...(/sold out/i.test(occurrence?.[3] ?? "")
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
