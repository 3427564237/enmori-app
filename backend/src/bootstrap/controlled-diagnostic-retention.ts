import { diagnosticStages, diagnosticStatuses } from "../ai-runtime/infrastructure/controlled-ai-diagnostic.js";
import { CONVERSATION_ERRORS } from "../ai-conversation/transport/register-routes.js";
import { controlledDiagnosticRoutes, type ControlledPhoneDiagnosticRecord } from "./controlled-phone-diagnostics.js";

const day = 24 * 60 * 60 * 1000;
export const diagnosticRetentionMs = 30 * day;
export const diagnosticCleanupAllowanceMs = day;
const keys = ["loggedAt", "requestId", "routeTemplate", "method", "httpStatus", "latencyMs",
  "errorCategory", "dependencyStage", "dependencyStatus", "durationMs"] as const;
function fail(): never { throw new Error("CONTROLLED_DIAGNOSTIC_POLICY_UNAVAILABLE"); }
type Visibility = "readable" | "expired_cleanup_due" | "cleanup_deadline_reached";

/** Q14 policy only. No storage, OS identity, scheduler or physical-deletion
 * implementation is selected here. A live adapter must supply those boundaries.
 * Expiry derives exclusively from the original trusted server loggedAt, never
 * from read time, file mtime, a copied row or cleanup time. */
export class ControlledDiagnosticRetention {
  private lastNow = -1;
  private failed = false;
  constructor(private readonly serverNow: () => number = Date.now) {}
  get healthy(): boolean { return !this.failed; }

  private inspect(value: unknown): { record: Readonly<ControlledPhoneDiagnosticRecord>; visibility: Visibility } {
    if (this.failed) return fail();
    try {
      const now = this.serverNow();
      if (!Number.isSafeInteger(now) || now < 0 || now < this.lastNow || now > 8_640_000_000_000_000) fail();
      this.lastNow = now;
      if (!value || typeof value !== "object" || Array.isArray(value)) fail();
      const fields = Object.getOwnPropertyDescriptors(value);
      if (Reflect.ownKeys(value).some(key => typeof key !== "string" || !keys.includes(key as typeof keys[number]))) fail();
      if (Object.values(fields).some(field => !("value" in field))) fail(); // Never execute stored getters.
      const row = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])) as Record<string, unknown>;
      if (typeof row.loggedAt !== "string") fail();
      const logged = Date.parse(row.loggedAt);
      if (!Number.isSafeInteger(logged) || logged < 0 || logged > now || new Date(logged).toISOString() !== row.loggedAt) fail();
      const present = (key: string) => Object.hasOwn(row, key);
      const number = (key: string) => typeof row[key] === "number" && Number.isFinite(row[key]) && row[key] >= 0;
      const request = ["requestId", "routeTemplate", "method"].filter(present).length;
      if (request !== 0 && request !== 3) fail();
      if (request && (typeof row.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.requestId) ||
          typeof row.routeTemplate !== "string" || controlledDiagnosticRoutes.get(row.routeTemplate) !== row.method)) fail();
      const dependency = ["dependencyStage", "dependencyStatus", "durationMs"].filter(present).length;
      if (dependency !== 0 && dependency !== 3) fail();
      if (dependency && (!diagnosticStages.some(stage => stage === row.dependencyStage) ||
          !diagnosticStatuses.some(status => status === row.dependencyStatus) || !number("durationMs"))) fail();
      if (!request && !dependency) fail();
      if (present("httpStatus") && (!number("httpStatus") || !Number.isInteger(row.httpStatus) || (row.httpStatus as number) < 100 || (row.httpStatus as number) > 599)) fail();
      if (present("latencyMs") && (!request || !present("httpStatus") || !number("latencyMs"))) fail();
      if (present("errorCategory") && (!request || typeof row.errorCategory !== "string" ||
          !Object.hasOwn(CONVERSATION_ERRORS, row.errorCategory) ||
          CONVERSATION_ERRORS[row.errorCategory as keyof typeof CONVERSATION_ERRORS][0] !== row.httpStatus)) fail();
      const age = now - logged;
      const visibility: Visibility = age < diagnosticRetentionMs ? "readable" :
        age < diagnosticRetentionMs + diagnosticCleanupAllowanceMs ? "expired_cleanup_due" : "cleanup_deadline_reached";
      return { record: Object.freeze(row) as unknown as Readonly<ControlledPhoneDiagnosticRecord>, visibility };
    } catch { this.failed = true; return fail(); }
  }

  /** The caller must obtain operatorAllowed from its real out-of-app identity
   * boundary. This boolean is not an identity implementation or a CLI flag. */
  read(value: unknown, operatorAllowed: boolean): Readonly<ControlledPhoneDiagnosticRecord> | undefined {
    if (operatorAllowed !== true) throw new Error("CONTROLLED_DIAGNOSTIC_OPERATOR_REQUIRED");
    const result = this.inspect(value);
    return result.visibility === "readable" ? result.record : undefined;
  }

  cleanupState(value: unknown): Visibility { return this.inspect(value).visibility; }

  /** A failed/unknown physical deletion must prevent subsequent positive work.
   * Calling this with true does not perform deletion or certify the scheduler. */
  observeCleanup(confirmed: boolean): void { if (confirmed !== true) this.failed = true; }
}
