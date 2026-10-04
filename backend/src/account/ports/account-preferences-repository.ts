import type { OwnProfile, OwnSettings, ProfileChange, SettingsChange } from "../application/account-model.js";
import type { DependencyUnavailable } from "../../shared/ports/dependency-failure.js";

export type AccountRead<T> = { readonly kind: "found"; readonly value: T }
  | { readonly kind: "onboarding_required" } | DependencyUnavailable;
export type AccountSave<T> = { readonly kind: "saved"; readonly value: T }
  | { readonly kind: "onboarding_required" }
  | { readonly kind: "revision_precondition_failed" } | DependencyUnavailable;

export interface AccountPreferencesRepository {
  getProfile(firebaseUid: string): Promise<AccountRead<OwnProfile>>;
  getSettings(firebaseUid: string): Promise<AccountRead<OwnSettings>>;
  saveProfile(firebaseUid: string, change: ProfileChange): Promise<AccountSave<OwnProfile>>;
  saveSettings(firebaseUid: string, change: SettingsChange): Promise<AccountSave<OwnSettings>>;
}
