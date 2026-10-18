/** Content-free observations of the existing controlled adapter. These are not
 * public errors, proof of remote receipt, or authority to release a model lane. */
export const diagnosticStages = [
  "preflight", "preflight_version", "preflight_tags", "preflight_ps",
  "startup_compile", "before_generation_compile", "adapter_compile",
  "generate_dispatch", "generate_response", "generate_done", "output_validation",
] as const;
export const diagnosticStatuses = [
  "started", "passed", "request_failed", "http_failed", "envelope_invalid",
  "version_mismatch", "model_match_failed", "manifest_mismatch", "family_size_mismatch",
  "context_mismatch", "budget_or_authority_lost", "already_invoked", "compile_failed",
  "compiled_input_invalid", "dispatch_attempted", "response_received", "done_confirmed",
  "termination_unconfirmed", "output_invalid",
] as const;
export interface ControlledAiDiagnostic {
  readonly stage: typeof diagnosticStages[number];
  readonly status: typeof diagnosticStatuses[number];
  readonly durationMs: number;
  readonly httpStatus?: number;
}
export type ControlledAiObserver = (event: ControlledAiDiagnostic) => void;

/** Diagnostics must never turn an original pending/failed model call into a
 * settled call. The owning recorder exposes its own failed status separately. */
export function observeControlledAi(observer: ControlledAiObserver | undefined,
  stage: ControlledAiDiagnostic["stage"], status: ControlledAiDiagnostic["status"],
  started: number, httpStatus?: number): void {
  if (!observer) return;
  try {
    observer({ stage, status, durationMs: Math.max(0, performance.now() - started),
      ...(httpStatus === undefined ? {} : { httpStatus }) });
  } catch { /* Never expose a sink error or change original settlement. */ }
}
