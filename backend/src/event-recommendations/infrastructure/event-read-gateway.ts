import type { Firestore } from "firebase-admin/firestore";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";

/** Infrastructure-only seam; no vendor snapshot enters an inner Port. */
export interface EventReadGateway {
  get(path: string): Promise<StoredDocument | undefined>;
  listEvents(): Promise<readonly { readonly id: string; readonly data: StoredDocument }[]>;
}

export class FirebaseAdminEventReadGateway implements EventReadGateway {
  public constructor(private readonly firestore: Firestore) {}

  public async get(path: string): Promise<StoredDocument | undefined> {
    const snapshot = await this.firestore.doc(path).get();
    return snapshot.exists ? snapshot.data() : undefined;
  }

  public async listEvents() {
    const snapshot = await this.firestore.collection("events").get();
    return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
  }
}
