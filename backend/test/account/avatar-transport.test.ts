import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/bootstrap/build-app.js";
import { OwnAccountPreferences } from "../../src/account/application/own-account-preferences.js";
import { OwnAvatar } from "../../src/account/application/own-avatar.js";
import { FirestoreAccountPreferencesRepository } from "../../src/account/infrastructure/firestore-account-preferences-repository.js";
import { FirestoreOwnAvatarRepository } from "../../src/account/infrastructure/firestore-own-avatar-repository.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { err } from "../../src/shared/domain/result.js";
import { appFailure } from "../../src/shared/application/app-failure.js";
import { AVATAR_MAX_BASE64_LENGTH } from "../../src/account/domain/avatar-values.js";
import type { R4RouteDependencies } from "../../src/transport/register-routes.js";
import { baseAccount, bindingPath, uid, png, avatarFixture } from "./avatar-fixtures.js";

const unused: Omit<R4RouteDependencies, "identityVerifier"> = {
  completeOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  createCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getInterestTags: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  replaceOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
};
const identityVerifier: R4RouteDependencies["identityVerifier"] = { verifyIdToken: async token => {
  if (token === "forbidden") return { kind: "forbidden" };
  if (token === "invalid") return { kind: "invalid" };
  if (token === "unavailable") return { kind: "dependency_unavailable" };
  return { kind: "verified", principal: { firebaseUid: token === "owner" ? uid : token } };
} };
const headers = { authorization: "Bearer owner" }, url = "/v1/me/profile/avatar";
function setup() {
  const store = new InMemoryFirestoreGateway({ [bindingPath]: { accountId: "owner" }, "accounts/owner": baseAccount,
    [`auth_bindings/${createAuthBindingDocumentId("other")!}`]: { accountId: "other" }, "accounts/other": { ...baseAccount, username: "other_owner" } });
  return { store, preferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(store), new OwnAvatar(new FirestoreOwnAvatarRepository(store))) };
}

test("avatar HTTP has owner-only exact projections, independent revisions and no-store; old profile shape survives", async t => {
  const { store, preferences } = setup();
  const app = await buildApp({ ...unused, identityVerifier, accountPreferences: preferences }); t.after(() => app.close());
  const oldProfile = await app.inject({ url: "/v1/me/profile", headers });
  const absent = await app.inject({ url, headers });
  assert.equal(absent.statusCode, 200); assert.equal(absent.headers["cache-control"], "no-store");
  assert.deepEqual(absent.json(), { avatar: { pngBase64: null, sourceSha256: null, revision: 0 } });
  const payload = { pngBase64: png().toString("base64"), expectedRevision: 0 };
  const saved = await app.inject({ method: "PUT", url, headers, payload }); assert.equal(saved.statusCode, 200);
  assert.deepEqual(Object.keys(saved.json().avatar).sort(), ["pngBase64", "revision", "sourceSha256"]);
  assert.equal(saved.json().avatar.revision, 1); assert.equal(saved.headers["cache-control"], "no-store");
  assert.deepEqual((await app.inject({ url, headers })).json(), saved.json());
  assert.deepEqual((await app.inject({ url, headers: { authorization: "Bearer other" } })).json(), absent.json());
  assert.equal((await app.inject({ url: "/v1/me/profile", headers })).body, oldProfile.body);
  assert.equal(store.read("accounts/owner")!.profileRevision, 3); assert.equal(store.read("accounts/owner")!.settingsRevision, 7);
  const stale = await app.inject({ method: "PUT", url, headers, payload });
  assert.equal(stale.statusCode, 412); assert.equal(stale.json().error.code, "PROFILE_REVISION_PRECONDITION_FAILED");
  const cleared = await app.inject({ method: "PUT", url, headers, payload: { pngBase64: null, expectedRevision: 1 } });
  assert.deepEqual(cleared.json(), { avatar: { pngBase64: null, sourceSha256: null, revision: 2 } });
});

test("authentication, strict input types, invalid images and bounded body failures preserve stored state", async t => {
  const { store, preferences } = setup(), before = store.entries();
  const app = await buildApp({ ...unused, identityVerifier, accountPreferences: preferences }); t.after(() => app.close());
  for (const [token, status] of [["invalid", 401], ["forbidden", 403], ["unavailable", 503], ["unbound", 409]] as const) {
    const read = await app.inject({ url, headers: { authorization: `Bearer ${token}` } });
    assert.equal(read.statusCode, status); assert.equal(read.headers["cache-control"], "no-store");
  }
  assert.equal((await app.inject({ url })).statusCode, 401);
  assert.equal((await app.inject({ url: url + "?accountId=other", headers })).statusCode, 400);
  assert.equal((await app.inject({ url, headers, payload: { forbidden: true } })).statusCode, 400);
  const valid = { pngBase64: null, expectedRevision: 0 };
  const put = (payload: unknown) => app.inject({ method: "PUT", url, headers, payload: payload as object });
  for (const bad of [{ ...valid, accountId: "other" }, { ...valid, mime: "image/png" }, { ...valid, path: "/private" },
    { ...valid, url: "https://invalid.example/a" }, { pngBase64: null }, [],
    { ...valid, expectedRevision: null }, { ...valid, expectedRevision: "0" }, { ...valid, pngBase64: 12 }]) {
    const response = await put(bad); assert.equal(response.statusCode, 400, JSON.stringify(bad));
    assert.equal(response.json().error.code, "REQUEST_INVALID");
  }
  for (const bad of [{ ...valid, pngBase64: "invalid" }, { ...valid, expectedRevision: -1 },
    { ...valid, expectedRevision: Number.MAX_SAFE_INTEGER + 1 }, { ...valid, pngBase64: "A".repeat(AVATAR_MAX_BASE64_LENGTH + 4) },
    { ...valid, pngBase64: "A".repeat(AVATAR_MAX_BASE64_LENGTH + 2048) }]) {
    const response = await put(bad); assert.equal(response.statusCode, 422); assert.equal(response.json().error.code, "PROFILE_INVALID");
    assert.equal(response.headers["cache-control"], "no-store");
  }
  const malformed = await app.inject({ method: "PUT", url, headers: { ...headers, "content-type": "application/json" }, payload: "{" });
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(store.entries(), before);
});

test("HTTP unknown write outcome returns safe 503 once; subsequent GET exposes only current avatar authority", async t => {
  const fixture = avatarFixture(); fixture.store.loseAck = true;
  const preferences = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(fixture.store), fixture.use);
  const app = await buildApp({ ...unused, identityVerifier, accountPreferences: preferences }); t.after(() => app.close());
  const response = await app.inject({ method: "PUT", url, headers, payload: { pngBase64: png().toString("base64"), expectedRevision: 0 } });
  assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, "SERVICE_UNAVAILABLE");
  assert.equal(response.body.includes("ACK"), false); assert.equal(fixture.store.calls, 1); assert.equal(fixture.store.writes, 1);
  const read = await app.inject({ url, headers }); assert.equal(read.statusCode, 200); assert.equal(read.json().avatar.revision, 1);
  assert.equal(fixture.store.writes, 1);
});
