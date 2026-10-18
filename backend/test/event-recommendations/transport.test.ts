import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/bootstrap/build-app.js";
import { appFailure } from "../../src/shared/application/app-failure.js";
import { ok, err } from "../../src/shared/domain/result.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";
import type { RecommendEvents } from "../../src/event-recommendations/application/recommend-events.js";

const value = { asOf: "2026-09-15T00:00:00Z", formulaVersion: "event_recommendation_v1" as const,
  items: [{ eventId: "ev_a", title: "Synthetic", startAt: "2026-09-16T00:00:00Z",
    endAt: "2026-09-16T01:00:00Z", matchedInterests: [{ interestTagId: "interest_community", displayName: "Community" }] }] };
const authHeaders = { authorization: "Bearer synthetic-token" };
async function appFor(execute: Pick<RecommendEvents, "execute">["execute"] = async () => ok(value),
  identity: IdentityVerificationResult = { kind: "verified", principal: { firebaseUid: "verified-only" } }) {
  return buildApp({
    identityVerifier: { verifyIdToken: async () => identity },
    completeOnboarding: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    getOnboarding: { execute: async () => ok({ status: "required" as const }) },
    createCheckIn: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    getCheckIn: { execute: async () => err(appFailure("CHECKIN_UNAVAILABLE")) },
    getInterestTags: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    getOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    replaceOwnInterests: { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) },
    recommendEvents: { execute },
  });
}
test("Event route maps verified principal/view and explicit public reason/allowlist", async () => {
  const calls: unknown[] = [];
  const app = await appFor(async (input) => { calls.push(input); return ok({ ...value,
    items: value.items.map((item) => ({ ...item, score: 999, ownerAccountId: "synthetic-private" })) }); });
  try {
    const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all", headers: authHeaders });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls, [{ principal: { firebaseUid: "verified-only" }, view: "all" }]);
    assert.deepEqual(response.json(), { ...value, items: value.items.map((item) => ({ ...item, reasonCode: "interest_match" })) });
    assert.equal(response.body.includes("synthetic-private"), false);
  } finally { await app.close(); }
});
test("missing, duplicate, unknown and invalid query values are query-only 400", async () => {
  let calls = 0;
  const app = await appFor(async () => { calls++; return ok(value); });
  try {
    for (const query of ["", "?view=", "?view=bad", "?view=HOME", "?view=home&view=home",
      "?view=home&view=all", "?view=home&asOf=client", "?view=home&ownerAccountId=other", "?view[]=home"]) {
      const response = await app.inject({ method: "GET", url: `/v1/recommendations/events${query}`, headers: authHeaders });
      assert.equal(response.statusCode, 400, query);
      assert.equal(response.json().error.code, "REQUEST_INVALID");
      assert.equal(response.json().error.message, "Request parameters are invalid.");
      assert.equal(typeof response.json().error.requestId, "string");
    }
    assert.equal(calls, 0);
  } finally { await app.close(); }
});
test("authentication precedes query validation and source reads", async () => {
  for (const [identity, status, code] of [
    [{ kind: "invalid" }, 401, "AUTH_REQUIRED"], [{ kind: "forbidden" }, 403, "AUTH_FORBIDDEN"],
    [{ kind: "dependency_unavailable" }, 503, "SERVICE_UNAVAILABLE"],
  ] as const) {
    let calls = 0;
    const app = await appFor(async () => { calls++; return ok(value); }, identity);
    try {
      const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=bad", headers: authHeaders });
      assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code);
      assert.equal(calls, 0);
    } finally { await app.close(); }
  }
  const app = await appFor();
  try {
    const missing = await app.inject({ method: "GET", url: "/v1/recommendations/events" });
    assert.equal(missing.statusCode, 401);
  } finally { await app.close(); }
});
test("empty is 200, while onboarding/dependency failures stay safe failures", async () => {
  for (const [code, status] of [["ONBOARDING_REQUIRED", 409], ["AUTH_FORBIDDEN", 403], ["SERVICE_UNAVAILABLE", 503]] as const) {
    const app = await appFor(async () => err(appFailure(code)));
    try {
      const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=home", headers: authHeaders });
      assert.equal(response.statusCode, status); assert.equal(response.json().error.code, code);
    } finally { await app.close(); }
  }
  const app = await appFor(async () => ok({ ...value, items: [] }));
  try {
    const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=home", headers: authHeaders });
    assert.equal(response.statusCode, 200); assert.deepEqual(response.json(), { ...value, items: [] });
  } finally { await app.close(); }
});
test("unexpected failures and forbidden bodies never expose content or use query-only code", async () => {
  const app = await appFor(async () => { throw new Error("synthetic-vendor-private"); });
  try {
    for (const payload of [undefined, { ownerAccountId: "synthetic-other" }]) {
      const response = await app.inject({ method: "GET", url: "/v1/recommendations/events?view=all",
        headers: authHeaders, ...(payload === undefined ? {} : { payload }) });
      assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, "SERVICE_UNAVAILABLE");
      assert.doesNotMatch(response.body, /synthetic-vendor-private|synthetic-other/);
    }
    const unchanged = await app.inject({ method: "GET", url: "/v1/me/onboarding?view=bad", headers: authHeaders });
    assert.equal(unchanged.statusCode, 200);
  } finally { await app.close(); }
});
test("Event recommendation transport omits unknown end and remains no-store", async () => {
  const { endAt: _end, ...item } = value.items[0]!;
  const app = await appFor(async () => ok({ ...value, items: [item] }));
  try {
    const response = await app.inject({ url: "/v1/recommendations/events?view=all", headers: authHeaders });
    assert.equal(response.statusCode, 200); assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(Object.hasOwn(response.json().items[0], "endAt"), false);
  } finally { await app.close(); }
});
