import type { RuntimeFailure } from "../../src/ai-runtime/application/bounded-ai-runtime.js";
import type { OutputCandidate } from "../../src/ai-runtime/domain/parse-output.js";
import type { GenerationTransport, RequestBudget } from "../../src/ai-runtime/ports/generation-transport.js";
import type {
  AcceptedAssistant, CapturedContext, CheckInProjection, ConversationDeliverySink,
  ConversationGates, ConversationInput, ConversationMessageStore, ConversationRef,
  ConversationSources, EffectReadback, EffectRef, PersonaProjection, PresentationMetadata,
  SavedUserRef, SourceProvenance, StartView, TrustedCaller, WriteAcknowledgment,
} from "../../src/ai-conversation/ports/conversation-lifecycle.js";
import { err, ok, type Result } from "../../src/shared/domain/result.js";
import { FakeClock, flush, raw, valid } from "../ai-runtime/support.js";

export { FakeClock, flush, raw, valid };
export const DAY = 24 * 60 * 60 * 1000;
export const RETENTION_MS = 90 * DAY;

/** A barrier retains resolvers only, never a protected effect or input. */
export class Barrier {
  private held = false;
  private readonly waiting = new Set<(released: boolean) => void>();
  get pending(): number { return this.waiting.size; }
  hold(): void { this.held = true; }
  release(): void {
    this.held = false;
    for (const finish of [...this.waiting]) finish(true);
  }
  wait(signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false);
    if (!this.held) return Promise.resolve(true);
    return new Promise((resolve) => {
      const finish = (released: boolean): void => {
        this.waiting.delete(finish);
        signal.removeEventListener("abort", abort);
        resolve(released);
      };
      const abort = (): void => finish(false);
      this.waiting.add(finish);
      signal.addEventListener("abort", abort, { once: true });
    });
  }
}

/** before -> one synchronous effect -> after/ack. Abort clears the effect. */
export class EffectControl {
  readonly before = new Barrier();
  readonly after = new Barrier();
  calls = 0;
  effectEvents = 0;
  private readonly pending = new Set<{ effect: (() => unknown) | undefined }>();
  get pendingReferences(): number {
    return [...this.pending].filter((item) => item.effect !== undefined).length;
  }
  async run<T>(effect: (() => T) | undefined, budget: RequestBudget, aborted: () => T): Promise<T> {
    this.calls++;
    const item = { effect: effect as (() => unknown) | undefined };
    effect = undefined;
    this.pending.add(item);
    const clear = (): void => { item.effect = undefined; };
    budget.signal.addEventListener("abort", clear, { once: true });
    try {
      if (!await this.before.wait(budget.signal) || !item.effect || budget.remainingMs() <= 0) return aborted();
      let invoke: (() => unknown) | undefined = item.effect;
      item.effect = undefined;
      this.effectEvents++;
      const value = invoke() as T;
      invoke = undefined;
      if (!await this.after.wait(budget.signal)) return aborted();
      return value;
    } finally {
      clear();
      this.pending.delete(item);
      budget.signal.removeEventListener("abort", clear);
    }
  }
}

export class WriteControl extends EffectControl {
  acknowledgment: WriteAcknowledgment = "confirmed";
  skipEffect = false;
  /** Return unknown while a before-effect barrier still holds the old work. */
  unknownBeforeEffect = false;
}

interface PersonaRecord { owner: string; projection: PersonaProjection; deleted: boolean }
interface CheckInRecord { owner: string; source: SourceProvenance; projection: CheckInProjection; permitted: boolean; deleted: boolean }
interface Watch {
  caller: TrustedCaller;
  conversation: ConversationRef;
  context: CapturedContext;
  invalidate: () => void;
}

