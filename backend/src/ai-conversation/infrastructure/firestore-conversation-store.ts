import type { FirestoreGateway, FirestoreTransactionGateway as Tx, StoredDocument as RecordData,
  StoredDocumentSnapshot as Snapshot } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { createAuthBindingDocumentId, parseAuthBinding, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import { requireControlledEmulatorEnvironment } from "../../shared/infrastructure/firebase/controlled-emulator-environment.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { resolveRealRetention } from "../domain/real-retention-resolver.js";
import type { FullPrecisionInstant } from "../domain/real-effect-expiry.js";
import type { RealConversationStore, StoreResult, StoreFailure, RuntimeEpoch, OperationTarget,
  OpenOperation, OriginalWriteAuthority, StoredConversationMessage, StoredUserIdentity, SavedOperationOutcome } from "../ports/real-conversation-store.js";
import type { PresentationMetadata } from "../ports/conversation-lifecycle.js";
import { normalizePersonaInput } from "../../personas/domain/persona-values.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RUNTIME = "ai_runtime_fence/current";
const parentPath = (t: OperationTarget): string => `accounts/${t.ownerAccountId}/conversations/${t.conversationId}`;
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
interface Inventory { readonly parent: RecordData; readonly rows: readonly Snapshot[]; readonly cutoff: FullPrecisionInstant }

/**
 * First isolated N02 vertical: actual SDK transactions, no ordinary composition.
 * Sources are deliberately held until DU's real writer/nonreuse guarantees and
 * ZHOU's transactional reader handoff exist. A nonempty dependency is refused,
 * never silently converted to an authorized empty snapshot. Empty sources must
 * come from the caller's already-authorized complete capture (synthetic here).
 */
export class FirestoreConversationStore implements RealConversationStore {
  private lastNow = Number.NEGATIVE_INFINITY;
  constructor(private readonly gateway: FirestoreGateway, environment: Readonly<Record<string, string | undefined>>,
    private readonly utcMilliseconds: () => number = Date.now) {
    requireControlledEmulatorEnvironment(environment);
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
    return this.run(async tx => { current(a); const value = await work(tx); current(a); return value; });
  }
  private async owner(tx: Tx, principal: AuthPrincipal, expected: string): Promise<RecordData> {
    const bindingId = createAuthBindingDocumentId(principal.firebaseUid);
    if (bindingId === undefined) refuse("denied");
    const binding = await tx.get(`auth_bindings/${bindingId}`);
    if (binding === undefined) refuse("denied");
    const owner = parseAuthBinding(binding);
    if (owner === undefined) refuse("unavailable");
    if (owner !== expected) refuse("denied");
    const account = await tx.get(`accounts/${owner}`);
    if (account === undefined || parseAccountProjection(account) === undefined) refuse("unavailable");
    return account;
  }
  private async authority(tx: Tx, target: OperationTarget, a: OriginalWriteAuthority): Promise<void> {
    const account = await this.owner(tx, a.principal, target.ownerAccountId);
    const deps = a.dependencies;
    if (deps.ownerId !== target.ownerAccountId || deps.purpose !== "checkin_conversation") refuse("denied");
    if (account.optionalProcessingConsent !== "accepted") refuse("denied");
    if (!nonnegative(account.purposeRevocationGeneration) || !nonnegative(deps.purposeRevocationGeneration)) refuse("unavailable");
    if (account.purposeRevocationGeneration > deps.purposeRevocationGeneration) refuse("denied");
    if (account.purposeRevocationGeneration !== deps.purposeRevocationGeneration) refuse("unavailable");
    // No invented producer authority. Account-only empty-source vertical works independently.
    if (deps.sources.length !== 0) refuse("unavailable");
    if (deps.usedPersonaId !== undefined) {
      if (!/^[0-9a-f]{64}$/.test(deps.usedPersonaId)) refuse("unavailable");
      const persona = await tx.get(`accounts/${target.ownerAccountId}/personas/${deps.usedPersonaId}`);
      if (persona === undefined) refuse("denied");
      const state = await tx.get(`accounts/${target.ownerAccountId}/persona_state/current`);
      const fields = normalizePersonaInput({ displayName: persona.displayName, tone: persona.tone,
        responseLength: persona.responseLength, formatStyle: persona.formatStyle });
      if (!positive(persona.revision) || fields === undefined || fields.displayName !== persona.displayName ||
          state === undefined || !Array.isArray(state.livePersonaIds) || !state.livePersonaIds.includes(deps.usedPersonaId) ||
          !nonnegative(state.stateRevision)) refuse("unavailable");
      // Edit/switch are NOT revocations; only the originally used record must remain live.
    }
    current(a);
  }
  private async epoch(tx: Tx, expected: RuntimeEpoch): Promise<RecordData> {
    const row = await tx.get(RUNTIME);
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
    await this.epoch(tx, op.epoch);
    const row = await tx.get(fencePath(op));
    if (row === undefined || !this.fenceMatches(row, op)) refuse("unavailable");
    if (row.processEpoch !== op.epoch.processEpoch || row.state !== "open" || row.revision !== op.revision) refuse("terminated");
    await this.authority(tx, op, a);
  }
  private async inventory(tx: Tx, target: OperationTarget): Promise<Inventory | undefined> {
    const parent = await tx.get(parentPath(target));
    if (parent === undefined) {
      // A missing parent cannot hide retained children and become a fresh target.
      for (const collection of ["messages", "message_sources", "effects"]) {
        if ((await tx.list(`${parentPath(target)}/${collection}`)).length !== 0) refuse("unavailable");
      }
      return undefined;
    }
    if (!exact(parent, ["state", "lifecycleVersion", "nextSequence", "latestMessageId"]) ||
        tx.listSnapshots === undefined) refuse("unavailable");
    const rows = await tx.listSnapshots(`${parentPath(target)}/messages`);
    for (const row of rows) this.message(row); // Validate records before any effect/read projection.
    const resolution = resolveRealRetention({ ownerAccountId: target.ownerAccountId, conversationId: target.conversationId,
      inventory: { parent: { ...parent, ownerAccountId: target.ownerAccountId, conversationId: target.conversationId },
        messages: rows.map(row => ({ ownerAccountId: target.ownerAccountId, conversationId: target.conversationId,
          messageId: row.id, role: row.data.role, sequence: row.data.sequence, createTime: row.createTime,
          ...(row.data.appendBefore === undefined ? {} : { appendBefore: row.data.appendBefore }) })) },
      now: { precision: "millisecond", instant: this.now() } });
    if (resolution.state === "unavailable") refuse("unavailable");
    if (resolution.state !== "live") refuse("conversation_unavailable");
    return { parent, rows, cutoff: resolution.expiresAt };
  }
  private message(row: Snapshot): StoredConversationMessage {
    const d = row.data;
    if (!UUID.test(row.id) || !positive(d.sequence)) refuse("unavailable");
    if (d.role === "user") {
      if (!exact(d, ["role", "sequence", "text"], ["appendBefore", "pendingOperationId", "acceptedAssistantMessageId"]) ||
          typeof d.text !== "string" || !validText(d.text) ||
          [d.pendingOperationId, d.acceptedAssistantMessageId].some(v => v !== undefined && (typeof v !== "string" || !UUID.test(v)))) refuse("unavailable");
      return { messageId: row.id, sequence: d.sequence, role: "user", persistedAt: row.createTime, availability: "available", text: d.text };
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
  async startEpoch(processEpoch: string): Promise<StoreResult<RuntimeEpoch>> {
    return this.run(async tx => {
      if (!UUID.test(processEpoch)) refuse("unavailable");
      const previous = await tx.get(RUNTIME);
      if (previous !== undefined && (!exact(previous, ["processEpoch", "generation", "cleanupGeneration"]) ||
          typeof previous.processEpoch !== "string" || !UUID.test(previous.processEpoch) || !positive(previous.generation) ||
          !nonnegative(previous.cleanupGeneration) || previous.generation >= Number.MAX_SAFE_INTEGER ||
          previous.processEpoch === processEpoch)) refuse("unavailable");
      const generation = previous === undefined ? 1 : (previous.generation as number) + 1;
      tx.set(RUNTIME, { processEpoch, generation, cleanupGeneration: previous?.cleanupGeneration ?? 0 });
      return { processEpoch, generation };
    });
  }
  async initializeOperation(t: OperationTarget, epoch: RuntimeEpoch, a: OriginalWriteAuthority): Promise<StoreResult<OpenOperation>> {
    return this.content(a, async tx => {
      requireTarget(t); await this.epoch(tx, epoch); await this.authority(tx, t, a);
      const previous = await tx.get(fencePath(t)), oldEffect = await tx.get(effectPath(t));
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
      const existingUser = await tx.get(userPath(op)), existingEffect = await tx.get(effectPath(op));
      if (existingUser !== undefined || existingEffect !== undefined) refuse("conflict");
      if (inv === undefined && op.targetKind !== "reserved_new") refuse("conversation_unavailable");
      if (inv !== undefined && op.targetKind === "reserved_new") refuse("conflict");
      const sequence = inv === undefined ? 1 : this.nextSequence(inv);
      current(a);
      const text = borrowText(); if (text === undefined) refuse("terminated");
      if (!validText(text)) refuse("conflict");
      tx.create(userPath(op), { role: "user", sequence, text, pendingOperationId: op.operationId,
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
      tx.create(provenance, { sources: [] }); // authority() has refused every nonempty dependency.
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
  private async pair(tx: Tx, t: OperationTarget, inv: Inventory, user: Snapshot): Promise<StoredConversationMessage | undefined> {
    const id = user.data.acceptedAssistantMessageId;
    if (id === undefined) return undefined;
    const assistant = inv.rows.find(r => r.id === id);
    if (assistant === undefined || assistant.data.role !== "assistant" || assistant.data.replyToUserMessageId !== user.id) refuse("unavailable");
    const sources = await tx.get(`${parentPath(t)}/message_sources/${id as string}`);
    if (assistant.data.availability === "available" &&
        (sources === undefined || !exact(sources, ["sources"]) || !Array.isArray(sources.sources) || sources.sources.length !== 0)) refuse("unavailable");
    if (assistant.data.availability === "unavailable" && sources !== undefined) refuse("unavailable");
    return this.message(assistant);
  }
  async settleAcknowledgedAssistant(op: OpenOperation, a: OriginalWriteAuthority): Promise<StoreResult<void>> {
    return this.run(async tx => {
      current(a); await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId), effect = await tx.get(effectPath(op));
      const assistant = await this.pair(tx, op, inv, user);
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
      if (fence === undefined || !this.fenceMatches(fence, t) || fence.state !== "closed") return { state: "unresolved" };
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

  async readAcknowledgedPair(op: OpenOperation, a: OriginalWriteAuthority): Promise<StoreResult<{
    readonly user: StoredConversationMessage; readonly assistant: StoredConversationMessage;
  }>> {
    return this.content(a, async tx => {
      await this.writable(tx, op, a);
      const inv = await this.inventory(tx, op); if (inv === undefined) refuse("conversation_unavailable");
      const user = this.requireUser(inv, op.userMessageId), effect = await tx.get(effectPath(op));
      if (user.data.pendingOperationId !== undefined) refuse("conflict");
      const assistant = await this.pair(tx, op, inv, user);
      if (assistant === undefined || assistant.availability !== "available" || effect === undefined ||
          !exact(effect, ["kind", "userMessageId", "assistantMessageId"]) || effect.kind !== op.kind ||
          effect.userMessageId !== user.id || effect.assistantMessageId !== assistant.messageId) refuse("unavailable");
      current(a); return { user: this.message(user), assistant };
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
}
