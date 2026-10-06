import type {
  FirestoreGateway,
  FirestoreTransactionGateway,
  StoredDocument,
} from "../../src/shared/infrastructure/firebase/firestore-gateway.js";

function copyDocument(document: StoredDocument): StoredDocument {
  return { ...document };
}

export class InMemoryFirestoreGateway implements FirestoreGateway {
  readonly #documents = new Map<string, StoredDocument>();

  public constructor(seed: Readonly<Record<string, StoredDocument>> = {}) {
    for (const [path, document] of Object.entries(seed)) {
      this.#documents.set(path, copyDocument(document));
    }
  }

  public async runTransaction<T>(
    work: (transaction: FirestoreTransactionGateway) => Promise<T>,
  ): Promise<T> {
    const candidate = new Map<string, StoredDocument>();
    for (const [path, document] of this.#documents) {
      candidate.set(path, copyDocument(document));
    }

    const transaction: FirestoreTransactionGateway = {
      get: async (path) => {
        const document = candidate.get(path);
        return document === undefined ? undefined : copyDocument(document);
      },
      list: async (collectionPath) => {
        const prefix = `${collectionPath}/`;
        return [...candidate.entries()]
          .filter(([path]) => {
            if (!path.startsWith(prefix)) return false;
            return !path.slice(prefix.length).includes("/");
          })
          .map(([path, document]) => ({
            id: path.slice(prefix.length),
            data: copyDocument(document),
          }));
      },
      delete: path => { candidate.delete(path); },
      listPage: async (collection, afterId, limit) => [...candidate.entries()]
        .filter(([path]) => path.startsWith(`${collection}/`) && !path.slice(collection.length + 1).includes("/"))
        .map(([path, data]) => ({ id: path.slice(collection.length + 1), data: copyDocument(data) }))
        .filter(entry => afterId === undefined || entry.id > afterId)
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).slice(0, limit),
      create: (path, document) => {
        if (candidate.has(path)) throw new Error("document already exists");
        candidate.set(path, copyDocument(document));
      },
      set: (path, document) => {
        candidate.set(path, copyDocument(document));
      },
    };

    const result = await work(transaction);
    this.#documents.clear();
    for (const [path, document] of candidate) {
      this.#documents.set(path, copyDocument(document));
    }
    return result;
  }

  public entries(): ReadonlyArray<readonly [string, StoredDocument]> {
    return [...this.#documents.entries()].map(([path, document]) => [
      path,
      copyDocument(document),
    ] as const);
  }

  public read(path: string): StoredDocument | undefined {
    const document = this.#documents.get(path);
    return document === undefined ? undefined : copyDocument(document);
  }
}

export class FailingFirestoreGateway implements FirestoreGateway {
  public async runTransaction<T>(
    _work: (transaction: FirestoreTransactionGateway) => Promise<T>,
  ): Promise<T> {
    throw new Error("controlled provider detail");
  }
}
