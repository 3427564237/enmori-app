import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import type { Browser, Response } from "playwright";
import { readOnePaCatalogue } from "../../src/event-browse/infrastructure/onepa-public-catalogue.js";

function grid(offset: number) {
  return { entity: "product", type: "content_grid", offset, limit: 10, total_item: 20,
    content: Array.from({ length: 10 }, (_, i) => ({ id: `PA-Event-${10000000 + offset + i}`, name: "Synthetic event", active: true })) };
}
function fake(responses: readonly (readonly unknown[])[], options: { missingLinks?: boolean } = {}) {
  let index = -1, closed = 0, next = 0;
  let predicate!: (response: Response) => boolean | Promise<boolean>;
  let resolve!: (response: Response) => void, reject!: (error: Error) => void;
  const rendered: string[][] = [];
  const emit = async () => {
    for (const value of responses[++index] ?? []) {
      const response = { url: () => "https://www.onepa.gov.sg/-api/search/query", status: () => 201,
        body: async () => Buffer.from(JSON.stringify({ widgets: [value] })) } as unknown as Response;
      try { if (await predicate(response)) { resolve(response); return; } }
      catch (error) { reject(error as Error); return; }
    }
  };
  const page = {
    waitForResponse: (match: typeof predicate) => { predicate = match; return new Promise<Response>((yes, no) => { resolve = yes; reject = no; }); },
    goto: async () => { void emit(); },
    getByRole: (role: string, selector: { name: string; exact: boolean }) => {
      assert.equal(role, "link"); assert.deepEqual(selector, { name: "Next Page", exact: true });
      return { click: async () => { next++; void emit(); } };
    },
    waitForFunction: async (_fn: unknown, ids: string[]) => { rendered.push(ids); },
    locator: () => ({ evaluateAll: async () => options.missingLinks ? [] : grid(index * 10).content.map(p => `https://www.onepa.gov.sg/events/synthetic-${p.id.slice(9)}`) }),
  };
  const browser = {
    newContext: async () => ({ route: async () => {}, newPage: async () => page }),
    close: async () => { closed++; reject?.(Error("Browser closed")); },
  } as unknown as Browser;
  return { launch: async () => browser, state: () => ({ closed, next, rendered }) };
}

test("a delayed exact duplicate of the completed page cannot become the Next Page response", async () => {
  const browser = fake([[grid(0)], [grid(0), grid(10)]]);
  const rows = await readOnePaCatalogue(new AbortController().signal, browser.launch);
  assert.equal(rows.length, 20);
  assert.equal(new Set(rows.map(row => (row.product as { ID: string }).ID)).size, 20);
  assert.deepEqual(browser.state().rendered, [grid(0).content.map(p => p.id), grid(10).content.map(p => p.id)]);
  assert.equal(browser.state().closed, 1);
  assert.equal(browser.state().next, 1);
});

test("unexpected offsets, changed old identities and malformed target pages still fail closed", async () => {
  const changed = grid(0); changed.content[0]!.id = "PA-Event-99999999";
  const duplicate = grid(10); duplicate.content[1]!.id = duplicate.content[0]!.id;
  const invalid = grid(10); invalid.content[0]!.id = "not-an-event";
  for (const wrong of [grid(20), changed, duplicate, invalid, { ...grid(10), limit: 20 }, { ...grid(10), total_item: "20" }]) {
    const browser = fake([[grid(0)], [wrong, grid(10)]]);
    await assert.rejects(readOnePaCatalogue(new AbortController().signal, browser.launch), /Source format changed/);
    assert.equal(browser.state().closed, 1);
    assert.equal(browser.state().rendered.length, 1);
  }
});

test("valid target response IDs still require the provider's matching rendered event links", async () => {
  const browser = fake([[grid(0)]], { missingLinks: true });
  await assert.rejects(readOnePaCatalogue(new AbortController().signal, browser.launch), /Source identity unavailable/);
  assert.equal(browser.state().closed, 1);
});

test("cancellation while only old-page responses arrive closes the reader without publishing a partial catalogue", async () => {
  const browser = fake([[grid(0)], [grid(0)]]), caller = new AbortController();
  const work = readOnePaCatalogue(caller.signal, browser.launch);
  while (browser.state().next === 0) await setImmediate();
  caller.abort();
  await assert.rejects(work);
  assert(browser.state().closed >= 1);
  assert.equal(browser.state().rendered.length, 1);
});
