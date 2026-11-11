import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import type { Browser } from "playwright";
import { OnePaPublicReader } from "../../src/event-browse/infrastructure/onepa-public-reader.js";
const sitemap = "https://www.onepa.gov.sg/sitemap.xml";
function fake(
  options: { text?: string; finalUrl?: string; wait?: Promise<void> } = {},
) {
  const state = { launches: 0, contextsClosed: 0, browsersClosed: 0 };
  const browser = {
    newContext: async () => ({
      route: async () => {},
      newPage: async () => ({
        goto: async () => {},
        waitForFunction: async (
          _fn: unknown,
          xml: boolean,
          settings: { polling: number },
        ) => {
          assert.equal(settings.polling, 100);
          await options.wait;
          return {
            jsonValue: async () =>
              options.text ??
              (xml
                ? "<loc>\n https://www.onepa.gov.sg/sitemap/sitemap-event.xml?rev=observed\n </loc>"
                : '{"props":{}}'),
            dispose: async () => {},
          };
        },
        url: () => options.finalUrl ?? sitemap,
        locator: () => ({
          innerText: async () =>
            options.text ??
            "<loc>\n https://www.onepa.gov.sg/sitemap/sitemap-event.xml?rev=observed\n </loc>",
          textContent: async () => options.text ?? '{"props":{}}',
        }),
      }),
      close: async () => {
        state.contextsClosed++;
      },
    }),
    close: async () => {
      state.browsersClosed++;
    },
  } as unknown as Browser;
  return {
    state,
    reader: new OnePaPublicReader(
      async () => {
        state.launches++;
        return browser;
      },
      async () => "",
    ),
  };
}
test("onePA public renderer rejects non-provider and private navigation before launching", async () => {
  const { reader, state } = fake();
  for (const url of [
    "https://evil.example/sitemap.xml",
    "https://ticketmaster.sg/",
    "https://www.onepa.gov.sg/account",
    "http://www.onepa.gov.sg/sitemap.xml",
  ])
    await assert.rejects(reader.read(url, new AbortController().signal));
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(reader.read(sitemap, abort.signal));
  assert.equal(state.launches, 0);
});
test("XML viewer whitespace preserves observed URLs and closes the ephemeral browser", async () => {
  const { reader, state } = fake();
  assert.equal(
    await reader.read(sitemap, new AbortController().signal),
    "<urlset><loc>https://www.onepa.gov.sg/sitemap/sitemap-event.xml?rev=observed</loc></urlset>",
  );
  assert.deepEqual(state, {
    launches: 1,
    contextsClosed: 1,
    browsersClosed: 1,
  });
});
test("public event JSON is handed to the existing onePA projector without retaining unrelated page content", async () => {
  const url = "https://www.onepa.gov.sg/events/synthetic-12345678";
  const { reader } = fake({ text: '{"props":{"public":true}}', finalUrl: url });
  assert.equal(
    await reader.read(url, new AbortController().signal),
    '<script id="__NEXT_DATA__">{"props":{"public":true}}</script>',
  );
});
test("four concurrent public reads share one browser; a fifth fails without an unbounded queue", async () => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { reader, state } = fake({ wait });
  const work = Array.from({ length: 4 }, () =>
    reader.read(sitemap, new AbortController().signal),
  );
  await assert.rejects(reader.read(sitemap, new AbortController().signal));
  release();
  await Promise.all(work);
  assert.deepEqual(state, {
    launches: 1,
    contextsClosed: 4,
    browsersClosed: 1,
  });
});
test("challenge, oversized and redirected content cannot become successful source data", async () => {
  for (const options of [
    { text: "browser verification required" },
    { text: "x".repeat(2500001) },
    { finalUrl: "https://evil.example/sitemap.xml" },
  ]) {
    const { reader, state } = fake(options);
    await assert.rejects(reader.read(sitemap, new AbortController().signal));
    assert.equal(state.contextsClosed, 1);
    assert.equal(state.browsersClosed, 1);
  }
});
test("already complete public payloads do not launch Chromium", async () => {
  let launches = 0;
  const reader = new OnePaPublicReader(
    async () => {
      launches++;
      throw Error("must not launch");
    },
    async () =>
      "<urlset><loc>https://www.onepa.gov.sg/events/synthetic-12345678</loc></urlset>",
  );
  assert.match(
    await reader.read(sitemap, new AbortController().signal),
    /<loc>/,
  );
  assert.equal(launches, 0);
});

