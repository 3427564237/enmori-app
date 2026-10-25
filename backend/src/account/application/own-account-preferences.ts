import { parseProfileDetails, parseFieldPrivacy } from '../domain/profile-details.js';
import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { isRevision, isVisibility, normalizeDisplayName } from "../domain/profile-values.js";
import type { AccountPreferencesRepository, AccountRead, AccountSave } from "../ports/account-preferences-repository.js";
import type { OwnProfile, OwnSettings } from "./account-model.js";
import type { OwnAvatar } from "./own-avatar.js";
import type { OwnAvatarData } from "../domain/avatar-values.js";

export class OwnAccountPreferences {
  public constructor(private readonly repository: AccountPreferencesRepository, private readonly avatar?: OwnAvatar) {}

  public getAvatar(principal: AuthPrincipal): Promise<Result<OwnAvatarData, AppFailure>> {
    return this.avatar?.getAvatar(principal) ?? Promise.resolve(err(appFailure("SERVICE_UNAVAILABLE")));
  }

  public saveAvatar(input: Parameters<OwnAvatar["saveAvatar"]>[0]): Promise<Result<OwnAvatarData, AppFailure>> {
    return this.avatar?.saveAvatar(input) ?? Promise.resolve(err(appFailure("SERVICE_UNAVAILABLE")));
  }

  public async getProfile(principal: AuthPrincipal): Promise<Result<OwnProfile, AppFailure>> {
    return this.readResult(await this.repository.getProfile(principal.firebaseUid));
  }

  public async getSettings(principal: AuthPrincipal): Promise<Result<OwnSettings, AppFailure>> {
    return this.readResult(await this.repository.getSettings(principal.firebaseUid));
  }

  public async saveProfile(input: { readonly principal: AuthPrincipal; readonly displayName: unknown;
    readonly profileVisibility: unknown; readonly details?: unknown; readonly expectedRevision: unknown }): Promise<Result<OwnProfile, AppFailure>> {
    const displayName = normalizeDisplayName(input.displayName);
    const details = input.details === undefined ? undefined : parseProfileDetails(input.details);
    if (input.details !== undefined && details === undefined) return err(appFailure("PROFILE_INVALID"));
    if (displayName === undefined || !isVisibility(input.profileVisibility) || !isRevision(input.expectedRevision)) {
      return err(appFailure("PROFILE_INVALID"));
    }
    return this.saveResult(await this.repository.saveProfile(input.principal.firebaseUid, {
      ...(details === undefined ? {} : { details }), displayName, profileVisibility: input.profileVisibility, expectedRevision: input.expectedRevision,
    }), "PROFILE_REVISION_PRECONDITION_FAILED");
  }

  public async saveSettings(input: { readonly principal: AuthPrincipal; readonly checkInVisibility: unknown;
    readonly defaultCheckInLocation?: unknown; readonly defaultCheckInWeather?: unknown; readonly homeWeatherAuto?: unknown;
    readonly optionalProcessingConsent: unknown; readonly fieldPrivacy?: unknown; readonly expectedRevision: unknown }): Promise<Result<OwnSettings, AppFailure>> {
    if ([input.defaultCheckInLocation, input.defaultCheckInWeather, input.homeWeatherAuto].some(v => v !== undefined && typeof v !== "boolean")) return err(appFailure("SETTINGS_INVALID"));
    const fieldPrivacy = input.fieldPrivacy === undefined ? undefined : parseFieldPrivacy(input.fieldPrivacy);
    if (input.fieldPrivacy !== undefined && fieldPrivacy === undefined) return err(appFailure("SETTINGS_INVALID"));
    if (!isVisibility(input.checkInVisibility) || !isRevision(input.expectedRevision) ||
      (input.optionalProcessingConsent !== "accepted" && input.optionalProcessingConsent !== "rejected")) {
      return err(appFailure("SETTINGS_INVALID"));
    }
    return this.saveResult(await this.repository.saveSettings(input.principal.firebaseUid, {
      ...(input.defaultCheckInLocation === undefined ? {} : { defaultCheckInLocation: input.defaultCheckInLocation as boolean }),
      ...(input.defaultCheckInWeather === undefined ? {} : { defaultCheckInWeather: input.defaultCheckInWeather as boolean }),
      ...(input.homeWeatherAuto === undefined ? {} : { homeWeatherAuto: input.homeWeatherAuto as boolean }),
      ...(fieldPrivacy === undefined ? {} : { fieldPrivacy }), checkInVisibility: input.checkInVisibility, optionalProcessingConsent: input.optionalProcessingConsent,
      expectedRevision: input.expectedRevision,
    }), "SETTINGS_REVISION_PRECONDITION_FAILED");
  }

  private readResult<T>(result: AccountRead<T>): Result<T, AppFailure> {
    if (result.kind === "found") return ok(result.value);
    return err(appFailure(result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" : "SERVICE_UNAVAILABLE"));
  }

  private saveResult<T>(result: AccountSave<T>, stale: "PROFILE_REVISION_PRECONDITION_FAILED" | "SETTINGS_REVISION_PRECONDITION_FAILED"): Result<T, AppFailure> {
    if (result.kind === "saved") return ok(result.value);
    return err(appFailure(result.kind === "onboarding_required" ? "ONBOARDING_REQUIRED" :
      result.kind === "revision_precondition_failed" ? stale : "SERVICE_UNAVAILABLE"));
  }
}
