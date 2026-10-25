/** Offline/synthetic experiment types, NOT a production authorization contract.
 * A result here does not settle GenerationTransport or authorize delivery. */
export interface SyntheticPrompt {
  readonly scope: 'synthetic-evaluation-only';
  readonly system: string;
  readonly turns: readonly { readonly role: 'user' | 'assistant'; readonly text: string }[];
}

export type EvaluationProvider = 'ollama-baseline' | 'gemini-candidate';
export interface EvaluationHttpRequest {
  readonly url: string;
  readonly body: string;
}

/** Credentials and the choice to use a network belong to the isolated runner.
 * Tests inject an in-memory function. No ambient fetch/key lookup is allowed. */
export type EvaluationHttp = (request: EvaluationHttpRequest, signal: AbortSignal) => Promise<Response>;

export interface EvaluationObservation {
  readonly provider: EvaluationProvider;
  readonly outcome: 'response-observed' | 'unconfirmed' | 'not-started';
  readonly elapsedMs: number;
  readonly withinDeliveryDeadline: boolean;
  readonly httpStatus?: number;
  readonly rawBody?: string;
  readonly rawText?: string;
  readonly modelRevision?: string;
  readonly finishReason?: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly thinkingTokens?: number;
    readonly totalTokens?: number;
  };
  readonly failure?: 'invalid-input' | 'cancelled' | 'network-or-receive' | 'http' | 'malformed' | 'blocked' | 'incomplete';
}