test("cancellation during launch rejects promptly and closes the late browser without opening a context", { timeout: 1000 }, async () => {
  let release!: (browser: Browser) => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const launched = new Promise<Browser>(resolve => { release = resolve; });
  let closed = 0, contexts = 0;
  const browser = {
    newContext: async () => { contexts++; throw Error("must not initialize after cancellation"); },
    close: async () => { closed++; },
  } as unknown as Browser;
  const reader = new OnePaPublicReader(() => { started(); return launched; }, async () => "");
  const caller = new AbortController();
  const read = reader.read(sitemap, caller.signal);
  await entered;
  caller.abort();
  try {
    await assert.rejects(read, /Source unavailable/);
    await assert.rejects(reader.read(sitemap, new AbortController().signal), /Source unavailable/);
    assert.equal(closed, 0, "cleanup cannot claim the still-pending launch has closed");
  } finally { release(browser); }
  await setImmediate();
  assert.equal(contexts, 0);
  assert.equal(closed, 1);
});

test("cancellation during context initialization closes the sole browser and fences admission until cleanup", { timeout: 1000 }, async () => {
  let entered!: () => void, rejectContext!: (error: Error) => void, finishClose!: () => void;
  const contextStarted = new Promise<void>(resolve => { entered = resolve; });
  const context = new Promise<never>((_, reject) => { rejectContext = reject; });
  const closing = new Promise<void>(resolve => { finishClose = resolve; });
  let launches = 0, closes = 0;
  const browser = {
    newContext: () => { entered(); return context; },
    close: async () => { closes++; rejectContext(Error("Browser closed")); await closing; },
  } as unknown as Browser;
  const reader = new OnePaPublicReader(async () => { launches++; return browser; }, async () => "");
  const caller = new AbortController(), read = reader.read(sitemap, caller.signal);
  await contextStarted;
  caller.abort();
  try {
    await assert.rejects(read, /Source unavailable/);
    await setImmediate();
    assert.equal(closes, 1);
    await assert.rejects(reader.read(sitemap, new AbortController().signal), /Source unavailable/);
    assert.equal(launches, 1);
  } finally { finishClose(); }
  await setImmediate();
  await assert.rejects(reader.read(sitemap, new AbortController().signal));
  assert.equal(launches, 2, "a settled failed reader must not poison independent later reads");
});

test("one cancelled initialization cannot close a shared browser while another reader is live", { timeout: 1000 }, async () => {
  let finishHealthy!: () => void, secondStarted!: () => void, rejectSecond!: (error: Error) => void;
  const healthyReady = new Promise<void>(resolve => { finishHealthy = resolve; });
  const secondEntered = new Promise<void>(resolve => { secondStarted = resolve; });
  const second = new Promise<never>((_, reject) => { rejectSecond = reject; });
  let contexts = 0, closes = 0;
  const browser = {
    newContext: async () => {
      if (++contexts === 2) { secondStarted(); return second; }
      return {
        route: async () => {}, close: async () => {},
        newPage: async () => ({
          goto: async () => {}, url: () => sitemap,
          waitForFunction: async () => {
            await healthyReady;
            return { jsonValue: async () => "<loc>https://www.onepa.gov.sg/sitemap.xml</loc>", dispose: async () => {} };
          },
        }),
      };
    },
    close: async () => { closes++; rejectSecond(Error("Browser closed")); },
  } as unknown as Browser;
  const reader = new OnePaPublicReader(async () => browser, async () => "");
  const healthy = reader.read(sitemap, new AbortController().signal);
  const caller = new AbortController(), cancelled = reader.read(sitemap, caller.signal);
  await secondEntered;
  caller.abort();
  try {
    await assert.rejects(cancelled, /Source unavailable/);
    assert.equal(closes, 0);
  } finally { finishHealthy(); }
  assert.match(await healthy, /<loc>/);
  await setImmediate();
  assert.equal(closes, 1);
});
