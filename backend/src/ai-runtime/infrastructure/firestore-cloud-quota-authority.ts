import type { CloudAdmissionLimits, CloudRecoveryAuthority } from '../ports/cloud-generation-transport.js';
import type { RuntimeClock } from '../ports/runtime-clock.js';
import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';
import type { FirestoreGateway, StoredDocument } from '../../shared/infrastructure/firebase/firestore-gateway.js';

export interface CloudQuotaWindow { readonly windowMs: number; readonly maxRequests: number; readonly maxTokens: number }
export interface CloudQuotaPolicy {
  readonly minute: CloudQuotaWindow;
  readonly day: CloudQuotaWindow;
  readonly tokensPerRequest: number;
}
interface Reservation { readonly minuteExpiresAtMs: number; readonly dayExpiresAtMs: number; readonly tokens: number }
interface Ledger {
  readonly schemaVersion: 'cloud_quota_v1'; readonly provider: 'groq' | 'openai'; readonly model: string; readonly scope: string;
  readonly policy: CloudQuotaPolicy; readonly processEpoch: string; readonly generation: number;
  readonly lastObservedAtMs: number; readonly reservations: readonly Reservation[]; readonly blockedUntilMs: number;
}
const positive = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) > 0;
const nonnegative = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const exact = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);

/** Explicit single-controlled-host authority. The supplied ownership guard must
 * prove exclusive service ownership independently of this ledger. current()
 * is a local fence, not a synchronous remote Firestore read. Every quota effect
 * rechecks the durable runtime epoch in its transaction; application writes
 * retain their separate canonical authorization/epoch checks.
 * No initialization-on-missing, model calls, content, auto-retry or logging. */
