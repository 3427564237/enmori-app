/// <reference lib="dom" />
import { chromium, type Browser, type Response } from "playwright";
import { isDeepStrictEqual } from "node:util";
import { permittedBrowserResource } from "./public-event-pages.js";
export interface OnePaListItem {
  readonly product: unknown;
  readonly url: string;
}
interface SearchGrid {
  readonly offset: number;
  readonly limit: number;
  readonly total_item: number;
  readonly content: readonly { id: string; [key: string]: any }[];
}
async function searchGrid(response: Response): Promise<SearchGrid> {
  const payload = await response.body();
  if (payload.length > 2500000) throw Error("Source too large");
  const raw = JSON.parse(payload.toString("utf8"));
  const grids = Array.isArray(raw?.widgets)
    ? raw.widgets.filter((w: any) => w?.entity === "product" && w?.type === "content_grid")
    : [];
  const grid = grids[0];
  if (grids.length !== 1 || !Number.isSafeInteger(grid.offset) || grid.offset < 0 || grid.offset % 10 !== 0 ||
      grid.limit !== 10 || !Array.isArray(grid.content) || grid.content.length > 10 ||
      !Number.isSafeInteger(grid.total_item) || grid.total_item < 0 ||
      grid.content.some((p: any) => typeof p?.id !== "string" || !/^PA-Event-\d+$/.test(p.id)) ||
      new Set(grid.content.map((p: any) => p.id)).size !== grid.content.length)
    throw Error("Source format changed");
  return grid;
}
/** Read the provider's anonymous, rendered search list; never fan out to
 * individual details. The provider's own Next Page action supplies pagination. */
export async function readOnePaCatalogue(
  signal: AbortSignal,
  launch: () => Promise<Browser> = () => chromium.launch({
    headless: false,
    args: ["--start-minimized"],
    timeout: 30000,
  }),
): Promise<readonly OnePaListItem[]> {
  if (signal.aborted) throw Error("Source unavailable");
  const browser = await launch();
  const abort = () => {
    void browser.close().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 180000);
  try {
    if (signal.aborted) throw Error("Source unavailable");
    const context = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.route("**/*", (route) => {
      const r = route.request();
      return !permittedBrowserResource(
        r.url(),
        r.isNavigationRequest() && r.frame().parentFrame() === null,
      ) || ["image", "media", "font"].includes(r.resourceType())
        ? route.abort()
        : route.continue();
    });
    const page = await context.newPage();
    const result: OnePaListItem[] = [];
    const completed = new Map<number, SearchGrid>();
    const response = (offset: number) => {
      const observed = new WeakMap<Response, SearchGrid>();
      // Playwright invokes asynchronous response predicates concurrently.
      // Preserve response arrival order so a fast later body cannot hide an
      // earlier malformed target response whose body is still downloading.
      let validation = Promise.resolve(false);
      return page.waitForResponse(
        (r) => {
          if (new URL(r.url()).origin !== "https://www.onepa.gov.sg" ||
              new URL(r.url()).pathname !== "/-api/search/query") return false;
          validation = validation.then(async () => {
            // An explicit refusal/error cannot produce the expected search grid.
            // Preserve failure and release the healthy source without a timeout.
            if (r.status() >= 400) throw Error("Source unavailable");
            if (r.status() !== 201) return false;
            const grid = await searchGrid(r);
            if (grid.offset === offset) { observed.set(r, grid); return true; }
            // A slow rendered page can emit a late duplicate of a completed
            // query while Next Page is in flight. It is not the requested page.
            // Only exact, previously validated page content may be ignored.
            const previous = completed.get(grid.offset);
            if (grid.offset < offset && previous && previous.total_item === grid.total_item &&
                isDeepStrictEqual(previous.content, grid.content)) return false;
            throw Error("Source format changed");
          });
          return validation;
        },
        { timeout: 60000 },
      ).then(r => observed.get(r)!);
    };
    for (let index = 0; index < 5; index++) {
      const pending = response(index * 10);
      // Observe the rejection even if navigation/action fails first.
      void pending.catch(() => {});
      if (index === 0) {
        const navigation = await page.goto("https://www.onepa.gov.sg/events/search", {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        if (!navigation || navigation.status() >= 400) throw Error("Source unavailable");
      } else
        await page
          .getByRole("link", { name: "Next Page", exact: true })
          .click({ timeout: 15000 });
      const grid = await pending;
      if (grid.content.length === 0) break;
      const ids = grid.content.map((p) => p.id);
      await page.waitForFunction(
        (ids: string[]) =>
          ids.every((id) =>
            [
              ...document.querySelectorAll<HTMLAnchorElement>(
                "a.serp-grid__item[href]",
              ),
            ].some(
              (a) =>
                a.href.endsWith("-e" + id.slice(9)) ||
                a.href.endsWith("-" + id.slice(9)),
            ),
          ),
        ids,
        { timeout: 15000, polling: 100 },
      );
      const links = await page
        .locator("a.serp-grid__item[href]")
        .evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLAnchorElement).href),
        );
      for (const item of grid.content) {
        const suffix = item.id.slice(9);
        const url = links.find(
          (u) =>
            /^https:\/\/www\.onepa\.gov\.sg\/events\/[a-zA-Z0-9-]+$/.test(u) &&
            (u.endsWith("-e" + suffix) || u.endsWith("-" + suffix)),
        );
        if (!url) throw Error("Source identity unavailable");
        result.push({
          product: {
            ...item,
            ID: item.id,
            Name: item.name,
            Active: item.active,
            Description: item.description,
          },
          url,
        });
      }
      completed.set(grid.offset, grid);
      if (signal.aborted) throw Error("Source unavailable");
      if (grid.offset + grid.content.length >= grid.total_item) break;
    }
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await browser.close().catch(() => {});
  }
}
