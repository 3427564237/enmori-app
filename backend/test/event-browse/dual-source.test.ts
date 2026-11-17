import { legacyBrowse } from "../../src/event-browse/transport/legacy-browse.js";
import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import {
  projectOnePa,
  onePaInstant,
  OnePaBrowseSource,
} from "../../src/event-browse/infrastructure/onepa-browse-source.js";
import { CombinedEventSource } from "../../src/event-browse/infrastructure/combined-event-source.js";
import { browseId } from "../../src/event-browse/domain/browse-values.js";
import { sourceEventId } from "../../src/event-browse/domain/source-event-id.js";
import { EnrichedTicketmasterSource } from "../../src/event-browse/infrastructure/enriched-ticketmaster-source.js";
import type { PublicEventBrowser } from "../../src/event-browse/infrastructure/public-event-pages.js";
import {
  permittedBrowserResource,
  publicPageCover,
  renderedText,
} from "../../src/event-browse/infrastructure/public-event-pages.js";
const url = "https://www.onepa.gov.sg/events/synthetic-12345678",
  asOf = "2026-10-28T00:00:00.000Z";
test("official cover metadata supports the provider's name and property variants", () => {
  const named = {
    name: "og:image",
    property: null,
    content: "https://static.ticketmaster.sg/official.jpg",
  };
  assert.equal(publicPageCover([named]), named.content);
  const property = {
    name: null,
    property: "og:image",
    content: "https://static.ticketmaster.sg/legacy.jpg",
  };
  assert.equal(publicPageCover([named, property]), property.content);
  assert.equal(
    publicPageCover([
      { name: "description", property: null, content: "Not a cover" },
    ]),
    undefined,
  );
  assert.equal(publicPageCover([{ ...named, content: "  " }]), undefined);
});
test("rendered source arrows and comparisons cannot erase a complete description", () => {
  assert.equal(
    renderedText("First paragraph.\n\nMore details>>\nAge < 12; adults > 18."),
    "First paragraph.\n\nMore details＞＞\nAge ＜ 12; adults ＞ 18.",
  );
  assert.equal(renderedText("bad\u0000control"), undefined);
});
test("public renderer permits required embedded assets without granting top-level account or arbitrary-host navigation", () => {
  assert.equal(
    permittedBrowserResource(
      "https://recaptcha.net/recaptcha/api2/anchor",
      false,
    ),
    true,
  );
  assert.equal(
    permittedBrowserResource(
      "https://recaptcha.net/recaptcha/api2/anchor",
      true,
    ),
    false,
  );
  for (const u of [
    "http://ticketmaster.sg/",
    "https://ticketmaster.sg:9443/",
    "https://127.0.0.1/",
    "https://evil.example/",
    "https://name:secret@ticketmaster.sg/",
  ])
    assert.equal(permittedBrowserResource(u, false), false);
  assert.equal(
    permittedBrowserResource("https://ticketmaster.sg/login", true),
    false,
  );
  assert.equal(
    permittedBrowserResource(
      "https://ticketmaster.sg/activity/detail/synthetic",
      true,
    ),
    true,
  );
});
test("TM full content preserves official detail and exact booking URLs, pricing, admission and source paragraphs", async () => {
  let reads = 0;
  const booking = "https://ticketmaster.sg/ticket/area/synthetic/123";
  const row = {
    browseId: browseId("synthetic")!,
    title: "Synthetic show",
    startAt: "2026-11-02T12:00:00Z",
    locationLabel: "Synthetic Theatre",
    externalSourceUrl: booking,
  };
  const source = new EnrichedTicketmasterSource(
    { firstBatch: async () => [row], detail: async () => row },
    {
      read: async () => {
        reads++;
        return {
          url: "https://ticketmaster.sg/activity/detail/synthetic",
          title: row.title,
          text: "",
          description: "First paragraph.\n\nSecond paragraph.",
          links: ["https://ticketmaster.sg/activity/detail/unrelated", booking],
          sections: [
            {
              heading: "Ticket Pricing",
              text: "CAT 1: $248\nCAT 2: $128\nApplicable booking fees are not included.",
            },
            {
              heading: "Admission Policy",
              text: "There will be no admission for infants in arms and children below 6 years old.",
            },
          ],
        };
      },
    } as unknown as PublicEventBrowser,
  );
  const result = await source.detail(
    row.browseId,
    asOf,
    new AbortController().signal,
  );
  assert.equal(
    result?.content?.fullDescription,
    "First paragraph.\n\nSecond paragraph.",
  );
  assert.equal(result?.content?.bookingUrl, booking);
  assert.equal(
    result?.content?.detailUrl,
    "https://ticketmaster.sg/activity/detail/synthetic",
  );
  assert.equal(result?.content?.minimumAge, 6);
  assert.equal(result?.content?.priceLabel, "From $128 · booking fees extra");
  assert.equal(result?.content?.sections?.length, 2);
  assert.equal(
    reads,
    1,
    "unrelated information links must not trigger a second read",
  );
});
test("sold-out multi-session information binds the exact source group, local date, time and venue without a buy link", async () => {
  const row = {
    browseId: browseId("synthetic")!,
    title: "Synthetic show",
    startAt: "2026-12-19T11:00:00Z",
    locationLabel: "Synthetic Stadium",
    externalSourceUrl: "https://ticketmaster.sg/ticket/area/synthetic/222",
  };
  let cells = [
    [
      "17 Dec 2026 (Thu.) 07:00 pm",
      "Synthetic show",
      "Synthetic Stadium",
      "Sold Out",
    ],
  ];
  const reader = {
    read: async () => ({
      url: "https://ticketmaster.sg/activity/detail/synthetic",
      title: row.title,
      text: "",
      description: "Full show details.",
      links: [],
      sections: [],
      occurrenceRows: cells,
    }),
  } as unknown as PublicEventBrowser;
  const make = () =>
    new EnrichedTicketmasterSource(
      { firstBatch: async () => [row], detail: async () => row },
      reader,
    );
  assert.equal(
    (await make().detail(row.browseId, asOf, new AbortController().signal))
      ?.content?.fullDescription,
    undefined,
  );
  cells = [
    ...cells,
    [
      "19 Dec 2026 (Sat.) 07:00 pm",
      "Synthetic show",
      "Synthetic Stadium",
      "Sold Out",
    ],
  ];
  const matched = await make().detail(
    row.browseId,
    asOf,
    new AbortController().signal,
  );
  assert.equal(matched?.content?.fullDescription, "Full show details.");
  assert.equal(matched?.content?.status, "sold_out");
});
function payload() {
  const p = {
    ID: "PA-Event-12345678",
    Active: true,
    Name: "Synthetic workshop",
    xp: {
      Private: 0,
      Published: 1,
      InvitationOnly: 0,
      UsePassword: 0,
      ProductType: "Event",
      Timezone: "8.0",
      Event: { Id: 12345678 },
      StartDate: "2026-11-17T10:00:00+00:00",
      EndDate: "2026-11-17T11:30:00+00:00",
      TicketEndDate: "2026-11-16T11:30:00+00:00",
      XmcDescription: "<p>Only for Age 60 and above.</p><p>Bring tools.</p>",
      XmcVenue: "Example RN",
      Address: "Example Road",
      MapLat: 1.3759584,
      MapLng: 103.9360385,
    },
  };
  return {
    props: {
      pageProps: {
        page: {
          layout: {
            sitecore: { route: { fields: { currentProduct: { value: p } } } },
          },
        },
        componentProps: {
          details: {
            product: p,
            xmcEventDetails: { faq: "No fees. Please bring tools." },
          },
        },
      },
    },
  };
}
test("onePA wall time, explicit source age, paragraphs and namespace survive projection without invented vacancies", () => {
  const row = projectOnePa(payload(), url, asOf)!;
  assert.ok(row);
  assert.equal(row.startAt, "2026-11-17T02:00:00.000Z");
  assert.equal(row.content?.minimumAge, 60);
  assert.ok(row.content?.fullDescription?.includes("\n"));
  assert.equal(row.content?.areaCode, "PR");
  assert.equal(row.content?.registrationDeadline, "2026-11-16T03:30:00.000Z");
  assert.equal(row.content?.status, "unknown");
  assert.equal(row.coverImageUrl, undefined);
  assert.match(row.content!.priceLabel!, /Log in/);
  assert.match(sourceEventId(row.browseId), /^pa_event_/);
  assert.notEqual(
    sourceEventId(row.browseId),
    sourceEventId(browseId("PA-Event-12345678")!),
  );
  assert.equal(onePaInstant("2026-11-17"), undefined);
  assert.equal(onePaInstant("2026-02-30T10:00:00+00:00"), undefined);
  assert.equal(
    projectOnePa(payload(), url, "2026-11-16T04:00:00.000Z")!.content?.status,
    "registration_closed",
  );
  for (const key of ["Private", "InvitationOnly", "UsePassword"]) {
    const data = payload();
    (
      data.props.pageProps.page.layout.sitecore.route.fields.currentProduct
        .value.xp as Record<string, unknown>
    )[key] = 1;
    assert.equal(projectOnePa(data, url, asOf), undefined);
  }
  const other = payload();
  other.props.pageProps.page.layout.sitecore.route.fields.currentProduct.value.xp.XmcDescription =
    "An activity for older people.";
  assert.equal(projectOnePa(other, url, asOf)!.content?.minimumAge, undefined);
});
test("onePA follows observed sitemap URL, coalesces same detail and refuses disabled access", async () => {
  let calls = 0;
  const source = new OnePaBrowseSource(
    () => true,
    async (u) => {
      calls++;
      return u.endsWith("/sitemap.xml")
        ? "<loc>https://www.onepa.gov.sg/sitemap/sitemap-event.xml?rev=observed</loc>"
        : u.includes("sitemap-event")
          ? `<loc>${url}</loc>`
          : `<script id="__NEXT_DATA__">${JSON.stringify(payload())}</script>`;
    },
  );
  const first = await source.batch(asOf, 0, new AbortController().signal);
  assert.equal(first.items.length, 1);
  assert.equal(calls, 3);
  await Promise.all([
    source.detail(first.items[0]!.browseId, asOf, new AbortController().signal),
    source.detail(first.items[0]!.browseId, asOf, new AbortController().signal),
  ]);
  assert.equal(calls, 3);
  const disabled = new OnePaBrowseSource(
    () => false,
    async () => {
      throw Error("must not fetch");
    },
  );
  await assert.rejects(
    disabled.detail(
      first.items[0]!.browseId,
      asOf,
      new AbortController().signal,
    ),
  );
});
test("one failed provider preserves other data and explicit status; both failures remain failures", async () => {
  const row = projectOnePa(payload(), url, asOf)!;
  const good = { firstBatch: async () => [row], detail: async () => row },
    bad = {
      firstBatch: async () => {
        throw Error("down");
      },
      detail: async () => undefined,
    };
  const combined = new CombinedEventSource(bad, good);
  assert.deepEqual(
    await combined.firstBatch(asOf, new AbortController().signal),
    [row],
  );
  assert.deepEqual(combined.status(), [
    { provider: "ticketmaster", available: false },
    { provider: "onepa", available: true },
  ]);
  await assert.rejects(
    new CombinedEventSource(bad, bad).firstBatch(
      asOf,
      new AbortController().signal,
    ),
  );
});
test("TM detail enrichment refuses a different occurrence and list never fans out browser detail requests", async () => {
  const row = {
    browseId: browseId("a")!,
    title: "A",
    startAt: "2026-12-01T10:00:00Z",
    externalSourceUrl: "https://ticketmaster.sg/ticket/area/a/1",
  };
  let reads = 0;
  const browser = {
    read: async () => {
      reads++;
      return {
        url: "https://ticketmaster.sg/activity/detail/a",
        title: "A",
        description: "Other occurrence content",
        text: "",
        links: ["https://ticketmaster.sg/ticket/area/a/2"],
        sections: [],
      };
    },
  } as unknown as PublicEventBrowser;
  const source = new EnrichedTicketmasterSource(
    { firstBatch: async () => [row], detail: async () => row },
    browser,
  );
  await source.firstBatch(asOf, new AbortController().signal);
  assert.equal(reads, 0);
  const detail = await source.detail(
    row.browseId,
    asOf,
    new AbortController().signal,
  );
  assert.equal(detail!.content?.fullDescription, undefined);
});