export class FakeSources implements ConversationSources {
  dependencyAvailable = true;
  captureFails = false;
  readonly personas = new Map<object, PersonaRecord>();
  readonly active = new Map<string, object>();
  readonly checkIns = new Map<string, CheckInRecord>();
  private readonly sessions = new Map<string, object>();
  private readonly permissions = new Map<string, boolean>();
  private readonly conversations = new Map<ConversationRef, string>();
  private readonly watchers = new Set<Watch>();
  private utcOffset = Date.parse("2026-10-12T00:00:00.000Z");
  conversationLive: (caller: TrustedCaller, ref: ConversationRef, utc: string) => boolean = () => true;
  onSourceInvalidated: (sourceId: string) => void = () => {};
  onConversationDeleted: (conversation: ConversationRef) => void = () => {};
  onUtcChanged: () => void = () => {};
  constructor(readonly clock: FakeClock = new FakeClock()) {}
  get watcherCount(): number { return this.watchers.size; }
  get utc(): string { return this.utcNow(); }
  set utc(value: string) { this.setUtc(value); }
  utcNow(): string { return new Date(this.utcOffset + this.clock.now()).toISOString(); }
  setUtc(value: string): void {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new Error("Invalid synthetic UTC");
    this.utcOffset = parsed - this.clock.now();
    this.onUtcChanged();
    this.notify();
  }
  advanceUtc(milliseconds: number): void { this.setUtc(new Date(Date.parse(this.utcNow()) + milliseconds).toISOString()); }
  caller(owner = "synthetic-owner"): TrustedCaller {
    const caller = { owner, session: {} };
    this.sessions.set(owner, caller.session);
    this.permissions.set(owner, true);
    this.notify();
    return caller;
  }
  sessionCurrent(caller: TrustedCaller): boolean {
    return this.sessions.get(caller.owner) === caller.session && this.permissions.get(caller.owner) === true;
  }
  revoke(caller: TrustedCaller): void { this.permissions.set(caller.owner, false); this.notify(); }
  allow(caller: TrustedCaller): void { this.permissions.set(caller.owner, true); this.notify(); }
  registerConversation(caller: TrustedCaller, conversation: ConversationRef): void { this.conversations.set(conversation, caller.owner); }
  deleteConversation(conversation: ConversationRef): void {
    this.conversations.delete(conversation);
    this.onConversationDeleted(conversation);
    this.notify();
  }
  available(): boolean { return this.dependencyAvailable; }
  authorized(caller: TrustedCaller, conversation: ConversationRef): boolean {
    return this.sessionCurrent(caller) && this.conversations.get(conversation) === caller.owner
      && this.conversationLive(caller, conversation, this.utcNow());
  }
  addPersona(caller: TrustedCaller, projection: Partial<PersonaProjection> = {}): object {
    const ref = {};
    this.personas.set(ref, { owner: caller.owner, deleted: false, projection: {
      schemaVersion: "persona_presentation_v1", tone: "neutral", responseLength: "balanced", formatStyle: "plain", ...projection,
    } });
    return ref;
  }
  activate(caller: TrustedCaller, ref: object | undefined): void {
    if (ref === undefined) this.active.delete(caller.owner);
    else {
      const persona = this.personas.get(ref);
      if (!persona || persona.deleted || persona.owner !== caller.owner) throw new Error("Invalid synthetic Persona");
      this.active.set(caller.owner, ref);
    }
    // Existing request snapshots survive an edit or Active switch.
  }
  editPersona(ref: object, update: Partial<PersonaProjection>): void {
    const persona = this.personas.get(ref);
    if (!persona || persona.deleted) throw new Error("Missing synthetic Persona");
    persona.projection = { ...persona.projection, ...update };
  }
  deletePersona(ref: object): void {
    this.personas.delete(ref);
    for (const [owner, active] of this.active) if (active === ref) this.active.delete(owner);
    this.notify();
  }
  addCheckIn(caller: TrustedCaller, id: string, projection: Partial<CheckInProjection> = {}): void {
    this.checkIns.set(id, {
      owner: caller.owner, source: { sourceType: "check_in", sourceId: id }, permitted: true, deleted: false,
      projection: { occurredAt: this.utcNow(), noteText: "Synthetic note.", moodLabel: "calm", activityLabel: "walking", weatherConditionLabel: "clear", ...projection },
    });
  }
  invalidateSource(id: string): void {
    const record = this.checkIns.get(id);
    if (record) record.permitted = false;
    this.onSourceInvalidated(id);
    this.notify();
  }
  deleteSource(id: string): void {
    this.checkIns.delete(id);
    this.onSourceInvalidated(id);
    this.notify();
  }
  capture(caller: TrustedCaller, conversation: ConversationRef, asOf: string): StartView {
    if (this.captureFails || !this.authorized(caller, conversation)) throw new Error("Unavailable synthetic source");
    const ref = this.active.get(caller.owner);
    const persona = ref === undefined ? undefined : this.personas.get(ref);
    if (ref !== undefined && (!persona || persona.deleted || persona.owner !== caller.owner)) throw new Error("Unavailable synthetic Persona");
    const end = Date.parse(asOf);
    if (!Number.isFinite(end)) throw new Error("Invalid synthetic asOf");
    const checkIns = [...this.checkIns.values()]
      .filter((item) => item.owner === caller.owner && item.permitted && !item.deleted
        && Date.parse(item.projection.occurredAt) >= end - 7 * DAY && Date.parse(item.projection.occurredAt) <= end)
      .sort((a, b) => Date.parse(b.projection.occurredAt) - Date.parse(a.projection.occurredAt)
        || (a.source.sourceId < b.source.sourceId ? -1 : a.source.sourceId > b.source.sourceId ? 1 : 0))
      .slice(0, 5).map((item) => ({ source: { ...item.source }, projection: { ...item.projection } }));
    return { persona: ref !== undefined && persona ? { ref, projection: { ...persona.projection } } : undefined, checkIns };
  }
  current(caller: TrustedCaller, conversation: ConversationRef, context: CapturedContext): boolean {
    if (!this.authorized(caller, conversation)) return false;
    if (context.usedPersona !== undefined) {
      const persona = this.personas.get(context.usedPersona);
      if (!persona || persona.deleted || persona.owner !== caller.owner) return false;
    }
    return context.provenance.every((source) => {
      const record = this.checkIns.get(source.sourceId);
      return record?.owner === caller.owner && record.permitted && !record.deleted && source.sourceType === "check_in";
    });
  }
  watch(caller: TrustedCaller, conversation: ConversationRef, context: CapturedContext, invalidate: () => void): () => void {
    const watch = { caller, conversation, context, invalidate };
    this.watchers.add(watch);
    return () => { this.watchers.delete(watch); };
  }
  notify(): void {
    for (const watch of [...this.watchers]) {
      if (!this.current(watch.caller, watch.conversation, watch.context)) {
        this.watchers.delete(watch);
        watch.invalidate();
      }
    }
  }
}

