import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";

export type InitialChoice = "accept" | "reject";
export type OptionalProcessingConsent = "accepted" | "rejected";
export type CheckInVisibility = "public" | "private";

export interface InitialChoiceProjection {
  readonly initialChoice: InitialChoice;
  readonly optionalProcessingConsent: OptionalProcessingConsent;
  readonly checkInVisibility: CheckInVisibility;
}

export function deriveInitialChoice(
  input: unknown,
): Result<InitialChoiceProjection, AppFailure> {
  if (input === "accept") {
    return ok({
      initialChoice: input,
      optionalProcessingConsent: "accepted",
      checkInVisibility: "public",
    });
  }
  if (input === "reject") {
    return ok({
      initialChoice: input,
      optionalProcessingConsent: "rejected",
      checkInVisibility: "private",
    });
  }
  return err(appFailure("ONBOARDING_CONFLICT"));
}
