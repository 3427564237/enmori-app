import { BoundedAiRuntime } from "../src/ai-runtime/application/bounded-ai-runtime.js";
import { ControlledConversationPrompt, type MatchingPromptCounter } from "../src/ai-runtime/infrastructure/controlled-conversation-prompt.js";
import { ControlledOllamaTransport, type ControlledOllamaBinding } from "../src/ai-runtime/infrastructure/controlled-ollama-transport.js";
import { MonotonicRuntimeClock } from "../src/ai-runtime/infrastructure/monotonic-runtime-clock.js";
import type { RuntimeClock } from "../src/ai-runtime/ports/runtime-clock.js";
import { AsyncConversationOperationExecutor } from "../src/ai-conversation/application/async-conversation-operation-executor.js";
import { AuthorizedAsyncConversationGenerationTransport } from "../src/ai-conversation/application/async-conversation-generation-transport.js";
import type { AsyncAcknowledgedConversationPair, RequestOriginalConversationIdentity } from "../src/ai-conversation/ports/application-conversation-operations.js";
import type { AsyncConversationAuthority, AsyncConversationModelInput } from "../src/ai-conversation/ports/async-conversation.js";
import type { AcceptedAssistant, ConversationGates } from "../src/ai-conversation/ports/conversation-lifecycle.js";
import { FakeAsyncStore, FakeReads, id, identity, operation, timestamp } from "./ai-conversation/async-conversation-fakes.js";

/** Explicit verification composition only. Auth, complete EMPTY Note inventory,
 * storage and complete-body sink are synthetic. No ordinary route, Firestore,
 * device readiness, deployment or semantic acceptance is supplied by this file.
 * LI may import the compiled helper on the authorized controlled Linux host and
 * inject the already provisioned binding, matching counter and independent gate.
 * Missing gates fail before generation; no permissive gate is a default. */
export interface ControlledChatPacketOptions {
  readonly binding: ControlledOllamaBinding;
  readonly counter: MatchingPromptCounter;
  readonly gates?: ConversationGates;
  readonly clock?: RuntimeClock;
  /** Handwritten fake HTTP in CI. Omit only for LI's explicit local host run. */
  readonly http?: typeof fetch;
  readonly requests?: 1 | 2 | 3 | 4;
  /** Content-free observation; does not represent remote termination. */
  readonly checkpoint?: (value: { readonly phase: "before-generation" | "model-dispatched" | "candidate";
    readonly index: number; readonly elapsedMs: number }) => void;
}
export interface ControlledChatPacketState {
  readonly modelState: ControlledOllamaTransport<unknown>["state"];
  readonly modelDispatches: number;
  readonly runtime: BoundedAiRuntime<unknown>["state"];
}
export interface ControlledChatPacketResult {
  readonly index: number;
  readonly result: "success" | "terminated" | "failure";
  readonly failure?: string;
  readonly elapsedMs: number;
  readonly usersCommitted: number;
  readonly assistantsCommitted: number;
  readonly bodiesAccepted: number;
  readonly syntheticRetentionAnchor: "none" | "user" | "assistant";
  readonly inputAvailableBeforeGeneration: boolean;
  readonly candidateAvailableBeforeCheck: boolean;
  readonly borrowedGettersRevoked: boolean;
  readonly originalCapabilityRevoked: boolean;
}
export interface ControlledChatPacketReport extends ControlledChatPacketState {
  readonly scope: "synthetic-auth-empty-note-memory-store-complete-body-sink";
  readonly semanticGate: "missing" | "explicitly-injected";
  readonly completeInputTokenCounts: readonly number[];
  readonly results: readonly ControlledChatPacketResult[];
  /** Only this helper's observable holders, not supplier/SDK heap destruction. */
  readonly localContentHoldersCleared: boolean;
}
const rejectMissing: ConversationGates = {
  beforeGeneration: async () => ({ ok: false, failure: "dependency_unavailable" }),
  candidate: async () => ({ ok: false, failure: "unsafe_output" }),
};

