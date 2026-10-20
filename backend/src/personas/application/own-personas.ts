import { appFailure, type AppFailure, type AppFailureCode } from "../../shared/application/app-failure.js";
import { err, type Result } from "../../shared/domain/result.js";
import type { AuthPrincipal } from "../../shared/ports/identity-verifier.js";
import { isPersonaCreateKey, isPersonaId, isPersonaRevision, isStateRevision, normalizePersonaInput, type UnknownPersonaInput } from "../domain/persona-values.js";
import type { PersonaFailure, PersonaRepository, PersonaResult } from "../ports/persona-repository.js";
import type { PersonaCreateResult, PersonaRead, PersonaSet } from "./persona-model.js";

type InputFields = UnknownPersonaInput;
interface Preconditions {
  readonly principal: AuthPrincipal;
  readonly personaId: unknown;
  readonly expectedRevision: unknown;
  readonly expectedStateRevision: unknown;
}

const failureCodes: Readonly<Record<PersonaFailure, AppFailureCode>> = {
  onboarding_required: "ONBOARDING_REQUIRED",
  dependency_unavailable: "SERVICE_UNAVAILABLE",
  unavailable: "PERSONA_UNAVAILABLE",
  limit_reached: "PERSONA_LIMIT_REACHED",
  command_conflict: "PERSONA_COMMAND_CONFLICT",
  revision_precondition_failed: "PERSONA_REVISION_PRECONDITION_FAILED",
};

export class OwnPersonas {
  public constructor(private readonly repository: PersonaRepository) {}

  public async list(principal: AuthPrincipal): Promise<Result<PersonaSet, AppFailure>> {
    return this.result(await this.repository.list(principal.firebaseUid));
  }

  public async get(principal: AuthPrincipal, personaId: unknown): Promise<Result<PersonaRead, AppFailure>> {
    if (!isPersonaId(personaId)) return err(appFailure("REQUEST_INVALID"));
    return this.result(await this.repository.get(principal.firebaseUid, personaId));
  }

  public async create(input: InputFields & { readonly principal: AuthPrincipal; readonly idempotencyKey: unknown;
    readonly expectedStateRevision: unknown }): Promise<Result<PersonaCreateResult, AppFailure>> {
    if (!isPersonaCreateKey(input.idempotencyKey)) return err(appFailure("IDEMPOTENCY_KEY_INVALID"));
    const fields = normalizePersonaInput(input);
    if (fields === undefined || !isStateRevision(input.expectedStateRevision)) return err(appFailure("PERSONA_INVALID"));
    return this.result(await this.repository.create(input.principal.firebaseUid, {
      ...fields, idempotencyKey: input.idempotencyKey, expectedStateRevision: input.expectedStateRevision,
    }));
  }

  public async edit(input: InputFields & Preconditions): Promise<Result<PersonaRead, AppFailure>> {
    if (!isPersonaId(input.personaId)) return err(appFailure("REQUEST_INVALID"));
    const fields = normalizePersonaInput(input);
    if (fields === undefined || !isPersonaRevision(input.expectedRevision) || !isStateRevision(input.expectedStateRevision)) {
      return err(appFailure("PERSONA_INVALID"));
    }
    return this.result(await this.repository.edit(input.principal.firebaseUid, {
      ...fields, personaId: input.personaId, expectedRevision: input.expectedRevision, expectedStateRevision: input.expectedStateRevision,
    }));
  }

  public async activate(input: Preconditions): Promise<Result<PersonaSet, AppFailure>> {
    if (!isPersonaId(input.personaId)) return err(appFailure("REQUEST_INVALID"));
    if (!isPersonaRevision(input.expectedRevision) || !isStateRevision(input.expectedStateRevision)) return err(appFailure("PERSONA_INVALID"));
    return this.result(await this.repository.activate(input.principal.firebaseUid, {
      personaId: input.personaId, expectedRevision: input.expectedRevision, expectedStateRevision: input.expectedStateRevision,
    }));
  }

  public async delete(input: Preconditions): Promise<Result<void, AppFailure>> {
    if (!isPersonaId(input.personaId)) return err(appFailure("REQUEST_INVALID"));
    if (!isPersonaRevision(input.expectedRevision) || !isStateRevision(input.expectedStateRevision)) return err(appFailure("PERSONA_INVALID"));
    return this.result(await this.repository.delete(input.principal.firebaseUid, {
      personaId: input.personaId, expectedRevision: input.expectedRevision, expectedStateRevision: input.expectedStateRevision,
    }));
  }

  private result<T>(result: PersonaResult<T>): Result<T, AppFailure> {
    return result.ok ? result : err(appFailure(failureCodes[result.failure]));
  }
}
