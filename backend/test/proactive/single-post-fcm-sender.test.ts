import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import test from "node:test";
import { SinglePostFcmSender } from "../../src/proactive/infrastructure/single-post-fcm-sender.js";
import type { FcmCredential } from "../../src/proactive/infrastructure/single-post-fcm-sender.js";
import type { FirstFlowDispatch } from "../../src/proactive/ports/first-flow.js";

type SinglePostInput = Omit<FirstFlowDispatch, "claim"> & { readonly signal: AbortSignal };
interface DispatchAuthorization { claimAfterCredential(): Promise<boolean>; current(): boolean }

const input = (): SinglePostInput => ({ registrationValue: "synthetic-registration", deliveryRef: "synthetic-reference",
  preview: "generic", signal: new AbortController().signal });
const credential: FcmCredential = { getAccessToken: async () => ({ access_token: "synthetic-oauth", expires_in: 3600 }) };
const authority = (): DispatchAuthorization => ({ claimAfterCredential: async () => true, current: () => true });
const dispatchClaim = { intentId: "synthetic-intent", conversationId: "synthetic-topic", messageId: "synthetic-message",
  revision: 1, authorizationScope: "synthetic-scope", expiresAt: "2026-10-26T00:00:00.000Z", registrationRevision: 1 };
const send = (sender: SinglePostFcmSender, packet: SinglePostInput, auth: DispatchAuthorization) => sender.sendOnce({
  signal: packet.signal,
  claimAfterCredential: async () => auth.current() && await auth.claimAfterCredential()
    ? { kind: "ok", value: { ...packet, claim: dispatchClaim } } : { kind: "terminated" },
  current: () => auth.current(),
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

async function localEndpoint(handler: (req: IncomingMessage, res: ServerResponse, body: string) => void) {
  let posts = 0;
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(Buffer.from(chunk)));
    req.on("end", () => { if (req.method === "POST") posts++; handler(req, res, Buffer.concat(chunks).toString("utf8")); });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const fetch: typeof globalThis.fetch = async (target, init) => {
    // The injected test boundary redirects a checked production URL exclusively
    // to this ephemeral loopback server. No FCM/OAuth/external request occurs.
    assert.equal(String(target), "https://fcm.googleapis.com/v1/projects/synthetic-project/messages:send");
    assert.equal(init?.redirect, "error");
    return globalThis.fetch(`${url}/send`, init);
  };
  return { url, fetch, posts: () => posts, close: async () => {
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}

test("one native POST carries only fixed generic notification, opaque ref and REST ttl; acceptance is not delivery", async () => {
  const endpoint = await localEndpoint((req, res, body) => {
    assert.equal(req.headers.authorization, "Bearer synthetic-oauth");
    assert.deepEqual(JSON.parse(body), { message: { token: "synthetic-registration",
      notification: { title: "ENMORI", body: "Open ENMORI to view an update." }, data: { deliveryRef: "synthetic-reference" },
      android: { priority: "NORMAL", ttl: "0s", notification: { channel_id: "enmori_requested_followups" } } } });
    res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ name: "projects/synthetic-project/messages/one" }));
  });
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch });
    assert.deepEqual(await send(sender, input(), authority()), { kind: "accepted" });
    assert.equal(endpoint.posts(), 1);
  } finally { await endpoint.close(); }
});

for (const status of [401, 503]) test(`HTTP ${status} produces one received POST and no refresh/retry`, async () => {
  let credentials = 0;
  const endpoint = await localEndpoint((_req, res) => { res.statusCode = status; res.end("private provider detail"); });
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", fetch: endpoint.fetch,
      credential: { getAccessToken: async () => { credentials++; return { access_token: "synthetic", expires_in: 3600 }; } } });
    assert.deepEqual(await send(sender, input(), authority()), { kind: status === 401 ? "rejected" : "unknown" });
    assert.equal(endpoint.posts(), 1); assert.equal(credentials, 1);
  } finally { await endpoint.close(); }
});

test("redirect is not followed and there is only one received POST", async () => {
  let targetHits = 0;
  const endpoint = await localEndpoint((req, res) => {
    if (req.url === "/target") targetHits++;
    res.statusCode = 307; res.setHeader("location", "/target"); res.end();
  });
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch });
    assert.deepEqual(await send(sender, input(), authority()), { kind: "unknown" });
    assert.equal(endpoint.posts(), 1); assert.equal(targetHits, 0);
  } finally { await endpoint.close(); }
});

test("connection reset after receipt is unknown, with one actual POST", async () => {
  const endpoint = await localEndpoint((req) => req.socket.destroy());
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch });
    assert.deepEqual(await send(sender, input(), authority()), { kind: "unknown" });
    assert.equal(endpoint.posts(), 1);
  } finally { await endpoint.close(); }
});

