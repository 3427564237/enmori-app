import { BoundedAiRuntime } from '../ai-runtime/application/bounded-ai-runtime.js';
import { CloudAdmissionOwner } from '../ai-runtime/application/cloud-admission-owner.js';
import { FirestoreCloudQuotaAuthority, type CloudQuotaPolicy } from '../ai-runtime/infrastructure/firestore-cloud-quota-authority.js';
import { GroqCloudTransport, type GroqMessage, type GroqTransportConfiguration } from '../ai-runtime/infrastructure/groq-cloud-transport.js';
import { GroqChatTransport } from '../ai-runtime/infrastructure/groq-chat-transport.js';
import { AuthorizedAsyncCloudConversationTransport, type CloudConversationConsent } from '../ai-conversation/application/async-cloud-conversation-transport.js';
import type { RuntimeEpoch } from '../ai-conversation/ports/real-conversation-store.js';
import type { RuntimeClock } from '../ai-runtime/ports/runtime-clock.js';
import type { FirestoreGateway } from '../shared/infrastructure/firebase/firestore-gateway.js';

/** Explicit, initially closed construction only. No environment/credential
 * lookup, network default, Firestore initialization, route or service wiring.
 * Real enabling requires verified token framing, cloud consent/provenance,
 * exclusive host ownership and a model that passed its acceptance gates. */
export function createCloudConversationRuntime(options: {
  readonly gateway: FirestoreGateway; readonly epoch: RuntimeEpoch; readonly scope: string;
  readonly policy: CloudQuotaPolicy; readonly clock: RuntimeClock; readonly utcMilliseconds: () => number;
  readonly ownsHost: () => boolean; readonly apiKey: string; readonly configuration: GroqTransportConfiguration;
  readonly inputTokenUpperBound: (messages: readonly GroqMessage[]) => number;
  readonly cloudConsent: CloudConversationConsent; readonly http: typeof fetch;
}) {
  const authority = new FirestoreCloudQuotaAuthority(options.gateway, options.epoch, options.scope, options.configuration.model,
    options.policy, options.clock, options.utcMilliseconds, options.ownsHost);
  const http = new GroqCloudTransport(options.apiKey, options.configuration, options.clock, options.http, {
    inputTokenUpperBound: options.inputTokenUpperBound,
    reservedTokens: authority.reservedTokensPerRequest,
    available: () => authority.canDispatch(),
    rateLimited: seconds => authority.blockRateLimit(seconds),
  });
  const transport = new AuthorizedAsyncCloudConversationTransport(new GroqChatTransport(http), options.cloudConsent);
  const owner = new CloudAdmissionOwner(options.clock, transport, authority,
    { ...options.policy.day, tokensPerRequest: options.policy.tokensPerRequest });
  const runtime = new BoundedAiRuntime(options.clock, { kind: 'cloud', owner }, true);
  return { runtime, owner, authority };
}
