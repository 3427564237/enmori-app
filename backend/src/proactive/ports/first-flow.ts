import type { AuthPrincipal, IdentityVerificationResult } from "../../shared/ports/identity-verifier.js";
import type { FullPrecisionInstant } from "../../ai-conversation/domain/real-effect-expiry.js";
import type { PersonaProjection, PresentationMetadata } from "../../ai-conversation/ports/conversation-lifecycle.js";
import type { GenerationTransport } from "../../ai-runtime/ports/generation-transport.js";
import type { RequestBudget } from "../../ai-runtime/ports/generation-transport.js";

export type FirstFlowProcessing = { readonly processing: "local" } | {
  readonly processing: "cloud"; readonly provider: "openai"; readonly disclosureVersion: "openai_cloud_v1";
};
export function firstFlowPurposeGeneration(scope: string): number | undefined {
  const match = /^v1\.(0|[1-9][0-9]*)\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.exec(scope);
  const value = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/** S-PM 2026-10-25 first-flow decision. Inner contracts, never wire schemas or
 * Firebase/vendor objects. All timestamps below are canonical server UTC. */
export interface ProactiveActor {
  readonly principal: AuthPrincipal;
  /** HTTP: reverify the original current caller. Worker: verify the fixed owner
   * through current durable-purpose/account eligibility, NOT an old HTTP token.
   * Never persist this callback, token or its result as a reusable permit. */
  verifyCurrentAuth(): Promise<IdentityVerificationResult>;
  /** Current original request/worker-run/abort authority; checked after awaits.
   * A scheduler separately verifies the fixed owner's current eligibility. */
  current(): boolean;
}
export type FirstFlowFailure = "invalid" | "denied" | "unavailable" | "not_found" |
  "conflict" | "revision_conflict" | "selection_conflict" | "not_due" | "quiet" | "frequency" |
  "expired" | "unknown" | "terminated";
export type FirstFlowResult<T> = { readonly kind: "ok"; readonly value: T }
  | { readonly kind: FirstFlowFailure };
export interface FirstFlowSettingsInput {
  readonly mode: "on" | "off" | "paused";
  readonly pausedUntil?: string;
  readonly categories: readonly "explicit_follow_up"[];
  readonly timeZone: string;
  readonly quiet: { readonly kind: "disabled" } | {
    readonly kind: "window"; readonly startMinute: number; readonly endMinute: number;
  };
  readonly maximumInRolling24h: 1;
  readonly cooldownMinutes: 480;
  readonly pushEnabled: boolean;
  readonly preview: "generic" | "hidden";
}
export interface FirstFlowSettings extends FirstFlowSettingsInput {
  readonly revision: number;
  readonly grantGeneration: number;
}
export type FirstFlowState = "queued" | "reserved" | "prepared" | "published" |
  "cancelled" | "failed" | "expired";
export type FirstFlowDispatchState = "not_started" | "dispatching" | "accepted" | "unknown" | "skipped";
/** Business sources only. No Persona identity or content is persisted here. */
export interface FirstFlowSourceRef {
  readonly kind: "conversation_message" | "check_in";
  readonly id: string;
  readonly version: string;
}
export type FirstFlowIntentCommand = FirstFlowProcessing & {
  /** Canonical owner-scoped Idempotency-Key; a fresh confirmation uses a new ID. */
  readonly intentId: string;
  readonly conversationId: string;
  readonly sourceMessageId: string;
  readonly category: "explicit_follow_up";
  readonly dueAt: string;
  readonly timeZone: string;
  readonly expectedSettingsRevision: number;
}
export type FirstFlowIntent = (FirstFlowProcessing & { readonly cloudAiConsentGeneration?: number }) & {
  readonly intentId: string;
  readonly revision: number;
  readonly state: FirstFlowState;
  readonly conversationId: string;
  readonly sourceMessageId: string;
  readonly category: "explicit_follow_up";
  readonly dueAt: string;
  readonly expiresAt: string;
  readonly timeZone: string;
  readonly settingsRevision: number;
  readonly grantGeneration: number;
  readonly authorizationScope: string;
  readonly topicLifecycleVersion: number;
  readonly requiredSources: readonly FirstFlowSourceRef[];
  readonly requiredCategories: readonly ("conversation_history" | "check_ins")[];
  readonly createdAt: string;
  readonly dispatchState: FirstFlowDispatchState;
  readonly messageId?: string;
  readonly messageSequence?: number;
  readonly publishedAt?: string;
  readonly attemptedAt?: string;
  readonly providerAcceptedAt?: string;
  readonly registrationRevision?: number;
}
export interface FirstFlowRegistrationCommand {
  readonly expectedRevision: number;
  readonly installationRef: string;
  readonly registrationKind: "fcm_token";
  /** Secret routing value, never returned by the ordinary metadata read. */
  readonly registrationValue: string;
  readonly enabled: true;
}
export interface FirstFlowRegistration {
  readonly revision: number;
  readonly enabled: boolean;
  readonly installationRef?: string;
  readonly expiresAt?: string;
  readonly availability: "registered" | "unregistered" | "expired";
}
export interface FirstFlowReadState {
  readonly revision: number;
  readonly readThroughSequence: number;
}
/** Application read models for explicit Transport allowlists. Never serialize
 * FirstFlowSettings/FirstFlowIntent directly; they carry private authority. */
export type FirstFlowSettingsView = FirstFlowSettingsInput & { readonly revision: number };
export interface FirstFlowIntentView {
  readonly intentId: string;
  readonly revision: number;
  readonly state: FirstFlowState | "dispatching" | "accepted" | "unknown";
  readonly dueAt: string;
  readonly expiresAt: string;
  readonly category: "explicit_follow_up";
  readonly conversationId: string;
  readonly recallPossible?: false;
}
/** Transient source bytes and Persona deletion guard, not an intent/outbox. */
export interface FirstFlowSource {
  readonly conversationId: string;
  readonly sourceMessageId: string;
  readonly sourceSequence: number;
  readonly sourceVersion: string;
  readonly sourcePersistedAt: FullPrecisionInstant;
  readonly topicLifecycleVersion: number;
  readonly topicCutoff: FullPrecisionInstant;
  readonly occurredAt: string;
  readonly text: string;
  readonly purposeRevocationGeneration: number;
  readonly persona?: PersonaProjection;
  readonly usedPersonaId?: string;
}
export interface FirstFlowReservation {
  readonly intent: FirstFlowIntent;
  readonly source: FirstFlowSource;
}
export interface FirstFlowPublish {
  readonly reservation: FirstFlowReservation;
  readonly messageId: string;
  readonly text: string;
  readonly presentation: PresentationMetadata;
}
export interface FirstFlowClaim {
  readonly intentId: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly revision: number;
  readonly authorizationScope: string;
  readonly expiresAt: string;
  readonly registrationRevision: number;
}
export interface FirstFlowDispatch {
  readonly claim: FirstFlowClaim;
  readonly registrationValue: string;
  /** Opaque intent locator; an authenticated resolver determines message/owner. */
  readonly deliveryRef: string;
  readonly preview: "generic" | "hidden";
}

/** Read source via current account/topic authority. Does not authorize a future
 * reserve/publish/claim: each effect rereads/fences sources in its transaction. */
export interface FirstFlowSourceAuthority {
  source(actor: ProactiveActor, conversationId: string, sourceMessageId: string): Promise<FirstFlowResult<FirstFlowSource>>;
}
/** Implement every effect with maxAttempts:1. Unknown ACK remains unknown and
 * is read back; never model/send within a transaction callback. */
export interface FirstFlowStore extends FirstFlowSourceAuthority {
  settings(actor: ProactiveActor): Promise<FirstFlowResult<FirstFlowSettings>>;
  replaceSettings(actor: ProactiveActor, expectedRevision: number, input: FirstFlowSettingsInput): Promise<FirstFlowResult<FirstFlowSettings>>;
  createIntent(actor: ProactiveActor, input: FirstFlowIntentCommand): Promise<FirstFlowResult<FirstFlowIntent>>;
  intent(actor: ProactiveActor, intentId: string): Promise<FirstFlowResult<FirstFlowIntent>>;
  activeIntents(actor: ProactiveActor): Promise<FirstFlowResult<readonly FirstFlowIntent[]>>;
  cancelIntent(actor: ProactiveActor, intentId: string, expectedRevision: number): Promise<FirstFlowResult<FirstFlowIntent>>;
  registration(actor: ProactiveActor): Promise<FirstFlowResult<FirstFlowRegistration>>;
  replaceRegistration(actor: ProactiveActor, input: FirstFlowRegistrationCommand): Promise<FirstFlowResult<FirstFlowRegistration>>;
  deleteRegistration(actor: ProactiveActor, installationRef: string, expectedRevision: number): Promise<FirstFlowResult<FirstFlowRegistration>>;
  readState(actor: ProactiveActor, conversationId: string): Promise<FirstFlowResult<FirstFlowReadState>>;
  markRead(actor: ProactiveActor, conversationId: string, expectedRevision: number, readThroughSequence: number): Promise<FirstFlowResult<FirstFlowReadState>>;
  /** Atomic queued -> reserved + current source/settings/topic/budget validation. */
  reserve(actor: ProactiveActor, intentId: string, expectedRevision: number): Promise<FirstFlowResult<FirstFlowReservation>>;
  /** Read-only exact reservation/source revalidation before cloud effects. */
  validateReservation(actor: ProactiveActor, reservation: FirstFlowReservation): Promise<FirstFlowResult<void>>;
  failGeneration(actor: ProactiveActor, reservation: FirstFlowReservation): Promise<FirstFlowResult<FirstFlowIntent>>;
  /** Atomic canonical message + source_use_v2 + published/outbox + one budget
   * charge. Genuine assistant, no fake user, no old retention-anchor advance. */
  publish(actor: ProactiveActor, input: FirstFlowPublish): Promise<FirstFlowResult<FirstFlowIntent>>;
  /** Fresh source/grant/lease/quiet check after token await, then one atomic
   * not_started -> dispatching claim. Only definite ACK may return capability. */
  claimDispatch(actor: ProactiveActor, intentId: string, expectedRevision: number): Promise<FirstFlowResult<FirstFlowDispatch>>;
  recordDispatch(actor: ProactiveActor, claim: FirstFlowClaim, outcome: "accepted" | "rejected" | "unknown"): Promise<FirstFlowResult<FirstFlowIntent>>;
  /** Bounded owner active refs only: unpublished interrupted work fails;
   * dispatching -> unknown, never resend; published/not_started needs fresh claim. */
  recover(actor: ProactiveActor): Promise<FirstFlowResult<readonly FirstFlowIntent[]>>;
}

export interface FirstFlowModelInput {
  readonly inputKind: "proactive_followup";
  readonly quotedRequest: { readonly occurredAt: string; readonly text: string };
  readonly dueAt: string;
  readonly timeZone: string;
  readonly persona?: PersonaProjection;
}
/** Reuses the existing physical-settlement GenerationTransport contract: abort
 * is not proof that the underlying local generation has stopped. */
export type FirstFlowModel = GenerationTransport<FirstFlowModelInput>;
/** Logical cloud completion, never proof that an unknown provider stopped.
 * Shared runtime/quota/monetary owners retain all unknown remote reservations. */
export interface FirstFlowCloudRun {
  current(): boolean;
  verify(): Promise<boolean>;
  generate(input: FirstFlowModelInput, checkpoint: () => Promise<boolean>): Promise<FirstFlowResult<Uint8Array>>;
  release(): void;
}
export interface FirstFlowCloudExecution {
  open(actor: ProactiveActor, intent: FirstFlowIntent, budget: RequestBudget): Promise<FirstFlowResult<FirstFlowCloudRun>>;
}
export type FirstFlowSenderOutcome = { readonly kind: "accepted" | "rejected" | "unknown" | "not_attempted" };
/** Acquire OAuth first, await fresh claim, then check current(claim) after that
 * await and immediately before the single FCM message POST. No token output. */
export interface FirstFlowSender {
  sendOnce(input: {
    readonly signal: AbortSignal;
    claimAfterCredential(): Promise<FirstFlowResult<FirstFlowDispatch>>;
    current(claim: FirstFlowClaim): boolean;
  }): Promise<FirstFlowSenderOutcome>;
}
