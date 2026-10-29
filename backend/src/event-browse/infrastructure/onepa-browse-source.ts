import type { BrowseSource, BrowseOccurrence } from "../ports/event-browse.js";
import { browseId, coverImageUrl } from "../domain/browse-values.js";
import { sourceEventId } from "../domain/source-event-id.js";
import {
  publicText,
  plain,
  excerpt,
  permittedPublicPage,
} from "./public-event-pages.js";
import { locateArea } from "../../recommendation-profile/infrastructure/region-geometry.js";
import type { OnePaListItem } from "./onepa-public-catalogue.js";
/** onePA xp timestamps are wall-clock fields; xp.Timezone=8.0 supplies the zone.
 * Verified against rendered page times. Do not parse misleading +00:00 as UTC. */
export function onePaInstant(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/.test(value)
  )
    return undefined;
  const date = new Date(value.slice(0, 19) + "+08:00");
  return Number.isFinite(date.getTime()) &&
    new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 19) ===
      value.slice(0, 19)
    ? date.toISOString()
    : undefined;
}
export function projectOnePa(
  next: unknown,
  url: string,
  asOf: string,
): BrowseOccurrence | undefined {
  try {
    const data = next as any;
    const p =
      data.props.pageProps.page.layout.sitecore.route.fields.currentProduct
        .value;
    const xp = p.xp;
    if (
      !p.Active ||
      xp.Private !== 0 ||
      xp.Published !== 1 ||
      xp.InvitationOnly !== 0 ||
      xp.UsePassword !== 0 ||
      xp.ProductType !== "Event" ||
      xp.Timezone !== "8.0" ||
      !/^PA-Event-\d+$/.test(p.ID) ||
      !permittedPublicPage(url) ||
      new URL(url).hostname !== "www.onepa.gov.sg"
    )
      return undefined;
    const id = browseId(p.ID, "pa"),
      title = plain(p.Name, 200),
      startAt = onePaInstant(xp.StartDate),
      endAt = onePaInstant(xp.EndDate);
    if (
      !id ||
      !title ||
      !startAt ||
      startAt <= asOf ||
      !url.endsWith(String(xp.Event?.Id))
    )
      return undefined;
    const description = plain(xp.XmcDescription ?? p.Description),
      venue = plain(xp.XmcVenue ?? xp.Venue, 200),
      address = plain(xp.Address, 200);
    const details = Object.values(data.props.pageProps.componentProps).find(
      (v: any) => v.product?.ID === p.ID,
    ) as any;
    const faq = plain(details?.xmcEventDetails?.faq, 12000),
      organizer = plain(xp.Outlet?.Name, 200);
    const sections = [
      ...(address ? [{ heading: "Address", text: address }] : []),
      ...(organizer ? [{ heading: "Organiser", text: organizer }] : []),
      ...(faq ? [{ heading: "FAQ", text: faq }] : []),
    ];
    const locationLabel = plain(
      [venue, address].filter(Boolean).join(", "),
      200,
    );
    const areaCode = locateArea(Number(xp.MapLat), Number(xp.MapLng));
    // Only explicit, unambiguous restrictions, not demographic/category guesses.
    const min = description?.match(
      /only for age\s+(\d{1,3})\s+(?:and above|\+)/i,
    );
    const cover =
      data.props.pageProps.page.layout.sitecore.route.fields.OpenGraphImage
        ?.value?.src;
    const deadline = onePaInstant(xp.TicketEndDate);
    const content = {
      provider: "onepa" as const,
      sourceId: p.ID as string,
      fetchedAt: new Date().toISOString(),
      timeZone: "Asia/Singapore" as const,
      detailUrl: url,
      detailsStatus: description
        ? ("available" as const)
        : ("not_provided" as const),
      status:
        xp.Cancelled === 1
          ? ("cancelled" as const)
          : deadline && deadline <= asOf
            ? ("registration_closed" as const)
            : ("unknown" as const),
      priceLabel: "Log in to onePA to confirm pricing and vacancies",
      ...(deadline ? { registrationDeadline: deadline } : {}),
      ...(description ? { fullDescription: description } : {}),
      ...(sections.length ? { sections } : {}),
      ...(areaCode ? { areaCode } : {}),
      ...(min && Number(min[1]) <= 150 ? { minimumAge: Number(min[1]) } : {}),
    };
    return {
      browseId: id,
      title,
      startAt,
      externalSourceUrl: url,
      ...(endAt && endAt > startAt ? { endAt } : {}),
      ...(locationLabel ? { locationLabel } : {}),
      ...(description ? { shortDescription: excerpt(description) } : {}),
      ...(coverImageUrl(cover) ? { coverImageUrl: cover } : {}),
      content,
    };
  } catch {
    return undefined;
  }
}
/** Public list summaries are not represented as complete Event Details. */
export function projectOnePaListItem(
  item: OnePaListItem,
  asOf: string,
): BrowseOccurrence | undefined {
  const row = projectOnePa(
    {
      props: {
        pageProps: {
          page: {
            layout: {
              sitecore: {
                route: { fields: { currentProduct: { value: item.product } } },
              },
            },
          },
          componentProps: {},
        },
      },
    },
    item.url,
    asOf,
  );
  if (!row) return undefined;
  const summary = plain((item.product as any)?.xp?.SummaryBox);
  const {
    fullDescription: _,
    sections: __,
    detailsStatus: ___,
    ...content
  } = row.content!;
  const minimum = summary?.match(
    /only for age\s+(\d{1,3})\s+(?:and above|\+)/i,
  );
  return {
    ...row,
    ...(summary ? { shortDescription: excerpt(summary) } : {}),
    content: {
      ...content,
      ...(minimum && Number(minimum[1]) <= 150
        ? { minimumAge: Number(minimum[1]) }
        : {}),
    },
  };
}
export class OnePaBrowseSource implements BrowseSource {
  private catalogue:
    | { until: number; items: readonly OnePaListItem[] }
    | undefined;
  private cataloguePending: Promise<readonly OnePaListItem[]> | undefined;
  private index: { until: number; urls: string[] } | undefined;
  private rows = new Map<string, { until: number; row: BrowseOccurrence }>();
  private pending = new Map<string, Promise<BrowseOccurrence | undefined>>();
  constructor(
    private readonly enabled: () => boolean,
    private readonly read = publicText,
    private readonly readCatalogue?: (
      signal: AbortSignal,
    ) => Promise<readonly OnePaListItem[]>,
  ) {}
  private async list(signal: AbortSignal): Promise<readonly OnePaListItem[]> {
    if (this.catalogue && this.catalogue.until > Date.now())
      return this.catalogue.items;
    if (!this.cataloguePending) {
      const work = this.readCatalogue!(signal).then((items) => {
        if (
          signal.aborted ||
          !this.enabled() ||
          items.length > 50 ||
          new Set(items.map((x) => x.url)).size !== items.length ||
          items.some(
            (x) =>
              typeof (x.product as any)?.ID !== "string" ||
              !/^PA-Event-\d+$/.test((x.product as any).ID),
          ) ||
          new Set(items.map((x) => (x.product as any)?.ID)).size !==
            items.length
        )
          throw Error("Source unavailable");
        this.catalogue = { until: Date.now() + 300000, items };
        return items;
      });
      this.cataloguePending = work;
      void work
        .finally(() => {
          if (this.cataloguePending === work) this.cataloguePending = undefined;
        })
        .catch(() => {});
    }
    return this.cataloguePending;
  }
  private async urls(signal: AbortSignal) {
    if (this.index && this.index.until > Date.now()) return this.index.urls;
    const index = await this.read(
      "https://www.onepa.gov.sg/sitemap.xml",
      signal,
    );
    const u = [...index.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((m) => m[1]!)
      .find((s) =>
        s.startsWith("https://www.onepa.gov.sg/sitemap/sitemap-event.xml"),
      );
    if (!u) throw Error("Source unavailable");
    const sitemap = await this.read(u, signal);
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((m) => m[1]!)
      .filter((u) =>
        /^https:\/\/www\.onepa\.gov\.sg\/events\/[a-zA-Z0-9-]+$/.test(u),
      );
    if (!urls.length) throw Error("Source unavailable");
    this.index = { until: Date.now() + 300000, urls: urls.slice(0, 100) };
    return this.index.urls;
  }
  private async load(url: string, asOf: string, signal: AbortSignal) {
    const cached = this.rows.get(url);
    if (cached && cached.until > Date.now())
      return cached.row.startAt > asOf ? cached.row : undefined;
    let work = this.pending.get(url);
    if (!work) {
      work = (async () => {
        const html = await this.read(url, signal);
        const json = html.match(
          /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
        )?.[1];
        if (!json) throw Error("Source format changed");
        const row = projectOnePa(JSON.parse(json), url, asOf);
        if (row) this.rows.set(url, { until: Date.now() + 300000, row });
        return row;
      })();
      this.pending.set(url, work);
    }
    try {
      return await work;
    } finally {
      if (this.pending.get(url) === work) this.pending.delete(url);
    }
  }
  async firstBatch(asOf: string, signal: AbortSignal) {
    return (await this.batch(asOf, 0, signal)).items;
  }
  async batch(asOf: string, page: number, signal: AbortSignal) {
    if (
      !this.enabled() ||
      signal.aborted ||
      !Number.isInteger(page) ||
      page < 0 ||
      page > 49
    )
      throw Error("Source unavailable");
    if (this.readCatalogue) {
      const rows = await this.list(signal);
      if (signal.aborted || !this.enabled()) throw Error("Source unavailable");
      const items = rows.slice(page * 20, (page + 1) * 20).flatMap((item) => {
        const row = projectOnePaListItem(item, asOf);
        return row ? [row] : [];
      });
      return {
        items,
        ...((page + 1) * 20 < rows.length ? { nextPage: page + 1 } : {}),
      };
    }
    const urls = await this.urls(signal),
      selected = urls.slice(page * 20, (page + 1) * 20),
      items: BrowseOccurrence[] = [];
    // Four bounded reads at a time, no detached harvesting or automatic retries.
    for (let i = 0; i < selected.length; i += 4) {
      const rows = await Promise.all(
        selected.slice(i, i + 4).map((u) => this.load(u, asOf, signal)),
      );
      for (const row of rows) if (row) items.push(row);
    }
    if (!this.enabled() || signal.aborted) throw Error("Source unavailable");
    for (const [key, row] of this.rows)
      if (row.until <= Date.now()) this.rows.delete(key);
    return {
      items,
      ...((page + 1) * 20 < urls.length ? { nextPage: page + 1 } : {}),
    };
  }
  async detail(id: string, asOf: string, signal: AbortSignal) {
    if (!this.enabled() || signal.aborted) throw Error("Source unavailable");
    if (this.readCatalogue) await this.list(signal);
    const known = this.catalogue?.items.find(
      (item) => browseId((item.product as any)?.ID, "pa") === id,
    );
    if (known) return this.load(known.url, asOf, signal);
    const urls = await this.urls(signal);
    for (const url of urls) {
      const match = url.match(/(\d+)$/);
      if (match && browseId("PA-Event-" + match[1], "pa") === id)
        return this.load(url, asOf, signal);
    }
    return undefined;
  }
  async event(id: string, asOf: string, signal: AbortSignal) {
    if (!this.enabled() || signal.aborted) throw Error("Source unavailable");
    if (this.readCatalogue) await this.list(signal);
    const known = this.catalogue?.items.find((item) => {
      const browse = browseId((item.product as any)?.ID, "pa");
      return browse && sourceEventId(browse) === id;
    });
    if (known) return this.load(known.url, asOf, signal);
    // Stable saved identity can be resolved after process/cache restart without
    // fetching every detail or requiring the user to browse it first.
    for (const url of await this.urls(signal)) {
      const match = url.match(/(\d+)$/),
        browse = match && browseId("PA-Event-" + match[1], "pa");
      if (browse && sourceEventId(browse) === id)
        return this.load(url, asOf, signal);
    }
    return undefined;
  }
  async availableEvent(id: string, asOf: string, signal: AbortSignal) {
    return (await this.event(id, asOf, signal)) !== undefined;
  }
}
