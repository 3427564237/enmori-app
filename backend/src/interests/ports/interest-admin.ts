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
  create(displayName: string, comparisonKey: string): Promise<
    { kind: 'created'; interestTag: CreatedInterestTag } | { kind: 'conflict' | 'unavailable' }>;
}
