import type { CheckInHistoryRepository, CheckInHistoryRepositoryResult } from "../ports/check-in-history-repository.js";
import type { CheckInHistoryFirestoreGateway } from "../ports/check-in-history-firestore-gateway.js";
import { createAuthBindingDocumentId, isSafeDocumentId, parseAccountProjection, parseAuthBinding, parseCheckInProjection } from "../../shared/infrastructure/firebase/firestore-records.js";

function canonicalUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export class FirestoreCheckInHistoryRepository implements CheckInHistoryRepository {
  public constructor(private readonly firestore: CheckInHistoryFirestoreGateway) {}

  public async listForDate(query: Parameters<CheckInHistoryRepository["listForDate"]>[0]): Promise<CheckInHistoryRepositoryResult> {
    const bindingId = createAuthBindingDocumentId(query.firebaseUid);
    if (bindingId === undefined) return { kind: "dependency_unavailable" };
    try {
      return await this.firestore.runTransaction(async transaction => {
        const binding = await transaction.get(`auth_bindings/${bindingId}`);
        if (binding === undefined) return { kind: "onboarding_required" };
        const accountId = parseAuthBinding(binding);
        if (accountId === undefined) return { kind: "dependency_unavailable" };
        const account = await transaction.get(`accounts/${accountId}`);
        if (account === undefined || parseAccountProjection(account) === undefined) return { kind: "dependency_unavailable" };

        if (query.cursor !== undefined && (
          query.cursor.ownerAccountId !== accountId ||
          query.cursor.date !== query.date ||
          query.cursor.timeZone !== query.timeZone ||
          query.cursor.startUtc !== query.startUtc ||
          query.cursor.endUtc !== query.endUtc ||
          query.cursor.lastCreatedAt < query.startUtc ||
          (query.endUtc !== null && query.cursor.lastCreatedAt >= query.endUtc)
        )) return { kind: "invalid_cursor" };
        if (query.empty) return { kind: "page", accountId, rows: [] };

        const entries = await transaction.listCheckInHistoryPage({
          ownerAccountId: accountId,
          startUtc: query.startUtc,
          endUtc: query.endUtc,
          ...(query.cursor === undefined ? {} : { after: { createdAt: query.cursor.lastCreatedAt, checkInId: query.cursor.lastCheckInId } }),
          limit: query.pageSize + 1,
        });
        const rows = [];
        for (const entry of entries) {
          if (!isSafeDocumentId(entry.id) || entry.data.ownerAccountId !== accountId || typeof entry.data.createdAt !== "string" || !canonicalUtc(entry.data.createdAt)) return { kind: "dependency_unavailable" };
          const projection = parseCheckInProjection(entry.data, entry.id);
          if (projection === undefined) return { kind: "dependency_unavailable" };
          rows.push(projection);
        }
        return { kind: "page", accountId, rows };
      });
    } catch {
      return { kind: "dependency_unavailable" };
    }
  }
}
