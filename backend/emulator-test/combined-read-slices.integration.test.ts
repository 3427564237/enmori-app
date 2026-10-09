import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/bootstrap/build-app.js";
import { ListOwnCheckInsForDate } from "../src/check-ins/application/check-in-history.js";
import { createHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { FirebaseAdminCheckInHistoryGateway } from "../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { FirestoreCheckInHistoryRepository } from "../src/check-ins/infrastructure/firestore-check-in-history-repository.js";
import { FriendRequests } from "../src/friends/application/friend-requests.js";
import { FirestoreFriendRepository } from "../src/friends/infrastructure/firestore-friend-repository.js";
import { OwnPersonas } from "../src/personas/application/own-personas.js";
import { derivePersonaId, FirestorePersonaRepository } from "../src/personas/infrastructure/firestore-persona-repository.js";
import { appFailure } from "../src/shared/application/app-failure.js";
import { err, ok } from "../src/shared/domain/result.js";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";

// Validate the actual runner-filtered child environment before any Firebase use.
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
const firebase = initializeApp({ projectId: environment.projectId }, `combined-read-${process.pid}`);
const auth = getAuth(firebase);
const firestore = getFirestore(firebase);
after(async () => { await deleteApp(firebase); });
const instant = "2026-10-08T00:00:00.000Z";
const clock = { now: () => ok(new Date(instant)) };
const unavailable = { execute: async () => err(appFailure("SERVICE_UNAVAILABLE")) };

test("combined isolated app retains all three reads, Persona persistence and owner isolation", async () => {
  const owners: { uid: string; accountId: string; token: string; note: string }[] = [];
  const cleanup = new Set<string>();
  let app: FastifyInstance | undefined;
  let ordinary: FastifyInstance | undefined;
  try {
    for (let index = 0; index < 2; index++) {
      const nonce = randomUUID();
      const uid = `combined-${nonce}`, accountId = `combined-owner-${nonce}`;
      const owner = { uid, accountId, token: "", note: `Synthetic combined note ${index}` };
      owners.push(owner);
      const email = `combined-${nonce}@example.invalid`, password = `${randomUUID()}Aa1!`;
      await auth.createUser({ uid, email, password });
      const signIn = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      assert.equal(signIn.ok, true);
      const token = (await signIn.json() as { idToken?: unknown }).idToken;
      assert.equal(typeof token, "string"); owner.token = token as string;
      const username = `u_${nonce.replaceAll("-", "").slice(0, 16)}`;
      const records = {
        [`auth_bindings/${createAuthBindingDocumentId(uid)!}`]: { accountId },
        [`accounts/${accountId}`]: { username, optionalProcessingConsent: "rejected", checkInVisibility: "private", onboardingCompletedAt: instant },
        [`accounts/${accountId}/persona_state/current`]: { livePersonaIds: [], stateRevision: 0 },
        [`friend_access/${accountId}`]: { eligibilityState: "eligible" },
        [`friend_lists/${accountId}`]: { initialized: true },
        [`username_reservations/${username}`]: { accountId },
        [`check_ins/combined-${nonce}`]: { ownerAccountId: accountId, note: owner.note, createdAt: "2026-10-07T01:00:00.000Z", checkInVisibility: "private" },
      };
      for (const [path, data] of Object.entries(records)) {
        cleanup.add(path); await firestore.doc(path).create(data);
      }
    }
    const gateway = new FirebaseAdminFirestoreGateway(firestore);
    const dependencies = {
      identityVerifier: new FirebaseIdentityVerifier(auth), completeOnboarding: unavailable,
      getOnboarding: unavailable, createCheckIn: unavailable, getCheckIn: unavailable,
      getInterestTags: unavailable, getOwnInterests: unavailable, replaceOwnInterests: unavailable,
    };
    const isolatedApp: FastifyInstance = await buildApp({ ...dependencies, isolatedSlices: {
      environment: process.env,
      friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock),
      checkInHistory: new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(firestore)), createHistoryCursorCodec(), clock),
      personas: new OwnPersonas(new FirestorePersonaRepository(gateway, clock)),
    } });
    app = isolatedApp;
    for (const owner of owners) {
      const headers = { authorization: `Bearer ${owner.token}` };
      const friends = await isolatedApp.inject({ url: "/v1/me/friends", headers });
      assert.equal(friends.statusCode, 200); assert.deepEqual(friends.json(), { friends: [], nextCursor: null });
      const history = await isolatedApp.inject({ url: "/v1/me/check-ins?date=2026-10-07&timeZone=Singapore", headers });
      assert.equal(history.statusCode, 200); assert.equal(history.headers["cache-control"], "no-store");
      const rows = (history.json() as { checkIns: { note: string }[] }).checkIns;
      assert.equal(rows.length, 1); assert.equal(rows[0]!.note === owner.note, true);
      const initial = await isolatedApp.inject({ url: "/v1/me/personas", headers });
      assert.equal(initial.statusCode, 200); assert.deepEqual(initial.json(), { personas: { items: [], stateRevision: 0 } });
    }
    const owner = owners[0]!, other = owners[1]!, key = randomUUID();
    const personaId = derivePersonaId(owner.accountId, 0, key);
    cleanup.add(`accounts/${owner.accountId}/personas/${personaId}`);
    const headers = { authorization: `Bearer ${owner.token}` };
    const created = await isolatedApp.inject({ method: "POST", url: "/v1/me/personas",
      headers: { ...headers, "idempotency-key": key },
      payload: { displayName: "Synthetic combined Persona", tone: "neutral", responseLength: "balanced", formatStyle: "plain", expectedStateRevision: 0 },
    });
    assert.equal(created.statusCode, 201);
    const reread = await isolatedApp.inject({ url: "/v1/me/personas", headers });
    assert.equal(reread.statusCode, 200);
    const set = (reread.json() as { personas: { items: { personaId: string }[]; stateRevision: number } }).personas;
    assert.equal(set.stateRevision, 1); assert.equal(set.items.length, 1); assert.equal(set.items[0]!.personaId === personaId, true);
    const saved = (await firestore.doc(`accounts/${owner.accountId}/persona_state/current`).get()).data();
    assert.equal(saved?.stateRevision, 1); assert.equal(saved?.livePersonaIds?.[0] === personaId, true);
    const foreign = await isolatedApp.inject({ url: `/v1/me/personas/${personaId}`, headers: { authorization: `Bearer ${other.token}` } });
    assert.equal(foreign.statusCode, 404); assert.equal(foreign.json().error.code, "PERSONA_UNAVAILABLE");
    const malformed = await isolatedApp.inject({ url: "/v1/me/personas/%zz", headers });
    assert.equal(malformed.statusCode, 400); assert.equal(malformed.json().error.code, "REQUEST_INVALID");
    assert.equal((await isolatedApp.inject({ url: "/v1/me/friends", headers })).statusCode, 200);
    assert.equal((await isolatedApp.inject({ url: "/v1/me/check-ins?date=2026-10-07&timeZone=UTC", headers })).statusCode, 200);
    ordinary = await buildApp(dependencies);
    for (const url of ["/v1/me/friends", "/v1/me/check-ins?date=2026-10-07&timeZone=UTC", "/v1/me/personas"]) {
      assert.equal((await ordinary.inject({ url, headers })).statusCode, 404);
    }
  } finally {
    // Every issued request is awaited; end both sessions before scoped cleanup.
    await ordinary?.close(); await app?.close();
    for (const owner of owners) await auth.deleteUser(owner.uid);
    for (const path of cleanup) await firestore.doc(path).delete();
  }
});
