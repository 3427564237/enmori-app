/// <reference lib="dom" />
import { chromium, type Browser } from "playwright";
const pageHosts = new Set([
  "ticketmaster.sg",
  "www.ticketmaster.sg",
  "www1.ticketmaster.sg",
  "www.onepa.gov.sg",
]);
const resourceHosts = new Set([
  ...pageHosts,
  "static.ticketmaster.sg",
  "s1.ticketm.net",
  "challenges.cloudflare.com",
  "www.gstatic.com",
  "www.googletagmanager.com",
  "global.ketchcdn.com",
  "cdnjs.cloudflare.com",
  "cdn.ketchjs.com",
  "recaptcha.net",
  "www.recaptcha.net",
  "securepubads.g.doubleclick.net",
]);
export function permittedBrowserResource(
  raw: string,
  mainNavigation: boolean,
): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      resourceHosts.has(u.hostname) &&
      (!mainNavigation || permittedPublicPage(raw))
    );
  } catch {
    return false;
  }
}
export function permittedPublicPage(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      pageHosts.has(u.hostname) &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.hash &&
      !/login|account|cart|checkout|payment/i.test(u.pathname) &&
      !Array.from(u.searchParams.keys()).some((k) =>
        /token|key|secret|password/i.test(k),
      )
    );
  } catch {
    return false;
  }
}
export async function publicText(
  url: string,
  signal: AbortSignal,
  limit = 2_500_000,
): Promise<string> {
  if (!permittedPublicPage(url)) throw Error("Source URL invalid");
  const r = await fetch(url, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    headers: {
      "User-Agent": "ENMORI classroom activity integration",
      Accept: "text/html,application/xml",
    },
  });
  if (!r.ok || !r.body) {
    await r.body?.cancel();
    throw Error("Source unavailable");
  }
  const reader = r.body.getReader();
  let n = 0,
    s = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    for (;;) {
      const x = await reader.read();
      if (x.done) break;
      n += x.value.length;
      if (n > limit) throw Error("Source too large");
      s += decoder.decode(x.value, { stream: true });
    }
    return s + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function plain(value: unknown, max = 30000): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:p|div|br|li|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, v) =>
      Number(v) <= 0x10ffff ? String.fromCodePoint(Number(v)) : "",
    )
    .replace(/[\t\r ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  if (
    !s ||
    !s.isWellFormed() ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069<>]/u.test(s)
  )
    return undefined;
  return [...s].slice(0, max).join("");
}
export const excerpt = (value: string) =>
  [
    ...value
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?。！？])\s+/)
      .slice(0, 2)
      .join(" "),
  ]
    .slice(0, 1000)
    .join("");
/** DOM innerText is already text, not HTML. Preserve literal comparison/arrow
 * glyphs without dropping the entire description or treating them as tags. */
