/**
 * Stable, infrastructure-agnostic failure exposed by outbound ports.
 *
 * Adapters must translate provider-specific exceptions and messages to this
 * value. Provider details must not cross the port or be exposed to clients.
 */
export interface DependencyUnavailable {
  readonly kind: "dependency_unavailable";
}

export const dependencyUnavailable: DependencyUnavailable = {
  kind: "dependency_unavailable",
};
