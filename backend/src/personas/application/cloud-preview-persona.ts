import { OPENAI_CLOUD_PROCESSING } from '../../account/domain/cloud-ai-consent.js';
import type { CloudAiConsentAuthority, CloudConsentObservation } from '../../account/ports/cloud-ai-consent-authority.js';
import { copyPersonaExpression, personaExpressionProjection } from '../../ai-conversation/application/persona-expression.js';
import type { AsyncConversationModelInput } from '../../ai-conversation/ports/async-conversation.js';
import type { ConversationInput } from '../../ai-conversation/ports/conversation-lifecycle.js';
import type { ConversationCaller, ConversationResult, ConversationFailureCode } from '../../ai-conversation/ports/conversation-operations.js';
import type { BoundedAiRuntime, RuntimeRequest } from '../../ai-runtime/application/bounded-ai-runtime.js';
import { err, ok } from '../../shared/domain/result.js';
import type { PersonaPreviewAuthority, PersonaPreviewPermission } from '../ports/persona-preview-authority.js';
import type { PersonaPreviewControl } from './preview-persona.js';

type Lease = Extract<CloudConsentObservation, {kind: 'authorized'}>;

/** Read-only draft preview using the SAME cloud admission/monetary owner as chat.
 * No Persona, conversation, message, history or source persistence is supplied. */
export class CloudPreviewPersona {
  readonly processing = OPENAI_CLOUD_PROCESSING;
  constructor(private readonly authority: PersonaPreviewAuthority,
    private readonly consent: CloudAiConsentAuthority,
    private readonly runtime: BoundedAiRuntime<AsyncConversationModelInput>,
    private readonly now: () => number) {
    if (consent.processing?.provider !== OPENAI_CLOUD_PROCESSING.provider ||
        consent.processing.disclosureVersion !== OPENAI_CLOUD_PROCESSING.disclosureVersion)
      throw new TypeError('OpenAI preview requires the matching cloud consent authority');
  }

  async execute(caller: ConversationCaller, draft: unknown, text: unknown,
    control: PersonaPreviewControl): Promise<ConversationResult<void>> {
    const expression = copyPersonaExpression(draft);
    if (!expression || typeof text !== 'string' || !text.isWellFormed() || !text.trim() || [...text].length > 2400)
      return {kind: 'failure', code: 'AI_INPUT_INVALID'};
    const started = this.now(), deadline = started + 60_000;
    let active = true, request: RuntimeRequest | undefined, lease: Lease | undefined;
    let permission: PersonaPreviewPermission | undefined, cloudGeneration: number | undefined;
    let failure: ConversationFailureCode = 'AI_UNAVAILABLE';
    let projection: ConversationInput | undefined = Object.freeze({strategy: 'open_conversation_v1',
      currentMessage: text, checkIns: Object.freeze([]), history: Object.freeze([]),
      persona: personaExpressionProjection(expression)});
    const abort = new AbortController();
    const live = () => active && !abort.signal.aborted && !control.signal.aborted && control.current() &&
      Number.isFinite(this.now()) && this.now() >= started && this.now() < deadline;
    let resolveStop!: (value: ConversationResult<void>) => void;
    const stopped = new Promise<ConversationResult<void>>(resolve => { resolveStop = resolve; });
    const stop = (timedOut: boolean) => {
      if (!active) return;
      active = false; projection = undefined; abort.abort(); request?.cancel('abandoned');
      resolveStop(timedOut ? {kind: 'failure', code: 'AI_UNAVAILABLE'} : {kind: 'terminated'});
    };
    const disconnected = () => stop(false);
    const timer = setTimeout(() => stop(true), Math.max(0, deadline - this.now())); timer.unref();
    control.signal.addEventListener('abort', disconnected, {once: true});
    const authorize = async (): Promise<boolean> => {
      if (!live() || (lease && !lease.current())) { failure = 'AI_AUTHORITY_CHANGED'; return false; }
      const auth = await caller.verifyCurrentAuth();
      if (!live()) return false;
      if (auth.kind !== 'verified') {
        failure = auth.kind === 'invalid' ? 'AUTH_REQUIRED' : auth.kind === 'forbidden' ? 'AUTH_FORBIDDEN' : 'AI_UNAVAILABLE'; return false;
      }
      if (auth.principal.firebaseUid !== caller.principal.firebaseUid) { failure = 'AUTH_FORBIDDEN'; return false; }
      const read = await this.authority.read(auth.principal);
      if (!live()) return false;
      if (read.kind !== 'success') { if (read.kind === 'failure') failure = read.code; return false; }
      if (permission && (permission.ownerId !== read.value.ownerId || permission.purposeRevocationGeneration !== read.value.purposeRevocationGeneration)) {
        failure = 'AI_AUTHORITY_CHANGED'; return false;
      }
      const next = await this.consent.read(auth.principal, read.value.ownerId, live, abort.signal);
      if (next.kind !== 'authorized') {
        failure = next.kind === 'denied' ? 'AI_CONTEXT_NOT_PERMITTED' : 'AI_UNAVAILABLE'; return false;
      }
      if (!live() || !next.current() || next.purposeGeneration !== read.value.purposeRevocationGeneration ||
          (cloudGeneration !== undefined && next.generation !== cloudGeneration) || (lease && !lease.current())) {
        next.release(); failure = 'AI_AUTHORITY_CHANGED'; return false;
      }
      lease?.release(); lease = next; permission = read.value; cloudGeneration = next.generation;
      return true;
    };
    const work = async (): Promise<ConversationResult<void>> => {
      try {
        if (!await authorize() || !live() || !permission) return live() ? {kind: 'failure', code: failure} : {kind: 'terminated'};
        const handle: AsyncConversationModelInput = Object.freeze({processing: 'cloud', ...OPENAI_CLOUD_PROCESSING,
          monetaryConsumer: 'persona', cloudConsentCurrent: () => live() && lease?.current() === true,
          authorize, projection: () => live() && lease?.current() === true ? projection : undefined});
        const admitted = this.runtime.submit(permission.ownerId, {
          purpose: 'ai_assistant_message_v1',
          prepare: async () => { if (!await authorize() || !live()) throw Error('Preview authority unavailable'); return handle; },
          checkCandidate: async () => await authorize() && live() ? ok(undefined) : err('stale_authority'),
        });
        if (!admitted.accepted) return {kind: 'failure', code: admitted.failure === 'overload' ? 'AI_BUSY' : 'AI_UNAVAILABLE'};
        request = admitted.request;
        if (!live()) { request.cancel('abandoned'); return {kind: 'terminated'}; }
        const outcome = await request.outcome;
        if (!live()) return {kind: 'terminated'};
        if (!outcome.ok) return {kind: 'failure', code: failure !== 'AI_UNAVAILABLE' ? failure : outcome.failure === 'invalid_output' ? 'AI_REPLY_REJECTED' : 'AI_UNAVAILABLE'};
        if (!await authorize() || !live()) return live() ? {kind: 'failure', code: failure} : {kind: 'terminated'};
        if (!control.accept(outcome.value.message)) return {kind: 'terminated'};
        return {kind: 'success', value: undefined};
      } catch { return live() ? {kind: 'failure', code: failure} : {kind: 'terminated'}; }
    };
    try {
      if (!live()) stop(false);
      return await Promise.race([stopped, work()]);
    } finally {
      active = false; projection = undefined; abort.abort(); request?.cancel('abandoned');
      lease?.release(); clearTimeout(timer); control.signal.removeEventListener('abort', disconnected);
    }
  }
}
