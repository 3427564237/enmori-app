import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import { validateIdempotencyKey } from "../../shared/domain/idempotency-key.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { normalizeNote } from "../domain/note.js";
import type { CheckInRepository } from "../ports/check-in-repository.js";
import type { CheckInProjection } from "./check-in-model.js";

export interface CreateCheckInOutput {
  readonly disposition: "created" | "replayed";
  readonly checkIn: CheckInProjection;
}

export class CreateCheckIn {
  public constructor(private readonly repository: CheckInRepository) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly note: string;
    readonly idempotencyKey: string;
  }): Promise<Result<CreateCheckInOutput, AppFailure>> {
    const note = normalizeNote(input.note);
    if (!note.ok) return note;

    const key = validateIdempotencyKey(input.idempotencyKey);
    if (!key.ok) return key;

    const result = await this.repository.create({
      firebaseUid: input.principal.firebaseUid,
      note: note.value,
      idempotencyKey: key.value,
    });

    switch (result.kind) {
      case "created":
      case "replayed":
        return ok({
          disposition: result.kind,
          checkIn: result.checkIn,
        });
      case "onboarding_required":
        return err(appFailure("ONBOARDING_REQUIRED"));
      case "idempotency_conflict":
        return err(appFailure("IDEMPOTENCY_CONFLICT"));
      case "dependency_unavailable":
        return err(appFailure("SERVICE_UNAVAILABLE"));
    }
  }
}
