import type { FirestoreGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { AccountRead } from "../ports/account-preferences-repository.js";
import type { AvatarSave, OwnAvatarRepository } from "../ports/own-avatar-repository.js";
import type { AvatarChange, OwnAvatarData } from "../domain/avatar-values.js";
import { isRevision } from "../domain/profile-values.js";
import { resolveAccount } from "./firestore-account-preferences-repository.js";
import { canonicalAvatarPng } from "./avatar-png.js";

function ownAvatar(data: StoredDocument): OwnAvatarData | undefined {
  const fields = ["avatarPngBase64", "avatarSourceSha256", "avatarRevision"];
  if (fields.every(key => !Object.hasOwn(data, key))) return { pngBase64: null, sourceSha256: null, revision: 0 };
  if (!fields.every(key => Object.hasOwn(data, key)) || !isRevision(data.avatarRevision) || data.avatarRevision < 1) return undefined;
  if (data.avatarPngBase64 === null && data.avatarSourceSha256 === null) return { pngBase64: null, sourceSha256: null, revision: data.avatarRevision };
  if (typeof data.avatarPngBase64 !== "string" || typeof data.avatarSourceSha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.avatarSourceSha256)) return undefined;
  const image = canonicalAvatarPng(data.avatarPngBase64);
  if (!image || image.pngBase64 !== data.avatarPngBase64) return undefined;
  // The original upload is intentionally absent. Its digest cannot be
  // recomputed from metadata-free stored bytes and is never replaced on read.
  return { pngBase64: image.pngBase64, sourceSha256: data.avatarSourceSha256, revision: data.avatarRevision };
}

export class FirestoreOwnAvatarRepository implements OwnAvatarRepository {
  constructor(private readonly firestore: FirestoreGateway) {}

  async getAvatar(uid: string): Promise<AccountRead<OwnAvatarData>> {
    try {
      return await this.firestore.runTransaction(async tx => {
        const account = await resolveAccount(tx, uid);
        if (account.kind !== "found") return account;
        const value = ownAvatar(account.data);
        return value ? { kind: "found", value } : dependencyUnavailable;
      }, { maxAttempts: 1 });
    } catch { return dependencyUnavailable; }
  }

  async saveAvatar(uid: string, change: AvatarChange): Promise<AvatarSave> {
    const image = change.pngBase64 === null ? { pngBase64: null, sourceSha256: null } : canonicalAvatarPng(change.pngBase64);
    if (!image || !isRevision(change.expectedRevision)) return { kind: "invalid_image" };
    try {
      return await this.firestore.runTransaction(async tx => {
        const account = await resolveAccount(tx, uid);
        if (account.kind !== "found") return account;
        const current = ownAvatar(account.data);
        if (!current || current.revision === Number.MAX_SAFE_INTEGER) return dependencyUnavailable;
        if (current.revision !== change.expectedRevision) return { kind: "revision_precondition_failed" };
        const value = { ...image, revision: current.revision + 1 };
        tx.set(account.path, { ...account.data, avatarPngBase64: value.pngBase64,
          avatarSourceSha256: value.sourceSha256, avatarRevision: value.revision });
        return { kind: "saved", value };
      }, { maxAttempts: 1 });
    } catch { return dependencyUnavailable; }
  }
}
