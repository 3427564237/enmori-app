import type { ProfileDetails, FieldPrivacy } from '../domain/profile-details.js';
import type { ProfileVisibility } from "../domain/profile-values.js";
import type { OptionalProcessingConsent, CheckInVisibility } from "../../onboarding/domain/initial-choice.js";

export interface OwnProfile {
  readonly details?: ProfileDetails;
  readonly username: string;
  readonly displayName: string | null;
  readonly profileVisibility: ProfileVisibility;
  readonly revision: number;
}

export interface OwnSettings {
  readonly fieldPrivacy?: FieldPrivacy;
  readonly checkInVisibility: CheckInVisibility;
  readonly optionalProcessingConsent: OptionalProcessingConsent;
  readonly revision: number;
}

export type ProfileChange = Omit<OwnProfile, "username" | "revision"> & { readonly expectedRevision: number };
export type SettingsChange = Omit<OwnSettings, "revision"> & { readonly expectedRevision: number };
