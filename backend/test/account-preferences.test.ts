import { emptyProfileDetails, privateFields } from "../src/account/domain/profile-details.js";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDisplayName } from "../src/account/domain/profile-values.js";
import { OwnAccountPreferences } from "../src/account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../src/account/infrastructure/firestore-account-preferences-repository.js";
import { createAuthBindingDocumentId } from "../src/shared/infrastructure/firebase/firestore-records.js";
import { InMemoryFirestoreGateway, FailingFirestoreGateway } from "./support/in-memory-firestore-gateway.js";

const uid = "account-preference-test";
const principal = { firebaseUid: uid };
const base = { username: "member_a", optionalProcessingConsent: "accepted", checkInVisibility: "public", onboardingCompletedAt: "2026-10-05T00:00:00.000Z" };
function fixture(extra: Record<string, unknown> = {}) {
  const store = new InMemoryFirestoreGateway({ [`auth_bindings/${createAuthBindingDocumentId(uid)!}`]: { accountId: "owner" },
    "accounts/owner": { ...base, ...extra }, "accounts/other": { ...base, username: "member_b" } });
  const repo = new FirestoreAccountPreferencesRepository(store);
  return { store, repo, use: new OwnAccountPreferences(repo) };
}

test("DisplayName normalization counts scalars and rejects unsafe/name-invalid input", () => {
  assert.equal(normalizeDisplayName(null), null);
  assert.equal(normalizeDisplayName(" \u2003Alex  Li\u2003 "), "Alex  Li");
  assert.equal(normalizeDisplayName("😀".repeat(50)), "😀".repeat(50));
  for (const input of [undefined, 2, "", "  ", "a".repeat(51), "😀".repeat(51), "a\nb", "a\u2028b", "a\u200db", "a\u202eb", "a\u0000b", "\ud800"]) {
    assert.equal(normalizeDisplayName(input), undefined);
  }
});

test("legacy reads are minimized, private and read-only; missing binding is onboarding required", async () => {
  const { store, repo } = fixture(); const before = store.entries();
  assert.deepEqual(await repo.getProfile(uid), { kind: "found", value: { details: emptyProfileDetails, username: "member_a", displayName: null, profileVisibility: "private", revision: 0 } });
  assert.deepEqual(await repo.getSettings(uid), { kind: "found", value: { defaultCheckInLocation:false, defaultCheckInWeather:false, homeWeatherAuto:false, fieldPrivacy: privateFields, checkInVisibility: "public", optionalProcessingConsent: "accepted", revision: 0 } });
  assert.equal((await repo.getProfile("unbound")).kind, "onboarding_required");
  assert.deepEqual(store.entries(), before);
});

test("Profile saves normalize, allow explicit clearing and preserve Settings/unrelated fields", async () => {
  const { use, repo, store } = fixture({ settingsRevision: 3, unrelated: "retained" });
  const first = await use.saveProfile({ principal, displayName: " Alex ", profileVisibility: "friends_only", expectedRevision: 0 });
  assert.deepEqual(first, { ok: true, value: { details: emptyProfileDetails, username: "member_a", displayName: "Alex", profileVisibility: "friends_only", revision: 1 } });
  assert.deepEqual(await repo.getProfile(uid), { kind: "found", value: first.ok ? first.value : undefined });
  assert.equal(store.read("accounts/owner")!.settingsRevision, 3);
  assert.equal(store.read("accounts/owner")!.unrelated, "retained");
  assert.deepEqual(store.read("accounts/other"), { ...base, username: "member_b" });
  const cleared = await use.saveProfile({ principal, displayName: null, profileVisibility: "public", expectedRevision: 1 });
  assert.equal(cleared.ok, true);
  assert.equal(store.read("accounts/owner")!.displayName, null);
});

test("Settings choices are independent and preserve Profile; stale retries have no effect", async () => {
  const { use, store } = fixture({ displayName: "Alex", profileVisibility: "private", profileRevision: 7 });
  const saved = await use.saveSettings({ principal, checkInVisibility: "friends_only", optionalProcessingConsent: "rejected", expectedRevision: 0 });
  assert.equal(saved.ok, true);
  const before = store.entries();
  const stale = await use.saveSettings({ principal, checkInVisibility: "public", optionalProcessingConsent: "accepted", expectedRevision: 0 });
  assert.equal(stale.ok, false); if (!stale.ok) assert.equal(stale.failure.code, "SETTINGS_REVISION_PRECONDITION_FAILED");
  assert.deepEqual(store.entries(), before);
  const record = store.read("accounts/owner")!;
  assert.equal(record.profileRevision, 7); assert.equal(record.profileVisibility, "private");
  assert.equal(record.checkInVisibility, "friends_only"); assert.equal(record.optionalProcessingConsent, "rejected");
});

