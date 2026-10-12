import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/bootstrap/build-app.js";
import {
  appFailure,
  type AppFailureCode,
} from "../../src/shared/application/app-failure.js";
import { err, ok } from "../../src/shared/domain/result.js";
import type { IdentityVerificationResult } from "../../src/shared/ports/identity-verifier.js";
import type { R4RouteDependencies } from "../../src/transport/register-routes.js";

const account = {
  username: "miku_01",
  optionalProcessingConsent: "accepted",
  checkInVisibility: "public",
  onboardingCompletedAt: "2026-09-05T04:00:00.000Z",
} as const;

const checkIn = {
  checkInId: "chk_01",
  note: "A controlled test note.",
  createdAt: "2026-09-05T04:05:00.000Z",
} as const;

const interests = {
  interestTags: [],
  revision: 0,
} as const;

function dependencies(
  identityResult: IdentityVerificationResult = {
    kind: "verified",
    principal: { firebaseUid: "firebase-1" },
  },
): R4RouteDependencies {
  return {
    identityVerifier: {
      verifyIdToken: async () => identityResult,
    },
    completeOnboarding: {
      execute: async () => ok({ disposition: "created" as const, account }),
    },
    getOnboarding: {
      execute: async () => ok({ status: "required" as const }),
    },
    createCheckIn: {
      execute: async () => ok({ disposition: "created" as const, checkIn }),
    },
    getCheckIn: {
      execute: async () => ok(checkIn),
    },
    getInterestTags: {
      execute: async () => ok([]),
    },
    getOwnInterests: {
      execute: async () => ok(interests),
    },
    replaceOwnInterests: {
      execute: async () => ok({ ...interests, revision: 1 }),
    },
  };
}

const authHeaders = {
  authorization: "Bearer test-token",
};
const commandHeaders = {
  ...authHeaders,
  "idempotency-key": "A".repeat(22),
};

const isolatedEnvironment = {
  ENMORI_ENVIRONMENT: "test",
  ENMORI_CONTROLLED_PROFILE_DIRECTORY: "/tmp/history-route-test",
  APPDATA: "/tmp/history-route-test",
  HOME: "/tmp/history-route-test",
  USERPROFILE: "/tmp/history-route-test",
  XDG_CONFIG_HOME: "/tmp/history-route-test",
  GCLOUD_PROJECT: "demo-enmori-rmvp01a-r10",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
} as NodeJS.ProcessEnv;

