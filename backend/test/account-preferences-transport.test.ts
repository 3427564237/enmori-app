import { emptyProfileDetails, privateFields } from "../src/account/domain/profile-details.js";
import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/bootstrap/build-app.js";
import { OwnAccountPreferences } from "../src/account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { InMemoryFirestoreGateway } from "./support/in-memory-firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { err } from "../src/shared/domain/result.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import type { R4RouteDependencies } from "../src/transport/register-routes.js";
import { readFile } from "node:fs/promises";
import { profileSchema, settingsSchema, saveProfileBody, saveSettingsBody } from "../src/account/transport/schemas.js";

export const unusedRoutes: Omit<R4RouteDependencies, "identityVerifier"> = {
  completeOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  createCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getInterestTags: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  getOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
  replaceOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
};
test("authenticated transport serializes only owner fields and classifies malformed/invalid/stale input", async (t) => {
  const store = new InMemoryFirestoreGateway({ [`auth_bindings/${createAuthBindingDocumentId("uid")!}`]: { accountId: "owner" },
    "accounts/owner": { username: "member_a", optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: "2026-10-05T00:00:00.000Z" } });
  const app = await buildApp({ ...unusedRoutes, identityVerifier: { verifyIdToken: async () => ({ kind: "verified", principal: { firebaseUid: "uid" } }) },
    accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(store)) });
  t.after(() => app.close());
  const headers = { authorization: "Bearer synthetic" };
  for (const resource of ["profile", "settings"]) {
    assert.equal((await app.inject({ url: "/v1/me/" + resource })).statusCode, 401);
    const read = await app.inject({ url: "/v1/me/" + resource, headers });
    assert.equal(read.statusCode, 200); assert.equal(read.body.includes("accountId"), false);
    assert.equal((await app.inject({ url: "/v1/me/" + resource + "?accountId=other", headers })).statusCode, 400);
  }
  const payload = { displayName: " Alex ", profileVisibility: "public", expectedRevision: 0 };
  const request = (body: unknown) => app.inject({ method: "PUT", url: "/v1/me/profile", headers, payload: body as object });
  assert.equal((await request({ ...payload, owner: "other" })).statusCode, 400);
  assert.equal((await request({ ...payload, profileVisibility: "unknown" })).statusCode, 422);
  assert.equal((await request({ ...payload, displayName: "a\u202eb" })).statusCode, 422);
  const saved = await request(payload); assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json(), { profile: { details: emptyProfileDetails, username: "member_a", displayName: "Alex", profileVisibility: "public", revision: 1 } });
  const stale = await request(payload); assert.equal(stale.statusCode, 412); assert.equal(stale.json().error.code, "PROFILE_REVISION_PRECONDITION_FAILED");
  const details = { bio: "First bio", affiliationType: "school", affiliationName: "Example School" };
  const full = await request({ ...payload, details: { ...details, region: "Old region" }, expectedRevision: 1 });
  assert.equal(full.statusCode, 200);
  const retained = await request({ ...payload, details: { ...details, bio: "New bio" }, expectedRevision: 2 });
  assert.equal(retained.statusCode, 200);
  assert.deepEqual(retained.json().profile.details, { ...details, bio: "New bio", region: "Old region" });
  assert.equal((await request({ ...payload, details, expectedRevision: 2 })).statusCode, 412);
  for (const malformed of [{ bio: null }, { ...details, region: 0 }, { ...details, unknown: true }]) {
    assert.equal((await request({ ...payload, details: malformed, expectedRevision: 3 })).statusCode, 400);
  }
  const cleared = await request({ ...payload, details: { ...details, region: null }, expectedRevision: 3 });
  assert.equal(cleared.statusCode, 200);
  assert.equal(cleared.json().profile.details.region, null);
  const settings = await app.inject({ method: "PUT", url: "/v1/me/settings", headers, payload: { checkInVisibility: "friends_only", optionalProcessingConsent: "accepted", defaultCheckInLocation: true, defaultCheckInWeather: false, homeWeatherAuto: true, expectedRevision: 0 } });
  assert.equal(settings.statusCode, 200); assert.equal(settings.json().settings.checkInVisibility, "friends_only");
  assert.equal(settings.json().settings.defaultCheckInLocation, true); assert.equal(settings.json().settings.defaultCheckInWeather, false); assert.equal(settings.json().settings.homeWeatherAuto, true);
  const readSettings = await app.inject({method: "GET", url: "/v1/me/settings", headers});
  assert.deepEqual(readSettings.json(), settings.json());
});

test("normative Profile/Settings schemas match transport without internal identities", async () => {
  const c = JSON.parse(await readFile("api/openapi.json", "utf8"));
  for (const [name, schema] of [["OwnProfile", profileSchema], ["OwnSettings", settingsSchema], ["SaveOwnProfileRequest", saveProfileBody], ["SaveOwnSettingsRequest", saveSettingsBody]] as const) {
    assert.deepEqual(c.components.schemas[name], schema);
    assert.equal("accountId" in c.components.schemas[name].properties, false);
  }
});
