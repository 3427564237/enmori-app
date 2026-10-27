import type { AvatarChange, OwnAvatarData } from "../domain/avatar-values.js";
import type { AccountRead, AccountSave } from "./account-preferences-repository.js";

export type AvatarSave = AccountSave<OwnAvatarData> | { readonly kind: "invalid_image" };
export interface OwnAvatarRepository {
  getAvatar(firebaseUid: string): Promise<AccountRead<OwnAvatarData>>;
  saveAvatar(firebaseUid: string, change: AvatarChange): Promise<AvatarSave>;
}

export interface SharedAvatarRepository {
  getSharedAvatar(uid: string): Promise<AccountRead<import("../domain/avatar-values.js").SharedAvatarData>>;
  saveSharedAvatar(uid: string, change: import("../domain/avatar-values.js").SharedAvatarChange): Promise<AccountSave<import("../domain/avatar-values.js").SharedAvatarData> | { readonly kind: "invalid_image" }>;
  getVisibleAvatar(uid: string, username: string): Promise<AccountRead<import("../domain/avatar-values.js").VisibleAvatarData>>;
}
