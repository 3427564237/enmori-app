import type { FirstFlowClaim, FirstFlowDispatch, FirstFlowIntent, FirstFlowIntentCommand, FirstFlowModel,
  FirstFlowModelInput, FirstFlowPublish, FirstFlowReadState, FirstFlowRegistration, FirstFlowRegistrationCommand,
  FirstFlowReservation, FirstFlowResult, FirstFlowSender, FirstFlowSettings, FirstFlowSettingsInput,
  FirstFlowSource, FirstFlowStore, ProactiveActor } from "../../src/proactive/ports/first-flow.js";
import { FirstFlowApplication } from "../../src/proactive/application/first-flow-application.js";

export const ids = { intent: "00000000-0000-4000-8000-000000000001", topic: "00000000-0000-4000-8000-000000000002",
  source: "00000000-0000-4000-8000-000000000003", installation: "00000000-0000-4000-8000-000000000004",
  message: "00000000-0000-4000-8000-000000000005", second: "00000000-0000-4000-8000-000000000006" };
export class FakeClock { now = Date.parse("2026-10-25T04:00:00.000Z"); advance(ms: number) { this.now += ms; } }
export const ok = <T>(value: T): FirstFlowResult<T> => ({ kind: "ok", value });
export function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
export const rawReply = (message = "How did your preparation go?") => new TextEncoder().encode(JSON.stringify({ schemaVersion: "ai_assistant_message_v1", message }));

/** Handwritten application fake, NOT evidence of Firestore atomicity. The real
 * store/bridge have independent Context-owned contract and transaction tests. */