test("PUT onboarding maps the approved payload and created projection", async () => {
  const input: unknown[] = [];
  const deps = dependencies();
  deps.completeOnboarding.execute = async (value) => {
    input.push(value);
    return ok({ disposition: "created", account });
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const response = await app.inject({
    method: "PUT",
    url: "/v1/me/onboarding",
    headers: commandHeaders,
    payload: { username: "miku_01", initialChoice: "accept" },
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), { account });
  assert.deepEqual(input, [
    {
      principal: { firebaseUid: "firebase-1" },
      username: "miku_01",
      initialChoice: "accept",
      idempotencyKey: "A".repeat(22),
    },
  ]);
});

test("Check-in history authenticates before parsing and marks every response no-store", async () => {
  let calls = 0;
  const deps = {
    ...dependencies(),
    isolatedSlices: {
      environment: isolatedEnvironment,
      checkInHistory: { execute: async (input: { readonly principal: { readonly firebaseUid: string }; readonly date: string; readonly timeZone: string; readonly cursor?: string }) => {
        calls += 1;
        assert.deepEqual(input, { principal: { firebaseUid: "firebase-1" }, date: "2026-10-07", timeZone: "Asia/Singapore" });
        return ok({ checkIns: [checkIn], nextCursor: null });
      } },
    },
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const unauthenticated = await app.inject({ method: "GET", url: "/v1/me/check-ins?date=bad&timeZone=bad" });
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.headers["cache-control"], "no-store");
  assert.equal(calls, 0);

  const success = await app.inject({
    method: "GET",
    url: "/v1/me/check-ins?date=2026-10-07&timeZone=Asia%2FSingapore",
    headers: authHeaders,
  });
  assert.equal(success.statusCode, 200);
  assert.equal(success.headers["cache-control"], "no-store");
  assert.deepEqual(success.json(), { checkIns: [checkIn], nextCursor: null });

  const invalid = await app.inject({
    method: "GET",
    url: "/v1/me/check-ins?date=2026-10-07&timeZone=Asia%2FSingapore&limit=500",
    headers: authHeaders,
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.headers["cache-control"], "no-store");
  assert.equal(invalid.json().error.code, "REQUEST_INVALID");
  assert.equal(calls, 1);
});

test("PUT and POST exact retries return 200", async () => {
  const deps = dependencies();
  deps.completeOnboarding.execute = async () =>
    ok({ disposition: "replayed", account });
  deps.createCheckIn.execute = async () =>
    ok({ disposition: "replayed", checkIn });
  const app = await buildApp(deps);
  test.after(() => app.close());

  const onboarding = await app.inject({
    method: "PUT",
    url: "/v1/me/onboarding",
    headers: commandHeaders,
    payload: { username: "miku_01", initialChoice: "accept" },
  });
  const created = await app.inject({
    method: "POST",
    url: "/v1/check-ins",
    headers: commandHeaders,
    payload: { note: checkIn.note },
  });

  assert.equal(onboarding.statusCode, 200);
  assert.equal(created.statusCode, 200);
});

test("GET routes expose only approved safe projections", async () => {
  const deps = dependencies();
  deps.getOnboarding.execute = async () =>
    ok({
      status: "completed",
      account: { ...account, accountId: "internal-account-1" },
    } as never);
  deps.getCheckIn.execute = async () =>
    ok({ ...checkIn, ownerAccountId: "internal-account-1" } as never);
  const app = await buildApp(deps);
  test.after(() => app.close());

  const onboarding = await app.inject({
    method: "GET",
    url: "/v1/me/onboarding",
    headers: authHeaders,
  });
  const persisted = await app.inject({
    method: "GET",
    url: "/v1/check-ins/chk_01",
    headers: authHeaders,
  });

  assert.deepEqual(onboarding.json(), { status: "completed", account });
  assert.deepEqual(persisted.json(), { checkIn });
  assert.doesNotMatch(responseText(onboarding), /accountId|firebaseUid/i);
  assert.doesNotMatch(responseText(persisted), /ownerAccountId|firebaseUid/i);
});

test("Interest routes map the fixed catalogue and own-selection contract", async () => {
  const deps = dependencies();
  const input: unknown[] = [];
  deps.getInterestTags.execute = async () => ok([
    { interestTagId: "tag-a", displayName: "Art" },
  ]);
  deps.getOwnInterests.execute = async () => ok({
    interestTags: [
      {
        interestTagId: "tag-old",
        displayName: "Legacy",
        lifecycleState: "inactive" as const,
      },
    ],
    revision: 3,
  });
  deps.replaceOwnInterests.execute = async (value) => {
    input.push(value);
    return ok({
      interestTags: [
        {
          interestTagId: "tag-a",
          displayName: "Art",
          lifecycleState: "active" as const,
        },
      ],
      revision: 4,
    });
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const catalogue = await app.inject({
    method: "GET",
    url: "/v1/interest-tags",
    headers: authHeaders,
  });
  const own = await app.inject({
    method: "GET",
    url: "/v1/me/interests",
    headers: authHeaders,
  });
  const saved = await app.inject({
    method: "PUT",
    url: "/v1/me/interests",
    headers: authHeaders,
    payload: { interestTagIds: ["tag-a"], expectedRevision: 3 },
  });

  assert.equal(catalogue.statusCode, 200);
  assert.deepEqual(catalogue.json(), {
    interestTags: [{ interestTagId: "tag-a", displayName: "Art" }],
  });
  assert.equal(own.statusCode, 200);
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(input, [{
    principal: { firebaseUid: "firebase-1" },
    interestTagIds: ["tag-a"],
    expectedRevision: 3,
  }]);
  assert.equal("idempotency-key" in saved.headers, false);
  assert.doesNotMatch(responseText(saved), /accountId|firebaseUid|owner/i);
});

test("Interest PUT rejects invalid selections before the use case", async () => {
  let calls = 0;
  const deps = dependencies();
  deps.replaceOwnInterests.execute = async () => {
    calls += 1;
    return ok({ interestTags: [], revision: 1 });
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const invalidPayloads = [
    { interestTagIds: ["tag-a", "tag-a"], expectedRevision: 0 },
    { interestTagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`), expectedRevision: 0 },
    { interestTagIds: ["tag-a"], expectedRevision: -1 },
    { interestTagIds: ["tag-a"], expectedRevision: 0, accountId: "private" },
  ];
  for (const payload of invalidPayloads) {
    const response = await app.inject({
      method: "PUT",
      url: "/v1/me/interests",
      headers: authHeaders,
      payload,
    });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "INTEREST_SELECTION_INVALID");
  }
  assert.equal(calls, 0);
});

test("Interest failures preserve 412, 422, onboarding and dependency semantics", async () => {
  const cases = [
    ["INTEREST_REVISION_PRECONDITION_FAILED", 412],
    ["INTEREST_SELECTION_INVALID", 422],
    ["ONBOARDING_REQUIRED", 409],
    ["SERVICE_UNAVAILABLE", 503],
  ] as const;
  for (const [code, status] of cases) {
    const deps = dependencies();
    deps.replaceOwnInterests.execute = async () => err(appFailure(code));
    const app = await buildApp(deps);
    const response = await app.inject({
      method: "PUT",
      url: "/v1/me/interests",
      headers: authHeaders,
      payload: { interestTagIds: [], expectedRevision: 0 },
    });
    await app.close();
    assert.equal(response.statusCode, status);
    assert.equal(response.json().error.code, code);
  }
});

test("authentication outcomes map to safe stable envelopes", async () => {
  const cases: Array<{
    result: IdentityVerificationResult;
    status: number;
    code: string;
  }> = [
    { result: { kind: "invalid" }, status: 401, code: "AUTH_REQUIRED" },
    { result: { kind: "forbidden" }, status: 403, code: "AUTH_FORBIDDEN" },
    {
      result: { kind: "dependency_unavailable" },
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    },
  ];

  for (const current of cases) {
    const app = await buildApp(dependencies(current.result));
    const response = await app.inject({
      method: "GET",
      url: "/v1/me/onboarding",
      headers: authHeaders,
    });
    await app.close();
    assert.equal(response.statusCode, current.status);
    assert.equal(response.json().error.code, current.code);
    assert.equal(typeof response.json().error.requestId, "string");
  }
});

test("missing and malformed Bearer credentials fail closed", async () => {
  const app = await buildApp(dependencies());
  test.after(() => app.close());

  for (const authorization of [undefined, "Basic token", "Bearer a b"] as const) {
    const response = await app.inject({
      method: "GET",
      url: "/v1/me/onboarding",
      headers: authorization === undefined ? {} : { authorization },
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "AUTH_REQUIRED");
  }
});

test("authentication precedes command-header validation", async () => {
  const commands = [
    {
      method: "PUT" as const,
      url: "/v1/me/onboarding",
      payload: { username: "miku_01", initialChoice: "accept" },
    },
    {
      method: "POST" as const,
      url: "/v1/check-ins",
      payload: { note: checkIn.note },
    },
    {
      method: "PUT" as const,
      url: "/v1/me/interests",
      payload: { interestTagIds: [], expectedRevision: 0 },
    },
  ];
  const cases: Array<{
    authorization?: string;
    identityResult?: IdentityVerificationResult;
    expectedStatus: number;
    expectedCode: string;
  }> = [
    { expectedStatus: 401, expectedCode: "AUTH_REQUIRED" },
    {
      authorization: "Basic token",
      expectedStatus: 401,
      expectedCode: "AUTH_REQUIRED",
    },
    {
      authorization: "Bearer expired-token",
      identityResult: { kind: "invalid" },
      expectedStatus: 401,
      expectedCode: "AUTH_REQUIRED",
    },
    {
      authorization: "Bearer revoked-token",
      identityResult: { kind: "forbidden" },
      expectedStatus: 403,
      expectedCode: "AUTH_FORBIDDEN",
    },
  ];

  for (const current of cases) {
    for (const command of commands) {
      const app = await buildApp(dependencies(current.identityResult));
      const headers =
        current.authorization === undefined
          ? { "idempotency-key": "short" }
          : { authorization: current.authorization };
      const response = await app.inject({ ...command, headers });
      await app.close();

      assert.equal(response.statusCode, current.expectedStatus);
      assert.equal(response.json().error.code, current.expectedCode);
    }
  }
});

test("strict schemas reject undeclared fields", async () => {
  let calls = 0;
  const deps = dependencies();
  deps.completeOnboarding.execute = async () => {
    calls += 1;
    return ok({ disposition: "created", account });
  };
  deps.createCheckIn.execute = async () => {
    calls += 1;
    return ok({ disposition: "created", checkIn });
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const extraField = await app.inject({
    method: "POST",
    url: "/v1/check-ins",
    headers: commandHeaders,
    payload: { note: checkIn.note, mood: "happy" },
  });
  const extraOnboardingField = await app.inject({
    method: "PUT",
    url: "/v1/me/onboarding",
    headers: commandHeaders,
    payload: {
      username: "miku_01",
      initialChoice: "accept",
      accountId: "internal-account-1",
    },
  });

  assert.equal(extraField.statusCode, 400);
  assert.equal(extraField.json().error.code, "CHECKIN_INVALID");
  assert.equal(extraOnboardingField.statusCode, 400);
  assert.equal(extraOnboardingField.json().error.code, "USERNAME_INVALID");
  assert.equal(calls, 0);
});

test("authenticated commands safely classify missing or malformed idempotency keys", async () => {
  let calls = 0;
  const deps = dependencies();
  deps.completeOnboarding.execute = async () => {
    calls += 1;
    return ok({ disposition: "created", account });
  };
  deps.createCheckIn.execute = async () => {
    calls += 1;
    return ok({ disposition: "created", checkIn });
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const privateNote = "private controlled request content";
  const commands = [
    {
      method: "PUT" as const,
      url: "/v1/me/onboarding",
      payload: { username: "miku_01", initialChoice: "accept" },
    },
    {
      method: "POST" as const,
      url: "/v1/check-ins",
      payload: { note: privateNote },
    },
  ];

  for (const command of commands) {
    for (const invalidKey of [undefined, "not-a.valid-key"] as const) {
      const response = await app.inject({
        ...command,
        headers:
          invalidKey === undefined
            ? authHeaders
            : { ...authHeaders, "idempotency-key": invalidKey },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error.code, "IDEMPOTENCY_KEY_INVALID");
      assert.equal(
        response.json().error.message,
        "Provide a valid request key and try again.",
      );
      assert.equal(typeof response.json().error.requestId, "string");
      assert.doesNotMatch(responseText(response), /not-a\.valid-key/);
      assert.doesNotMatch(responseText(response), /private controlled request content/);
    }
  }
  assert.equal(calls, 0);
});

test("application failures preserve approved status and privacy semantics", async () => {
  const deps = dependencies();
  deps.getCheckIn.execute = async () => err(appFailure("CHECKIN_UNAVAILABLE"));
  const app = await buildApp(deps);
  test.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/v1/check-ins/not-owned",
    headers: authHeaders,
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "CHECKIN_UNAVAILABLE");
  assert.doesNotMatch(responseText(response), /owner|missing|firestore/i);
});

test("Transport maps every remaining approved application failure", async () => {
  const cases: Array<{
    code: AppFailureCode;
    status: number;
    route: "onboarding" | "checkIn";
  }> = [
    { code: "USERNAME_INVALID", status: 400, route: "onboarding" },
    { code: "USERNAME_UNAVAILABLE", status: 409, route: "onboarding" },
    { code: "ONBOARDING_CONFLICT", status: 409, route: "onboarding" },
    { code: "CHECKIN_INVALID", status: 400, route: "checkIn" },
    { code: "ONBOARDING_REQUIRED", status: 409, route: "checkIn" },
    { code: "IDEMPOTENCY_KEY_INVALID", status: 400, route: "checkIn" },
    { code: "IDEMPOTENCY_CONFLICT", status: 409, route: "checkIn" },
    { code: "SERVICE_UNAVAILABLE", status: 503, route: "checkIn" },
  ];

  for (const current of cases) {
    const deps = dependencies();
    if (current.route === "onboarding") {
      deps.completeOnboarding.execute = async () =>
        err(appFailure(current.code));
    } else {
      deps.createCheckIn.execute = async () => err(appFailure(current.code));
    }
    const app = await buildApp(deps);
    const response = await app.inject({
      method: current.route === "onboarding" ? "PUT" : "POST",
      url:
        current.route === "onboarding"
          ? "/v1/me/onboarding"
          : "/v1/check-ins",
      headers: commandHeaders,
      payload:
        current.route === "onboarding"
          ? { username: "miku_01", initialChoice: "accept" }
          : { note: checkIn.note },
    });
    await app.close();

    assert.equal(response.statusCode, current.status, current.code);
    assert.equal(response.json().error.code, current.code);
    assert.equal(typeof response.json().error.requestId, "string");
  }
});

test("unknown exceptions return a generic safe 503 and keep the app live", async () => {
  const deps = dependencies();
  deps.getOnboarding.execute = async () => {
    throw new Error("private vendor detail");
  };
  const app = await buildApp(deps);
  test.after(() => app.close());

  const failed = await app.inject({
    method: "GET",
    url: "/v1/me/onboarding",
    headers: authHeaders,
  });
  deps.getOnboarding.execute = async () => ok({ status: "required" });
  const recovered = await app.inject({
    method: "GET",
    url: "/v1/me/onboarding",
    headers: authHeaders,
  });

  assert.equal(failed.statusCode, 503);
  assert.equal(failed.json().error.code, "SERVICE_UNAVAILABLE");
  assert.doesNotMatch(responseText(failed), /private vendor detail/i);
  assert.equal(recovered.statusCode, 200);
});

function responseText(response: { body: string }): string {
  return response.body;
}