export interface StoredUser { readonly kind: "user"; readonly ref: SavedUserRef; readonly content: string }
export interface StoredAssistant {
  readonly kind: "assistant";
  readonly target: SavedUserRef;
  content: string | undefined;
  presentation: PresentationMetadata | undefined;
  provenance: SourceProvenance[];
  unavailable: boolean;
}
interface StoredConversation { owner: string; lastPersistedMessageAt: string; messages: (StoredUser | StoredAssistant)[] }
interface Proof extends EffectReadback { owner: string; conversation: ConversationRef; signal: AbortSignal }

export class FakeMessageStore implements ConversationMessageStore {
  readonly userControl = new WriteControl();
  readonly assistantControl = new WriteControl();
  userCommits = 0;
  assistantCommits = 0;
  readbacks = 0;
  private readonly conversations = new Map<ConversationRef, StoredConversation>();
  private readonly proofs = new WeakMap<EffectRef, Proof>();
  constructor(readonly sources: FakeSources) {
    sources.conversationLive = (caller, ref, utc) => this.live(caller, ref, utc);
    sources.onSourceInvalidated = (id) => this.invalidateSource(id);
    sources.onConversationDeleted = (ref) => { this.conversations.delete(ref); };
    sources.onUtcChanged = () => this.cleanupExpired();
  }
  createConversation(caller: TrustedCaller, lastPersistedMessageAt = this.sources.utcNow()): ConversationRef {
    const ref = {};
    this.conversations.set(ref, { owner: caller.owner, lastPersistedMessageAt, messages: [] });
    this.sources.registerConversation(caller, ref);
    return ref;
  }
  live(caller: TrustedCaller, conversation: ConversationRef, utc: string): boolean {
    const row = this.conversations.get(conversation);
    return !!row && row.owner === caller.owner && this.sources.sessionCurrent(caller)
      && Number.isFinite(Date.parse(utc)) && Date.parse(utc) < Date.parse(row.lastPersistedMessageAt) + RETENTION_MS;
  }
  retryEligible(caller: TrustedCaller, conversation: ConversationRef, target: SavedUserRef, explicitInput: string, utc: string): boolean {
    if (!this.live(caller, conversation, utc)) return false;
    const messages = this.conversations.get(conversation)!.messages;
    return messages.some((message) => message.kind === "user" && message.ref === target && message.content === explicitInput)
      && !messages.some((message) => message.kind === "assistant" && message.target === target);
  }
  seedUser(caller: TrustedCaller, conversation: ConversationRef, content: string, utc = this.sources.utcNow()): SavedUserRef {
    if (!this.live(caller, conversation, utc)) throw new Error("Unavailable synthetic Conversation");
    const ref = {};
    const row = this.conversations.get(conversation)!;
    row.messages.push({ kind: "user", ref, content });
    row.lastPersistedMessageAt = utc;
    return ref;
  }
  messages(conversation: ConversationRef): readonly (StoredUser | StoredAssistant)[] {
    this.cleanupExpired();
    return this.conversations.get(conversation)?.messages.map((message) => message.kind === "user" ? { ...message }
      : { ...message, presentation: message.presentation ? { ...message.presentation } : undefined, provenance: message.provenance.map((source) => ({ ...source })) }) ?? [];
  }
  anchor(conversation: ConversationRef): string | undefined { return this.conversations.get(conversation)?.lastPersistedMessageAt; }
  deleteConversation(conversation: ConversationRef): void { this.sources.deleteConversation(conversation); }
  cleanupExpired(): void {
    const now = Date.parse(this.sources.utcNow());
    for (const [ref, row] of this.conversations) if (now >= Date.parse(row.lastPersistedMessageAt) + RETENTION_MS) this.conversations.delete(ref);
  }
  invalidateSource(id: string): void {
    for (const row of this.conversations.values()) for (const message of row.messages) {
      if (message.kind === "assistant" && message.provenance.some((source) => source.sourceId === id)) {
        message.content = undefined;
        message.presentation = undefined;
        message.provenance = [];
        message.unavailable = true;
      }
    }
  }
  user(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef,
    event: (commit: (message: string, utc: string) => SavedUserRef) => void, budget: RequestBudget): Promise<WriteAcknowledgment> {
    this.proofs.set(effect, { owner: caller.owner, conversation, signal: budget.signal, user: undefined, assistant: false });
    const control = this.userControl;
    const run = control.run((): WriteAcknowledgment => {
      if (control.skipEffect || control.acknowledgment === "absent") return control.acknowledgment === "unknown" ? "unknown" : "absent";
      let written = false;
      event((content, utc) => {
        if (written || budget.signal.aborted || budget.remainingMs() <= 0 || !this.live(caller, conversation, utc)) throw new Error("Denied synthetic user effect");
        const ref = this.seedUser(caller, conversation, content, utc);
        this.proofs.set(effect, { owner: caller.owner, conversation, signal: budget.signal, user: ref, assistant: false });
        this.userCommits++;
        written = true;
        return ref;
      });
      return written ? control.acknowledgment : "absent";
    }, budget, () => "unknown" as const);
    if (control.unknownBeforeEffect) { void run.catch(() => {}); return Promise.resolve("unknown"); }
    return run;
  }
  assistant(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef, target: SavedUserRef,
    event: (commit: (message: AcceptedAssistant, utc: string) => void) => void, budget: RequestBudget): Promise<WriteAcknowledgment> {
    const control = this.assistantControl;
    if (!this.proofs.has(effect)) this.proofs.set(effect, { owner: caller.owner, conversation, signal: budget.signal, user: target, assistant: false });
    const run = control.run((): WriteAcknowledgment => {
      if (control.skipEffect || control.acknowledgment === "absent") return control.acknowledgment === "unknown" ? "unknown" : "absent";
      let written = false;
      event((message, utc) => {
        const row = this.conversations.get(conversation);
        if (written || budget.signal.aborted || budget.remainingMs() <= 0 || !this.live(caller, conversation, utc)
          || !row?.messages.some((item) => item.kind === "user" && item.ref === target)
          || row.messages.some((item) => item.kind === "assistant" && item.target === target)) throw new Error("Denied synthetic assistant effect");
        row.messages.push({ kind: "assistant", target, content: message.message, presentation: { ...message.presentation },
          provenance: message.provenance.map((source) => ({ ...source })), unavailable: false });
        row.lastPersistedMessageAt = utc;
        this.proofs.set(effect, { owner: caller.owner, conversation, signal: budget.signal, user: target, assistant: true });
        this.assistantCommits++;
        written = true;
      });
      return written ? control.acknowledgment : "absent";
    }, budget, () => "unknown" as const);
    if (control.unknownBeforeEffect) { void run.catch(() => {}); return Promise.resolve("unknown"); }
    return run;
  }
  async readback(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef): Promise<EffectReadback | undefined> {
    this.readbacks++;
    const proof = this.proofs.get(effect);
    if (!proof || !proof.signal.aborted || proof.owner !== caller.owner || proof.conversation !== conversation
      || !this.live(caller, conversation, this.sources.utcNow())) return undefined;
    return { user: proof.user, assistant: proof.assistant };
  }
}

