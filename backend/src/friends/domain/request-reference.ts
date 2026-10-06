import { Buffer } from "node:buffer";
export const isRequestRef = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export function decodeFriendCursor(cursor: string): string | undefined {
  if (!/^[A-Za-z0-9_-]{48}$/.test(cursor)) return undefined;
  const ref = Buffer.from(cursor, "base64url").toString("utf8");
  return isRequestRef(ref) && Buffer.from(ref).toString("base64url") === cursor ? ref : undefined;
}
