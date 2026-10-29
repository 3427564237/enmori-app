import type { AuthPrincipal } from '../../shared/ports/identity-verifier.js';
interface Entry { revision: number; pending: number; readers: number; unknownRevision: number; confirmedRevision: number }
/** One instance shared by Settings writers and cloud readers on the exclusively
 * owned service. An external writer/second host is not covered by this fence. */
export class CloudConsentFence {
  private readonly entries = new Map<string, Entry>();
  private entry(uid: string): Entry {
    let value = this.entries.get(uid);
    if (!value) { value = {revision:0,pending:0,readers:0,unknownRevision:-1,confirmedRevision:0}; this.entries.set(uid,value); }
    return value;
  }
  private clean(uid: string, entry: Entry): void {
    if (entry.confirmedRevision > entry.unknownRevision && !entry.pending && !entry.readers && this.entries.get(uid) === entry) this.entries.delete(uid);
  }
  read(principal: AuthPrincipal) {
    const uid = principal.firebaseUid, entry = this.entry(uid), revision = entry.revision;
    let active = true; entry.readers++;
    return Object.freeze({
      current: () => active && entry.confirmedRevision > entry.unknownRevision && entry.pending === 0 && entry.revision === revision,
      release: () => { if (active) { active=false; entry.readers--; this.clean(uid,entry); } },
    });
  }
  /** Enter before any save I/O. Unknown save ACK never restores an old permit. */
  saving(principal: AuthPrincipal, expectedRevision: number): (confirmed: number | false | undefined) => void {
    const uid = principal.firebaseUid, entry = this.entry(uid); entry.revision++; entry.pending++;
    let active = true;
    return (confirmed) => { if (active) {
      active=false; entry.pending--;
      if (confirmed === undefined) entry.unknownRevision = Math.max(entry.unknownRevision, expectedRevision);
      else if (typeof confirmed === "number") entry.confirmedRevision = Math.max(entry.confirmedRevision, confirmed);
      this.clean(uid,entry);
    } };
  }
}
