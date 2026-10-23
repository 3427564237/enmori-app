import assert from "node:assert/strict";
import test from "node:test";
import { CreateCheckIn } from "../../src/check-ins/application/create-check-in.js";
import { EditCheckIn } from "../../src/check-ins/application/edit-check-in.js";
import { GetCheckIn } from "../../src/check-ins/application/get-check-in.js";
import { ListOwnCheckInsForDate } from "../../src/check-ins/application/check-in-history.js";
import { FirestoreCheckInRepository } from "../../src/check-ins/infrastructure/firestore-check-in-repository.js";
import { FirestoreCheckInMutations } from "../../src/check-ins/infrastructure/firestore-check-in-mutations.js";
import { FirestoreCheckInHistoryRepository } from "../../src/check-ins/infrastructure/firestore-check-in-history-repository.js";
import { AesGcmHistoryCursorCodec } from "../../src/check-ins/infrastructure/aes-gcm-history-cursor-codec.js";
import type { CheckInHistoryFirestoreGateway } from "../../src/check-ins/ports/check-in-history-firestore-gateway.js";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { ok, type Result } from "../../src/shared/domain/result.js";
import { InMemoryFirestoreGateway } from "../support/in-memory-firestore-gateway.js";

function value<T, E>(result: Result<T, E>): T {
  assert(result.ok);
  return result.value;
}

test("Journal new-draft saves independently and App Today rereads current owned facts after edit/delete", async () => {
  const now = "2026-10-23T02:00:00.000Z", principal = { firebaseUid: "owner-uid" };
  const sourceTime = "2026-10-22T01:00:00.000Z";
  const source = { ownerAccountId: "owner", note: "A walk", mood: "Calm", activity: "Walking",
    createdAt: sourceTime, checkInVisibility: "public", locationLabel: "Old garden",
    location: { latitude: 1.3521, longitude: 103.8198 },
    weather: { projectionVersion: "weather_projection_v1", source: "open_meteo",
      observedAt: sourceTime, temperatureCelsius: 27.3, condition: "rain" } };
  const account = { username: "owner_member", optionalProcessingConsent: "rejected",
    checkInVisibility: "private", onboardingCompletedAt: sourceTime };
  const store = new InMemoryFirestoreGateway({
    [`auth_bindings/${createAuthBindingDocumentId(principal.firebaseUid)}`]: { accountId: "owner" },
    [`auth_bindings/${createAuthBindingDocumentId("other-uid")}`]: { accountId: "other" },
    "accounts/owner": account, "accounts/other": { ...account, username: "other_member" },
    "check_ins/source": source,
    "check_ins/day-start": { ownerAccountId: "owner", note: "Start", createdAt: "2026-10-22T16:00:00.000Z" },
    "check_ins/day-end": { ownerAccountId: "owner", note: "Next day", createdAt: "2026-10-23T16:00:00.000Z" },
    "check_ins/foreign": { ownerAccountId: "other", note: "Other", createdAt: now },
  });
  // A query fake only: actual application, persistence mapping, ownership,
  // revision and idempotency code are shared by both consumers below.
  const historyGateway: CheckInHistoryFirestoreGateway = { runTransaction: work => store.runTransaction(tx => work({
    get: path => tx.get(path),
    listCheckInHistoryPage: async input => (await tx.list("check_ins"))
      .filter(row => row.data.ownerAccountId === input.ownerAccountId && typeof row.data.createdAt === "string" &&
        row.data.createdAt >= input.startUtc && (input.endUtc === null || row.data.createdAt < input.endUtc))
      .sort((a, b) => String(b.data.createdAt).localeCompare(String(a.data.createdAt)) || b.id.localeCompare(a.id))
      .filter(row => !input.after || String(row.data.createdAt) < input.after.createdAt ||
        (row.data.createdAt === input.after.createdAt && row.id < input.after.checkInId)).slice(0, input.limit),
  })) };
  const clock = { now: () => ok(new Date(now)) };
  const history = new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(historyGateway),
    new AesGcmHistoryCursorCodec(Buffer.alloc(32, 7)), clock);
  const today = (firebaseUid = principal.firebaseUid) => history.execute({
    principal: { firebaseUid }, date: "2026-10-23", timeZone: "Asia/Singapore",
  });
  let providerCalls = 0, generatedIds = 0;
  const repository = new FirestoreCheckInRepository(store, { current: async () => {
    providerCalls++; throw new Error("No weather request belongs to a text-only new draft");
  } }, clock);
  const read = new GetCheckIn(repository), edit = new EditCheckIn(new FirestoreCheckInMutations(store));
  const create = new CreateCheckIn(repository, clock, { generate: () => ok(`new-${++generatedIds}`) });
  assert.deepEqual(value(await today()).checkIns.map(row => row.checkInId), ["day-start"]);
  const beforeRead = store.entries();
  const original = value(await read.execute({ principal, checkInId: "source" }));
  assert.deepEqual(store.entries(), beforeRead); // Reading/preparing does not save a draft.
  const command = { principal, note: original.note, mood: original.mood!, activity: original.activity!,
    idempotencyKey: "JournalNewDraftKey_20261023" };
  const saved = value(await create.execute(command));
  assert.equal(saved.disposition, "created");
  assert.notEqual(saved.checkIn.checkInId, original.checkInId);
  assert.equal(saved.checkIn.createdAt, now);
  assert.equal(saved.checkIn.checkInVisibility, "private");
  for (const key of ["locationLabel", "location", "weather"] as const) assert.equal(saved.checkIn[key], undefined);
  assert.deepEqual(store.read("check_ins/source"), source);
  assert.equal(providerCalls, 0);
  assert.deepEqual(value(await read.execute({ principal, checkInId: saved.checkIn.checkInId })), saved.checkIn);
  const replay = value(await create.execute(command));
  assert.equal(replay.disposition, "replayed");
  assert.deepEqual(replay.checkIn, saved.checkIn);
  assert.deepEqual(value(await today()).checkIns.map(row => row.checkInId), [saved.checkIn.checkInId, "day-start"]);

  const change = { principal, checkInId: saved.checkIn.checkInId, expectedRevision: 1,
    note: "Edited after opening from Home", mood: "Calm", activity: "Walking", checkInVisibility: "friends_only" };
  const updated = value(await edit.update(change));
  assert.equal(updated.revision, 2);
  assert.equal(updated.createdAt, now);
  assert.deepEqual(value(await today()).checkIns[0], updated);
  const stale = await edit.update(change);
  assert.equal(!stale.ok && stale.failure.code, "CHECKIN_REVISION_PRECONDITION_FAILED");
  value(await edit.remove({ ...change, expectedRevision: 2 }));
  assert.deepEqual(value(await today()).checkIns.map(row => row.checkInId), ["day-start"]);
  const deleted = await read.execute({ principal, checkInId: saved.checkIn.checkInId });
  const foreign = await read.execute({ principal: { firebaseUid: "other-uid" }, checkInId: "source" });
  assert.equal(!deleted.ok && deleted.failure.code, "CHECKIN_UNAVAILABLE");
  assert.deepEqual(foreign, deleted);
  assert.deepEqual(value(await today("other-uid")).checkIns.map(row => row.checkInId), ["foreign"]);
  assert.deepEqual(store.read("check_ins/source"), source);
});