test("invalid input and stale Profile revisions cannot modify persistence", async () => {
  const { use, store } = fixture({ displayName: null, profileVisibility: "private", profileRevision: 1 }); const before = store.entries();
  for (const expectedRevision of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, "1"]) {
    const r = await use.saveProfile({ principal, displayName: "Alex", profileVisibility: "public", expectedRevision });
    assert.equal(r.ok, false); if (!r.ok) assert.equal(r.failure.code, "PROFILE_INVALID");
  }
  const stale = await use.saveProfile({ principal, displayName: "Alex", profileVisibility: "public", expectedRevision: 0 });
  assert.equal(stale.ok, false); if (!stale.ok) assert.equal(stale.failure.code, "PROFILE_REVISION_PRECONDITION_FAILED");
  assert.equal((await use.saveSettings({ principal, checkInVisibility: "public", optionalProcessingConsent: "unknown", expectedRevision: 0 })).ok, false);
  assert.deepEqual(store.entries(), before);
});

test("partial/corrupt records and revision overflow fail closed without writes", async () => {
  for (const extra of [{ displayName: "Alex" }, { displayName: " Alex ", profileVisibility: "public", profileRevision: 1 },
    { displayName: null, profileVisibility: "unknown", profileRevision: 1 }, { displayName: null, profileVisibility: "public", profileRevision: 0 }]) {
    const { repo, store } = fixture(extra); const before = store.entries();
    assert.equal((await repo.getProfile(uid)).kind, "dependency_unavailable");
    assert.equal((await repo.saveProfile(uid, { displayName: null, profileVisibility: "private", expectedRevision: 0 })).kind, "dependency_unavailable");
    assert.deepEqual(store.entries(), before);
  }
  for (const extra of [{ settingsRevision: null }, { settingsRevision: 0 }, { checkInVisibility: "unknown" }]) {
    assert.equal((await fixture(extra).repo.getSettings(uid)).kind, "dependency_unavailable");
  }
  const { use, store } = fixture({ displayName: null, profileVisibility: "private", profileRevision: Number.MAX_SAFE_INTEGER, settingsRevision: Number.MAX_SAFE_INTEGER });
  const before = store.entries();
  assert.equal((await use.saveProfile({ principal, displayName: null, profileVisibility: "public", expectedRevision: Number.MAX_SAFE_INTEGER })).ok, false);
  assert.equal((await use.saveSettings({ principal, checkInVisibility: "public", optionalProcessingConsent: "accepted", expectedRevision: Number.MAX_SAFE_INTEGER })).ok, false);
  assert.deepEqual(store.entries(), before);
});

test("vendor failures map to stable unavailable results", async () => {
  const use = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(new FailingFirestoreGateway()));
  const r = await use.getProfile(principal);
  assert.deepEqual(r, { ok: false, failure: { code: "SERVICE_UNAVAILABLE", message: "This service is temporarily unavailable. Try again." } });
});

test('expanded profile persists across repository recreation and old writers preserve details', async () => {
  const { use, store } = fixture();
  const details = { bio: ' Photography ', affiliationType: 'school', affiliationName: ' University ', region: ' Singapore ' };
  const result = await use.saveProfile({ principal, displayName: 'Alex', profileVisibility: 'private', details, expectedRevision: 0 });
  assert.equal(result.ok, true);
  const restarted = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(store));
  const read = await restarted.getProfile(principal);
  assert.equal(read.ok, true);
  if (read.ok) assert.deepEqual(read.value.details, { bio: 'Photography', affiliationType: 'school', affiliationName: 'University', region: 'Singapore' });
  assert.equal((await restarted.saveProfile({ principal, displayName: 'New name', profileVisibility: 'private', expectedRevision: 1 })).ok, true);
  const again = await restarted.getProfile(principal);
  if (read.ok && again.ok) assert.deepEqual(again.value.details, read.value.details);
  const before = store.entries();
  assert.equal((await restarted.saveProfile({ principal, displayName: 'Overwrite', profileVisibility: 'public', details, expectedRevision: 1 })).ok, false);
  assert.deepEqual(store.entries(), before);
});

