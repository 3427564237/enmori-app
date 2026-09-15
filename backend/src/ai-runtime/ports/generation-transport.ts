export interface RequestBudget {
  readonly deadline: number;
  readonly signal: AbortSignal;
  remainingMs(): number;
}

/**
 * Input is a caller-owned, already-purpose-authorized projection. This Port
 * does not select a model, construct prompts, tokenize, or grant data access.
 */
export interface GenerationTransport<Input> {
  /**
   * Settlement MUST confirm that the underlying generation has stopped.
   * An abort/HTTP disconnect alone must not settle this promise if generation
   * can still be running. Until confirmation, leave it pending (quarantine).
   * Return raw UTF-8 response bytes; do not parse, repair or log them here.
   * The adapter normalizes failures; raw vendor errors never leave it.
   */
  generate(input: Input, budget: RequestBudget): Promise<Uint8Array>;
}
