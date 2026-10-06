import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { err } from "../../shared/domain/result.js";
import { appFailure } from "../../shared/application/app-failure.js";
import type { EventDetailRepository } from "../ports/event-detail-repository.js";
export class GetEventDetail {
  public constructor(private readonly repository: EventDetailRepository) {}
  public async execute(principal: AuthPrincipal, eventId: string) {
    const result = await this.repository.read(principal.firebaseUid, eventId);
    if (result.ok) return result;
    const codes = { onboarding_required: "ONBOARDING_REQUIRED", event_unavailable: "EVENT_UNAVAILABLE", dependency_unavailable: "SERVICE_UNAVAILABLE" } as const;
    return err(appFailure(codes[result.failure]));
  }
}
