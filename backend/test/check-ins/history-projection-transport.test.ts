import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerIsolatedSlices } from "../../src/transport/register-isolated-slices.js";
import { ok } from "../../src/shared/domain/result.js";

// Synthetic data only. Exercise the actual history HTTP serializer, not just
// the repository projection that already contained these fields.
test("owned history retains saved snapshots and mood while excluding storage metadata", async () => {
  const app = Fastify(); app.decorateRequest("authPrincipal", null);
  let calls = 0;
  const full = {
    checkInId: "synthetic-point", note: "", mood: "Happy", activity: "Walking",
    createdAt: "2026-10-21T03:00:00.000Z", checkInVisibility: "private" as const,
    revision: 3, location: { latitude: 1.3, longitude: 103.8 },
    weather: { projectionVersion: "weather_projection_v1" as const, source: "open_meteo" as const,
      observedAt: "2026-10-21T03:00:00.000Z", temperatureCelsius: 27.5, condition: "clear" as const },
  };
  const legacy = { checkInId: "legacy", note: "Synthetic old note", createdAt: "2026-10-21T02:00:00.000Z" };
  await registerIsolatedSlices(app, { verifyIdToken: async token => token === "fixture"
    ? { kind: "verified", principal: { firebaseUid: "fixture-owner" } } : { kind: "invalid" } },
  undefined, undefined, { execute: async input => {
    calls++; assert.equal(input.principal.firebaseUid, "fixture-owner");
    return ok({ checkIns: [{ ...full, ownerAccountId: "must-not-leak" }, legacy], nextCursor: null });
  } });
  try {
    const url = "/v1/me/check-ins?date=2026-10-21&timeZone=Asia%2FSingapore";
    const anonymous = await app.inject({ method: "GET", url });
    assert.equal(anonymous.statusCode, 401); assert.equal(calls, 0);
    const response = await app.inject({ method: "GET", url, headers: { authorization: "Bearer fixture" } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { checkIns: [full, legacy], nextCursor: null });
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(calls, 1);
  } finally { await app.close(); }
});
