export const AVATAR_MAX_BYTES = 128 * 1024;
export const AVATAR_MAX_SIDE = 256;
export const AVATAR_MAX_BASE64_LENGTH = Math.ceil(AVATAR_MAX_BYTES / 3) * 4;

export interface OwnAvatarData {
  readonly pngBase64: string | null;
  readonly sourceSha256: string | null;
  readonly revision: number;
}

export interface AvatarChange {
  readonly pngBase64: string | null;
  readonly expectedRevision: number;
}
