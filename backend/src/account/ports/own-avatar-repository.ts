import type { AvatarChange, OwnAvatarData } from "../domain/avatar-values.js";
import type { AccountRead, AccountSave } from "./account-preferences-repository.js";

export type AvatarSave = AccountSave<OwnAvatarData> | { readonly kind: "invalid_image" };
export interface OwnAvatarRepository {
  getAvatar(firebaseUid: string): Promise<AccountRead<OwnAvatarData>>;
  saveAvatar(firebaseUid: string, change: AvatarChange): Promise<AvatarSave>;
}
