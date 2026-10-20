import type { CapturedContext, PersonaProjection, StartView } from "../ports/conversation-lifecycle.js";
import { copyPersonaProjection } from "./persona-expression.js";

const optionalCheckInFields = ["noteText", "moodLabel", "activityLabel", "weatherConditionLabel"] as const;
function text(value: unknown): value is string { return typeof value === "string" && value.isWellFormed(); }
/** Reject local-time ambiguity; normalize explicit instants to UTC for the projection. */
function utcInstant(value: unknown): number {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) throw new Error("unavailable");
  const instant = Date.parse(value);
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(instant) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error("unavailable");
  return instant;
}

/** Q17/Q19 copy of the synchronous synthetic view; no real producer adapter. */
export function captureContext(view: StartView, asOf: string, currentMessage: string): CapturedContext {
  const instant = utcInstant(asOf);
  if (!text(currentMessage) || !Array.isArray(view.checkIns)) throw new Error("unavailable");
  let persona: PersonaProjection | undefined;
  if (view.persona !== undefined) {
    if (!view.persona || typeof view.persona.ref !== "object" || view.persona.ref === null) throw new Error("unavailable");
    const p = view.persona.projection;
    persona = copyPersonaProjection(p);
    if (!persona) throw new Error("unavailable");
  }
  const selected = view.checkIns.filter(({ source, projection }) => {
    if (source.sourceType !== "check_in" || !text(source.sourceId) || !source.sourceId
      || !optionalCheckInFields.every((field) => !Object.hasOwn(projection, field) || text(projection[field]))) throw new Error("unavailable");
    const time = utcInstant(projection.occurredAt);
    return time <= instant && time >= instant - 7 * 86_400_000;
  }).sort((a, b) => Date.parse(b.projection.occurredAt) - Date.parse(a.projection.occurredAt)
    || (a.source.sourceId < b.source.sourceId ? -1 : a.source.sourceId > b.source.sourceId ? 1 : 0)).slice(0, 5);
  const checkIns = Object.freeze(selected.map(({ projection: p }) => Object.freeze({
    occurredAt: new Date(utcInstant(p.occurredAt)).toISOString(),
    ...(Object.hasOwn(p, "noteText") && p.noteText !== undefined ? { noteText: p.noteText } : {}),
    ...(Object.hasOwn(p, "moodLabel") && p.moodLabel !== undefined ? { moodLabel: p.moodLabel } : {}),
    ...(Object.hasOwn(p, "activityLabel") && p.activityLabel !== undefined ? { activityLabel: p.activityLabel } : {}),
    ...(Object.hasOwn(p, "weatherConditionLabel") && p.weatherConditionLabel !== undefined ? { weatherConditionLabel: p.weatherConditionLabel } : {}),
  })));
  const provenance = Object.freeze(selected.map(({ source }) => Object.freeze({ sourceType: "check_in" as const, sourceId: source.sourceId })));
  return Object.freeze({ asOf: new Date(instant).toISOString(), usedPersona: view.persona?.ref, provenance,
    input: Object.freeze({ currentMessage, checkIns, persona }) });
}
