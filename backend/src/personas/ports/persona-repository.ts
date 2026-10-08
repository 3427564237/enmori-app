import type { Result } from "../../shared/domain/result.js";
import type { PersonaCreate, PersonaCreateResult, PersonaEdit, PersonaPreconditions, PersonaRead, PersonaSet } from "../application/persona-model.js";

export type PersonaFailure = "onboarding_required" | "dependency_unavailable" | "unavailable" |
  "limit_reached" | "command_conflict" | "revision_precondition_failed";
export type PersonaResult<T> = Result<T, PersonaFailure>;

/** Each operation reauthorizes the UID and returns one coherent transaction snapshot. */
export interface PersonaRepository {
  list(firebaseUid: string): Promise<PersonaResult<PersonaSet>>;
  get(firebaseUid: string, personaId: string): Promise<PersonaResult<PersonaRead>>;
  create(firebaseUid: string, input: PersonaCreate): Promise<PersonaResult<PersonaCreateResult>>;
  edit(firebaseUid: string, input: PersonaEdit): Promise<PersonaResult<PersonaRead>>;
  activate(firebaseUid: string, input: PersonaPreconditions): Promise<PersonaResult<PersonaSet>>;
  delete(firebaseUid: string, input: PersonaPreconditions): Promise<PersonaResult<void>>;
}
