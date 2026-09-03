import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { OnboardingRepository } from "../ports/onboarding-repository.js";
import type { OnboardingStatus } from "./onboarding-model.js";

export class GetOnboarding {
  public constructor(private readonly repository: OnboardingRepository) {}

  public async execute(
    principal: AuthPrincipal,
  ): Promise<Result<OnboardingStatus, AppFailure>> {
    const result = await this.repository.getStatus(principal.firebaseUid);
    switch (result.kind) {
      case "required":
        return ok({ status: "required" });
      case "completed":
        return ok({ status: "completed", account: result.account });
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}
