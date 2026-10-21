import { createHmac, timingSafeEqual } from 'node:crypto';
import { participationFailure } from '../ports/participation-repository.js';
import { ok, err } from '../../shared/domain/result.js';
import type { Clock } from '../../shared/ports/clock.js';
import type { FirestoreGateway, FirestoreTransactionGateway, StoredDocument, StoredDocumentEntry } from '../../shared/infrastructure/firebase/firestore-gateway.js';
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection, sha256, isUtcIsoInstant } from '../../shared/infrastructure/firebase/firestore-records.js';
import { maySeeParticipation } from '../domain/participation-visibility.js';
import { validEventId, validRevision, validStatus, validChange } from '../domain/participation-values.js';
import { canonicalizeUsername } from '../../onboarding/domain/username.js';
import type { Participation, ParticipationRepository, ParticipationAccessPort, ParticipationChange, Participant, ParticipationPage, ParticipationAccess } from '../ports/participation-repository.js';

export const participationKey = (account: string, event: string): string => sha256(JSON.stringify([account, event]));
const collection = 'event_participations';
const digest = /^[0-9a-f]{64}$/;
class CursorError extends Error {}
type Row = Participation & { readonly accountId: string };
function parseRow(entry: StoredDocumentEntry): Row {
  const d = entry.data;
  if (Object.keys(d).filter(k=>k!=='selectedAt').sort().join(',') !== 'accountId,eventId,ignored,revision,status,updatedAt' ||
      (d.selectedAt !== undefined && (!isUtcIsoInstant(d.selectedAt) || d.status === 'none')) ||
      typeof d.accountId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(d.accountId) || /[^A-Za-z0-9_-]/.test(d.accountId) || !validEventId(d.eventId) ||
      !validStatus(d.status) || typeof d.ignored !== 'boolean' || !validRevision(d.revision) || d.revision < 1 ||
      !isUtcIsoInstant(d.updatedAt) || entry.id !== participationKey(d.accountId, d.eventId)) throw new Error('Invalid participation');
  return d as unknown as Row;
}
const own = (r: Row): Participation => ({ eventId:r.eventId,status:r.status,ignored:r.ignored,revision:r.revision,updatedAt:r.updatedAt! });
export class FirestoreParticipationRepository implements ParticipationRepository {
  private readonly secret: Buffer;
  constructor(private readonly gateway: FirestoreGateway, private readonly clock: Clock,
    private readonly sourceCurrent: (eventId: string) => Promise<boolean>,
    private readonly accessFactory: (tx: FirestoreTransactionGateway) => ParticipationAccessPort,
    cursorSecret: Uint8Array) {
    if (cursorSecret.byteLength < 32) throw new Error('Participation cursor key unavailable');
    this.secret = Buffer.from(cursorSecret);
  }
  private async owner(tx: FirestoreTransactionGateway, uid: string): Promise<string | undefined> {
    const key = createAuthBindingDocumentId(uid); if (!key) throw new Error('Invalid binding');
    const binding = await tx.get(`auth_bindings/${key}`); if (!binding) return undefined;
    const id = parseAuthBinding(binding); if (!id) throw new Error('Invalid binding');
    const account = await tx.get(`accounts/${id}`);
    if (!account || !parseAccountProjection(account)) throw new Error('Invalid owner');
    return id;
  }
  private token(scope: string, after: string): string {
    const body = [1, scope, after];
    return Buffer.from(JSON.stringify([...body, createHmac('sha256', this.secret).update(JSON.stringify(body)).digest('base64url')])).toString('base64url');
  }
  private after(scope: string, cursor: string | undefined): string | undefined {
    if (cursor === undefined) return undefined;
    if (cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new CursorError('cursor');
    let v: unknown; try { v = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); } catch { throw new CursorError('cursor'); }
    if (!Array.isArray(v) || v.length !== 4 || v[0] !== 1 || v[1] !== scope || typeof v[2] !== 'string' || v[2].length!==64 || !digest.test(v[2]) || typeof v[3] !== 'string' || v[3].length!==43 || !/^[A-Za-z0-9_-]{43}$/.test(v[3]) ||
        Buffer.from(JSON.stringify(v)).toString('base64url') !== cursor) throw new CursorError('cursor');
    // Canonical token equality above checks the signature and representation;
    // constant-time signature comparison avoids an early byte-prefix oracle.
    const expected = createHmac('sha256', this.secret).update(JSON.stringify(v.slice(0,3))).digest('base64url');
    if (expected.length !== v[3].length || !timingSafeEqual(Buffer.from(expected),Buffer.from(v[3]))) throw new CursorError('cursor');
    return v[2];
  }
  private visible(access: ParticipationAccess | undefined, viewer: string, target: string): access is ParticipationAccess {
    return access !== undefined && maySeeParticipation({ isOwner: viewer === target, isFriend: access.isFriend,
      isBlocked: access.isBlocked, participantEligible: access.eligible, privacy: access.participationPrivacy });
  }
  private async query(tx: FirestoreTransactionGateway, equal: Readonly<Record<string,string>>, after?: string, limit=21) {
    if (!tx.listWherePage) throw new Error('Participation bounded query unavailable');
    const rows = await tx.listWherePage(collection,equal,after,limit);
    if (rows.length > limit || rows.some((r,i) => !digest.test(r.id) || (after !== undefined && r.id <= after) || (i>0 && rows[i-1]!.id >= r.id) || Object.entries(equal).some(([k,v])=>r.data[k]!==v))) throw new Error('Invalid query result');
    return rows;
  }
  async read(uid: string, eventId: string): ReturnType<ParticipationRepository['read']> {
    try { return await this.gateway.runTransaction(async tx => {
      const id=await this.owner(tx,uid); if(!id)return err(participationFailure('ONBOARDING_REQUIRED'));
      if(!validEventId(eventId))return err(participationFailure('EVENT_PARTICIPATION_INVALID'));
      const key=participationKey(id,eventId), data=await tx.get(`${collection}/${key}`);
      return ok(data ? own(parseRow({id:key,data})) : {eventId,status:'none' as const,ignored:false,revision:0});
    }); } catch {return err(participationFailure('SERVICE_UNAVAILABLE'));}
  }
  async authorize(uid: string): ReturnType<ParticipationRepository['authorize']> {
    try {return await this.gateway.runTransaction(async tx => await this.owner(tx,uid) ? ok(undefined) : err(participationFailure('ONBOARDING_REQUIRED')));}
    catch {return err(participationFailure('SERVICE_UNAVAILABLE'));}
  }
  async save(uid: string,eventId: string,change: ParticipationChange): ReturnType<ParticipationRepository['save']> {
    try {return await this.gateway.runTransaction(async tx=>{
      const id=await this.owner(tx,uid);if(!id)return err(participationFailure('ONBOARDING_REQUIRED'));
      if(!validEventId(eventId)||!validChange(change))return err(participationFailure('EVENT_PARTICIPATION_INVALID'));
      const key=participationKey(id,eventId), path=`${collection}/${key}`, data=await tx.get(path);
      const old:Participation=data?own(parseRow({id:key,data})):{eventId,status:'none',ignored:false,revision:0};
      if(old.revision!==change.expectedRevision)return err(participationFailure('EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED'));
      const selecting=change.status!=='none'&&change.status!==old.status;
      if(selecting&&change.ignored)return err(participationFailure('EVENT_PARTICIPATION_INVALID'));
      if(change.status===old.status&&change.ignored===old.ignored)return ok(old);
      if((!data||selecting||(!old.ignored&&change.ignored))&&!await this.sourceCurrent(eventId))return err(participationFailure('EVENT_UNAVAILABLE'));
      if(old.revision>=Number.MAX_SAFE_INTEGER)return err(participationFailure('SERVICE_UNAVAILABLE'));
      const now=this.clock.now();if(!now.ok||!Number.isFinite(now.value.getTime()))return err(participationFailure('SERVICE_UNAVAILABLE'));
      const next:Participation={eventId,status:change.status,ignored:change.ignored,revision:old.revision+1,updatedAt:now.value.toISOString()};
      const selectedAt = change.status === 'none' ? undefined : selecting ? next.updatedAt : data?.selectedAt;
      tx.set(path,{accountId:id,...next,...(selectedAt ? {selectedAt} : {})});return ok(next);
    });}catch{return err(participationFailure('SERVICE_UNAVAILABLE'));}
  }
  async participants(uid:string,eventId:string,status:'interested'|'going',group:'friends'|'others',cursor?:string):ReturnType<ParticipationRepository['participants']>{
    try{return await this.gateway.runTransaction(async tx=>{
      const viewer=await this.owner(tx,uid);if(!viewer)return err(participationFailure('ONBOARDING_REQUIRED'));
      if(!validEventId(eventId)||(status!=='interested'&&status!=='going')||(group!=='friends'&&group!=='others'))return err(participationFailure('EVENT_PARTICIPATION_INVALID'));
      const scope=sha256(JSON.stringify([viewer,eventId,status,group,'EP1']));
      const after=this.after(scope,cursor), access=this.accessFactory(tx), equal={eventId,status};
      const cache=new Map<string,ParticipationAccess|undefined>();
      const project=async(entry:StoredDocumentEntry):Promise<Participant|undefined>=>{
        const row=parseRow(entry);if(row.accountId===viewer)return undefined;
        if(!cache.has(row.accountId))cache.set(row.accountId,await access.resolve(viewer,row.accountId));
        const facts=cache.get(row.accountId);
        if(!this.visible(facts,viewer,row.accountId)||facts.isFriend!==(group==='friends'))return undefined;
        return {username:facts.username,...(facts.displayName===undefined?{}:{displayName:facts.displayName})};
      };
      const raw=await this.query(tx,equal,after), page=raw.slice(0,20), items:Participant[]=[];
      for(const entry of page){const p=await project(entry);if(p)items.push(p);}
      let count=0,scanned=0,last:string|undefined,exact=false;
      while(scanned<=200){
        const remaining=200-scanned,wanted=Math.min(21,remaining+1);
        const chunk=await this.query(tx,equal,last,wanted);
        for(const entry of chunk.slice(0,remaining)){scanned++;if(await project(entry))count++;last=entry.id;}
        if(chunk.length>remaining)break;
        if(chunk.length<wanted){exact=true;break;}
      }
      return ok({items,countState:exact?'exact' as const:'unavailable' as const,...(exact?{visibleCount:count}:{}),
        ...(raw.length>20?{nextCursor:this.token(scope,page.at(-1)!.id)}:{})});
    });}catch(e){return err(participationFailure(e instanceof CursorError?'REQUEST_INVALID':'SERVICE_UNAVAILABLE'));}
  }
  async list(uid:string,username?:string,cursor?:string):ReturnType<ParticipationRepository['list']>{
    try{return await this.gateway.runTransaction(async tx=>{
      const viewer=await this.owner(tx,uid);if(!viewer)return err(participationFailure('ONBOARDING_REQUIRED'));
      const access=this.accessFactory(tx);let target=viewer;
      if(username!==undefined){
        const canonical=canonicalizeUsername(username);
        if(!canonical.ok||canonical.value!==username||/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(username))return err(participationFailure('REQUEST_INVALID'));
        const found=await access.accountForUsername(username);if(!found)return err(participationFailure('ADD_FRIEND_TARGET_UNAVAILABLE'));target=found;
      }
      const scope=sha256(JSON.stringify([viewer,target,'owner-EP1'])),after=this.after(scope,cursor);
      const facts=target===viewer?undefined:await access.resolve(viewer,target);
      if(target!==viewer&&!this.visible(facts,viewer,target))return err(participationFailure('ADD_FRIEND_TARGET_UNAVAILABLE'));
      const raw=await this.query(tx,{accountId:target},after),page=raw.slice(0,20),items:ParticipationPage['items'][number][]=[];
      for(const entry of page){const row=parseRow(entry);if(username===undefined)items.push(own(row));else if(row.status!=='none')items.push({eventId:row.eventId,status:row.status});}
      return ok({items,...(raw.length>20?{nextCursor:this.token(scope,page.at(-1)!.id)}:{})});
    });}catch(e){return err(participationFailure(e instanceof CursorError?'REQUEST_INVALID':'SERVICE_UNAVAILABLE'));}
  }
  /** Internal deletion-worker seam only: no HTTP route, no executor installed.
   * Requires both missing Account and trusted permanent-deletion marker. */
  async purgeDeletedAccountPage(accountId:string,afterDigest?:string):Promise<{nextDigest?:string}>{
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(accountId)||afterDigest!==undefined&&!digest.test(afterDigest))throw new Error('Invalid deletion scope');
    return this.gateway.runTransaction(async tx=>{
      if(await tx.get(`accounts/${accountId}`)!==undefined||(await tx.get(`friend_access/${accountId}`))?.eligibilityState!=='permanently-deleted'||!tx.delete)throw new Error('Account deletion not established');
      const rows=await this.query(tx,{accountId},afterDigest),page=rows.slice(0,20);
      for(const row of page){parseRow(row);tx.delete(`${collection}/${row.id}`);}
      return rows.length>20?{nextDigest:page.at(-1)!.id}:{};
    });
  }
}
