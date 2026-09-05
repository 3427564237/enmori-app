import assert from "node:assert/strict";
import test from "node:test";

import type { Auth } from "firebase-admin/auth";

import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";

function authWithVerification(
  verify: (token: string, checkRevoked?: boolean) => Promise<unknown>,
): Auth {
  return { verifyIdToken: verify } as unknown as Auth;
}

test("identity adapter verifies revocation and returns the Firebase principal", async () => {
  const calls: Array<readonly [string, boolean | undefined]> = [];
  const verifier = new FirebaseIdentityVerifier(
    authWithVerification(async (token, checkRevoked) => {
      calls.push([token, checkRevoked]);
      return { uid: "controlled-user-001" };
    }),
  );

  assert.deepEqual(await verifier.verifyIdToken("controlled-token"), {
    kind: "verified",
    principal: { firebaseUid: "controlled-user-001" },
  });
  assert.deepEqual(calls, [["controlled-token", true]]);
});

test("identity adapter rejects an empty token without calling Firebase", async () => {
  let called = false;
  const verifier = new FirebaseIdentityVerifier(
    authWithVerification(async () => {
      called = true;
      return { uid: "unexpected" };
    }),
  );

  assert.deepEqual(await verifier.verifyIdToken(""), { kind: "invalid" });
  assert.equal(called, false);
});

for (const code of ["auth/id-token-revoked", "auth/user-disabled"]) {
  test(`identity adapter maps ${code} to forbidden`, async () => {
    const verifier = new FirebaseIdentityVerifier(
      authWithVerification(async () => {
        throw { code, message: "controlled provider detail" };
      }),
    );

    assert.deepEqual(await verifier.verifyIdToken("controlled-token"), {
      kind: "forbidden",
    });
  });
}

for (const code of [
  "auth/argument-error",
  "auth/invalid-argument",
  "auth/invalid-id-token",
  "auth/id-token-expired",
]) {
  test(`identity adapter maps ${code} to invalid`, async () => {
    const verifier = new FirebaseIdentityVerifier(
      authWithVerification(async () => {
        throw { code, message: "controlled provider detail" };
      }),
    );

    assert.deepEqual(await verifier.verifyIdToken("controlled-token"), {
      kind: "invalid",
    });
  });
}

test("identity adapter contains unknown provider failures", async () => {
  const verifier = new FirebaseIdentityVerifier(
    authWithVerification(async () => {
      throw new Error("controlled provider detail must not cross the port");
    }),
  );

  assert.deepEqual(await verifier.verifyIdToken("controlled-token"), {
    kind: "dependency_unavailable",
  });
});
