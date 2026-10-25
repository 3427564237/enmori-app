import { crc32, deflateSync } from "node:zlib";
import { createAuthBindingDocumentId } from "../../src/shared/infrastructure/firebase/firestore-records.js";
import { MetadataFirestoreGateway } from "../support/metadata-firestore-gateway.js";
import { FirestoreOwnAvatarRepository } from "../../src/account/infrastructure/firestore-own-avatar-repository.js";
import { OwnAvatar } from "../../src/account/application/own-avatar.js";

export const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function pngChunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const typeBytes = Buffer.from(type, "ascii"), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}
export function png(options: { width?: number; height?: number; depth?: number; color?: number;
  compression?: number; filterMethod?: number; interlace?: number; raw?: Buffer; compressed?: Buffer;
  before?: Buffer[]; after?: Buffer[]; split?: boolean } = {}): Buffer {
  const width = options.width ?? 2, height = options.height ?? width, color = options.color ?? 6;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = options.depth ?? 8; header[9] = color; header[10] = options.compression ?? 0;
  header[11] = options.filterMethod ?? 0; header[12] = options.interlace ?? 0;
  const raw = options.raw ?? Buffer.alloc(height * (width * (color === 2 ? 3 : 4) + 1));
  const data = options.compressed ?? deflateSync(raw, { level: 1 });
  const parts = options.split ? [data.subarray(0, 2), Buffer.alloc(0), data.subarray(2)] : [data];
  return Buffer.concat([pngSignature, pngChunk("IHDR", header), ...(options.before ?? []),
    ...parts.map(part => pngChunk("IDAT", part)), ...(options.after ?? []), pngChunk("IEND")]);
}
export function chunks(bytes: Buffer): { type: string; data: Buffer }[] {
  const result: { type: string; data: Buffer }[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    result.push({ type: bytes.toString("ascii", offset + 4, offset + 8), data: bytes.subarray(offset + 8, offset + 8 + size) });
    offset += size + 12;
  }
  return result;
}
export const uid = "synthetic-avatar-owner";
export const principal = { firebaseUid: uid };
export const baseAccount = { username: "avatar_owner", optionalProcessingConsent: "rejected", checkInVisibility: "private",
  onboardingCompletedAt: "2026-10-25T00:00:00.000Z", profileRevision: 3, displayName: "Owner", profileVisibility: "private",
  settingsRevision: 7, purposeRevocationGeneration: 2, unrelated: { preserve: true } };
export const bindingPath = `auth_bindings/${createAuthBindingDocumentId(uid)!}`;
export function avatarFixture(extra: Record<string, unknown> = {}) {
  const store = new MetadataFirestoreGateway(1_793_000_000_000);
  store.put(bindingPath, { accountId: "owner" });
  store.put("accounts/owner", { ...baseAccount, ...extra });
  store.put(`auth_bindings/${createAuthBindingDocumentId("synthetic-avatar-other")!}`, { accountId: "other" });
  store.put("accounts/other", { ...baseAccount, username: "avatar_other" });
  const repository = new FirestoreOwnAvatarRepository(store);
  return { store, repository, use: new OwnAvatar(repository) };
}
