import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { InterestRepository } from "../ports/interest-repository.js";
import type { OwnInterestsProjection } from "./interest-model.js";

export class ReplaceOwnInterests {
  public constructor(private readonly repository: InterestRepository) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly interestTagIds: unknown;
    readonly expectedRevision: unknown;
  }): Promise<Result<OwnInterestsProjection, AppFailure>> {
    if (!isValidSelection(input.interestTagIds, input.expectedRevision)) {
      return err(appFailure("INTEREST_SELECTION_INVALID"));
    }

    const result = await this.repository.replaceOwn({
      firebaseUid: input.principal.firebaseUid,
      interestTagIds: input.interestTagIds,
      expectedRevision: input.expectedRevision as number,
    });
    switch (result.kind) {
      case "saved":
        return ok(result.value);
      case "onboarding_required":
        return err(appFailure("ONBOARDING_REQUIRED"));
      case "selection_invalid":
        return err(appFailure("INTEREST_SELECTION_INVALID"));
      case "revision_precondition_failed":
        return err(appFailure("INTEREST_REVISION_PRECONDITION_FAILED"));
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}

function isValidSelection(
  interestTagIds: unknown,
  expectedRevision: unknown,
): interestTagIds is readonly string[] {
  if (
    !Number.isSafeInteger(expectedRevision) ||
    (expectedRevision as number) < 0 ||
    !Array.isArray(interestTagIds) ||
    interestTagIds.length > 10
  ) {
    return false;
  }
  const ids = interestTagIds as unknown[];
  if (
    ids.some(
      (value) =>
        typeof value !== "string" ||
        value.length === 0 ||
        !value.isWellFormed(),
    )
  ) {
    return false;
  }
  return new Set(ids).size === ids.length;
}
