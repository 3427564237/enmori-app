import type {
  DocumentData,
  Firestore,
  Transaction,
} from "firebase-admin/firestore";

export type StoredDocument = Readonly<Record<string, unknown>>;
export interface StoredDocumentEntry {
  readonly id: string;
  readonly data: StoredDocument;
}

export interface FirestoreTransactionGateway {
  get(path: string): Promise<StoredDocument | undefined>;
  list(collectionPath: string): Promise<readonly StoredDocumentEntry[]>;
  create(path: string, data: StoredDocument): void;
  set(path: string, data: StoredDocument): void;
}

export interface FirestoreGateway {
  runTransaction<T>(
    work: (transaction: FirestoreTransactionGateway) => Promise<T>,
  ): Promise<T>;
}

class FirebaseAdminTransactionGateway
  implements FirestoreTransactionGateway
{
  public constructor(
    private readonly firestore: Firestore,
    private readonly transaction: Transaction,
  ) {}

  public async get(path: string): Promise<StoredDocument | undefined> {
    const snapshot = await this.transaction.get(this.firestore.doc(path));
    if (!snapshot.exists) return undefined;
    const data = snapshot.data();
    return data === undefined ? undefined : { ...data };
  }

  public async list(
    collectionPath: string,
  ): Promise<readonly StoredDocumentEntry[]> {
    const snapshot = await this.transaction.get(
      this.firestore.collection(collectionPath),
    );
    return snapshot.docs.map((document) => ({
      id: document.id,
      data: { ...document.data() },
    }));
  }

  public create(path: string, data: StoredDocument): void {
    this.transaction.create(
      this.firestore.doc(path),
      data as DocumentData,
    );
  }

  public set(path: string, data: StoredDocument): void {
    this.transaction.set(
      this.firestore.doc(path),
      data as DocumentData,
    );
  }
}

export class FirebaseAdminFirestoreGateway implements FirestoreGateway {
  public constructor(private readonly firestore: Firestore) {}

  public runTransaction<T>(
    work: (transaction: FirestoreTransactionGateway) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction((transaction) =>
      work(new FirebaseAdminTransactionGateway(this.firestore, transaction)),
    );
  }
}