export class FirestoreCloudQuotaAuthority implements CloudRecoveryAuthority {
  private lease: object | undefined;
  private active = false;
  private recovering = false;
  private used = false;
  private rateLimitPending = false;
  private lastUtc = 0;
  private timeAnchor: { utc: number; monotonic: number } | undefined;
  private cooldownUntil = 0;
  private readonly policy: CloudQuotaPolicy;
  private readonly epoch: RuntimeEpoch;
  private readonly path: string;
  readonly #quotaIdentity: Readonly<Pick<Ledger, 'provider' | 'model'>>;
  constructor(private readonly gateway: FirestoreGateway, epoch: RuntimeEpoch,
    private readonly scope: string, model: string, policy: CloudQuotaPolicy,
    private readonly clock: RuntimeClock, private readonly utcMilliseconds: () => number,
    private readonly ownsHost: () => boolean, provider: 'groq' | 'openai' = 'groq') {
    const openai = provider === 'openai';
    if (!uuid(epoch.processEpoch) || !positive(epoch.generation) || !/^[A-Za-z0-9_-]{1,64}$/.test(scope) ||
        !['groq', 'openai'].includes(provider) ||
        !(openai ? ['gpt-6-luna', 'gpt-6.1-sol'].includes(model) : model === 'openai/gpt-oss-120b') ||
        !policy || !positive(policy.tokensPerRequest) ||
        policy.minute?.windowMs !== 60000 || policy.day?.windowMs !== 86400000 ||
        ![policy.minute, policy.day].every(w => positive(w.maxRequests) && positive(w.maxTokens) &&
          w.maxRequests <= 1000 && w.maxTokens <= (openai ? 10240000 : 200000) && policy.tokensPerRequest <= w.maxTokens) ||
        policy.minute.maxRequests > (openai ? 60 : 30) || policy.minute.maxTokens > (openai ? 614400 : 8000) ||
        policy.day.maxRequests < policy.minute.maxRequests || policy.day.maxTokens < policy.minute.maxTokens ||
        typeof utcMilliseconds !== 'function' || typeof ownsHost !== 'function') throw Error('CLOUD_QUOTA_CONFIGURATION_INVALID');
    this.epoch = Object.freeze({ ...epoch });
    this.#quotaIdentity = Object.freeze({ provider, model });
    // Provider/model separation never adopts or overwrites the old Groq ledger.
    this.path = openai ? `ai_openai_quota/${model}` : 'ai_cloud_quota/current';
    this.policy = Object.freeze({ minute: Object.freeze({ ...policy.minute }), day: Object.freeze({ ...policy.day }), tokensPerRequest: policy.tokensPerRequest });
  }
  get quotaIdentity(): Readonly<Pick<Ledger, 'provider' | 'model'>> {
    return this.#quotaIdentity;
  }
  private now(): number {
    const value = this.utcMilliseconds();
    if (!nonnegative(value) || value < this.lastUtc || value > Number.MAX_SAFE_INTEGER - 86460001) throw Error();
    const monotonic = this.clock.now();
    if (!Number.isFinite(monotonic) || monotonic < 0) throw Error();
    this.timeAnchor ??= { utc: value, monotonic };
    if (monotonic < this.timeAnchor.monotonic || Math.abs((value - this.timeAnchor.utc) - (monotonic - this.timeAnchor.monotonic)) > 1000) throw Error();
    this.lastUtc = value;
    return Math.floor(this.timeAnchor.utc + monotonic - this.timeAnchor.monotonic);
  }
  private host(): boolean {
    try { return this.ownsHost() === true; } catch { return false; }
  }
  current(lease: object): boolean {
    if (!this.active || !this.host() || lease !== this.lease) { this.active = false; return false; }
    return true;
  }
  dispatchAllowed(lease: object): boolean {
    try { return this.current(lease) && !this.rateLimitPending && this.now() >= this.cooldownUntil; }
    catch { this.active = false; return false; }
  }
  canDispatch(): boolean { return !!this.lease && this.dispatchAllowed(this.lease); }
  get reservedTokensPerRequest(): number { return this.policy.tokensPerRequest; }
  private matchesLimits(limits: Readonly<CloudAdmissionLimits>): boolean {
    return limits.windowMs === this.policy.day.windowMs && limits.maxRequests === this.policy.day.maxRequests &&
      limits.maxTokens === this.policy.day.maxTokens && limits.tokensPerRequest === this.policy.tokensPerRequest;
  }
  private decode(value: StoredDocument | undefined, now: number): Ledger {
    const { provider, model } = this.#quotaIdentity;
    if (!value || !exact(value, ['schemaVersion', 'provider', 'model', 'scope', 'policy', 'processEpoch', 'generation',
      'lastObservedAtMs', 'reservations', 'blockedUntilMs']) || value.schemaVersion !== 'cloud_quota_v1' || value.provider !== provider ||
      value.model !== model || value.scope !== this.scope || !record(value.policy) ||
      !exact(value.policy, ['minute', 'day', 'tokensPerRequest']) || value.policy.tokensPerRequest !== this.policy.tokensPerRequest ||
      !uuid(value.processEpoch) || !positive(value.generation) || value.generation > this.epoch.generation ||
      (value.generation === this.epoch.generation && value.processEpoch !== this.epoch.processEpoch) ||
      !nonnegative(value.lastObservedAtMs) || value.lastObservedAtMs > now ||
      !nonnegative(value.blockedUntilMs) ||
      !Array.isArray(value.reservations) || value.reservations.length > this.policy.day.maxRequests) throw Error();
    for (const name of ['minute', 'day'] as const) {
      const w = value.policy[name], expected = this.policy[name];
      if (!record(w) || !exact(w, ['windowMs', 'maxRequests', 'maxTokens']) ||
          w.windowMs !== expected.windowMs || w.maxRequests !== expected.maxRequests || w.maxTokens !== expected.maxTokens) throw Error();
    }
    let tokens = 0;
    const reservations = value.reservations.map((r: unknown) => {
      if (!record(r) || !exact(r, ['minuteExpiresAtMs', 'dayExpiresAtMs', 'tokens']) ||
          !positive(r.tokens) || r.tokens !== this.policy.tokensPerRequest || !positive(r.minuteExpiresAtMs) || !positive(r.dayExpiresAtMs) ||
          r.dayExpiresAtMs - r.minuteExpiresAtMs !== this.policy.day.windowMs - this.policy.minute.windowMs ||
          r.dayExpiresAtMs > (value.lastObservedAtMs as number) + 86460001) throw Error();
      tokens += r.tokens;
      if (!Number.isSafeInteger(tokens) || tokens > this.policy.day.maxTokens) throw Error();
      return { tokens: r.tokens, minuteExpiresAtMs: r.minuteExpiresAtMs, dayExpiresAtMs: r.dayExpiresAtMs };
    });
    return { schemaVersion: 'cloud_quota_v1', provider, model, scope: this.scope, policy: this.policy,
      processEpoch: value.processEpoch, generation: value.generation, lastObservedAtMs: value.lastObservedAtMs,
      blockedUntilMs: value.blockedUntilMs, reservations };
  }
  private verifyEpoch(value: StoredDocument | undefined): void {
    if (!value || !exact(value, ['processEpoch', 'generation', 'cleanupGeneration']) || !nonnegative(value.cleanupGeneration) || value.processEpoch !== this.epoch.processEpoch || value.generation !== this.epoch.generation || !this.host()) throw Error();
  }
  async recover(limits: Readonly<CloudAdmissionLimits>) {
    if (this.used || this.recovering || !this.host() || !this.matchesLimits(limits)) return { kind: 'unavailable' } as const;
    this.used = true; this.recovering = true;
    try {
      const ledger = await this.gateway.runTransaction(async tx => {
        this.verifyEpoch(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(this.path), now = this.now();
        const old = this.decode(raw, now);
        // Do not credit unproved downtime or a new process's wall-clock jump.
        // Restore the remaining windows at the last confirmed ledger write.
        const shift = now - old.lastObservedAtMs;
        const reservations = old.reservations.filter(r => r.dayExpiresAtMs > old.lastObservedAtMs)
          .map(r => ({ ...r, minuteExpiresAtMs: r.minuteExpiresAtMs + shift, dayExpiresAtMs: r.dayExpiresAtMs + shift }));
        const blockedUntilMs = old.blockedUntilMs === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER
          : old.blockedUntilMs > old.lastObservedAtMs ? old.blockedUntilMs + shift : 0;
        if (reservations.some(r => !Number.isSafeInteger(r.dayExpiresAtMs)) || !Number.isSafeInteger(blockedUntilMs)) throw Error();
        const next = { ...old, ...this.epoch, lastObservedAtMs: now, reservations, blockedUntilMs };
        if (!this.host()) throw Error();
        tx.set(this.path, next); return next;
      }, { maxAttempts: 1 });
      const now = this.now();
      if (!this.host()) throw Error();
      this.lease = Object.freeze({}); this.active = true; this.cooldownUntil = ledger.blockedUntilMs;
      // A cooldown remains enforced transactionally by reserve(), not removed
      // by recovery or converted to a provider retry.
      return { kind: 'confirmed', lease: this.lease, previousRemote: 'unknown',
        reservations: ledger.reservations.filter(r => r.dayExpiresAtMs > now)
          .map(r => ({ remainingMs: r.dayExpiresAtMs - now, tokens: r.tokens })) } as const;
    } catch { this.active = false; return { kind: 'unknown' } as const; }
    finally { this.recovering = false; }
  }
  async reserve(lease: object, input: { readonly tokens: number; readonly conservativeExpiresAt: number }, live: () => boolean) {
    try {
      if (this.rateLimitPending || !this.current(lease) || !live() || input.tokens !== this.policy.tokensPerRequest) return 'rejected' as const;
      const delta = input.conservativeExpiresAt - this.clock.now() - this.policy.day.windowMs;
      if (!Number.isFinite(delta) || delta <= 0 || delta > 60000) return 'rejected' as const;
      this.now(); // validate both clocks before deriving the conservative deadline
      const expires = Math.ceil(this.timeAnchor!.utc + this.clock.now() - this.timeAnchor!.monotonic + delta);
      return await this.gateway.runTransaction(async tx => {
        this.verifyEpoch(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(this.path), now = this.now(), old = this.decode(raw, now);
        if (old.processEpoch !== this.epoch.processEpoch || old.generation !== this.epoch.generation) throw Error();
        if (!this.dispatchAllowed(lease) || !live() || now >= expires) return 'rejected' as const;
        const active = old.reservations.filter(r => r.dayExpiresAtMs > now);
        if (old.blockedUntilMs > now) return 'rejected' as const;
        for (const name of ['minute', 'day'] as const) {
          const rows = active.filter(r => (name === 'minute' ? r.minuteExpiresAtMs : r.dayExpiresAtMs) > now), cap = this.policy[name];
          if (rows.length >= cap.maxRequests || rows.reduce((sum, r) => sum + r.tokens, 0) + input.tokens > cap.maxTokens) return 'rejected' as const;
        }
        active.push({ tokens: input.tokens, minuteExpiresAtMs: expires + this.policy.minute.windowMs,
          dayExpiresAtMs: expires + this.policy.day.windowMs });
        if (!this.dispatchAllowed(lease) || !live()) return 'rejected' as const;
        tx.set(this.path, { ...old, ...this.epoch, lastObservedAtMs: now, reservations: active });
        return 'confirmed' as const;
      }, { maxAttempts: 1 });
    } catch { this.active = false; return 'unknown' as const; }
  }
  /** Persist 429 cooldown before another independent request is considered.
   * Missing Retry-After blocks for the full day; unparseable supplied values
   * persist a closed sentinel until explicit operator reconciliation. */
  async blockRateLimit(retryAfterSeconds: number | undefined): Promise<void> {
    if (this.rateLimitPending) { this.active = false; return; }
    this.rateLimitPending = true;
    try {
      const lease = this.lease;
      if (!lease || !this.current(lease)) throw Error();
      const duration = retryAfterSeconds === undefined ? 86400000
        : Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds * 1000) : Infinity;
      const untilAt = (now: number) => Number.isSafeInteger(now + duration) ? now + duration : Number.MAX_SAFE_INTEGER;
      this.cooldownUntil = Math.max(this.cooldownUntil, untilAt(this.now()));
      const persistedUntil = await this.gateway.runTransaction(async tx => {
        this.verifyEpoch(await tx.get('ai_runtime_fence/current'));
        const raw = await tx.get(this.path), now = this.now(), old = this.decode(raw, now);
        if (old.processEpoch !== this.epoch.processEpoch || old.generation !== this.epoch.generation) throw Error();
        if (!this.current(lease)) throw Error();
        const until = Math.max(old.blockedUntilMs, untilAt(now));
        if (!Number.isSafeInteger(until)) throw Error();
        tx.set(this.path, { ...old, ...this.epoch, lastObservedAtMs: now, blockedUntilMs: until });
        return until;
      }, { maxAttempts: 1 });
      this.cooldownUntil = Math.max(this.cooldownUntil, persistedUntil);
    } catch { this.active = false; }
    finally { this.rateLimitPending = false; }
  }
}
