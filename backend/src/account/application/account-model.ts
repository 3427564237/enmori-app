import type { CloudAiConsent } from '../domain/cloud-ai-consent.js';
import type { ProfileDetails, ProfileDetailsChange, FieldPrivacy } from '../domain/profile-details.js';
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
  readonly cloudAiConsent?: CloudAiConsent;
  readonly defaultCheckInLocation?: boolean;
  readonly defaultCheckInWeather?: boolean;
  readonly homeWeatherAuto?: boolean;
  readonly fieldPrivacy?: FieldPrivacy;
  readonly checkInVisibility: CheckInVisibility;
  readonly optionalProcessingConsent: OptionalProcessingConsent;
  readonly revision: number;
}

export type ProfileChange = Omit<OwnProfile, "username" | "revision" | "details"> & {
  readonly details?: ProfileDetailsChange;
  readonly expectedRevision: number;
};
export type SettingsChange = Omit<OwnSettings, "revision"> & { readonly expectedRevision: number };
