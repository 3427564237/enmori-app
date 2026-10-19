import { appFailure, type AppFailure } from "../../shared/application/app-failure.js";
import {
  createAuthoritativeValues,
  readAuthoritativeInstant,
} from "../../shared/application/authoritative-values.js";
import { validateIdempotencyKey } from "../../shared/domain/idempotency-key.js";
import { err, ok, type Result } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import type { OpaqueIdGenerator } from "../../shared/ports/opaque-id-generator.js";
import { normalizeCheckInContent } from "../domain/content.js";
import type { CheckInRepository } from "../ports/check-in-repository.js";
import type { CheckInProjection } from "./check-in-model.js";

export interface CreateCheckInOutput {
  readonly disposition: "created" | "replayed";
  readonly checkIn: CheckInProjection;
}

export class CreateCheckIn {
  public constructor(
    private readonly repository: CheckInRepository,
    private readonly clock: Clock,
    private readonly checkInIdGenerator: OpaqueIdGenerator,
  ) {}

  public async execute(input: {
    readonly principal: AuthPrincipal;
    readonly note: string;
    readonly mood?: string | null;
    readonly activity?: string | null;
    readonly checkInVisibility?: "private" | "friends_only" | "public";
    readonly idempotencyKey: string;
  }): Promise<Result<CreateCheckInOutput, AppFailure>> {
    const content = normalizeCheckInContent(input.note, input.mood, input.activity);
    if (!content.ok) return content;
    if (input.checkInVisibility !== undefined && !["private", "friends_only", "public"].includes(input.checkInVisibility)) return err(appFailure("CHECKIN_INVALID"));

    const key = validateIdempotencyKey(input.idempotencyKey);
    if (!key.ok) return key;

    const currentInstant = readAuthoritativeInstant(this.clock);
    const authoritative = currentInstant.ok
      ? createAuthoritativeValues(
          currentInstant.value,
          this.checkInIdGenerator,
        )
      : currentInstant;

    const result = await this.repository.create({
      firebaseUid: input.principal.firebaseUid,
      note: content.value.note,
      ...(input.mood === undefined ? {} : {mood:content.value.mood}),
      ...(input.activity === undefined ? {} : {activity:content.value.activity}),
      ...(input.checkInVisibility === undefined ? {} : {checkInVisibility:input.checkInVisibility}),
      idempotencyKey: key.value,
      ...(currentInstant.ok ? { currentInstant: currentInstant.value } : {}),
      ...(authoritative.ok
        ? {
            creation: {
              checkInId: authoritative.value.opaqueId,
              createdAt: authoritative.value.occurredAt,
              idempotencyExpiresAt:
                authoritative.value.idempotencyExpiresAt,
            },
          }
        : {}),
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
