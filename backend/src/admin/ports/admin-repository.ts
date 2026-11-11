export interface EventCategory {
  readonly eventCategoryId: string;
  readonly displayName: string;
  readonly lifecycleState: 'active' | 'inactive';
  readonly revision: number;
}
export type ManagedCategory = Omit<EventCategory, 'revision'>;
export interface EventClassification {
  readonly eventId: string;
  readonly revision: number;
  readonly eventCategoryId?: string;
  readonly displayName?: string;
  readonly lifecycleState?: 'active' | 'inactive';
}
export interface OperationRecord {
  readonly recordId: string;
  readonly occurredAt: string;
  readonly expiresAt: string;
  readonly actorAdminUid: string;
  readonly targetType: 'interest_tag' | 'event_category' | 'event_category_assignment';
  readonly targetId: string;
  readonly operation: 'create' | 'rename' | 'deactivate' | 'restore' | 'assign' | 'clear';
  readonly beforeRevision?: number;
  readonly afterRevision: number;
  readonly result: 'committed';
}
export type CatalogueFailure = 'not_found' | 'name_conflict' | 'state_conflict' | 'revision_precondition_failed' | 'unavailable';
export type AdminResult<T> = {readonly kind: 'success'; readonly value: T} | {readonly kind: CatalogueFailure};
export interface EventCategoryProjection {
  /** Call only after the containing Event has passed its existing read authority. */
  readMany(eventIds: readonly string[]): Promise<ReadonlyMap<string, ManagedCategory>>;
}
export interface AdminRepository extends EventCategoryProjection {
  categories(): Promise<AdminResult<readonly EventCategory[]>>;
  create(actor: string, displayName: string, comparisonKey: string): Promise<AdminResult<EventCategory>>;
  change(actor: string, id: string, revision: number, change: {displayName: string; comparisonKey: string} | {lifecycleState: 'active' | 'inactive'}): Promise<AdminResult<EventCategory>>;
  classification(eventId: string): Promise<AdminResult<EventClassification>>;
  assign(actor: string, eventId: string, revision: number, categoryId?: string): Promise<AdminResult<EventClassification>>;
  records(cursor?: string): Promise<AdminResult<{readonly records: readonly OperationRecord[]; readonly nextCursor?: string}>>;
}
export interface ServiceObservation {
  readonly provider: string;
  readonly lastObservedAt: string;
  readonly lastSucceededAt?: string;
  readonly available: boolean;
}
export interface ServiceStatus {
  readonly service: 'backend' | 'firebase' | 'ai' | 'ticketmaster' | 'onepa';
  readonly configured: boolean;
  readonly state: 'ready' | 'unavailable' | 'unknown' | 'disabled';
  readonly lastObservedAt?: string;
  readonly lastSucceededAt?: string;
  readonly reason?: 'not_configured' | 'not_observed' | 'stale_observation' | 'dependency_unavailable' | 'maintenance_unavailable';
}
export interface AdminRuntimeStatus {
  read(): {readonly observedAt: string; readonly services: readonly ServiceStatus[]};
}