export class FakeSink implements ConversationDeliverySink {
  readonly control = new EffectControl();
  refuse = false;
  accepted = 0;
  /** Synthetic recipient content, not a retained Application replay cache. */
  readonly received: string[] = [];
  deliver(event: (accept: (message: string) => void) => void, budget: RequestBudget): Promise<"accepted" | "refused"> {
    let accepted = false;
    return this.control.run(() => {
      if (this.refuse) return "refused" as const;
      event((message) => {
        if (accepted || budget.signal.aborted || budget.remainingMs() <= 0) throw new Error("Denied synthetic sink effect");
        this.received.push(message);
        this.accepted++;
        accepted = true;
      });
      return accepted ? "accepted" as const : "refused" as const;
    }, budget, () => accepted ? "accepted" as const : "refused" as const);
  }
}

export class FakeGates implements ConversationGates {
  readonly beforeControl = new EffectControl();
  readonly candidateControl = new EffectControl();
  beforeResult: Result<void, RuntimeFailure> = ok(undefined);
  candidateResult: Result<void, "unsafe_output" | "stale_authority"> = ok(undefined);
  /** Optional synchronous observation only; the fake never saves supplied values. */
  inspectInput: ((input: ConversationInput) => void) | undefined;
  inspectCandidate: ((input: ConversationInput, output: OutputCandidate) => void) | undefined;
  beforeGeneration(input: () => ConversationInput | undefined, budget: RequestBudget): Promise<Result<void, RuntimeFailure>> {
    return this.beforeControl.run(() => {
      const value = input();
      if (!value) return err("stale_authority" as const);
      this.inspectInput?.(value);
      return this.beforeResult;
    }, budget, () => err("stale_authority" as const));
  }
  candidate(input: () => ConversationInput | undefined, output: () => OutputCandidate | undefined,
    budget: RequestBudget): Promise<Result<void, "unsafe_output" | "stale_authority">> {
    return this.candidateControl.run(() => {
      const current = input();
      const candidate = output();
      if (!current || !candidate) return err("stale_authority" as const);
      this.inspectCandidate?.(current, candidate);
      return this.candidateResult;
    }, budget, () => err("stale_authority" as const));
  }
}

