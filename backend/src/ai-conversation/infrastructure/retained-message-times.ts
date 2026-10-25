import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentSnapshot } from '../../shared/infrastructure/firebase/firestore-gateway.js';

const field = 'retainedCreatedAt';
const messagePath = (path: string) => /^accounts\/[^/]+\/conversations\/[^/]+\/messages\/[^/]+$/.test(path);
const occurrencePath=(path:string)=>/^accounts\/[^/]+\/proactive_occurrences\/[^/]+$/.test(path);
const proactiveStatePath=(path:string)=>/^accounts\/[^/]+\/proactive_state\/current$/.test(path);
// Round the frequency lower bound UP, never grant up to 1ms early from a
// nanosecond service commit. Public occurrence timestamps remain milliseconds.
const budgetTime=(time:Timestamp)=>new Date(time.seconds*1000+Math.ceil(time.nanoseconds/1e6)).toISOString();

/** Local Emulator exports recreate service createTime. Persist the ORIGINAL
 * server commit time with new messages so normal import never renews retention.
 * No client time, legacy timestamp synthesis or public DTO change. */
export function withRetainedMessageTimes(base: FirestoreGateway): FirestoreGateway {
  return {
    runTransaction: (work, options) => base.runTransaction(async tx => {
      const times = new Map<string, Timestamp>();
      const publications = new Map<string, Timestamp>(), charges = new Map<string,Timestamp>();
      const observedOccurrences=new Map<string,string>();
      let publishingAt:string|undefined;
      const unpack = (path: string, data: StoredDocument): StoredDocument => {
        if(occurrencePath(path)){
          observedOccurrences.set(path,String(data.state));
          if(data.state==="published"){
            if(!(data.publishedAt instanceof Timestamp))throw Error('Missing canonical publication commit time');
            publications.set(path,data.publishedAt);
            return {...data,publishedAt:data.publishedAt.toDate().toISOString()};
          }
        }
        if(proactiveStatePath(path)&&Object.hasOwn(data,'lastAttemptedAt')){
          if(!(data.lastAttemptedAt instanceof Timestamp)||!Array.isArray(data.rollingAttemptTimes)||data.rollingAttemptTimes.length!==0)throw Error('Invalid canonical budget commit time');
          charges.set(path,data.lastAttemptedAt);
          const {lastAttemptedAt:_commit,...fields}=data;
          return {...fields,rollingAttemptTimes:[budgetTime(data.lastAttemptedAt)]};
        }
        if(proactiveStatePath(path)&&Array.isArray(data.rollingAttemptTimes)&&data.rollingAttemptTimes.length!==0)throw Error('Missing canonical budget commit time');
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
          if(occurrencePath(path)&&data.state==='published'){
            const previous=publications.get(path);
            if(previous){
              if(data.publishedAt!==previous.toDate().toISOString())throw Error('Cannot rewrite publication commit time');
              tx.set(path,{...data,publishedAt:previous});return;
            }
            if(!observedOccurrences.has(path)||observedOccurrences.get(path)==='published'||typeof data.publishedAt!=='string')throw Error('Unobserved publication transition');
            publishingAt=data.publishedAt;
            tx.set(path,{...data,publishedAt:FieldValue.serverTimestamp()});return;
          }
          if(proactiveStatePath(path)){
            if(Object.hasOwn(data,'lastAttemptedAt'))throw Error('Caller cannot choose canonical budget commit time');
            if(!Array.isArray(data.rollingAttemptTimes))throw Error('Invalid bounded budget');
            if(publishingAt!==undefined&&data.rollingAttemptTimes.length===1&&data.rollingAttemptTimes[0]===publishingAt){
              // Firestore cannot nest serverTimestamp in arrays. The approved
              // lastAttemptedAt scalar carries the one bounded charge; reads
              // project it back to the inner rolling-window array.
              tx.set(path,{...data,rollingAttemptTimes:[],lastAttemptedAt:FieldValue.serverTimestamp()});return;
            }
            const charge=charges.get(path);
            if(charge&&data.rollingAttemptTimes.length===1&&data.rollingAttemptTimes[0]===budgetTime(charge)){
              tx.set(path,{...data,rollingAttemptTimes:[],lastAttemptedAt:charge});return;
            }
          }
          const time = times.get(path);
          tx.set(path, time ? { ...data, [field]: time } : data);
        },
        delete: path => tx.delete!(path),
      };
      return work(wrap);
    }, options),
  };
}
