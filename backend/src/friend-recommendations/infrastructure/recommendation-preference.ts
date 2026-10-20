import { createHash } from "node:crypto";
import { fail, type Reader } from "../../friends/infrastructure/social-authority.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";

export const preferenceCollection = "friend_recommendation_preferences";
export function preferenceKey(owner: string, target: string): string {
  if (!isSafeDocumentId(owner) || !isSafeDocumentId(target) || owner === target) return fail("SERVICE_UNAVAILABLE");
  return createHash("sha256").update(JSON.stringify(["friend-ignore-v1", owner, target])).digest("hex");
}
export function preferenceVersion(owner: string, target: string, revision: number): string {
  return createHash("sha256").update(JSON.stringify([preferenceKey(owner, target), revision])).digest("hex");
}
export function parsePreference(data: StoredDocument, owner?: string, target?: string) {
  const keys = ["ownerAccountId", "targetAccountId", "ignored", "revision"];
  if (Object.keys(data).length !== keys.length || !Object.keys(data).every(key => keys.includes(key)) ||
      typeof data.ownerAccountId !== "string" || typeof data.targetAccountId !== "string" ||
      !isSafeDocumentId(data.ownerAccountId) || !isSafeDocumentId(data.targetAccountId) ||
      data.ownerAccountId === data.targetAccountId || typeof data.ignored !== "boolean" ||
      !Number.isSafeInteger(data.revision) || Number(data.revision) < 1 || Number(data.revision) >= Number.MAX_SAFE_INTEGER ||
      (owner !== undefined && data.ownerAccountId !== owner) || (target !== undefined && data.targetAccountId !== target)) {
    return fail("SERVICE_UNAVAILABLE");
  }
  return { ownerAccountId: data.ownerAccountId, targetAccountId: data.targetAccountId,
    ignored: data.ignored, revision: Number(data.revision) };
}
export async function readPreference(reader: Reader, owner: string, target: string) {
  const path = `${preferenceCollection}/${preferenceKey(owner, target)}`, data = await reader.get(path);
  return { path, ...(data === undefined ? { ignored: false, revision: 0 } : parsePreference(data, owner, target)) };
}