export function startControlledChatPacket(options: ControlledChatPacketOptions): {
  readonly outcome: Promise<ControlledChatPacketReport>;
  state(): ControlledChatPacketState;
  cancel(index?: number): Promise<"closed" | "unresolved">;
  disconnect(index?: number): void;
} {
  const count = options.requests ?? 1;
  if (![1, 2, 3, 4].includes(count)) throw new Error("CONTROLLED_PACKET_CONFIGURATION_INVALID");
  const clock = options.clock ?? new MonotonicRuntimeClock(), started = clock.now();
  const elapsed = () => Math.max(0, clock.now() - started);
  const checkpoint = (phase: "before-generation" | "model-dispatched" | "candidate", index: number) => {
    try { options.checkpoint?.({ phase, index, elapsedMs: elapsed() }); }
    catch { /* An observer cannot change the bounded Application result. */ }
  };
  const tokenCounts: number[] = [];
  const counter: MatchingPromptCounter = {
    manifestDigest: options.counter.manifestDigest, tokenizerDigest: options.counter.tokenizerDigest,
    current: () => options.counter.current(),
    count: (raw, budget) => options.counter.count(raw, budget).then(value => {
      if (Number.isSafeInteger(value) && value >= 0) tokenCounts.push(value);
      return value;
    }),
  };
  let modelDispatches = 0, dispatchIndex = 0;
  const http: typeof fetch = (url, init) => {
    const pending = (options.http ?? fetch)(url, init);
    if (new URL(String(url)).pathname === "/api/generate") {
      modelDispatches++; checkpoint("model-dispatched", dispatchIndex);
    }
    return pending;
  };
  const model = new ControlledOllamaTransport(options.binding, new ControlledConversationPrompt(counter), http);
  const runtime = new BoundedAiRuntime<AsyncConversationModelInput>(clock, new AuthorizedAsyncConversationGenerationTransport(model));
  const state = (): ControlledChatPacketState => ({ modelState: model.state, modelDispatches, runtime: { ...runtime.state } });
  const controls: { cancel(): Promise<"closed" | "unresolved">; disconnect(): void }[] = [];
  const cleanup: (() => void)[] = [];
  const work = Array.from({ length: count }, (_, index) => {
    const who = identity(id(index + 1)), op = operation(index * 1000 + 1), reads = new FakeReads(), store = new FakeAsyncStore();
    const abort = new AbortController();
    let original: RequestOriginalConversationIdentity | undefined;
    let assistant: AcceptedAssistant | undefined, accepted = 0;
    let inputGetter: Parameters<ConversationGates["beforeGeneration"]>[0] | undefined;
    let outputGetter: Parameters<ConversationGates["candidate"]>[1] | undefined;
    let userGetter: (() => string | undefined) | undefined;
    let assistantGetter: (() => AcceptedAssistant | undefined) | undefined;
    let userCommits = 0, assistantCommits = 0;
    let inputAvailableBeforeGeneration = false, candidateAvailableBeforeCheck = false;
    store.userHook = async (context, getter, retry) => {
      userGetter = getter;
      const observation = store.commitUser(context, getter, retry);
      if (observation.kind === "committed") userCommits++;
      return observation;
    };
    store.assistantHook = async (context, user, getter) => {
      assistantGetter = getter;
      const observation = store.commitAssistant(context, user, getter);
      if (observation.kind === "committed") { assistant = getter(); assistantCommits++; }
      return observation;
    };
    const authority = (capability: RequestOriginalConversationIdentity): AsyncConversationAuthority => {
      original = capability;
      const fresh: AsyncConversationAuthority["freshAuth"] = async observed => {
        const verification = await capability.verify(observed);
        return capability.current(observed) && verification.kind === "verified" ? "authorized" : "denied";
      };
      return { current: observed => capability.current(observed), freshAuth: fresh, preaccept: fresh };
    };
    const pair: AsyncAcknowledgedConversationPair = { async read(context) {
      const row = store.rows.get(context.operation.userMessageId);
      if (!row?.assistantMessageId || !assistant || !context.originalCurrent()) return { kind: "failure", code: "AI_UNAVAILABLE" };
      return { kind: "success", value: {
        user: { ...row.user, role: "user", availability: "available", text: row.text },
        assistant: { messageId: row.assistantMessageId, sequence: row.user.sequence + 1, persistedAt: { ...timestamp, nanoseconds: 1 },
          role: "assistant", availability: "available", text: assistant.message },
        presentation: assistant.presentation,
      } };
    } };
    const injected = options.gates ?? rejectMissing;
    const gates: ConversationGates = {
      beforeGeneration: (input, budget) => {
        inputAvailableBeforeGeneration = input() !== undefined;
        inputGetter = input; dispatchIndex = index; checkpoint("before-generation", index);
        return injected.beforeGeneration(input, budget);
      },
      candidate: (input, output, budget) => {
        candidateAvailableBeforeCheck = input() !== undefined && output() !== undefined;
        inputGetter = input; outputGetter = output; checkpoint("candidate", index);
        return injected.candidate(input, output, budget);
      },
    };
    const executor = new AsyncConversationOperationExecutor({ runtime,
      ports: capability => ({ authority: authority(capability), reads, store, acknowledgedPair: pair }), gates,
      clock: { monotonicNow: () => clock.now(), utcNow: () => ({ ...timestamp }) },
    });
    const execution = executor.create({ identity: who, operation: op,
      text: () => "今天读书了。",
      verifyCurrentAuth: async () => ({ kind: "verified", principal: who.principal }),
    }, { signal: abort.signal, current: () => !abort.signal.aborted,
      acceptCompleteBody: () => { accepted++; return true; },
    });
    controls.push({ cancel: async () => (await execution.cancel()).kind, disconnect: () => abort.abort() });
    cleanup.push(() => {
      assistant = undefined; inputGetter = undefined; outputGetter = undefined; userGetter = undefined; assistantGetter = undefined;
      store.rows.clear(); store.pending.clear(); store.contexts.length = 0; reads.opened.length = 0; reads.currentDependencies.length = 0;
      store.userHook = undefined; store.assistantHook = undefined; original = undefined;
    });
    return execution.dispatch().then(result => {
      const reported: ControlledChatPacketResult = {
        index, result: result.kind, ...(result.kind === "failure" ? { failure: result.code } : {}), elapsedMs: elapsed(),
        usersCommitted: userCommits, assistantsCommitted: assistantCommits, bodiesAccepted: accepted,
        syntheticRetentionAnchor: assistantCommits ? "assistant" : userCommits ? "user" : "none",
        inputAvailableBeforeGeneration, candidateAvailableBeforeCheck,
        borrowedGettersRevoked: [inputGetter, outputGetter, userGetter, assistantGetter].every(getter => getter === undefined || getter() === undefined),
        originalCapabilityRevoked: original === undefined || !original.current(who),
      };
      // The authoritative pair is not returned or retained in this report.
      return reported;
    });
  });
  const indexOf = (index = 0) => {
    if (!Number.isInteger(index) || index < 0 || index >= controls.length) throw new Error("CONTROLLED_PACKET_CONFIGURATION_INVALID");
    return index;
  };
  const outcome = Promise.all(work).then(results => {
    for (const clear of cleanup) clear(); cleanup.length = 0;
    return Object.freeze({ ...state(), scope: "synthetic-auth-empty-note-memory-store-complete-body-sink" as const,
      semanticGate: options.gates ? "explicitly-injected" as const : "missing" as const,
      completeInputTokenCounts: Object.freeze([...tokenCounts]), results: Object.freeze(results), localContentHoldersCleared: true });
  });
  return { outcome, state, cancel: index => controls[indexOf(index)]!.cancel(), disconnect: index => controls[indexOf(index)]!.disconnect() };
}
