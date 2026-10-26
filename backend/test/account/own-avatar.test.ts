import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { appFailure } from "../../src/shared/application/app-failure.js";
import { OwnAccountPreferences } from "../../src/account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../../src/account/infrastructure/firestore-account-preferences-repository.js";
import { FirestoreOwnAvatarRepository } from "../../src/account/infrastructure/firestore-own-avatar-repository.js";
import { canonicalAvatarPng } from "../../src/account/infrastructure/avatar-png.js";
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from "../support/in-memory-firestore-gateway.js";
import { avatarFixture, baseAccount, bindingPath, uid, principal, png, pngChunk } from "./avatar-fixtures.js";

test("legacy absence means no avatar without writes; identity and completed-owner binding remain authoritative", async () => {
  const { store, use } = avatarFixture(); const before = structuredClone(store.rows);
  assert.deepEqual(await use.getAvatar(principal), { ok: true, value: { pngBase64: null, sourceSha256: null, revision: 0 } });
  assert.deepEqual(await use.getAvatar({ firebaseUid: "unbound" }), { ok: false, failure: appFailure("ONBOARDING_REQUIRED") });
  assert.deepEqual(store.rows, before); assert.equal(store.writes, 0);
  for (const bad of [{ ...baseAccount, onboardingCompletedAt: undefined }, { username: "incomplete" }]) {
    store.put("accounts/owner", bad);
    assert.deepEqual(await use.getAvatar(principal), { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
  }
  store.put(bindingPath, { accountId: "../other" });
  assert.deepEqual(await use.getAvatar(principal), { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
});

test("save and removal mutate only the three owner avatar fields with an independent incrementing revision", async () => {
  const { store, repository } = avatarFixture(), source = png({ before: [pngChunk("tEXt", Buffer.from("Comment\0CANARY"))] });
  const beforeOther = structuredClone(store.rows.get("accounts/other"));
  const image = canonicalAvatarPng(source.toString("base64"))!;
  const saved = await repository.saveAvatar(uid, { pngBase64: source.toString("base64"), expectedRevision: 0 });
  assert.deepEqual(saved, { kind: "saved", value: { ...image, revision: 1 } });
  assert.deepEqual(store.rows.get("accounts/owner")!.data, { ...baseAccount, avatarPngBase64: image.pngBase64,
    avatarSourceSha256: createHash("sha256").update(source).digest("hex"), avatarRevision: 1 });
  assert.deepEqual(store.rows.get("accounts/other"), beforeOther);
  assert.deepEqual(await repository.getAvatar("synthetic-avatar-other"), { kind: "found", value: { pngBase64: null, sourceSha256: null, revision: 0 } });
  assert.deepEqual(await repository.getAvatar(uid), { kind: "found", value: { ...image, revision: 1 } });
  assert.deepEqual(await repository.saveAvatar(uid, { pngBase64: null, expectedRevision: 1 }),
    { kind: "saved", value: { pngBase64: null, sourceSha256: null, revision: 2 } });
  assert.deepEqual(store.rows.get("accounts/owner")!.data, { ...baseAccount, avatarPngBase64: null, avatarSourceSha256: null, avatarRevision: 2 });
  assert.equal(store.writes, 2);
});

test("stale and invalid requests do not mutate; revision overflow fails unavailable", async () => {
  const { store, use } = avatarFixture(), source = png().toString("base64"), before = structuredClone(store.rows);
  assert.deepEqual(await use.saveAvatar({ principal, pngBase64: source, expectedRevision: 1 }),
    { ok: false, failure: appFailure("PROFILE_REVISION_PRECONDITION_FAILED") });
  for (const input of [{ pngBase64: "bad", expectedRevision: 0 }, { pngBase64: null, expectedRevision: -1 },
    { pngBase64: 12, expectedRevision: 0 }, { pngBase64: null, expectedRevision: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.deepEqual(await use.saveAvatar({ principal, ...input }), { ok: false, failure: appFailure("PROFILE_INVALID") });
  }
  assert.deepEqual(store.rows, before); assert.equal(store.writes, 0);
  store.put("accounts/owner", { ...baseAccount, avatarPngBase64: null, avatarSourceSha256: null, avatarRevision: Number.MAX_SAFE_INTEGER });
  assert.deepEqual(await use.saveAvatar({ principal, pngBase64: source, expectedRevision: Number.MAX_SAFE_INTEGER }),
    { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
  assert.equal(store.writes, 0);
});

test("partial or malformed stored avatar state is neither absence nor replaceable success", async () => {
  const image = canonicalAvatarPng(png().toString("base64"))!;
  for (const invalid of [{ avatarRevision: 1 }, { avatarPngBase64: null, avatarSourceSha256: null },
    { avatarPngBase64: null, avatarSourceSha256: null, avatarRevision: 0 },
    { avatarPngBase64: null, avatarSourceSha256: image.sourceSha256, avatarRevision: 1 },
    { avatarPngBase64: image.pngBase64, avatarSourceSha256: null, avatarRevision: 1 },
    { avatarPngBase64: image.pngBase64, avatarSourceSha256: "X".repeat(64), avatarRevision: 1 },
    { avatarPngBase64: "invalid", avatarSourceSha256: image.sourceSha256, avatarRevision: 1 },
    { avatarPngBase64: png({ before: [pngChunk("tEXt", Buffer.from("a\0b"))] }).toString("base64"), avatarSourceSha256: image.sourceSha256, avatarRevision: 1 },
    { avatarPngBase64: null, avatarSourceSha256: null, avatarRevision: 1.5 }]) {
    const { store, repository } = avatarFixture(invalid), before = structuredClone(store.rows);
    assert.deepEqual(await repository.getAvatar(uid), { kind: "dependency_unavailable" });
    assert.deepEqual(await repository.saveAvatar(uid, { pngBase64: image.pngBase64, expectedRevision: 1 }), { kind: "dependency_unavailable" });
    assert.deepEqual(store.rows, before); assert.equal(store.writes, 0);
  }
});

test("a lost write acknowledgement is unavailable, attempted once, and recoverable by authoritative revision/hash readback", async () => {
  const { store, use } = avatarFixture(), source = png({ before: [pngChunk("tEXt", Buffer.from("a\0b"))] }).toString("base64");
  store.loseAck = true;
  assert.deepEqual(await use.saveAvatar({ principal, pngBase64: source, expectedRevision: 0 }), { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
  assert.equal(store.calls, 1); assert.equal(store.writes, 1);
  assert.deepEqual(await use.getAvatar(principal), { ok: true, value: { ...canonicalAvatarPng(source)!, revision: 1 } });
  assert.deepEqual(await use.saveAvatar({ principal, pngBase64: source, expectedRevision: 0 }),
    { ok: false, failure: appFailure("PROFILE_REVISION_PRECONDITION_FAILED") });
  assert.equal(store.writes, 1);
});

test("provider failure and missing optional composition remain unavailable without exposing details", async () => {
  const repo = new FirestoreOwnAvatarRepository(new FailingFirestoreGateway());
  assert.deepEqual(await repo.getAvatar(uid), { kind: "dependency_unavailable" });
  assert.deepEqual(await repo.saveAvatar(uid, { pngBase64: null, expectedRevision: 0 }), { kind: "dependency_unavailable" });
  const legacy = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(new InMemoryFirestoreGateway({})));
  assert.deepEqual(await legacy.getAvatar(principal), { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
  assert.deepEqual(await legacy.saveAvatar({ principal, pngBase64: null, expectedRevision: 0 }), { ok: false, failure: appFailure("SERVICE_UNAVAILABLE") });
});

test("legacy profile/settings operations preserve avatars and their old projections", async () => {
  const image = canonicalAvatarPng(png().toString("base64"))!;
  const fields = { avatarPngBase64: image.pngBase64, avatarSourceSha256: image.sourceSha256, avatarRevision: 4 };
  const store = new InMemoryFirestoreGateway({ [bindingPath]: { accountId: "owner" }, "accounts/owner": { ...baseAccount, ...fields } });
  const repository = new FirestoreAccountPreferencesRepository(store);
  const profile = await repository.getProfile(uid); assert.equal(profile.kind, "found");
  if (profile.kind === "found") assert.deepEqual(Object.keys(profile.value).sort(), ["details", "displayName", "profileVisibility", "revision", "username"]);
  assert.equal((await repository.saveProfile(uid, { displayName: "Updated", profileVisibility: "public", expectedRevision: 3 })).kind, "saved");
  assert.equal((await repository.saveSettings(uid, { checkInVisibility: "friends_only", optionalProcessingConsent: "rejected", expectedRevision: 7 })).kind, "saved");
  for (const [field, value] of Object.entries(fields)) assert.equal(store.read("accounts/owner")![field], value);
  assert.equal(store.read("accounts/owner")!.purposeRevocationGeneration, 2);
});
