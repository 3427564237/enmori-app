import type { Auth } from 'firebase-admin/auth';
import type { InterestAdminAuthority } from '../ports/interest-admin.js';
export class FirebaseInterestAdmin implements InterestAdminAuthority {
  constructor(private readonly auth: Auth) {}
  async currentAdmin(uid: string): Promise<'allowed' | 'forbidden' | 'unavailable'> {
    try {
      const user = await this.auth.getUser(uid);
      return !user.disabled && user.customClaims?.enmoriAdmin === true ? 'allowed' : 'forbidden';
    } catch { return 'unavailable'; }
  }
}
