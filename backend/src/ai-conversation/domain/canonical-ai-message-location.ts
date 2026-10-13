/**
 * Selected N02/C-A collection-group ancestor validation. The input is a
 * database-relative document path from an already bound Infrastructure client,
 * never a public route, decoded URL or proof of ownership/cleanup permission.
 * Returned identities are private, ephemeral references; do not log them.
 */
export type CanonicalAiMessageCollection = "messages" | "message_sources";

export interface CanonicalAiMessageLocation {
  readonly ownerAccountId: string;
  readonly conversationId: string;
  readonly collection: CanonicalAiMessageCollection;
  readonly messageId: string;
}

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

/**
 * A canonical path may refer to a missing parent or a missing document. Those
 * cases require separate authoritative reads and completed writer fencing.
 * Parsing cannot certify availability, provenance validity or safe deletion.
 */
export function parseCanonicalAiMessageLocation(
  path: unknown,
  collection: CanonicalAiMessageCollection,
): CanonicalAiMessageLocation | undefined {
  if (typeof path !== "string" ||
      (collection !== "messages" && collection !== "message_sources")) return undefined;
  const parts = path.split("/");
  if (parts.length !== 6 || parts[0] !== "accounts" || parts[2] !== "conversations" ||
      parts[4] !== collection) return undefined;
  const ownerAccountId = parts[1];
  const conversationId = parts[3];
  const messageId = parts[5];
  if (ownerAccountId === undefined || conversationId === undefined || messageId === undefined ||
      !uuidV4.test(ownerAccountId) || !uuidV4.test(conversationId) || !uuidV4.test(messageId)) return undefined;
  return Object.freeze({ ownerAccountId, conversationId, collection, messageId });
}