test("onePA saved stable event resolves from public index before any list is loaded", async () => {
  const source = new OnePaBrowseSource(
    () => true,
    async (u) =>
      u.endsWith("/sitemap.xml")
        ? "<loc>https://www.onepa.gov.sg/sitemap/sitemap-event.xml?rev=observed</loc>"
        : u.includes("sitemap-event")
          ? `<loc>${url}</loc>`
          : `<script id="__NEXT_DATA__">${JSON.stringify(payload())}</script>`,
  );
  const id = sourceEventId(browseId("PA-Event-12345678", "pa")!);
  assert.equal(
    (await source.event(id, asOf, new AbortController().signal))?.title,
    "Synthetic workshop",
  );
});

test("legacy browse serialization retains only known TM fields and keeps provider failures visible", () => {
  const pa = projectOnePa(payload(), url, asOf)!;
  const tm = {
    ...pa,
    browseId: browseId("legacy-tm")!,
    eventId: sourceEventId(browseId("legacy-tm")!),
  };
  const result = legacyBrowse({
    asOf,
    scope: "singapore_events_v2",
    items: [pa, tm],
    sourceStatus: [{ provider: "ticketmaster", available: true }],
  });
  assert.ok(result && "items" in result);
  assert.equal(result.scope, "ticketmaster_sg_first_batch_v1");
  assert.equal(result.items.length, 1);
  assert.ok(!("content" in result.items[0]!) && !("sourceStatus" in result));
  assert.equal(
    legacyBrowse({
      asOf,
      scope: "singapore_events_v2",
      items: [pa],
      sourceStatus: [{ provider: "ticketmaster", available: false }],
    }),
    undefined,
  );
});
test("onePA lists reuse public summaries without individual detail fan-out, then open the exact observed URL", async () => {
  const page = payload();
  const product =
    page.props.pageProps.page.layout.sitecore.route.fields.currentProduct.value;
  (product.xp as Record<string, unknown>).SummaryBox =
    "A source-provided summary. Another sentence.";
  let lists = 0,
    reads = 0;
  const source = new OnePaBrowseSource(
    () => true,
    async (u) => {
      reads++;
      assert.equal(u, url);
      return `<script id="__NEXT_DATA__">${JSON.stringify(page)}</script>`;
    },
    async () => {
      lists++;
      return {items:[{ product, url }],complete:true};
    },
  );
  const [first, second] = await Promise.all([
    source.firstBatch(asOf, new AbortController().signal),
    source.firstBatch(asOf, new AbortController().signal),
  ]);
  assert.equal(lists, 1);
  assert.equal(reads, 0);
  assert.equal(
    first[0]?.shortDescription,
    "A source-provided summary. Another sentence.",
  );
  assert.equal(first[0]?.content?.fullDescription, undefined);
  assert.deepEqual(
    first.map((x) => x.browseId),
    second.map((x) => x.browseId),
  );
  const detail = await source.detail(
    first[0]!.browseId,
    asOf,
    new AbortController().signal,
  );
  assert.equal(reads, 1);
  assert.match(detail!.content!.fullDescription!, /Only for Age 60/);
  assert.equal(detail?.externalSourceUrl, url);
});
test("onePA public-list input stays bounded, rejects duplicate identities and does not turn a failed list into empty success", async () => {
  const product =
    payload().props.pageProps.page.layout.sitecore.route.fields.currentProduct
      .value;
  for (const list of [
    Array.from({ length: 51 }, () => ({ product, url })),
    [
      { product, url },
      { product, url },
    ],
  ]) {
    const source = new OnePaBrowseSource(
      () => true,
      async () => {
        throw Error("no detail read");
      },
      async () => ({items:list,complete:true}),
    );
    await assert.rejects(source.firstBatch(asOf, new AbortController().signal));
  }
  const source = new OnePaBrowseSource(
    () => true,
    async () => "",
    async () => {
      throw Error("unavailable");
    },
  );
  await assert.rejects(source.firstBatch(asOf, new AbortController().signal));
});

