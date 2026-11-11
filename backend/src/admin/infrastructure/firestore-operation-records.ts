import { randomUUID } from 'node:crypto';
import { isSafeDocumentId } from '../../shared/infrastructure/firebase/firestore-records.js';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import type { OperationRecord } from '../ports/admin-repository.js';
import { validAuditCursor } from '../application/admin-operations.js';

export const OPERATION_RETENTION_MS = 30 * 86400000;
const instant = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s;
type Change = Pick<OperationRecord, 'targetType' | 'targetId' | 'operation' | 'afterRevision'> & {readonly beforeRevision?: number};
export class FirestoreOperationRecords {
  private maintenance = true;
  constructor(private readonly store: FirestoreGateway, private readonly now: () => number = Date.now) {}
  get healthy() { return this.maintenance; }
  begin(actorAdminUid: string | undefined): {readonly recordId: string; readonly actorAdminUid: string; readonly occurredAt: string; readonly expiresAt: string} {
    if (!actorAdminUid || actorAdminUid.length > 128 || /[\u0000-\u001f\u007f]/u.test(actorAdminUid) || !actorAdminUid.isWellFormed()) throw Error('Audit actor unavailable');
    const now = this.now();
    if (!Number.isSafeInteger(now) || now < 0) throw Error('Audit clock unavailable');
    return {recordId: randomUUID(), actorAdminUid, occurredAt: new Date(now).toISOString(), expiresAt: new Date(now + OPERATION_RETENTION_MS).toISOString()};
  }
  append(tx: FirestoreTransactionGateway, context: ReturnType<FirestoreOperationRecords['begin']>, change: Change): void {
    const {recordId, ...fields} = context;
    tx.create(`admin_operation_records/${recordId}`, {...fields, ...change, result: 'committed'});
  }
  async read(cursor?: string) {
    if (cursor !== undefined && !validAuditCursor(cursor)) throw Error('Invalid cursor');
    const before = cursor === undefined ? undefined : JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string];
    const now = this.now(), lower = new Date(now - OPERATION_RETENTION_MS).toISOString();
    return this.store.runTransaction(async tx => {
      if (!tx.listAdminOperationPage) throw Error('Audit query unavailable');
      const rows = await tx.listAdminOperationPage({mode: 'live', boundary: lower, now: new Date(now).toISOString(), ...(before ? {before} : {})});
      const records = rows.map(row => parseRecord(row.id, row.data));
      if (records.some(row => Date.parse(row.occurredAt) > now || now >= Date.parse(row.expiresAt))) throw Error('Invalid audit retention');
      const page = records.slice(0, 50), last = page.at(-1);
      return {records: page, ...(records.length > 50 && last ? {nextCursor: Buffer.from(JSON.stringify([last.occurredAt, last.recordId])).toString('base64url')} : {})};
    });
  }
  async cleanup(): Promise<void> {
    try {
      // At most 1,000 records per cycle, with no unbounded scan or retained body.
      for (let page = 0; page < 20; page++) {
        const count = await this.store.runTransaction(async tx => {
          if (!tx.listAdminOperationPage || !tx.delete) throw Error('Audit cleanup unavailable');
          const now = this.now(), rows = await tx.listAdminOperationPage({mode: 'expired', boundary: new Date(now - OPERATION_RETENTION_MS).toISOString(), now: new Date(now).toISOString()});
          for (const row of rows) {
            const record = parseRecord(row.id, row.data);
            if (now < Date.parse(record.expiresAt)) throw Error('Premature cleanup');
          }
          for (const row of rows) tx.delete(`admin_operation_records/${row.id}`);
          return rows.length;
        });
        if (count < 50) { this.maintenance = true; return; }
      }
      // A bounded cycle with remaining work is not proof of completed cleanup.
      this.maintenance = false;
    } catch { this.maintenance = false; }
  }
}
export function parseRecord(recordId: string, d: StoredDocument): OperationRecord {
  const keys = ['occurredAt','expiresAt','actorAdminUid','targetType','targetId','operation','beforeRevision','afterRevision','result'];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(recordId) || Object.keys(d).some(k => !keys.includes(k)) ||
    !instant(d.occurredAt) || !instant(d.expiresAt) || Date.parse(d.expiresAt) - Date.parse(d.occurredAt) !== OPERATION_RETENTION_MS ||
    typeof d.actorAdminUid !== 'string' || !d.actorAdminUid || d.actorAdminUid.length > 128 || !d.actorAdminUid.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(d.actorAdminUid) ||
    !['interest_tag','event_category','event_category_assignment'].includes(String(d.targetType)) || typeof d.targetId !== 'string' || !isSafeDocumentId(d.targetId) ||
    !['create','rename','deactivate','restore','assign','clear'].includes(String(d.operation)) || d.result !== 'committed' ||
    !Number.isSafeInteger(d.afterRevision) || Number(d.afterRevision) < 1 ||
    (Object.hasOwn(d,'beforeRevision') && (!Number.isSafeInteger(d.beforeRevision) || Number(d.beforeRevision) < 0 || Number(d.beforeRevision) + 1 !== d.afterRevision))) throw Error('Invalid audit record');
  return {recordId, ...d} as unknown as OperationRecord;
}
