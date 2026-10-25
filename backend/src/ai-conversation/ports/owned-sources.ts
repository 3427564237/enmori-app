export interface OwnedSourceCard {
  readonly cardRef: string;
  readonly kind: "conversation_message" | "check_in";
  readonly version: string;
  readonly sourceOccurredAt: string;
  readonly observedAt: string;
  readonly state: "available";
  readonly canNavigate: true;
}
export interface OwnedMessageAnchor {
  readonly conversationId: string;
  readonly messageId: string;
  readonly sequence: number;
  /** Inner page bound. Transport encodes the existing {v:1,before} cursor. */
  readonly pageBefore: number;
}
export type OwnedSourceTarget = { readonly kind: "conversation_message"; readonly anchor: OwnedMessageAnchor }
  | { readonly kind: "check_in"; readonly checkInId: string };
