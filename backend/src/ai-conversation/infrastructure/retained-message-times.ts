import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentSnapshot } from '../../shared/infrastructure/firebase/firestore-gateway.js';

const field = 'retainedCreatedAt';
const messagePath = (path: string) => /^accounts\/[^/]+\/conversations\/[^/]+\/messages\/[^/]+$/.test(path);

/** Local Emulator exports recreate service createTime. Persist the ORIGINAL
 * server commit time with new messages so normal import never renews retention.
 * No client time, legacy timestamp synthesis or public DTO change. */
export function withRetainedMessageTimes(base: FirestoreGateway): FirestoreGateway {
  return {
    runTransaction: (work, options) => base.runTransaction(async tx => {
      const times = new Map<string, Timestamp>();
      const unpack = (path: string, data: StoredDocument): StoredDocument => {
        if (!messagePath(path) || !Object.hasOwn(data, field)) return data;
        const time = data[field];
        if (!(time instanceof Timestamp)) throw Error('Invalid retained message time');
        times.set(path, time);
        const { [field]: _time, ...fields } = data;
        return fields;
      };
      const snapshot = <T extends StoredDocumentSnapshot>(path: string, row: T): T => {
        const data = unpack(path, row.data), time = times.get(path);
        return { ...row, data, ...(time ? { createTime: { seconds: time.seconds, nanoseconds: time.nanoseconds } } : {}) };
      };
      const wrap: FirestoreTransactionGateway = {
        get: async path => { const row = await tx.get(path); return row && unpack(path, row); },
        getSnapshot: async path => { const row = await tx.getSnapshot!(path); return row && snapshot(path, row); },
        list: async path => (await tx.list(path)).map(row => ({ ...row, data: unpack(`${path}/${row.id}`, row.data) })),
        listSnapshots: async path => (await tx.listSnapshots!(path)).map(row => snapshot(`${path}/${row.id}`, row)),
        listMessagePage: async (path, before) => (await tx.listMessagePage!(path, before)).map(row => snapshot(`${path}/${row.id}`, row)),
        listGroupPage: async (...args) => (await tx.listGroupPage!(...args)).map(row => snapshot(row.path, row)),
        listPage: async (path, ...args) => (await tx.listPage!(path, ...args)).map(row => ({ ...row, data: unpack(`${path}/${row.id}`, row.data) })),
        listWherePage: async (path, ...args) => (await tx.listWherePage!(path, ...args)).map(row => ({ ...row, data: unpack(`${path}/${row.id}`, row.data) })),
        create: (path, data) => {
          if (Object.hasOwn(data, field)) throw Error('Caller cannot set retained message time');
          tx.create(path, messagePath(path) ? { ...data, [field]: FieldValue.serverTimestamp() } : data);
        },
        set: (path, data) => {
          if (Object.hasOwn(data, field)) throw Error('Caller cannot set retained message time');
          const time = times.get(path);
          tx.set(path, time ? { ...data, [field]: time } : data);
        },
        delete: path => tx.delete!(path),
      };
      return work(wrap);
    }, options),
  };
}
