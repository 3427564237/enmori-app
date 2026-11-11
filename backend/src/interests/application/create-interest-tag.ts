import type { InterestAdminAuthority, InterestCatalogueWriter, CreatedInterestTag } from '../ports/interest-admin.js';
import { catalogueName } from '../domain/catalogue-name.js';
import { appFailure, type AppFailure } from '../../shared/application/app-failure.js';
import { ok, err, type Result } from '../../shared/domain/result.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
export class CreateInterestTag {
  constructor(private readonly authority: InterestAdminAuthority, private readonly writer: InterestCatalogueWriter) {}
  async execute(principal: AuthPrincipal, input: unknown): Promise<Result<CreatedInterestTag, AppFailure>> {
    const access = await this.authority.currentAdmin(principal.firebaseUid);
    if (access !== 'allowed') return err(appFailure(access === 'forbidden' ? 'AUTH_FORBIDDEN' : 'SERVICE_UNAVAILABLE'));
    const name = catalogueName(input);
    if (!name) return err(appFailure('CATALOGUE_INVALID'));
    const result = await this.writer.create(name.displayName, name.comparisonKey, principal.firebaseUid);
    return result.kind === 'created' ? ok(result.interestTag) : err(appFailure(result.kind === 'conflict' ? 'CATALOGUE_NAME_CONFLICT' : 'SERVICE_UNAVAILABLE'));
  }
}
