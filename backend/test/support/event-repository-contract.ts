import assert from "node:assert/strict";
import test from "node:test";
import type { EventRecommendationRepository } from "../../src/event-recommendations/ports/event-recommendation-repository.js";
import { RecommendEvents } from "../../src/event-recommendations/application/recommend-events.js";
import { ok } from "../../src/shared/domain/result.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";

export type FixtureDocuments = Record<string, Record<string, unknown>>;
export const EVENT_TEST_UID = "s2-shi-synthetic-member";
export const EVENT_AS_OF = "2026-09-15T00:00:00.000Z";
export function eventTestRecords(): FixtureDocuments {
  const event = (interestTagIds: string[], startAt = "2026-09-16T00:00:00Z") => ({
    title: "Synthetic Event", active: true, published: true, startAt,
    endAt: "2026-09-17T00:00:00Z", interestTagIds,
  });
  return {
    [`auth_bindings/${createAuthBindingDocumentId(EVENT_TEST_UID)!}`]: { accountId: "s2-account" },
    "accounts/s2-account": { username: "s2_member", optionalProcessingConsent: "rejected",
      checkInVisibility: "private", onboardingCompletedAt: "2026-09-14T00:00:00Z" },
    "account_interests/s2-account": { interestTagIds: ["interest_community", "interest_music", "interest_inactive"], revision: 1 },
    "interest_tags/interest_community": { displayName: "Community", lifecycleState: "active", revision: 1 },
    "interest_tags/interest_music": { displayName: "Music", lifecycleState: "active", revision: 1 },
    "interest_tags/interest_inactive": { displayName: "Inactive", lifecycleState: "inactive", revision: 1 },
    "events/ev_z": event(["interest_community"]),
    "events/ev_a": event(["interest_community"]),
    "events/ev_score2": event(["interest_music", "interest_community", "interest_music"]),
    "events/ev_early": event(["interest_community"], "2026-09-15T00:00:00.000000001Z"),
    "events/ev_inactive_tag": event(["interest_inactive"]),
    "events/ev_started": event(["interest_community"], EVENT_AS_OF),
    "events/ev_draft": { ...event(["interest_community"]), published: false },
    "events/ev_disabled": { ...event(["interest_community"]), active: false },
    "events/ev_unknown": event(["unknown"]),
    "events/ev_bad_field": { ...event(["interest_community"]), eventId: "duplicate-field" },
    "events/ev_bad_time": event(["interest_community"], "2026-02-30T00:00:00Z"),
    "events/ev_bad_duration": { ...event(["interest_community"]), endAt: "2026-09-15T00:00:00Z" },
    "accounts/unrelated": { syntheticUnrelatedMarker: "preserve" },
    "account_interests/unrelated": { interestTagIds: ["interest_music"], revision: 99 },
  };
}

export function eventRepositoryContract(label: string, create: (documents: FixtureDocuments) => Promise<{
  readonly repository: EventRecommendationRepository;
  readonly change: (path: string, data: Record<string, unknown>) => Promise<void>;
  readonly dump: () => Promise<FixtureDocuments>;
}>): void {
  test(`${label}: persisted eligibility, exact future precision and complete order`, async () => {
    const fixture = await create(eventTestRecords());
    const before = await fixture.dump();
    const useCase = new RecommendEvents(fixture.repository, { now: () => ok(new Date(EVENT_AS_OF)) });
    const result = await useCase.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.items.map((event) => event.eventId), ["ev_score2", "ev_early", "ev_a", "ev_z"]);
      assert.deepEqual(result.value.items[0]!.matchedInterests,
        [{ interestTagId: "interest_community", displayName: "Community" },
          { interestTagId: "interest_music", displayName: "Music" }]);
    }
    assert.deepEqual(await fixture.dump(), before, "recommendation reads must not persist history or change accounts");
  });
  test(`${label}: missing own selection is successful empty`, async () => {
    const records = eventTestRecords(); delete records["account_interests/s2-account"];
    const { repository } = await create(records);
    const result = await repository.readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF });
    assert.equal(result.kind, "ready");
    if (result.kind === "ready") assert.deepEqual(result.sources.selectedInterestTagIds, []);
  });
  test(`${label}: missing or invalid binding/account cannot read another selection`, async () => {
    for (const path of [`auth_bindings/${createAuthBindingDocumentId(EVENT_TEST_UID)!}`, "accounts/s2-account"]) {
      const records = eventTestRecords(); delete records[path];
      const { repository } = await create(records);
      assert.deepEqual(await repository.readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF }),
        { kind: "onboarding_required" });
    }
  });
  test(`${label}: invalid own selection fails closed, not fabricated empty`, async () => {
    const records = eventTestRecords(); records["account_interests/s2-account"] = { interestTagIds: ["interest_music", "interest_music"], revision: 1 };
    const { repository } = await create(records);
    assert.deepEqual(await repository.readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF }), { kind: "dependency_unavailable" });
  });
  test(`${label}: new requests observe tag deactivation, restore and label rename`, async () => {
    const fixture = await create(eventTestRecords());
    const useCase = new RecommendEvents(fixture.repository, { now: () => ok(new Date(EVENT_AS_OF)) });
    await fixture.change("interest_tags/interest_community", { displayName: "Community", lifecycleState: "inactive", revision: 2 });
    const inactive = await useCase.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "all" });
    assert.equal(inactive.ok, true);
    if (inactive.ok) assert.deepEqual(inactive.value.items.map((event) => event.eventId), ["ev_score2"]);
    await fixture.change("interest_tags/interest_community", { displayName: "Renamed", lifecycleState: "active", revision: 3 });
    const restored = await useCase.execute({ principal: { firebaseUid: EVENT_TEST_UID }, view: "home" });
    assert.equal(restored.ok, true);
    if (restored.ok) {
      assert.deepEqual(restored.value.items.map((event) => event.eventId), ["ev_score2", "ev_early"]);
      assert.equal(restored.value.items[0]!.matchedInterests[0]!.displayName, "Renamed");
    }
  });
  test(`${label}: invalid server asOf fails closed`, async () => {
    const { repository } = await create(eventTestRecords());
    assert.deepEqual(await repository.readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: "invalid" }), { kind: "dependency_unavailable" });
  });
}
