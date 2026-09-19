import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { InterestRepository } from "../ports/interest-repository.js";
import type { OwnInterestsProjection } from "./interest-model.js";

export class GetOwnInterests {
  public constructor(private readonly repository: InterestRepository) {}

  public async execute(
    principal: AuthPrincipal,
  ): Promise<Result<OwnInterestsProjection, AppFailure>> {
    const result = await this.repository.getOwn(principal.firebaseUid);
    switch (result.kind) {
      case "found":
        return ok(result.value);
      case "onboarding_required":
        return err(appFailure("ONBOARDING_REQUIRED"));
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}
