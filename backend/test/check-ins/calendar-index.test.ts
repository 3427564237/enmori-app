import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Firestore, type AggregateField, type AggregateQuery, type Transaction } from "firebase-admin/firestore";
import { FirebaseAdminCheckInHistoryGateway } from "../../src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";

// Real SDK query construction with a fake transaction: no network, credentials,
// Emulator or business records. Protect the index contract that failed on v25.
for (const endUtc of ["2026-10-21T16:00:00.000Z", null]) {
  test(`calendar count uses the existing descending history index (end=${endUtc})`, async () => {
    const indexes = JSON.parse(readFileSync(new URL("../../../../firestore.indexes.json", import.meta.url), "utf8"));
    const index = indexes.indexes.find((entry: { collectionGroup: string; fields: unknown }) =>
      entry.collectionGroup === "check_ins" && JSON.stringify(entry.fields) === JSON.stringify([
        { fieldPath: "ownerAccountId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" },
        { fieldPath: "__name__", order: "DESCENDING" },
      ]));
    assert.ok(index, "Reuse the approved history index without creating another index");
    const sdk = new Firestore({ projectId: "demo-enmori-calendar-query" });
    const input = { ownerAccountId: "synthetic-owner", startUtc: "2026-10-20T16:00:00.000Z", endUtc };
    let expected = sdk.collection("check_ins")
      .where("ownerAccountId", "==", input.ownerAccountId)
      .where("createdAt", ">=", input.startUtc)
      .orderBy("createdAt", "desc");
    if (endUtc !== null) expected = expected.where("createdAt", "<", endUtc);
    let reads = 0;
    const gateway = new FirebaseAdminCheckInHistoryGateway({
      collection: sdk.collection.bind(sdk),
      runTransaction: async <T>(work: (tx: Transaction) => Promise<T>) => work({
        get: async (query: AggregateQuery<{ count: AggregateField<number> }>) => {
          reads++;
          assert.equal(query.isEqual(expected.count()), true,
            "Count must keep the owner/range and match the deployed descending index");
          return { data: () => ({ count: 4 }) };
        },
      } as unknown as Transaction),
    } as unknown as Firestore);
    try {
      assert.equal(await gateway.runTransaction(tx => tx.countCheckIns!(input)), 4);
      assert.equal(reads, 1);
    } finally {
      await sdk.terminate();
    }
  });
}