test("abort after receipt is unknown and is not automatically retried", async () => {
  const received = deferred<void>();
  const endpoint = await localEndpoint(() => received.resolve());
  try {
    const controller = new AbortController();
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch });
    const pending = send(sender, { ...input(), signal: controller.signal }, authority());
    await received.promise; controller.abort();
    assert.deepEqual(await pending, { kind: "unknown" }); assert.equal(endpoint.posts(), 1);
  } finally { await endpoint.close(); }
});

test("the native HTTP deadline expires after one received POST without retry", async () => {
  const endpoint = await localEndpoint(() => { /* Deliberately do not respond. */ });
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch, timeoutMs: 500 });
    assert.deepEqual(await send(sender, input(), authority()), { kind: "unknown" });
    assert.equal(endpoint.posts(), 1);
  } finally { await endpoint.close(); }
});

test("a delayed access token cannot dispatch after consent/expiry/runtime authority is lost", async () => {
  const token = deferred<{ access_token: string; expires_in: number }>();
  let current = true, posts = 0, claims = 0;
  const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential: { getAccessToken: () => token.promise },
    fetch: async () => { posts++; throw Error("must not dispatch"); } });
  const pending = send(sender, input(), { current: () => current, claimAfterCredential: async () => { claims++; return true; } });
  current = false; token.resolve({ access_token: "synthetic", expires_in: 3600 });
  assert.deepEqual(await pending, { kind: "not_attempted", reason: "not_authorized" });
  assert.equal(posts, 0); assert.equal(claims, 0);
});

test("a delayed claim cannot dispatch after cancellation, and the consumed claim is not recycled", async () => {
  const claim = deferred<boolean>(), entered = deferred<void>();
  let current = true, posts = 0, claims = 0;
  const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential,
    fetch: async () => { posts++; throw Error("must not dispatch"); } });
  const pending = send(sender, input(), { current: () => current, claimAfterCredential: async () => { claims++; entered.resolve(); return claim.promise; } });
  await entered.promise; current = false; claim.resolve(true);
  assert.deepEqual(await pending, { kind: "not_attempted", reason: "not_authorized" });
  assert.equal(posts, 0); assert.equal(claims, 1);
});

test("initial abort, credential failure and losing/unknown claim each emit zero POSTs", async () => {
  let posts = 0;
  const fetch: typeof globalThis.fetch = async () => { posts++; throw Error("must not dispatch"); };
  const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch });
  const abort = new AbortController(); abort.abort();
  assert.equal((await send(sender, { ...input(), signal: abort.signal }, authority())).kind, "not_attempted");
  const unavailable = new SinglePostFcmSender({ projectId: "synthetic-project", credential: { getAccessToken: async () => { throw Error("private credentials"); } }, fetch });
  assert.deepEqual(await send(unavailable, input(), authority()), { kind: "not_attempted", reason: "credential_unavailable" });
  assert.equal((await send(sender, input(), { current: () => true, claimAfterCredential: async () => false })).kind, "not_attempted");
  assert.equal((await send(sender, input(), { current: () => true, claimAfterCredential: async () => { throw Error("lost claim ACK"); } })).kind, "not_attempted");
  assert.equal(posts, 0);
});

test("invalid project never acquires credentials; invalid claimed token/ref never reaches network", async () => {
  let credentials = 0, posts = 0;
  const options = { credential: { getAccessToken: async () => { credentials++; return { access_token: "synthetic", expires_in: 3600 }; } },
    fetch: (async () => { posts++; throw Error("network forbidden"); }) as typeof fetch };
  assert.equal((await send(new SinglePostFcmSender({ ...options, projectId: "https://attacker" }), input(), authority())).kind, "not_attempted");
  assert.equal(credentials, 0);
  const sender = new SinglePostFcmSender({ ...options, projectId: "synthetic-project" });
  for (const patch of [{ registrationValue: "" }, { registrationValue: "secret\nheader" }, { registrationValue: "\ud800" }, { deliveryRef: "https://model-url" }])
    assert.equal((await send(sender, { ...input(), ...patch }, authority())).kind, "not_attempted");
  assert.equal(credentials, 4); assert.equal(posts, 0);
});

test("hidden preview has no body and malformed successful ACK stays unknown", async () => {
  const endpoint = await localEndpoint((_req, res, body) => {
    assert.deepEqual(JSON.parse(body).message.notification, { title: "ENMORI" });
    res.end(JSON.stringify({ unexpected: "no name" }));
  });
  try {
    const sender = new SinglePostFcmSender({ projectId: "synthetic-project", credential, fetch: endpoint.fetch });
    assert.deepEqual(await send(sender, { ...input(), preview: "hidden" }, authority()), { kind: "unknown" });
    assert.equal(endpoint.posts(), 1);
  } finally { await endpoint.close(); }
});
