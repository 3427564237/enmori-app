import type { InterestAdminAuthority, InterestCatalogueManagement, InterestCatalogueFailure,
  InterestCatalogueChange, ManagedInterestTag } from '../ports/interest-admin.js';
import { catalogueName } from '../domain/catalogue-name.js';
import { appFailure, type AppFailure, type AppFailureCode } from '../../shared/application/app-failure.js';
import { ok, err, type Result } from '../../shared/domain/result.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';

const failures: Record<InterestCatalogueFailure, AppFailureCode> = {
  not_found: 'CATALOGUE_NOT_FOUND', name_conflict: 'CATALOGUE_NAME_CONFLICT',
  referenced: 'CATALOGUE_REFERENCED', state_conflict: 'CATALOGUE_STATE_CONFLICT',
  revision_precondition_failed: 'CATALOGUE_REVISION_PRECONDITION_FAILED', unavailable: 'SERVICE_UNAVAILABLE',
};
const revision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
export class ManageInterestTags {
  constructor(private readonly authority: InterestAdminAuthority, private readonly catalogue: InterestCatalogueManagement) {}
  private async authorized<T>(principal: AuthPrincipal, work: () => Promise<Result<T, AppFailure>>): Promise<Result<T, AppFailure>> {
    try {
      const access = await this.authority.currentAdmin(principal.firebaseUid);
      if (access !== 'allowed') return err(appFailure(access === 'forbidden' ? 'AUTH_FORBIDDEN' : 'SERVICE_UNAVAILABLE'));
      return await work();
    } catch { return err(appFailure('SERVICE_UNAVAILABLE')); }
  }
  list(principal: AuthPrincipal): Promise<Result<{ readonly interestTags: readonly ManagedInterestTag[] }, AppFailure>> {
    return this.authorized(principal, async () => {
      const result = await this.catalogue.list();
      return result.kind === 'read' ? ok({ interestTags: result.interestTags }) : err(appFailure('SERVICE_UNAVAILABLE'));
    });
  }
  change(principal: AuthPrincipal, id: string, input: unknown): Promise<Result<ManagedInterestTag, AppFailure>> {
    return this.authorized(principal, async () => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return err(appFailure('CATALOGUE_INVALID'));
      const value = input as Record<string, unknown>;
      if (!revision(value.expectedRevision) || Object.keys(value).length !== 2) return err(appFailure('CATALOGUE_INVALID'));
      let change: InterestCatalogueChange;
      if (Object.hasOwn(value, 'displayName')) {
        const name = catalogueName(value.displayName);
        if (!name) return err(appFailure('CATALOGUE_INVALID'));
        change = name;
      } else if (value.lifecycleState === 'active' || value.lifecycleState === 'inactive') {
        change = { lifecycleState: value.lifecycleState };
      } else return err(appFailure('CATALOGUE_INVALID'));
      const result = await this.catalogue.change(id, value.expectedRevision, change, principal.firebaseUid);
      return result.kind === 'saved' ? ok(result.interestTag) : err(appFailure(failures[result.kind]));
    });
  }
  delete(principal: AuthPrincipal, id: string, expectedRevision: unknown): Promise<Result<void, AppFailure>> {
    return this.authorized(principal, async () => {
      if (!revision(expectedRevision)) return err(appFailure('CATALOGUE_INVALID'));
      const result = await this.catalogue.delete(id, expectedRevision);
      return result.kind === 'deleted' ? ok(undefined) : err(appFailure(failures[result.kind]));
    });
  }
}