export function renderedText(value: unknown, max = 30000): string | undefined {
  return typeof value === "string"
    ? plain(value.replace(/</g, "＜").replace(/>/g, "＞"), max)
    : undefined;
}
export interface PublicPage {
  url: string;
  title: string;
  text: string;
  description?: string;
  links: string[];
  cover?: string;
  occurrenceRows?: string[][];
  sections: { heading: string; text: string }[];
}
/** No login, storageState, CAPTCHA handling, persistent profile or private API. */
export class PublicEventBrowser {
  private browser: Promise<Browser> | undefined;
  private active = 0;
  async read(url: string, signal: AbortSignal): Promise<PublicPage> {
    if (!permittedPublicPage(url) || signal.aborted)
      throw Error("Source unavailable");
    if (this.active >= 2) throw Error("Source busy");
    this.active++;
    let context;
    try {
      const browser = await (this.browser ??= chromium.launch({
        // The provider renders its public page in ordinary desktop Chromium.
        // No fingerprint overrides or user profile are used.
        headless: false,
        args: ["--start-minimized"],
        timeout: 10000,
      }));
      context = await browser.newContext({
        serviceWorkers: "block",
        acceptDownloads: false,
      });
    } catch {
      this.active--;
      if (this.active === 0) await this.close().catch(() => {});
      throw Error("Source unavailable");
    }
    const abort = () => {
      void context.close().catch(() => {});
    };
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 10000);
    try {
      await context.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (
          !permittedBrowserResource(
            u.href,
            route.request().isNavigationRequest() &&
              route.request().frame().parentFrame() === null,
          ) ||
          ["media", "font"].includes(route.request().resourceType())
        )
          return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      let target = url;
      if (new URL(url).hostname.endsWith("ticketmaster.sg")) {
        // Use the provider's linked information page, never a guessed rewrite
        // of a booking URL. The homepage also completes normal page bootstrap.
        await page.goto("https://ticketmaster.sg/", {
          waitUntil: "domcontentloaded",
          timeout: 8000,
        });
        await page
          .locator('a[href*="/activity/detail/"]')
          .first()
          .waitFor({ state: "attached", timeout: 8000 });
        const booking = new URL(url).pathname.match(
          /^\/ticket\/area\/([A-Za-z0-9_-]+)\//,
        );
        if (booking) {
          const links = await page
            .locator('a[href*="/activity/detail/"]')
            .evaluateAll((nodes) =>
              nodes.map((n) => (n as HTMLAnchorElement).href),
            );
          const discovered = links.find(
            (link) =>
              permittedPublicPage(link) &&
              new URL(link).pathname === `/activity/detail/${booking[1]}`,
          );
          if (discovered) target = discovered;
          else {
            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 8000,
            });
            await page
              .locator('a[href*="/activity/detail/"]')
              .first()
              .waitFor({ state: "attached", timeout: 8000 });
            const linked = await page
              .locator('a[href*="/activity/detail/"]')
              .evaluateAll((nodes) =>
                nodes.map((n) => (n as HTMLAnchorElement).href),
              );
            const detail = linked.find(
              (link) =>
                permittedPublicPage(link) &&
                new URL(link).pathname === `/activity/detail/${booking[1]}`,
            );
            if (!detail) throw Error("Information URL unavailable");
            target = detail;
          }
        }
      }
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 8000 });
      // Public pages may render after an initial non-200 bootstrap response.
      // Only real content on an allowed final URL establishes successful read.
      await page
        .locator("#activityContent")
        .waitFor({ state: "visible", timeout: 8000 });
      const value = (await page.evaluate(
        `(() => {const body=document.querySelector('#activityContent');const sections=[];for(const heading of document.querySelectorAll('h2,h3')){if(!/pricing|admission|accessib|faq|entry|condition|refund|ways to buy|^other$/i.test(heading.textContent||''))continue;let text='';let n=heading.nextElementSibling;while(n&&!/^H[123]$/.test(n.tagName)&&text.length<12000){text+='\\n'+(n.innerText||'');n=n.nextElementSibling;}if(text.trim())sections.push({heading:heading.textContent.trim(),text:text.trim().slice(0,12000)});}return {url:location.href,title:document.title,text:document.body.innerText.slice(0,60000),description:body?.innerText,links:[...document.querySelectorAll('a[href]')].map(a=>a.href),cover:document.querySelector('meta[property="og:image"]')?.content,occurrenceRows:[...document.querySelectorAll('table tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.innerText.trim())).filter(r=>r.length===4),sections:sections.slice(0,12)};})()`,
      )) as PublicPage;
      if (
        !permittedPublicPage(value.url) ||
        /just a moment|access denied|one moment please/i.test(value.title) ||
        signal.aborted
      )
        throw Error("Source unavailable");
      return value;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      await context.close().catch(() => {});
      if (--this.active === 0) await this.close().catch(() => {});
    }
  }
  async close() {
    const b = this.browser;
    this.browser = undefined;
    await (await b)?.close();
  }
}
