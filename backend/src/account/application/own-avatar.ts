import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { ok, err, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { OwnAvatarRepository } from "../ports/own-avatar-repository.js";
import { AVATAR_MAX_BASE64_LENGTH, type OwnAvatarData } from "../domain/avatar-values.js";
import { isRevision } from "../domain/profile-values.js";

export class OwnAvatar {
  constructor(private readonly repository: OwnAvatarRepository) {}

  async getAvatar(principal: AuthPrincipal): Promise<Result<OwnAvatarData, AppFailure>> {
    const result = await this.repository.getAvatar(principal.firebaseUid);
    if (result.kind === "found") return ok(result.value);
    return err(appFailure(result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" : "SERVICE_UNAVAILABLE"));
  }

  async saveAvatar(input: { readonly principal: AuthPrincipal; readonly pngBase64: unknown;
    readonly expectedRevision: unknown }): Promise<Result<OwnAvatarData, AppFailure>> {
    if (!isRevision(input.expectedRevision) || !(input.pngBase64 === null ||
        typeof input.pngBase64 === "string" && input.pngBase64.length <= AVATAR_MAX_BASE64_LENGTH)) return err(appFailure("PROFILE_INVALID"));
    const result = await this.repository.saveAvatar(input.principal.firebaseUid,
      { pngBase64: input.pngBase64, expectedRevision: input.expectedRevision });
    if (result.kind === "saved") return ok(result.value);
    return err(appFailure(result.kind === "invalid_image" ? "PROFILE_INVALID" :
      result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" :
      result.kind === "revision_precondition_failed" ? "PROFILE_REVISION_PRECONDITION_FAILED" : "SERVICE_UNAVAILABLE"));
  }
}
