import { readTogether } from "../../shared/infrastructure/firebase/read-together.js";
import { hasCloudAiConsent, legacyCloudAiProcessing, parseCloudAiProcessing, GROQ_CLOUD_PROCESSING, type CloudAiProcessing } from "../../account/domain/cloud-ai-consent.js";
import { randomUUID } from "node:crypto";
import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as RecordData,
  StoredDocumentSnapshot as Snapshot } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireFeatureEnvironment } from "../../shared/infrastructure/firebase/feature-environment.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { resolveRealRetention } from "../domain/real-retention-resolver.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { RealConversationStore, StoreResult, StoreFailure, RuntimeEpoch, RuntimeEpochClaim, OperationTarget,
  OpenOperation, OriginalWriteAuthority, StoredConversationMessage, StoredUserIdentity, SavedOperationOutcome } from "../ports/real-conversation-store.js";
import type { ConversationHistory, HistoryPairIdentity } from "../ports/real-context-reader.js";
import { parseReadNote } from "./real-context-records.js";
import type { PresentationMetadata } from "../ports/conversation-lifecycle.js";
import { normalizePersonaInput } from "../../personas/domain/persona-values.js";
import type { FirstFlowConversationTransaction } from "../../proactive/ports/conversation-transaction.js";
import type { FirstFlowResult, FirstFlowSource, FirstFlowReservation } from "../../proactive/ports/first-flow.js";
import { inspectSourceUseV2, messageSourceVersion, checkInSourceVersion, parseSourceUse } from "./source-use-v2.js";
import { parseCheckInProjection, isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import { parseReadAuthority, parseReadPersona, parseReadPersonaState } from "./real-context-records.js";
import type { ConversationReadback, ConversationSummary, ConversationSummaryPage } from "../ports/conversation-operations.js";
import type { OwnedMessageAnchor, OwnedSourceTarget } from "../ports/owned-sources.js";

import { inspectNoteSources, inspectProvenance, parseProvenance, validDependencies, type TransactionalNotePrerequisites } from "./transactional-note-sources.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RUNTIME = "ai_runtime_fence/current";
type Location=Pick<OperationTarget,"ownerAccountId"|"conversationId">;
const parentPath = (t: Location): string => `accounts/${t.ownerAccountId}/conversations/${t.conversationId}`;
const userPath = (t: OperationTarget): string => `${parentPath(t)}/messages/${t.userMessageId}`;
const effectPath = (t: OperationTarget): string => `${parentPath(t)}/effects/${t.operationId}`;
const fencePath = (t: OperationTarget): string => `ai_operation_fences/${t.operationId}`;
const positive = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x > 0;
const nonnegative = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
const exact = (d: RecordData, required: readonly string[], optional: readonly string[] = []): boolean =>
  required.every(k => Object.hasOwn(d, k)) && Object.keys(d).every(k => required.includes(k) || optional.includes(k));
const validText = (text: string): boolean => typeof text === "string" && text.isWellFormed() &&
  [...text].length > 0 && [...text].length <= 2400 && text.trim().length > 0;
class Refusal extends Error { constructor(readonly kind: StoreFailure) { super(kind); } }
function refuse(kind: StoreFailure): never { throw new Refusal(kind); }
function requireTarget(t: OperationTarget): void {
  if (![t.ownerAccountId, t.conversationId, t.userMessageId, t.operationId].every(id => UUID.test(id)) ||
      !["send", "retry"].includes(t.kind) || !["reserved_new", "existing"].includes(t.targetKind) ||
      (t.kind === "retry" && t.targetKind !== "existing")) refuse("unavailable");
}
function current(a: OriginalWriteAuthority): void {
  try { if (a.current() === true) return; } catch { /* No original authority. */ }
  refuse("terminated");
}
// Request reads retain their original guard across each SDK dispatch/settlement.
// Service-owned cleanup/retirement calls intentionally supply no request guard.
async function readWhileCurrent<T>(check: (() => void) | undefined, read: () => Promise<T>): Promise<T> {
  check?.(); const value = await read(); check?.(); return value;
}
interface Inventory { readonly parent: RecordData; readonly rows: readonly Snapshot[]; readonly cutoff: FullPrecisionInstant }

/**
 * First isolated N02 vertical: actual SDK transactions, no ordinary composition.
 * Nonempty sources additionally require explicit source-bound producer facts
 * for this gateway. Ordinary construction still omits that authority. Every
 * actual effect and ordinary read checks sources in its own transaction.
 */
export class FirestoreConversationStore implements RealConversationStore {
  private lastNow = Number.NEGATIVE_INFINITY;
  constructor(private readonly gateway: FirestoreGateway, environment: Readonly<Record<string, string | undefined>>,
    private readonly utcMilliseconds: () => number = Date.now,
    private readonly notePrerequisites?: TransactionalNotePrerequisites, private readonly cloudProcessing: CloudAiProcessing = GROQ_CLOUD_PROCESSING) {
    if (!parseCloudAiProcessing(cloudProcessing.provider, cloudProcessing.disclosureVersion)) throw Error("CLOUD_PROCESSING_REQUIRED");
    requireFeatureEnvironment(environment);
  }

  /** Infrastructure composition binds this to the proactive store's SAME Tx.
   * No nested transaction or cached source authority is introduced. */
  firstFlowTransaction(tx: Tx, principal: AuthPrincipal, owner: string, isCurrent: () => boolean): FirstFlowConversationTransaction {
    const check = () => this.readCurrent(isCurrent);
    const wrap = async <T>(work: () => Promise<T>): Promise<FirstFlowResult<T>> => {
      try { check(); const value = await work(); check(); return {kind:"ok",value}; }
      catch (e) {
        if (!(e instanceof Refusal)) return {kind:"unavailable"};
        return {kind:e.kind === "conversation_unavailable"||e.kind==="source_unavailable" ? "not_found" : e.kind==="source_changed"?"denied":e.kind};
      }
    };
    const capture = async (conversationId: string, sourceMessageId: string, original?: FirstFlowSource) => {
      check(); const started = this.utcMilliseconds(), location = this.location(owner,conversationId);
      if (!UUID.test(sourceMessageId)) refuse("unavailable");
      const account = parseReadAuthority(await this.owner(tx,principal,owner,check),owner);
      if (!account) refuse("unavailable");
      if (account.consent !== "accepted") refuse("denied");
      const inv = await this.inventory(tx,location,false,check); if (!inv) refuse("conversation_unavailable");
      const user = this.requireUser(inv,sourceMessageId), message = this.message(user), version = messageSourceVersion(user);
      if (!version || user.data.pendingOperationId !== undefined || !message.text) refuse("unavailable");
      const state = parseReadPersonaState(await readWhileCurrent(check,()=>tx.get(`accounts/${owner}/persona_state/current`)));
      if (!state) refuse("unavailable");
      const usedId = original?.usedPersonaId ?? (original ? undefined : state.activePersonaId);
      let persona: FirstFlowSource["persona"];
      if (usedId !== undefined) {
        if (!state.livePersonaIds.includes(usedId)) refuse("denied");
        const item = parseReadPersona(await readWhileCurrent(check,()=>tx.get(`accounts/${owner}/personas/${usedId}`)),usedId,true);
        if (!item) refuse("denied");
        persona = original?.persona ?? item.projection;
      }
      const ended = this.utcMilliseconds();
      if (![started,ended].every(Number.isSafeInteger) || ended < started || ended-started > 5000) refuse("unavailable");
      const source: FirstFlowSource = {conversationId,sourceMessageId,sourceSequence:message.sequence,sourceVersion:version,
        sourcePersistedAt:user.createTime,topicLifecycleVersion:inv.parent.lifecycleVersion as number,topicCutoff:inv.cutoff,
        occurredAt:new Date(user.createTime.seconds*1000+Math.floor(user.createTime.nanoseconds/1e6)).toISOString(),text:message.text,
        purposeRevocationGeneration:account.purposeRevocationGeneration,...(persona ? {persona,usedPersonaId:usedId!} : {})};
      if (original && (source.sourceVersion !== original.sourceVersion || source.topicLifecycleVersion !== original.topicLifecycleVersion ||
          source.purposeRevocationGeneration !== original.purposeRevocationGeneration)) refuse("denied");
      check(); return {source,inv,location};
    };
    const validate = async (reservation: FirstFlowReservation) => {
      const {intent,source} = reservation;
      if (intent.conversationId !== source.conversationId || intent.sourceMessageId !== source.sourceMessageId ||
          intent.topicLifecycleVersion !== source.topicLifecycleVersion || intent.requiredSources.length !== 1 ||
          intent.requiredSources[0]?.kind !== "conversation_message" || intent.requiredSources[0].id !== source.sourceMessageId ||
          intent.requiredSources[0].version !== source.sourceVersion) refuse("denied");
      return capture(source.conversationId,source.sourceMessageId,source);
    };
    return {
      source:(id,messageId)=>wrap(async()=> (await capture(id,messageId)).source),
      validate:reservation=>wrap(async()=>{await validate(reservation);}),
      append:input=>wrap(async()=>{
        const {inv,location} = await validate(input.reservation);
        if (!UUID.test(input.messageId) || !validText(input.text) || !UUID.test(input.reservation.intent.intentId) ||
            !((input.presentation.presentationMode === "default" && input.reservation.source.persona === undefined) ||
              (input.presentation.presentationMode === "persona" && input.presentation.presentationProjectionVersion === "persona_presentation_v1" &&
               input.reservation.source.persona !== undefined))) refuse("unavailable");
        const path = `${parentPath(location)}/messages/${input.messageId}`;
        if (await readWhileCurrent(check,()=>tx.get(path))) refuse("conflict");
        const sequence = this.nextSequence(inv), source = input.reservation.source;
        check();
        tx.create(path,{role:"assistant",origin:"proactive",sequence,availability:"available",text:input.text,
          occurrenceId:input.reservation.intent.intentId,category:"explicit_follow_up",presentationMode:input.presentation.presentationMode,
          ...(input.presentation.presentationMode === "persona" ? {presentationProjectionVersion:input.presentation.presentationProjectionVersion} : {}),appendBefore:inv.cutoff});
        tx.create(`${parentPath(location)}/message_sources/${input.messageId}`,{schemaVersion:"source_use_v2",purpose:"explicit_follow_up",
          processing:"local",sources:[{kind:"conversation_message",id:source.sourceMessageId,version:source.sourceVersion,cardRef:randomUUID()}],
          requiredCategories:["conversation_history"],purposeRevocationGeneration:source.purposeRevocationGeneration});
        tx.set(parentPath(location),{...inv.parent,nextSequence:sequence+1,latestMessageId:input.messageId});
        return {sequence};
      }),
      readableSequence:(id,sequence)=>wrap(async()=>{
        const location=this.location(owner,id);await this.owner(tx,principal,owner,check);
        const inv=await this.inventory(tx,location,false,check);if(!inv)refuse("conversation_unavailable");
        if(sequence===0)return;
        const row=inv.rows.find(r=>r.data.sequence===sequence);if(!row)refuse("conversation_unavailable");
        if(row.data.role === "user")return;
        const value=row.data.origin === "proactive"
          ? await this.sourcedV2(tx,location,row,await readWhileCurrent(check,()=>tx.get(`${parentPath(location)}/message_sources/${row.id}`)),check)
          : await this.pair(tx,location,inv,this.requireUser(inv,row.data.replyToUserMessageId as string),check);
        if(!value || value.messageId!==row.id || value.availability!=="available")refuse("conversation_unavailable");
      }),
    };
  }

  async readOwnedMessageAnchor(principal:AuthPrincipal,owner:string,id:string,messageId:string,current:()=>boolean):Promise<StoreResult<OwnedMessageAnchor>> {
    return this.run(async tx=>{
      const check=()=>this.readCurrent(current),location=this.location(owner,id);check();await this.owner(tx,principal,owner,check);
      const inv=await this.inventory(tx,location,false,check);if(!inv)refuse("conversation_unavailable");
      const row=inv.rows.find(r=>r.id===messageId);if(!row)refuse("conversation_unavailable");
      const readable=await this.firstFlowTransaction(tx,principal,owner,current).readableSequence(id,row.data.sequence as number);
      if(readable.kind!=="ok")refuse(readable.kind === "terminated" ? "terminated" : "conversation_unavailable");
      check();return {conversationId:id,messageId,sequence:row.data.sequence as number,pageBefore:(row.data.sequence as number)+1};
    });
  }

  async resolveOwnedSource(principal:AuthPrincipal,owner:string,id:string,assistantMessageId:string,cardRef:string,current:()=>boolean):Promise<StoreResult<OwnedSourceTarget>> {
    return this.run(async tx=>{
      const check=()=>this.readCurrent(current),location=this.location(owner,id);check();await this.owner(tx,principal,owner,check);
      const inv=await this.inventory(tx,location,false,check);if(!inv)refuse("conversation_unavailable");
      const row=inv.rows.find(r=>r.id===assistantMessageId);if(!row||row.data.role!=="assistant"||row.data.availability!=="available")refuse("conversation_unavailable");
      const receipt=parseSourceUse(await readWhileCurrent(check,()=>tx.get(`${parentPath(location)}/message_sources/${row.id}`)));
      if(!receipt)refuse("conversation_unavailable");
      const state=await inspectSourceUseV2(tx,owner,id,receipt,this.utcMilliseconds,check);
      if(state.kind!=="valid")refuse(state.kind==="invalid"?(state.reason==="changed"?"conflict":"conversation_unavailable"):"unavailable");
      const source=receipt.sources.find(s=>s.cardRef===cardRef);if(!source)refuse("conversation_unavailable");
      check();if(source.kind==="check_in")return {kind:"check_in",checkInId:source.id};
      const user=this.requireUser(inv,source.id),sequence=user.data.sequence as number;
      return {kind:"conversation_message",anchor:{conversationId:id,messageId:user.id,sequence,pageBefore:sequence+1}};
    });
  }

  private async run<T>(work: (tx: Tx) => Promise<T>): Promise<StoreResult<T>> {
    try { return { kind: "confirmed", value: await this.gateway.runTransaction(work, { maxAttempts: 1 }) }; }
    catch (error) { return error instanceof Refusal ? { kind: error.kind } : { kind: "unresolved" }; }
  }
  private now(): FullPrecisionInstant {
    const ms = this.utcMilliseconds();
    if (!Number.isSafeInteger(ms) || ms < this.lastNow) refuse("unavailable");
    this.lastNow = ms;
    const seconds = Math.floor(ms / 1000);
    return { seconds, nanoseconds: (ms - seconds * 1000) * 1_000_000 };
  }
  private async fresh(a: OriginalWriteAuthority): Promise<void> {
    current(a);
    let result: Awaited<ReturnType<OriginalWriteAuthority["verifyCurrentAuth"]>>;
    try { result = await a.verifyCurrentAuth(); } catch { refuse("unavailable"); }
    current(a);
    if (result.kind !== "verified") refuse(result.kind);
    if (result.principal.firebaseUid !== a.principal.firebaseUid) refuse("denied");
  }
  private async content<T>(a: OriginalWriteAuthority, work: (tx: Tx) => Promise<T>): Promise<StoreResult<T>> {
    try { await this.fresh(a); current(a); } catch (e) {
      return { kind: e instanceof Refusal ? e.kind : "unavailable" };
    }
    // No intervening await between this original guard and SDK dispatch.
    return this.run(async tx => { current(a);const started=this.utcMilliseconds(); const value = await work(tx); current(a);
      if(a.dependencies.selectedReply&&(this.utcMilliseconds()<started||this.utcMilliseconds()-started>5000))refuse("unavailable");return value; });
  }
  private async owner(tx: Tx, principal: AuthPrincipal, expected: string, check?: () => void): Promise<RecordData> {
    const bindingId = createAuthBindingDocumentId(principal.firebaseUid);
    if (bindingId === undefined) refuse("denied");
    const binding = await readWhileCurrent(check, () => tx.get(`auth_bindings/${bindingId}`));
    if (binding === undefined) refuse("denied");
    const owner = parseAuthBinding(binding);
    if (owner === undefined) refuse("unavailable");
    if (owner !== expected) refuse("denied");
    const account = await readWhileCurrent(check, () => tx.get(`accounts/${owner}`));
    if (account === undefined || parseAccountProjection(account) === undefined) refuse("unavailable");
    return account;
  }
  private async authority(tx: Tx, target: OperationTarget, a: OriginalWriteAuthority): Promise<void> {
    const check = () => current(a);
    const account = await this.owner(tx, a.principal, target.ownerAccountId, check);
    const deps = a.dependencies;
    if (deps.ownerId !== target.ownerAccountId || deps.purpose !== "checkin_conversation") refuse("denied");
    if (account.optionalProcessingConsent !== "accepted") refuse("denied");
    if (!nonnegative(account.purposeRevocationGeneration) || !nonnegative(deps.purposeRevocationGeneration)) refuse("unavailable");
    if (account.purposeRevocationGeneration > deps.purposeRevocationGeneration) refuse("denied");
    if (account.purposeRevocationGeneration !== deps.purposeRevocationGeneration) refuse("unavailable");
    if (!validDependencies(deps)) refuse("unavailable");
    if(deps.selectedReply){
      const selected=deps.selectedReply,started=this.utcMilliseconds();
      if (selected.processing === 'cloud' && (legacyCloudAiProcessing(selected)?.provider !== this.cloudProcessing.provider || !hasCloudAiConsent(account.cloudAiConsent, account.optionalProcessingConsent, this.cloudProcessing) || !nonnegative(selected.cloudAiConsentGeneration) || selected.cloudAiConsentGeneration !== account.cloudAiConsentGeneration)) refuse('denied');
      if(!["local","cloud"].includes(selected.processing)||!Array.isArray(selected.permittedCheckInIds)||selected.permittedCheckInIds.length>5||
        new Set(selected.permittedCheckInIds).size!==selected.permittedCheckInIds.length||!Array.isArray(selected.excludedCheckInIds)||!Array.isArray(selected.sources)||selected.sources.length>15||
        selected.permittedCheckInIds.some(id=>selected.excludedCheckInIds.includes(id))||deps.sources.some(s=>!selected.permittedCheckInIds.includes(s.sourceId)))refuse("selection_conflict");
      const checkIns=selected.sources.filter(s=>s.kind==="check_in");
      if(new Set(selected.sources.map(s=>`${s.kind}:${s.id}`)).size!==selected.sources.length||
        checkIns.length!==deps.sources.length||checkIns.length!==selected.permittedCheckInIds.length||
        checkIns.some(s=>!deps.sources.some(d=>d.sourceId===s.id))||selected.sources.some(s=>typeof s.version!=="string"||!s.version||s.version.length>512))refuse("selection_conflict");
      if(!tx.getSnapshot)refuse("unavailable");
      for(const source of selected.sources){
        if(source.kind==="check_in"){
          if(!selected.permittedCheckInIds.includes(source.id)||selected.excludedCheckInIds.includes(source.id)||!isSafeDocumentId(source.id))refuse("selection_conflict");
          const row=await readWhileCurrent(check,()=>tx.getSnapshot!(`check_ins/${source.id}`));if(!row||row.data.ownerAccountId!==target.ownerAccountId)refuse("source_unavailable");
          const p=parseCheckInProjection(row.data,source.id),version=checkInSourceVersion(row);if(!p||!version)refuse("unavailable");
          if(version!==source.version)refuse("source_changed");
          const now=this.utcMilliseconds(),occurred=Date.parse(p.createdAt);if(occurred>now||occurred<now-7*86400000)refuse("source_unavailable");
        }else if(source.kind==="conversation_message"){
          const row=await readWhileCurrent(check,()=>tx.getSnapshot!(`${parentPath(target)}/messages/${source.id}`));
          if(!row||row.data.role!=="user")refuse("source_unavailable");if(messageSourceVersion(row)!==source.version)refuse("source_changed");
        }else refuse("selection_conflict");
      }
      if(this.utcMilliseconds()<started||this.utcMilliseconds()-started>5000)refuse("unavailable");
    }else{
      const sourceState = await inspectNoteSources(tx, this.gateway, this.notePrerequisites, target.ownerAccountId, deps.sources, deps, () => current(a));
      if (sourceState !== "valid") refuse(sourceState === "invalid" ? "denied" : "unavailable");
    }
    if (deps.usedPersonaId !== undefined) {
      if (!/^[0-9a-f]{64}$/.test(deps.usedPersonaId)) refuse("unavailable");
      const persona = await readWhileCurrent(check, () => tx.get(`accounts/${target.ownerAccountId}/personas/${deps.usedPersonaId}`));
      if (persona === undefined) refuse("denied");
      const state = await readWhileCurrent(check, () => tx.get(`accounts/${target.ownerAccountId}/persona_state/current`));
      const fields = normalizePersonaInput({ displayName: persona.displayName, tone: persona.tone,
        responseLength: persona.responseLength, formatStyle: persona.formatStyle });
      if (!positive(persona.revision) || fields === undefined || fields.displayName !== persona.displayName ||
          state === undefined || !Array.isArray(state.livePersonaIds) || !state.livePersonaIds.includes(deps.usedPersonaId) ||
          !nonnegative(state.stateRevision)) refuse("unavailable");
      // Edit/switch are NOT revocations; only the originally used record must remain live.
    }
    if (deps.history !== undefined||deps.selectedReply?.historySnapshot!==undefined) {
      const inv = await this.inventory(tx, target, false, check);
      if (!inv && (deps.history?.length||deps.selectedReply?.historySnapshot?.length)) refuse("denied");
      if (inv) await this.history(tx, target, inv, deps.history??[], check,deps);
    }
    if(deps.replyToMessageId!==undefined){
      if(!UUID.test(deps.replyToMessageId)||target.targetKind!=="existing")refuse("selection_conflict");
      const inv=await this.inventory(tx,target,false,check);if(!inv)refuse("conversation_unavailable");
      const row=inv.rows.find(r=>r.id===deps.replyToMessageId);
      if(!row||row.data.origin!=="proactive"||row.data.availability!=="available")refuse("source_unavailable");
      const value=await this.sourcedV2(tx,target,row,await readWhileCurrent(check,()=>tx.get(`${parentPath(target)}/message_sources/${row.id}`)),check);
      if(value.availability!=="available")refuse("source_unavailable");
    }
    current(a);
  }
  private async epoch(tx: Tx, expected: RuntimeEpoch, check?: () => void): Promise<RecordData> {
    const row = await readWhileCurrent(check, () => tx.get(RUNTIME));
    if (row === undefined || !exact(row, ["processEpoch", "generation", "cleanupGeneration"]) ||
        typeof row.processEpoch !== "string" || !UUID.test(row.processEpoch) ||
        !positive(row.generation) || !nonnegative(row.cleanupGeneration)) refuse("unavailable");
    if (row.processEpoch !== expected.processEpoch || row.generation !== expected.generation) refuse("terminated");
    return row;
  }
  private fenceMatches(d: RecordData, t: OperationTarget): boolean {
    return exact(d, ["ownerAccountId", "conversationId", "userMessageId", "kind", "targetKind", "processEpoch", "revision", "state"]) &&
      d.ownerAccountId === t.ownerAccountId && d.conversationId === t.conversationId && d.userMessageId === t.userMessageId &&
      d.kind === t.kind && d.targetKind === t.targetKind && typeof d.processEpoch === "string" && UUID.test(d.processEpoch) &&
      positive(d.revision) && (d.state === "open" || d.state === "closed");
  }
  private async writable(tx: Tx, op: OpenOperation, a: OriginalWriteAuthority): Promise<void> {
    requireTarget(op);
    const check = () => current(a);
    await this.epoch(tx, op.epoch, check);
    const row = await readWhileCurrent(check, () => tx.get(fencePath(op)));
    if (row === undefined || !this.fenceMatches(row, op)) refuse("unavailable");
    if (row.processEpoch !== op.epoch.processEpoch || row.state !== "open" || row.revision !== op.revision) refuse("terminated");
    await this.authority(tx, op, a);
  }
  private async inventory(tx: Tx, target: Location, allowExpiredRetirement = false, check?: () => void): Promise<Inventory | undefined> {
    const parent = await readWhileCurrent(check, () => tx.get(parentPath(target)));
    if (parent === undefined) {
      // A missing parent cannot hide retained children and become a fresh target.
      await readTogether(["messages", "message_sources", "effects"].map(collection => async () => {
        const rows = await readWhileCurrent(check, () => tx.list(`${parentPath(target)}/${collection}`));
        // Validate inside each read so retained children keep their original
        // failure priority even when a later sibling read also rejects.
        if (rows.length !== 0) refuse("unavailable");
      }));
      return undefined;
    }
    if (!exact(parent, ["state", "lifecycleVersion", "nextSequence", "latestMessageId"]) ||
        tx.listSnapshots === undefined) refuse("unavailable");
    const rows = await readWhileCurrent(check, () => tx.listSnapshots!(`${parentPath(target)}/messages`));
    for (const row of rows) this.message(row); // Validate records before any effect/read projection.
    const resolution = resolveRealRetention({ ownerAccountId: target.ownerAccountId, conversationId: target.conversationId,
      inventory: { parent: { ...parent, ownerAccountId: target.ownerAccountId, conversationId: target.conversationId },
        messages: rows.map(row => ({ ownerAccountId: target.ownerAccountId, conversationId: target.conversationId,
          messageId: row.id, role: row.data.role, sequence: row.data.sequence, createTime: row.createTime,
          ...(row.data.origin === undefined ? {} : { origin: row.data.origin }),
          ...(row.data.appendBefore === undefined ? {} : { appendBefore: row.data.appendBefore }) })) },
      now: { precision: "millisecond", instant: this.now() } });
    if (resolution.state === "unavailable") refuse("unavailable");
    if (resolution.state !== "live" && !(allowExpiredRetirement && resolution.state === "expired")) refuse("conversation_unavailable");
    return { parent, rows, cutoff: resolution.expiresAt };
  }
  private message(row: Snapshot): StoredConversationMessage {
    const d = row.data;
    if (!UUID.test(row.id) || !positive(d.sequence)) refuse("unavailable");
    if (d.role === "user") {
      if (!exact(d, ["role", "sequence", "text"], ["appendBefore", "pendingOperationId", "acceptedAssistantMessageId","replyToMessageId"]) ||
          typeof d.text !== "string" || !validText(d.text) ||
          [d.pendingOperationId, d.acceptedAssistantMessageId,d.replyToMessageId].some(v => v !== undefined && (typeof v !== "string" || !UUID.test(v)))) refuse("unavailable");
      return { messageId: row.id, sequence: d.sequence, role: "user", persistedAt: row.createTime, availability: "available", text: d.text,
        ...(typeof d.replyToMessageId==="string"?{replyToMessageId:d.replyToMessageId}:{}) };
    }
    if (d.origin === "proactive") {
      if (d.role !== "assistant" || !exact(d,["role","origin","sequence","availability","occurrenceId","category","presentationMode","appendBefore"],
        ["text","presentationProjectionVersion"]) || typeof d.occurrenceId !== "string" || !UUID.test(d.occurrenceId) ||
        d.category !== "explicit_follow_up" || !((d.presentationMode === "default" && d.presentationProjectionVersion === undefined) ||
        (d.presentationMode === "persona" && d.presentationProjectionVersion === "persona_presentation_v1")) ||
        !((d.availability === "available" && typeof d.text === "string" && validText(d.text)) ||
          (d.availability === "unavailable" && !Object.hasOwn(d,"text")))) refuse("unavailable");
      return {messageId:row.id,sequence:d.sequence,role:"assistant",origin:"proactive",occurrenceId:d.occurrenceId,
        category:"explicit_follow_up",persistedAt:row.createTime,availability:d.availability,
        ...(typeof d.text === "string" ? {text:d.text} : {})};
    }
    if (d.role !== "assistant" || !exact(d, ["role", "sequence", "availability", "replyToUserMessageId", "presentationMode", "appendBefore"],
      ["text", "presentationProjectionVersion"]) || typeof d.replyToUserMessageId !== "string" || !UUID.test(d.replyToUserMessageId) ||
      !((d.presentationMode === "default" && d.presentationProjectionVersion === undefined) ||
        (d.presentationMode === "persona" && d.presentationProjectionVersion === "persona_presentation_v1")) ||
      !((d.availability === "available" && typeof d.text === "string" && d.text.isWellFormed() && d.text.trim().length > 0) ||
        (d.availability === "unavailable" && !Object.hasOwn(d, "text")))) refuse("unavailable");
    return { messageId: row.id, sequence: d.sequence, role: "assistant", persistedAt: row.createTime,
      availability: d.availability, ...(typeof d.text === "string" ? { text: d.text } : {}) };
  }
  private requireUser(inv: Inventory, id: string): Snapshot {
    const row = inv.rows.find(r => r.id === id);
    if (row === undefined || row.data.role !== "user") refuse("conversation_unavailable");
    return row;
  }
  private sameUser(row: Snapshot, expected: StoredUserIdentity): void {
    if (row.id !== expected.messageId || row.data.sequence !== expected.sequence ||
        row.createTime.seconds !== expected.persistedAt.seconds || row.createTime.nanoseconds !== expected.persistedAt.nanoseconds) refuse("conflict");
  }
  private nextSequence(inv: Inventory): number {
    const next = inv.parent.nextSequence;
    if (!positive(next) || next >= Number.MAX_SAFE_INTEGER) refuse("unavailable");
    return next;
  }
  private fenceData(t: OperationTarget, epoch: RuntimeEpoch, state: "open" | "closed", revision: number): RecordData {
    return { ownerAccountId: t.ownerAccountId, conversationId: t.conversationId, userMessageId: t.userMessageId,
      kind: t.kind, targetKind: t.targetKind, processEpoch: epoch.processEpoch, state, revision };
  }
  async startEpoch(processEpoch: string, claim?: RuntimeEpochClaim): Promise<StoreResult<RuntimeEpoch>> {
    const expected = claim === undefined ? undefined : { ...claim?.expectedFence };
    const expiresAtMs = claim?.expiresAtMs;
    return this.run(async tx => {
      if (!UUID.test(processEpoch)) refuse("unavailable");
      const previous = await tx.get(RUNTIME);
      if (previous !== undefined && (!exact(previous, ["processEpoch", "generation", "cleanupGeneration"]) ||
          typeof previous.processEpoch !== "string" || !UUID.test(previous.processEpoch) || !positive(previous.generation) ||
          !nonnegative(previous.cleanupGeneration) || previous.generation >= Number.MAX_SAFE_INTEGER ||
          previous.processEpoch === processEpoch)) refuse("unavailable");
      if (expected !== undefined) {
        const now = this.utcMilliseconds();
        if (!nonnegative(now) || !positive(expiresAtMs) || now >= expiresAtMs ||
            !exact(expected, ["processEpoch", "generation", "cleanupGeneration"])) refuse("unavailable");
        if (!previous || previous.processEpoch !== expected.processEpoch || previous.generation !== expected.generation ||
            previous.cleanupGeneration !== expected.cleanupGeneration) refuse("conflict");
      }
      const generation = previous === undefined ? 1 : (previous.generation as number) + 1;
      tx.set(RUNTIME, { processEpoch, generation, cleanupGeneration: previous?.cleanupGeneration ?? 0 });
      return { processEpoch, generation };
    });
  }
  async initializeOperation(t: OperationTarget, epoch: RuntimeEpoch, a: OriginalWriteAuthority): Promise<StoreResult<OpenOperation>> {
    return this.content(a, async tx => {
      requireTarget(t); await this.epoch(tx, epoch); await this.authority(tx, t, a);
      const [previous, oldEffect] = await readTogether([
        () => readWhileCurrent(() => current(a), () => tx.get(fencePath(t))),
        () => readWhileCurrent(() => current(a), () => tx.get(effectPath(t))),
      ]);
      if (previous !== undefined || oldEffect !== undefined) refuse("conflict"); // No reopen after normal guard retirement either.
      const inv = await this.inventory(tx, t);
      if (t.targetKind === "existing" && inv === undefined) refuse("conversation_unavailable");
      if (t.targetKind === "reserved_new" && inv !== undefined) refuse("conflict");
      current(a); tx.create(fencePath(t), this.fenceData(t, epoch, "open", 1));
      return { ...t, epoch, revision: 1 };
    });
  }
  async saveUser(op: OpenOperation, borrowText: () => string | undefined, a: OriginalWriteAuthority): Promise<StoreResult<void>> {
    return this.content(a, async tx => {
      if (op.kind !== "send") refuse("conflict");
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op);
      const [existingUser, existingEffect] = await readTogether([
        () => readWhileCurrent(() => current(a), () => tx.get(userPath(op))),
        () => readWhileCurrent(() => current(a), () => tx.get(effectPath(op))),
      ]);
      if (existingUser !== undefined || existingEffect !== undefined) refuse("conflict");
      if (inv === undefined && op.targetKind !== "reserved_new") refuse("conversation_unavailable");
      if (inv !== undefined && op.targetKind === "reserved_new") refuse("conflict");
      const sequence = inv === undefined ? 1 : this.nextSequence(inv);
      current(a);
      const text = borrowText(); if (text === undefined) refuse("terminated");
      if (!validText(text)) refuse("conflict");
      tx.create(userPath(op), { role: "user", sequence, text, pendingOperationId: op.operationId,
        ...(a.dependencies.replyToMessageId?{replyToMessageId:a.dependencies.replyToMessageId}:{}),
        ...(inv === undefined ? {} : { appendBefore: inv.cutoff }) });
      tx.create(effectPath(op), { kind: "send", userMessageId: op.userMessageId });
      tx.set(parentPath(op), { state: "live", lifecycleVersion: inv?.parent.lifecycleVersion ?? 1,
        nextSequence: sequence + 1, latestMessageId: op.userMessageId });
    });
  }
  async claimRetry(op: OpenOperation, borrowText: () => string | undefined, expectedUser: StoredUserIdentity, a: OriginalWriteAuthority): Promise<StoreResult<void>> {
    return this.content(a, async tx => {
      if (op.kind !== "retry") refuse("conflict");
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId);
      this.sameUser(user, expectedUser);
      const oldEffect = await tx.get(effectPath(op));
      current(a); const text = borrowText(); if (text === undefined) refuse("terminated");
      if (!validText(text)) refuse("conflict");
      if (user.data.text !== text || user.data.acceptedAssistantMessageId !== undefined ||
          user.data.pendingOperationId !== undefined || oldEffect !== undefined) refuse("conflict");
      current(a);
      tx.set(userPath(op), { ...user.data, pendingOperationId: op.operationId });
      tx.create(effectPath(op), { kind: "retry", userMessageId: op.userMessageId });
    });
  }
  async saveAssistant(op: OpenOperation, borrowInput: () => { readonly messageId: string; readonly text: string; readonly presentation: PresentationMetadata } | undefined,
    a: OriginalWriteAuthority, expectedUser?: StoredUserIdentity): Promise<StoreResult<void>> {
    return this.content(a, async tx => {
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId);
      if (expectedUser !== undefined) this.sameUser(user, expectedUser);
      const effect = await tx.get(effectPath(op));
      // Query existing provenance before borrowing reply content. No awaited
      // authority or data read may retain a borrowed reply before SDK submission.
      const allSources = await tx.list(`${parentPath(op)}/message_sources`);
      if (user.data.pendingOperationId !== op.operationId || user.data.acceptedAssistantMessageId !== undefined) refuse("conflict");
      if (effect === undefined || !exact(effect, ["kind", "userMessageId"]) || effect.kind !== op.kind ||
          effect.userMessageId !== op.userMessageId) refuse("unavailable");
      const sequence = this.nextSequence(inv);
      current(a);
      const input = borrowInput(); if (input === undefined) refuse("terminated");
      if (!UUID.test(input.messageId) || input.messageId === op.userMessageId || !validText(input.text) ||
          inv.rows.some(row => row.id === input.messageId) || allSources.some(row => row.id === input.messageId) ||
          !((input.presentation.presentationMode === "default" && a.dependencies.usedPersonaId === undefined) ||
            (input.presentation.presentationMode === "persona" && a.dependencies.usedPersonaId !== undefined &&
              input.presentation.presentationProjectionVersion === "persona_presentation_v1"))) refuse("unavailable");
      const path = `${parentPath(op)}/messages/${input.messageId}`, provenance = `${parentPath(op)}/message_sources/${input.messageId}`;
      tx.create(path, { role: "assistant", sequence, availability: "available", text: input.text, replyToUserMessageId: op.userMessageId,
        ...input.presentation, appendBefore: inv.cutoff });
      const selected=a.dependencies.selectedReply;
      tx.create(provenance,selected&&(selected.sources.length||selected.processing==="cloud")?{schemaVersion:selected.processing==="cloud"?"source_use_v3":"source_use_v2",purpose:"selected_checkin_reply",processing:selected.processing,
        ...(selected.processing==="cloud"?{...this.cloudProcessing,cloudAiConsentGeneration:selected.cloudAiConsentGeneration}:{}),
        sources:selected.sources.map(s=>({...s,cardRef:randomUUID()})),requiredCategories:[...(selected.sources.some(s=>s.kind==="check_in")?["check_ins"]:[]),
          ...(selected.sources.some(s=>s.kind==="conversation_message")?["conversation_history"]:[])],purposeRevocationGeneration:a.dependencies.purposeRevocationGeneration}:
        { sources: a.dependencies.sources.map(({ sourceType, sourceId }) => ({ sourceType, sourceId })),
          ...(a.dependencies.sources.length ? { purposeRevocationGeneration: a.dependencies.purposeRevocationGeneration } : {}) });
      tx.set(userPath(op), { ...user.data, acceptedAssistantMessageId: input.messageId });
      tx.set(effectPath(op), { ...effect, assistantMessageId: input.messageId });
      tx.set(parentPath(op), { ...inv.parent, nextSequence: sequence + 1, latestMessageId: input.messageId });
    });
  }
  async closeOperation(t: OperationTarget, epoch: RuntimeEpoch): Promise<StoreResult<void>> {
    return this.run(async tx => {
      requireTarget(t); await this.epoch(tx, epoch);
      const row = await tx.get(fencePath(t));
      if (row === undefined) { tx.create(fencePath(t), this.fenceData(t, epoch, "closed", 1)); return; }
      if (!this.fenceMatches(row, t) || row.processEpoch !== epoch.processEpoch) refuse("unavailable");
      if (row.state === "closed") return;
      if (!positive(row.revision) || row.revision >= Number.MAX_SAFE_INTEGER) refuse("unavailable");
      tx.set(fencePath(t), { ...row, state: "closed", revision: row.revision + 1 });
    });
  }
  private async pair(tx: Tx, t: Location, inv: Inventory, user: Snapshot, check?: () => void): Promise<StoredConversationMessage | undefined> {
    check?.();
    const id = user.data.acceptedAssistantMessageId;
    if (id === undefined) return undefined;
    const assistant = inv.rows.find(r => r.id === id);
    if (assistant === undefined || assistant.data.role !== "assistant" || assistant.data.replyToUserMessageId !== user.id) refuse("unavailable");
    const sources = await readWhileCurrent(check, () => tx.get(`${parentPath(t)}/message_sources/${id as string}`));
    if (assistant.data.availability === "unavailable") {
      if (sources !== undefined) refuse("unavailable");
      return this.message(assistant);
    }
    if (["source_use_v2","source_use_v3"].includes(String(sources?.schemaVersion))) return this.sourcedV2(tx,t,assistant,sources,check);
    const parsed = parseProvenance(sources); if (!parsed) refuse("unavailable");
    const state = await readWhileCurrent(check, () => inspectProvenance(tx, this.gateway, this.notePrerequisites, t.ownerAccountId, parsed, check));
    if (state === "unavailable") refuse("unavailable");
    if (state === "invalid") {
      // Immediate read suppression; the selected source sweep physically removes
      // text/all provenance atomically. Do not write here before later page reads.
      const { text: _content, ...metadata } = assistant.data;
      return this.message({ ...assistant, data: { ...metadata, availability: "unavailable" } });
    }
    return this.message(assistant);
  }
  private historyIdentity(inv:Inventory,user:Snapshot):HistoryPairIdentity{
    const assistant=inv.rows.find(r=>r.id===user.data.acceptedAssistantMessageId);
    if(!assistant||assistant.data.role!=="assistant"||assistant.data.origin!==undefined||assistant.data.replyToUserMessageId!==user.id||
      (assistant.data.sequence as number)<=(user.data.sequence as number))refuse("unavailable");
    return {userMessageId:user.id,assistantMessageId:assistant.id,userSequence:user.data.sequence as number,assistantSequence:assistant.data.sequence as number};
  }
  private historyWindow(inv:Inventory,excludeUser?:string):readonly Snapshot[]{
    return inv.rows.filter(row=>row.data.role==="user"&&row.id!==excludeUser&&row.data.acceptedAssistantMessageId!==undefined&&row.data.pendingOperationId===undefined)
      .sort((a,b)=>this.historyIdentity(inv,b).assistantSequence-this.historyIdentity(inv,a).assistantSequence).slice(0,2).reverse();
  }
  /** Content-free candidate identities inside the selector's SAME transaction.
   * Does not grant permission to borrow any pair's text or underlying sources. */
  async prepareHistorySnapshot(tx:Tx,principal:AuthPrincipal,owner:string,id:string,current:()=>boolean):Promise<StoreResult<readonly HistoryPairIdentity[]>>{
    try{
      const check=()=>this.readCurrent(current),location=this.location(owner,id);check();
      const authority=parseReadAuthority(await this.owner(tx,principal,owner,check),owner);if(!authority)refuse("unavailable");if(authority.consent!=="accepted")refuse("denied");
      const inv=await this.inventory(tx,location,false,check);if(!inv)refuse("conversation_unavailable");
      const pairs=this.historyWindow(inv).map(row=>this.historyIdentity(inv,row));check();return {kind:"confirmed",value:pairs};
    }catch(e){return {kind:e instanceof Refusal?e.kind:"unresolved"};}
  }
  private async sourcedV2(tx:Tx,t:Location,row:Snapshot,source:RecordData|undefined,check?:()=>void):Promise<StoredConversationMessage>{
    if(row.data.availability === "unavailable") {
      if(source !== undefined)refuse("unavailable");
      return this.message(row);
    }
    const receipt = parseSourceUse(source); if(!receipt)refuse("unavailable");
    this.now();
    const result = await inspectSourceUseV2(tx,t.ownerAccountId,t.conversationId,receipt,this.utcMilliseconds,()=>check?.());
    check?.();
    if(result.kind === "unavailable")refuse("unavailable");
    if(result.kind === "invalid") {
      const {text:_text,...metadata}=row.data;
      return this.message({...row,data:{...metadata,availability:"unavailable"}});
    }
    if(result.kind!=="valid")refuse("unavailable");
    return {...this.message(row),...(result.cards.length ? {sources:result.cards} : {}),
      ...(receipt.processing === 'cloud' ? {processing:'cloud' as const,provider:receipt.provider,disclosureVersion:receipt.disclosureVersion} : {})};
  }
  /** Select the latest TWO canonical complete pairs before exclusions. Never backfill.
   * An explicit expected set rechecks precisely the borrowed pairs at every effect. */
  private async history(tx: Tx, t: OperationTarget, inv: Inventory,
    expected: readonly HistoryPairIdentity[] | undefined, check: () => void,deps?:OriginalWriteAuthority["dependencies"]): Promise<ConversationHistory> {
    if (expected && (!Array.isArray(expected) || expected.length > 2 || new Set(expected.map(p => p.userMessageId)).size !== expected.length)) refuse("unavailable");
    const window=this.historyWindow(inv,t.userMessageId),snapshot=deps?.selectedReply?.historySnapshot,excluded=deps?.selectedReply?.excludedHistoryPairs??[];
    const same=(a:HistoryPairIdentity,b:HistoryPairIdentity)=>a.userMessageId===b.userMessageId&&a.assistantMessageId===b.assistantMessageId&&a.userSequence===b.userSequence&&a.assistantSequence===b.assistantSequence;
    if(snapshot!==undefined&&(!Array.isArray(snapshot)||snapshot.length>2||snapshot.length!==window.length||window.some((row,i)=>!same(this.historyIdentity(inv,row),snapshot[i]!))))refuse("source_changed");
    if(excluded.length>2||new Set(excluded.map(p=>p.userMessageId)).size!==excluded.length||excluded.some(p=>!snapshot?.some(s=>same(s,p))))refuse("selection_conflict");
    if(expected?.some(p=>excluded.some(e=>same(e,p))))refuse("selection_conflict");
    const selected = (expected ? expected.map(p => {
      if (!UUID.test(p.userMessageId) || !UUID.test(p.assistantMessageId) || !positive(p.userSequence) || !positive(p.assistantSequence)) refuse("unavailable");
      const row = this.requireUser(inv, p.userMessageId);
      if (row.data.sequence !== p.userSequence || row.data.acceptedAssistantMessageId !== p.assistantMessageId) refuse("denied");
      return row;
    }) : window).filter(row=>!excluded.some(p=>same(p,this.historyIdentity(inv,row))));
    const pairs: ConversationHistory["pairs"][number][] = [], sources = new Map<string, ConversationHistory["sources"][number]>(),
      messageSources=new Map<string,NonNullable<ConversationHistory["messageSources"]>[number]>();
    for (const row of selected) {
      check();
      const candidate=inv.rows.find(r=>r.id===row.data.acceptedAssistantMessageId);
      if(candidate?.data.availability==="available"){
        const proof=await readWhileCurrent(check,()=>tx.get(`${parentPath(t)}/message_sources/${candidate.id}`));
        const required=["source_use_v2","source_use_v3"].includes(String(proof?.schemaVersion))?parseSourceUse(proof)?.sources.filter(s=>s.kind==="check_in").map(s=>s.id):parseProvenance(proof)?.sources.map(s=>s.sourceId);
        if(required?.some(id=>!deps?.selectedReply?.permittedCheckInIds.includes(id)||deps.selectedReply.excludedCheckInIds.includes(id)))refuse("selection_conflict");
      }
      const assistant = await this.pair(tx,t,inv,row,check);
      if (row.data.pendingOperationId !== undefined || !assistant || assistant.availability !== "available" || !assistant.text) {
        if (expected) refuse("denied");
        continue;
      }
      const identity = { userMessageId: row.id, assistantMessageId: assistant.messageId,
        userSequence: Number(row.data.sequence), assistantSequence: assistant.sequence };
      if (expected && !expected.some(p => p.userMessageId === identity.userMessageId && p.assistantMessageId === identity.assistantMessageId &&
          p.userSequence === identity.userSequence && p.assistantSequence === identity.assistantSequence)) refuse("denied");
      const receipt=await readWhileCurrent(check, () => tx.get(`${parentPath(t)}/message_sources/${assistant.messageId}`));
      if(["source_use_v2","source_use_v3"].includes(String(receipt?.schemaVersion))){
        const v2=parseSourceUse(receipt);if(!v2)refuse("unavailable");
        const closure=deps?.selectedReply;
        for(const source of v2.sources){
          if(source.kind==="check_in"&&(!closure||!closure.permittedCheckInIds.includes(source.id)||closure.excludedCheckInIds.includes(source.id)))refuse("selection_conflict");
          if(source.kind==="conversation_message")messageSources.set(source.id,{kind:source.kind,id:source.id,version:source.version});
          if(source.kind==="check_in"){
            if(!closure!.sources.some(s=>s.kind===source.kind&&s.id===source.id&&s.version===source.version))refuse("source_changed");
            const note=await readWhileCurrent(check,()=>tx.getSnapshot!(`check_ins/${source.id}`));if(!note)refuse("source_unavailable");
            if(!note.updateTime)refuse("unavailable");sources.set(source.id,{sourceType:"check_in",sourceId:source.id,observedVersion:note.updateTime});
          }
        }
        pairs.push(Object.freeze({identity:Object.freeze(identity),user:String(row.data.text),assistant:assistant.text}));continue;
      }
      const provenance = parseProvenance(receipt);
      if (!provenance) refuse("unavailable");
      if(provenance.sources.length){
        if(provenance.sources.some(s=>!deps?.selectedReply?.permittedCheckInIds.includes(s.sourceId)||deps.selectedReply.excludedCheckInIds.includes(s.sourceId)))refuse("selection_conflict");
        // A legacy receipt has no mutable content version. Current selection
        // cannot invent which old source text its assistant actually depended on.
        refuse("unavailable");
      }
      if (!tx.getSnapshot && provenance.sources.length) refuse("unavailable");
      for (const source of provenance.sources) {
        const note = await readWhileCurrent(check, () => tx.getSnapshot!(`check_ins/${source.sourceId}`));
        if (!note) refuse("denied");
        const parsed = parseReadNote(note.data,source.sourceId,note.updateTime,t.ownerAccountId);
        if (!parsed) refuse("unavailable");
        sources.set(source.sourceId,{...source,observedVersion:parsed.observedVersion});
      }
      pairs.push(Object.freeze({identity:Object.freeze(identity),user:String(row.data.text),assistant:assistant.text}));
    }
    if (sources.size > 15) refuse("unavailable");
    let replyToAssistant:ConversationHistory["replyToAssistant"];
    if(deps?.replyToMessageId){
      const row=inv.rows.find(r=>r.id===deps.replyToMessageId);if(!row||row.data.origin!=="proactive")refuse("source_unavailable");
      const proof=await readWhileCurrent(check,()=>tx.get(`${parentPath(t)}/message_sources/${row.id}`)),receipt=parseSourceUse(proof);
      const message=await this.sourcedV2(tx,t,row,proof,check);if(message.availability!=="available"||!message.text||!receipt)refuse("source_unavailable");
      for(const source of receipt.sources){if(source.kind!=="conversation_message")refuse("selection_conflict");messageSources.set(source.id,{kind:source.kind,id:source.id,version:source.version});}
      replyToAssistant={occurredAt:new Date(row.createTime.seconds*1000+Math.floor(row.createTime.nanoseconds/1e6)).toISOString(),text:message.text};
    }
    return Object.freeze({pairs:Object.freeze(pairs),sources:Object.freeze([...sources.values()]),
      ...(messageSources.size?{messageSources:Object.freeze([...messageSources.values()])}:{}),...(replyToAssistant?{replyToAssistant:Object.freeze(replyToAssistant)}:{})});
  }
  async readHistory(t: OperationTarget, a: OriginalWriteAuthority, expected?: readonly HistoryPairIdentity[]): Promise<StoreResult<ConversationHistory>> {
    return this.content(a,async tx => {
      requireTarget(t); await this.authority(tx,t,a);
      const inv = await this.inventory(tx,t,false,() => current(a));
      if (!inv) {
        if (t.targetKind !== "reserved_new" || expected?.length) refuse("conversation_unavailable");
        return {pairs:[],sources:[]};
      }
      return this.history(tx,t,inv,expected,() => current(a),a.dependencies);
    });
  }
  async settleAcknowledgedAssistant(op: OpenOperation, a: OriginalWriteAuthority): Promise<StoreResult<void>> {
    return this.run(async tx => {
      current(a); await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op, false, () => current(a)); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId), effect = await readWhileCurrent(() => current(a), () => tx.get(effectPath(op)));
      const assistant = await this.pair(tx, op, inv, user, () => current(a));
      if (user.data.pendingOperationId !== op.operationId || assistant === undefined || effect === undefined ||
          effect.assistantMessageId !== assistant.messageId || effect.userMessageId !== user.id || effect.kind !== op.kind) refuse("conflict");
      current(a); const { pendingOperationId: _claim, ...settled } = user.data;
      tx.set(userPath(op), settled);
    });
  }
  async readOutcome(principal: AuthPrincipal, t: OperationTarget): Promise<StoreResult<SavedOperationOutcome>> {
    return this.run(async tx => {
      requireTarget(t); await this.owner(tx, principal, t.ownerAccountId);
      const inv = await this.inventory(tx, t); if (inv === undefined) refuse("conversation_unavailable");
      const effect = await tx.get(effectPath(t));
      if (effect === undefined) return { state: "unresolved" };
      if (!exact(effect, ["kind", "userMessageId"], ["assistantMessageId"]) || effect.kind !== t.kind || effect.userMessageId !== t.userMessageId) refuse("unavailable");
      const user = this.requireUser(inv, t.userMessageId);
      const fence = await tx.get(fencePath(t));
      if (fence !== undefined && (!this.fenceMatches(fence, t) || fence.state !== "closed")) return { state: "unresolved" };
      // A normally retired guard leaves a canonical effect and a settled U.
      // Absence alone never proves no effect or authorizes clearing a claim.
      if(fence===undefined&&user.data.pendingOperationId!==undefined)return {state:"unresolved"};
      // Reading old A must NEVER clear B or grant C. A closed barrier cannot settle B.
      if (user.data.pendingOperationId !== undefined && user.data.pendingOperationId !== t.operationId) return { state: "unresolved" };
      const assistant = await this.pair(tx, t, inv, user);
      if (effect.assistantMessageId !== undefined && effect.assistantMessageId !== assistant?.messageId) refuse("unavailable");
      if (user.data.pendingOperationId === t.operationId) {
        const { pendingOperationId: _claim, ...settled } = user.data;
        tx.set(userPath(t), settled);
      }
      return assistant === undefined ? { state: "user_saved", user: this.message(user) }
        : { state: "assistant_saved", user: this.message(user), assistant };
    });
  }

  async retireOperation(t:OperationTarget,epoch:RuntimeEpoch,originalSettled:()=>boolean):Promise<StoreResult<void>>{
    return this.run(async tx=>{
      requireTarget(t);await this.epoch(tx,epoch);if(!tx.delete)refuse("unavailable");
      const fence=await tx.get(fencePath(t));if(!fence)return;
      if(!this.fenceMatches(fence,t))refuse("unavailable");
      const previousEpoch=fence.processEpoch!==epoch.processEpoch;
      if(!previousEpoch&&(fence.state!=="closed"||!originalSettled()))refuse("conflict");
      if(previousEpoch){
        const parent=await tx.get(parentPath(t));
        if(parent?.state==="deleting"){
          // A persisted valid deleting marker is irreversible. Its child batches
          // may already be partial, so it cannot satisfy a live/canonical-pair
          // read. The confirmed replacement epoch fences every old write. Retire
          // ONLY this control; startup whole cleanup owns remaining children.
          // Do not infer any saved/no-effect outcome or clear another claim.
          if(!exact(parent,["state","lifecycleVersion","nextSequence","latestMessageId"])||
            !positive(parent.lifecycleVersion)||!positive(parent.nextSequence)||
            typeof parent.latestMessageId!=="string"||!UUID.test(parent.latestMessageId))refuse("unavailable");
          tx.delete(fencePath(t));return;
        }
      }
      // The expired exception is exclusive to previous-epoch control retirement:
      // complete metadata, lineage, effects and canonical pairs still validate.
      // It never grants a read/write, changes createTime/appendBefore or revives
      // a target. All ordinary callers retain the live-only default.
      const inv=await this.inventory(tx,t,previousEpoch),effect=await tx.get(effectPath(t));
      if(effect!==undefined&&(!exact(effect,["kind","userMessageId"],["assistantMessageId"])||effect.kind!==t.kind||effect.userMessageId!==t.userMessageId))refuse("unavailable");
      const user=inv?.rows.find(row=>row.id===t.userMessageId);
      if(user&&user.data.role!=="user")refuse("unavailable");
      if(effect!==undefined&&(!user||user.data.role!=="user"))refuse("unavailable");
      const assistant=user&&inv?await this.pair(tx,t,inv,user):undefined;
      if(effect?.assistantMessageId!==undefined&&effect.assistantMessageId!==assistant?.messageId)refuse("unavailable");
      if(user?.data.pendingOperationId===t.operationId&&effect===undefined)refuse("unavailable");
      if(!previousEpoch&&!originalSettled())refuse("conflict");
      // Do not clear B while retiring A. A current original needs synchronous
      // settlement proof; a previous original cannot pass the confirmed epoch.
      if(user?.data.pendingOperationId===t.operationId){const {pendingOperationId:_claim,...settled}=user.data;tx.set(userPath(t),settled);}
      tx.delete(fencePath(t));
    });
  }

  async readAcknowledgedPair(op: OpenOperation, a: OriginalWriteAuthority): Promise<StoreResult<{
    readonly user: StoredConversationMessage; readonly assistant: StoredConversationMessage;
    readonly presentation: PresentationMetadata;
  }>> {
    return this.content(a, async tx => {
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op, false, () => current(a)); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId), effect = await readWhileCurrent(() => current(a), () => tx.get(effectPath(op)));
      if (user.data.pendingOperationId !== undefined) refuse("conflict");
      const assistant = await this.pair(tx, op, inv, user, () => current(a));
      if (assistant === undefined || assistant.availability !== "available" || effect === undefined ||
          !exact(effect, ["kind", "userMessageId", "assistantMessageId"]) || effect.kind !== op.kind ||
          effect.userMessageId !== user.id || effect.assistantMessageId !== assistant.messageId) refuse("unavailable");
      const stored=inv.rows.find(row=>row.id===assistant.messageId)!;
      const presentation:PresentationMetadata=stored.data.presentationMode==="persona"
        ?{presentationMode:"persona",presentationProjectionVersion:"persona_presentation_v1"}:{presentationMode:"default"};
      current(a); return { user: this.message(user), assistant, presentation };
    });
  }

  async readPendingUser(op: OpenOperation, a: OriginalWriteAuthority): Promise<StoreResult<StoredUserIdentity>> {
    return this.content(a, async tx => {
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId), effect = await tx.get(effectPath(op));
      if (user.data.pendingOperationId !== op.operationId || effect === undefined ||
          !exact(effect, ["kind", "userMessageId"], ["assistantMessageId"]) || effect.kind !== op.kind || effect.userMessageId !== user.id) refuse("conflict");
      current(a); return { messageId: user.id, sequence: user.data.sequence as number, persistedAt: user.createTime };
    });
  }

  private readCurrent(current:()=>boolean):void{if(!current())refuse("terminated");}
  private location(owner:string,id:string):Location{if(!UUID.test(owner)||!UUID.test(id))refuse("unavailable");return {ownerAccountId:owner,conversationId:id};}
  async verifyOwnedTarget(principal:AuthPrincipal,owner:string,id:string,userId:string|undefined,current:()=>boolean):Promise<StoreResult<void>>{
    return this.run(async tx=>{this.readCurrent(current);const location=this.location(owner,id);await this.owner(tx,principal,owner);
      const inv=await this.inventory(tx,location);if(!inv)refuse("conversation_unavailable");
      if(userId!==undefined)this.requireUser(inv,userId);this.readCurrent(current);
    });
  }
  async readRetryUser(principal:AuthPrincipal,owner:string,id:string,userId:string,borrow:()=>string|undefined,current:()=>boolean):Promise<StoreResult<StoredConversationMessage>>{
    return this.run(async tx=>{this.readCurrent(current);const location=this.location(owner,id),account=await this.owner(tx,principal,owner);
      if(account.optionalProcessingConsent!=="accepted")refuse("denied");
      const inv=await this.inventory(tx,location);if(!inv)refuse("conversation_unavailable");
      const user=this.requireUser(inv,userId);this.readCurrent(current);
      if(user.data.pendingOperationId!==undefined||user.data.acceptedAssistantMessageId!==undefined||borrow()!==user.data.text)refuse("conflict");
      return this.message(user);
    });
  }
  async listOwnedConversations(principal:AuthPrincipal,owner:string,after:string|undefined,current:()=>boolean):Promise<StoreResult<ConversationSummaryPage>> {
    return this.run(async tx => {
      const check = () => this.readCurrent(current); check();
      if (!UUID.test(owner) || (after !== undefined && !UUID.test(after)) || !tx.listPage) refuse("unavailable");
      const account = await this.owner(tx,principal,owner,check);
      if (account.optionalProcessingConsent !== "accepted") refuse("denied");
      const scanned = await readWhileCurrent(check, () => tx.listPage!(`accounts/${owner}/conversations`,after,20));
      if (scanned.length > 20 || scanned.some((row,i) => !UUID.test(row.id) ||
          (after !== undefined && row.id <= after) || (i > 0 && row.id <= scanned[i - 1]!.id))) refuse("unavailable");
      const conversations: ConversationSummary[] = [];
      for (const row of scanned) {
        const location = this.location(owner,row.id);
        let inv: Inventory | undefined;
        try { inv = await this.inventory(tx,location,false,check); }
        catch (error) {
          // Expired/deleting conversations are unavailable, not revived. Unknown
          // or malformed inventory must fail the whole page, never look absent.
          if (error instanceof Refusal && error.kind === "conversation_unavailable") continue;
          throw error;
        }
        if (!inv) refuse("unavailable");
        const latest = inv.rows.find(message => message.id === inv.parent.latestMessageId);
        if (!latest) refuse("unavailable");
        const created = this.message(latest).persistedAt;
        const lastMessageAt = new Date(created.seconds * 1000 + Math.floor(created.nanoseconds / 1_000_000)).toISOString();
        conversations.push({ conversationId:row.id,lastMessageAt });
      }
      check();
      return { conversations,...(scanned.length === 20 ? { nextCursor:scanned.at(-1)!.id } : {}) };
    });
  }
  async listOwnedMessages(principal:AuthPrincipal,owner:string,id:string,before:number|undefined,current:()=>boolean):Promise<StoreResult<{
    readonly messages:readonly StoredConversationMessage[];readonly nextBefore?:number;
  }>>{
    return this.run(async tx=>{const check=()=>this.readCurrent(current);check();const location=this.location(owner,id);await this.owner(tx,principal,owner,check);
      const inv=await this.inventory(tx,location,false,check);if(!inv)refuse("conversation_unavailable");if(!tx.listMessagePage)refuse("unavailable");
      const page=await readWhileCurrent(check,()=>tx.listMessagePage!(`${parentPath(location)}/messages`,before)),messages:StoredConversationMessage[]=[];
      for(const row of [...page].reverse()){
        if(!inv.rows.some(m=>m.id===row.id&&m.data.sequence===row.data.sequence))refuse("unavailable");
        if(row.data.role==="user")messages.push(this.message(row));else if(row.data.origin === "proactive"){
          const source = await readWhileCurrent(check,()=>tx.get(`${parentPath(location)}/message_sources/${row.id}`));
          messages.push(await this.sourcedV2(tx,location,row,source,check));
        }else{
          const user=this.requireUser(inv,row.data.replyToUserMessageId as string),a=await this.pair(tx,location,inv,user,check);
          if(!a||a.messageId!==row.id)refuse("unavailable");messages.push(a);
        }
      }
      this.readCurrent(current);const first=messages[0]?.sequence;
      return {messages,...(first!==undefined&&inv.rows.some(r=>(r.data.sequence as number)<first)?{nextBefore:first}:{})};
    });
  }
  async readOwnedOutcome(principal:AuthPrincipal,owner:string,id:string,operationId:string,original:Omit<OperationTarget,"ownerAccountId">|undefined,
    current:()=>boolean):Promise<StoreResult<ConversationReadback>>{
    return this.run(async tx=>{
      const check=()=>this.readCurrent(current);check();const location=this.location(owner,id);if(!UUID.test(operationId))refuse("unavailable");await this.owner(tx,principal,owner,check);
      const inv=await this.inventory(tx,location,false,check),
        effect=await readWhileCurrent(check,()=>tx.get(`${parentPath(location)}/effects/${operationId}`)),
        fence=await readWhileCurrent(check,()=>tx.get(`ai_operation_fences/${operationId}`));
      this.readCurrent(current);
      if(!inv){
        if(original&&original.operationId===operationId&&original.conversationId===id&&original.targetKind==="reserved_new"&&effect===undefined&&
          fence&&this.fenceMatches(fence,{...original,ownerAccountId:owner})&&fence.state==="closed")return {operationId,state:"no_effect"};
        refuse("conversation_unavailable");
      }
      if(!effect)return {operationId,state:"unresolved"};
      if(!exact(effect,["kind","userMessageId"],["assistantMessageId"])||!["send","retry"].includes(String(effect.kind))||typeof effect.userMessageId!=="string"||!UUID.test(effect.userMessageId))refuse("unavailable");
      const target:OperationTarget={...location,operationId,userMessageId:effect.userMessageId,kind:effect.kind as "send"|"retry",
        targetKind:fence?.targetKind==="reserved_new"?"reserved_new":"existing"};
      const user=this.requireUser(inv,target.userMessageId);
      if(fence&&(!this.fenceMatches(fence,target)||fence.state!=="closed"))return {operationId,state:"unresolved"};
      if(user.data.pendingOperationId!==undefined&&(user.data.pendingOperationId!==operationId||!fence))return {operationId,state:"unresolved"};
      const a=await this.pair(tx,target,inv,user,check);
      if(effect.assistantMessageId!==undefined&&effect.assistantMessageId!==a?.messageId)refuse("unavailable");
      this.readCurrent(current);
      if(user.data.pendingOperationId===operationId){const {pendingOperationId:_claim,...settled}=user.data;tx.set(userPath(target),settled);}
      return a?{operationId,state:"assistant_saved",userMessage:this.message(user),assistantMessage:a}:{operationId,state:"user_saved",userMessage:this.message(user)};
    });
  }
}