export class GenerationCall {
  input: ConversationInput | undefined;
  aborted = false;
  settled = false;
  private resolve: ((raw: Uint8Array) => void) | undefined;
  private reject: ((failure: unknown) => void) | undefined;
  private readonly onAbort = (): void => { this.aborted = true; this.input = undefined; };
  promise: Promise<Uint8Array> | undefined;
  constructor(input: ConversationInput, readonly budget: RequestBudget) {
    this.input = input;
    this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
    budget.signal.addEventListener("abort", this.onAbort, { once: true });
    if (budget.signal.aborted) this.onAbort();
  }
  complete(response: Uint8Array = valid()): void {
    if (this.settled) return;
    const resolve = this.resolve;
    this.dispose();
    resolve?.(response);
  }
  fail(): void {
    if (this.settled) return;
    const reject = this.reject;
    this.dispose();
    reject?.(new Error("Synthetic generation stopped"));
  }
  private dispose(): void {
    this.settled = true;
    this.input = undefined;
    this.promise = undefined;
    this.resolve = undefined;
    this.reject = undefined;
    this.budget.signal.removeEventListener("abort", this.onAbort);
  }
}

export class FakeGenerationTransport implements GenerationTransport<ConversationInput> {
  readonly calls: GenerationCall[] = [];
  generate(input: ConversationInput, budget: RequestBudget): Promise<Uint8Array> {
    const call = new GenerationCall(input, budget);
    this.calls.push(call);
    return call.promise!;
  }
}

/** No Application/runtime is constructed here: tests share one explicit runtime. */
export function createFixture() {
  const clock = new FakeClock();
  const sources = new FakeSources(clock);
  const store = new FakeMessageStore(sources);
  const caller = sources.caller();
  const conversation = store.createConversation(caller);
  return { clock, sources, store, caller, conversation, sink: new FakeSink(), gates: new FakeGates(), transport: new FakeGenerationTransport() };
}
