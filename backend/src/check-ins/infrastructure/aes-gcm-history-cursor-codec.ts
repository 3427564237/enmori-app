import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isSafeDocumentId, isUtcIsoInstant } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { CheckInHistoryCursorCodec } from "../ports/check-in-history-cursor.js";
import type { HistoryCursor } from "../ports/check-in-history-repository.js";

const PREFIX = Buffer.from("S3H1", "ascii");
const TOKEN_LIMIT = 4096;

export class AesGcmHistoryCursorCodec implements CheckInHistoryCursorCodec {
  public constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error("History cursor key must be 32 bytes");
  }

  public encode(cursor: HistoryCursor): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, nonce);
    cipher.setAAD(PREFIX);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(cursor), "utf8"), cipher.final()]);
    return Buffer.concat([PREFIX, nonce, cipher.getAuthTag(), ciphertext]).toString("base64url");
  }

  public decode(token: string, now: Date): HistoryCursor | undefined {
    if (token.length === 0 || token.length > TOKEN_LIMIT || !/^[A-Za-z0-9_-]+$/.test(token)) return undefined;
    try {
      const packed = Buffer.from(token, "base64url");
      if (packed.toString("base64url") !== token || packed.length < PREFIX.length + 12 + 16 + 2 || !packed.subarray(0, PREFIX.length).equals(PREFIX)) return undefined;
      const nonce = packed.subarray(4, 16);
      const tag = packed.subarray(16, 32);
      const decipher = createDecipheriv("aes-256-gcm", this.key, nonce);
      decipher.setAAD(PREFIX);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(packed.subarray(32)), decipher.final()]).toString("utf8");
      const value: unknown = JSON.parse(plaintext);
      if (!isHistoryCursor(value) || Date.parse(value.expiresAt) <= now.getTime()) return undefined;
      return value;
    } catch {
      return undefined;
    }
  }
}

export function createHistoryCursorCodec(): AesGcmHistoryCursorCodec {
  return new AesGcmHistoryCursorCodec(randomBytes(32));
}

function isHistoryCursor(value: unknown): value is HistoryCursor {
  if (typeof value !== "object" || value === null) return false;
  const cursor = value as Record<string, unknown>;
  return cursor.version === 1 &&
    typeof cursor.ownerAccountId === "string" && isSafeDocumentId(cursor.ownerAccountId) &&
    typeof cursor.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cursor.date) &&
    typeof cursor.timeZone === "string" && cursor.timeZone.length > 0 &&
    typeof cursor.startUtc === "string" && isCanonicalUtc(cursor.startUtc) &&
    (cursor.endUtc === null || (typeof cursor.endUtc === "string" && isCanonicalUtc(cursor.endUtc))) &&
    typeof cursor.lastCreatedAt === "string" && isCanonicalUtc(cursor.lastCreatedAt) &&
    typeof cursor.lastCheckInId === "string" && isSafeDocumentId(cursor.lastCheckInId) &&
    typeof cursor.expiresAt === "string" && isCanonicalUtc(cursor.expiresAt);
}

function isCanonicalUtc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
