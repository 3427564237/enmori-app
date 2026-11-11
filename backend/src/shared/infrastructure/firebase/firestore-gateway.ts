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
  /** Current service metadata; request-only, never persisted as provenance. */
  readonly updateTime?: { readonly seconds: number; readonly nanoseconds: number };
}

export interface FirestoreTransactionGateway {
  listAdminOperationPage?(input: {readonly mode: 'live' | 'expired'; readonly boundary: string; readonly now: string; readonly before?: readonly [string, string]}): Promise<readonly StoredDocumentEntry[]>;
  get(path: string): Promise<StoredDocument | undefined>;
  getSnapshot?(path: string): Promise<StoredDocumentSnapshot | undefined>;
  listSnapshots?(collectionPath: string): Promise<readonly StoredDocumentSnapshot[]>;
  list(collectionPath: string): Promise<readonly StoredDocumentEntry[]>;
  create(path: string, data: StoredDocument): void;
  set(path: string, data: StoredDocument): void;
  delete?(path: string): void;
  listPage?(collectionPath: string, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]>;
  listWherePage?(collectionPath: string, equal: Readonly<Record<string, string>>, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]>;
  listGroupPage?(collectionId: string, afterPath: string | undefined, limit: number): Promise<readonly (StoredDocumentSnapshot & { readonly path: string })[]>;
  listMessagePage?(collectionPath:string,before:number|undefined):Promise<readonly StoredDocumentSnapshot[]>;
  /** Purpose-bound metadata reads; never return Check-in content to ranking. */
  listActivityCheckInPage?(ownerAccountId:string,afterId:string|undefined,limit:number):Promise<readonly StoredDocumentEntry[]>;
  listDiscoverableAccountPage?(afterId:string|undefined,limit:number):Promise<readonly StoredDocumentEntry[]>;
  /** Current own-day AI selection metadata only; full versioned sources are
   * read separately in the SAME transaction. The sixth row is a cap sentinel. */
  listOwnCheckInDayPage?(input:{readonly ownerAccountId:string;readonly startUtc:string;readonly endUtc:string|null;
    readonly asOf:string;readonly limit:6}):Promise<readonly StoredDocumentEntry[]>;
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

