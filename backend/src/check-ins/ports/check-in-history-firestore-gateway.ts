import type { StoredDocument, StoredDocumentEntry } from "../../shared/infrastructure/firebase/firestore-gateway.js";

export interface CheckInHistoryTransaction {
  get(path: string): Promise<StoredDocument | undefined>;
  listCheckInHistoryPage(input: {
    readonly ownerAccountId: string;
    readonly startUtc: string;
    readonly endUtc: string | null;
    readonly after?: { readonly createdAt: string; readonly checkInId: string };
    readonly limit: number;
  }): Promise<readonly StoredDocumentEntry[]>;
}

export interface CheckInHistoryFirestoreGateway {
  runTransaction<T>(work: (transaction: CheckInHistoryTransaction) => Promise<T>): Promise<T>;
}