export class FakeFirstFlowStore implements FirstFlowStore {
  settingsValue: FirstFlowSettings = { revision: 0, grantGeneration: 0, mode: "off", categories: [], timeZone: "",
    quiet: { kind: "window", startMinute: 1320, endMinute: 480 }, maximumInRolling24h: 1, cooldownMinutes: 480, pushEnabled: false, preview: "generic" };
  readonly rows = new Map<string, FirstFlowIntent>();
  registrationValue: FirstFlowRegistration = { revision: 0, enabled: false, availability: "unregistered" };
  private routingValue = "";
  readValue: FirstFlowReadState = { revision: 0, readThroughSequence: 0 };
  sourceAlive = true;
  unknownCreate = false;
  unknownReserve = false;
  unknownPublish = false;
  reserveFailure: "quiet" | "frequency" | undefined;
  beforeReserve: (() => Promise<void>) | undefined;
  beforePublish: (() => Promise<void>) | undefined;
  readonly publications: (FirstFlowPublish & { role: "assistant"; origin: "proactive"; sequence: number })[] = [];
  readonly anchor = Date.parse("2026-10-20T04:00:00.000Z");
  sourceValue: FirstFlowSource;
  private lastPublished: number | undefined;
  constructor(readonly clock: FakeClock) {
    this.sourceValue = { conversationId: ids.topic, sourceMessageId: ids.source, sourceSequence: 1,
      sourceVersion: "immutable-message-identity", sourcePersistedAt: { seconds: Math.floor(clock.now / 1000), nanoseconds: 1 },
      topicLifecycleVersion: 1, topicCutoff: { seconds: Math.floor((clock.now + 90 * 86400000) / 1000), nanoseconds: 0 },
      occurredAt: "2026-10-24T04:00:00.000Z", text: "Synthetic: ask how my preparation went.", purposeRevocationGeneration: 0 };
  }
  private permitted(a: ProactiveActor): boolean { return a.current() && a.principal.firebaseUid === "owner"; }
  private changed(row: FirstFlowIntent, patch: Partial<Omit<FirstFlowIntent,"processing"|"provider"|"disclosureVersion">>): FirstFlowIntent {
    const next = { ...row, ...patch, revision: row.revision + 1 }; this.rows.set(row.intentId, next); return next;
  }
  async source(a: ProactiveActor, topic: string, message: string) {
    return this.permitted(a) && this.sourceAlive && topic === ids.topic && message === ids.source ? ok(this.sourceValue) : { kind: "not_found" as const };
  }
  async settings(a: ProactiveActor) { return this.permitted(a) ? ok(this.settingsValue) : { kind: "denied" as const }; }
  async replaceSettings(a: ProactiveActor, revision: number, input: FirstFlowSettingsInput) {
    if (!this.permitted(a)) return { kind: "denied" as const };
    if (revision !== this.settingsValue.revision) return { kind: "revision_conflict" as const };
    this.settingsValue = { ...input, revision: revision + 1, grantGeneration: this.settingsValue.grantGeneration + 1 };
    if (input.mode !== "on" || input.categories.length === 0)
      for (const row of this.rows.values()) if (["queued", "reserved", "prepared"].includes(row.state)) this.changed(row, { state: "cancelled" });
    return ok(this.settingsValue);
  }
  async createIntent(a: ProactiveActor, input: FirstFlowIntentCommand): Promise<FirstFlowResult<FirstFlowIntent>> {
    if (!this.permitted(a)) return { kind: "denied" };
    const existing = this.rows.get(input.intentId); if (existing) return existing.dueAt === input.dueAt ? ok(existing) : { kind: "conflict" };
    if (!this.sourceAlive) return { kind: "not_found" };
    if (input.expectedSettingsRevision !== this.settingsValue.revision) return { kind: "revision_conflict" };
    if (this.rows.size >= 3) return { kind: "conflict" };
    const row: FirstFlowIntent = { ...input, revision: 1, state: "queued", expiresAt: new Date(Date.parse(input.dueAt) + 7200000).toISOString(),
      settingsRevision: this.settingsValue.revision, grantGeneration: this.settingsValue.grantGeneration,
      authorizationScope: "intent-purpose-epoch", topicLifecycleVersion: 1,
      requiredSources: [{ kind: "conversation_message", id: input.sourceMessageId, version: this.sourceValue.sourceVersion }],
      requiredCategories: ["conversation_history"], createdAt: new Date(this.clock.now).toISOString(), dispatchState: "not_started" };
    this.rows.set(row.intentId, row); return this.unknownCreate ? { kind: "unknown" } : ok(row);
  }
  async intent(a: ProactiveActor, id: string) { return this.permitted(a) && this.rows.has(id) ? ok(this.rows.get(id)!) : { kind: "not_found" as const }; }
  async activeIntents(a: ProactiveActor) {
    return this.permitted(a) ? ok([...this.rows.values()].filter(row => ["queued", "reserved", "prepared", "published"].includes(row.state))) : { kind: "denied" as const };
  }
  async cancelIntent(a: ProactiveActor, id: string, revision: number) {
    const row = this.rows.get(id);
    if (!this.permitted(a) || !row) return { kind: "not_found" as const };
    if (row.revision !== revision) return { kind: "revision_conflict" as const };
    return ok(this.changed(row, { state: "cancelled" }));
  }
  async registration(a: ProactiveActor) { return this.permitted(a) ? ok(this.registrationValue) : { kind: "denied" as const }; }
  async replaceRegistration(a: ProactiveActor, input: FirstFlowRegistrationCommand) {
    if (!this.permitted(a)) return { kind: "denied" as const };
    if (input.expectedRevision !== this.registrationValue.revision) return { kind: "revision_conflict" as const };
    this.routingValue = input.registrationValue;
    this.registrationValue = { revision: input.expectedRevision + 1, installationRef: input.installationRef, enabled: true,
      availability: "registered", expiresAt: new Date(this.clock.now + 45 * 60000).toISOString() };
    return ok(this.registrationValue);
  }
  async deleteRegistration(a: ProactiveActor, ref: string, revision: number) {
    if (!this.permitted(a)) return { kind: "denied" as const };
    if (this.registrationValue.installationRef !== ref || this.registrationValue.revision !== revision) return { kind: "revision_conflict" as const };
    this.routingValue = ""; this.registrationValue = { revision: revision + 1, enabled: false, availability: "unregistered" }; return ok(this.registrationValue);
  }
  async readState(a: ProactiveActor, topic: string) { return this.permitted(a) && topic === ids.topic ? ok(this.readValue) : { kind: "not_found" as const }; }
  async markRead(a: ProactiveActor, topic: string, revision: number, sequence: number) {
    if (!this.permitted(a) || topic !== ids.topic) return { kind: "not_found" as const };
    if (revision !== this.readValue.revision) return { kind: "revision_conflict" as const };
    if (!this.publications.some(row => row.sequence === sequence)) return { kind: "not_found" as const };
    this.readValue = { revision: revision + 1, readThroughSequence: Math.max(sequence, this.readValue.readThroughSequence) }; return ok(this.readValue);
  }
  async reserve(a: ProactiveActor, id: string, revision: number): Promise<FirstFlowResult<FirstFlowReservation>> {
    await this.beforeReserve?.(); const row = this.rows.get(id);
    if (!this.permitted(a)) return { kind: "terminated" };
    if (!row || !this.sourceAlive) return { kind: "not_found" };
    if (row.revision !== revision || row.state !== "queued") return { kind: "revision_conflict" };
    if (this.reserveFailure) return { kind: this.reserveFailure };
    if (this.settingsValue.mode !== "on" || this.settingsValue.grantGeneration !== row.grantGeneration) return { kind: "denied" };
    if (this.clock.now < Date.parse(row.dueAt)) return { kind: "not_due" };
    if (this.clock.now >= Date.parse(row.expiresAt)) return { kind: "expired" };
    if (this.lastPublished !== undefined && this.clock.now - this.lastPublished < 86400000) return { kind: "frequency" };
    const reserved = this.changed(row, { state: "reserved" });
    return this.unknownReserve ? { kind: "unknown" } : ok({ intent: reserved, source: this.sourceValue });
  }
  async failGeneration(a: ProactiveActor, reservation: FirstFlowReservation) {
    const row = this.rows.get(reservation.intent.intentId);
    if (!this.permitted(a)) return { kind: "terminated" as const };
    if (!row || row.state !== "reserved") return { kind: "conflict" as const };
    return ok(this.changed(row, { state: "failed" }));
  }
  async validateReservation(a: ProactiveActor, reservation: FirstFlowReservation): Promise<FirstFlowResult<void>> {
    const row = this.rows.get(reservation.intent.intentId);
    if (!this.permitted(a)) return { kind: "terminated" };
    if (!row || !this.sourceAlive) return { kind: "not_found" };
    if (row.state !== "reserved" || row.revision !== reservation.intent.revision ||
        this.settingsValue.mode !== "on" || this.settingsValue.grantGeneration !== row.grantGeneration ||
        this.sourceValue.sourceVersion !== reservation.source.sourceVersion) return { kind: "selection_conflict" };
    if (this.clock.now >= Date.parse(row.expiresAt)) return { kind: "expired" };
    return ok(undefined);
  }
  async publish(a: ProactiveActor, input: FirstFlowPublish): Promise<FirstFlowResult<FirstFlowIntent>> {
    await this.beforePublish?.(); const row = this.rows.get(input.reservation.intent.intentId);
    if (!this.permitted(a)) return { kind: "terminated" };
    if (!row || !this.sourceAlive) return { kind: "not_found" };
    if (row.state !== "reserved" || this.settingsValue.grantGeneration !== row.grantGeneration ||
      this.sourceValue.sourceVersion !== input.reservation.source.sourceVersion) return { kind: "selection_conflict" };
    this.publications.push({ ...input, role: "assistant", origin: "proactive", sequence: this.publications.length + 2 });
    this.lastPublished = this.clock.now;
    const published = this.changed(row, { state: "published", messageId: input.messageId, messageSequence: this.publications.length + 1,
      publishedAt: new Date(this.clock.now).toISOString(), dispatchState: this.settingsValue.pushEnabled ? "not_started" : "skipped" });
    return this.unknownPublish ? { kind: "unknown" } : ok(published);
  }
  async claimDispatch(a: ProactiveActor, id: string, revision: number): Promise<FirstFlowResult<FirstFlowDispatch>> {
    const row = this.rows.get(id);
    if (!this.permitted(a)) return { kind: "terminated" };
    if (!row || !this.sourceAlive) return { kind: "not_found" };
    if (row.revision !== revision || row.state !== "published" || row.dispatchState !== "not_started") return { kind: "conflict" };
    if (!this.registrationValue.enabled || this.settingsValue.mode !== "on" || this.settingsValue.grantGeneration !== row.grantGeneration) return { kind: "denied" };
    const changed = this.changed(row, { dispatchState: "dispatching", attemptedAt: new Date(this.clock.now).toISOString() });
    return ok({ claim: { intentId: id, conversationId: row.conversationId, messageId: row.messageId!, revision: changed.revision,
      authorizationScope: row.authorizationScope, expiresAt: row.expiresAt, registrationRevision: this.registrationValue.revision },
      registrationValue: this.routingValue, deliveryRef: id, preview: this.settingsValue.preview });
  }
  async recordDispatch(a: ProactiveActor, claim: FirstFlowClaim, outcome: "accepted" | "rejected" | "unknown") {
    const row = this.rows.get(claim.intentId);
    if (!this.permitted(a)) return { kind: "terminated" as const };
    if (!row || row.revision !== claim.revision) return { kind: "conflict" as const };
    return ok(this.changed(row, { dispatchState: outcome === "rejected" ? "skipped" : outcome,
      ...(outcome === "accepted" ? { providerAcceptedAt: new Date(this.clock.now).toISOString() } : {}) }));
  }
  async recover(a: ProactiveActor) {
    if (!this.permitted(a)) return { kind: "terminated" as const };
    for (const row of this.rows.values()) {
      if (["reserved", "prepared"].includes(row.state)) this.changed(row, { state: "failed" });
      else if (row.dispatchState === "dispatching") this.changed(row, { dispatchState: "unknown" });
    }
    return this.activeIntents(a);
  }
}

