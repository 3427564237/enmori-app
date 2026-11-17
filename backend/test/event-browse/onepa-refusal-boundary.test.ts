import assert from "node:assert/strict";
import test from "node:test";
import type { Browser } from "playwright";
import { OnePaPublicReader } from "../../src/event-browse/infrastructure/onepa-public-reader.js";
import { publicText } from "../../src/event-browse/infrastructure/public-event-pages.js";

const url = "https://www.onepa.gov.sg/events/synthetic-9912345678";
const payload = '{"props":{"synthetic":true}}';
const signal = () => new AbortController().signal;

function browserFixture(status = 200) {
  const calls = { launches: 0, navigation: 0, readiness: 0, contextsClosed: 0, browsersClosed: 0 };
  const browser = {
    newContext: async () => ({
      route: async () => {},
      newPage: async () => ({
        goto: async () => { calls.navigation++; return { status: () => status }; },
        waitForFunction: async () => {
          calls.readiness++;
          return { jsonValue: async () => payload, dispose: async () => {} };
        },
        url: () => url,
      }),
      close: async () => { calls.contextsClosed++; },
    }),
    close: async () => { calls.browsersClosed++; },
  } as unknown as Browser;
  return { calls, launch: async () => { calls.launches++; return browser; } };
}

for (const status of [403, 429]) {
  for (const body of ["cancelled", "cancel-rejected", "absent"] as const) {
    test(`onePA static ${status} with body ${body} rejects without rendering or retry`, async (t) => {
      const f = browserFixture();
      let fetches = 0, cancellations = 0;
      t.mock.method(globalThis, "fetch", async (input: unknown) => {
        assert.equal(input, url);
        fetches++;
        return {
          ok: false, status,
          body: body === "absent" ? null : {
            cancel: async () => {
              cancellations++;
              if (body === "cancel-rejected") throw Error("Synthetic cancellation failure");
            },
          },
        } as unknown as Response;
      });
      const reader = new OnePaPublicReader(f.launch, publicText);
      await assert.rejects(reader.read(url, signal()), { message: "Source unavailable" });
      assert.equal(fetches, 1);
      assert.equal(cancellations, body === "absent" ? 0 : 1);
      assert.deepEqual(f.calls, {
        launches: 0, navigation: 0, readiness: 0, contextsClosed: 0, browsersClosed: 0,
      });
    });
  }

  test(`onePA navigation ${status} rejects before readiness and completes resource cleanup`, async () => {
    const f = browserFixture(status);
    const reader = new OnePaPublicReader(f.launch, async () => "<html>Ordinary render needed</html>");
    await assert.rejects(reader.read(url, signal()), { message: "Source unavailable" });
    assert.deepEqual(f.calls, {
      launches: 1, navigation: 1, readiness: 0, contextsClosed: 1, browsersClosed: 1,
    });
  });
}

test("onePA complete static public payload bypasses rendering and cancels its consumed body", async (t) => {
  const f = browserFixture();
  let reads = 0, cancellations = 0, releases = 0, fetches = 0;
  const html = `<script id="__NEXT_DATA__">${payload}</script>`;
  t.mock.method(globalThis, "fetch", async () => {
    fetches++;
    return {
      ok: true, status: 200,
      body: { getReader: () => ({
        read: async () => ++reads === 1
          ? { done: false, value: new TextEncoder().encode(html) }
          : { done: true },
        cancel: async () => { cancellations++; },
        releaseLock: () => { releases++; },
      }) },
    } as unknown as Response;
  });
  assert.equal(await new OnePaPublicReader(f.launch, publicText).read(url, signal()), html);
  assert.equal(fetches, 1);
  assert.equal(cancellations, 1);
  assert.equal(releases, 1);
  assert.equal(f.calls.launches, 0);
});

for (const status of [200, 401]) {
  test(`onePA ordinary navigation ${status} retains bounded rendering and cleanup`, async () => {
    const f = browserFixture(status);
    const reader = new OnePaPublicReader(f.launch, async () => "<html>Ordinary render needed</html>");
    assert.equal(await reader.read(url, signal()), `<script id="__NEXT_DATA__">${payload}</script>`);
    assert.deepEqual(f.calls, {
      launches: 1, navigation: 1, readiness: 1, contextsClosed: 1, browsersClosed: 1,
    });
  });
}

test("onePA non-refusal static failure retains its ordinary rendering path", async (t) => {
  const f = browserFixture();
  let cancellations = 0;
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false, status: 401,
    body: { cancel: async () => { cancellations++; } },
  }) as unknown as Response);
  assert.equal(
    await new OnePaPublicReader(f.launch, publicText).read(url, signal()),
    `<script id="__NEXT_DATA__">${payload}</script>`,
  );
  assert.equal(cancellations, 1);
  assert.equal(f.calls.launches, 1);
  assert.equal(f.calls.readiness, 1);
  assert.equal(f.calls.contextsClosed, 1);
  assert.equal(f.calls.browsersClosed, 1);
});
