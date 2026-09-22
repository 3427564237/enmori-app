import assert from "node:assert/strict";
import test from "node:test";
import { FirestoreEventRecommendationRepository } from "../../src/event-recommendations/infrastructure/firestore-event-recommendation-repository.js";
import type { EventReadGateway } from "../../src/event-recommendations/infrastructure/event-read-gateway.js";
import { eventRepositoryContract, eventTestRecords, EVENT_TEST_UID, EVENT_AS_OF,
  type FixtureDocuments } from "../support/event-repository-contract.js";

class MemoryGateway implements EventReadGateway {
  public reads: string[] = [];
  public constructor(public readonly records: FixtureDocuments) {}
  public async get(path: string) { this.reads.push(path); return this.records[path]; }
  public async listEvents() {
    this.reads.push("events");
    return Object.entries(this.records).filter(([path]) => path.startsWith("events/"))
      .map(([path, data]) => ({ id: path.slice(7), data }));
  }
}
eventRepositoryContract("fake-gateway Port contract", async (documents) => {
  const records = structuredClone(documents);
  return { repository: new FirestoreEventRecommendationRepository(new MemoryGateway(records)),
    change: async (path, data) => { records[path] = data; }, dump: async () => structuredClone(records) };
});

test("account authorization happens before Interest/Event projection reads", async () => {
  const gateway = new MemoryGateway({});
  const result = await new FirestoreEventRecommendationRepository(gateway)
    .readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF });
  assert.deepEqual(result, { kind: "onboarding_required" });
  assert.equal(gateway.reads.length, 1);
  const records = eventTestRecords(); records["accounts/s2-account"] = { username: "invalid" };
  const invalid = new MemoryGateway(records);
  await new FirestoreEventRecommendationRepository(invalid).readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF });
  assert.equal(invalid.reads.length, 2);
  assert.equal(invalid.reads.some((path) => /interest|events/.test(path)), false);
});

test("vendor read/list failures are normalized without raw diagnostics", async () => {
  for (const failAt of ["get", "list"] as const) {
    const memory = new MemoryGateway(eventTestRecords());
    const gateway: EventReadGateway = {
      get: async (path) => { if (failAt === "get") throw new Error("synthetic-vendor-secret"); return memory.get(path); },
      listEvents: async () => { throw new Error("synthetic-vendor-secret"); },
    };
    const result = await new FirestoreEventRecommendationRepository(gateway)
      .readForRequester({ firebaseUid: EVENT_TEST_UID, asOf: EVENT_AS_OF });
    assert.deepEqual(result, { kind: "dependency_unavailable" });
  }
});
