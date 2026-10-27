import type { FirestoreGateway, StoredDocument } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { dependencyUnavailable } from "../../shared/ports/dependency-failure.js";
import type { AccountRead } from "../ports/account-preferences-repository.js";
import type { AvatarSave, OwnAvatarRepository } from "../ports/own-avatar-repository.js";
import type { AvatarChange, OwnAvatarData, SharedAvatarChange, SharedAvatarData, VisibleAvatarData } from "../domain/avatar-values.js";
import { isRevision } from "../domain/profile-values.js";
import { resolveAccount } from "./firestore-account-preferences-repository.js";
import { canonicalAvatarPng } from "./avatar-png.js";

import { canonicalizeUsername } from "../../onboarding/domain/username.js";
import { isSafeDocumentId, parseAccountProjection } from "../../shared/infrastructure/firebase/firestore-records.js";
import type { SharedAvatarRepository } from "../ports/own-avatar-repository.js";

function visibility(data: StoredDocument): boolean | undefined {
  if (!Object.hasOwn(data, "avatarVisibleToAuthenticatedUsers")) return false;
  return typeof data.avatarVisibleToAuthenticatedUsers === "boolean" ? data.avatarVisibleToAuthenticatedUsers : undefined;
}

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

export class FirestoreOwnAvatarRepository implements OwnAvatarRepository, SharedAvatarRepository {
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
    return this.save(uid, change);
  }

  async getSharedAvatar(uid: string): Promise<AccountRead<SharedAvatarData>> {
    try {
      return await this.firestore.runTransaction(async tx => {
        const account = await resolveAccount(tx, uid);
        if (account.kind !== "found") return account;
        const value = ownAvatar(account.data), visibleToAuthenticatedUsers = visibility(account.data);
        if (!value || visibleToAuthenticatedUsers === undefined || value.pngBase64 === null && visibleToAuthenticatedUsers) return dependencyUnavailable;
        return { kind: "found", value: { ...value, visibleToAuthenticatedUsers } };
      }, { maxAttempts: 1 });
    } catch { return dependencyUnavailable; }
  }

  async getVisibleAvatar(uid: string, username: string): Promise<AccountRead<VisibleAvatarData>> {
    const empty = { kind: "found", value: { pngBase64: null, sourceSha256: null } } as const;
    try {
      return await this.firestore.runTransaction(async tx => {
        const viewer = await resolveAccount(tx, uid);
        if (viewer.kind !== "found") return viewer;
        const name = canonicalizeUsername(username);
        if (!name.ok || name.value !== username) return empty;
        const reservation = await tx.get(`username_reservations/${name.value}`);
        if (!reservation) return empty;
        if (typeof reservation.accountId !== "string" || !isSafeDocumentId(reservation.accountId)) return dependencyUnavailable;
        const target = await tx.get(`accounts/${reservation.accountId}`);
        if (!target) return empty;
        const account = parseAccountProjection(target);
        if (!account || account.username !== username) return dependencyUnavailable;
        const shared = visibility(target);
        if (shared === undefined) return dependencyUnavailable;
        if (!shared) return empty;
        const image = ownAvatar(target);
        if (!image || image.pngBase64 === null) return dependencyUnavailable;
        return { kind: "found", value: { pngBase64: image.pngBase64, sourceSha256: image.sourceSha256 } };
      }, { maxAttempts: 1 });
    } catch { return dependencyUnavailable; }
  }

  async saveSharedAvatar(uid: string, change: SharedAvatarChange) {
    return this.save(uid, change, true);
  }

  private async save(uid: string, change: AvatarChange, shared?: false): Promise<AvatarSave>;
  private async save(uid: string, change: SharedAvatarChange, shared: true): Promise<import("../ports/account-preferences-repository.js").AccountSave<SharedAvatarData> | { readonly kind: "invalid_image" }>;
  private async save(uid: string, change: AvatarChange | SharedAvatarChange, shared = false): Promise<AvatarSave | import("../ports/account-preferences-repository.js").AccountSave<SharedAvatarData>> {
    const visible = shared && "visibleToAuthenticatedUsers" in change ? change.visibleToAuthenticatedUsers : false;
    if (typeof visible !== "boolean" || change.pngBase64 === null && visible) return { kind: "invalid_image" } as const;
    const image = change.pngBase64 === null ? { pngBase64: null, sourceSha256: null } : canonicalAvatarPng(change.pngBase64);
    if (!image || !isRevision(change.expectedRevision)) return { kind: "invalid_image" } as const;
    try {
      return await this.firestore.runTransaction(async tx => {
        const account = await resolveAccount(tx, uid);
        if (account.kind !== "found") return account;
        const current = ownAvatar(account.data);
        if (!current || visibility(account.data) === undefined || current.pngBase64 === null && visibility(account.data) === true || current.revision === Number.MAX_SAFE_INTEGER) return dependencyUnavailable;
        if (current.revision !== change.expectedRevision) return { kind: "revision_precondition_failed" } as const;
        const value = { ...image, revision: current.revision + 1 };
        tx.set(account.path, { ...account.data, avatarPngBase64: value.pngBase64,
          avatarSourceSha256: value.sourceSha256, avatarRevision: value.revision,
          ...(shared || Object.hasOwn(account.data, "avatarVisibleToAuthenticatedUsers") ? { avatarVisibleToAuthenticatedUsers: visible } : {}) });
        return { kind: "saved", value: shared ? { ...value, visibleToAuthenticatedUsers: visible } : value } as const;
      }, { maxAttempts: 1 });
    } catch { return dependencyUnavailable; }
  }
}