test('field privacy persists independently of consent without rewriting history or another account', async () => {
  const { use, store } = fixture();
  await store.runTransaction(async tx => tx.create('check_ins/history', { ownerAccountId: 'owner', visibility: 'private' }));
  const other = store.read('accounts/other');
  const fieldPrivacy = { interests: 'friends_only', location: 'private', participation: 'public', mapSharedWithFriends: false };
  assert.equal((await use.saveSettings({ principal, checkInVisibility: 'public', optionalProcessingConsent: 'rejected', fieldPrivacy, expectedRevision: 0 })).ok, true);
  const read = await new FirestoreAccountPreferencesRepository(store).getSettings(uid);
  assert.equal(read.kind, 'found');
  if (read.kind === 'found') assert.deepEqual(read.value.fieldPrivacy, fieldPrivacy);
  assert.deepEqual(store.read('check_ins/history'), { ownerAccountId: 'owner', visibility: 'private' });
  assert.deepEqual(store.read('accounts/other'), other);
  const before = store.entries();
  for (const malformed of [{ ...fieldPrivacy, mapSharedWithFriends: 'true' }, { ...fieldPrivacy, location: 'everyone' }, { ...fieldPrivacy, uid: 'other' }]) {
    assert.equal((await use.saveSettings({ principal, checkInVisibility: 'private', optionalProcessingConsent: 'accepted', fieldPrivacy: malformed, expectedRevision: 1 })).ok, false);
  }
  assert.deepEqual(store.entries(), before);
});

test('explicit Check-in defaults persist, revoke independently, and legacy writes preserve them', async () => {
  const {use, store, repo} = fixture();
  const historical = {ownerAccountId:'owner',note:'Historical',createdAt:'2026-10-19T00:00:00.000Z'};
  await store.runTransaction(async tx => tx.create('check_ins/history',historical));
  const common = {principal,checkInVisibility:'private',optionalProcessingConsent:'rejected'};
  const enabled = await use.saveSettings({...common,defaultCheckInLocation:true,defaultCheckInWeather:true,expectedRevision:0});
  assert.equal(enabled.ok,true);
  const restarted = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(store));
  const read = await restarted.getSettings(principal);
  assert.ok(read.ok); if(read.ok){assert.equal(read.value.defaultCheckInLocation,true);assert.equal(read.value.defaultCheckInWeather,true);}
  assert.equal((await restarted.saveSettings({...common,expectedRevision:1})).ok,true);
  assert.equal((await restarted.saveSettings({...common,defaultCheckInLocation:false,expectedRevision:2})).ok,true);
  const revoked = await repo.getSettings(uid); assert.equal(revoked.kind,'found');
  if(revoked.kind==='found'){assert.equal(revoked.value.defaultCheckInLocation,false);assert.equal(revoked.value.defaultCheckInWeather,true);}
  const before=store.entries();
  for(const invalid of ['true',1,null,{}]) assert.equal((await use.saveSettings({...common,defaultCheckInWeather:invalid,expectedRevision:3})).ok,false);
  assert.equal((await use.saveSettings({...common,defaultCheckInLocation:true,expectedRevision:1})).ok,false);
  assert.deepEqual(store.entries(),before); assert.deepEqual(store.read('check_ins/history'),historical);
  assert.equal((await fixture({defaultCheckInLocation:'true'}).repo.getSettings(uid)).kind,'dependency_unavailable');
});


test('Home weather preference is independent, persisted, omission preserving and revision protected', async () => {
  const {use, store} = fixture();
  const common = {principal, checkInVisibility:'private', optionalProcessingConsent:'rejected'};
  assert.equal((await use.saveSettings({...common, homeWeatherAuto:true, expectedRevision:0})).ok, true);
  const restarted = new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(store));
  const saved = await restarted.getSettings(principal);
  assert.ok(saved.ok);
  if (saved.ok) {
    assert.equal(saved.value.homeWeatherAuto, true);
    assert.equal(saved.value.defaultCheckInWeather, false);
    assert.equal(saved.value.defaultCheckInLocation, false);
  }
  assert.equal((await restarted.saveSettings({...common, defaultCheckInWeather:true, expectedRevision:1})).ok, true);
  const legacy = await restarted.getSettings(principal);
  if (legacy.ok) assert.equal(legacy.value.homeWeatherAuto, true);
  assert.equal((await restarted.saveSettings({...common, homeWeatherAuto:false, expectedRevision:1})).ok, false);
  assert.equal((await restarted.saveSettings({...common, homeWeatherAuto:'true', expectedRevision:2})).ok, false);
  assert.equal((await restarted.saveSettings({...common, homeWeatherAuto:false, expectedRevision:2})).ok, true);
  const revoked = await restarted.getSettings(principal);
  if (revoked.ok) { assert.equal(revoked.value.homeWeatherAuto, false); assert.equal(revoked.value.defaultCheckInWeather, true); }
});
