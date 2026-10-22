import type { InterestAdminAuthority } from '../ports/interest-admin.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
import { appFailure, type AppFailure } from '../../shared/application/app-failure.js';
import { ok, err, type Result } from '../../shared/domain/result.js';

/** UI hint only. CreateInterestTag still checks current authority independently. */
export class GetInterestAdminCapability {
  constructor(private readonly authority: InterestAdminAuthority) {}
  async execute(principal: AuthPrincipal): Promise<Result<{ canCreateInterestTags: boolean }, AppFailure>> {
    try {
      const access = await this.authority.currentAdmin(principal.firebaseUid);
      return access === 'allowed' || access === 'forbidden'
        ? ok({ canCreateInterestTags: access === 'allowed' })
        : err(appFailure('SERVICE_UNAVAILABLE'));
    } catch { return err(appFailure('SERVICE_UNAVAILABLE')); }
  }
}
