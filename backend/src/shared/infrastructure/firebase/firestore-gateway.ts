import { FieldPath } from "firebase-admin/firestore";
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

/** Immutable service metadata, not a stored application timestamp field. */
export interface StoredDocumentSnapshot extends StoredDocumentEntry {
  readonly createTime: { readonly seconds: number; readonly nanoseconds: number };
}

export interface FirestoreTransactionGateway {
  get(path: string): Promise<StoredDocument | undefined>;
  getSnapshot?(path: string): Promise<StoredDocumentSnapshot | undefined>;
  listSnapshots?(collectionPath: string): Promise<readonly StoredDocumentSnapshot[]>;
  list(collectionPath: string): Promise<readonly StoredDocumentEntry[]>;
  create(path: string, data: StoredDocument): void;
  set(path: string, data: StoredDocument): void;
  delete?(path: string): void;
  listPage?(collectionPath: string, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]>;
}

export interface FirestoreGateway {
  runTransaction<T>(
    work: (transaction: FirestoreTransactionGateway) => Promise<T>,
    options?: { readonly maxAttempts: 1 },
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

  public async getSnapshot(path: string): Promise<StoredDocumentSnapshot | undefined> {
    const snapshot = await this.transaction.get(this.firestore.doc(path));
    const data = snapshot.data(), created = snapshot.createTime;
    if (!snapshot.exists) return undefined;
    if (data === undefined || created === undefined) throw new Error("Required immutable metadata unavailable");
    return { id: snapshot.id, data: { ...data },
      createTime: { seconds: created.seconds, nanoseconds: created.nanoseconds } };
  }

  public async listSnapshots(collectionPath: string): Promise<readonly StoredDocumentSnapshot[]> {
    const snapshot = await this.transaction.get(this.firestore.collection(collectionPath));
    return snapshot.docs.map(document => ({ id: document.id, data: { ...document.data() },
      createTime: { seconds: document.createTime.seconds, nanoseconds: document.createTime.nanoseconds } }));
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

  public delete(path: string): void { this.transaction.delete(this.firestore.doc(path)); }
  public async listPage(collectionPath: string, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]> {
    let query = this.firestore.collection(collectionPath).orderBy(FieldPath.documentId()).limit(limit);
    if (afterId !== undefined) query = query.startAfter(afterId);
    const snapshot = await this.transaction.get(query);
    return snapshot.docs.map(doc => ({ id: doc.id, data: { ...doc.data() } }));
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
    options?: { readonly maxAttempts: 1 },
  ): Promise<T> {
    const callback = (transaction: Transaction): Promise<T> =>
      work(new FirebaseAdminTransactionGateway(this.firestore, transaction));
    return options === undefined ? this.firestore.runTransaction(callback)
      : this.firestore.runTransaction(callback, options);
  }
}
