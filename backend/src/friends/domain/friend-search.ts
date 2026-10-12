import { Buffer } from "node:buffer";
import { isRequestRef } from "./request-reference.js";

/** FS01: reject unsafe input before ECMAScript trim; never change stored names. */
export function friendSearchKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.isWellFormed() || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)) return undefined;
  const key = normalizeFriendDisplayName(value);
  return [...key].length >= 1 && [...key].length <= 50 ? key : undefined;
}
export function encodeFriendSearchCursor(q: string, after: string): string {
  return Buffer.from(JSON.stringify({ v: 1, q, after }), "utf8").toString("base64url");
}
export function decodeFriendSearchCursor(value: unknown, q: string): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  try {
    const bytes = Buffer.from(value, "base64url");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const data: unknown = JSON.parse(text);
    if (data === null || typeof data !== "object" || Array.isArray(data)) return undefined;
    const record = data as Record<string, unknown>;
    if (record.v !== 1 || record.q !== q || typeof record.after !== "string" || record.after.length !== 36 || !isRequestRef(record.after)) return undefined;
    // Re-encoding also rejects extra/reordered fields, whitespace, escapes and noncanonical base64 bits.
    return encodeFriendSearchCursor(q, record.after) === value ? record.after : undefined;
  } catch { return undefined; }
}
export interface FriendSearchInput { readonly q: string; readonly after?: string }
export function parseFriendSearchInput(input: unknown): FriendSearchInput | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => key !== "q" && key !== "cursor")) return undefined;
  const q = friendSearchKey(data.q);
  if (q === undefined) return undefined;
  if (!Object.hasOwn(data, "cursor")) return { q };
  const after = decodeFriendSearchCursor(data.cursor, q);
  return after === undefined ? undefined : { q, after };
}

// A stored 50-scalar name may expand when lowercased; the query limit is not a name-key limit.
export const normalizeFriendDisplayName = (value: string): string => value.trim().normalize("NFC").toLowerCase().normalize("NFC");
