import type { AdminRepository, AdminRuntimeStatus, AdminResult } from '../ports/admin-repository.js';
import type { InterestAdminAuthority } from '../../interests/ports/interest-admin.js';
import { catalogueName } from '../../interests/domain/catalogue-name.js';
import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
import { appFailure, type AppFailure } from '../../shared/application/app-failure.js';
import { ok, err, type Result } from '../../shared/domain/result.js';

const codes = {not_found: 'CATALOGUE_NOT_FOUND', name_conflict: 'CATALOGUE_NAME_CONFLICT', state_conflict: 'CATALOGUE_STATE_CONFLICT', revision_precondition_failed: 'CATALOGUE_REVISION_PRECONDITION_FAILED', unavailable: 'SERVICE_UNAVAILABLE'} as const;
const revision = (v: unknown, zero = false): v is number => Number.isSafeInteger(v) && Number(v) >= (zero ? 0 : 1);
export class AdminOperations {
  constructor(private readonly authority: InterestAdminAuthority, private readonly repository: AdminRepository,
    private readonly runtime: AdminRuntimeStatus,
    private readonly eventExists: (principal: AuthPrincipal, eventId: string) => Promise<Result<void, AppFailure>>) {}

  private async authorized<T>(principal: AuthPrincipal, work: () => Promise<Result<T, AppFailure>>): Promise<Result<T, AppFailure>> {
    try {
      const access = await this.authority.currentAdmin(principal.firebaseUid);
      if (access !== 'allowed') return err(appFailure(access === 'forbidden' ? 'AUTH_FORBIDDEN' : 'SERVICE_UNAVAILABLE'));
      return await work();
    } catch { return err(appFailure('SERVICE_UNAVAILABLE')); }
  }
  private result<T>(r: AdminResult<T>): Result<T, AppFailure> { return r.kind === 'success' ? ok(r.value) : err(appFailure(codes[r.kind])); }
  status(p: AuthPrincipal) { return this.authorized(p, async () => ok(this.runtime.read())); }
  categories(p: AuthPrincipal) { return this.authorized(p, async () => this.result(await this.repository.categories())); }
  create(p: AuthPrincipal, input: unknown) {
    return this.authorized(p, async () => {
      const name = catalogueName(input);
      return name ? this.result(await this.repository.create(p.firebaseUid, name.displayName, name.comparisonKey)) : err(appFailure('CATALOGUE_INVALID'));
    });
  }
  change(p: AuthPrincipal, id: string, input: {expectedRevision: number; displayName?: string; lifecycleState?: 'active' | 'inactive'}) {
    return this.authorized(p, async () => {
      if (!revision(input.expectedRevision) || Object.keys(input).length !== 2) return err(appFailure('CATALOGUE_INVALID'));
      if (Object.hasOwn(input, 'displayName')) {
        const name = catalogueName(input.displayName);
        return name ? this.result(await this.repository.change(p.firebaseUid, id, input.expectedRevision, name)) : err(appFailure('CATALOGUE_INVALID'));
      }
      if (input.lifecycleState !== 'active' && input.lifecycleState !== 'inactive') return err(appFailure('CATALOGUE_INVALID'));
      return this.result(await this.repository.change(p.firebaseUid, id, input.expectedRevision, {lifecycleState: input.lifecycleState}));
    });
  }
  classification(p: AuthPrincipal, eventId: string) {
    return this.authorized(p, async () => {
      const allowed = await this.eventExists(p, eventId);
      if (!allowed.ok) return allowed;
      const access = await this.authority.currentAdmin(p.firebaseUid);
      if (access !== 'allowed') return err(appFailure(access === 'forbidden' ? 'AUTH_FORBIDDEN' : 'SERVICE_UNAVAILABLE'));
      return this.result(await this.repository.classification(eventId));
    });
  }
  assign(p: AuthPrincipal, eventId: string, input: {expectedRevision: number; eventCategoryId?: string}) {
    return this.authorized(p, async () => {
      if (!revision(input.expectedRevision, true) || Object.keys(input).some(k => !['expectedRevision', 'eventCategoryId'].includes(k))) return err(appFailure('CATALOGUE_INVALID'));
      const allowed = await this.eventExists(p, eventId);
      if (!allowed.ok) return allowed;
      // Recheck current Admin authority after a potentially slow source read.
      const access = await this.authority.currentAdmin(p.firebaseUid);
      if (access !== 'allowed') return err(appFailure(access === 'forbidden' ? 'AUTH_FORBIDDEN' : 'SERVICE_UNAVAILABLE'));
      return this.result(await this.repository.assign(p.firebaseUid, eventId, input.expectedRevision, input.eventCategoryId));
    });
  }
  records(p: AuthPrincipal, cursor?: string) {
    return this.authorized(p, async () => {
      if (cursor !== undefined && !validAuditCursor(cursor)) return err(appFailure('REQUEST_INVALID'));
      return this.result(await this.repository.records(cursor));
    });
  }
}
// Cursor parsing belongs to the application contract; it confers no authority.
export function validAuditCursor(cursor: string): boolean {
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(cursor)) return false;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value) || value.length !== 2) return false;
    const [at, id] = value;
    return typeof at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at) &&
      Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === at && typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) &&
      Buffer.from(JSON.stringify(value)).toString('base64url') === cursor;
  } catch { return false; }
}
