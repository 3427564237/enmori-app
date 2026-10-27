import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { ok, err, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { OwnAvatarRepository } from "../ports/own-avatar-repository.js";
import { AVATAR_MAX_BASE64_LENGTH, type OwnAvatarData } from "../domain/avatar-values.js";
import { isRevision } from "../domain/profile-values.js";

export class OwnAvatar {
  constructor(private readonly repository: OwnAvatarRepository & Partial<import("../ports/own-avatar-repository.js").SharedAvatarRepository>) {}

  async getSharedAvatar(principal: AuthPrincipal) {
    if (!this.repository.getSharedAvatar) return err(appFailure("SERVICE_UNAVAILABLE"));
    const result = await this.repository.getSharedAvatar(principal.firebaseUid);
    return result.kind === "found" ? ok(result.value) : err(appFailure(result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" : "SERVICE_UNAVAILABLE"));
  }

  async getVisibleAvatar(principal: AuthPrincipal, username: string) {
    if (!this.repository.getVisibleAvatar) return err(appFailure("SERVICE_UNAVAILABLE"));
    const result = await this.repository.getVisibleAvatar(principal.firebaseUid, username);
    return result.kind === "found" ? ok(result.value) : err(appFailure(result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" : "SERVICE_UNAVAILABLE"));
  }

  async saveSharedAvatar(input: { principal: AuthPrincipal; pngBase64: unknown; expectedRevision: unknown; visibleToAuthenticatedUsers: unknown }) {
    if (!this.repository.saveSharedAvatar) return err(appFailure("SERVICE_UNAVAILABLE"));
    if (!isRevision(input.expectedRevision) || typeof input.visibleToAuthenticatedUsers !== "boolean" ||
        !(input.pngBase64 === null || typeof input.pngBase64 === "string" && input.pngBase64.length <= AVATAR_MAX_BASE64_LENGTH) ||
        input.pngBase64 === null && input.visibleToAuthenticatedUsers) return err(appFailure("PROFILE_INVALID"));
    const result = await this.repository.saveSharedAvatar(input.principal.firebaseUid, { pngBase64: input.pngBase64,
      expectedRevision: input.expectedRevision, visibleToAuthenticatedUsers: input.visibleToAuthenticatedUsers });
    if (result.kind === "saved") return ok(result.value);
    return err(appFailure(result.kind === "invalid_image" ? "PROFILE_INVALID" : result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" :
      result.kind === "revision_precondition_failed" ? "PROFILE_REVISION_PRECONDITION_FAILED" : "SERVICE_UNAVAILABLE"));
  }

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
