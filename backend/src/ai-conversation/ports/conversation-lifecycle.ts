import type { RequestBudget } from "../../ai-runtime/ports/generation-transport.js";
import type { RuntimeFailure } from "../../ai-runtime/application/bounded-ai-runtime.js";
import type { OutputCandidate } from "../../ai-runtime/domain/parse-output.js";
import type { Result } from "../../shared/domain/result.js";

/** Internal synthetic capabilities, never a public identifier/DTO or Auth adapter. */
export interface TrustedCaller { readonly owner: string; readonly session: object }
export type ConversationRef = object;
export type SavedUserRef = object;
export type EffectRef = object;
export interface PersonaProjection {
  readonly schemaVersion: "persona_presentation_v1";
  readonly tone: "neutral" | "warm" | "encouraging";
  readonly responseLength: "concise" | "balanced" | "detailed";
  readonly formatStyle: "plain" | "bulleted";
}
export interface CheckInProjection {
  readonly occurredAt: string;
  readonly noteText: string;
  readonly moodLabel: string;
  readonly activityLabel: string;
  readonly weatherConditionLabel: string;
}
export interface SourceProvenance { readonly sourceType: "check_in"; readonly sourceId: string }
/** Capture returns only purpose-authorized eligible sources, before queueing. */
export interface StartView {
  readonly persona: { readonly ref: object; readonly projection: PersonaProjection } | undefined;
  readonly checkIns: readonly { readonly source: SourceProvenance; readonly projection: CheckInProjection }[];
}
export interface ConversationInput {
  readonly currentMessage: string;
  readonly checkIns: readonly CheckInProjection[];
  readonly persona: PersonaProjection | undefined;
}
export interface CapturedContext {
  readonly asOf: string;
  readonly usedPersona: object | undefined;
  readonly provenance: readonly SourceProvenance[];
  readonly input: ConversationInput;
}
export type PresentationMetadata = { readonly presentationMode: "default" }
  | { readonly presentationMode: "persona"; readonly presentationProjectionVersion: "persona_presentation_v1" };
export interface AcceptedAssistant {
  readonly message: string;
  readonly presentation: PresentationMetadata;
  readonly provenance: readonly SourceProvenance[];
}

export interface ConversationSources {
  utcNow(): string;
  available(): boolean;
  authorized(caller: TrustedCaller, conversation: ConversationRef): boolean;
  /** Synchronous, copied in the same admission event. Missing reads throw, never default. */
  capture(caller: TrustedCaller, conversation: ConversationRef, asOf: string): StartView;
  current(caller: TrustedCaller, conversation: ConversationRef, context: CapturedContext): boolean;
  /** Invalidates used deletions/revocations, never edit/switch/unrelated deletion. */
  watch(caller: TrustedCaller, conversation: ConversationRef, context: CapturedContext, invalidate: () => void): () => void;
}

export type WriteAcknowledgment = "confirmed" | "absent" | "unknown";
export interface EffectReadback { readonly user: SavedUserRef | undefined; readonly assistant: boolean }
/**
 * Handwritten fake contract only. Each supplied event executes synchronously at
 * the actual effect. The fake atomically writes the message, effect proof and
 * UTC retention anchor. It MUST NOT retain an event/content after abort, or
 * infer an effect from a check before/after an await. No real schema is chosen.
 */
export interface ConversationMessageStore {
  live(caller: TrustedCaller, conversation: ConversationRef, utc: string): boolean;
  retryEligible(caller: TrustedCaller, conversation: ConversationRef, target: SavedUserRef, explicitInput: string, utc: string): boolean;
  user(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef,
    event: (commit: (message: string, utc: string) => SavedUserRef) => void, budget: RequestBudget): Promise<WriteAcknowledgment>;
  assistant(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef, target: SavedUserRef,
    event: (commit: (message: AcceptedAssistant, utc: string) => void) => void, budget: RequestBudget): Promise<WriteAcknowledgment>;
  /** Called only AFTER old effect rights are permanently fenced. Content-free. */
  readback(effect: EffectRef, caller: TrustedCaller, conversation: ConversationRef): Promise<EffectReadback | undefined>;
}
export interface ConversationDeliverySink {
  /** accept and Application success share a synchronous effect event. */
  deliver(event: (accept: (message: string) => void) => void, budget: RequestBudget): Promise<"accepted" | "refused">;
}
export interface ConversationGates {
  /** Injected fake identity/token/availability decisions, NOT real tokenizer evidence. */
  beforeGeneration(input: () => ConversationInput | undefined, budget: RequestBudget): Promise<Result<void, RuntimeFailure>>;
  /** Explicit policy decision; ambiguous/missing policy must fail closed. */
  candidate(input: () => ConversationInput | undefined, output: () => OutputCandidate | undefined,
    budget: RequestBudget): Promise<Result<void, "unsafe_output" | "stale_authority">>;
}
