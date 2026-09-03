import type {
  CheckInVisibility,
  OptionalProcessingConsent,
} from "../domain/initial-choice.js";

export interface AccountProjection {
  readonly username: string;
  readonly optionalProcessingConsent: OptionalProcessingConsent;
  readonly checkInVisibility: CheckInVisibility;
  readonly onboardingCompletedAt: string;
}

export type OnboardingStatus =
  | { readonly status: "required" }
  | {
      readonly status: "completed";
      readonly account: AccountProjection;
    };
