export interface PersonaInput {
  readonly displayName: string;
  readonly tone: "neutral" | "warm" | "encouraging";
  readonly responseLength: "concise" | "balanced" | "detailed";
  readonly formatStyle: "plain" | "bulleted";
}

export interface PersonaView extends PersonaInput {
  readonly personaId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export interface PersonaSet {
  readonly items: readonly PersonaView[];
  readonly stateRevision: number;
  readonly activePersonaId?: string;
}

export interface PersonaRead {
  readonly persona: PersonaView;
  readonly stateRevision: number;
}

export interface PersonaCreateResult extends PersonaRead {
  readonly created: boolean;
}

export interface PersonaPreconditions {
  readonly personaId: string;
  readonly expectedRevision: number;
  readonly expectedStateRevision: number;
}

export interface PersonaCreate extends PersonaInput {
  readonly idempotencyKey: string;
  readonly expectedStateRevision: number;
}

export interface PersonaEdit extends PersonaInput, PersonaPreconditions {}
