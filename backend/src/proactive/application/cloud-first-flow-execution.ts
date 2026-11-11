import { OPENAI_CLOUD_PROCESSING } from '../../account/domain/cloud-ai-consent.js';
import type { CloudAiConsentAuthority, CloudConsentObservation } from '../../account/ports/cloud-ai-consent-authority.js';
import type { AsyncConversationModelInput } from '../../ai-conversation/ports/async-conversation.js';
import type { BoundedAiRuntime, RuntimeRequest } from '../../ai-runtime/application/bounded-ai-runtime.js';
import type { RequestBudget } from '../../ai-runtime/ports/generation-transport.js';
import type { PersonaPreviewAuthority } from '../../personas/ports/persona-preview-authority.js';
import { firstFlowPurposeGeneration, type FirstFlowCloudExecution, type FirstFlowCloudRun,
  type FirstFlowIntent, type FirstFlowModelInput, type FirstFlowResult, type ProactiveActor } from '../ports/first-flow.js';

type Lease = Extract<CloudConsentObservation,{kind:'authorized'}>;

/** One logical F0 execution on the SAME runtime as chat/preview. No model
 * connection or cost/quota owner is constructed here. Unknown never means
 * physical stop, and this class has no persistence or notification capability. */
export class CloudFirstFlowExecution implements FirstFlowCloudExecution {
  constructor(private readonly authority: PersonaPreviewAuthority,
    private readonly consent: CloudAiConsentAuthority,
    private readonly runtime: BoundedAiRuntime<AsyncConversationModelInput>) {
    if (consent.processing?.provider !== 'openai' || consent.processing.disclosureVersion !== 'openai_cloud_v1')
      throw Error('OpenAI proactive consent authority required');
  }

  async open(actor: ProactiveActor, intent: FirstFlowIntent, budget: RequestBudget): Promise<FirstFlowResult<FirstFlowCloudRun>> {
    if (intent.processing !== 'cloud' || intent.provider !== 'openai' || intent.disclosureVersion !== 'openai_cloud_v1' ||
        !Number.isSafeInteger(intent.cloudAiConsentGeneration) || intent.cloudAiConsentGeneration! < 0)
      return {kind:'denied'};
    const purpose = firstFlowPurposeGeneration(intent.authorizationScope);
    if (purpose === undefined) return {kind:'denied'};
    let active = true, owner: string | undefined, lease: Lease | undefined, request: RuntimeRequest | undefined;
    let projection: FirstFlowModelInput | undefined, used = false;
    const live = () => { try { return active && !budget.signal.aborted && budget.remainingMs() > 0 && actor.current() && (!lease || lease.current()); } catch { return false; } };
    const release = () => {active=false;projection=undefined;request?.cancel('abandoned');lease?.release();};
    budget.signal.addEventListener('abort',release,{once:true});
    const checkAuthority = async (): Promise<boolean> => {
      try {
        if (!live()) return false;
        const auth = await actor.verifyCurrentAuth();
        if (!live() || auth.kind !== 'verified' || auth.principal.firebaseUid !== actor.principal.firebaseUid) return false;
        const account = await this.authority.read(auth.principal);
        if (!live() || account.kind !== 'success' || account.value.purposeRevocationGeneration !== purpose ||
            owner !== undefined && owner !== account.value.ownerId) return false;
        const next = await this.consent.read(auth.principal,account.value.ownerId,live,budget.signal);
        if (next.kind !== 'authorized') return false;
        if (!live() || !next.current() || next.generation !== intent.cloudAiConsentGeneration || next.purposeGeneration !== purpose) {
          next.release();return false;
        }
        lease?.release();lease=next;owner=account.value.ownerId;return true;
      } catch {return false;}
    };
    // A metadata wait cannot extend the logical execution deadline. Its late
    // observation still runs the checks above and releases any borrowed lease.
    const verify = async (): Promise<boolean> => {
      if (!live()) return false;
      let stop!: () => void;
      const aborted = new Promise<boolean>(resolve => {stop=()=>resolve(false);budget.signal.addEventListener('abort',stop,{once:true});});
      try { return await Promise.race([checkAuthority(),aborted]); }
      finally { budget.signal.removeEventListener('abort',stop); }
    };
    const allowed = await verify();
    if (!allowed || !live()) {release();budget.signal.removeEventListener('abort',release);return {kind:'denied'};}
    const run: FirstFlowCloudRun = {
      current: () => {try{return live() && lease?.current() === true;}catch{return false;}}, verify,
      release: () => {release();budget.signal.removeEventListener('abort',release);},
      generate: async (input,checkpoint) => {
        if (used || !live() || !owner) return {kind:'denied'};
        used=true;projection=structuredClone(input);
        const authorize = async () => await verify() && live() && await checkpoint() && live();
        const handle: AsyncConversationModelInput = Object.freeze({processing:'cloud',...OPENAI_CLOUD_PROCESSING,
          monetaryConsumer:'proactive',cloudConsentCurrent:run.current,authorize,projection:()=>undefined,
          proactiveProjection:()=>run.current()?projection:undefined});
        try {
          const admitted=this.runtime.submit(owner,{purpose:'ai_assistant_message_v1',
            prepare:async()=>{if(!await authorize())throw Error('Proactive authority unavailable');return handle;},
            checkCandidate:async()=>await authorize()?{ok:true,value:undefined}:{ok:false,failure:'stale_authority'}});
          if(!admitted.accepted)return {kind:'unavailable'};
          request=admitted.request;
          if(!live())request.cancel('abandoned');
          const outcome=await request.outcome;
          if(!live())return {kind:'terminated'};
          if(!outcome.ok)return {kind:outcome.failure==='stale_authority'?'denied':'unknown'};
          if(!await authorize())return {kind:'denied'};
          return {kind:'ok',value:new TextEncoder().encode(JSON.stringify({schemaVersion:'ai_assistant_message_v1',message:outcome.value.message}))};
        } catch {return {kind:'unknown'};}
        finally {projection=undefined;request?.cancel('abandoned');request=undefined;}
      },
    };
    return {kind:'ok',value:run};
  }
}
