import type { AdminRuntimeStatus, ServiceObservation, ServiceStatus } from '../ports/admin-repository.js';
export class RuntimeStatus implements AdminRuntimeStatus {
  constructor(private readonly ai: () => {configured: boolean; available: boolean; maintenanceHealthy: boolean},
    private readonly providers: () => readonly ServiceObservation[], private readonly eventsConfigured: boolean,
    private readonly auditHealthy: () => boolean, private readonly now: () => number = Date.now) {}
  read() {
    const now = this.now(), observedAt = new Date(now).toISOString(), ai = this.ai();
    const services: ServiceStatus[] = [
      {service: 'backend', configured: true, state: this.auditHealthy() ? 'ready' : 'unavailable', lastObservedAt: observedAt,
        ...(!this.auditHealthy() ? {reason: 'maintenance_unavailable' as const} : {})},
      // This page is reached only after fresh Firebase enabled-user/Admin verification.
      {service: 'firebase', configured: true, state: 'ready', lastObservedAt: observedAt, lastSucceededAt: observedAt},
      {service: 'ai', configured: ai.configured, state: !ai.configured ? 'disabled' : ai.available && ai.maintenanceHealthy ? 'ready' : 'unavailable', lastObservedAt: observedAt,
        ...(!ai.configured ? {reason: 'not_configured' as const} : !ai.maintenanceHealthy ? {reason: 'maintenance_unavailable' as const} : !ai.available ? {reason: 'dependency_unavailable' as const} : {})},
    ];
    const observations = this.providers();
    for (const provider of ['ticketmaster','onepa'] as const) {
      const value = observations.find(v => v.provider === provider);
      const valid = value && Number.isFinite(Date.parse(value.lastObservedAt)) && Date.parse(value.lastObservedAt) <= now;
      const stale = valid && now - Date.parse(value.lastObservedAt) > 5 * 60000;
      services.push({service: provider, configured: this.eventsConfigured,
        state: !this.eventsConfigured ? 'disabled' : !valid || stale ? 'unknown' : value.available ? 'ready' : 'unavailable',
        ...(valid ? {lastObservedAt: value.lastObservedAt, ...(value.lastSucceededAt ? {lastSucceededAt: value.lastSucceededAt} : {})} : {}),
        ...(!this.eventsConfigured ? {reason: 'not_configured' as const} : !valid ? {reason: 'not_observed' as const} : stale ? {reason: 'stale_observation' as const} : !value.available ? {reason: 'dependency_unavailable' as const} : {})});
    }
    return {observedAt, services};
  }
}
