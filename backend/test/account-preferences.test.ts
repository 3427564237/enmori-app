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
  assert.deepEqual(await repo.getProfile(uid), { kind: "found", value: { username: "member_a", displayName: null, profileVisibility: "private", revision: 0 } });
  assert.deepEqual(await repo.getSettings(uid), { kind: "found", value: { checkInVisibility: "public", optionalProcessingConsent: "accepted", revision: 0 } });
  assert.equal((await repo.getProfile("unbound")).kind, "onboarding_required");
  assert.deepEqual(store.entries(), before);
});

test("Profile saves normalize, allow explicit clearing and preserve Settings/unrelated fields", async () => {
  const { use, repo, store } = fixture({ settingsRevision: 3, unrelated: "retained" });
  const first = await use.saveProfile({ principal, displayName: " Alex ", profileVisibility: "friends_only", expectedRevision: 0 });
  assert.deepEqual(first, { ok: true, value: { username: "member_a", displayName: "Alex", profileVisibility: "friends_only", revision: 1 } });
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
