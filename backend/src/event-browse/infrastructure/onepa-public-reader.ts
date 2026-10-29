/// <reference lib="dom" />
import { chromium, type Browser } from "playwright";
import {
  permittedBrowserResource,
  permittedPublicPage,
  publicText,
} from "./public-event-pages.js";

/** Ordinary public rendering, with no saved profile or challenge interaction. */
export class OnePaPublicReader {
  private browser: Promise<Browser> | undefined;
  private active = 0;
  constructor(
    private readonly launch: () => Promise<Browser> = () =>
      chromium.launch({
        headless: false,
        args: ["--start-minimized"],
        timeout: 10000,
      }),
    private readonly readStatic: (
      url: string,
      signal: AbortSignal,
    ) => Promise<string> = publicText,
  ) {}
  readonly read = async (url: string, signal: AbortSignal): Promise<string> => {
    signal = AbortSignal.any([signal, AbortSignal.timeout(20000)]);
    if (
      !permittedPublicPage(url) ||
      new URL(url).hostname !== "www.onepa.gov.sg" ||
      signal.aborted
    )
      throw Error("Source unavailable");
    // Most public pages already contain the complete payload. Render only
    // when the normal response requires a browser, with no retry loop.
    try {
      const value = await this.readStatic(url, signal);
      const expected = new URL(url).pathname.endsWith(".xml")
        ? /<loc>[^<]+<\/loc>/.test(value)
        : /<script id="__NEXT_DATA__"[^>]*>/.test(value);
      if (expected && !signal.aborted) return value;
    } catch {
      /* A bounded normal-rendering attempt follows below. */
    }
    if (signal.aborted || this.active >= 4) throw Error("Source unavailable");
    this.active++;
    let context;
    try {
      const browser = await (this.browser ??= this.launch());
      context = await browser.newContext({
        serviceWorkers: "block",
        acceptDownloads: false,
      });
    } catch {
      if (--this.active === 0) await this.close().catch(() => {});
      throw Error("Source unavailable");
    }
    const abort = () => {
      void context.close().catch(() => {});
    };
    const timer = setTimeout(abort, 20000);
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) throw Error("Source unavailable");
      await context.route("**/*", (route) => {
        const request = route.request();
        return !permittedBrowserResource(
          request.url(),
          request.isNavigationRequest() &&
            request.frame().parentFrame() === null,
        ) || ["image", "media", "font"].includes(request.resourceType())
          ? route.abort()
          : route.continue();
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const xml = new URL(url).pathname.endsWith(".xml");
      // Several headed pages may be occluded. Readiness cannot depend on
      // animation frames, which Chromium may suspend for those pages.
      const ready = await page.waitForFunction(
        (xml) =>
          xml
            ? document.body?.innerText.includes("<loc>") &&
              document.body.innerText
            : document.querySelector("script#__NEXT_DATA__")?.textContent,
        xml,
        { timeout: 10000, polling: 100 },
      );
      const value = await ready.jsonValue();
      await ready.dispose();
      if (
        !permittedPublicPage(page.url()) ||
        new URL(page.url()).hostname !== "www.onepa.gov.sg" ||
        signal.aborted
      )
        throw Error("Source unavailable");
      if (
        typeof value !== "string" ||
        !value ||
        Buffer.byteLength(value) > 2500000
      )
        throw Error("Source unavailable");
      if (!xml) return `<script id="__NEXT_DATA__">${value}</script>`;
      // Chromium's XML viewer adds layout whitespace around the original nodes.
      const links = [...value.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(
        (m) => m[1]!.trim(),
      );
      if (!links.length) throw Error("Source unavailable");
      return `<urlset>${links.map((link) => `<loc>${link}</loc>`).join("")}</urlset>`;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      await context.close().catch(() => {});
      if (--this.active === 0) await this.close().catch(() => {});
    }
  };
  private async close() {
    const browser = this.browser;
    this.browser = undefined;
    await (await browser)?.close();
  }
}
