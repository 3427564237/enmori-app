/// <reference lib="dom" />
import { chromium, type Browser, type BrowserContext } from "playwright";
import {
  permittedBrowserResource,
  permittedPublicPage,
  publicText,
} from "./public-event-pages.js";

/** Ordinary public rendering, with no saved profile or challenge interaction. */
export class OnePaPublicReader {
  private browser: Promise<Browser> | undefined;
  private closing: Promise<void> | undefined;
  private readonly readers = new Set<AbortSignal>();
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
    if (signal.aborted || this.active >= 4 || this.closing)
      throw Error("Source unavailable");
    this.active++;
    this.readers.add(signal);
    let cancel!: () => void;
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => reject(Error("Source unavailable"));
    });
    // The caller stops waiting immediately, while render keeps ownership of
    // pending initialization and cleanup until it has actually settled.
    return Promise.race([this.render(url, signal, cancel), cancelled]);
  };
  private async render(url: string, signal: AbortSignal, cancel: () => void) {
    let context: BrowserContext | undefined;
    let contextClosing: Promise<void> | undefined;
    const closeContext = () => context
      ? (contextClosing ??= context.close().catch(() => {}))
      : Promise.resolve();
    const abort = () => {
      cancel();
      void closeContext();
      // Initializing a context cannot be cancelled separately in Playwright.
      // Close the browser only after every shared reader has lost authority;
      // an independent live reader must not be interrupted by another caller.
      if ([...this.readers].every((reader) => reader.aborted)) void this.close();
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) { abort(); throw Error("Source unavailable"); }
      const browser = await (this.browser ??= Promise.resolve().then(() => this.launch()));
      if (signal.aborted) throw Error("Source unavailable");
      context = await browser.newContext({
        serviceWorkers: "block",
        acceptDownloads: false,
      });
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
      await closeContext();
      signal.removeEventListener("abort", abort);
      this.readers.delete(signal);
      if (--this.active === 0) {
        await this.close();
        this.browser = undefined;
        this.closing = undefined;
      } else if ([...this.readers].every((reader) => reader.aborted)) {
        void this.close();
      }
    }
  }
  private close(): Promise<void> {
    return this.closing ??= (async () => {
      await (await this.browser)?.close();
    })().catch(() => {});
  }
}
