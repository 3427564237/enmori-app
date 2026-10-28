/// <reference lib="dom" />
import { chromium, type Browser } from "playwright";
const pageHosts = new Set([
  "ticketmaster.sg",
  "www.ticketmaster.sg",
  "www1.ticketmaster.sg",
  "www.onepa.gov.sg",
]);
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
export interface PublicPage {
  url: string;
  title: string;
  text: string;
  description?: string;
  links: string[];
  cover?: string;
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
        headless: true,
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
          u.protocol !== "https:" ||
          ![
            "ticketmaster.sg",
            "www.ticketmaster.sg",
            "www1.ticketmaster.sg",
            "static.ticketmaster.sg",
            "s1.ticketm.net",
            "www.onepa.gov.sg",
            "challenges.cloudflare.com",
          ].includes(u.hostname) ||
          ["media", "font"].includes(route.request().resourceType())
        )
          return route.abort();
        if (
          route.request().isNavigationRequest() &&
          !permittedPublicPage(u.href)
        )
          return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 8000,
      });
      if (!response?.ok()) throw Error("Source unavailable");
      await page
        .locator("#activityContent")
        .waitFor({ timeout: 2000 })
        .catch(() => {});
      const value = (await page.evaluate(
        `(() => {const body=document.querySelector('#activityContent');const sections=[];for(const heading of document.querySelectorAll('h2,h3')){if(!/pricing|admission|accessib|faq|entry|condition/i.test(heading.textContent||''))continue;let text='';let n=heading.nextElementSibling;while(n&&!/^H[123]$/.test(n.tagName)&&text.length<12000){text+='\\n'+(n.innerText||'');n=n.nextElementSibling;}if(text.trim())sections.push({heading:heading.textContent.trim(),text:text.trim().slice(0,12000)});}return {url:location.href,title:document.title,text:document.body.innerText.slice(0,60000),description:body?.innerText,links:[...document.querySelectorAll('a[href]')].map(a=>a.href),cover:document.querySelector('meta[property="og:image"]')?.content,sections:sections.slice(0,12)};})()`,
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
