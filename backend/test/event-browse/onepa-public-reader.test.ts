import test from "node:test";
import assert from "node:assert/strict";
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
