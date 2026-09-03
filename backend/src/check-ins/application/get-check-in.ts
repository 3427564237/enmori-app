import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { CheckInRepository } from "../ports/check-in-repository.js";
import type { CheckInProjection } from "./check-in-model.js";

export class GetCheckIn {
  public constructor(private readonly repository: CheckInRepository) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly checkInId: string;
  }): Promise<Result<CheckInProjection, AppFailure>> {
    const result = await this.repository.findOwned({
      firebaseUid: input.principal.firebaseUid,
      checkInId: input.checkInId,
    });
    switch (result.kind) {
      case "found":
        return ok(result.checkIn);
      case "onboarding_required":
        return err(appFailure("ONBOARDING_REQUIRED"));
      case "not_found_or_not_owned":
        return err(appFailure("CHECKIN_UNAVAILABLE"));
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}
