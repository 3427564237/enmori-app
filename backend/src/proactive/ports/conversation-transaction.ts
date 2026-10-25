import type { FirstFlowPublish, FirstFlowReservation, FirstFlowResult, FirstFlowSource } from "./first-flow.js";

/** Bound by Infrastructure composition to the SAME transaction as the F0 store.
 * No vendor transaction, token, collection/path or data cache crosses this Port. */
export interface FirstFlowConversationTransaction {
  source(conversationId: string, sourceMessageId: string): Promise<FirstFlowResult<FirstFlowSource>>;
  validate(reservation: FirstFlowReservation): Promise<FirstFlowResult<void>>;
  /** All reads first. Stages canonical append + receipt + parent sequence only;
   * the owning store stages outbox/budget in the same transaction afterward. */
  append(input: FirstFlowPublish): Promise<FirstFlowResult<{ readonly sequence: number }>>;
  readableSequence(conversationId: string, sequence: number): Promise<FirstFlowResult<void>>;
}