  public async listAdminOperationPage(input: {readonly mode: 'live' | 'expired'; readonly boundary: string; readonly now: string; readonly before?: readonly [string, string]}): Promise<readonly StoredDocumentEntry[]> {
    const ascending = input.mode === 'expired';
    let query = this.firestore.collection('admin_operation_records')
      .where('occurredAt', ascending ? '<=' : '>', input.boundary)
      .orderBy('occurredAt', ascending ? 'asc' : 'desc')
      .orderBy(FieldPath.documentId(), ascending ? 'asc' : 'desc')
      .limit(ascending ? 50 : 51);
    if (!ascending) query = query.where('occurredAt', '<=', input.now);
    if (input.before) query = query.startAfter(input.before[0], input.before[1]);
    const snapshot = await this.transaction.get(query);
    return snapshot.docs.map(doc => ({id: doc.id, data: {...doc.data()}}));
  }

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
      createTime: { seconds: created.seconds, nanoseconds: created.nanoseconds },
      ...(snapshot.updateTime ? { updateTime: { seconds: snapshot.updateTime.seconds, nanoseconds: snapshot.updateTime.nanoseconds } } : {}) };
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
  public async listActivityCheckInPage(ownerAccountId:string,afterId:string|undefined,limit:number):Promise<readonly StoredDocumentEntry[]> {
    if(!Number.isInteger(limit)||limit<1||limit>25)throw new Error("Invalid metadata page");
    let query=this.firestore.collection("check_ins").where("ownerAccountId","==",ownerAccountId)
      .orderBy(FieldPath.documentId()).select("ownerAccountId","createdAt","checkInVisibility").limit(limit);
    if(afterId!==undefined)query=query.startAfter(afterId);
    const snapshot=await this.transaction.get(query);
    return snapshot.docs.map(doc=>({id:doc.id,data:{...doc.data()}}));
  }
  public async listDiscoverableAccountPage(afterId:string|undefined,limit:number):Promise<readonly StoredDocumentEntry[]> {
    if(!Number.isInteger(limit)||limit<1||limit>25)throw new Error("Invalid discovery page");
    let query=this.firestore.collection("accounts").orderBy(FieldPath.documentId()).select("profileVisibility").limit(limit);
    if(afterId!==undefined)query=query.startAfter(afterId);
    const snapshot=await this.transaction.get(query);
    return snapshot.docs.map(doc=>({id:doc.id,data:{...doc.data()}}));
  }
  public async listOwnCheckInDayPage(input:Parameters<NonNullable<FirestoreTransactionGateway["listOwnCheckInDayPage"]>>[0]):Promise<readonly StoredDocumentEntry[]> {
    if(input.limit!==6)throw new Error("Invalid own-day bound");
    let query=this.firestore.collection("check_ins").where("ownerAccountId","==",input.ownerAccountId)
      .where("createdAt",">=",input.startUtc).where("createdAt","<=",input.asOf)
      .orderBy("createdAt","desc").orderBy(FieldPath.documentId(),"desc")
      .select("ownerAccountId","createdAt").limit(input.limit);
    if(input.endUtc!==null)query=query.where("createdAt","<",input.endUtc);
    const snapshot=await this.transaction.get(query);
    return snapshot.docs.map(doc=>({id:doc.id,data:{...doc.data()}}));
  }
  public async listPage(collectionPath: string, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]> {
    let query = this.firestore.collection(collectionPath).orderBy(FieldPath.documentId()).limit(limit);
    if (afterId !== undefined) query = query.startAfter(afterId);
    const snapshot = await this.transaction.get(query);
    return snapshot.docs.map(doc => ({ id: doc.id, data: { ...doc.data() } }));
  }

  public async listWherePage(collectionPath: string, equal: Readonly<Record<string,string>>, afterId: string | undefined, limit: number): Promise<readonly StoredDocumentEntry[]> {
    if(!Number.isInteger(limit)||limit<1||limit>25)throw new Error("Invalid bounded query");
    let query = this.firestore.collection(collectionPath).orderBy(FieldPath.documentId()).limit(limit);
    for(const [field,value] of Object.entries(equal))query=query.where(field,"==",value);
    if(afterId!==undefined)query=query.startAfter(afterId);
    const snapshot=await this.transaction.get(query);
    return snapshot.docs.map(doc=>({id:doc.id,data:{...doc.data()}}));
  }

  public async listGroupPage(collectionId: string, afterPath: string | undefined, limit: number): Promise<readonly (StoredDocumentSnapshot & {readonly path:string})[]> {
    if(!["conversations","messages","message_sources"].includes(collectionId)||!Number.isInteger(limit)||limit<1||limit>25)throw new Error("Invalid bounded group query");
    let query=this.firestore.collectionGroup(collectionId).orderBy(FieldPath.documentId()).limit(limit);
    // Complete DocumentReference, including a deleted cursor document, never a
    // bare duplicated message ID or a mutable document snapshot.
    if(afterPath!==undefined)query=query.startAfter(this.firestore.doc(afterPath));
    const snapshot=await this.transaction.get(query);
    return snapshot.docs.map(doc=>({id:doc.id,path:doc.ref.path,data:{...doc.data()},
      createTime:{seconds:doc.createTime.seconds,nanoseconds:doc.createTime.nanoseconds}}));
  }

  public create(path: string, data: StoredDocument): void {
    this.transaction.create(
      this.firestore.doc(path),
      data as DocumentData,
    );
  }
  public async listMessagePage(collectionPath:string,before:number|undefined):Promise<readonly StoredDocumentSnapshot[]>{
    if(!/^accounts\/[^/]+\/conversations\/[^/]+\/messages$/.test(collectionPath)||
      (before!==undefined&&(!Number.isSafeInteger(before)||before<1)))throw new Error("Invalid bounded message query");
    let query=this.firestore.collection(collectionPath).orderBy("sequence","desc").limit(20);
    if(before!==undefined)query=query.where("sequence","<",before);
    const page=await this.transaction.get(query);
    return page.docs.map(doc=>({id:doc.id,data:{...doc.data()},createTime:{seconds:doc.createTime.seconds,nanoseconds:doc.createTime.nanoseconds}}));
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
