/// <reference lib="dom" />
import { chromium } from "playwright";
import { permittedBrowserResource } from "./public-event-pages.js";
export interface OnePaListItem {
  readonly product: unknown;
  readonly url: string;
}
/** Read the provider's anonymous, rendered search list; never fan out to
 * individual details. The provider's own Next Page action supplies pagination. */
export async function readOnePaCatalogue(
  signal: AbortSignal,
): Promise<readonly OnePaListItem[]> {
  if (signal.aborted) throw Error("Source unavailable");
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-minimized"],
    timeout: 10000,
  });
  const abort = () => {
    void browser.close().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 20000);
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
    const response = () =>
      page.waitForResponse(
        (r) =>
          new URL(r.url()).origin === "https://www.onepa.gov.sg" &&
          new URL(r.url()).pathname === "/-api/search/query" &&
          r.status() === 201,
        { timeout: 10000 },
      );
    for (let index = 0; index < 5; index++) {
      const pending = response();
      // Observe the rejection even if navigation/action fails first.
      void pending.catch(() => {});
      if (index === 0)
        await page.goto("https://www.onepa.gov.sg/events/search", {
          waitUntil: "domcontentloaded",
          timeout: 8000,
        });
      else
        await page
          .getByRole("link", { name: "Next Page", exact: true })
          .click({ timeout: 5000 });
      const payload = await (await pending).body();
      if (payload.length > 2500000) throw Error("Source too large");
      const raw = JSON.parse(payload.toString("utf8"));
      const grid = raw.widgets?.find(
        (w: any) => w.entity === "product" && w.type === "content_grid",
      );
      if (
        !grid ||
        grid.offset !== index * 10 ||
        grid.limit !== 10 ||
        !Array.isArray(grid.content) ||
        grid.content.length > 10 ||
        !Number.isSafeInteger(grid.total_item) ||
        grid.total_item < 0
      )
        throw Error("Source format changed");
      if (grid.content.length === 0) break;
      const ids = grid.content.map((p: any) => p.id);
      if (
        ids.some(
          (id: unknown) => typeof id !== "string" || !/^PA-Event-\d+$/.test(id),
        )
      )
        throw Error("Source format changed");
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
        { timeout: 5000, polling: 100 },
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
