export interface InterestAdminAuthority {
  currentAdmin(firebaseUid: string): Promise<'allowed' | 'forbidden' | 'unavailable'>;
}
export interface CreatedInterestTag {
  readonly interestTagId: string;
  readonly displayName: string;
  readonly lifecycleState: 'active';
  readonly revision: 1;
}
export interface InterestCatalogueWriter {
  create(displayName: string, comparisonKey: string, actorAdminUid?: string): Promise<
    { kind: 'created'; interestTag: CreatedInterestTag } | { kind: 'conflict' | 'unavailable' }>;
}

export interface ManagedInterestTag {
  readonly interestTagId: string;
  readonly displayName: string;
  readonly lifecycleState: 'active' | 'inactive';
  readonly revision: number;
}
export type InterestCatalogueFailure = 'not_found' | 'name_conflict' | 'referenced' |
  'state_conflict' | 'revision_precondition_failed' | 'unavailable';
export type InterestCatalogueChange =
  { readonly displayName: string; readonly comparisonKey: string } |
  { readonly lifecycleState: 'active' | 'inactive' };
export interface InterestCatalogueManagement {
  list(): Promise<{ readonly kind: 'read'; readonly interestTags: readonly ManagedInterestTag[] } | { readonly kind: 'unavailable' }>;
  change(id: string, expectedRevision: number, change: InterestCatalogueChange, actorAdminUid?: string): Promise<
    { readonly kind: 'saved'; readonly interestTag: ManagedInterestTag } | { readonly kind: InterestCatalogueFailure }>;
  delete(id: string, expectedRevision: number): Promise<{ readonly kind: 'deleted' } | { readonly kind: InterestCatalogueFailure }>;
}
