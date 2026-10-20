import type { FriendIgnoreRepository, FriendIgnoreState } from "../ports/friend-ignore-repository.js";
import { context, viewer, member, fail, failure, SocialFailure, type Member, type Reader } from "../../friends/infrastructure/social-authority.js";
import { friendPairKey, parsePair } from "../../friends/infrastructure/firestore-friend-repository.js";
import { ok, err } from "../../shared/domain/result.js";
import type { Clock } from "../../shared/ports/clock.js";
import type { FirestoreGateway, FirestoreTransactionGateway } from "../../shared/infrastructure/firebase/firestore-gateway.js";
import { parsePreference, preferenceCollection, preferenceKey, preferenceVersion, readPreference } from "./recommendation-preference.js";
import { isSafeDocumentId } from "../../shared/infrastructure/firebase/firestore-records.js";

/** Current discoverability, without using an old card as identity/privacy authority. */
async function eligible(reader: Reader, own: Member, target: Member, now: number) {
  if (own.id === target.id || own.data.optionalProcessingConsent !== "accepted" ||
      target.data.optionalProcessingConsent !== "accepted" || target.visibility !== "public") return false;
  const reservation = await reader.get(`username_reservations/${target.username}`);
  if (reservation?.accountId !== target.id) return false;
  const stored = await reader.get(`friend_pairs/${friendPairKey(own.id, target.id)}`);
  const pair = stored && parsePair(stored, own.id, target.id);
  if (stored && !pair) return fail("SERVICE_UNAVAILABLE");
  return !pair?.friendship && !pair?.blockedByAccountIds.length &&
    !(pair?.pending && Date.parse(pair.pending.expiresAt) > now);
}
function projection(target: Member, owner: string, ignored: boolean, revision: number): FriendIgnoreState {
  return { username: target.username, displayName: target.displayName, ignored,
    version: preferenceVersion(owner, target.id, revision) };
}
export class FirestoreFriendIgnoreRepository implements FriendIgnoreRepository {
  constructor(private readonly store: FirestoreGateway, private readonly clock: Clock) {}
  private now(): number {
    const result = this.clock.now();
    return result.ok ? result.value.getTime() : fail("SERVICE_UNAVAILABLE");
  }
  async read(uid: string, username: string) {
    try { return await this.store.runTransaction(async tx => {
      const { viewer: own, target } = await context(tx, uid, username);
      if (!await eligible(tx, own, target, this.now())) return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
      const preference = await readPreference(tx, own.id, target.id);
      return ok(projection(target, own.id, preference.ignored, preference.revision));
    }); } catch (error) { return err(failure(error)); }
  }
  async set(uid: string, username: string, ignored: boolean, expectedVersion: string) {
    if (typeof ignored !== "boolean" || !/^[a-f0-9]{64}$/.test(expectedVersion)) return err(failure(new SocialFailure("REQUEST_INVALID")));
    try { return await this.store.runTransaction(async tx => {
      const { viewer: own, target } = await context(tx, uid, username);
      if (!await eligible(tx, own, target, this.now())) return fail("ADD_FRIEND_TARGET_UNAVAILABLE");
      const preference = await readPreference(tx, own.id, target.id);
      if (preferenceVersion(own.id, target.id, preference.revision) !== expectedVersion) {
        return fail("FRIEND_IGNORE_PRECONDITION_FAILED");
      }
      if (preference.ignored === ignored) return ok(projection(target, own.id, ignored, preference.revision));
      const revision = preference.revision + 1;
      if (!Number.isSafeInteger(revision) || revision >= Number.MAX_SAFE_INTEGER) return fail("SERVICE_UNAVAILABLE");
      // Restores retain the revision tombstone: an old Undo cannot undo a newer ignore.
      tx.set(preference.path, { ownerAccountId: own.id, targetAccountId: target.id, ignored, revision });
      return ok(projection(target, own.id, ignored, revision));
    }); } catch (error) { return err(failure(error)); }
  }
  async list(uid: string) {
    try { return await this.store.runTransaction(async tx => {
      const own = await viewer(tx, uid), now = this.now(), people: FriendIgnoreState[] = [];
      if (own.data.optionalProcessingConsent !== "accepted") return ok({ people });
      if (!tx.listWherePage) return fail("SERVICE_UNAVAILABLE");
      let after: string | undefined;
      for (let page = 0; page < 40; page++) {
        const rows = await tx.listWherePage(preferenceCollection, { ownerAccountId: own.id }, after, 25);
        if (rows.length > 25) return fail("SERVICE_UNAVAILABLE");
        for (const row of rows) {
          const pref = parsePreference(row.data, own.id);
          if (row.id !== preferenceKey(own.id, pref.targetAccountId) || (after !== undefined && row.id <= after)) return fail("SERVICE_UNAVAILABLE");
          after = row.id;
          if (!pref.ignored) continue;
          let target: Member;
          try { target = await member(tx, pref.targetAccountId); } catch (error) {
            if (error instanceof SocialFailure && error.code === "ADD_FRIEND_TARGET_UNAVAILABLE") continue;
            throw error;
          }
          if (await eligible(tx, own, target, now)) people.push(projection(target, own.id, true, pref.revision));
        }
        if (rows.length < 25) return ok({ people });
      }
      return fail("SERVICE_UNAVAILABLE"); // Never silently omit an arbitrary suffix.
    }); } catch (error) { return err(failure(error)); }
  }
}

/**
 * Internal deletion-executor seam, NOT an HTTP/account-delete endpoint.
 * Call only after permanent deletion's existing friend_access tombstone.
 * Repeat batches until complete before acknowledging associated cleanup.
 * No account deletion executor is currently wired to this seam.
 */
export async function cleanupDeletedAccountPreferences(store: FirestoreGateway, accountId: string): Promise<{ complete: boolean; removed: number }> {
  // Validate identity before constructing paths, including when no records exist.
  if (!isSafeDocumentId(accountId)) return fail("SERVICE_UNAVAILABLE");
  return store.runTransaction(async (tx: FirestoreTransactionGateway) => {
    const access = await tx.get(`friend_access/${accountId}`);
    if (access?.eligibilityState !== "permanently-deleted" || !tx.listWherePage || !tx.delete) return fail("SERVICE_UNAVAILABLE");
    const outgoing = await tx.listWherePage(preferenceCollection, { ownerAccountId: accountId }, undefined, 25);
    const incoming = await tx.listWherePage(preferenceCollection, { targetAccountId: accountId }, undefined, 25);
    if (outgoing.length > 25 || incoming.length > 25) return fail("SERVICE_UNAVAILABLE");
    const paths = new Set<string>();
    for (const row of [...outgoing, ...incoming]) {
      const pref = parsePreference(row.data);
      if ((pref.ownerAccountId !== accountId && pref.targetAccountId !== accountId) ||
          row.id !== preferenceKey(pref.ownerAccountId, pref.targetAccountId)) return fail("SERVICE_UNAVAILABLE");
      paths.add(`${preferenceCollection}/${row.id}`);
    }
    for (const path of paths) tx.delete(path);
    return { removed: paths.size, complete: outgoing.length < 25 && incoming.length < 25 };
  });
}