test("onePA follow-up lists fail promptly while an aborted catalogue reader cleans up", async () => {
  const product = payload().props.pageProps.page.layout.sitecore.route.fields.currentProduct.value;
  const closing = Promise.withResolvers<{items:readonly { product: unknown; url: string }[];complete:boolean}>();
  let reads = 0, elapsed = 0;
  const source = new OnePaBrowseSource(
    () => true,
    async () => { throw Error("no detail read"); },
    async () => ++reads === 1 ? closing.promise : {items:[{ product, url }],complete:true},
    Date.now,()=>elapsed,
  );
  const owner = new AbortController();
  const first = assert.rejects(source.firstBatch(asOf, owner.signal));
  await Promise.resolve(); // Establish an actually dispatched reader before aborting.
  owner.abort();
  const followUp = assert.rejects(source.firstBatch(asOf, new AbortController().signal));
  try {
    assert.equal(await Promise.race([followUp.then(() => "rejected"), setImmediate("waiting")]), "rejected");
    assert.equal(reads, 1);
  } finally {
    closing.resolve({items:[{ product, url }],complete:true});
    await Promise.all([first, followUp]);
  }
  await assert.rejects(source.firstBatch(asOf,new AbortController().signal));
  assert.equal(reads,1);elapsed=300000; // Failed cycles share the approved five-minute admission cap.
  const recovered = await source.firstBatch(asOf, new AbortController().signal);
  assert.equal(recovered[0]?.externalSourceUrl, url);
  assert.equal(reads, 2);
});
