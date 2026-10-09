import { FieldPath, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import type { CheckInHistoryFirestoreGateway, CheckInHistoryTransaction } from "../ports/check-in-history-firestore-gateway.js";

class FirebaseAdminCheckInHistoryTransaction implements CheckInHistoryTransaction {
  public constructor(private readonly firestore: Firestore, private readonly transaction: Transaction) {}

  public async get(path: string): Promise<StoredDocument | undefined> {
    const snapshot = await this.transaction.get(this.firestore.doc(path));
    if (!snapshot.exists) return undefined;
    const data = snapshot.data();
    return data === undefined ? undefined : { ...data };
  }

  public async listCheckInHistoryPage(input: Parameters<CheckInHistoryTransaction["listCheckInHistoryPage"]>[0]) {
    let query = this.firestore.collection("check_ins")
      .where("ownerAccountId", "==", input.ownerAccountId)
      .where("createdAt", ">=", input.startUtc)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(input.limit);
    if (input.endUtc !== null) query = query.where("createdAt", "<", input.endUtc);
    if (input.after !== undefined) query = query.startAfter(input.after.createdAt, input.after.checkInId);
    const snapshot = await this.transaction.get(query);
    return snapshot.docs.map(document => ({ id: document.id, data: { ...document.data() } }));
  }
}

export class FirebaseAdminCheckInHistoryGateway implements CheckInHistoryFirestoreGateway {
  public constructor(private readonly firestore: Firestore) {}

  public runTransaction<T>(work: (transaction: CheckInHistoryTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(transaction =>
      work(new FirebaseAdminCheckInHistoryTransaction(this.firestore, transaction)));
  }
}