export function fixture(customModel?: FirstFlowModel, customSender?: FirstFlowSender) {
  const clock = new FakeClock(), store = new FakeFirstFlowStore(clock);
  const observed: FirstFlowModelInput[] = [];
  let modelCalls = 0, sends = 0, authUid = "owner", live = true;
  const actor: ProactiveActor = { principal: { firebaseUid: "owner" }, current: () => live,
    verifyCurrentAuth: async () => ({ kind: "verified", principal: { firebaseUid: authUid } }) };
  const model: FirstFlowModel = customModel ?? { generate: async input => { modelCalls++; observed.push(input); return rawReply(); } };
  const sender: FirstFlowSender = customSender ?? { sendOnce: async input => {
    const dispatch = await input.claimAfterCredential();
    if (dispatch.kind !== "ok" || !input.current(dispatch.value.claim)) return { kind: "not_attempted" };
    sends++; return { kind: "accepted" };
  } };
  const app = new FirstFlowApplication({ store, model, sender, newMessageId: () => ids.message, nowMs: () => clock.now });
  const settings: FirstFlowSettingsInput = { mode: "on", categories: ["explicit_follow_up"], pushEnabled: true,
    quiet: { kind: "window", startMinute: 1320, endMinute: 480 }, timeZone: "Asia/Singapore",
    maximumInRolling24h: 1, cooldownMinutes: 480, preview: "generic" };
  async function queued(id = ids.intent) {
    const configured = await app.replaceSettings(actor, store.settingsValue.revision, settings);
    if (configured.kind !== "ok") throw Error("fixture setup");
    await app.replaceRegistration(actor, { expectedRevision: store.registrationValue.revision, installationRef: ids.installation,
      registrationKind: "fcm_token", registrationValue: "synthetic-registration", enabled: true });
    const command: FirstFlowIntentCommand = { intentId: id, conversationId: ids.topic, sourceMessageId: ids.source,
      category: "explicit_follow_up", dueAt: new Date(clock.now + 60000).toISOString(), timeZone: "Asia/Singapore", processing: "local", expectedSettingsRevision: configured.value.revision };
    const created = await app.createIntent(actor, command); clock.advance(60000); return { command, created };
  }
  return { app, actor, store, clock, observed, queued, settings, counts: () => ({ model: modelCalls, sends }),
    setAuthUid: (value: string) => { authUid = value; }, setLive: (value: boolean) => { live = value; } };
}
