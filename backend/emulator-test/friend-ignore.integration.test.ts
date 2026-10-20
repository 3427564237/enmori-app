import { firestoreSocialAuthority } from "../src/friends/infrastructure/social-authority.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import Fastify, { type FastifyInstance } from "fastify";
import { requireControlledEmulatorEnvironment } from "../src/shared/infrastructure/firebase/controlled-emulator-environment.js";
import { FirebaseAdminFirestoreGateway } from "../src/shared/infrastructure/firebase/firestore-gateway.js";
import { FirebaseIdentityVerifier } from "../src/shared/infrastructure/firebase/firebase-identity-verifier.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { FirestoreFriendIgnoreRepository, cleanupDeletedAccountPreferences } from "../src/friend-recommendations/infrastructure/firestore-friend-ignore-repository.js";
import { preferenceCollection, preferenceKey } from "../src/friend-recommendations/infrastructure/recommendation-preference.js";
import { registerSocialModule } from "../src/bootstrap/register-social-module.js";
import { FirebaseAdminCheckInHistoryGateway } from "../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { AesGcmHistoryCursorCodec } from "../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import { ok } from "../src/shared/domain/result.js";
const environment = requireControlledEmulatorEnvironment(process.env);
assert.equal(environment.projectId, "demo-enmori-rmvp01a-r10");
test("isolated actual Auth/HTTP/Firestore ignore, reread, competing restore, privacy and owned deletion seam", async t => {
  const app = initializeApp({ projectId: environment.projectId }, `friend-ignore-${randomUUID()}`);
  const auth = getAuth(app), store = getFirestore(app), gateway = new FirebaseAdminFirestoreGateway(store);
  const owned = new Set<string>(), users: string[] = [], servers: FastifyInstance[] = [];
  const nonce = randomUUID().replaceAll("-", ""), owner = `ig_o_${nonce}`, target = `ig_t_${nonce}`, third = `ig_u_${nonce}`;
  const names = [`ig_${nonce.slice(0, 14)}a`, `ig_${nonce.slice(0, 14)}b`, `ig_${nonce.slice(0, 14)}c`];
  const instant = "2026-10-20T00:00:00.000Z", clock = { now: () => ok(new Date(instant)) };
  const seed = async (path: string, data: Record<string, unknown>) => { owned.add(path); await store.doc(path).create(data); };
  const signIn = async () => {
    const token = await auth.createCustomToken(owner);
    const response = await fetch(`http://${environment.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=controlled-emulator-key`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, returnSecureToken: true }),
    });
    assert.equal(response.status, 200);
    const data = await response.json() as { idToken: string };
    assert.equal(typeof data.idToken, "string"); return { authorization: `Bearer ${data.idToken}` };
  };
  const server = async () => {
    const http = Fastify({ ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
    servers.push(http);
    await registerSocialModule(http, { identity: new FirebaseIdentityVerifier(auth), store: new FirebaseAdminFirestoreGateway(store),
      history: new FirebaseAdminCheckInHistoryGateway(store), cursor: new AesGcmHistoryCursorCodec(Buffer.alloc(32, 19)),
      clock, weather: { current: async () => undefined } });
    return http;
  };
  const path = `/v1/me/friend-recommendation-ignores/${names[1]}`;
  const prefPath = `${preferenceCollection}/${preferenceKey(owner, target)}`;
  owned.add(prefPath); owned.add(`${preferenceCollection}/${preferenceKey(third, owner)}`);
  try {
    const tag = `ig_tag_${nonce}`;
    await seed(`interest_tags/${tag}`, { displayName: "Synthetic music", lifecycleState: "active", revision: 1 });
    for (const [index, id] of [owner, target, third].entries()) {
      users.push(id); await auth.createUser({ uid: id });
      await seed(`auth_bindings/${createAuthBindingDocumentId(id)}`, { accountId: id });
      await seed(`accounts/${id}`, { username: names[index], displayName: "Synthetic", profileVisibility: "public", profileRevision: 1,
        optionalProcessingConsent: "accepted", checkInVisibility: "private", onboardingCompletedAt: instant,
        fieldPrivacy: { interests: "public", location: "private", participation: "private", mapSharedWithFriends: false } });
      await seed(`friend_access/${id}`, { eligibilityState: "eligible" });
      await seed(`username_reservations/${names[index]}`, { accountId: id });
      await seed(`account_interests/${id}`, { interestTagIds: [tag], revision: 1 });
    }
    let http = await server(), headers = await signIn(), savedVersion = "";
    await t.test("confirmed ignore immediately persists and disappears from Home/See All before ranking", async () => {
      const all = await http.inject({ url: "/v1/recommendations/friends?view=all", headers });
      assert.equal(all.statusCode, 200, all.body);
      const card = all.json().suggestions.find((row: { username: string }) => row.username === names[1]);
      assert.ok(card);
      const saved = await http.inject({ method: "PUT", url: path, headers, payload: { ignored: true, expectedVersion: card.ignoreVersion } });
      assert.equal(saved.statusCode, 200, saved.body); savedVersion = saved.json().version;
      assert.equal((await store.doc(prefPath).get()).data()?.ignored, true);
      for (const view of ["home", "all"]) {
        const read = await http.inject({ url: `/v1/recommendations/friends?view=${view}`, headers });
        assert.equal(read.statusCode, 200);
        assert.equal(read.json().suggestions.some((row: { username: string }) => row.username === names[1]), false);
      }
    });
    await t.test("fresh Auth sign-in and reconstructed HTTP/module instance read authoritative saved version", async () => {
      await http.close(); http = await server(); headers = await signIn();
      const read = await http.inject({ url: path, headers });
      assert.equal(read.statusCode, 200); assert.equal(read.json().version, savedVersion);
      assert.equal(read.json().ignored, true); assert.equal(read.headers["cache-control"], "no-store");
    });
    await t.test("two competing restores use real transaction conflict control; precisely one succeeds", async () => {
      const results = await Promise.all([1, 2].map(() => http.inject({ method: "PUT", url: path, headers,
        payload: { ignored: false, expectedVersion: savedVersion } })));
      assert.deepEqual(results.map(result => result.statusCode).sort(), [200, 412]);
      const read = await http.inject({ url: path, headers }); assert.equal(read.json().ignored, false);
      const ignored = await http.inject({ method: "PUT", url: path, headers, payload: { ignored: true, expectedVersion: read.json().version } });
      assert.equal(ignored.statusCode, 200); savedVersion = ignored.json().version;
    });
    await t.test("privacy revoke hides list/state and refuses stale Undo while durable fact remains", async () => {
      await store.doc(`accounts/${target}`).update({ profileVisibility: "private" });
      const list = await http.inject({ url: "/v1/me/friend-recommendation-ignores", headers });
      assert.equal(list.statusCode, 200, list.body); assert.deepEqual(list.json().people, []);
      assert.equal((await http.inject({ url: path, headers })).statusCode, 404);
      assert.equal((await http.inject({ method: "PUT", url: path, headers, payload: { ignored: false, expectedVersion: savedVersion } })).statusCode, 404);
      assert.equal((await store.doc(prefPath).get()).data()?.ignored, true);
      await store.doc(`accounts/${target}`).update({ profileVisibility: "public", displayName: "Current synthetic" });
      const restoredList = await http.inject({ url: "/v1/me/friend-recommendation-ignores", headers });
      assert.equal(restoredList.json().people[0].displayName, "Current synthetic");
    });
    await t.test("permanent-deletion seam deletes both directions; revoked owner cannot regain access", async () => {
      const repository = new FirestoreFriendIgnoreRepository(gateway, clock, firestoreSocialAuthority);
      const current = await repository.read(third, names[0]!); assert.ok(current.ok);
      if (!current.ok) return;
      assert.equal((await repository.set(third, names[0]!, true, current.value.version)).ok, true);
      await store.doc(`friend_access/${owner}`).update({ eligibilityState: "permanently-deleted" });
      assert.equal((await http.inject({ url: path, headers })).statusCode, 403);
      assert.deepEqual(await cleanupDeletedAccountPreferences(gateway, owner), { complete: true, removed: 2 });
      for (const id of [preferenceKey(owner, target), preferenceKey(third, owner)]) {
        assert.equal((await store.doc(`${preferenceCollection}/${id}`).get()).exists, false);
      }
    });
  } finally {
    for (const http of servers) await http.close();
    for (const path of owned) await store.doc(path).delete();
    for (const uid of users) await auth.deleteUser(uid);
    for (const path of owned) assert.equal((await store.doc(path).get()).exists, false);
    for (const uid of users) await assert.rejects(auth.getUser(uid), { code: "auth/user-not-found" });
    console.log(`Owned cleanup: ${owned.size} document paths and ${users.length} Auth users absent`);
    await deleteApp(app);
  }
});
